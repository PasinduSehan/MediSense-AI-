import React, { useState, useEffect } from 'react';
import { User, MedicalDocument, Medication, SymptomLog, MonthlyProgressReport, HealthNotification, WellnessHabit, NotificationSettings } from './types';
import AuthModal from './components/AuthModal';
import Dashboard from './components/Dashboard';
import ReportTracker from './components/ReportTracker';
import MedicationSchedule from './components/MedicationSchedule';
import MonthlyReport from './components/MonthlyReport';
import ProfileSettings from './components/ProfileSettings';
import AIChatModal from './components/AIChatModal';
import { Activity, Bot, Bell, Moon, Sun, ClipboardList, Clock, CalendarRange, HeartHandshake, ShieldAlert, Check, X, Smartphone, UserCheck, Eye, Sliders, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Firebase core & auth imports
import { auth } from './lib/firebase';
import { onAuthStateChanged, signOut as fbSignOut } from 'firebase/auth';
import {
  saveUserToFirestore,
  fetchUserFromFirestore,
  fetchAllUsersFromFirestore,
  listenToDocuments,
  saveDocumentToFirestore,
  deleteDocumentFromFirestore,
  listenToMedications,
  saveMedicationToFirestore,
  deleteMedicationFromFirestore,
  listenToSymptomLogs,
  saveSymptomLogToFirestore,
  listenToMonthlyReports,
  saveMonthlyReportToFirestore,
  listenToNotifications,
  saveNotificationToFirestore,
  deleteNotificationFromFirestore,
  listenToWellnessHabits,
  saveWellnessHabitToFirestore
} from './lib/db';

// Help synthesize audio alerts for medication timers
function playNotificationSound() {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // High alert double beep
    const playBeep = (timeOffset: number) => {
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(660, audioCtx.currentTime + timeOffset); // high-pitched medical freq
      
      gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime + timeOffset);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + timeOffset + 0.15);
      
      osc.start(audioCtx.currentTime + timeOffset);
      osc.stop(audioCtx.currentTime + timeOffset + 0.15);
    };

    playBeep(0);
    playBeep(0.25);
  } catch (err) {
    console.warn("Audio Context blocked by autoplay policies.");
  }
}

// ServiceWorker-level Cache Storage API Helpers for Request-First Data Alignment
const SERVICE_WORKER_CACHE_NAME = 'medisense-service-worker-cache-v1';

async function getServiceWorkerCachedData<T>(key: string): Promise<T | null> {
  if (typeof window === 'undefined' || !('caches' in window)) return null;
  try {
    const cache = await caches.open(SERVICE_WORKER_CACHE_NAME);
    const response = await cache.match(new Request(`https://medisense-sw-cache.internal/data/${key}`));
    if (response) {
      const text = await response.text();
      return JSON.parse(text) as T;
    }
  } catch (err) {
    console.warn("ServiceWorker Cache API read exception. Falling back.", err);
  }
  return null;
}

async function setServiceWorkerCachedData<T>(key: string, data: T): Promise<void> {
  if (typeof window === 'undefined' || !('caches' in window)) return;
  try {
    const cache = await caches.open(SERVICE_WORKER_CACHE_NAME);
    await cache.put(
      new Request(`https://medisense-sw-cache.internal/data/${key}`),
      new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' }
      })
    );
  } catch (err) {
    console.warn("ServiceWorker Cache API write exception.", err);
  }
}

// Pre-packaged high-fidelity clinical demo details as requested by the uploaded project proposal
const INITIAL_DEMO_USER: User = {
  id: 'user_kavisha14',
  name: 'Kavisha Jayasekera',
  email: 'shewinandreew@gmail.com',
  age: 24,
  gender: 'Male',
  avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150',
  primaryConditions: ['Diabetes', 'Depression', 'Hypertension'],
  vitals: {
    bloodPressureSys: 138,
    bloodPressureDia: 86,
    bloodGlucose: 134,
    heartRate: 74,
    weight: 68,
    lastUpdated: new Date().toISOString()
  },
  createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
  notificationSettings: {
    medicationReminders: true,
    refillAlerts: true,
    systemMessages: true
  }
};

const INITIAL_DEMO_DOCUMENTS: MedicalDocument[] = [
  {
    id: 'doc_demo_diabetes',
    userId: 'user_kavisha14',
    title: 'Cardiff Clinical Screening HbA1c',
    type: 'report',
    date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toLocaleDateString(),
    rawText: "LABORATORY DIAGNOSIS RESULTS: METABOLIC HEMOGLOBIN HbA1c screening is recorded elevated at 7.1%. Fasting plasma glucose measures 134 mg/dL. Chronic indicators for Type 2 Diabetes mellitus are apparent with moderate hyperinsulinemia. Patient complains of physical tiredness and mild insomniac tendencies. Prescribing immediate 500mg Metformin Hydrochloride twice daily.",
    analysis: {
      simplifiedExplanation: "This laboratory report is a screening for diabetic management. Your HbA1c level is 7.1%, which means your blood glucose average is elevated above the standard threshold (healthy is below 5.7%). Fasting blood sugar looks elevated at 134 mg/dL. This establishes clinical indicators for Type 2 Diabetes.",
      diagnosedTerms: "Type 2 Diabetes mellitus, Elevated Insulin Resistance",
      primaryInsights: [
        "Your average blood glucose has been resting inside clinical diabetic margins.",
        "Proactive sodium and sugar controls are required to protect your internal capillary systems.",
        "Daily walks are highly indicated to enhance skeletal muscle insulin sensitivity naturally."
      ],
      severity: 'High',
      drugInteractions: {
        detected: false,
        warning: "",
        interactants: []
      },
      recommendations: {
        food: ["Add green leafy spinach, broccoli, chia seed water, and wild organic salmon.", "Avoid high-glycemic white flour breads, sweet pastries, and fruit cordial concentrates."],
        exercise: ["Brisk walking for 30 minutes post-dinner", "Low-stress functional resistance loops twice a week"],
        lifestyle: ["Keep hydration goals above 2.5 Liters every day.", "Monitor glucose pre-breakfast and write down coordinates."],
        nextSteps: ["Review insulin results with your primary general practitioner.", "Establish a medication timetable for oral tablets."]
      },
      drugs: [
        {
          name: "Metformin Hydrochloride",
          dosage: "500 mg",
          frequency: "Twice daily",
          purpose: "Lowering liver glucose synthesis and boosting muscle response to natural insulin",
          sideEffects: ["Mild temporary stomach cramps", "Metallic dry taste"]
        }
      ]
    },
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
  }
];

const INITIAL_DEMO_MEDICATIONS: Medication[] = [
  {
    id: 'med_demo_metformin',
    userId: 'user_kavisha14',
    name: 'Metformin Hydrochloride',
    dosage: '500 mg',
    frequency: 'Twice daily',
    times: ['08:00', '20:00'],
    durationDays: 30,
    totalDoses: 60,
    remainingDoses: 38,
    startDate: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toLocaleDateString(),
    purpose: 'Anti-diabetic cellular sensitivity aid',
    notes: 'Take twice daily after major meals. Avoid heavy alcohol intake.',
    active: true,
    createdAt: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString(),
    lowStockThreshold: 10
  },
  {
    id: 'med_demo_sertraline',
    userId: 'user_kavisha14',
    name: 'Sertraline (Zoloft)',
    dosage: '50 mg',
    frequency: 'Once daily',
    times: ['08:00'],
    durationDays: 30,
    totalDoses: 30,
    remainingDoses: 22,
    startDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toLocaleDateString(),
    purpose: 'Stabilizing depressive mood markers',
    notes: 'Take in the morning with a full glass of water. Take consistently every day.',
    active: true,
    createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    lowStockThreshold: 5
  }
];

const INITIAL_DEMO_SYMPTOMS: SymptomLog[] = [
  { id: 'l1', userId: 'user_kavisha14', symptomType: 'Glucose', severity: 6, notes: 'Fasting glucose was high after eating evening pasta dessert.', value: 145, loggedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'l2', userId: 'user_kavisha14', symptomType: 'Mood', severity: 5, notes: 'Felt slight anxiety creep in during office deadlines.', value: 5, loggedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'l3', userId: 'user_kavisha14', symptomType: 'Blood Pressure', severity: 4, notes: 'Pressure levels tested after sodium heavy lunch.', value: 141, loggedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'l4', userId: 'user_kavisha14', symptomType: 'Glucose', severity: 3, notes: 'Sugar levels stabilized post-brisk walk routine.', value: 112, loggedAt: new Date().toISOString() }
];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState<boolean>(true);
  const [existingUsers, setExistingUsers] = useState<User[]>([]);
  const [documents, setDocuments] = useState<MedicalDocument[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [symptomLogs, setSymptomLogs] = useState<SymptomLog[]>([]);
  const [reports, setReports] = useState<MonthlyProgressReport[]>([]);
  const [notifications, setNotifications] = useState<HealthNotification[]>([]);
  const [wellnessHabits, setWellnessHabits] = useState<WellnessHabit[]>([]);
  
  // Navigation
  const [currentView, setCurrentView] = useState<'dashboard' | 'documents' | 'scheduler' | 'reports' | 'profile'>('dashboard');
  
  // Custom Styling Mode
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [visualMode, setVisualMode] = useState<'dark' | 'light' | 'low-blue' | 'aviation-red' | 'high-contrast'>('dark');
  const [showThemeMenu, setShowThemeMenu] = useState<boolean>(false);

  // Sync active visual mode directly to document.body
  useEffect(() => {
    const themeClass = 
      visualMode === 'light' ? 'visual-mode-light' : 
      visualMode === 'low-blue' ? 'visual-mode-low-blue' : 
      visualMode === 'aviation-red' ? 'visual-mode-aviation-red' : 
      visualMode === 'high-contrast' ? 'visual-mode-high-contrast' : 'visual-mode-dark';
    
    document.body.className = '';
    document.body.classList.add(themeClass);
  }, [visualMode]);
  
  // Active Alert Toast State
  const [activeToast, setActiveToast] = useState<{ id: string; medName: string; dosage: string; time: string } | null>(null);
  
  // AI Chat Drawer State
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);

  // Load existing users from Firestore on boot
  useEffect(() => {
    async function loadExistings() {
      try {
        const users = await fetchAllUsersFromFirestore();
        const cachedUsersRaw = localStorage.getItem('medisense_users');
        let mergedUsers = users && users.length > 0 ? [...users] : [];

        if (cachedUsersRaw) {
          const cachedUsers = JSON.parse(cachedUsersRaw) as User[];
          cachedUsers.forEach(localU => {
            const remoteIndex = mergedUsers.findIndex(u => u.id === localU.id);
            if (remoteIndex !== -1) {
              const remoteU = mergedUsers[remoteIndex];
              const localIsNewer = JSON.stringify(localU) !== JSON.stringify(remoteU);
              if (localIsNewer) {
                mergedUsers[remoteIndex] = localU;
                saveUserToFirestore(localU).catch(err => console.warn("Failed to sync local profile to firestore", err));
              }
            } else {
              mergedUsers.push(localU);
              saveUserToFirestore(localU).catch(err => console.warn("Failed to register offline profile to firestore", err));
            }
          });
        }

        if (mergedUsers.length > 0) {
          setExistingUsers(mergedUsers);
          localStorage.setItem('medisense_users', JSON.stringify(mergedUsers));
        } else {
          setExistingUsers([INITIAL_DEMO_USER]);
        }
      } catch (err) {
        console.warn("Could not load users from Firestore, using client cache", err);
        const cachedUsers = localStorage.getItem('medisense_users');
        if (cachedUsers) {
          setExistingUsers(JSON.parse(cachedUsers));
        } else {
          setExistingUsers([INITIAL_DEMO_USER]);
        }
      }
    }
    loadExistings();
  }, []);

  // Listen to Firebase Auth state change to sync profile
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setIsProfileLoading(true);
      if (fbUser) {
        // --- Request-First Strategy: Attempt to load cached profile immediately for instant responsiveness ---
        let cachedProfile: User | null = null;
        try {
          cachedProfile = await getServiceWorkerCachedData<User>(`profile_${fbUser.uid}`);
          if (!cachedProfile) {
            const localUsersRaw = localStorage.getItem('medisense_users');
            if (localUsersRaw) {
              const usersList = JSON.parse(localUsersRaw) as User[];
              cachedProfile = usersList.find(u => u.id === fbUser.uid) || null;
            }
          }
        } catch (cacheErr) {
          console.warn("Could not read initial user profile from ServiceWorker Cache API", cacheErr);
        }

        if (cachedProfile) {
          setUser(cachedProfile);
          setIsProfileLoading(false);
          loadLocalFallbackData(cachedProfile.id);
        }

        // --- Fetch Fresh Data from Firestore and refresh/align the ServiceWorker-level cache ---
        try {
          let userProfile = await fetchUserFromFirestore(fbUser.uid);
          if (!userProfile) {
            // Register a new profile for this user if they don't have one
            userProfile = {
              id: fbUser.uid,
              name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Member',
              email: fbUser.email || '',
              age: 30,
              gender: 'Rather not say',
              avatar: fbUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150',
              primaryConditions: ['General Care'],
              vitals: {
                bloodPressureSys: 0,
                bloodPressureDia: 0,
                bloodGlucose: 0,
                heartRate: 0,
                weight: 0,
                lastUpdated: ""
              },
              createdAt: new Date().toISOString(),
              notificationSettings: {
                medicationReminders: true,
                refillAlerts: true,
                systemMessages: true
              }
            };
            await saveUserToFirestore(userProfile);
          }
          
          setUser(userProfile);
          localStorage.setItem('medisense_active_user_id', userProfile.id);
          
          // Propagate to ServiceWorker Cache API
          await setServiceWorkerCachedData(`profile_${userProfile.id}`, userProfile);
          
          // Cache in existingUsers local list as well for instant loading on refreshes
          setExistingUsers(prev => {
            const hasUser = prev.some(u => u.id === userProfile!.id);
            const updated = hasUser 
              ? prev.map(u => u.id === userProfile!.id ? userProfile! : u)
              : [...prev, userProfile!];
            localStorage.setItem('medisense_users', JSON.stringify(updated));
            return updated;
          });
        } catch (err) {
          console.error("Request-first Auth sync from Firestore failed, retaining cache context", err);
          if (!cachedProfile) {
            const defaultNewProfile: User = {
              id: fbUser.uid,
              name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Member',
              email: fbUser.email || '',
              age: 30,
              gender: 'Rather not say',
              avatar: fbUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150',
              primaryConditions: ['General Care'],
              vitals: {
                bloodPressureSys: 0,
                bloodPressureDia: 0,
                bloodGlucose: 0,
                heartRate: 0,
                weight: 0,
                lastUpdated: ""
              },
              createdAt: new Date().toISOString(),
              notificationSettings: {
                medicationReminders: true,
                refillAlerts: true,
                systemMessages: true
              }
            };
            setUser(defaultNewProfile);
            loadLocalFallbackData(defaultNewProfile.id);
          }
        } finally {
          setIsProfileLoading(false);
        }
      } else {
        // Fallback to local storage if no user logged in via firebase yet,
        // so they can play around with the applet before signing in.
        const cachedActiveId = localStorage.getItem('medisense_active_user_id') || INITIAL_DEMO_USER.id;
        const localUsersRaw = localStorage.getItem('medisense_users');
        let localUser: User | null = null;
        if (localUsersRaw) {
          const usersList = JSON.parse(localUsersRaw) as User[];
          localUser = usersList.find(u => u.id === cachedActiveId) || null;
        }

        if (localUser) {
          setUser(localUser);
          loadLocalFallbackData(localUser.id);
        } else {
          // Default to the Cardiff Demo profile for instant evaluation
          setUser(INITIAL_DEMO_USER);
          loadLocalFallbackData(INITIAL_DEMO_USER.id);
        }
        setIsProfileLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Set up real-time live observers for current active user
  useEffect(() => {
    if (!user) return;

    // Immediately load cached/local database records first to avoid UI bleed from previous user
    loadLocalFallbackData(user.id);

    // If local/offline user profile or no active authenticated session, skip remote Firestore observers
    if (user.id.startsWith('local_') || !auth.currentUser || auth.currentUser.uid !== user.id) {
      return;
    }

    // Listen to Documents
    const unsubDocs = listenToDocuments(user.id, (docs) => {
      setDocuments(docs);
      localStorage.setItem(`medisense_docs_${user.id}`, JSON.stringify(docs));
      setServiceWorkerCachedData(`docs_${user.id}`, docs);
    });

    // Listen to Medications
    const unsubMeds = listenToMedications(user.id, (meds) => {
      setMedications(meds);
      localStorage.setItem(`medisense_meds_${user.id}`, JSON.stringify(meds));
      setServiceWorkerCachedData(`meds_${user.id}`, meds);
    });

    // Listen to SymptomLogs
    const unsubLogs = listenToSymptomLogs(user.id, (logs) => {
      setSymptomLogs(logs);
      localStorage.setItem(`medisense_symptomlogs_${user.id}`, JSON.stringify(logs));
      setServiceWorkerCachedData(`symptomlogs_${user.id}`, logs);
    });

    // Listen to Reports
    const unsubReports = listenToMonthlyReports(user.id, (reps) => {
      setReports(reps);
      localStorage.setItem(`medisense_progress_reports_${user.id}`, JSON.stringify(reps));
      setServiceWorkerCachedData(`reports_${user.id}`, reps);
    });

    // Listen to Notifications
    const unsubNotifs = listenToNotifications(user.id, (notifs) => {
      setNotifications(notifs);
      localStorage.setItem(`medisense_notifications_${user.id}`, JSON.stringify(notifs));
      setServiceWorkerCachedData(`notifications_${user.id}`, notifs);
    });

    // Listen to Wellness Habits
    const unsubHabits = listenToWellnessHabits(user.id, (habits) => {
      setWellnessHabits(habits);
      localStorage.setItem(`medisense_wellness_habits_${user.id}`, JSON.stringify(habits));
      setServiceWorkerCachedData(`wellness_habits_${user.id}`, habits);
    });

    return () => {
      unsubDocs?.();
      unsubMeds?.();
      unsubLogs?.();
      unsubReports?.();
      unsubNotifs?.();
      unsubHabits?.();
    };
  }, [user?.id]);

  // Background Medication Tracker checking for due medications
  useEffect(() => {
    if (!user) return;

    const checkMedicationSchedule = () => {
      const d = new Date();
      const currentFormattedTime = [
        String(d.getHours()).padStart(2, '0'),
        String(d.getMinutes()).padStart(2, '0')
      ].join(':');
      const todayDateStr = [
        d.getFullYear(),
        String(d.getMonth() + 1).padStart(2, '0'),
        String(d.getDate()).padStart(2, '0')
      ].join('-');

      medications.forEach(med => {
        if (med.active && med.times && med.times.includes(currentFormattedTime)) {
          // Check if already notified for this exact minute today
          const reminderKey = `notified_${med.id}_${todayDateStr}_${currentFormattedTime}`;
          if (!localStorage.getItem(reminderKey)) {
            // Persist the triggered state to localStorage to prevent duplicate sound/notification
            localStorage.setItem(reminderKey, 'true');

            // 1. Play medication reminder sound
            try {
              playNotificationSound();
            } catch (err) {
              console.warn("Could not play sound", err);
            }

            // 2. Generate and append standard app HealthNotification object
            const alertId = 'notif_sched_' + Date.now();
            const newAlert: HealthNotification = {
              id: alertId,
              userId: user.id,
              title: `⏰ Medication Time: ${med.name}`,
              message: `Take your dose of ${med.dosage} now.${med.notes ? ` Note: ${med.notes}` : ''}`,
              type: 'alert',
              timestamp: new Date().toISOString(),
              read: false,
              metaData: {
                medicationId: med.id,
                time: currentFormattedTime
              }
            };

            setNotifications(prev => [...prev, newAlert]);
            saveNotificationToFirestore(user.id, newAlert).catch(() => {});

            // 3. Trigger dynamic app toast notification overlay block
            setActiveToast({
              id: med.id,
              medName: med.name,
              dosage: med.dosage,
              time: currentFormattedTime
            });

            // 4. Fire standard browser Notification API (persisting alert using requireInteraction: true)
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              try {
                // Register absolute notification object which is persistent across minimized environments
                new Notification(`⏰ Take Medication: ${med.name}`, {
                  body: `Your scheduled dose of ${med.dosage} is due at ${currentFormattedTime}.\n${med.notes ? `Personal Note: ${med.notes}` : 'Please verify schedule logs.'}`,
                  icon: user.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150",
                  tag: `rx-reminder-${med.id}-${currentFormattedTime}`,
                  requireInteraction: true // Ensures browser-level notification alert persists on screen until clicked or closed
                });
              } catch (e) {
                console.error("Browser notification failed to display", e);
              }
            }
          }
        }
      });
    };

    // Run check immediately upon load/medication change
    checkMedicationSchedule();

    // Setup highly persistent background interval (every 10 seconds) to catch minute-transitions safely
    const intervalId = setInterval(checkMedicationSchedule, 10000);

    return () => clearInterval(intervalId);
  }, [user?.id, medications]);

  const loadLocalFallbackData = (userId: string) => {
    // 1. Immediately paint states synchronously from localStorage for raw speed and instant interactivity
    setDocuments(JSON.parse(localStorage.getItem(`medisense_docs_${userId}`) || "[]"));
    setMedications(JSON.parse(localStorage.getItem(`medisense_meds_${userId}`) || "[]"));
    setSymptomLogs(JSON.parse(localStorage.getItem(`medisense_symptomlogs_${userId}`) || "[]"));
    setReports(JSON.parse(localStorage.getItem(`medisense_progress_reports_${userId}`) || "[]"));
    setNotifications(JSON.parse(localStorage.getItem(`medisense_notifications_${userId}`) || "[]"));
    setWellnessHabits(JSON.parse(localStorage.getItem(`medisense_wellness_habits_${userId}`) || "[]"));

    // 2. Query the ServiceWorker cache asynchronously to guarantee robust, isolated recovery options
    getServiceWorkerCachedData<Medication[]>(`meds_${userId}`).then((cachedMeds) => {
      if (cachedMeds && cachedMeds.length > 0) {
        setMedications(cachedMeds);
      }
    });

    getServiceWorkerCachedData<MedicalDocument[]>(`docs_${userId}`).then((cachedDocs) => {
      if (cachedDocs && cachedDocs.length > 0) {
        setDocuments(cachedDocs);
      }
    });

    getServiceWorkerCachedData<SymptomLog[]>(`symptomlogs_${userId}`).then((cachedLogs) => {
      if (cachedLogs && cachedLogs.length > 0) {
        setSymptomLogs(cachedLogs);
      }
    });

    getServiceWorkerCachedData<MonthlyProgressReport[]>(`reports_${userId}`).then((cachedReps) => {
      if (cachedReps && cachedReps.length > 0) {
        setReports(cachedReps);
      }
    });

    getServiceWorkerCachedData<HealthNotification[]>(`notifications_${userId}`).then((cachedNotifs) => {
      if (cachedNotifs && cachedNotifs.length > 0) {
        setNotifications(cachedNotifs);
      }
    });

    getServiceWorkerCachedData<WellnessHabit[]>(`wellness_habits_${userId}`).then((cachedHabits) => {
      if (cachedHabits && cachedHabits.length > 0) {
        setWellnessHabits(cachedHabits);
      }
    });

    // If it's the default demo user and no local storage data is cached, bootstrap it
    if (userId === INITIAL_DEMO_USER.id) {
      const cachedDocs = localStorage.getItem(`medisense_docs_${userId}`);
      if (!cachedDocs) {
        setDocuments(INITIAL_DEMO_DOCUMENTS);
        setMedications(INITIAL_DEMO_MEDICATIONS);
        setSymptomLogs(INITIAL_DEMO_SYMPTOMS);
        localStorage.setItem(`medisense_docs_${userId}`, JSON.stringify(INITIAL_DEMO_DOCUMENTS));
        localStorage.setItem(`medisense_meds_${userId}`, JSON.stringify(INITIAL_DEMO_MEDICATIONS));
        localStorage.setItem(`medisense_symptomlogs_${userId}`, JSON.stringify(INITIAL_DEMO_SYMPTOMS));
      }

      const cachedHabits = localStorage.getItem(`medisense_wellness_habits_${userId}`);
      if (!cachedHabits) {
        const DEFAULT_HABIT_NAMES = [
          'Drank 2L Water',
          '8 Hours Sleep',
          'No Sugar Treats',
          'Took Prescribed Dosage',
          '30 Min Outdoor Walk',
          'Logged Daily Vitals',
          '10 Min Mindful Breathing'
        ];
        const demoHabits: WellnessHabit[] = [];
        
        // Let's seed the last 5 days
        for (let i = 0; i < 5; i++) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().split('T')[0];
          
          DEFAULT_HABIT_NAMES.forEach((name, idx) => {
            let completed = false;
            if (i === 0) {
              completed = idx === 0 || idx === 3; // today partially done
            } else if (i === 1) {
              completed = idx !== 2 && idx !== 6; // yesterday mostly done
            } else if (i === 2) {
              completed = idx !== 4; // 2 days ago
            } else if (i === 3) {
              completed = idx !== 1 && idx !== 5; // 3 days ago
            } else {
              completed = true; // 4 days ago full compliance
            }
            
            demoHabits.push({
              id: `habit_demo_${dateStr}_${idx}`,
              userId: userId,
              name,
              completed,
              date: dateStr,
              timestamp: d.toISOString()
            });
          });
        }
        setWellnessHabits(demoHabits);
        localStorage.setItem(`medisense_wellness_habits_${userId}`, JSON.stringify(demoHabits));
      }
    }
  };

  // State handlers to bubble mutations downward
  const handleAuthSuccess = async (selectedUser: User) => {
    setUser(selectedUser);
    localStorage.setItem('medisense_active_user_id', selectedUser.id);
    try {
      await saveUserToFirestore(selectedUser);
    } catch (err) {
      console.warn("Could not write profile to cloud, using client-side cache", err);
    }
  };

  const handleRegisterNewUser = async (newUser: User) => {
    const updated = [...existingUsers.filter(u => u.id !== newUser.id), newUser];
    setExistingUsers(updated);
    localStorage.setItem('medisense_users', JSON.stringify(updated));
    try {
      await saveUserToFirestore(newUser);
    } catch (err) {
      console.warn("Could not sync registration to Firestore", err);
    }
  };

  const handleUpdateVitals = async (updatedVitals: User['vitals']) => {
    if (!user) return;
    const updatedUser = { ...user, vitals: updatedVitals };
    setUser(updatedUser);
    
    const updatedUsers = existingUsers.map(u => u.id === user.id ? updatedUser : u);
    setExistingUsers(updatedUsers);
    localStorage.setItem('medisense_users', JSON.stringify(updatedUsers));
    
    try {
      await saveUserToFirestore(updatedUser);
    } catch {
      console.warn("Offline vitals update stored locally.");
    }
  };

  const handleToggleWellnessHabit = async (habitName: string, dateStr: string) => {
    if (!user) return;

    const existing = wellnessHabits.find(h => h.name === habitName && h.date === dateStr);

    let updatedHabit: WellnessHabit;
    if (existing) {
      updatedHabit = {
        ...existing,
        completed: !existing.completed,
        timestamp: new Date().toISOString()
      };
    } else {
      updatedHabit = {
        id: `habit_${Math.random().toString(36).substring(2, 11)}`,
        userId: user.id,
        name: habitName,
        completed: true,
        date: dateStr,
        timestamp: new Date().toISOString()
      };
    }

    const updatedList = wellnessHabits.some(h => h.id === updatedHabit.id)
      ? wellnessHabits.map(h => h.id === updatedHabit.id ? updatedHabit : h)
      : [...wellnessHabits, updatedHabit];

    setWellnessHabits(updatedList);
    localStorage.setItem(`medisense_wellness_habits_${user.id}`, JSON.stringify(updatedList));

    try {
      await saveWellnessHabitToFirestore(user.id, updatedHabit);
    } catch (err) {
      console.warn("Could not sync wellness habit to Firestore", err);
    }
  };

  const handleUpdateProfile = async (
    name: string,
    age: number,
    gender: string,
    conditions: string[],
    avatar?: string,
    notificationSettings?: NotificationSettings
  ) => {
    if (!user) return;
    const updatedUser = {
      ...user,
      name,
      age,
      gender,
      primaryConditions: conditions,
      ...(avatar ? { avatar } : {}),
      notificationSettings: notificationSettings || user.notificationSettings || {
        medicationReminders: true,
        refillAlerts: true,
        systemMessages: true
      }
    };
    setUser(updatedUser);

    const updatedUsers = existingUsers.map(u => u.id === user.id ? updatedUser : u);
    setExistingUsers(updatedUsers);
    localStorage.setItem('medisense_users', JSON.stringify(updatedUsers));
    
    try {
      await saveUserToFirestore(updatedUser);
    } catch {
      console.warn("Offline profile sync complete.");
    }
  };

  const handleLogout = async () => {
    try {
      await fbSignOut(auth);
    } catch {}
    
    setUser(null);
    localStorage.removeItem('medisense_active_user_id');
    setDocuments([]);
    setMedications([]);
    setSymptomLogs([]);
    setReports([]);
    setNotifications([]);
  };

  const handleForceCloudSync = async () => {
    if (!user) return;
    
    const promises: Promise<any>[] = [];
    
    // User profile
    promises.push(saveUserToFirestore(user));
    
    // Documents
    documents.forEach(doc => {
      promises.push(saveDocumentToFirestore(user.id, doc));
    });
    
    // Medications
    medications.forEach(med => {
      promises.push(saveMedicationToFirestore(user.id, med));
    });
    
    // Symptom Logs
    symptomLogs.forEach(log => {
      promises.push(saveSymptomLogToFirestore(user.id, log));
    });
    
    // Reports
    reports.forEach(report => {
      promises.push(saveMonthlyReportToFirestore(user.id, report));
    });
    
    // Wellness Habits
    wellnessHabits.forEach(habit => {
      promises.push(saveWellnessHabitToFirestore(user.id, habit));
    });
    
    // Notifications
    notifications.forEach(notif => {
      promises.push(saveNotificationToFirestore(user.id, notif));
    });
    
    await Promise.all(promises);
  };

  // Add parsed dynamic health documents
  const handleAddDocument = async (newDoc: MedicalDocument) => {
    if (!user) return;
    const updated = [...documents, newDoc];
    setDocuments(updated);
    localStorage.setItem(`medisense_docs_${user.id}`, JSON.stringify(updated));
    setServiceWorkerCachedData(`docs_${user.id}`, updated).catch(err => console.error("Cached docs write failed:", err));

    try {
      await saveDocumentToFirestore(user.id, newDoc);
    } catch (err) {
      console.error(err);
    }

    // Side effect: If the document analysis found new medications, write alert notifications to announce them!
    if (newDoc.analysis.drugs && newDoc.analysis.drugs.length > 0) {
      const newlyFoundAlerts: HealthNotification[] = newDoc.analysis.drugs.map((drug, i) => ({
        id: `sys_med_found_${Date.now()}_${i}`,
        userId: user.id,
        title: `AI Drug Extracted: ${drug.name}`,
        message: `Extracted ${drug.dosage} for ${drug.purpose}. Click 'Scheduler' to activate timers.`,
        type: 'alert',
        timestamp: new Date().toISOString(),
        read: false
      }));
      const updatedNotifs = [...notifications, ...newlyFoundAlerts];
      setNotifications(updatedNotifs);
      localStorage.setItem(`medisense_notifications_${user.id}`, JSON.stringify(updatedNotifs));
      setServiceWorkerCachedData(`notifications_${user.id}`, updatedNotifs).catch(() => {});

      for (const alert of newlyFoundAlerts) {
        try {
          await saveNotificationToFirestore(user.id, alert);
        } catch {}
      }
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!user) return;
    const updated = documents.filter(d => d.id !== docId);
    setDocuments(updated);
    localStorage.setItem(`medisense_docs_${user.id}`, JSON.stringify(updated));
    setServiceWorkerCachedData(`docs_${user.id}`, updated).catch(err => console.error("Cached docs write failed:", err));

    try {
      await deleteDocumentFromFirestore(user.id, docId);
    } catch (err) {
      console.error(err);
    }
  };

  // Fast-import medicine parsed from prescription direct to scheduler
  const handleImportMedication = async (medName: string, dosage: string, frequency: string, purpose: string) => {
    if (!user) return;
    const times = frequency.toLowerCase().includes('twice') ? ['08:00', '20:00'] : ['08:00'];
    const newMed: Medication = {
      id: 'med_' + Math.random().toString(36).substr(2, 9),
      userId: user.id,
      name: medName,
      dosage,
      frequency,
      times,
      durationDays: 30,
      totalDoses: 60,
      remainingDoses: 60,
      startDate: new Date().toLocaleDateString(),
      purpose,
      active: true,
      createdAt: new Date().toISOString()
    };

    const updatedMeds = [...medications, newMed];
    setMedications(updatedMeds);
    localStorage.setItem(`medisense_meds_${user.id}`, JSON.stringify(updatedMeds));
    setServiceWorkerCachedData(`meds_${user.id}`, updatedMeds).catch(() => {});

    try {
      await saveMedicationToFirestore(user.id, newMed);
    } catch {}
    
    setCurrentView('scheduler'); // route automatically so user can review it
  };

  // Schedulers triggers
  const handleAddMedication = async (newMed: Medication) => {
    if (!user) return;
    const updated = [...medications, newMed];
    setMedications(updated);
    localStorage.setItem(`medisense_meds_${user.id}`, JSON.stringify(updated));
    setServiceWorkerCachedData(`meds_${user.id}`, updated).catch(() => {});

    try {
      await saveMedicationToFirestore(user.id, newMed);
    } catch {}
  };

  const handleTakeDose = async (medId: string) => {
    if (!user) return;
    const med = medications.find(m => m.id === medId);
    if (!med) return;

    const updated = medications.map(m => {
      if (m.id === medId && m.remainingDoses > 0) {
        const updatedMed = { ...m, remainingDoses: m.remainingDoses - 1 };
        saveMedicationToFirestore(user.id, updatedMed).catch(err => console.error(err));
        return updatedMed;
      }
      return m;
    });
    setMedications(updated);
    localStorage.setItem(`medisense_meds_${user.id}`, JSON.stringify(updated));
    setServiceWorkerCachedData(`meds_${user.id}`, updated).catch(() => {});

    // Post medication dose log notification for history auditing & consistency calendar
    const medLogNotif: HealthNotification = {
      id: 'notif_med_take_' + Math.random().toString(36).substr(2, 9),
      userId: user.id,
      title: 'Medication Dose Taken',
      message: `Took prescribed dose of ${med.name} (${med.dosage}).`,
      type: 'medication',
      timestamp: new Date().toISOString(),
      read: true,
      metaData: {
        medicationId: medId
      }
    };

    // Check if the remaining doses has fallen below lowStockThreshold
    const targetMedUpdated = updated.find(m => m.id === medId);
    const extraNotifications: HealthNotification[] = [];
    if (targetMedUpdated && targetMedUpdated.remainingDoses > 0) {
      const threshold = targetMedUpdated.lowStockThreshold !== undefined ? targetMedUpdated.lowStockThreshold : 5;
      if (targetMedUpdated.remainingDoses < threshold) {
        const refillNotif: HealthNotification = {
          id: 'sys_refill_warning_' + medId + '_' + Date.now(),
          userId: user.id,
          title: `Refill Required: ${targetMedUpdated.name}`,
          message: `Your remaining doses (${targetMedUpdated.remainingDoses}) have fallen below your set alert safety threshold of ${threshold}. Please contact your pharmacy for a refill.`,
          type: 'system',
          timestamp: new Date().toISOString(),
          read: false,
          metaData: {
            medicationId: medId
          }
        };
        extraNotifications.push(refillNotif);
      }
    }

    const updatedNotifs = [...notifications, medLogNotif, ...extraNotifications];
    setNotifications(updatedNotifs);
    localStorage.setItem(`medisense_notifications_${user.id}`, JSON.stringify(updatedNotifs));
    setServiceWorkerCachedData(`notifications_${user.id}`, updatedNotifs).catch(() => {});
    saveNotificationToFirestore(user.id, medLogNotif).catch(err => console.error(err));
    extraNotifications.forEach(notif => {
      saveNotificationToFirestore(user.id, notif).catch(err => console.error(err));
    });

    // Toast beep noise on successful log
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // happy sound
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch {}
  };

  const handleDeleteMedication = async (medId: string) => {
    if (!user) return;
    const updated = medications.filter(m => m.id !== medId);
    setMedications(updated);
    localStorage.setItem(`medisense_meds_${user.id}`, JSON.stringify(updated));
    setServiceWorkerCachedData(`meds_${user.id}`, updated).catch(() => {});

    try {
       await deleteMedicationFromFirestore(user.id, medId);
    } catch {}
  };

  const handleUpdateMedication = async (updatedMed: Medication) => {
    if (!user) return;
    const updated = medications.map(m => m.id === updatedMed.id ? updatedMed : m);
    setMedications(updated);
    localStorage.setItem(`medisense_meds_${user.id}`, JSON.stringify(updated));
    setServiceWorkerCachedData(`meds_${user.id}`, updated).catch(() => {});

    try {
      await saveMedicationToFirestore(user.id, updatedMed);
    } catch {}
  };

  const handleReverseDose = async (medId: string, logId: string) => {
    if (!user) return;
    
    const updated = medications.map(m => {
      if (m.id === medId) {
        const updatedMed = { ...m, remainingDoses: Math.min(m.totalDoses, m.remainingDoses + 1) };
        saveMedicationToFirestore(user.id, updatedMed).catch(err => console.error(err));
        return updatedMed;
      }
      return m;
    });
    setMedications(updated);
    localStorage.setItem(`medisense_meds_${user.id}`, JSON.stringify(updated));
    setServiceWorkerCachedData(`meds_${user.id}`, updated).catch(() => {});

    const updatedNotifs = notifications.filter(n => n.id !== logId);
    setNotifications(updatedNotifs);
    localStorage.setItem(`medisense_notifications_${user.id}`, JSON.stringify(updatedNotifs));
    setServiceWorkerCachedData(`notifications_${user.id}`, updatedNotifs).catch(() => {});

    try {
      await deleteNotificationFromFirestore(user.id, logId);
    } catch (err) {
      console.warn("Could not sync undo dose to Firestore", err);
    }

    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.setValueAtTime(440, audioCtx.currentTime); // undo tone
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.2);
    } catch {}
  };

  const handleAddSymptomLog = async (newLogFields: Omit<SymptomLog, 'id' | 'userId' | 'loggedAt'>) => {
    if (!user) return;
    const newLog: SymptomLog = {
      ...newLogFields,
      id: 'log_' + Math.random().toString(36).substr(2, 9),
      userId: user.id,
      loggedAt: new Date().toISOString()
    };
    const updated = [...symptomLogs, newLog];
    setSymptomLogs(updated);
    localStorage.setItem(`medisense_symptomlogs_${user.id}`, JSON.stringify(updated));

    try {
      await saveSymptomLogToFirestore(user.id, newLog);
    } catch {}

    // Add normal notification
    const newNotif: HealthNotification = {
      id: 'notif_' + Math.random().toString(36).substr(2, 9),
      userId: user.id,
      title: 'Symptom metric registered',
      message: `Successfully added ${newLog.symptomType} entry at intensity level ${newLog.severity}/10.`,
      type: 'symptom',
      timestamp: new Date().toISOString(),
      read: false
    };
    const updatedNotifs = [...notifications, newNotif];
    setNotifications(updatedNotifs);
    localStorage.setItem(`medisense_notifications_${user.id}`, JSON.stringify(updatedNotifs));

    try {
      await saveNotificationToFirestore(user.id, newNotif);
    } catch {}
  };

  const handleAddReport = async (newReport: MonthlyProgressReport) => {
    if (!user) return;
    const updated = [...reports, newReport];
    setReports(updated);
    localStorage.setItem(`medisense_progress_reports_${user.id}`, JSON.stringify(updated));

    try {
      await saveMonthlyReportToFirestore(user.id, newReport);
    } catch {}
  };

  // Alarm Simulator Action
  const handleSimulateTimeAlert = (simTime: string) => {
    if (!user) return;
    
    // Check if any active medication matches this alarm time
    const targetMed = medications.find(m => m.active && m.times.includes(simTime));
    
    if (targetMed) {
      // Double Alert double-beep sound
      playNotificationSound();
      
      // Generate notification document
      const alertId = 'sim_alarm_' + Date.now();
      const newAlert: HealthNotification = {
        id: alertId,
        userId: user.id,
        title: `CRITICAL ALARM: ${targetMed.name}`,
        message: `Medication scheduled reminder for ${simTime}. Take ${targetMed.dosage} now.`,
        type: 'alert',
        timestamp: new Date().toISOString(),
        read: false,
        metaData: {
          medicationId: targetMed.id,
          time: simTime
        }
      };

      setNotifications(prev => [...prev, newAlert]);
      
      // Trigger full slide-out overlay alert toast!
      setActiveToast({
        id: targetMed.id,
        medName: targetMed.name,
        dosage: targetMed.dosage,
        time: simTime
      });
    } else {
      // Just emit diagnostic tip that no alarm existed
      const genericNotif: HealthNotification = {
        id: 'sim_diagnostic_' + Date.now(),
        userId: user.id,
        title: 'Simulation complete',
        message: `No active alarms scheduled for ${simTime}. Add prescriptions matching ${simTime} to verify beeping logic.`,
        type: 'system',
        timestamp: new Date().toISOString(),
        read: false
      };
      setNotifications(prev => [...prev, genericNotif]);
    }
  };

  const handleDismissToast = () => {
    setActiveToast(null);
  };

  const handleLogMedsFromToast = (medId: string) => {
    handleTakeDose(medId);
    setActiveToast(null);
  };

  const [showNotificationsMenu, setShowNotificationsMenu] = useState<boolean>(false);

  const handleMarkAllNotifsRead = async () => {
    if (!user) return;
    try {
      const updated = notifications.map(n => ({ ...n, read: true }));
      setNotifications(updated);
      localStorage.setItem(`medisense_notifications_${user.id}`, JSON.stringify(updated));
      const { saveNotificationToFirestore } = await import('./lib/db');
      for (const n of notifications) {
        if (!n.read) {
          await saveNotificationToFirestore(user.id, { ...n, read: true });
        }
      }
    } catch (err) {
      console.warn("Could not mark non-read notifications", err);
    }
  };

  const handleClearNotifications = async () => {
    if (!user) return;
    try {
      setNotifications([]);
      localStorage.setItem(`medisense_notifications_${user.id}`, "[]");
    } catch (err) {
      console.warn("Error clearing notifications", err);
    }
  };

  if (!user) {
    return (
      <AuthModal
        onAuthSuccess={handleAuthSuccess}
        existingUsers={existingUsers}
        onRegisterNewUser={handleRegisterNewUser}
      />
    );
  }

  const themeClass = 
    visualMode === 'light' ? 'visual-mode-light' : 
    visualMode === 'low-blue' ? 'visual-mode-low-blue' : 
    visualMode === 'aviation-red' ? 'visual-mode-aviation-red' : 
    visualMode === 'high-contrast' ? 'visual-mode-high-contrast' : '';

  return (
    <div className={`min-h-screen font-sans bg-[#050505] text-[#e0e0e0] visual-mode-container ${themeClass}`}>
      
      {/* Simulation Alarms overlay slider */}
      <AnimatePresence>
        {activeToast && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            className="fixed bottom-24 right-6 z-55 max-w-sm w-full bg-[#0d0d0d] border-2 border-indigo-550 rounded-3xl p-5 shadow-2xl shadow-indigo-500/20 backdrop-blur-xl"
          >
            <div className="flex gap-3">
              <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl h-fit">
                <Bell className="h-6 w-6 text-indigo-400 animate-bounce" />
              </div>
              <div className="space-y-1.5 w-full">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-400">Treatment Due NOW</span>
                  <button onClick={handleDismissToast} className="text-slate-500 hover:text-white cursor-pointer">&times;</button>
                </div>
                <h4 className="text-white font-display font-medium text-sm">{activeToast.medName}</h4>
                <p className="text-xs text-slate-400">Strength: {activeToast.dosage} | Scheduled for {activeToast.time}</p>
                
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => handleLogMedsFromToast(activeToast.id)}
                    className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1 cursor-pointer shadow-[0_0_15px_rgba(79,70,229,0.5)]"
                  >
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                    <span>Dose Taken</span>
                  </button>
                  <button
                    onClick={handleDismissToast}
                    className="px-3 py-1.5 bg-black/60 border border-white/5 hover:border-white/10 text-slate-400 hover:text-white text-xs rounded-xl"
                  >
                    Snooze
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Structural Framework with Desktop sidebars and Mobile tabs */}
      <div className="max-w-7xl mx-auto flex flex-col min-h-screen">
        
        {/* Navigation Banner Header */}
        <header className="h-16 px-6 md:px-8 flex items-center justify-between border-b border-white/5 bg-black/40 backdrop-blur-md relative z-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-[0_0_15px_rgba(79,70,229,0.5)]">
              <Activity className="h-4.5 w-4.5 text-white" />
            </div>
            <div className="space-y-0.5">
              <span className="text-xl font-bold tracking-tight text-white font-display uppercase">
                MediSense<span className="text-indigo-400">AI</span>
              </span>
            </div>
          </div>

          {/* Quick Header toggles */}
          <div className="flex items-center gap-3">
            {/* Active profile shortcut */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/5 rounded-full text-xs font-semibold text-slate-350">
              <img src={user.avatar} className="h-5 w-5 rounded-full object-cover" alt="" />
              <span>{user.name}</span>
            </div>

            {/* Notification Dropdown Container */}
            <div className="relative">
              <button
                id="notification-bell-btn"
                onClick={() => {
                  setShowNotificationsMenu(!showNotificationsMenu);
                  setShowThemeMenu(false);
                }}
                className="p-2 bg-white/5 border border-white/5 hover:bg-white/10 rounded-xl relative text-slate-400 hover:text-white transition cursor-pointer flex items-center justify-center"
              >
                <Bell className="h-4 w-4" />
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)] animate-ping" />
                )}
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]" />
                )}
              </button>

              <AnimatePresence>
                {showNotificationsMenu && (
                  <>
                    {/* Invisible backing toggle mask */}
                    <div className="fixed inset-0 z-40" onClick={() => setShowNotificationsMenu(false)} />
                    
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-950 border border-slate-800 rounded-3xl p-4 shadow-xl shadow-black/80 z-50 space-y-3"
                      id="notifications-dropdown-panel"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold font-mono flex items-center gap-1.5">
                          <Bell className="h-3.5 w-3.5 text-indigo-400" />
                          <span>Notification Center ({notifications.length})</span>
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={handleMarkAllNotifsRead}
                            className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
                          >
                            Mark all read
                          </button>
                          <span className="text-slate-850">|</span>
                          <button
                            onClick={handleClearNotifications}
                            className="text-[10px] text-rose-500 hover:text-rose-450 font-semibold cursor-pointer"
                          >
                            Clear
                          </button>
                        </div>
                      </div>

                      <div className="max-h-72 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                        {notifications.length === 0 ? (
                          <div className="text-center py-6 text-slate-500 text-xs">
                            No medical notifications on file yet.
                          </div>
                        ) : (
                          notifications.map((notif) => (
                            <div
                              key={notif.id}
                              className={`p-3 rounded-xl border text-left transition ${
                                notif.read 
                                  ? 'bg-slate-950/40 border-slate-900 opacity-60' 
                                  : 'bg-indigo-950/20 border-indigo-500/20'
                              }`}
                            >
                              <div className="flex justify-between items-start gap-2">
                                <span className={`text-xs font-semibold leading-tight ${notif.read ? 'text-slate-400' : 'text-indigo-200'}`}>
                                  {notif.title}
                                </span>
                                <span className="text-[9px] text-slate-500 shrink-0 font-mono">
                                  {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className={`text-xs mt-1 leading-normal ${notif.read ? 'text-slate-500' : 'text-slate-300'}`}>
                                {notif.message}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Extended Multi-Palette Accessibility Selector */}
            <div className="relative">
              <button
                onClick={() => setShowThemeMenu(!showThemeMenu)}
                className="p-2 bg-white/5 border border-white/5 hover:bg-white/10 rounded-xl text-slate-400 transition cursor-pointer flex items-center gap-1.5"
                title="Visual Protection & Theme Controls"
                id="visual-theme-toggle-btn"
              >
                {visualMode === 'dark' && <Moon className="h-4 w-4 text-indigo-400" />}
                {visualMode === 'light' && <Sun className="h-4 w-4 text-amber-500 font-bold" />}
                {visualMode === 'low-blue' && <Eye className="h-4 w-4 text-amber-500 animate-pulse" />}
                {visualMode === 'aviation-red' && <ShieldAlert className="h-4 w-4 text-red-500 animate-pulse fill-red-500/20" />}
                {visualMode === 'high-contrast' && <Sliders className="h-4 w-4 text-sky-400" />}
                
                <span className="hidden leading-none md:inline text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  {visualMode === 'dark' && 'Dark'}
                  {visualMode === 'light' && 'Light'}
                  {visualMode === 'low-blue' && 'Amber Safe'}
                  {visualMode === 'aviation-red' && 'Aviation Red'}
                  {visualMode === 'high-contrast' && 'High Contrast'}
                </span>
              </button>

              <AnimatePresence>
                {showThemeMenu && (
                  <>
                    {/* Invisible backing toggle mask */}
                    <div className="fixed inset-0 z-40" onClick={() => setShowThemeMenu(false)} />
                    
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-56 bg-slate-950 border border-slate-800 rounded-2xl p-2 shadow-xl shadow-black/80 z-50 space-y-1"
                      id="visual-theme-menu"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="px-2 py-1.5 text-[9px] uppercase tracking-widest text-slate-500 font-bold font-mono">
                        Visual Adaptations
                      </div>
                      
                      <button
                        onClick={() => {
                          setVisualMode('dark');
                          setDarkMode(true);
                          setShowThemeMenu(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition cursor-pointer ${
                          visualMode === 'dark' 
                            ? 'bg-indigo-600/10 text-white border border-indigo-500/30 font-semibold' 
                            : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <Moon className="h-3.5 w-3.5 text-indigo-400" />
                          <span>Standard Dark Mode</span>
                        </span>
                        {visualMode === 'dark' && <Check className="h-3.5 w-3.5 text-indigo-400 stroke-[3]" />}
                      </button>

                      <button
                        onClick={() => {
                          setVisualMode('light');
                          setDarkMode(false);
                          setShowThemeMenu(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition cursor-pointer ${
                          visualMode === 'light' 
                            ? 'bg-indigo-600/10 text-indigo-300 border border-indigo-500/30 font-semibold' 
                            : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <Sun className="h-3.5 w-3.5 text-amber-500" />
                          <span>Standard Light Mode</span>
                        </span>
                        {visualMode === 'light' && <Check className="h-3.5 w-3.5 text-indigo-400 stroke-[3]" />}
                      </button>

                      <button
                        onClick={() => {
                          setVisualMode('low-blue');
                          setDarkMode(true);
                          setShowThemeMenu(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition cursor-pointer ${
                          visualMode === 'low-blue' 
                            ? 'bg-amber-600/15 text-amber-300 border border-amber-500/30 font-semibold' 
                            : 'text-slate-400 hover:text-amber-300 hover:bg-amber-500/5 border border-transparent'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <Eye className="h-3.5 w-3.5 text-amber-500" />
                          <span>Low-Blue (Amber Sleep)</span>
                        </span>
                        {visualMode === 'low-blue' && <Check className="h-3.5 w-3.5 text-amber-500 stroke-[3]" />}
                      </button>

                      <button
                        onClick={() => {
                          setVisualMode('aviation-red');
                          setDarkMode(true);
                          setShowThemeMenu(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition cursor-pointer ${
                          visualMode === 'aviation-red' 
                            ? 'bg-red-950/40 text-red-400 border border-red-500/30 font-semibold' 
                            : 'text-slate-400 hover:text-red-400 hover:bg-red-500/5 border border-transparent'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <ShieldAlert className="h-3.5 w-3.5 text-red-500" />
                          <span>Aviation Red Vision</span>
                        </span>
                        {visualMode === 'aviation-red' && <Check className="h-3.5 w-3.5 text-red-500 stroke-[3]" />}
                      </button>

                      <button
                        onClick={() => {
                          setVisualMode('high-contrast');
                          setDarkMode(true);
                          setShowThemeMenu(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition cursor-pointer ${
                          visualMode === 'high-contrast' 
                            ? 'bg-sky-650/15 text-sky-400 border border-sky-500/30 font-semibold' 
                            : 'text-slate-400 hover:text-sky-450 hover:bg-sky-500/5 border border-transparent'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <Sliders className="h-3.5 w-3.5 text-sky-400" />
                          <span>Stark High Contrast</span>
                        </span>
                        {visualMode === 'high-contrast' && <Check className="h-3.5 w-3.5 text-sky-400 stroke-[3]" />}
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Dynamic Navigation row tabs matching standard corporate navigation tab spec */}
        <nav className="flex overflow-x-auto gap-8 px-6 md:px-8 h-12 items-center border-b border-white/5 bg-black/20 font-sans text-sm font-medium">
          <button
            onClick={() => setCurrentView('dashboard')}
            className={`pb-1 transition-all cursor-pointer flex items-center gap-2 text-xs uppercase tracking-wider ${currentView === 'dashboard' ? 'text-white border-b-2 border-indigo-500 font-semibold' : 'text-gray-400 hover:text-white'}`}
          >
            <ClipboardList className="h-4 w-4" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setCurrentView('documents')}
            className={`pb-1 transition-all cursor-pointer flex items-center gap-2 text-xs uppercase tracking-wider ${currentView === 'documents' ? 'text-white border-b-2 border-indigo-500 font-semibold' : 'text-gray-400 hover:text-white'}`}
          >
            <Smartphone className="h-4 w-4" />
            <span>Prescriptions</span>
          </button>

          <button
            onClick={() => setCurrentView('scheduler')}
            className={`pb-1 transition-all cursor-pointer flex items-center gap-2 text-xs uppercase tracking-wider ${currentView === 'scheduler' ? 'text-white border-b-2 border-indigo-500 font-semibold' : 'text-gray-400 hover:text-white'}`}
          >
            <Clock className="h-4 w-4" />
            <span>Schedule</span>
          </button>

          <button
            onClick={() => setCurrentView('reports')}
            className={`pb-1 transition-all cursor-pointer flex items-center gap-2 text-xs uppercase tracking-wider ${currentView === 'reports' ? 'text-white border-b-2 border-indigo-500 font-semibold' : 'text-gray-400 hover:text-white'}`}
          >
            <CalendarRange className="h-4 w-4" />
            <span>Progress Sheets</span>
          </button>

          <button
            onClick={() => setCurrentView('profile')}
            className={`pb-1 transition-all cursor-pointer flex items-center gap-2 text-xs uppercase tracking-wider ${currentView === 'profile' ? 'text-white border-b-2 border-indigo-500 font-semibold' : 'text-gray-400 hover:text-white'}`}
          >
            <UserCheck className="h-4 w-4" />
            <span>Profile settings</span>
          </button>
        </nav>

        {/* View render port */}
        <main className="flex-1 p-4 md:p-6 pb-24 overflow-hidden relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {currentView === 'dashboard' && (
                <Dashboard
                  user={user}
                  isProfileLoading={isProfileLoading}
                  symptomLogs={symptomLogs}
                  medications={medications}
                  notifications={notifications}
                  wellnessHabits={wellnessHabits}
                  onToggleWellnessHabit={handleToggleWellnessHabit}
                  onAddSymptomLog={handleAddSymptomLog}
                  onUpdateVitals={handleUpdateVitals}
                  onTakeDose={handleTakeDose}
                  onNavigate={setCurrentView}
                />
              )}

              {currentView === 'documents' && (
                <ReportTracker
                  user={user}
                  documents={documents}
                  onAddDocument={handleAddDocument}
                  onImportMedication={handleImportMedication}
                  onDeleteDocument={handleDeleteDocument}
                />
              )}

              {currentView === 'scheduler' && (
                <MedicationSchedule
                  user={user}
                  medications={medications}
                  notifications={notifications}
                  documents={documents}
                  onAddMedication={handleAddMedication}
                  onTakeDose={handleTakeDose}
                  onDeleteMedication={handleDeleteMedication}
                  onSimulateTimeAlert={handleSimulateTimeAlert}
                  onUpdateMedication={handleUpdateMedication}
                  onReverseDose={handleReverseDose}
                />
              )}

              {currentView === 'reports' && (
                <MonthlyReport
                  user={user}
                  symptomLogs={symptomLogs}
                  medications={medications}
                  documents={documents}
                  reports={reports}
                  wellnessHabits={wellnessHabits}
                  notifications={notifications}
                  onAddReport={handleAddReport}
                />
              )}

              {currentView === 'profile' && (
                <ProfileSettings
                  user={user}
                  onUpdateVitals={handleUpdateVitals}
                  onUpdateProfile={handleUpdateProfile}
                  onLogout={handleLogout}
                  onForceCloudSync={handleForceCloudSync}
                  medications={medications}
                  symptomLogs={symptomLogs}
                  reports={reports}
                  documents={documents}
                  wellnessHabits={wellnessHabits}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Bottom Status Bar */}
        <footer className="h-10 px-8 flex items-center justify-between bg-white/[0.02] border-t border-white/5 text-[10px] uppercase tracking-widest text-gray-500">
          <div className="flex gap-6">
            <span>Status: <span className="text-indigo-400 font-semibold">Secure &amp; Encrypted</span></span>
            <span>Cloud Sync: <span className="text-white font-semibold">Active</span></span>
          </div>
          <div className="flex gap-6">
            <span>Version 4.2.0-Alpha</span>
            <span className="text-indigo-400 cursor-pointer hover:text-indigo-300">Privacy Settings</span>
          </div>
        </footer>
      </div>

      {/* Floating MediSense AI Chat Button */}
      {user && (
        <>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsChatOpen(true)}
            className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-indigo-650 to-violet-600 hover:from-indigo-550 hover:to-violet-500 text-white font-bold rounded-full py-3.5 px-5 shadow-[0_0_20px_rgba(79,70,229,0.45)] border border-indigo-500/30 flex items-center gap-2 cursor-pointer transition"
            id="floating-ai-chat-trigger"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <Bot className="h-4 w-4 shrink-0 text-indigo-200" />
            <span className="text-xs uppercase tracking-wider font-semibold">MediSense AI Chat</span>
          </motion.button>

          <AIChatModal
            isOpen={isChatOpen}
            onClose={() => setIsChatOpen(false)}
            user={user}
            medications={medications}
            symptomLogs={symptomLogs}
          />
        </>
      )}
    </div>
  );
}
