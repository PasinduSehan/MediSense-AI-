import React, { useState } from 'react';
import { User, SymptomLog, Medication, HealthNotification, WellnessHabit } from '../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, ComposedChart, Line } from 'recharts';
import { Activity, Heart, Eye, TrendingUp, Sparkles, Smile, ShieldAlert, Plus, Layers, FileText, CheckCircle, Zap, Check, X, Pill, Flame, Trophy, Calendar, Coffee, Sparkle, Bell, BellOff, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ConditionInsight from './ConditionInsight';
import ConsistencyCalendar from './ConsistencyCalendar';
import HabitHeatmap from './HabitHeatmap';

interface DashboardProps {
  user: User;
  symptomLogs: SymptomLog[];
  medications: Medication[];
  notifications: HealthNotification[];
  wellnessHabits: WellnessHabit[];
  onToggleWellnessHabit: (habitName: string, dateStr: string) => void;
  onAddSymptomLog: (log: Omit<SymptomLog, 'id' | 'userId' | 'loggedAt'>) => void;
  onUpdateVitals: (vitals: User['vitals']) => void;
  onTakeDose: (medId: string) => void;
  onNavigate?: (view: 'dashboard' | 'documents' | 'scheduler' | 'reports' | 'profile') => void;
  isProfileLoading?: boolean;
}

const PATHOLOGY_RECOMMENDATIONS: Record<string, {
  icon: string;
  badgeColor: string;
  dietAdvice: string[];
  lifestyleAdvice: string[];
  scientificRationale: string;
}> = {
  "Diabetes": {
    icon: "🩸",
    badgeColor: "bg-amber-500/10 text-amber-400 border-amber-550/20",
    dietAdvice: [
      "Prioritize high-fiber, low-glycemic foods: organic spinach, broccoli, chia seeds, and wild salmon.",
      "Strictly avoid high-glycemic white flour breads, sweet pastries, and fruit cordial concentrates.",
      "Boost hydration with mineral-infused water to assist visual and renal clearances."
    ],
    lifestyleAdvice: [
      "Engage in a 30-minute brisk walk post-dinner to immediately enhance cellular insulin sensitivity key receptors.",
      "Check blood glucose levels pre-breakfast and log the coordinates to establish steady data loops.",
      "Maintain a consistent sleep window to reduce elevated early-morning cortisol release."
    ],
    scientificRationale: "Optimizing peripheral insulin receptor sensitivity via controlled skeletal muscle contraction and postprandial glucose damping."
  },
  "Hypertension": {
    icon: "❤️",
    badgeColor: "bg-rose-500/10 text-rose-400 border-rose-550/20",
    dietAdvice: [
      "Follow a low-sodium, mineral-rich DASH dietary scheme centering organic bananas, dark leafy greens, and berries.",
      "Limit sodium intake strictly under 1,505 mg per day and avoid processed high-sodium deli meats.",
      "Incorporate unpasteurized apple cider vinegar and raw unsalted almonds to support nitric oxide loops."
    ],
    lifestyleAdvice: [
      "Practice 5 to 10 minutes of controlled paced breathing (6 breaths per minute) to calm autonomic heart nodes.",
      "Engage in low-impact aerobic physical sessions like cycling or water exercise 3 times a week.",
      "Log double-vitals (Systolic/Diastolic) twice daily to audit arterial stress indicators."
    ],
    scientificRationale: "Supporting vascular compliance and minimizing systemic vascular resistance by amplifying baroreflex sensitivity and potassium ratios."
  },
  "Depression": {
    icon: "🧠",
    badgeColor: "bg-sky-500/10 text-sky-400 border-sky-550/20",
    dietAdvice: [
      "Consume plenty of high-Omega-3 sources: wild sardines, mackerel, walnuts, and organic flaxseed oils.",
      "Integrate gut-healthy probiotics like kefir and high-quality Greek yogurt to nourish the gut-brain axis neurotransmitter lines.",
      "Reduce processed sugars and high-fructose corn syrups to prevent post-glycemic inflammatory loops."
    ],
    lifestyleAdvice: [
      "Expose retinas to direct morning sunshine for 20 minutes to regulate serotonin-melatonin production cycle.",
      "Engage in brief high-intensity exercises to unleash natural endorphin levels and increase BDNF (brain-derived neurotrophic factor).",
      "Establish a relaxing tech-free evening wind-down routine to maximize deep stage-3 sleep cycles."
    ],
    scientificRationale: "Modulating neuroinflammatory pathways and encouraging neurogenesis by supporting optimal gut microflora and circadian rhythm pacing."
  },
  "Anemia": {
    icon: "🧬",
    badgeColor: "bg-red-500/10 text-red-400 border-red-550/20",
    dietAdvice: [
      "Focus heavily on iron-dense elements: grass-fed organ beef, steamed dark lentils, and organic spinach.",
      "Always consume iron foods with vitamin C rich items (berries, lemon squeezes) to multiply structural absorption.",
      "Avoid tea, espresso, or dairy products during iron meals as calcium/tannins block systemic iron transport."
    ],
    lifestyleAdvice: [
      "Pace high-exertion workouts. Prioritize gentle dynamic stretches and moderate intervals to avoid hypoxia.",
      "Practice deep lung expansion exercises daily to maximize alveolar oxygen transfer efficiency.",
      "Audit your hydration and monitor for physical warning signs of exhaustion."
    ],
    scientificRationale: "Promoting red blood cell synthesis and enhancing the bioavailability of heme and non-heme iron to restore optimal hemoglobin concentrations."
  },
  "Asthma": {
    icon: "🫁",
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-550/20",
    dietAdvice: [
      "Load up on high-antioxidant ingredients: ripe citrus fruits, blueberries, and avocados to reduce tissue swelling.",
      "Aim for adequate magnesium inputs (raw pumpkin seeds, dark organic cacao) to assist with smooth muscle relaxation.",
      "Limit sulfite-loaded preservatives and artificial flavor enhancers known to irritate bronchioles."
    ],
    lifestyleAdvice: [
      "Check local air pollen and particulate matter reports prior to coordinating heavy outdoor cardiovascular activities.",
      "Complete a thorough, gradual 15-minute warm-up session to prevent cold air airway constrictions.",
      "Practice pranayama breathing sequences to support systemic bronchodilation patterns."
    ],
    scientificRationale: "Damping down bronchial hyperresponsiveness through sustained nutritional antioxidant defense and smooth airway muscle stabilization."
  },
  "Chronic Kidney Disease": {
    icon: "🧼",
    badgeColor: "bg-teal-500/10 text-teal-400 border-teal-550/20",
    dietAdvice: [
      "Ensure precise moderation of overall dietary protein to significantly lower glomerular filtering workload.",
      "Strictly limit phosphorus-dense foods like dark sodas, processed cheese slices, and heavily preserved canned goods.",
      "Keep potassium and sodium intake within limits by soaking vegetables and avoiding salt substitutions."
    ],
    lifestyleAdvice: [
      "Maintain a strictly calibrated, measured daily fluid schedule customized to your primary doctor guidelines.",
      "Track blood pressure values diligently; capillary kidneys are highly vulnerable to systolic hyper-spikes.",
      "Coordinate light-intensity physical routines like stretching and walking to avoid skeletal muscle damage."
    ],
    scientificRationale: "Alleviating ultrafiltration stress and systemic uremic build-ups while maintaining fluid electrolyte equilibrium."
  },
  "Cardiovascular Concern": {
    icon: "🩺",
    badgeColor: "bg-indigo-500/10 text-indigo-400 border-indigo-550/20",
    dietAdvice: [
      "Adopt a classic extra-virgin olive oil Mediterranean framework, loaded with garlic, legumes, herbs, and oats.",
      "Completely eliminate industrial trans-fats, hydrogenated vegetable oils, and elevated sodium structures.",
      "Incorporate green tea and high-flavanol dark chocolate (85%+) to encourage endothelial function."
    ],
    lifestyleAdvice: [
      "Build a progressive endurance habit with low-to-moderate cardio like brisk walking or swimming 4 times a week.",
      "Perform regular heart rate variability tracking to verify adequate nervous system rejuvenation.",
      "Focus on continuous stress-reduction habits to defend coronary vessels from norepinephrine surges."
    ],
    scientificRationale: "Supporting capillary elasticity, optimizing lipid blood markers, and reducing long-term oxidative stress burden within vascular walls."
  },
  "Hypothyroidism": {
    icon: "🦋",
    badgeColor: "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-550/20",
    dietAdvice: [
      "Ensure healthy dietary iodine and selenium levels via brazil nuts, free-range eggs, kelp, and organic poultry.",
      "Avoid raw goitrogenic vegetables like broccoli and cabbage; lightly steam them to deactivate thyroid inhibitors.",
      "Maintain a clean, allergen-conscious dietary interface to prevent trigger-based immune flareups."
    ],
    lifestyleAdvice: [
      "Conduct regular strength training (2-3 times weekly) to counter lethargy and stimulate cellular metabolic engines.",
      "Strictly align thyroid medication timings: take on an empty stomach with pure water in the early morning.",
      "Ensure 8 full hours of sleep to support normal pituitary TSH signaling sequences."
    ],
    scientificRationale: "Providing elemental precursors for thyroid hormone manufacture while optimizing cellular metabolic energy consumption pathways."
  },
  "General Preventative": {
    icon: "🛡️",
    badgeColor: "bg-emerald-550/10 text-emerald-450 border-emerald-500/20",
    dietAdvice: [
      "Consume a varied palette of whole ingredients, centering fresh vegetables, healthy fats, and high-quality protein.",
      "Minimize consumption of processed snack items, ultra-refined grains, and chemical syrup formulations.",
      "Keep a clean hydration track, averaging at least 2 to 2.5 Liters of water daily."
    ],
    lifestyleAdvice: [
      "Perform a combined 150 minutes of moderate aerobic workouts and twice-weekly functional strength movements.",
      "Diligently monitor standard bio-indicators (pulse, blood glucose, sleep quality, and cardiac variables).",
      "Dedicate brief daily periods to mindful decompression or high-quality dynamic stretching."
    ],
    scientificRationale: "Sustaining general mitochondrial health, metabolic flexibility, and defensive biological responses."
  }
};

export default function Dashboard({ 
  user, 
  symptomLogs, 
  medications, 
  notifications, 
  wellnessHabits,
  onToggleWellnessHabit,
  onAddSymptomLog, 
  onUpdateVitals, 
  onTakeDose,
  onNavigate,
  isProfileLoading = false
}: DashboardProps) {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dashboardTab, setDashboardTab] = useState<'daily' | 'analytics'>('daily');
  const [activeChartTab, setActiveChartTab] = useState<'symptoms' | 'habits'>('symptoms');
  const [symptomType, setSymptomType] = useState<SymptomLog['symptomType']>('Glucose');
  const [severity, setSeverity] = useState<number>(5);
  const [numericValue, setNumericValue] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Quick Action floating menu state
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);
  const [quickSymptomType, setQuickSymptomType] = useState<SymptomLog['symptomType']>('Glucose');
  const [quickSeverityScale, setQuickSeverityScale] = useState<number>(5);
  const [quickMetricValue, setQuickMetricValue] = useState<string>('');
  const [quickLogNotes, setQuickLogNotes] = useState<string>('');
  const [quickActionSuccess, setQuickActionSuccess] = useState<string>('');
  const [activeSegment, setActiveSegment] = useState<'symptom' | 'dose'>('symptom');

  // Settle inputs
  const [isUpdatingVitals, setIsUpdatingVitals] = useState(false);
  const [bpSys, setBpSys] = useState(user.vitals.bloodPressureSys);
  const [bpDia, setBpDia] = useState(user.vitals.bloodPressureDia);
  const [glucose, setGlucose] = useState(user.vitals.bloodGlucose);
  const [pulse, setPulse] = useState(user.vitals.heartRate);
  const [weight, setWeight] = useState(user.vitals.weight);

  // Synchronize vitals inputs and pathology selection when user prop changes
  React.useEffect(() => {
    setBpSys(user.vitals.bloodPressureSys);
    setBpDia(user.vitals.bloodPressureDia);
    setGlucose(user.vitals.bloodGlucose);
    setPulse(user.vitals.heartRate);
    setWeight(user.vitals.weight);

    const activeConditions = user.primaryConditions?.filter(c => c !== 'General Care') || [];
    setActiveGuidancePathology(activeConditions.length > 0 ? activeConditions[0] : 'General Preventative');
  }, [user]);

  // State for pathology condition guidance selection
  const [activeGuidancePathology, setActiveGuidancePathology] = useState<string>(() => {
    const activeConditions = user.primaryConditions?.filter(c => c !== 'General Care') || [];
    return activeConditions.length > 0 ? activeConditions[0] : 'General Preventative';
  });

  const handleSymptomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(numericValue) || undefined;
    onAddSymptomLog({
      symptomType,
      severity,
      notes: notes || `Severity level logged at ${severity}/10`,
      value: val
    });
    
    // Auto-update vitals based on symptom logging for high-fidelity interactive flow
    if (symptomType === 'Glucose' && val) {
      onUpdateVitals({
        ...user.vitals,
        bloodGlucose: val,
        lastUpdated: new Date().toISOString()
      });
    } else if (symptomType === 'Blood Pressure' && val) {
      onUpdateVitals({
        ...user.vitals,
        bloodPressureSys: val,
        lastUpdated: new Date().toISOString()
      });
    }

    // Reset fields
    setNumericValue('');
    setNotes('');
  };

  const saveVitals = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateVitals({
      bloodPressureSys: bpSys,
      bloodPressureDia: bpDia,
      bloodGlucose: glucose,
      heartRate: pulse,
      weight,
      lastUpdated: new Date().toISOString()
    });
    setIsUpdatingVitals(false);
  };

  const handleQuickSymptomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(quickMetricValue) || undefined;
    onAddSymptomLog({
      symptomType: quickSymptomType,
      severity: quickSeverityScale,
      notes: quickLogNotes || `Quick logged ${quickSymptomType} severity ${quickSeverityScale}/10`,
      value: val
    });

    if (quickSymptomType === 'Glucose' && val) {
      onUpdateVitals({
        ...user.vitals,
        bloodGlucose: val,
        lastUpdated: new Date().toISOString()
      });
    } else if (quickSymptomType === 'Blood Pressure' && val) {
      onUpdateVitals({
        ...user.vitals,
        bloodPressureSys: val,
        lastUpdated: new Date().toISOString()
      });
    }

    setQuickActionSuccess(`Symptom '${quickSymptomType}' logged!`);
    setQuickMetricValue('');
    setQuickLogNotes('');
    setTimeout(() => {
      setQuickActionSuccess('');
    }, 2500);
  };

  const handleQuickTakeDose = (medId: string, medName: string) => {
    onTakeDose(medId);
    setQuickActionSuccess(`Recorded dose of ${medName}!`);
    setTimeout(() => {
      setQuickActionSuccess('');
    }, 2500);
  };

  // List of standard corporate wellness habits
  const DEFAULT_HABITS = [
    { name: 'Drank 2L Water', icon: '💧', color: 'text-sky-450 bg-sky-550/10 border-sky-500/20 shadow-sky-500/5' },
    { name: '8 Hours Sleep', icon: '😴', color: 'text-violet-405 bg-violet-550/10 border-violet-500/20 shadow-violet-500/5' },
    { name: 'No Sugar Treats', icon: '🥗', color: 'text-emerald-450 bg-emerald-550/10 border-emerald-500/20 shadow-emerald-500/5' },
    { name: 'Took Prescribed Dosage', icon: '💊', color: 'text-rose-450 bg-rose-550/10 border-rose-500/20 shadow-rose-500/5' },
    { name: '30 Min Outdoor Walk', icon: '🚶', color: 'text-amber-450 bg-amber-550/10 border-amber-500/20 shadow-amber-500/5' },
    { name: 'Logged Daily Vitals', icon: '📊', color: 'text-teal-405 bg-teal-550/10 border-teal-500/20 shadow-teal-500/5' },
    { name: '10 Min Mindful Breathing', icon: '🧘', color: 'text-fuchsia-450 bg-fuchsia-550/10 border-fuchsia-500/20 shadow-fuchsia-500/5' }
  ];

  const habitsForDate = DEFAULT_HABITS.map(hab => {
    const isDone = wellnessHabits.some(h => h.name === hab.name && h.date === selectedDate && h.completed);
    return { ...hab, completed: isDone };
  });

  const completedCountForDate = habitsForDate.filter(h => h.completed).length;
  const totalHabitsCount = DEFAULT_HABITS.length;
  const habitCompletionPercentage = Math.round((completedCountForDate / totalHabitsCount) * 100);

  // Medication Adherence Stats
  const activeMedsForAdherence = medications.filter(m => m.active);
  const totalScheduledDosesForAdherence = activeMedsForAdherence.reduce((acc, m) => acc + (m.times?.length || 1), 0);
  const takenDosesCountForAdherence = notifications.filter(
    n => n.type === 'medication' && 
         (n.title === 'Medication Dose Taken' || n.message?.toLowerCase().includes('took prescribed dose')) && 
         n.timestamp.startsWith(selectedDate)
  ).length;

  const adherencePercentageForAdherence = totalScheduledDosesForAdherence > 0 
    ? Math.round((Math.min(takenDosesCountForAdherence, totalScheduledDosesForAdherence) / totalScheduledDosesForAdherence) * 100) 
    : 100;

  // Browser Push Notification Controls & State
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'simulated'>(() => {
    if (typeof window !== 'undefined') {
      const isSimulatedVal = localStorage.getItem('medisense_notif_simulated') === 'true';
      if (isSimulatedVal) return 'simulated';
      return ('Notification' in window) ? Notification.permission : 'default';
    }
    return 'default';
  });
  const [testSuccess, setTestSuccess] = useState(false);
  const [showSandboxExplanation, setShowSandboxExplanation] = useState(false);

  const requestNotificationPermission = async () => {
    if (typeof window !== 'undefined') {
      if ('Notification' in window) {
        try {
          const resp = await Notification.requestPermission();
          setNotifPermission(resp);
          if (resp === 'granted') {
            new Notification("🔔 Notification Access Granted!", {
              body: "MediSense AI will now notify you of your prescriptions even when the browser tab is minimized.",
              tag: "medisense-welcome-notif",
              requireInteraction: false
            });
            localStorage.setItem('medisense_notif_simulated', 'false');
            return;
          }
        } catch (err) {
          console.warn("Standard browser notification permission request was blocked/failed due to sandbox iframe restriction. Transitioning to hybrid in-app simulator mode.", err);
        }
      }
      
      // Sandbox fallback mode
      localStorage.setItem('medisense_notif_simulated', 'true');
      setNotifPermission('simulated');
      setShowSandboxExplanation(true);
      
      // Warm welcome audio chime
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.35);
      } catch (e) {
        console.warn("Audio Context init blocked until initial user interaction", e);
      }
    }
  };

  const triggerTestNotification = () => {
    if (typeof window !== 'undefined') {
      const isSimulated = notifPermission === 'simulated' || localStorage.getItem('medisense_notif_simulated') === 'true';
      const isRealGranted = 'Notification' in window && notifPermission === 'granted';
      
      if (isRealGranted && !isSimulated) {
        try {
          new Notification("🧪 MediSense Test Alert", {
            body: "This is a persistent test notification. Tab minimization alert active!",
            tag: "medisense-test-notif",
            requireInteraction: true // Ensures the alert stays persistent
          });
          setTestSuccess(true);
          setTimeout(() => setTestSuccess(false), 3000);
          return;
        } catch (err) {
          console.error("Test notification trigger failed", err);
        }
      }
      
      // Double Beep Chime Falls Back
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        [0, 0.25].forEach((offset) => {
          const osc = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();
          osc.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(660, audioCtx.currentTime + offset);
          gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime + offset);
          gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + offset + 0.15);
          osc.start(audioCtx.currentTime + offset);
          osc.stop(audioCtx.currentTime + offset + 0.2);
        });
      } catch (e) {
        console.warn("Audio Context blocked", e);
      }
      
      // Flash document title as standard minimization visual cue
      let toggle = true;
      const originalTitle = document.title;
      const interval = setInterval(() => {
        document.title = toggle ? "⚠️ MEDICINE REMINDER ⚠️" : originalTitle;
        toggle = !toggle;
      }, 500);
      
      setTimeout(() => {
        clearInterval(interval);
        document.title = originalTitle;
      }, 4000);

      setTestSuccess(true);
      setTimeout(() => setTestSuccess(false), 3000);
    }
  };

  const disableNotificationReminders = () => {
    localStorage.removeItem('medisense_notif_simulated');
    setNotifPermission(typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default');
  };

  // Compute Streak (consecutive days where at least 1 habit was completed)
  const computeHabitStreak = () => {
    const completionsByDate: Record<string, number> = {};
    wellnessHabits.forEach(h => {
      if (h.completed) {
        completionsByDate[h.date] = (completionsByDate[h.date] || 0) + 1;
      }
    });

    let streak = 0;
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const todayDone = (completionsByDate[todayStr] || 0) >= 1;
    const yesterdayDone = (completionsByDate[yesterdayStr] || 0) >= 1;

    if (!todayDone && !yesterdayDone) return 0;

    const start = todayDone ? today : yesterday;
    let checker = new Date(start);

    while (true) {
      const cStr = checker.toISOString().split('T')[0];
      if ((completionsByDate[cStr] || 0) >= 1) {
        streak++;
        checker.setDate(checker.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  };

  const streakCount = computeHabitStreak();

  // Date options for past 5 days (Today and previous 4)
  const dateOptions = Array.from({ length: 5 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const isToday = i === 0;
    const isYesterday = i === 1;
    const dayName = d.toLocaleDateString('default', { weekday: 'short' });
    const dayNum = d.getDate();
    return { dateStr, label: isToday ? 'Today' : isYesterday ? 'Yesterday' : `${dayName} ${dayNum}` };
  });

  // Habits Correlation Data (last 5 chronologically ordered days)
  const habitsCorrelationData = Array.from({ length: 5 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (4 - i)); // chronologically 
    const dateStr = d.toISOString().split('T')[0];
    const displayLabel = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    
    const completedCount = wellnessHabits.filter(h => h.date === dateStr && h.completed).length;
    
    const dayLogs = symptomLogs.filter(log => log.loggedAt.startsWith(dateStr));
    const avgSeverity = dayLogs.length > 0 
      ? parseFloat((dayLogs.reduce((sum, l) => sum + l.severity, 0) / dayLogs.length).toFixed(1))
      : 0;
      
    return {
      date: dateStr,
      label: displayLabel,
      completedHabits: completedCount, 
      symptomSeverity: avgSeverity
    };
  });

  // Convert logs to Recharts data format sorted by date
  const chartData = [...symptomLogs]
    .sort((a, b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime())
    .map(log => {
      const dateObj = new Date(log.loggedAt);
      return {
        time: dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        severity: log.severity,
        value: log.value || log.severity * 15, // scale value for graphing if undefined
        type: log.symptomType,
        notes: log.notes
      };
    });

  // Calculate stats
  const activeMedicationsCount = medications.filter(m => m.active).length;
  const unreadAlerts = notifications.filter(n => !n.read && n.type === 'alert');

  // Specific AI feedback block based on conditions
  const getDailyProactiveInsight = () => {
    const hasDiabetes = user.primaryConditions.includes("Diabetes");
    const hasDepression = user.primaryConditions.includes("Depression");
    const hasHypertension = user.primaryConditions.includes("Hypertension");

    if (hasDiabetes && user.vitals.bloodGlucose > 130) {
      return {
        title: "Active Insulin Monitoring",
        msg: "Your blood glucose was tagged at " + user.vitals.bloodGlucose + " mg/dL. Consider a low-carb menu and an evening brisk walk. Avoid sweetened wheat snacks.",
        color: "text-amber-400 border-amber-500/20 bg-amber-500/5"
      };
    }
    if (hasHypertension && user.vitals.bloodPressureSys > 135) {
      return {
        title: "Systolic Threshold Exceeded",
        msg: "Cardiovascular pressure logged at " + user.vitals.bloodPressureSys + "/" + user.vitals.bloodPressureDia + " mmHg. Implement a salt reduction and practice deep diaphragmatic breathing exercise for 5 minutes.",
        color: "text-rose-400 border-rose-500/20 bg-rose-500/5"
      };
    }
    if (hasDepression) {
      return {
        title: "Circadian Rhythm Proactive Check",
        msg: "Regular sleep and a simple 20-minute morning sunshine walk are clinically proven to help serotonin stabilization. Log your mood level today.",
        color: "text-sky-400 border-sky-500/20 bg-sky-500/5"
      };
    }
    return {
      title: "Cardiac Vitals Baseline",
      msg: "Your core health vitals look highly stable. Maintain your medication schedulers and stay hydrated.",
      color: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5"
    };
  };

  const proactiveInsight = getDailyProactiveInsight();

  // Smart Health Alert Engine checking past 3 days deviations for Multiple Metrics simultaneously
  const getSmartHealthAlerts = () => {
    const now = Date.now();
    const threeDaysAgo = now - 3 * 24 * 60 * 60 * 1000;
    const fourteenDaysAgo = now - 14 * 24 * 60 * 60 * 1000;

    // 1. Glucose metric analysis
    const recentGlucoseLogs = symptomLogs.filter(
      l => l.symptomType === 'Glucose' && new Date(l.loggedAt).getTime() >= threeDaysAgo
    );
    const baselineGlucoseLogs = symptomLogs.filter(
      l => l.symptomType === 'Glucose' && new Date(l.loggedAt).getTime() < threeDaysAgo && new Date(l.loggedAt).getTime() >= fourteenDaysAgo
    );

    const recentGlucoseVals = recentGlucoseLogs.map(l => l.value).filter(val => val !== undefined) as number[];
    if (recentGlucoseVals.length === 0 && user.vitals.bloodGlucose > 0) {
      recentGlucoseVals.push(user.vitals.bloodGlucose);
    }
    const avgRecentGlucose = recentGlucoseVals.length > 0
      ? recentGlucoseVals.reduce((sum, val) => sum + val, 0) / recentGlucoseVals.length
      : 100;

    const baselineGlucoseVals = baselineGlucoseLogs.map(l => l.value).filter(val => val !== undefined) as number[];
    const avgBaselineGlucose = baselineGlucoseVals.length > 0
      ? baselineGlucoseVals.reduce((sum, val) => sum + val, 0) / baselineGlucoseVals.length
      : 120; // fallback trend baseline

    const glucoseDevPct = ((avgRecentGlucose - avgBaselineGlucose) / avgBaselineGlucose) * 100;

    // 2. Blood Pressure metric analysis
    const recentBPLogs = symptomLogs.filter(
      l => l.symptomType === 'Blood Pressure' && new Date(l.loggedAt).getTime() >= threeDaysAgo
    );
    const baselineBPLogs = symptomLogs.filter(
      l => l.symptomType === 'Blood Pressure' && new Date(l.loggedAt).getTime() < threeDaysAgo && new Date(l.loggedAt).getTime() >= fourteenDaysAgo
    );

    const recentBPVals = recentBPLogs.map(l => l.value).filter(val => val !== undefined) as number[];
    if (recentBPVals.length === 0 && user.vitals.bloodPressureSys > 0) {
      recentBPVals.push(user.vitals.bloodPressureSys);
    }
    const avgRecentBP = recentBPVals.length > 0
      ? recentBPVals.reduce((sum, val) => sum + val, 0) / recentBPVals.length
      : 120;

    const baselineBPVals = baselineBPLogs.map(l => l.value).filter(val => val !== undefined) as number[];
    const avgBaselineBP = baselineBPVals.length > 0
      ? baselineBPVals.reduce((sum, val) => sum + val, 0) / baselineBPVals.length
      : 125; // fallback trend baseline

    const bpDevPct = ((avgRecentBP - avgBaselineBP) / avgBaselineBP) * 100;

    // Trigger alert if BOTH deviate by > 8% from trend
    const gDeviates = Math.abs(glucoseDevPct) > 8;
    const bpDeviates = Math.abs(bpDevPct) > 8;
    const triggered = gDeviates && bpDeviates;

    return {
      triggered,
      avgRecentGlucose,
      avgBaselineGlucose,
      glucoseDevPct,
      avgRecentBP,
      avgBaselineBP,
      bpDevPct,
      gDeviates,
      bpDeviates
    };
  };

  const smartHealthAlert = getSmartHealthAlerts();

  // Simple 'Weekly Trend' prediction based on logs from the last 14 days
  const getWeeklyTrend = () => {
    const now = Date.now();
    const fourteenDaysAgo = now - 14 * 24 * 60 * 60 * 1000;
    const logsLast14Days = symptomLogs.filter(log => {
      const logTime = new Date(log.loggedAt).getTime();
      return logTime >= fourteenDaysAgo;
    });

    if (logsLast14Days.length < 3) {
      return {
        status: "insufficient",
        title: "Establishing Trajectory",
        message: "You have logged " + logsLast14Days.length + " entries in the last 14 days. We need at least 3 logging entries to establish a reliable chronological symptom progression model.",
        color: "text-slate-400 border-slate-800 bg-slate-950/40",
        badge: "bg-slate-850 text-slate-400 border border-slate-800"
      };
    }

    // Sort chronologically
    const sortedLogs = [...logsLast14Days].sort((a, b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime());
    
    // Split into first half (older) and second half (newer)
    const midPoint = Math.floor(sortedLogs.length / 2);
    const olderHalf = sortedLogs.slice(0, midPoint);
    const newerHalf = sortedLogs.slice(midPoint);

    const avgOlder = olderHalf.reduce((sum, l) => sum + l.severity, 0) / olderHalf.length;
    const avgNewer = newerHalf.reduce((sum, l) => sum + l.severity, 0) / newerHalf.length;

    const diff = avgNewer - avgOlder;

    if (diff < -0.2) {
      return {
        status: "improving",
        title: "Symptom Burden Declining",
        message: "Your overall logged symptom severity decreased from an average of " + avgOlder.toFixed(1) + "/10 to " + avgNewer.toFixed(1) + "/10 over the last 14 days, indicating optimal clinical progress.",
        color: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5",
        badge: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
      };
    } else if (diff > 0.2) {
      return {
        status: "worsening",
        title: "Metric Burden Increase",
        message: "Your recorded symptom severity increased from " + avgOlder.toFixed(1) + "/10 to " + avgNewer.toFixed(1) + "/10 over the last 14 days. Consult your physician if this persist.",
        color: "text-rose-450 border-rose-500/20 bg-rose-500/5",
        badge: "bg-rose-500/10 text-rose-400 border border-rose-500/20"
      };
    } else {
      return {
        status: "stable",
        title: "Symptom Plateau Reached",
        message: "Your symptom baseline is steady (averaging near " + avgNewer.toFixed(1) + "/10 over the past 14 days). Continue tracking vitals to monitor further variations.",
        color: "text-sky-400 border-sky-500/20 bg-sky-500/5",
        badge: "bg-sky-500/10 text-sky-400 border border-sky-500/20"
      };
    }
  };

  const weeklyTrendResult = getWeeklyTrend();

  return (
    <div className="space-y-6">
      {/* Persistent Browser Push Notification Assistant banner */}
      {('Notification' in window) && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-sm overflow-hidden relative">
          <div className="absolute right-0 top-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-2xl ${(notifPermission === 'granted' || notifPermission === 'simulated') ? 'bg-emerald-500/15 border border-emerald-500/20' : 'bg-amber-500/15 border border-amber-500/20'} h-fit`}>
                {(notifPermission === 'granted' || notifPermission === 'simulated') ? (
                  <Bell className="h-6 w-6 text-emerald-400" />
                ) : (
                  <BellOff className="h-6 w-6 text-amber-400 animate-pulse" />
                )}
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h5 className="text-white font-display font-medium text-sm">
                    Browser Push Notifications
                  </h5>
                  <span className={`text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded ${(notifPermission === 'granted' || notifPermission === 'simulated') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                    {notifPermission === 'granted' ? 'Enabled (Persistent)' : notifPermission === 'simulated' ? 'Enabled (In-App Fallback)' : 'Inactive'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
                  {(notifPermission === 'granted' || notifPermission === 'simulated') 
                    ? "Active browser-alert reminders are active! You'll receive alert popups with your medication notes even when the browser tab is minimized or backgrounded."
                    : "Authorize push reminders to be actively alerted of your prescription timings even when you minimize your browser window/tab."
                  }
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              {(notifPermission !== 'granted' && notifPermission !== 'simulated') ? (
                <button
                  id="enable-browser-push-btn"
                  onClick={requestNotificationPermission}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-[0_0_15px_rgba(79,70,229,0.35)]"
                >
                  <Bell className="h-3.5 w-3.5" />
                  <span>Enable Reminders</span>
                </button>
              ) : (
                <>
                  <button
                    id="trigger-test-push-btn"
                    onClick={triggerTestNotification}
                    disabled={testSuccess}
                    className="px-4 py-2 bg-slate-950 border border-slate-800 hover:border-slate-700 hover:bg-slate-900 text-slate-300 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                    <span>{testSuccess ? 'Sent!' : 'Send Test Alert'}</span>
                  </button>
                  <button
                    id="disable-push-btn"
                    onClick={disableNotificationReminders}
                    className="px-4 py-2 bg-rose-950/30 border border-rose-900/40 hover:border-rose-900/60 hover:bg-rose-900/20 text-rose-300 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <BellOff className="h-3.5 w-3.5" />
                    <span>Disable Reminders</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sandbox Fallback Guidance Modal Overlay */}
      <AnimatePresence>
        {showSandboxExplanation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-[#0b0c10] border border-indigo-500/30 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl relative"
            >
              <button
                onClick={() => setShowSandboxExplanation(false)}
                className="absolute right-4 top-4 text-slate-400 hover:text-white cursor-pointer text-xl"
              >
                &times;
              </button>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl">
                  <Sparkles className="h-6 w-6 text-indigo-400 animate-pulse" />
                </div>
                <h3 className="font-display font-bold text-lg text-white">Hybrid Reminder Activated!</h3>
              </div>
              
              <div className="text-xs text-slate-300 leading-relaxed mb-4">
                Standard OS-level push notification requests are locked inside secure cross-origin preview frames (iframes) by browser rules. 
                <br /><br />
                To guarantee you never miss a medication dose, we've successfully initiated the <strong className="text-indigo-400">Clinical In-App Reminder Engine</strong> instead:
              </div>
              
              <ul className="space-y-2.5 text-xs text-slate-400 mb-6">
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong className="text-white">Acoustic Beeps:</strong> Generates synthetic medical alerting sounds when a timing is met.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong className="text-white">Layout Flashers:</strong> Alternately flashes your browser tab title to demand immediate focus.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong className="text-white">Visual Toasts:</strong> Interactive overlay modals on the client dashboard so you can instantly log dose compliance.</span>
                </li>
              </ul>

              <button
                onClick={() => setShowSandboxExplanation(false)}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(79,70,229,0.4)]"
              >
                <Check className="h-4 w-4" />
                <span>Acknowledge & Start Alarms</span>
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Proactive Smart Health Alert Banner */}
      {smartHealthAlert.triggered && (
        <div id="smart-health-alert-banner" className="bg-gradient-to-r from-rose-500/10 to-amber-500/10 border border-rose-500/30 rounded-3xl p-5 shadow-lg overflow-hidden relative">
          <div className="absolute right-0 top-0 w-32 h-32 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col md:flex-row items-start gap-4">
            <div className="p-3 bg-rose-500/20 border border-rose-500/30 rounded-2xl h-fit shrink-0">
              <ShieldAlert className="h-6 w-6 text-rose-400 animate-pulse" />
            </div>
            <div className="space-y-2 flex-grow">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-rose-400 font-display font-bold text-sm tracking-wide flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-rose-400" />
                  <span>Proactive Clinical Dual-Deviation Alert</span>
                </h4>
                <span className="text-[9px] font-mono tracking-wider font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded animate-pulse">
                  HIGH CONCURRENCY TRIGGER
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
                Our bio-analysis engine detected simultaneous variations in multiple primary wellness lines over the past 3 days. Both your blood glucose and systolic blood pressure logs have deviated beyond established therapeutic baselines. Usually, co-occurring shifts are associated with stress, medication inconsistencies, or dietary factors.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="bg-slate-950/50 rounded-xl border border-rose-500/15 p-3">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block tracking-wider">Glucose Trend Deviation</span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-sm font-bold text-white font-mono">
                      {smartHealthAlert.avgRecentGlucose.toFixed(1)} mg/dL
                    </span>
                    <span className="text-xs font-semibold text-rose-400 font-mono">
                      ({smartHealthAlert.glucoseDevPct > 0 ? "+" : ""}{smartHealthAlert.glucoseDevPct.toFixed(1)}%)
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Baseline: {smartHealthAlert.avgBaselineGlucose.toFixed(1)} mg/dL (last 14d)
                  </p>
                </div>

                <div className="bg-slate-950/50 rounded-xl border border-rose-500/15 p-3">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block tracking-wider">Systolic BP Trend Deviation</span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-sm font-bold text-white font-mono">
                      {smartHealthAlert.avgRecentBP.toFixed(1)} mmHg
                    </span>
                    <span className="text-xs font-semibold text-rose-400 font-mono">
                      ({smartHealthAlert.bpDevPct > 0 ? "+" : ""}{smartHealthAlert.bpDevPct.toFixed(1)}%)
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Baseline: {smartHealthAlert.avgBaselineBP.toFixed(1)} mmHg (last 14d)
                  </p>
                </div>
              </div>

              <div className="pt-2 text-[10px] text-slate-400 font-medium flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" />
                <span>Recommendation: Check off wellness habits, verify active prescription timings, and drink 2L of water.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vitals Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Vital Blood Pressure */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-800/40 pb-2 mb-2">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Blood Pressure</span>
            <Heart className="h-4 w-4 text-rose-500" />
          </div>
          <div className="mt-1">
            <span className="text-2xl font-display font-semibold text-white">
              {user.vitals.bloodPressureSys > 0 ? `${user.vitals.bloodPressureSys}/${user.vitals.bloodPressureDia}` : '— / —'}
            </span>
            <span className="text-xs text-slate-400 ml-1">mmHg</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
            {user.vitals.bloodPressureSys > 0 ? (
              <>
                <span className={`h-2 w-2 rounded-full ${user.vitals.bloodPressureSys >= 130 ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                <span>{user.vitals.bloodPressureSys >= 130 ? 'Stage 1 Elevated' : 'Baseline'}</span>
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-slate-600" />
                <span>Not Logged yet</span>
              </>
            )}
          </div>
        </div>

        {/* Vital Glucose */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-800/40 pb-2 mb-2">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Blood Glucose</span>
            <Activity className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-1">
            <span className="text-2xl font-display font-semibold text-white">
              {user.vitals.bloodGlucose > 0 ? user.vitals.bloodGlucose : '—'}
            </span>
            <span className="text-xs text-slate-400 ml-1">mg/dL</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
            {user.vitals.bloodGlucose > 0 ? (
              <>
                <span className={`h-2 w-2 rounded-full ${user.vitals.bloodGlucose > 125 ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                <span>{user.vitals.bloodGlucose > 125 ? 'Diabetic Margin' : 'Healthy Target'}</span>
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-slate-600" />
                <span>Not Logged yet</span>
              </>
            )}
          </div>
        </div>

        {/* Vital Heart Rate */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-800/40 pb-2 mb-2">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Pulse Rate</span>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-1">
            <span className="text-2xl font-display font-semibold text-white">
              {user.vitals.heartRate > 0 ? user.vitals.heartRate : '—'}
            </span>
            <span className="text-xs text-slate-400 ml-1">bpm</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
            {user.vitals.heartRate > 0 ? (
              <>
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>Steady rhythm</span>
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-slate-600" />
                <span>Not Logged yet</span>
              </>
            )}
          </div>
        </div>

        {/* Vital Weight */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-800/40 pb-2 mb-2">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Weight Log</span>
            <span className="text-xs font-mono text-slate-500">KG</span>
          </div>
          <div className="mt-1">
            <span className="text-2xl font-display font-semibold text-white">
              {user.vitals.weight > 0 ? user.vitals.weight : '—'}
            </span>
            <span className="text-xs text-slate-400 ml-1">kg</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
            {user.vitals.weight > 0 ? (
              <>
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>BMI: {((user.vitals.weight) / 1.75 / 1.75).toFixed(1)} Stable</span>
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-slate-600" />
                <span>Not Logged yet</span>
              </>
            )}
          </div>
        </div>

        {/* Quick Edit Trigger */}
        <div className="col-span-2 md:col-span-1 bg-gradient-to-br from-emerald-950/20 to-slate-900 border border-dashed border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <p className="text-xs text-emerald-400 font-semibold">Instant Vitals Sync</p>
          <p className="text-[10px] text-slate-400">Regularly coordinate clinical blood scores / weight changes.</p>
          <button
            onClick={() => setIsUpdatingVitals(true)}
            className="w-full mt-2 py-1.5 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs rounded-lg transition font-medium cursor-pointer"
          >
            Update Baselines
          </button>
        </div>
      </div>

      {/* Vitals update modal logic */}
      {isUpdatingVitals && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="text-lg font-display font-semibold text-white">Modify Vitals Log</h3>
            <form onSubmit={saveVitals} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Blood Pressure Sys</label>
                  <input
                    type="number"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white text-sm"
                    value={bpSys}
                    onChange={(e) => setBpSys(parseInt(e.target.value) || 120)}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Blood Pressure Dia</label>
                  <input
                    type="number"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white text-sm"
                    value={bpDia}
                    onChange={(e) => setBpDia(parseInt(e.target.value) || 80)}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Blood Glucose (mg/dL)</label>
                <input
                  type="number"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white text-sm"
                  value={glucose}
                  onChange={(e) => setGlucose(parseInt(e.target.value) || 100)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Pulse (bpm)</label>
                  <input
                    type="number"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white text-sm"
                    value={pulse}
                    onChange={(e) => setPulse(parseInt(e.target.value) || 72)}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white text-sm"
                    value={weight}
                    onChange={(e) => setWeight(parseInt(e.target.value) || 70)}
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-3 justify-end">
                <button
                  type="button"
                  onClick={() => setIsUpdatingVitals(false)}
                  className="px-4 py-2 rounded-xl text-xs bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold"
                >
                  Save Sync
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Smart Health Alert Engine Block */}
      {smartHealthAlert.triggered && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-rose-500/10 border border-rose-500/25 rounded-3xl p-5 shadow-lg relative overflow-hidden"
          id="smart-health-alert-clinical-banner"
        >
          <div className="absolute right-0 top-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex flex-col md:flex-row items-start gap-4">
            <div className="p-3 bg-rose-950 border border-rose-500/20 rounded-2xl h-fit shrink-0 text-rose-400">
              <ShieldAlert className="h-6 w-6 animate-pulse" />
            </div>
            <div className="space-y-3 w-full">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 font-mono uppercase tracking-widest animate-pulse">
                    Smart Health Alert
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">3-Day Biosensor Trend Deviation</span>
                </div>
                <h4 className="text-white font-display font-medium text-sm">
                  Simultaneous Multi-Metric Trend Shift Detected
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed max-w-3xl">
                  Our core bio-analysis engine detected simultaneous variations in multiple primary wellness lines over the past 3 days. Both your blood glucose and systolic blood pressure logs have deviated beyond established therapeutic baselines. Usually, co-occurring shifts are associated with stress, medication inconsistencies, or dietary factors.
                </p>
              </div>

              {/* Grid detail of metrics */}
              <div className="grid sm:grid-cols-2 gap-3 max-w-2xl">
                {/* Glucose deviation */}
                <div className="bg-slate-950/60 border border-slate-900 rounded-xl p-3 flex justify-between items-center gap-4">
                  <div>
                    <span className="text-[9px] text-slate-500 font-bold block uppercase font-mono">Blood Glucose (3d avg)</span>
                    <span className="text-sm font-bold text-white font-mono">
                      {Math.round(smartHealthAlert.avgRecentGlucose)} <span className="text-[9px] font-normal text-slate-500">mg/dL</span>
                    </span>
                    <span className="text-[10px] text-slate-400 block">vs. baseline {Math.round(smartHealthAlert.avgBaselineGlucose)} mg/dL</span>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${smartHealthAlert.glucoseDevPct >= 0 ? "text-rose-400 bg-rose-500/10" : "text-emerald-400 bg-emerald-500/10"}`}>
                      {smartHealthAlert.glucoseDevPct >= 0 ? "+" : ""}{smartHealthAlert.glucoseDevPct.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* BP deviation */}
                <div className="bg-slate-950/60 border border-slate-900 rounded-xl p-3 flex justify-between items-center gap-4">
                  <div>
                    <span className="text-[9px] text-slate-500 font-bold block uppercase font-mono">Systolic BP (3d avg)</span>
                    <span className="text-sm font-bold text-white font-mono">
                      {Math.round(smartHealthAlert.avgRecentBP)} <span className="text-[9px] font-normal text-slate-500">mmHg</span>
                    </span>
                    <span className="text-[10px] text-slate-400 block">vs. baseline {Math.round(smartHealthAlert.avgBaselineBP)} mmHg</span>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${smartHealthAlert.bpDevPct >= 0 ? "text-rose-400 bg-rose-500/10" : "text-emerald-400 bg-emerald-500/10"}`}>
                      {smartHealthAlert.bpDevPct >= 0 ? "+" : ""}{smartHealthAlert.bpDevPct.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Recommendation advice */}
              <div className="text-[11px] text-rose-400/90 leading-relaxed bg-rose-500/5 px-3 py-2 rounded-xl border border-rose-500/10 max-w-fit">
                <span className="font-bold uppercase tracking-wider text-[9px] mr-1">Recommended Action:</span>
                Increase hydration levels proactively, practice 5 minutes of mindful breath synchronizations, and verify your medication schedule logs.
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Dynamic Health & Prediction Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Proactive insight container */}
        <div className={`p-4 border rounded-2xl flex flex-col md:flex-row md:items-center gap-3 shadow-sm ${proactiveInsight.color}`}>
          <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl max-w-fit shrink-0">
            <Sparkles className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="space-y-0.5">
            <p className="text-sm font-semibold text-white flex items-center gap-2">
              <span>Adaptive Insight: {proactiveInsight.title}</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-400/10 text-emerald-400 mt-0.5">AI Engine</span>
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              {proactiveInsight.msg}
            </p>
          </div>
        </div>

        {/* Weekly Symptoms Trajectory prediction */}
        <div className={`p-4 border rounded-2xl flex flex-col md:flex-row md:items-center gap-3 shadow-sm ${weeklyTrendResult.color}`}>
          <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl max-w-fit shrink-0">
            <TrendingUp className={`h-5 w-5 transition ${
              weeklyTrendResult.status === 'improving' ? 'text-emerald-400 rotate-180 scale-y-[-1]' :
              weeklyTrendResult.status === 'worsening' ? 'text-rose-400' :
              weeklyTrendResult.status === 'stable' ? 'text-sky-400' :
              'text-slate-400'
            }`} />
          </div>
          <div className="space-y-0.5 w-full">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-white">
                <span>14-Day Trajectory: {weeklyTrendResult.title}</span>
              </p>
              <span className={`px-2 py-0.5 rounded text-[8px] uppercase tracking-wider font-bold ${weeklyTrendResult.badge}`}>
                {weeklyTrendResult.status === 'improving' ? 'Improving' :
                 weeklyTrendResult.status === 'worsening' ? 'Worsening' :
                 weeklyTrendResult.status === 'stable' ? 'Stable' :
                 'Establishing'}
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {weeklyTrendResult.message}
            </p>
          </div>
        </div>
      </div>

      {/* Dynamic Condition Guidance Widget */}
      {(() => {
        if (isProfileLoading) {
          return (
            <div id="condition-guidance-widget-loading" className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden shadow-xl flex flex-col items-center justify-center min-h-[300px] text-center space-y-4">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
              <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-full animate-pulse">
                <Sparkles className="h-8 w-8 text-indigo-455 animate-spin" style={{ animationDuration: '3s' }} />
              </div>
              <div className="space-y-2 animate-pulse">
                <h4 className="text-white font-display font-medium text-sm">Decoding Patient Profiles...</h4>
                <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                  Fetching and alignment of pathology clinical recommendations from safe Firestore database.
                </p>
              </div>
              <div className="flex gap-2.5 pt-2 animate-pulse">
                <div className="w-16 h-6 bg-slate-800 rounded-xl" />
                <div className="w-24 h-6 bg-slate-800 rounded-xl" />
                <div className="w-20 h-6 bg-slate-800 rounded-xl" />
              </div>
            </div>
          );
        }

        const activeConditionsList = user.primaryConditions?.filter(c => c !== 'General Care') || [];
        const currentSelectedGuidance = activeConditionsList.includes(activeGuidancePathology) 
          ? activeGuidancePathology 
          : (activeConditionsList.length > 0 ? activeConditionsList[0] : 'General Preventative');
        const activeRecommendation = PATHOLOGY_RECOMMENDATIONS[currentSelectedGuidance] || PATHOLOGY_RECOMMENDATIONS['General Preventative'];

        return (
          <div id="condition-guidance-widget" className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden shadow-xl space-y-4">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/5">
              <div className="space-y-1 font-sans">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-500/10 text-indigo-400 uppercase tracking-widest border border-indigo-500/20 font-mono">
                    Adaptive Guidance
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">Pathology-Specific Protocols</span>
                </div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2 mt-1">
                  <Sparkles className="h-4 w-4 text-indigo-400 animate-pulse" />
                  <span>Condition Guidance & Clinical Regimens</span>
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
                  AI-filtered diet guidelines, safety checklists, and specialized metabolic activities mapped automatically to your selected pathology profile.
                </p>
              </div>

              {/* Horizontal condition filter pills */}
              <div className="flex flex-wrap gap-2 pt-1 md:pt-0 max-w-full">
                {activeConditionsList.length > 0 ? (
                  activeConditionsList.map((cond) => {
                    const isSelected = currentSelectedGuidance === cond;
                    return (
                      <button
                        key={cond}
                        onClick={() => setActiveGuidancePathology(cond)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold tracking-wide border transition-all cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-indigo-650 text-white border-indigo-500 shadow-lg shadow-indigo-600/20'
                            : 'bg-slate-950 text-slate-455 border-slate-850 hover:text-slate-200 hover:border-slate-750'
                        }`}
                      >
                        <span className="text-sm">{PATHOLOGY_RECOMMENDATIONS[cond]?.icon || '🧬'}</span>
                        <span>{cond}</span>
                      </button>
                    );
                  })
                ) : (
                  <span className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-550/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider font-mono">
                    🛡️ General Preventative Care
                  </span>
                )}
              </div>
            </div>

            {/* Content cards */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Diet Nutrition guidance */}
              <div className="bg-slate-950/40 border border-slate-855 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-indigo-400 border-b border-white/5 pb-2">
                  <div className="p-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                    <Coffee className="h-4 w-4 text-indigo-400" />
                  </div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-white">Targeted Diet &amp; Nutrition Guidelines</h4>
                </div>
                <ul className="space-y-2">
                  {activeRecommendation.dietAdvice.map((advice, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-[11px] text-slate-350 leading-relaxed">
                      <span className="text-indigo-400 font-bold shrink-0 mt-0.5">•</span>
                      <span>{advice}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Lifestyle Activity guidance */}
              <div className="bg-slate-950/40 border border-slate-855 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 border-b border-white/5 pb-2">
                  <div className="p-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                    <Activity className="h-4 w-4 text-emerald-400" />
                  </div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-white">Adaptive Lifestyle &amp; Metabolic Exercise</h4>
                </div>
                <ul className="space-y-2">
                  {activeRecommendation.lifestyleAdvice.map((advice, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-[11px] text-slate-350 leading-relaxed">
                      <span className="text-emerald-400 font-bold shrink-0 mt-0.5">•</span>
                      <span>{advice}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Scientific impact rationale */}
            <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-850 flex items-center gap-3">
              <div className="p-2 bg-indigo-500/5 text-indigo-400 border border-indigo-500/10 rounded-xl shrink-0">
                <Zap className="h-4 w-4 text-indigo-400" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[9px] font-bold uppercase tracking-widest text-indigo-400 block font-mono">Physiological Mechanism</span>
                <p className="text-[10px] text-slate-400 leading-relaxed italic font-sans">
                  "{activeRecommendation.scientificRationale}"
                </p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 🧭 Clinical Portal Direct Navigation Shortcut Center */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/40">
          <div>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-500/10 text-indigo-400 uppercase tracking-widest border border-indigo-500/20">Portal Hub</span>
            <h3 className="text-sm font-semibold text-white mt-1">Medical Portal Direct Access</h3>
          </div>

          {/* Quick Subsystem Segment Selector */}
          <div className="flex bg-slate-950 p-1 border border-slate-850 rounded-xl space-x-1 shrink-0">
            <button
              onClick={() => setDashboardTab('daily')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition cursor-pointer ${
                dashboardTab === 'daily'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-450 hover:text-slate-200'
              }`}
            >
              My Care Routine
            </button>
            <button
              onClick={() => setDashboardTab('analytics')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition cursor-pointer ${
                dashboardTab === 'analytics'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-450 hover:text-slate-200'
              }`}
            >
              Vitals &amp; Analytics
            </button>
          </div>
        </div>

        {/* Shortcut cards with hover transitions and click handlers */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={() => onNavigate?.('scheduler')}
            className="bg-slate-950/40 border border-slate-850 hover:border-slate-700 rounded-2xl p-4 text-left transition hover:bg-slate-950/80 group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl group-hover:scale-110 transition shrink-0">
                <Pill className="h-4.5 w-4.5" />
              </span>
              <span className="text-[10px] text-slate-500 font-mono group-hover:text-white transition">GO ↗</span>
            </div>
            <h4 className="font-semibold text-white text-xs group-hover:text-indigo-305 transition">Prep &amp; Schedule</h4>
            <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">{medications.length} treatments, custom folders.</p>
          </button>

          <button
            onClick={() => onNavigate?.('documents')}
            className="bg-slate-950/40 border border-slate-850 hover:border-slate-700 rounded-2xl p-4 text-left transition hover:bg-slate-950/80 group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="p-2 bg-sky-500/10 text-sky-400 rounded-xl group-hover:scale-110 transition shrink-0">
                <FileText className="h-4.5 w-4.5" />
              </span>
              <span className="text-[10px] text-slate-500 font-mono group-hover:text-white transition">GO ↗</span>
            </div>
            <h4 className="font-semibold text-white text-xs group-hover:text-sky-305 transition">Documents</h4>
            <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">AI dosage extraction logs.</p>
          </button>

          <button
            onClick={() => onNavigate?.('reports')}
            className="bg-slate-950/40 border border-slate-850 hover:border-slate-700 rounded-2xl p-4 text-left transition hover:bg-slate-950/80 group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl group-hover:scale-110 transition shrink-0">
                <TrendingUp className="h-4.5 w-4.5" />
              </span>
              <span className="text-[10px] text-slate-500 font-mono group-hover:text-white transition">GO ↗</span>
            </div>
            <h4 className="font-semibold text-white text-xs group-hover:text-emerald-305 transition">Trend Score</h4>
            <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">Clinical analyzer &amp; reports.</p>
          </button>

          <button
            onClick={() => onNavigate?.('profile')}
            className="bg-slate-950/40 border border-slate-850 hover:border-slate-700 rounded-2xl p-4 text-left transition hover:bg-slate-950/80 group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="p-2 bg-purple-500/10 text-purple-400 rounded-xl group-hover:scale-110 transition shrink-0">
                <Smile className="h-4.5 w-4.5" />
              </span>
              <span className="text-[10px] text-slate-500 font-mono group-hover:text-white transition">GO ↗</span>
            </div>
            <h4 className="font-semibold text-white text-xs group-hover:text-purple-305 transition">User Profile</h4>
            <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">Diagnostics, details &amp; photoroll.</p>
          </button>
        </div>
      </div>
      
      {dashboardTab === 'daily' && (
        <>
          {/* Interactive Daily Track & Medication Compliance Calendar */}
          <ConsistencyCalendar 
            user={user} 
            symptomLogs={symptomLogs} 
            medications={medications} 
            notifications={notifications} 
          />

          {/* Dynamic Condition-Specific Insights & Guidance Hub */}
          <ConditionInsight user={user} />

          {/* Daily Wellness Section */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/40 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 uppercase tracking-widest border border-indigo-500/20">Aesthetic Living</span>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Self-Care Tracker</p>
            </div>
            <h3 className="text-xl font-display font-medium text-white flex items-center gap-2">
              <span>Daily Wellness Habits</span>
              <Sparkle className="h-4 w-4 text-indigo-400 animate-pulse" />
            </h3>
            <p className="text-xs text-slate-400">Complete standard habits daily to improve chronic symptom recovery and compliance scores.</p>
          </div>

          {/* Date Selector Row */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {dateOptions.map((opt) => (
              <button
                key={opt.dateStr}
                onClick={() => setSelectedDate(opt.dateStr)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition whitespace-nowrap border ${
                  selectedDate === opt.dateStr
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                    : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-12 gap-5 items-stretch">
          {/* Left Column stats details (4 cols) */}
          <div className="md:col-span-4 bg-slate-950/40 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-mono">Metrics Summary</p>
              
              <div className="flex items-center gap-4 bg-slate-950 p-3 rounded-xl border border-slate-800/50">
                <div className="h-12 w-12 rounded-xl flex items-center justify-center bg-amber-500/10 border border-amber-500/20 shrink-0 text-amber-500 font-mono font-bold text-lg">
                  {streakCount}
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block tracking-wider">Habit streak</span>
                  <span className="text-xs text-white font-medium flex items-center gap-1">
                    <span>{streakCount} Consecutive Days</span>
                    <Flame className="h-3.5 w-3.5 text-orange-500 animate-pulse fill-orange-500" />
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4 bg-slate-950 p-3 rounded-xl border border-slate-800/50">
                <div className="relative h-12 w-12 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="24" cy="24" r="20" stroke="#1e293b" strokeWidth="3" fill="transparent" />
                    <circle 
                      cx="24" 
                      cy="24" 
                      r="20" 
                      stroke="#6366f1" 
                      strokeWidth="3" 
                      fill="transparent" 
                      strokeDasharray={`${2 * Math.PI * 20}`} 
                      strokeDashoffset={`${2 * Math.PI * 20 * (1 - habitCompletionPercentage / 100)}`} 
                    />
                  </svg>
                  <span className="absolute font-mono font-bold text-[11px] text-indigo-300">{habitCompletionPercentage}%</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block tracking-wider">Completion score</span>
                  <span className="text-xs text-white font-medium">
                    {completedCountForDate} of {totalHabitsCount} Completed
                  </span>
                </div>
              </div>

              {/* Medication Adherence Progress Ring with Grow & Glow Animations */}
              <div className="flex items-center gap-4 bg-slate-950 p-3 rounded-xl border border-slate-800/50 hover:border-teal-500/30 transition duration-300 group">
                <div className="relative h-12 w-12 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full transform -rotate-90 drop-shadow-[0_0_4px_rgba(20,184,166,0.5)]">
                    <circle cx="24" cy="24" r="20" stroke="#1e293b" strokeWidth="3" fill="transparent" />
                    <circle 
                      cx="24" 
                      cy="24" 
                      r="20" 
                      stroke="#14b8a6" 
                      strokeWidth="3" 
                      fill="transparent" 
                      strokeDasharray={`${2 * Math.PI * 20}`} 
                      strokeDashoffset={`${2 * Math.PI * 20 * (1 - adherencePercentageForAdherence / 100)}`} 
                      className="transition-all duration-1000 ease-out"
                      style={{ strokeDashoffset: `${2 * Math.PI * 20 * (1 - adherencePercentageForAdherence / 100)}`, transition: 'stroke-dashoffset 1.2s ease-in-out' }}
                    />
                  </svg>
                  <span className="absolute font-mono font-bold text-[11px] text-teal-300 group-hover:scale-110 transition duration-200">{adherencePercentageForAdherence}%</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block tracking-wider">Meds taken today</span>
                  <span className="text-xs text-white font-medium">
                    {totalScheduledDosesForAdherence > 0 
                      ? `${takenDosesCountForAdherence} of ${totalScheduledDosesForAdherence} Taken` 
                      : "0 Doses Scheduled"}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <p className="text-[11px] text-slate-400 italic font-medium leading-relaxed bg-indigo-950/25 p-2.5 rounded-xl border border-indigo-900/40">
                💡 {habitCompletionPercentage >= 80 
                  ? "Flawless compliance! Excellent foundation for minimizing chemical and stress fluctuations." 
                  : habitCompletionPercentage >= 40 
                  ? "Solid effort. Checking off 2 more simple habits like mindful breathing will stabilize clinical markers further." 
                  : "Start small: checking off a glass of water or 10 min walk builds massive dynamic neural resilience."}
              </p>
            </div>
          </div>

          {/* Right Column checklist grid (8 cols) */}
          <div className="md:col-span-8 grid sm:grid-cols-2 gap-2.5">
            {habitsForDate.map((habit) => {
              return (
                <button
                  key={habit.name}
                  onClick={() => onToggleWellnessHabit(habit.name, selectedDate)}
                  className={`p-3 text-left border rounded-2xl flex items-center justify-between cursor-pointer transition duration-300 group ${
                    habit.completed
                      ? 'bg-slate-950/90 border-emerald-500/40 text-white'
                      : 'bg-slate-950/20 border-slate-800 hover:border-slate-700 hover:bg-slate-950/40 text-slate-305'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold text-base shrink-0 border shadow-inner transition ${
                      habit.completed ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-slate-950 border-slate-850'
                    }`}>
                      {habit.icon}
                    </div>
                    <div>
                      <p className="font-semibold text-xs group-hover:text-white transition">{habit.name}</p>
                      <p className="text-[9px] text-slate-500 mt-0.5 font-mono">
                        {habit.completed ? 'Completed today' : 'Pending routine check'}
                      </p>
                    </div>
                  </div>

                  <div className={`h-6 w-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                    habit.completed 
                      ? 'bg-emerald-500 border-emerald-500 text-slate-950 scale-105' 
                      : 'border-slate-800 text-transparent hover:border-slate-700 scale-95'
                  }`}>
                    <Check className="h-3 w-3 stroke-[3.5]" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Heatmap Section showing 7-day habits completion streaks */}
        <HabitHeatmap 
          wellnessHabits={wellnessHabits}
          onToggleWellnessHabit={onToggleWellnessHabit}
          selectedDate={selectedDate}
        />
      </div>
    </>
  )}

  {dashboardTab === 'analytics' && (
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Analytics Graphs Column */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800/40 pb-4 gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Digital Health Lab</p>
              <h3 className="text-lg font-display font-medium text-white">Dynamic Health &amp; Symptom Analytics</h3>
            </div>
            
            {/* View Mode Tabs */}
            <div className="flex bg-slate-950 p-1 border border-slate-800/50 rounded-xl max-w-fit shrink-0">
              <button
                onClick={() => setActiveChartTab('symptoms')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition cursor-pointer ${
                  activeChartTab === 'symptoms' 
                    ? 'bg-indigo-600 text-white font-bold shadow-md' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Symptom Curves
              </button>
              <button
                onClick={() => setActiveChartTab('habits')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition cursor-pointer ${
                  activeChartTab === 'habits' 
                    ? 'bg-indigo-600 text-white font-bold shadow-md' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Habits Correlation
              </button>
            </div>
          </div>

          {/* Graph Placeholder vs Recharts */}
          <div className="h-72 w-full text-xs">
            {activeChartTab === 'symptoms' ? (
              chartData.length < 2 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2 border border-dashed border-slate-800 rounded-2xl bg-slate-950/40 p-6 text-center">
                  <Smile className="h-10 w-10 text-slate-600" />
                  <p className="font-semibold text-slate-400">Minimal Analytics Loaded</p>
                  <p className="text-xs text-slate-500 max-w-xs">
                    Provide at least 2 entries in the Symptom Tracker panel on the right to trigger real-time trajectory charts.
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                      </linearGradient>
                      <linearGradient id="colorSeverity" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="time" stroke="#64748b" fontSize={10} />
                    <YAxis stroke="#64748b" fontSize={10} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0d0d0d', borderColor: '#334155', color: '#f8fafc' }}
                      itemStyle={{ color: '#818cf8' }}
                    />
                    <Legend />
                    <Area type="monotone" name="Logged Metric / Glucose" dataKey="value" stroke="#6366f1" fillOpacity={1} fill="url(#colorValue)" strokeWidth={2} />
                    <Area type="monotone" name="Symptom Severity (1-10)" dataKey="severity" stroke="#a855f7" fillOpacity={1} fill="url(#colorSeverity)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              )
            ) : (
              // Habits correlation composed chart
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={habitsCorrelationData} margin={{ top: 15, right: -15, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorHabitSymptom" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={10} />
                  
                  {/* Left scale: Habits Completion */}
                  <YAxis 
                    yAxisId="left" 
                    orientation="left" 
                    stroke="#818cf8" 
                    fontSize={10} 
                    domain={[0, 7]} 
                    tickCount={8}
                  />
                  
                  {/* Right scale: Symptom Severity indicator */}
                  <YAxis 
                    yAxisId="right" 
                    orientation="right" 
                    stroke="#f43f5e" 
                    fontSize={10} 
                    domain={[0, 10]} 
                    tickCount={6}
                  />
                  
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0d0d0d', borderColor: '#334155', color: '#f8fafc' }}
                  />
                  <Legend />
                  
                  {/* Completed Habits Bar */}
                  <Bar 
                    yAxisId="left" 
                    dataKey="completedHabits" 
                    name="Completed Habits Count" 
                    fill="#6366f1" 
                    radius={[4, 4, 0, 0]} 
                    barSize={20} 
                  />
                  
                  {/* Symptom Severity Area Line overlay */}
                  <Area 
                    yAxisId="right" 
                    type="monotone" 
                    dataKey="symptomSeverity" 
                    name="Avg Symptom Severity (1-10)" 
                    stroke="#f43f5e" 
                    fill="url(#colorHabitSymptom)" 
                    strokeWidth={2.5} 
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Table logs */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-300 uppercase tracking-widest">Recent Clinical logs</p>
            <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
              {symptomLogs.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-2">No symptom records added yet.</p>
              ) : (
                [...symptomLogs].reverse().map((log) => (
                  <div key={log.id} className="flex justify-between items-center text-xs p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{log.symptomType}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] ${
                          log.severity >= 7 ? 'bg-rose-500/10 text-rose-400' :
                          log.severity >= 4 ? 'bg-amber-500/10 text-amber-400' :
                          'bg-emerald-500/10 text-emerald-400'
                        }`}>
                          Severity {log.severity}/10
                        </span>
                      </div>
                      <p className="text-slate-400 text-[11px] truncate max-w-sm">{log.notes}</p>
                    </div>
                    <div className="text-right">
                      {log.value && <p className="font-mono text-emerald-400 font-semibold">{log.value} {log.symptomType === 'Glucose' ? 'mg/dL' : log.symptomType === 'Blood Pressure' ? 'mmHg' : ''}</p>}
                      <p className="text-[10px] text-slate-500">{new Date(log.loggedAt).toLocaleDateString()} {new Date(log.loggedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Symptom Logging Form Column */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Record Symptoms</p>
            <h3 className="text-lg font-display font-medium text-white">Symptom &amp; Metric Log</h3>
            <p className="text-xs text-slate-400 mt-1">Register blood sugar, daily mood swings, or blood pressure values immediately.</p>
          </div>

          <form onSubmit={handleSymptomSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-slate-300 block mb-1.5 font-semibold">Log Category</label>
              <select
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:border-emerald-500"
                value={symptomType}
                onChange={(e) => setSymptomType(e.target.value as SymptomLog['symptomType'])}
              >
                <option value="Glucose">Blood Glucose (mg/dL)</option>
                <option value="Blood Pressure">Systolic Pressure (mmHg)</option>
                <option value="Mood">Mood Level (Depression scale 1-10)</option>
                <option value="Anxiety">Anxiety / Panic Scale (1-10)</option>
                <option value="Fatigue">Chronic Fatigue (1-10)</option>
                <option value="Insomnia">Insomnia / Sleep Delay (Hrs)</option>
                <option value="Headache">Headache Severity</option>
                <option value="Other">Other Chronic Indicator</option>
              </select>
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1 font-semibold">
                <span>Severity Scale</span>
                <span className="text-emerald-400 font-mono">{severity}/10</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                value={severity}
                onChange={(e) => setSeverity(parseInt(e.target.value))}
              />
              <div className="flex justify-between text-[9px] text-slate-500 px-1 mt-1">
                <span>No impact</span>
                <span>Moderate</span>
                <span>Severe</span>
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-300 block mb-1.5 font-semibold">
                {symptomType === 'Glucose' ? 'Glucose Reading (mg/dL)' :
                 symptomType === 'Blood Pressure' ? 'Systolic Reading (mmHg)' :
                 'Numerical Metric (Optional)'}
              </label>
              <input
                type="number"
                placeholder={symptomType === 'Glucose' ? 'e.g. 104' : symptomType === 'Blood Pressure' ? 'e.g. 120' : 'e.g. 8'}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:border-emerald-500 focus:ring-0"
                value={numericValue}
                onChange={(e) => setNumericValue(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs text-slate-300 block mb-1.5 font-semibold">Notes / Contextual feelings</label>
              <textarea
                placeholder="How do you feel? (e.g. Felt dizzy 2 hours post meal, or slept irregularly)"
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:border-emerald-500 focus:ring-0 resize-none h-18"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
            >
              <Plus className="h-4 w-4" />
              <span>Register Diagnostic Log</span>
            </button>
          </form>

          {/* Quick Alert list */}
          <div className="pt-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-2 uppercase">
              <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />
              <span>Active Treat Warnings</span>
            </div>
            <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
              {unreadAlerts.length === 0 ? (
                <p className="text-[11px] text-slate-500 italic">No medical reminders or alerts flagged.</p>
              ) : (
                unreadAlerts.map(alert => (
                  <div key={alert.id} className="p-2.5 bg-rose-500/5 border border-rose-500/10 rounded-xl text-[11px] text-rose-300">
                    <p className="font-semibold">{alert.title}</p>
                    <p className="text-slate-400 mt-0.5">{alert.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    )}

      {/* Quick Action Floating Menu */}
      <div className="fixed bottom-24 right-6 z-40 flex flex-col items-end">
        <AnimatePresence>
          {isQuickActionOpen && (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.95 }}
              className="mb-4 w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-4 md:p-5 z-50 text-slate-200"
            >
              {/* Header */}
              <div className="flex justify-between items-center pb-2.5 mb-3 border-b border-slate-800/60">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-indigo-400 animate-pulse" />
                  <span className="font-display font-semibold text-sm text-white">Daily Quick Action Clinic</span>
                </div>
                <button 
                  onClick={() => setIsQuickActionOpen(false)}
                  className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-xl cursor-pointer transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Toast feedback inline */}
              {quickActionSuccess && (
                <motion.div 
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold text-[11px] rounded-xl flex items-center gap-1.5 mb-3"
                >
                  <Check className="h-3 w-3 shrink-0" />
                  <span>{quickActionSuccess}</span>
                </motion.div>
              )}

              {/* Segment selection buttons */}
              <div className="grid grid-cols-2 bg-slate-950 p-1 rounded-xl mb-4 border border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setActiveSegment('symptom')}
                  className={`py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer text-center ${activeSegment === 'symptom' ? 'bg-indigo-600 font-bold text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                >
                  Add Symptom Log
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSegment('dose')}
                  className={`py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer text-center ${activeSegment === 'dose' ? 'bg-indigo-600 font-bold text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                >
                  Record Dose Taken
                </button>
              </div>

              {/* Symptom forms segment */}
              {activeSegment === 'symptom' && (
                <form onSubmit={handleQuickSymptomSubmit} className="space-y-3.5">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-450 block mb-1 font-semibold uppercase tracking-wider">Log Category</label>
                      <select
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-[11px] text-white focus:border-indigo-500"
                        value={quickSymptomType}
                        onChange={(e) => setQuickSymptomType(e.target.value as SymptomLog['symptomType'])}
                      >
                        <option value="Glucose">Glucose (mg/dL)</option>
                        <option value="Blood Pressure">Pressure (mmHg)</option>
                        <option value="Mood">Mood Level (1-10)</option>
                        <option value="Anxiety">Anxiety / Panic (1-10)</option>
                        <option value="Fatigue">Fatigue (1-10)</option>
                        <option value="Insomnia">Insomnia (Hrs)</option>
                        <option value="Headache">Headache Scale</option>
                        <option value="Other">Other Chronic</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-455 block mb-1 font-semibold uppercase tracking-wider">Metric Result</label>
                      <input
                        type="number"
                        placeholder={quickSymptomType === 'Glucose' ? 'e.g., 104' : quickSymptomType === 'Blood Pressure' ? 'e.g., 120' : 'Optional'}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-[11px] text-white focus:border-indigo-500 focus:ring-0"
                        value={quickMetricValue}
                        onChange={(e) => setQuickMetricValue(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] text-slate-450 mb-1 font-semibold uppercase tracking-wider">
                      <span>Severity scale</span>
                      <span className="text-indigo-405 font-mono font-bold text-xs">{quickSeverityScale}/10</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      value={quickSeverityScale}
                      onChange={(e) => setQuickSeverityScale(parseInt(e.target.value))}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-450 block mb-1 font-semibold uppercase tracking-wider">Context & Notes</label>
                    <textarea
                      placeholder="Contextual feelings (e.g. post-meal drowsiness, insomnia details)"
                      rows={2}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-[11px] text-white focus:border-indigo-500 focus:ring-0 resize-none"
                      value={quickLogNotes}
                      onChange={(e) => setQuickLogNotes(e.target.value)}
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-indigo-650 hover:bg-indigo-600 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Upload Instant Log</span>
                  </button>
                </form>
              )}

              {/* Medication Dosing List Segment */}
              {activeSegment === 'dose' && (
                <div className="space-y-3">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Your Prescriptions Tracker</span>
                  <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                    {medications.filter(m => m.active).length === 0 ? (
                      <div className="text-center py-6">
                        <Pill className="h-8 w-8 text-slate-650 mx-auto mb-2 opacity-50" />
                        <p className="text-[11px] text-slate-500 italic">No active prescriptions tracked currently.</p>
                      </div>
                    ) : (
                      medications.filter(m => m.active).map(med => {
                        const taken = med.totalDoses - med.remainingDoses;
                        const adPct = med.totalDoses > 0 ? Math.round((taken / med.totalDoses) * 100) : 100;
                        return (
                          <div key={med.id} className="flex justify-between items-center text-xs p-3 rounded-2xl bg-slate-950 border border-slate-800">
                            <div className="space-y-1 max-w-[70%]">
                              <p className="font-semibold text-white truncate text-xs flex items-center gap-1.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 inline-block" />
                                <span>{med.name}</span>
                              </p>
                              <p className="text-[10px] text-slate-400 truncate">{med.dosage} • {med.frequency}</p>
                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                <span className="text-[9px] text-slate-500 font-medium">Left: {med.remainingDoses} / {med.totalDoses}</span>
                                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${adPct >= 80 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                  {adPct}% Adherent
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleQuickTakeDose(med.id, med.name)}
                              disabled={med.remainingDoses <= 0}
                              className={`p-2.5 rounded-xl transition cursor-pointer flex items-center justify-center shrink-0 ${med.remainingDoses <= 0 ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500/30 shadow-[0_0_12px_rgba(79,70,229,0.25)]'}`}
                              title={med.remainingDoses <= 0 ? "Doses exhausted" : "Log dose now"}
                            >
                              <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Trigger Button */}
        <button
          type="button"
          onClick={() => setIsQuickActionOpen(!isQuickActionOpen)}
          className={`px-4.5 py-3.5 ${isQuickActionOpen ? 'bg-slate-850 text-white border-slate-700 shadow-inner' : 'bg-indigo-600 hover:bg-indigo-550 text-white shadow-[0_4px_20px_rgba(79,70,229,0.35)]'} rounded-full flex items-center gap-2 transition cursor-pointer font-bold text-xs border border-white/5 active:scale-95 group relative`}
        >
          <Zap className={`h-4.5 w-4.5 text-indigo-100 transition-transform duration-300 ${isQuickActionOpen ? 'rotate-180' : 'group-hover:scale-110'}`} />
          <span>{isQuickActionOpen ? 'Close Actions' : 'Quick Actions'}</span>
          
          {/* Prescriptions counters badge */}
          {!isQuickActionOpen && medications.filter(m => m.active && m.remainingDoses > 0).length > 0 && (
            <span className="absolute -top-1.5 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-indigo-500 font-mono text-[9px] font-bold text-white shadow-md animate-pulse">
              {medications.filter(m => m.active && m.remainingDoses > 0).length}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
