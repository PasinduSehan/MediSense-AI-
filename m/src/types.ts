export interface NotificationSettings {
  medicationReminders: boolean;
  refillAlerts: boolean;
  systemMessages: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  age: number;
  gender: string;
  avatar: string;
  primaryConditions: string[]; // e.g. ["Diabetes", "Hypertension", "Depression"]
  vitals: {
    bloodPressureSys: number;
    bloodPressureDia: number;
    bloodGlucose: number; // mg/dL
    heartRate: number; // bpm
    weight: number; // kg
    lastUpdated: string;
  };
  createdAt: string;
  notificationSettings?: NotificationSettings;
}

export interface MedicalDocument {
  id: string;
  userId: string;
  title: string;
  type: 'report' | 'prescription' | 'notes';
  category?: 'Insurance' | 'Lab Result' | 'Prescription' | 'Doctor Note';
  date: string;
  fileName?: string;
  rawText: string;
  analysis: AIAnalysis;
  createdAt: string;
}

export interface AIAnalysis {
  simplifiedExplanation: string;
  diagnosedTerms: string;
  primaryInsights: string[];
  severity: 'Low' | 'Medium' | 'High';
  hospitalName?: string;
  doctorName?: string;
  doctorAdvice?: string;
  dateOfIssue?: string;
  illness?: string;
  drugInteractions?: {
    detected: boolean;
    warning: string;
    interactants: string[];
  };
  recommendations: {
    food: string[];
    exercise: string[];
    lifestyle: string[];
    nextSteps: string[];
  };
  drugs: Array<{
    name: string;
    dosage: string;
    frequency: string;
    purpose: string;
    sideEffects: string[];
  }>;
}

export interface Medication {
  id: string;
  userId: string;
  name: string;
  dosage: string;
  frequency: string;
  times: string[]; // e.g. ["08:00", "20:00"]
  durationDays: number;
  totalDoses: number;
  remainingDoses: number;
  startDate: string;
  purpose: string;
  active: boolean;
  notes?: string;
  createdAt: string;
  lowStockThreshold?: number; // threshold warning for medication refills
  tag?: string; // e.g. 'Heart', 'Diabetes'
  color?: string; // Hex color or class reference for visual management
  folder?: string; // custom user-defined folder or category
}

export interface SymptomLog {
  id: string;
  userId: string;
  symptomType: 'Mood' | 'Glucose' | 'Blood Pressure' | 'Headache' | 'Fatigue' | 'Anxiety' | 'Insomnia' | 'Other';
  severity: number; // 1 to 10
  notes: string;
  value?: number; // e.g. blood pressure systolic or blood glucose values
  loggedAt: string;
}

export interface MonthlyProgressReport {
  id: string;
  userId: string;
  month: string; // e.g., "June"
  year: number; // e.g., 2026
  healthScore: number; // 1-100 index
  summary: string;
  trendDiagnosis: string;
  keyActionItems: string[];
  recommendations: {
    dietary: string[];
    activities: string[];
  };
  generatedAt: string;
}

export interface HealthNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'medication' | 'symptom' | 'alert' | 'system';
  timestamp: string;
  read: boolean;
  metaData?: {
    medicationId?: string;
    time?: string;
  };
}

export interface WellnessHabit {
  id: string;
  userId: string;
  name: string;
  completed: boolean;
  date: string; // YYYY-MM-DD
  timestamp: string;
}
