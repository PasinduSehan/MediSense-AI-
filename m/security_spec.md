# MediSense AI Security Specification

This document details the data invariants, malicious test payloads ("The Dirty Dozen"), and the verification strategy for the security of the Firestore database.

## 1. Data Invariants

1. **User Ownership & Isolation**: 
   - A user's profile (`/users/{userId}`) and all nested sub-resources (`documents`, `medications`, `symptomLogs`, `monthlyReports`, `notifications`) are strictly isolated. No user may read, list, create, update, or delete another user's clinical or demographic files under any circumstances.
   - The path parameter `{userId}` MUST exactly equal the authenticated user's ID (`request.auth.uid`).

2. **Entity Validation & Types**:
   - Every write operation (create and update) must conform strictly to the defined schema.
   - Mandatory keys must exist on creation, and only whitelisted updates are permitted.

3. **Temporal Integrity**:
   - Timestamps like `createdAt` and `updatedAt` are validated against `request.time` (the server's internal time). Client-provided values cannot bypass server validations.

---

## 2. The "Dirty Dozen" Malicious Payloads

The following 12 payloads represent attacks trying to bypass our zero-trust system.

### Attack Vector 1: Identity Spoofing (Cross-User Reads)
- **Attack Goal**: Attacker `user_A` tries to read the documents of `user_B`.
- **Target Path**: GET `/users/user_B/documents/doc_1` as `user_A`.
- **Expected Outcome**: `PERMISSION_DENIED`

### Attack Vector 2: User Profile Theft
- **Attack Goal**: Attacker `user_A` tries to create a profile under `user_B`'s path.
- **Target Path**: CREATE `/users/user_B` with `id = "user_B"` as `user_A`.
- **Expected Outcome**: `PERMISSION_DENIED`

### Attack Vector 3: Shadow Key Injection (Adding properties)
- **Attack Goal**: Attacker tries to inject a `customRole: "admin"` field during registration.
- **Target Path**: CREATE `/users/user_A` with `customRole: "admin"`.
- **Expected Outcome**: `PERMISSION_DENIED` (Strict schema and size restriction block)

### Attack Vector 4: Relational Divergence (Document Owner hijacking)
- **Attack Goal**: Attacker `user_B` writes a document pointing `userId: "user_A"` under `user_B`'s subcollection.
- **Target Path**: CREATE `/users/user_B/documents/doc_1` with `userId = "user_A"`.
- **Expected Outcome**: `PERMISSION_DENIED` (userId must equal request.auth.uid)

### Attack Vector 5: Path Variable ID Poisoning (Resource Exhaustion)
- **Attack Goal**: Attacker tries to inject a 10KB string as a document ID to crash or balloon the database size.
- **Target Path**: CREATE `/users/user_A/medications/extremely-long-string-representing-a-malicious-denial-of-wallet-key-injection-attack-...`
- **Expected Outcome**: `PERMISSION_DENIED` (`isValidId` restricts ID length to <= 128 characters)

### Attack Vector 6: Invalid Enum Injection
- **Attack Goal**: Attacker tries to inject an illegal document type (`type: 'hack'`).
- **Target Path**: CREATE `/users/user_A/documents/doc_3` with `type: "hack"`.
- **Expected Outcome**: `PERMISSION_DENIED` (Only allowed: 'report', 'prescription', or 'notes')

### Attack Vector 7: Severity Escalation Cheat
- **Attack Goal**: Attacker attempts to set an out-of-bounds severity level (`severity: 99`).
- **Target Path**: CREATE `/users/user_A/symptomLogs/log_1` with `severity: 99`.
- **Expected Outcome**: `PERMISSION_DENIED` (Severity must be between 1 and 10)

### Attack Vector 8: Temporal Deception (Falsifying Dates)
- **Attack Goal**: Attacker tries to backdate or forwarddate a medication schedule's entry using coordinates out of range.
- **Target Path**: CREATE `/users/user_A/medications/med_1` where `startDate` violates dynamic invariants.
- **Expected Outcome**: `PERMISSION_DENIED`

### Attack Vector 9: Status State Locking Bypass
- **Attack Goal**: Attacker tries to bypass and alter immutable fields like `createdAt`.
- **Target Path**: UPDATE `/users/user_A/medications/med_1` changing `createdAt` or `startDate`.
- **Expected Outcome**: `PERMISSION_DENIED` (Immutability guard prevents modifying original keys)

### Attack Vector 10: Notification Spoofing
- **Attack Goal**: Attacker attempts to update an active alert status of another user or mark non-owned notifications as read.
- **Target Path**: UPDATE `/users/user_B/notifications/notif_1` with `{ read: true }` as `user_A`.
- **Expected Outcome**: `PERMISSION_DENIED`

### Attack Vector 11: Denial of Wallet (Large String Injection)
- **Attack Goal**: Attacker tries to upload a 50MB string inside the `dosage` or `frequency` field.
- **Target Path**: CREATE `/users/user_A/medications/med_2` with `dosage` containing massive text.
- **Expected Outcome**: `PERMISSION_DENIED` (Max length size limits enforced on strings)

### Attack Vector 12: Anonymous Write Escalation
- **Attack Goal**: Unauthenticated attacker tries to register a profile of a highly sensitive chronic disease without a valid session.
- **Target Path**: CREATE `/users/unauth_dude` with clinical settings.
- **Expected Outcome**: `PERMISSION_DENIED` (Mandatory auth and validation gates)

---

## 3. Test Runner Framework (`firestore.rules.test.ts`)

```typescript
import { expect } from 'chai';
import * as firebase from '@firebase/rules-unit-testing';

const PROJECT_ID = "sixth-cosine-hpwwt";
const DATABASE_ID = "ai-studio-a447d234-9488-46ea-99d6-1fcb37dd419f";

describe("MediSense AI Security Isolation Checks", () => {
  let adminApp: any;
  let userAApp: any;
  let userBApp: any;

  before(async () => {
    adminApp = firebase.initializeAdminApp({ projectId: PROJECT_ID }).firestore();
    userAApp = firebase.initializeTestApp({
      projectId: PROJECT_ID,
      databaseId: DATABASE_ID,
      auth: { uid: "user_A", email: "user_a@example.com", email_verified: true }
    }).firestore();

    userBApp = firebase.initializeTestApp({
      projectId: PROJECT_ID,
      databaseId: DATABASE_ID,
      auth: { uid: "user_B", email: "user_b@example.com", email_verified: true }
    }).firestore();
  });

  after(async () => {
    await Promise.all(firebase.apps().map(app => app.delete()));
  });

  it("Vector 1: User A cannot read User B's documents", async () => {
    const ref = userAApp.collection("users").doc("user_B").collection("documents").doc("doc_1");
    await firebase.assertFails(ref.get());
  });

  it("Vector 2: User A cannot steal User B's profile identity", async () => {
    const ref = userAApp.collection("users").doc("user_B");
    await firebase.assertFails(ref.set({ id: "user_B", name: "User B", email: "user_b@example.com" }));
  });

  it("Vector 3: User A cannot inject shadow key 'customRole' into their profile", async () => {
    const ref = userAApp.collection("users").doc("user_A");
    await firebase.assertFails(ref.set({
      id: "user_A",
      name: "User A",
      email: "user_a@example.com",
      customRole: "admin",
      age: 25,
      gender: "Male"
    }));
  });

  it("Vector 4: User B cannot forge a document with userId: 'user_A' inside User B's subcollection", async () => {
    const ref = userBApp.collection("users").doc("user_B").collection("documents").doc("doc_1");
    await firebase.assertFails(ref.set({
      id: "doc_1",
      userId: "user_A",
      title: "Hijacked",
      type: "prescription",
      rawText: "Forged Text",
      analysis: {}
    }));
  });

  it("Vector 5: User A cannot write with a path ID larger than 128 characters", async () => {
    const longId = "a".repeat(200);
    const ref = userAApp.collection("users").doc("user_A").collection("medications").doc(longId);
    await firebase.assertFails(ref.set({
      id: longId,
      userId: "user_A",
      name: "Metformin",
      dosage: "500mg",
      frequency: "Twice",
      times: ["08:00"],
      active: true
    }));
  });
});
```
