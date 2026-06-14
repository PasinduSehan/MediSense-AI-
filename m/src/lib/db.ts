import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { User, MedicalDocument, Medication, SymptomLog, MonthlyProgressReport, HealthNotification, WellnessHabit } from '../types';

// ==========================================
// USER PROFILE OPERATIONS
// ==========================================

export async function fetchUserFromFirestore(userId: string): Promise<User | null> {
  const path = `users/${userId}`;
  try {
    const docRef = doc(db, 'users', userId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as User;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

export async function saveUserToFirestore(user: User): Promise<void> {
  const path = `users/${user.id}`;
  try {
    const docRef = doc(db, 'users', user.id);
    await setDoc(docRef, user);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fetchAllUsersFromFirestore(): Promise<User[]> {
  const path = 'users';
  try {
    const colRef = collection(db, 'users');
    const snap = await getDocs(colRef);
    const users: User[] = [];
    snap.forEach(doc => {
      users.push(doc.data() as User);
    });
    return users;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
}

// ==========================================
// MEDICAL DOCUMENTS OPERATIONS
// ==========================================

export function listenToDocuments(userId: string, callback: (docs: MedicalDocument[]) => void) {
  const path = `users/${userId}/documents`;
  try {
    const colRef = collection(db, 'users', userId, 'documents');
    const q = query(colRef, orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      const docs: MedicalDocument[] = [];
      snap.forEach(doc => {
        docs.push(doc.data() as MedicalDocument);
      });
      callback(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function saveDocumentToFirestore(userId: string, document: MedicalDocument) {
  const path = `users/${userId}/documents/${document.id}`;
  try {
    const docRef = doc(db, 'users', userId, 'documents', document.id);
    await setDoc(docRef, document);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteDocumentFromFirestore(userId: string, documentId: string) {
  const path = `users/${userId}/documents/${documentId}`;
  try {
    const docRef = doc(db, 'users', userId, 'documents', documentId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ==========================================
// MEDICATIONS OPERATIONS
// ==========================================

export function listenToMedications(userId: string, callback: (meds: Medication[]) => void) {
  const path = `users/${userId}/medications`;
  try {
    const colRef = collection(db, 'users', userId, 'medications');
    const q = query(colRef, orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      const meds: Medication[] = [];
      snap.forEach(doc => {
        meds.push(doc.data() as Medication);
      });
      callback(meds);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function saveMedicationToFirestore(userId: string, medication: Medication) {
  const path = `users/${userId}/medications/${medication.id}`;
  try {
    const docRef = doc(db, 'users', userId, 'medications', medication.id);
    await setDoc(docRef, medication);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteMedicationFromFirestore(userId: string, medicationId: string) {
  const path = `users/${userId}/medications/${medicationId}`;
  try {
    const docRef = doc(db, 'users', userId, 'medications', medicationId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ==========================================
// SYMPTOM LOGS OPERATIONS
// ==========================================

export function listenToSymptomLogs(userId: string, callback: (logs: SymptomLog[]) => void) {
  const path = `users/${userId}/symptomLogs`;
  try {
    const colRef = collection(db, 'users', userId, 'symptomLogs');
    const q = query(colRef, orderBy('loggedAt', 'asc'));
    return onSnapshot(q, (snap) => {
      const logs: SymptomLog[] = [];
      snap.forEach(doc => {
        logs.push(doc.data() as SymptomLog);
      });
      callback(logs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function saveSymptomLogToFirestore(userId: string, log: SymptomLog) {
  const path = `users/${userId}/symptomLogs/${log.id}`;
  try {
    const docRef = doc(db, 'users', userId, 'symptomLogs', log.id);
    await setDoc(docRef, log);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ==========================================
// MONTHLY REPORTS OPERATIONS
// ==========================================

export function listenToMonthlyReports(userId: string, callback: (reports: MonthlyProgressReport[]) => void) {
  const path = `users/${userId}/monthlyReports`;
  try {
    const colRef = collection(db, 'users', userId, 'monthlyReports');
    const q = query(colRef, orderBy('generatedAt', 'desc'));
    return onSnapshot(q, (snap) => {
      const reports: MonthlyProgressReport[] = [];
      snap.forEach(doc => {
        reports.push(doc.data() as MonthlyProgressReport);
      });
      callback(reports);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function saveMonthlyReportToFirestore(userId: string, report: MonthlyProgressReport) {
  const path = `users/${userId}/monthlyReports/${report.id}`;
  try {
    const docRef = doc(db, 'users', userId, 'monthlyReports', report.id);
    await setDoc(docRef, report);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ==========================================
// NOTIFICATIONS OPERATIONS
// ==========================================

export function listenToNotifications(userId: string, callback: (notifs: HealthNotification[]) => void) {
  const path = `users/${userId}/notifications`;
  try {
    const colRef = collection(db, 'users', userId, 'notifications');
    const q = query(colRef, orderBy('timestamp', 'desc'));
    return onSnapshot(q, (snap) => {
      const notifs: HealthNotification[] = [];
      snap.forEach(doc => {
        notifs.push(doc.data() as HealthNotification);
      });
      callback(notifs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function saveNotificationToFirestore(userId: string, notification: HealthNotification) {
  const path = `users/${userId}/notifications/${notification.id}`;
  try {
    const docRef = doc(db, 'users', userId, 'notifications', notification.id);
    await setDoc(docRef, notification);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteNotificationFromFirestore(userId: string, notificationId: string) {
  const path = `users/${userId}/notifications/${notificationId}`;
  try {
    const docRef = doc(db, 'users', userId, 'notifications', notificationId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ==========================================
// WELLNESS HABITS OPERATIONS
// ==========================================

export function listenToWellnessHabits(userId: string, callback: (habits: WellnessHabit[]) => void) {
  const path = `users/${userId}/wellnessHabits`;
  try {
    const colRef = collection(db, 'users', userId, 'wellnessHabits');
    const q = query(colRef, orderBy('timestamp', 'asc'));
    return onSnapshot(q, (snap) => {
      const habits: WellnessHabit[] = [];
      snap.forEach(doc => {
        habits.push(doc.data() as WellnessHabit);
      });
      callback(habits);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function saveWellnessHabitToFirestore(userId: string, habit: WellnessHabit) {
  const path = `users/${userId}/wellnessHabits/${habit.id}`;
  try {
    const docRef = doc(db, 'users', userId, 'wellnessHabits', habit.id);
    await setDoc(docRef, habit);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

