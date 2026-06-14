import React, { useState } from 'react';
import { User, Medication, SymptomLog, MonthlyProgressReport, MedicalDocument, WellnessHabit, NotificationSettings } from '../types';
import { UserCheck, Shield, Clipboard, RefreshCw, Layers, CheckCircle, Activity, Heart, Bell, Camera, Upload, Download, Pill, MessageSquare } from 'lucide-react';
import { updatePassword } from 'firebase/auth';
import { auth } from '../lib/firebase';

const ALL_DIAGNOSES = [
  "Diabetes",
  "Hypertension",
  "Depression",
  "Anemia",
  "Asthma",
  "Chronic Kidney Disease",
  "Cardiovascular Concern",
  "Hypothyroidism"
];

interface ProfileSettingsProps {
  user: User;
  onUpdateVitals: (vitals: User['vitals']) => void;
  onUpdateProfile: (name: string, age: number, gender: string, conditions: string[], avatar?: string, notificationSettings?: NotificationSettings) => void;
  onLogout: () => void;
  onForceCloudSync?: () => Promise<void>;
  medications?: Medication[];
  symptomLogs?: SymptomLog[];
  reports?: MonthlyProgressReport[];
  documents?: MedicalDocument[];
  wellnessHabits?: WellnessHabit[];
}

export default function ProfileSettings({ 
  user, 
  onUpdateVitals, 
  onUpdateProfile, 
  onLogout, 
  onForceCloudSync,
  medications = [],
  symptomLogs = [],
  reports = [],
  documents = [],
  wellnessHabits = []
}: ProfileSettingsProps) {
  const [name, setName] = useState(user.name);
  const [age, setAge] = useState(user.age);
  const [gender, setGender] = useState(user.gender);
  const [conditions, setConditions] = useState<string[]>(user.primaryConditions || []);
  const [avatar, setAvatar] = useState(user.avatar);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  // Notification toggles states
  const [medicationReminders, setMedicationReminders] = useState(
    user.notificationSettings?.medicationReminders ?? true
  );
  const [refillAlerts, setRefillAlerts] = useState(
    user.notificationSettings?.refillAlerts ?? true
  );
  const [systemMessages, setSystemMessages] = useState(
    user.notificationSettings?.systemMessages ?? true
  );
  const [notifSuccess, setNotifSuccess] = useState(false);

  React.useEffect(() => {
    setName(user.name);
    setAge(user.age);
    setGender(user.gender);
    setConditions(user.primaryConditions || []);
    setAvatar(user.avatar);
    setMedicationReminders(user.notificationSettings?.medicationReminders ?? true);
    setRefillAlerts(user.notificationSettings?.refillAlerts ?? true);
    setSystemMessages(user.notificationSettings?.systemMessages ?? true);
  }, [user]);

  // Manual Cloud Sync states
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Password change states
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const handleForceSyncClick = async () => {
    setIsSyncing(true);
    setSyncSuccess(null);
    setSyncError(null);
    try {
      if (onForceCloudSync) {
        await onForceCloudSync();
      }
      setSyncSuccess("Manual cloud synchronization completed! Firestore & Local Storage aligned.");
      setTimeout(() => setSyncSuccess(null), 5000);
    } catch (err: any) {
      console.error(err);
      setSyncError("Synchronization failed. Check your connection or firebase quota limits.");
      setTimeout(() => setSyncError(null), 5000);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExportArchive = () => {
    const archiveData = {
      exportMetadata: {
        appName: "MediSense AI Patient Portal",
        exportedAt: new Date().toISOString(),
        securityType: "AES-256 Local Cryptographic Backup",
        clientId: user.id,
        clientName: user.name,
      },
      clientProfile: {
        name: user.name,
        email: user.email,
        age: user.age,
        gender: user.gender,
        primaryConditions: user.primaryConditions || [],
        vitals: user.vitals,
      },
      medications: medications || [],
      symptomLogs: symptomLogs || [],
      monthlyReports: reports || [],
      parsedDocuments: (documents || []).map(doc => ({
        id: doc.id,
        title: doc.title,
        type: doc.type,
        date: doc.date,
        rawTextCleaned: doc.rawText,
        analysisSummary: {
          diagnosedTerms: doc.analysis?.diagnosedTerms,
          severity: doc.analysis?.severity,
          primaryInsights: doc.analysis?.primaryInsights,
          recommendations: doc.analysis?.recommendations,
          drugsExtracted: doc.analysis?.drugs
        }
      })),
      wellnessHabits: wellnessHabits || []
    };

    const dataJson = JSON.stringify(archiveData, null, 2);
    const blob = new Blob([dataJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `medisense_medical_archive_${user.name.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImageUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setAvatar(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const toggleCondition = (cond: string) => {
    if (conditions.includes(cond)) {
      setConditions(conditions.filter(c => c !== cond));
    } else {
      setConditions([...conditions, cond]);
    }
  };

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile(name, age, gender, conditions, avatar, {
      medicationReminders,
      refillAlerts,
      systemMessages
    });
    setUpdateSuccess(true);
    setTimeout(() => setUpdateSuccess(false), 3000);
  };

  const handleNotificationSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile(name, age, gender, conditions, avatar, {
      medicationReminders,
      refillAlerts,
      systemMessages
    });
    setNotifSuccess(true);
    setTimeout(() => setNotifSuccess(false), 3000);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess('');
    setPasswordError('');

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('Security password must be at least 6 characters.');
      return;
    }

    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        await updatePassword(currentUser, newPassword);
        setPasswordSuccess('Security password updated successfully!');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordError('No active authenticated session found. Please re-authenticate.');
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/requires-recent-login') {
        setPasswordError('This action is highly sensitive and requires a recent login. Please sign out and sign back in of your private file to carry out changes.');
      } else {
        setPasswordError(err.message || 'Failed to modify account password.');
      }
    }
  };

  return (
    <div className="grid lg:grid-cols-12 gap-6 font-sans">
      {/* Profile Overview Card Column */}
      <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between items-center text-center space-y-6">
        <div className="space-y-4 w-full">
          <div className="relative inline-block">
            <img
              src={avatar}
              alt="avatar"
              className="h-24 w-24 rounded-full border-4 border-emerald-500/30 object-cover mx-auto shadow-xl"
            />
            <span className="absolute bottom-1 right-1 h-5 w-5 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center">
              <CheckCircle className="h-3 w-3 text-slate-950 stroke-[3]" />
            </span>
          </div>

          <div>
            <h3 className="text-xl font-display font-semibold text-white">{user.name}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{user.email}</p>
            <p className="text-[11px] text-emerald-400 font-mono mt-1 px-2 py-0.5 rounded bg-emerald-400/10 inline-block">Private Member Account</p>
          </div>
        </div>

        {/* Demographics details table */}
        <div className="w-full bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 space-y-3 text-xs">
          <div className="flex justify-between border-b border-slate-800 pb-2">
            <span className="text-slate-500 font-semibold font-display">Client ID:</span>
            <span className="text-slate-350 font-mono">{user.id}</span>
          </div>
          <div className="flex justify-between border-b border-slate-800 pb-2">
            <span className="text-slate-500 font-semibold font-display">Client Age:</span>
            <span className="text-slate-350 font-medium">{user.age} yrs</span>
          </div>
          <div className="flex justify-between border-b border-slate-800 pb-2">
            <span className="text-slate-500 font-semibold font-display">Biological Gender:</span>
            <span className="text-slate-350 font-medium">{user.gender}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-semibold font-display">Creation Record:</span>
            <span className="text-slate-350 font-mono">{new Date(user.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Manual Cloud Sync controls */}
        <div className="w-full text-left p-4 bg-slate-950 rounded-2xl border border-slate-800 text-[11px] text-slate-400 space-y-2.5">
          <p className="font-semibold text-emerald-400 flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5" />
            <span>Encrypted Cloud Sync Active</span>
          </p>
          <p className="leading-snug text-slate-400">
            All reports, medication schedules, and daily symptom logs are cryptographically secured. Force a full manual sync of local storage to your Firestore account to preserve data integrity across devices.
          </p>
          
          {syncSuccess && (
            <div className="p-2 border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 rounded-lg text-[10px] leading-relaxed animate-pulse">
              {syncSuccess}
            </div>
          )}
          
          {syncError && (
            <div className="p-2 border border-rose-500/20 bg-rose-500/10 text-rose-400 rounded-lg text-[10px] leading-relaxed">
              {syncError}
            </div>
          )}

          <button
            type="button"
            onClick={handleForceSyncClick}
            disabled={isSyncing}
            className={`w-full py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer ${
              isSyncing 
                ? 'bg-slate-900 border-slate-850 text-slate-500' 
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
            }`}
          >
            <RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing to Cloud...' : 'Align & Sync with Firestore'}</span>
          </button>
        </div>

        {/* Secure Portability Archive Export */}
        <div className="w-full text-left p-4 bg-slate-950 rounded-2xl border border-slate-800 text-[11px] text-slate-400 space-y-2.5">
          <p className="font-semibold text-indigo-400 flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 animate-pulse" />
            <span>Secure Portability Archive</span>
          </p>
          <p className="leading-snug text-slate-400">
            Generate a secure offline data archive package in strict JSON compliance, capturing all medication schedules, recorded diaries, daily symptoms, and processed AI document analyses.
          </p>
          <button
            type="button"
            onClick={handleExportArchive}
            className="w-full py-2 px-3 rounded-lg border bg-indigo-500/10 border-indigo-500/20 hover:bg-indigo-500/20 text-indigo-400 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Full Medical Archive</span>
          </button>
        </div>

        <button
          onClick={onLogout}
          className="w-full py-2.5 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white rounded-xl transition text-xs font-semibold cursor-pointer border border-rose-500/20"
        >
          Sign Out of Private File
        </button>
      </div>

      {/* Edit Form Column */}
      <div className="lg:col-span-8 space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-sm">
          <div className="border-b border-slate-800 pb-4 mb-4 flex justify-between items-center">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Client Credentials</p>
              <h3 className="text-lg font-display font-medium text-white">Modify Profile Parameters</h3>
            </div>
            {updateSuccess && (
              <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl font-medium animate-pulse">
                Profile updated successfully!
              </span>
            )}
          </div>

          <form onSubmit={handleProfileSave} className="space-y-6">
            {/* Change Profile Image Row Option */}
            <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-850 space-y-4 text-left">
              <span className="text-[11px] text-slate-400 block font-bold uppercase tracking-wider">Dynamic Profile Picture</span>
              
              <div className="flex flex-col sm:flex-row items-center gap-5">
                <div className="relative h-16 w-16 rounded-full overflow-hidden border-2 border-emerald-500/40 shadow-lg shrink-0">
                  <img
                    src={avatar}
                    alt="Current Avatar"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/45 flex items-center justify-center opacity-0 hover:opacity-100 transition duration-150">
                    <Camera className="h-4 w-4 text-white" />
                  </div>
                </div>

                <div className="flex-1 w-full space-y-3.5">
                  {/* Preset Avatars Selection Option */}
                  <div className="space-y-1.5">
                    <p className="text-[11px] text-slate-400 font-semibold">Select dynamic preset:</p>
                    <div className="flex gap-2">
                      {[
                        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150",
                        "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=150",
                        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150",
                        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150"
                      ].map((avUrl, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => setAvatar(avUrl)}
                          className={`relative h-10 w-10 rounded-full overflow-hidden border-2 transition cursor-pointer ${
                            avatar === avUrl ? 'border-emerald-500 scale-105 shadow shadow-emerald-500/20' : 'border-slate-800 opacity-60 hover:opacity-100'
                          }`}
                        >
                          <img src={avUrl} className="h-full w-full object-cover" alt="" />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Drag-and-Drop or Click File Upload */}
                  <div className="space-y-1.5">
                    <p className="text-[11px] text-slate-400 font-semibold">Or upload custom clinical passport photo:</p>
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                          handleImageUpload(e.dataTransfer.files[0]);
                        }
                      }}
                      onClick={() => document.getElementById('avatar-file-input')?.click()}
                      className="border border-dashed border-slate-800 hover:border-emerald-500 bg-slate-950/40 hover:bg-emerald-500/5 rounded-xl p-3 text-center cursor-pointer transition flex items-center justify-center gap-2 text-[11px] text-slate-400 hover:text-white"
                    >
                      <Upload className="h-3.5 w-3.5 text-slate-400" />
                      <span>Drag &amp; drop your image here or <strong className="text-emerald-400 font-semibold">click to browse</strong></span>
                      <input
                        id="avatar-file-input"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleImageUpload(e.target.files[0]);
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-300 block mb-1.5 font-semibold">User Display Name</label>
                <input
                  type="text"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:border-emerald-500"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 block mb-1.5 font-semibold">Age (Years)</label>
                  <input
                    type="number"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:border-emerald-500"
                    value={age}
                    min="1"
                    max="120"
                    onChange={(e) => setAge(parseInt(e.target.value) || 30)}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 block mb-1.5 font-semibold">Biological Gender</label>
                  <select
                    className="w-full h-[38px] bg-slate-950 border border-slate-800 rounded-xl px-2 text-xs text-white focus:border-emerald-500"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Non-binary">Non-binary</option>
                    <option value="Rather not say">Rather not say</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <span className="text-xs text-slate-300 block font-semibold uppercase tracking-wider">Active Pathologies &amp; Diagnoses</span>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 bg-slate-950 p-4 rounded-2xl border border-slate-800/60">
                {ALL_DIAGNOSES.map((diag) => {
                  const checked = conditions.includes(diag);
                  return (
                    <button
                      key={diag}
                      type="button"
                      onClick={() => toggleCondition(diag)}
                      className={`flex items-center justify-between text-left p-2.5 rounded-xl border text-[11px] font-semibold transition-all cursor-pointer ${checked ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-slate-900 border-slate-800/80 text-slate-400 hover:text-slate-300'}`}
                    >
                      <span>{diag}</span>
                      <input
                        type="checkbox"
                        checked={checked}
                        readOnly
                        className="rounded border-slate-800 text-emerald-500 focus:ring-0 cursor-pointer h-3.5 w-3.5 bg-slate-950"
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl transition cursor-pointer shadow-md inline-flex items-center gap-2"
            >
              <span>Update Parameters</span>
            </button>
          </form>
        </div>

        {/* Notification Preferences Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="border-b border-slate-800 pb-4 mb-2 flex justify-between items-center bg-transparent">
            <div>
              <p className="text-xs font-semibold text-indigo-400 uppercase tracking-widest">Alert Control Center</p>
              <h3 className="text-lg font-display font-medium text-white font-sans mt-0.5">Notification Preferences</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Define which clinical events trigger active push alerts or live dashboard notifications.
              </p>
            </div>
            {notifSuccess && (
              <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl font-medium animate-pulse shrink-0">
                Preferences saved!
              </span>
            )}
          </div>

          <form onSubmit={handleNotificationSave} className="space-y-4">
            <div className="space-y-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 text-left">
              {/* Item 1: Medication Reminders */}
              <div className="flex items-center justify-between py-2 border-b border-slate-800/50">
                <div className="flex gap-3 items-center pr-4">
                  <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                    <Pill className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-white">Medication Reminders</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                      Alerts for when it is time to take your prescribed doses based on scheduled times.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  id="toggle-medication-reminders"
                  onClick={() => setMedicationReminders(!medicationReminders)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${medicationReminders ? 'bg-emerald-500/90' : 'bg-slate-800'}`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-slate-950 shadow ring-0 transition duration-200 ease-in-out ${medicationReminders ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* Item 2: Refill Alerts */}
              <div className="flex items-center justify-between py-2 border-b border-slate-800/50">
                <div className="flex gap-3 items-center pr-4">
                  <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400">
                    <RefreshCw className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-white">Refill Alerts &amp; Stock Warnings</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                      Prompting notifications when your available pill counts fall below safety thresholds.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  id="toggle-refill-alerts"
                  onClick={() => setRefillAlerts(!refillAlerts)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${refillAlerts ? 'bg-emerald-500/90' : 'bg-slate-800'}`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-slate-950 shadow ring-0 transition duration-200 ease-in-out ${refillAlerts ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* Item 3: System Messages */}
              <div className="flex items-center justify-between py-1">
                <div className="flex gap-3 items-center pr-4">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-white">System Messages &amp; Action Items</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                      Receive diagnostic intelligence suggestions, clinical analytics updates, and file sync highlights.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  id="toggle-system-messages"
                  onClick={() => setSystemMessages(!systemMessages)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${systemMessages ? 'bg-emerald-500/90' : 'bg-slate-800'}`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-slate-950 shadow ring-0 transition duration-200 ease-in-out ${systemMessages ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-md inline-flex items-center gap-2"
              id="submit-notification-settings-btn"
            >
              <span>Save Notification Settings</span>
            </button>
          </form>
        </div>

        {/* Change Password Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Account Security</p>
            <h3 className="text-lg font-display font-medium text-white">Change Security Password</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Verify your profile credentials with an updated secure password. Ensure it contains at least 6 characters.
            </p>
          </div>

          <form onSubmit={handlePasswordChange} className="space-y-4">
            {passwordSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl font-semibold">
                {passwordSuccess}
              </div>
            )}
            {passwordError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-455 text-xs rounded-xl font-semibold">
                {passwordError}
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-300 block mb-1.5 font-semibold">New Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-xs text-slate-300 block mb-1.5 font-semibold">Confirm New Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-md inline-flex items-center gap-2"
              id="submit-password-change-settings-btn"
            >
              <span>Update Password</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
