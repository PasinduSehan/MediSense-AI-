import React, { useState } from 'react';
import { User, Medication, HealthNotification, MedicalDocument } from '../types';
import { 
  Clock, Plus, AlertTriangle, Check, Trash2, Edit2, Sliders, BellRing, 
  Sparkles, Play, Pill, RefreshCw, PhoneCall, HelpCircle, AlertCircle, 
  Package, ChevronRight, CheckCircle2, ChevronLeft, ShieldAlert,
  Folder, FolderPlus, FolderX, History, Undo2, X, Printer, Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  LineChart,
  Line,
  BarChart,
  Bar
} from 'recharts';

interface MedicationScheduleProps {
  user: User;
  medications: Medication[];
  notifications?: HealthNotification[];
  documents?: MedicalDocument[];
  onAddMedication: (medication: Medication) => void;
  onTakeDose: (medId: string) => void;
  onDeleteMedication: (medId: string) => void;
  onSimulateTimeAlert: (time: string) => void; // Simulated time fast forward tracker
  onUpdateMedication?: (med: Medication) => void;
  onReverseDose?: (medId: string, logId: string) => void;
}

const STANDARD_TAGS = [
  { name: 'General', color: '#10b981' }, // Emerald
  { name: 'Heart', color: '#ef4444' }, // Red
  { name: 'Diabetes', color: '#f97316' }, // Orange
  { name: 'Depression', color: '#a855f7' }, // Purple
  { name: 'Anemia', color: '#06b6d4' }, // Cyan
  { name: 'Thyroid', color: '#ec4899' }, // Pink
  { name: 'Asthma', color: '#3b82f6' } // Blue
];

export default function MedicationSchedule({ 
  user, 
  medications, 
  notifications = [],
  documents = [],
  onAddMedication, 
  onTakeDose, 
  onDeleteMedication, 
  onSimulateTimeAlert, 
  onUpdateMedication,
  onReverseDose
}: MedicationScheduleProps) {
  const [medName, setMedName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFolder, setActiveFolder] = useState('All');
  const [selectedFolderCreation, setSelectedFolderCreation] = useState('');
  const [auditSearch, setAuditSearch] = useState('');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [analyticsSubTab, setAnalyticsSubTab] = useState<'supplies' | 'adherence' | 'calendar' | 'audit'>('supplies');
  const [calendarDate, setCalendarDate] = useState<Date>(new Date(2026, 5, 11)); // June 11, 2026
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('Once daily');
  const [durationDays, setDurationDays] = useState<number>(30);
  const [totalDoses, setTotalDoses] = useState<number>(30);
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(5);
  const [purpose, setPurpose] = useState('');
  const [selectedHour, setSelectedHour] = useState('08');
  const [selectedMinute, setSelectedMinute] = useState('00');
  const [medNotes, setMedNotes] = useState('');
  
  // Tagging & custom category choice
  const [selectedTag, setSelectedTag] = useState('General');
  const [selectedColor, setSelectedColor] = useState('#10b981');
  const [customTagInput, setCustomTagInput] = useState('');
  const [showCustomTagField, setShowCustomTagField] = useState(false);

  // AI drug-drug interaction states
  const [isCheckingInteractions, setIsCheckingInteractions] = useState(false);
  const [interactionResult, setInteractionResult] = useState<{
    checkedFor: string;
    hasInteraction: boolean;
    severity: 'Low' | 'Medium' | 'High';
    description: string;
  } | null>(null);

  // Custom manual list of timing triggers
  const [addedTimes, setAddedTimes] = useState<string[]>(['08:00']);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Medication editing state
  const [editingMedicationId, setEditingMedicationId] = useState<string | null>(null);

  // Notes editing states
  const [editingNotesMedId, setEditingNotesMedId] = useState<string | null>(null);
  const [tempNotes, setTempNotes] = useState('');

  const handleCancelForm = () => {
    setMedName('');
    setDosage('');
    setPurpose('');
    setMedNotes('');
    setAddedTimes(['08:00']);
    setLowStockThreshold(5);
    setSelectedTag('General');
    setSelectedColor('#10b981');
    setCustomTagInput('');
    setShowCustomTagField(false);
    setInteractionResult(null);
    setSelectedFolderCreation('');
    setEditingMedicationId(null);
    setIsAddingNew(false);
  };

  // Fast forward trigger
  const [simulationHour, setSimulationHour] = useState('08');
  const [simulationMin, setSimulationMin] = useState('00');

  // Refill flow simulation state
  const [isRefillingMed, setIsRefillingMed] = useState<Medication | null>(null);
  const [isPharmacyOrderSending, setIsPharmacyOrderSending] = useState(false);
  const [refillReceiptNum, setRefillReceiptNum] = useState<string | null>(null);

  // Folder/Category & Direct Drag-and-Drop state managers
  const [folders, setFolders] = useState<string[]>(() => {
    const saved = localStorage.getItem(`medisense_user_folders_${user.id}`);
    return saved ? JSON.parse(saved) : ['Daily Routine', 'Symptom Relief', 'Critical Care'];
  });
  const [newFolderName, setNewFolderName] = useState('');
  const [isAddingFolder, setIsAddingFolder] = useState(false);
  const [draggedMedId, setDraggedMedId] = useState<string | null>(null);
  const [draggedOverFolder, setDraggedOverFolder] = useState<string | null>(null);

  // Audit Log overlay state
  const [auditLogMedId, setAuditLogMedId] = useState<string | null>(null);

  const handleAddFolder = () => {
    const trimmed = newFolderName.trim();
    if (!trimmed || folders.includes(trimmed)) return;
    const updated = [...folders, trimmed];
    setFolders(updated);
    localStorage.setItem(`medisense_user_folders_${user.id}`, JSON.stringify(updated));
    setNewFolderName('');
    setIsAddingFolder(false);
  };

  const handleDeleteFolder = (folderName: string) => {
    const updated = folders.filter(f => f !== folderName);
    setFolders(updated);
    localStorage.setItem(`medisense_user_folders_${user.id}`, JSON.stringify(updated));
    
    // reset folder values safely
    medications.forEach(med => {
      if (med.folder === folderName) {
        onUpdateMedication?.({ ...med, folder: undefined });
      }
    });
  };

  const checkMedicationInteractions = async (medNameToCheck: string) => {
    if (!medNameToCheck || medNameToCheck.trim().length < 2 || medications.length === 0) return;
    setIsCheckingInteractions(true);
    setInteractionResult(null);
    try {
      const response = await fetch('/api/gemini/check-interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newMedicationName: medNameToCheck,
          existingMedications: medications.map(m => ({ name: m.name, purpose: m.purpose }))
        })
      });
      if (response.ok) {
        const data = await response.json();
        setInteractionResult({
          checkedFor: medNameToCheck,
          hasInteraction: data.hasInteraction,
          severity: data.severity,
          description: data.description
        });
      }
    } catch (err) {
      console.warn("Could not check interactions", err);
    } finally {
      setIsCheckingInteractions(false);
    }
  };

  // Helper to compile side effects for active medications using AI analysis data or fallback dictionary
  const getSideEffectOverlaps = () => {
    const medSideEffectsMap: { [medName: string]: string[] } = {};
    const fallbackSideEffects: { [medName: string]: string[] } = {
      'metformin': ['stomach discomfort', 'metallic taste', 'nausea', 'fatigue', 'diarrhea'],
      'sertraline': ['nausea', 'insomnia', 'headache', 'fatigue', 'dizziness', 'dry mouth'],
      'lisinopril': ['dizziness', 'headache', 'fatigue', 'cough', 'nausea'],
      'atorvastatin': ['muscle pain', 'headache', 'fatigue', 'nausea', 'diarrhea'],
      'aspirin': ['stomach pain', 'heartburn', 'nausea', 'bleeding']
    };

    medications.forEach(med => {
      const lowerName = med.name.toLowerCase();
      let effects: string[] = [];

      // 1. Scan medical documents AI analysis data
      const docsToScan = documents || [];
      for (const doc of docsToScan) {
        if (doc.analysis && doc.analysis.drugs) {
          const match = doc.analysis.drugs.find(d => 
            lowerName.includes(d.name.toLowerCase()) || 
            d.name.toLowerCase().includes(lowerName)
          );
          if (match && match.sideEffects && match.sideEffects.length > 0) {
            effects = match.sideEffects.map(se => se.toLowerCase().trim());
            break;
          }
        }
      }

      // 2. Fallback to dictionary if empty to support rich visual warnings on demo meds
      if (effects.length === 0) {
        for (const [key, val] of Object.entries(fallbackSideEffects)) {
          if (lowerName.includes(key) || key.includes(lowerName)) {
            effects = val;
            break;
          }
        }
      }

      if (effects.length > 0) {
        medSideEffectsMap[med.name] = effects;
      }
    });

    const overlaps: { [medName: string]: { overlappingWith: string[], overlappingSideEffects: string[] } } = {};
    const medNames = Object.keys(medSideEffectsMap);

    for (let i = 0; i < medNames.length; i++) {
      const medA = medNames[i];
      const effectsA = medSideEffectsMap[medA];
      
      for (let j = i + 1; j < medNames.length; j++) {
        const medB = medNames[j];
        const effectsB = medSideEffectsMap[medB];

        const common = effectsA.filter(e => effectsB.includes(e));
        if (common.length > 0) {
          if (!overlaps[medA]) overlaps[medA] = { overlappingWith: [], overlappingSideEffects: [] };
          if (!overlaps[medB]) overlaps[medB] = { overlappingWith: [], overlappingSideEffects: [] };

          if (!overlaps[medA].overlappingWith.includes(medB)) {
            overlaps[medA].overlappingWith.push(medB);
            overlaps[medA].overlappingSideEffects = Array.from(new Set([...overlaps[medA].overlappingSideEffects, ...common]));
          }
          if (!overlaps[medB].overlappingWith.includes(medA)) {
            overlaps[medB].overlappingWith.push(medA);
            overlaps[medB].overlappingSideEffects = Array.from(new Set([...overlaps[medB].overlappingSideEffects, ...common]));
          }
        }
      }
    }
    return overlaps;
  };

  const sideEffectOverlaps = getSideEffectOverlaps();

  const handleAddTime = () => {
    const formattedTime = `${selectedHour}:${selectedMinute}`;
    if (!addedTimes.includes(formattedTime)) {
      setAddedTimes([...addedTimes, formattedTime].sort());
    }
  };

  const handleRemoveTime = (t: string) => {
    setAddedTimes(addedTimes.filter(time => time !== t));
  };

  const handleAddNewMedication = (e: React.FormEvent) => {
    e.preventDefault();
    if (!medName || !dosage) return;

    const finalTag = showCustomTagField ? (customTagInput.trim() || 'Custom') : selectedTag;
    const finalColor = selectedColor;

    if (editingMedicationId) {
      if (!onUpdateMedication) return;
      const originalMed = medications.find(m => m.id === editingMedicationId);
      if (originalMed) {
        const updatedMed: Medication = {
          ...originalMed,
          name: medName,
          dosage,
          frequency,
          times: addedTimes.length > 0 ? addedTimes : ['08:00'],
          durationDays,
          totalDoses,
          remainingDoses: originalMed.totalDoses !== totalDoses ? totalDoses : originalMed.remainingDoses,
          purpose: purpose || "General Treatment",
          notes: medNotes || "",
          lowStockThreshold: Number(lowStockThreshold) || 5,
          tag: finalTag,
          color: finalColor,
          folder: selectedFolderCreation || undefined
        };
        onUpdateMedication(updatedMed);
      }
    } else {
      const newMed: Medication = {
        id: 'med_' + Math.random().toString(36).substr(2, 9),
        userId: user.id,
        name: medName,
        dosage,
        frequency,
        times: addedTimes.length > 0 ? addedTimes : ['08:00'],
        durationDays,
        totalDoses,
        remainingDoses: totalDoses,
        startDate: new Date().toLocaleDateString(),
        purpose: purpose || "General Treatment",
        active: true,
        notes: medNotes || "",
        createdAt: new Date().toISOString(),
        lowStockThreshold: Number(lowStockThreshold) || 5,
        tag: finalTag,
        color: finalColor,
        folder: selectedFolderCreation || undefined
      };

      onAddMedication(newMed);
    }
    
    // Clear state
    setMedName('');
    setDosage('');
    setPurpose('');
    setMedNotes('');
    setAddedTimes(['08:00']);
    setLowStockThreshold(5);
    setSelectedTag('General');
    setSelectedColor('#10b981');
    setCustomTagInput('');
    setShowCustomTagField(false);
    setInteractionResult(null);
    setSelectedFolderCreation('');
    setEditingMedicationId(null);
    setIsAddingNew(false);
  };

  const triggerSimuAlert = () => {
    const simTime = `${simulationHour}:${simulationMin}`;
    onSimulateTimeAlert(simTime);
  };

  // Stepper threshold modification helper
  const handleUpdateThresholdInList = (med: Medication, change: number) => {
    if (!onUpdateMedication) return;
    const currentLow = med.lowStockThreshold !== undefined ? med.lowStockThreshold : 5;
    const updatedVal = Math.max(1, currentLow + change);
    onUpdateMedication({
      ...med,
      lowStockThreshold: updatedVal
    });
  };

  // Refill simulation executor
  const handleSimulateRefillOrder = () => {
    if (!isRefillingMed || !onUpdateMedication) return;
    setIsPharmacyOrderSending(true);

    setTimeout(() => {
      // Complete order
      const replenishedMed: Medication = {
        ...isRefillingMed,
        remainingDoses: isRefillingMed.totalDoses // refill to maximum capacity
      };

      onUpdateMedication(replenishedMed);

      // Generate localized alert receipt
      const rxReceipt = 'RX-REFILL-' + Math.floor(100000 + Math.random() * 900000);
      setRefillReceiptNum(rxReceipt);
      setIsPharmacyOrderSending(false);

      // Play refill success beep
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        // Harmonic Arpeggio chime
        osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.2); // G5
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
      } catch {}
    }, 1200);
  };

  // Helper properties
  const totalSupplyShortCount = medications.filter(m => {
    const thresh = m.lowStockThreshold !== undefined ? m.lowStockThreshold : 5;
    return m.remainingDoses < thresh;
  }).length;

  return (
    <div className="space-y-6" id="medication-scheduler-root">
      
      {/* Mini Refill Analytics bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="refill-analytics-widgets">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono font-bold">Total Formulations</span>
            <p className="text-2xl font-mono font-bold text-white">{medications.length}</p>
          </div>
          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/60">
            <Pill className="h-5 w-5 text-indigo-400" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-850 rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono font-bold">Low Stock Warning Flags</span>
            <p className={`text-2xl font-mono font-bold ${totalSupplyShortCount > 0 ? 'text-rose-400 animate-pulse' : 'text-slate-400'}`}>
              {totalSupplyShortCount}
            </p>
          </div>
          <div className={`p-2.5 rounded-xl border ${totalSupplyShortCount > 0 ? 'bg-rose-500/10 border-rose-500/20 text-rose-450' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>
            <AlertTriangle className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-850 rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-505 uppercase tracking-wider font-mono font-bold">Supply Status Health</span>
            <p className="text-sm font-bold text-emerald-400 mt-1 flex items-center gap-1.5 font-display">
              <CheckCircle2 className="h-4 w-4" />
              <span>{totalSupplyShortCount === 0 ? "All Repositories Optimal" : "Refill Contact Advisable"}</span>
            </p>
          </div>
          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/60">
            <Package className="h-5 w-5 text-emerald-400" />
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        
        {/* Left Column: Alarms configuration & simulated fast-forward controls */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-sm space-y-5" id="scheduler-control-left">
          <div className="flex items-center justify-between border-b border-slate-805/45 pb-3">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Alarm Schedulers</p>
              <h3 className="text-lg font-display font-medium text-white">Medication Alarm Setup</h3>
            </div>
            <button
              onClick={() => {
                if (isAddingNew) {
                  handleCancelForm();
                } else {
                  setIsAddingNew(true);
                  setEditingMedicationId(null);
                }
              }}
              className="p-2 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 rounded-xl transition text-xs font-semibold flex items-center gap-1 cursor-pointer"
              id="toggle-add-rx-form"
            >
              <Plus className="h-4 w-4" />
              <span>{isAddingNew && editingMedicationId ? "New Rx" : "Add Rx"}</span>
            </button>
          </div>

          {/* New Medication Registration Form with Built-In Refill Alert Trigger Configurer */}
          {isAddingNew && (
            <form onSubmit={handleAddNewMedication} className="space-y-4 bg-slate-950 p-4 rounded-2xl border border-slate-800" id="add-prescription-form">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {editingMedicationId ? "Edit Medicine Profile" : "New Medicine Profile"}
                </span>
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="text-[10px] text-rose-450 hover:text-rose-400 font-semibold uppercase font-mono cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1 font-semibold flex items-center justify-between">
                  <span>Medication Name</span>
                  {medName.trim().length >= 2 && medications.length > 0 && (
                    <button
                      type="button"
                      onClick={() => checkMedicationInteractions(medName)}
                      className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer bg-transparent border-none"
                    >
                      <Sparkles className="h-3 w-3 animate-pulse text-emerald-400" />
                      <span>Verify Safety Check</span>
                    </button>
                  )}
                </label>
                <div className="relative">
                  <input
                    id="rx-form-name"
                    type="text"
                    required
                    placeholder="e.g. Metformin, Sertraline, Insulin"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-650"
                    value={medName}
                    onChange={(e) => {
                      setMedName(e.target.value);
                      if (interactionResult && interactionResult.checkedFor !== e.target.value) {
                        setInteractionResult(null);
                      }
                    }}
                    onBlur={(e) => {
                      if (e.target.value.trim().length >= 3 && medications.length > 0) {
                        checkMedicationInteractions(e.target.value);
                      }
                    }}
                  />
                  {isCheckingInteractions && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono">
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      <span>AI Reviewing...</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Interaction Warning Alert Banner */}
              {interactionResult && (
                <div className={`p-3 rounded-xl border text-[11px] leading-relaxed transition-all ${
                  interactionResult.hasInteraction && interactionResult.severity === 'High'
                    ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                    : interactionResult.hasInteraction
                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                }`}>
                  <div className="flex gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-current" />
                    <div>
                      <p className="font-bold uppercase tracking-wider text-[9px] text-current">
                        {interactionResult.hasInteraction ? `Interaction Threat Found (${interactionResult.severity})` : 'AI Safety Cross-Check Verified'}
                      </p>
                      <p className="text-slate-300 mt-0.5">{interactionResult.description}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 block mb-1 font-semibold">Dosage (Strength)</label>
                  <input
                    id="rx-form-dosage"
                    type="text"
                    required
                    placeholder="e.g. 500mg, 1 tablet"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-xs text-white placeholder-slate-650"
                    value={dosage}
                    onChange={(e) => setDosage(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 block mb-1 font-semibold">Purpose Log</label>
                  <input
                    id="rx-form-purpose"
                    type="text"
                    placeholder="e.g.blood glucose output"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-xs text-white placeholder-slate-650"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1 font-semibold font-sans">Personal Notes</label>
                <textarea
                  id="rx-form-notes"
                  placeholder="e.g., Take with food. Avoid grapefruit juice."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-xs text-white placeholder-slate-650 min-h-[60px] focus:outline-none focus:border-indigo-500 font-sans resize-y"
                  value={medNotes}
                  onChange={(e) => setMedNotes(e.target.value)}
                />
              </div>

              {/* Enhanced 3-column details row including Refill Threshold */}
              <div className="grid grid-cols-3 gap-2 bg-slate-900/60 p-2.5 rounded-xl border border-slate-850">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1 font-bold uppercase tracking-wider truncate">Total Supply</label>
                  <input
                    id="rx-form-total-supply"
                    type="number"
                    min="1"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-white text-center font-mono"
                    value={totalDoses}
                    onChange={(e) => setTotalDoses(parseInt(e.target.value) || 30)}
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1 font-bold uppercase tracking-wider truncate">Days Cycle</label>
                  <input
                    id="rx-form-duration-cycle"
                    type="number"
                    min="1"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-white text-center font-mono"
                    value={durationDays}
                    onChange={(e) => setDurationDays(parseInt(e.target.value) || 30)}
                  />
                </div>
                <div>
                  <label className="text-[10px] text-teal-400 block mb-1 font-bold uppercase tracking-wider truncate flex items-center justify-center gap-0.5">
                    <span>Threshold</span>
                  </label>
                  <input
                    id="rx-form-low-threshold-val"
                    type="number"
                    min="1"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-teal-300 text-center font-mono font-bold focus:border-teal-400"
                    value={lowStockThreshold}
                    onChange={(e) => setLowStockThreshold(parseInt(e.target.value) || 5)}
                  />
                </div>
              </div>
              <div className="text-[10px] text-slate-500 italic px-1 text-center">
                System warning alert automatically triggers when remaining stock drops below {lowStockThreshold} doses.
              </div>

              {/* Timers configuration */}
              <div className="space-y-1.5 p-2 bg-slate-900 rounded-xl border border-slate-850">
                <span className="text-xs text-slate-350 block font-semibold">Alarm Timing Reminders</span>
                
                <div className="flex gap-2 items-center">
                  <select
                    className="bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-white cursor-pointer font-mono"
                    value={selectedHour}
                    onChange={(e) => setSelectedHour(e.target.value)}
                  >
                    {Array.from({ length: 24 }).map((_, i) => {
                      const hr = i.toString().padStart(2, '0');
                      return <option key={hr} value={hr}>{hr} hr</option>;
                    })}
                  </select>
                  <span className="text-white text-xs font-mono">:</span>
                  <select
                    className="bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-white cursor-pointer font-mono"
                    value={selectedMinute}
                    onChange={(e) => setSelectedMinute(e.target.value)}
                  >
                    {Array.from({ length: 12 }).map((_, i) => {
                      const min = (i * 5).toString().padStart(2, '0');
                      return <option key={min} value={min}>{min} min</option>;
                    })}
                  </select>
                  <button
                    type="button"
                    onClick={handleAddTime}
                    className="ml-auto px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-lg cursor-pointer"
                  >
                    Add Alarms
                  </button>
                </div>

                {/* View added times */}
                <div className="flex flex-wrap gap-1.5 pt-1.5">
                  {addedTimes.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-950 border border-slate-800 text-slate-300"
                    >
                      <span>{t}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTime(t)}
                        className="text-rose-450 hover:text-rose-400 cursor-pointer text-xs font-bold font-mono pl-1"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              </div>
              
              {/* Category Tagging Choice */}
              <div className="space-y-2 p-2.5 bg-slate-900 rounded-xl border border-slate-850">
                <span className="text-xs text-slate-350 block font-semibold">Category Tag &amp; Color Code</span>
                <div className="flex flex-wrap gap-2">
                  {STANDARD_TAGS.map((t) => {
                    const isSelected = !showCustomTagField && selectedTag === t.name;
                    return (
                      <button
                        key={t.name}
                        type="button"
                        onClick={() => {
                          setSelectedTag(t.name);
                          setSelectedColor(t.color);
                          setShowCustomTagField(false);
                        }}
                        className={`px-2 py-1 rounded-full text-[10px] font-semibold flex items-center gap-1.5 transition-all text-left border ${
                          isSelected 
                            ? 'bg-slate-950 border-slate-600 text-white shadow-sm' 
                            : 'bg-slate-950/40 border-transparent text-slate-400 hover:text-slate-300'
                        }`}
                      >
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                        <span>{t.name}</span>
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => {
                      setShowCustomTagField(true);
                      setSelectedColor('#a855f7'); // default purple for custom
                    }}
                    className={`px-2 py-1 rounded-full text-[10px] font-semibold flex items-center gap-1.5 transition-all border ${
                      showCustomTagField 
                        ? 'bg-slate-950 border-slate-600 text-white shadow-sm' 
                        : 'bg-slate-950/40 border-transparent text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    <span>+ Custom Tag</span>
                  </button>
                </div>

                {showCustomTagField && (
                  <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-800/50">
                    <div>
                      <label className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mb-1 block">Custom Label</label>
                      <input
                        type="text"
                        placeholder="e.g. Cholesterol"
                        className="w-full bg-slate-950 border border-slate-850 rounded-lg p-1.5 text-xs text-white"
                        value={customTagInput}
                        onChange={(e) => setCustomTagInput(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mb-1 block">Color Tag</label>
                      <div className="flex gap-1.5 items-center justify-start h-[30px] overflow-x-auto">
                        {['#ef4444', '#f97316', '#eab308', '#10b981', '#06b6d4', '#3b82f6', '#a855f7', '#ec4899'].map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setSelectedColor(c)}
                            className={`h-4 w-4 rounded-full border transition-all ${selectedColor === c ? 'border-white scale-110 shadow-sm' : 'border-transparent opacity-65 hover:opacity-100'}`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Category Folder Selection */}
              <div className="space-y-1.5 p-2.5 bg-slate-900 rounded-xl border border-slate-850">
                <span className="text-xs text-slate-350 block font-semibold">Assign to Category Folder</span>
                <select
                  id="rx-form-category-folder"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white cursor-pointer font-sans focus:outline-none focus:border-indigo-500"
                  value={selectedFolderCreation}
                  onChange={(e) => setSelectedFolderCreation(e.target.value)}
                >
                  <option value="">📁 Uncategorized</option>
                  {folders.map(f => (
                    <option key={f} value={f}>📁 {f}</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className={`w-full py-2 text-slate-950 text-xs font-bold rounded-xl transition cursor-pointer ${editingMedicationId ? 'bg-indigo-400 hover:bg-indigo-350 text-white' : 'bg-emerald-500 hover:bg-emerald-400'}`}
              >
                {editingMedicationId ? "Update Active Treatment Schedule" : "Add Active Treatment Schedule"}
              </button>
            </form>
          )}

          {/* Time Simulator Trigger Container */}
          <div className="p-4 bg-slate-950/65 border border-dashed border-emerald-500/20 rounded-2xl space-y-2">
            <div className="flex items-center gap-1.5">
              <BellRing className="h-4 w-4 text-emerald-400" />
              <span className="text-xs text-emerald-450 font-semibold uppercase tracking-wider font-display">Medication Alarm Simulator</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Test alarm logs directly inside our health sandbox! Fast forward the system clock in AI Studio to trigger reminders.
            </p>
            <div className="flex gap-2 items-center pt-1">
              <select
                className="bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-xs text-white font-mono"
                value={simulationHour}
                onChange={(e) => setSimulationHour(e.target.value)}
              >
                {Array.from({ length: 24 }).map((_, i) => {
                  const hr = i.toString().padStart(2, '0');
                  return <option key={hr} value={hr}>{hr} hr</option>;
                })}
              </select>
              <select
                className="bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-xs text-white font-mono"
                value={simulationMin}
                onChange={(e) => setSimulationMin(e.target.value)}
              >
                {Array.from({ length: 12 }).map((_, i) => {
                  const min = (i * 5).toString().padStart(2, '0');
                  return <option key={min} value={min}>{min} min</option>;
                })}
              </select>
              <button
                onClick={triggerSimuAlert}
                className="px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer shrink-0"
              >
                <Play className="h-3 w-3 fill-slate-950" />
                <span>Test Alarm</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Supply Stock Tracker & Custom Alarm Cards */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-sm space-y-5" id="scheduler-active-right">
          
          {/* Header Title block */}
          <div className="flex flex-col sm:flex-row sm:items-start md:items-center justify-between gap-3 border-b border-slate-805/45 pb-3">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Supply Core</p>
              <h3 className="text-lg font-display font-medium text-white">Interactive Supply &amp; Refill Board</h3>
              <p className="text-xs text-slate-400 mt-0.5">Configure warning thresholds and coordinate pharmacy restock cycles.</p>
            </div>
            
            {/* Quick Export/Print CTA */}
            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="flex items-center gap-2 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-450 hover:text-white text-xs font-semibold px-4 px-3.5 py-2.5 rounded-xl border border-indigo-500/20 hover:border-indigo-500 transition cursor-pointer self-start sm:self-center"
              title="Export active treatment summary as clinical PDF document"
              id="btn-print-prescriptions"
            >
              <Printer className="h-4 w-4" />
              <span>Print Schedule Summary</span>
            </button>
          </div>

          {/* Schedulers Active List */}
          <div className="space-y-4">
            
            {/* Realtime Search Bar */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search active prescriptions by name, purpose, or tag..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-xl pl-9.5 pr-8 py-2.5 focus:outline-none focus:border-indigo-500 font-sans transition placeholder-slate-505"
                id="search-prescriptions"
              />
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition p-1 rounded-full hover:bg-slate-900 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Folders Management Hub */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Folder className="h-4 w-4 text-indigo-400" />
                  <span className="text-xs font-semibold text-white">Interactive Custom Folders &amp; Categories</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddingFolder(!isAddingFolder)}
                  className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 cursor-pointer flex items-center gap-1 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg transition"
                >
                  <FolderPlus className="h-3 w-3" />
                  <span>New Folder</span>
                </button>
              </div>

              {/* Folder creation field inline */}
              {isAddingFolder && (
                <div className="flex items-center gap-2 pt-1 border-t border-slate-850/40">
                  <input
                    type="text"
                    placeholder="Folder Name (e.g., Morning Meds)..."
                    className="bg-slate-900 border border-slate-800 text-[11px] text-white rounded-xl px-3 py-1.5 flex-grow focus:outline-none focus:border-indigo-500 font-sans"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddFolder();
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddFolder}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] rounded-xl px-3 py-1.5 cursor-pointer transition whitespace-nowrap"
                  >
                    Create
                  </button>
                </div>
              )}

               {/* Active custom folders roll */}
              <div className="space-y-1.5" id="folder-filtering-pills-hub">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono">Filter by Category Folder</span>
                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  {/* 'All' pill */}
                  <button
                    type="button"
                    onClick={() => setActiveFolder('All')}
                    className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold cursor-pointer transition-all border ${
                      activeFolder === 'All'
                        ? 'bg-indigo-600/20 text-indigo-400 border-indigo-505/50 shadow-sm'
                        : 'bg-slate-900/60 border-slate-850 text-slate-400 hover:text-white hover:border-slate-800'
                    }`}
                  >
                    <Folder className="h-3.5 w-3.5 shrink-0" />
                    <span>All Prescriptions ({medications.length})</span>
                  </button>

                  {/* 'Uncategorized' pill */}
                  <button
                    type="button"
                    onClick={() => setActiveFolder('Uncategorized')}
                    className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold cursor-pointer transition-all border ${
                      activeFolder === 'Uncategorized'
                        ? 'bg-indigo-600/20 text-indigo-400 border-indigo-505/50 shadow-sm'
                        : 'bg-slate-900/60 border-slate-850 text-slate-400 hover:text-white hover:border-slate-800'
                    }`}
                  >
                    <Folder className="h-3.5 w-3.5 shrink-0 opacity-60" />
                    <span>Uncategorized ({medications.filter(m => !m.folder || !folders.includes(m.folder)).length})</span>
                  </button>

                  {/* Dynamic custom folder pills */}
                  {folders.map(folderName => {
                    const count = medications.filter(m => m.folder === folderName).length;
                    const isActive = activeFolder === folderName;
                    return (
                      <div
                        key={folderName}
                        className={`flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-semibold transition-all border ${
                          isActive
                            ? 'bg-indigo-600/25 text-indigo-300 border-indigo-505/50'
                            : 'bg-slate-900/60 border-slate-850 text-slate-350 hover:text-white hover:border-slate-800'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setActiveFolder(folderName)}
                          className="flex items-center gap-1.5 focus:outline-none cursor-pointer text-xs font-semibold"
                        >
                          <Folder className="h-3.5 w-3.5 shrink-0" />
                          <span>{folderName}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-950/45 rounded-full text-slate-400">
                            {count}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFolder(folderName);
                            if (activeFolder === folderName) setActiveFolder('All');
                          }}
                          className="text-slate-500 hover:text-rose-450 p-0.5 ml-1 rounded hover:bg-slate-900/80 transition cursor-pointer"
                          title={`Delete folder "${folderName}"`}
                        >
                          <FolderX className="h-3.5 w-3.5 shrink-0" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {medications.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-2xl bg-slate-950/20 text-center p-6 text-slate-500" id="no-meds-empty-placeholder">
                <Clock className="h-10 w-10 text-slate-600 animate-pulse mb-2" />
                <p className="font-semibold text-slate-400">No Active Prescriptions</p>
                <p className="text-xs text-slate-500 max-w-xs leading-relaxed mt-1">
                  Create a treatment using the setup panel or extract prescription times automatically utilizing clinical PDF analysis in the Document Hub!
                </p>
              </div>
            ) : (() => {
              const filteredMedications = medications.filter(med => {
                // If folder filter is active
                if (activeFolder !== 'All') {
                  const currentFolder = med.folder && folders.includes(med.folder) ? med.folder : 'Uncategorized';
                  if (currentFolder !== activeFolder) return false;
                }

                if (!searchTerm.trim()) return true;
                const term = searchTerm.toLowerCase();
                return (
                  med.name?.toLowerCase().includes(term) ||
                  med.purpose?.toLowerCase().includes(term) ||
                  (med.tag && med.tag.toLowerCase().includes(term))
                );
              });

              if (filteredMedications.length === 0) {
                return (
                  <div className="h-48 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-2xl bg-slate-950/20 text-center p-6 text-slate-500" id="search-empty-placeholder">
                    <Search className="h-8 w-8 text-slate-600 animate-pulse mb-2" />
                    <p className="font-semibold text-slate-400">No Prescriptions Match Your Search</p>
                    <p className="text-xs text-slate-500 max-w-xs leading-relaxed mt-1">
                      No medications matched your filter criteria <strong>"{searchTerm}"</strong>. Modify your query or clear the filter.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTerm('');
                        setActiveFolder('All');
                      }}
                      className="mt-3 text-xs text-indigo-400 hover:text-indigo-300 font-bold transition cursor-pointer"
                    >
                      Clear Search &amp; Folder Filter
                    </button>
                  </div>
                );
              }

              // Group medications by folder
              const groupedMedications: Record<string, Medication[]> = {};
              folders.forEach(f => {
                groupedMedications[f] = [];
              });
              groupedMedications['Uncategorized'] = [];

              filteredMedications.forEach(med => {
                const f = med.folder && folders.includes(med.folder) ? med.folder : 'Uncategorized';
                groupedMedications[f].push(med);
              });

              const folderNamesList = [...folders, 'Uncategorized'];

              return (
                <div className="space-y-6">
                  {folderNamesList.map(folderName => {
                    const folderItems = groupedMedications[folderName] || [];
                    const isDraggedOver = draggedOverFolder === folderName;

                    // If activeFolder is not 'All', hide other folders
                    if (activeFolder !== 'All' && folderName !== activeFolder) return null;

                    // Skip uncategorized folder if it's empty to keep layout dense
                    if (folderName === 'Uncategorized' && folderItems.length === 0) return null;

                    // Skip empty folders when under active search to keep search results clean and focused
                    if (searchTerm.trim() && folderItems.length === 0) return null;

                    return (
                      <div
                        key={folderName}
                        onDragOver={(e) => {
                          e.preventDefault();
                          if (draggedOverFolder !== folderName) {
                            setDraggedOverFolder(folderName);
                          }
                        }}
                        onDragLeave={() => {
                          setDraggedOverFolder(null);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          const medId = e.dataTransfer.getData('text/plain') || draggedMedId;
                          if (medId) {
                            const targetMed = medications.find(m => m.id === medId);
                            if (targetMed) {
                              const updatedFolder = folderName === 'Uncategorized' ? undefined : folderName;
                              onUpdateMedication?.({ ...targetMed, folder: updatedFolder });
                            }
                          }
                          setDraggedMedId(null);
                          setDraggedOverFolder(null);
                        }}
                        className={`p-1.5 rounded-3xl transition duration-300 border-2 ${
                          isDraggedOver 
                            ? 'border-indigo-500 bg-indigo-950/20 scale-[1.01]' 
                            : 'border-transparent bg-transparent'
                        }`}
                      >
                        {/* Folder Header */}
                        <div className="flex items-center justify-between px-2 mb-3">
                          <div className="flex items-center gap-2">
                            <Folder className={`h-4 w-4 ${folderName === 'Uncategorized' ? 'text-slate-500' : 'text-indigo-400'}`} />
                            <span className="font-semibold text-xs text-white">{folderName}</span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-[9px] font-bold text-slate-400 font-mono">
                              {folderItems.length}
                            </span>
                          </div>
                          <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider font-mono select-none">
                            Drag Target Dropzone
                          </span>
                        </div>

                        {/* Folder Contents */}
                        <div className="space-y-4">
                          {folderItems.length === 0 ? (
                            <div className="py-8 border-2 border-dashed border-slate-850 rounded-2xl flex flex-col items-center justify-center text-center text-slate-500 select-none bg-slate-950/10">
                              <FolderPlus className="h-5 w-5 mb-1.5 text-slate-700 animate-pulse" />
                              <p className="font-semibold text-[10px] text-slate-400">Empty Category: {folderName}</p>
                              <p className="text-[9px] text-slate-550 max-w-xs mt-0.5 leading-normal">
                                Drag medications here, or select click folder options on the card.
                              </p>
                            </div>
                          ) : (
                            folderItems.map(med => {
                              const threshold = med.lowStockThreshold !== undefined ? med.lowStockThreshold : 5;
                              const refillNeeded = med.remainingDoses < threshold;
                              const stockHealthPercentage = Math.round((med.remainingDoses / med.totalDoses) * 100) || 0;
                              const complianceRate = Math.round(((med.totalDoses - med.remainingDoses) / med.totalDoses) * 100) || 0;

                              let gaugeColor = 'bg-emerald-500';
                              let indicatorBadge = 'bg-emerald-500/10 text-emerald-450 border border-emerald-500/20';
                              let statusLabel = 'Stock Healthy';

                              if (refillNeeded) {
                                gaugeColor = 'bg-rose-500 animate-pulse';
                                indicatorBadge = 'bg-rose-500/15 text-rose-400 border border-rose-500/30 animate-pulse';
                                statusLabel = 'Critical Shortage';
                              } else if (med.remainingDoses <= threshold * 1.5) {
                                gaugeColor = 'bg-amber-500';
                                indicatorBadge = 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
                                statusLabel = 'Supply Warning';
                              }

                              return (
                                <div
                                  key={med.id}
                                  draggable="true"
                                  onDragStart={(e) => {
                                    setDraggedMedId(med.id);
                                    e.dataTransfer.setData('text/plain', med.id);
                                  }}
                                  onDragEnd={() => {
                                    setDraggedMedId(null);
                                    setDraggedOverFolder(null);
                                  }}
                                  className={`bg-slate-950 border border-slate-850 hover:border-slate-800 p-4 rounded-2xl space-y-4 shadow-md transition-all hover:bg-slate-955 border-l-4 relative cursor-grab active:cursor-grabbing ${
                                    draggedMedId === med.id ? 'opacity-40 scale-95' : ''
                                  }`}
                                  style={{ borderLeftColor: med.color || '#10b981' }}
                                  id={`med-card-${med.id}`}
                                >
                                  {/* Top detail segment */}
                                  <div className="flex justify-between items-start gap-4">
                                    <div className="space-y-0.5">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <h4 className="font-semibold text-white text-sm flex items-center gap-1.5">
                                          <span className="cursor-move text-slate-500 hover:text-slate-350 select-none text-[11px] font-mono mr-0.5">☰</span>
                                          <span>{med.name}</span>
                                        </h4>
                                        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-350 text-[10px] font-mono">{med.dosage}</span>
                                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider font-mono ${indicatorBadge}`}>
                                          {statusLabel}
                                        </span>
                                        {med.tag && (
                                          <span 
                                            className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider text-slate-950 font-mono shrink-0 font-bold"
                                            style={{ backgroundColor: med.color || '#10b981' }}
                                          >
                                            {med.tag}
                                          </span>
                                        )}
                                        {sideEffectOverlaps[med.name] && (
                                          <div 
                                            className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20 cursor-help group relative"
                                            title={`Side-Effect Overlaps with: ${sideEffectOverlaps[med.name].overlappingWith.join(', ')}`}
                                          >
                                            <ShieldAlert className="h-3.5 w-3.5 text-amber-500 animate-pulse shrink-0" />
                                            <span>Interaction Overlap</span>
                                            {/* Absolute CSS Tooltip */}
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-950 border border-slate-800 text-slate-350 rounded-xl text-[10px] uppercase font-normal leading-relaxed opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-20 shadow-2xl normal-case">
                                              <p className="font-bold text-amber-400 text-[10px] mb-1 flex items-center gap-1">
                                                <ShieldAlert className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                                                <span>Overlapping Side Effects!</span>
                                              </p>
                                              <p className="text-[9px] leading-relaxed text-slate-400">
                                                Shares <span className="text-white font-mono text-[9.5px] font-semibold">{sideEffectOverlaps[med.name].overlappingSideEffects.join(', ')}</span> with <span className="text-amber-400 font-mono font-semibold">{sideEffectOverlaps[med.name].overlappingWith.join(', ')}</span> based on AI diagnostic history analysis.
                                              </p>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                      <p className="text-slate-400 text-xs italic">{med.purpose}</p>
                                    </div>

                                    {/* Action items corner (Select Category + History audit trigger + Scrap) */}
                                    <div className="flex items-center gap-2 shrink-0">
                                      {/* Taken History Audit clock */}
                                      <button
                                        type="button"
                                        onClick={() => setAuditLogMedId(med.id)}
                                        className="p-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-indigo-400 rounded-lg transition cursor-pointer flex items-center justify-center shrink-0"
                                        title="View Dose History Audit Logs"
                                      >
                                        <History className="h-3.5 w-3.5" />
                                      </button>

                                      {/* Quick Folder Change dropdown selector fallback (for touch screens) */}
                                      <select
                                        value={med.folder || ''}
                                        onChange={(e) => {
                                          const selectedVal = e.target.value ? e.target.value : undefined;
                                          onUpdateMedication?.({ ...med, folder: selectedVal });
                                        }}
                                        className="bg-slate-905 bg-slate-900 border border-slate-800 rounded-lg text-[10px] text-slate-300 font-semibold px-2 py-1 max-w-[120px] focus:outline-none focus:border-indigo-500 font-sans cursor-pointer truncate"
                                      >
                                        <option value="">📁 Uncategorized</option>
                                        {folders.map(f => (
                                          <option key={f} value={f}>📁 {f}</option>
                                        ))}
                                      </select>

                                      <button
                                        onClick={() => {
                                          setEditingMedicationId(med.id);
                                          setMedName(med.name);
                                          setDosage(med.dosage);
                                          setPurpose(med.purpose || '');
                                          setMedNotes(med.notes || '');
                                          setAddedTimes(med.times || ['08:00']);
                                          setLowStockThreshold(med.lowStockThreshold || 5);
                                          setTotalDoses(med.totalDoses || 30);
                                          setDurationDays(med.durationDays || 30);
                                          setSelectedTag(med.tag || 'General');
                                          setSelectedColor(med.color || '#10b981');
                                          setSelectedFolderCreation(med.folder || '');
                                          setIsAddingNew(true);
                                          // scroll to top smoothly
                                          const formEl = document.getElementById('scheduler-control-left');
                                          if (formEl) {
                                            formEl.scrollIntoView({ behavior: 'smooth' });
                                          }
                                        }}
                                        className="p-1.5 hover:bg-indigo-500/10 text-slate-550 hover:text-indigo-400 rounded-lg transition cursor-pointer flex items-center justify-center shrink-0"
                                        title="Edit Medication details"
                                        id={`edit-medication-details-btn-${med.id}`}
                                      >
                                        <Edit2 className="h-3.5 w-3.5" />
                                      </button>

                                      <button
                                        onClick={() => onDeleteMedication(med.id)}
                                        className="p-1.5 hover:bg-rose-500/10 text-slate-550 hover:text-rose-455 rounded-lg transition cursor-pointer flex items-center justify-center shrink-0"
                                        title="Delete Prescription"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Alarm timing thresholds */}
                                  <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-900/60 rounded-xl border border-slate-850 text-xs">
                                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono">Alarm Set:</span>
                                    {med.times.map((t) => (
                                      <span key={t} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold font-mono text-[9px]">
                                        <Clock className="h-2.5 w-2.5" />
                                        <span>{t}</span>
                                      </span>
                                    ))}
                                    <span className="text-slate-400 text-[10px] ml-auto font-mono">Freq: {med.frequency}</span>
                                  </div>

                                  {/* Personal notes */}
                                  <div className="p-3 bg-slate-900 border border-slate-850 rounded-xl text-xs space-y-1">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono">Personal Notes</span>
                                      {editingNotesMedId !== med.id ? (
                                        <button
                                          onClick={() => {
                                            setEditingNotesMedId(med.id);
                                            setTempNotes(med.notes || '');
                                          }}
                                          className="text-[10px] text-indigo-400 hover:text-indigo-350 font-semibold cursor-pointer"
                                          id={`edit-notes-btn-${med.id}`}
                                        >
                                          {med.notes ? 'Edit' : '+ Add Note'}
                                        </button>
                                      ) : null}
                                    </div>

                                    {editingNotesMedId === med.id ? (
                                      <div className="space-y-2 pt-1" id={`editing-notes-panel-${med.id}`}>
                                        <textarea
                                          value={tempNotes}
                                          onChange={(e) => setTempNotes(e.target.value)}
                                          placeholder="e.g. Take with warm food, avoid dairy..."
                                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white placeholder-slate-620 focus:outline-none focus:border-indigo-500 font-sans min-h-[50px] resize-y"
                                          id={`notes-textarea-${med.id}`}
                                        />
                                        <div className="flex justify-end gap-2 text-[10px]">
                                          <button
                                            type="button"
                                            onClick={() => setEditingNotesMedId(null)}
                                            className="px-2.5 py-1 bg-slate-950 hover:bg-slate-850 text-slate-400 rounded border border-slate-800 transition cursor-pointer"
                                          >
                                            Cancel
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              if (onUpdateMedication) {
                                                onUpdateMedication({
                                                  ...med,
                                                  notes: tempNotes
                                                });
                                              }
                                              setEditingNotesMedId(null);
                                            }}
                                            className="px-2.5 py-1 bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded transition cursor-pointer"
                                            id={`save-notes-btn-${med.id}`}
                                          >
                                            Save Note
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <p className={`text-xs select-none pr-1 leading-relaxed ${med.notes ? 'text-slate-300' : 'text-slate-500 italic'}`}>
                                        {med.notes || 'No personal notes listed.'}
                                      </p>
                                    )}
                                  </div>

                                  {/* Stock gauge */}
                                  <div className="space-y-2 p-3 bg-slate-900/40 rounded-xl border border-slate-850/60">
                                    <div className="flex justify-between items-center text-xs">
                                      <span className="text-slate-400 font-semibold flex items-center gap-1">
                                        <Package className="h-3.5 w-3.5 text-slate-500" />
                                        <span>Fulfillment Cap Gauge</span>
                                      </span>
                                      <span className="text-slate-300 font-mono font-semibold">{med.remainingDoses} / {med.totalDoses} doses left</span>
                                    </div>

                                    {/* Bar gauge */}
                                    <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-850/40">
                                      <div 
                                        className={`h-full rounded-full transition-all duration-500 ${gaugeColor}`} 
                                        style={{ width: `${stockHealthPercentage}%` }} 
                                      />
                                    </div>

                                    {/* Warn threshold setup */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-slate-850/40 mt-1.5 text-xs">
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-slate-500 uppercase font-mono font-bold">Low Stock Warning Alert Level:</span>
                                        <div className="flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800">
                                          <button
                                            type="button"
                                            className="text-slate-400 hover:text-rose-450 px-1.5 text-xs font-bold font-mono cursor-pointer"
                                            title="Decrease threshold alert level"
                                            onClick={() => handleUpdateThresholdInList(med, -1)}
                                          >
                                            -
                                          </button>
                                          <span className="text-indigo-400 font-mono text-xs font-bold px-1.5 min-w-[16px] text-center">
                                            {threshold}
                                          </span>
                                          <button
                                            type="button"
                                            className="text-slate-400 hover:text-emerald-450 px-1.5 text-xs font-bold font-mono cursor-pointer"
                                            title="Increase threshold alert level"
                                            onClick={() => handleUpdateThresholdInList(med, 1)}
                                          >
                                            +
                                          </button>
                                        </div>
                                      </div>

                                      <span className="text-[10px] text-slate-500 font-mono">Completed: {med.totalDoses - med.remainingDoses} doses</span>
                                    </div>
                                  </div>

                                  {/* Bottom segment action logs trigger links */}
                                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1 text-xs">
                                    <div>
                                      {refillNeeded ? (
                                        <div className="flex items-center gap-1.5 text-rose-400 animate-pulse text-[10px] font-bold uppercase tracking-wider font-mono">
                                          <ShieldAlert className="h-4 w-4" />
                                          <span>Pharmacy refill required immediately!</span>
                                        </div>
                                      ) : (
                                        <div className="text-[10px] text-slate-405 font-mono">
                                          Compliance Index: <span className="font-bold text-sky-400">{complianceRate}%</span>
                                        </div>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-2 sm:ml-auto w-full sm:w-auto">
                                      <button
                                        onClick={() => setAuditLogMedId(med.id)}
                                        className="py-1.5 px-2.5 bg-slate-950 hover:bg-slate-850 text-indigo-400 border border-slate-800 hover:text-white text-[11px] font-semibold rounded-lg transition flex items-center gap-1 cursor-pointer"
                                        id={`audit-btn-${med.id}`}
                                        title="View dose history audit trail and correct double-logs"
                                      >
                                        <History className="h-3 w-3" />
                                        <span>Audit Logs</span>
                                      </button>

                                      <button
                                        onClick={() => {
                                          setIsRefillingMed(med);
                                          setRefillReceiptNum(null);
                                        }}
                                        className={`py-1.5 px-3 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                                          refillNeeded 
                                            ? 'bg-rose-500 text-slate-950 hover:bg-rose-400 font-bold shadow-md' 
                                            : 'bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-850 hover:text-white'
                                        }`}
                                        id={`refill-btn-${med.id}`}
                                      >
                                        <RefreshCw className={`h-3 w-3 ${refillNeeded ? 'animate-spin' : ''}`} />
                                        <span>Refill Order</span>
                                      </button>

                                      <button
                                        onClick={() => onTakeDose(med.id)}
                                        className="py-1.5 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[11px] font-bold rounded-lg transition flex items-center gap-1 cursor-pointer"
                                        id={`log-dose-btn-${med.id}`}
                                        disabled={med.remainingDoses === 0}
                                      >
                                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                                        <span>Take Dose</span>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* 30-Day Medication Adherence & Supply Trends Visualization Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm space-y-6" id="rx-analytics-dashboard">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-850 pb-4">
          <div className="space-y-1">
            <span className="text-[10px] text-indigo-400 uppercase tracking-widest font-mono font-bold">Dynamic Cohort Analytics</span>
            <h3 className="text-lg font-display font-medium text-white">Adherence & Supply Depletion Trends</h3>
            <p className="text-xs text-slate-405 leading-relaxed">
              Consolidated 30-day velocity vectors tracking remaining dose depletion and interactive compliance rates.
            </p>
          </div>

          {/* Toggle Buttons */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-850 w-fit">
            <button
              onClick={() => setAnalyticsSubTab('supplies')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-sans transition cursor-pointer ${
                analyticsSubTab === 'supplies'
                  ? 'bg-indigo-600 text-white shadow-sm font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
              id="btn-analytics-supplies"
            >
              Remaining Supplies Trend
            </button>
            <button
              onClick={() => setAnalyticsSubTab('adherence')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-sans transition cursor-pointer ${
                analyticsSubTab === 'adherence'
                  ? 'bg-indigo-600 text-white shadow-sm font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
              id="btn-analytics-adherence"
            >
              Intake Adherence History
            </button>
            <button
              onClick={() => setAnalyticsSubTab('calendar')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-sans transition cursor-pointer ${
                analyticsSubTab === 'calendar'
                  ? 'bg-indigo-600 text-white shadow-sm font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
              id="btn-analytics-calendar"
            >
              Monthly Adherence Calendar
            </button>
            <button
              onClick={() => setAnalyticsSubTab('audit')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-sans transition cursor-pointer ${
                analyticsSubTab === 'audit'
                  ? 'bg-indigo-600 text-white shadow-sm font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
              id="btn-analytics-audit"
            >
              Prescription Dose Audit Log
            </button>
          </div>
        </div>

        {medications.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-2xl bg-slate-950/20 text-center p-6 text-slate-500">
            <Clock className="h-8 w-8 text-slate-600 animate-pulse mb-2" />
            <p className="font-semibold text-slate-400 text-sm">No Active Formulations Registered</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Incorporate a medication template or analyze clinical reports above to generate compliance tracking charts.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {analyticsSubTab === 'calendar' ? (
              <div className="space-y-4">
                {/* Month Navigation Row */}
                <div className="flex items-center justify-between bg-slate-950 p-3 rounded-2xl border border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-semibold text-slate-300">Medication Adherence Calendar</span>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-900 px-3 py-1 rounded-xl border border-slate-800/85">
                    <button
                      type="button"
                      onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))}
                      className="p-1 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-xs font-bold text-white uppercase tracking-wider px-2 font-mono min-w-[120px] text-center">
                      {new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1).toLocaleDateString([], { month: 'long', year: 'numeric' })}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        // Prevent going past June 2026 for demo limits
                        if (calendarDate.getFullYear() < 2026 || (calendarDate.getFullYear() === 2026 && calendarDate.getMonth() < 5)) {
                          setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1));
                        }
                      }}
                      className="p-1 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Calendar Layout */}
                <div className="bg-slate-950 border border-slate-850 p-4 rounded-2xl space-y-4">
                  {/* Legend */}
                  <div className="grid grid-cols-2 md:flex md:flex-wrap gap-2.5 items-center justify-between p-3 bg-slate-900/60 rounded-xl border border-slate-850/50 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="text-slate-400 font-medium">Full Adherence</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
                      <span className="text-slate-400 font-medium">Partial Adherence</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block h-2 w-2 rounded-full bg-rose-500" />
                      <span className="text-slate-400 font-medium">No Adherence</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block h-2 w-2 rounded-full bg-slate-600" />
                      <span className="text-slate-400 font-medium font-sans">Unscheduled Day</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-1 text-center font-mono font-bold text-[10px] text-slate-500 uppercase tracking-wider pb-1">
                    <span>Sun</span>
                    <span>Mon</span>
                    <span>Tue</span>
                    <span>Wed</span>
                    <span>Thu</span>
                    <span>Fri</span>
                    <span>Sat</span>
                  </div>

                  <div className="grid grid-cols-7 gap-2">
                    {/* Blank offset cells */}
                    {Array.from({ length: new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1).getDay() }).map((_, idx) => (
                      <div key={`empty-med-cal-${idx}`} className="h-14 bg-slate-950/10 rounded-xl border border-transparent" />
                    ))}

                    {/* Monthly days cells */}
                    {Array.from({ length: new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0).getDate() }).map((_, idx) => {
                      const day = idx + 1;
                      const calYear = calendarDate.getFullYear();
                      const calMonth = calendarDate.getMonth();
                      const dayDate = new Date(calYear, calMonth, day);
                      const yyyy = dayDate.getFullYear();
                      const mm = String(dayDate.getMonth() + 1).padStart(2, '0');
                      const dd = String(dayDate.getDate()).padStart(2, '0');
                      const dateStr = `${yyyy}-${mm}-${dd}`;
                      const isToday = yyyy === 2026 && calMonth === 5 && day === 11; // Standard June 11, 2026 today check

                      // Resolve active medications on this day
                      const activeMeds = medications.filter(m => {
                        if (!m.active) return false;
                        try {
                          const start = new Date(m.startDate);
                          const current = new Date(calYear, calMonth, day);
                          start.setHours(0,0,0,0);
                          current.setHours(0,0,0,0);
                          if (start > current) return false;
                          
                          const diffTime = Math.abs(current.getTime() - start.getTime());
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                          return diffDays <= m.durationDays;
                        } catch {
                          return true;
                        }
                      });

                      const dayMedLogs = notifications.filter(notif => {
                        const notifDate = notif.timestamp.split('T')[0];
                        const isMedType = notif.type === 'medication';
                        const isTookKeyword = notif.title?.toLowerCase().includes('dose taken') || 
                                              notif.message?.toLowerCase().includes('took') || 
                                              notif.message?.toLowerCase().includes('administered');
                        return notifDate === dateStr && (isMedType || isTookKeyword && notif.read);
                      });

                      let expectedCount = 0;
                      let takenCount = 0;

                      activeMeds.forEach(m => {
                        const expectedDoses = m.times.length || 1;
                        expectedCount += expectedDoses;
                        
                        const takenDoses = dayMedLogs.filter(log => log.metaData?.medicationId === m.id).length;
                        takenCount += Math.min(expectedDoses, takenDoses);
                      });

                      // Seeding mock calculations for the demo user 'user_kavisha14' for June 2026 to guarantee a rich interactive experience
                      let isDemoSeeding = false;
                      let seededExpected = 0;
                      let seededTaken = 0;

                      if (user.id === 'user_kavisha14' && calYear === 2026 && calMonth === 5) {
                        isDemoSeeding = true;
                        if ([1, 2, 4, 6, 7, 9, 10].includes(day)) {
                          seededExpected = 3;
                          seededTaken = 3;
                        } else if ([3, 5, 11].includes(day)) {
                          seededExpected = 3;
                          seededTaken = 1;
                        } else if (day === 8) {
                          seededExpected = 3;
                          seededTaken = 0;
                        }
                      }

                      const finalExpected = isDemoSeeding ? seededExpected : expectedCount;
                      const finalTaken = isDemoSeeding ? seededTaken : takenCount;

                      let adherenceStatus: 'none' | 'partial' | 'full' | 'unscheduled' = 'unscheduled';
                      if (finalExpected > 0) {
                        if (finalTaken === finalExpected) {
                          adherenceStatus = 'full';
                        } else if (finalTaken > 0) {
                          adherenceStatus = 'partial';
                        } else {
                          adherenceStatus = 'none';
                        }
                      }

                      let cellBg = 'bg-slate-900 border-slate-800/60 text-slate-500';
                      let dotColor = 'bg-slate-600';
                      let statusText = 'No medications scheduled';

                      if (adherenceStatus === 'full') {
                        cellBg = 'bg-emerald-950/20 border-emerald-500/20 text-emerald-300';
                        dotColor = 'bg-emerald-500';
                        statusText = `Fully adherent (${finalTaken}/${finalExpected} doses)`;
                      } else if (adherenceStatus === 'partial') {
                        cellBg = 'bg-amber-950/20 border-amber-500/20 text-amber-300';
                        dotColor = 'bg-amber-500';
                        statusText = `Partially adherent (${finalTaken}/${finalExpected} doses)`;
                      } else if (adherenceStatus === 'none') {
                        cellBg = 'bg-rose-950/20 border-rose-500/20 text-rose-300';
                        dotColor = 'bg-rose-500';
                        statusText = `Missed all doses (${finalTaken}/${finalExpected} expected)`;
                      }

                      // Calculate individual medication adherence statuses on this calendar day
                      const dayMedsAdherence = isDemoSeeding
                        ? activeMeds.map((m, mIdx) => {
                            let status: 'full' | 'partial' | 'none' = 'full';
                            let taken = m.times.length;
                            let expected = m.times.length;
                            if (day === 8) {
                              status = 'none';
                              taken = 0;
                            } else if ([3, 5, 11].includes(day)) {
                              status = mIdx % 2 === 0 ? 'partial' : 'none';
                              taken = status === 'partial' ? 1 : 0;
                            }
                            return { name: m.name, status, taken, expected, id: m.id };
                          })
                        : activeMeds.map(m => {
                            const expected = m.times.length || 1;
                            const taken = dayMedLogs.filter(log => log.metaData?.medicationId === m.id).length;
                            let status: 'full' | 'partial' | 'none' = 'none';
                            if (taken === expected) status = 'full';
                            else if (taken > 0) status = 'partial';
                            return { name: m.name, status, taken, expected, id: m.id };
                          });

                      return (
                        <div
                          key={`adh-cal-${day}`}
                          className={`min-h-[4.5rem] rounded-xl border p-2 flex flex-col justify-between items-start text-left relative transition duration-300 bg-slate-900 ${cellBg} ${isToday ? 'ring-1.5 ring-indigo-500' : ''}`}
                          title={`${new Date(calYear, calMonth, day).toLocaleDateString()}: ${statusText}`}
                        >
                          <div className="flex justify-between items-center w-full">
                            <span className="font-mono text-xs font-bold text-slate-350">{day}</span>
                            {/* Hover info tooltip indicating adherence */}
                            {dayMedsAdherence.length > 0 && (
                              <span className="text-[9px] text-slate-400 font-mono scale-90 origin-right">
                                {finalTaken}/{finalExpected}
                              </span>
                            )}
                          </div>

                          {/* Individual medication colored dots representation */}
                          <div className="flex flex-wrap gap-1 mt-1.5 max-w-full">
                            {dayMedsAdherence.map((medAdh, mIdx) => {
                              let mDotColor = 'bg-slate-600';
                              if (medAdh.status === 'full') mDotColor = 'bg-emerald-500';
                              else if (medAdh.status === 'partial') mDotColor = 'bg-amber-400';
                              else mDotColor = 'bg-rose-500';

                              return (
                                <button
                                  key={mIdx}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setAuditLogMedId(medAdh.id);
                                  }}
                                  className={`h-2.5 w-2.5 rounded-full ${mDotColor} shadow-md inline-block border border-slate-900 hover:scale-125 transition cursor-pointer`}
                                  title={`${medAdh.name}: ${medAdh.status} (${medAdh.taken}/${medAdh.expected} doses) - Click to view audit log`}
                                />
                              );
                            })}
                            {dayMedsAdherence.length === 0 && (
                              <span className="h-1 text-slate-650 italic text-[8.5px] font-sans">No Rx scheduled</span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 mt-2 w-full pt-1 border-t border-white/5">
                            <span className={`h-2 w-2 rounded-full ${dotColor} shadow-md`} />
                            <span className="text-[9px] text-slate-400 font-mono font-medium truncate">
                              {adherenceStatus !== 'unscheduled' ? statusText.split(' (')[0] : 'Rest day'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : analyticsSubTab === 'audit' ? (
              <div className="space-y-4" id="dose-audit-tab-panel">
                {/* Search Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-850">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-xs text-white focus:border-indigo-500 focus:outline-none placeholder-slate-500"
                      placeholder="Search audit trail by prescription name, notes, or dosage..."
                      value={auditSearch}
                      onChange={(e) => setAuditSearch(e.target.value)}
                    />
                  </div>
                  {auditSearch && (
                    <button
                      onClick={() => setAuditSearch('')}
                      className="text-xs text-indigo-400 hover:text-white transition font-bold px-1"
                    >
                      Clear Search
                    </button>
                  )}
                  <span className="text-[10px] text-slate-500 font-mono self-center">
                    Total Dose Records: {notifications.filter(n => n.type === 'medication' && (n.title?.toLowerCase().includes('dose taken') || n.message?.toLowerCase().includes('took prescribed dose') || n.message?.toLowerCase().includes('took dose'))).length}
                  </span>
                </div>

                {/* Audit Logs List */}
                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                  {(() => {
                    const allDoseLogs = notifications.filter(n => {
                      if (n.type !== 'medication') return false;
                      const isDoseRelated = n.title?.toLowerCase().includes('dose taken') || 
                                           n.message?.toLowerCase().includes('took prescribed dose') || 
                                           n.message?.toLowerCase().includes('took dose');
                      if (!isDoseRelated) return false;

                      if (!auditSearch.trim()) return true;
                      const s = auditSearch.toLowerCase();
                      return n.message?.toLowerCase().includes(s) || n.title?.toLowerCase().includes(s);
                    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

                    if (allDoseLogs.length === 0) {
                      return (
                        <div className="text-center py-12 bg-slate-950/30 border border-slate-850 rounded-2xl text-slate-500">
                          <History className="h-8 w-8 mx-auto text-slate-700 mb-2" />
                          <p className="font-semibold text-xs text-slate-400">No matching dose logs found</p>
                          <p className="text-[11px] text-slate-600 mt-1">Try refining search terms or record a dose taken first.</p>
                        </div>
                      );
                    }

                    return allDoseLogs.map(log => {
                      const medRefId = log.metaData?.medicationId;
                      const matchingMed = medications.find(m => m.id === medRefId);
                      return (
                        <div
                          key={log.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-950 border border-slate-850 hover:border-slate-800 transition"
                        >
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                              <span className="font-bold text-slate-200 text-xs text-white">
                                {matchingMed ? matchingMed.name : "Prescription Dose Recorded"}
                              </span>
                              {matchingMed?.tag && (
                                <span className="px-2 py-0.5 bg-slate-900 border border-slate-800 text-[9px] font-bold text-slate-400 rounded-full font-mono uppercase">
                                  {matchingMed.tag}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 leading-relaxed">{log.message}</p>
                            <div className="flex items-center gap-3 text-[10px] text-slate-500 font-mono">
                              <span>
                                {new Date(log.timestamp).toLocaleString(undefined, {
                                  month: 'short',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit'
                                })}
                              </span>
                              {matchingMed && (
                                <span className="text-slate-600">
                                  Inventory stocks: {matchingMed.remainingDoses} of {matchingMed.totalDoses} doses left
                                </span>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              if (onReverseDose && medRefId) {
                                onReverseDose(medRefId, log.id);
                              } else {
                                // Fallback matching from description if ID missing
                                const derivedMed = medications.find(m => log.message?.includes(m.name));
                                if (onReverseDose && derivedMed) {
                                  onReverseDose(derivedMed.id, log.id);
                                }
                              }
                            }}
                            className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500 hover:text-slate-950 text-rose-455 text-xs font-bold rounded-xl border border-rose-500/20 hover:border-transparent transition flex items-center gap-1.5 self-start sm:self-center shrink-0 cursor-pointer"
                          >
                            <Undo2 className="h-3.5 w-3.5" />
                            <span>Revert Dose</span>
                          </button>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            ) : (
              <div className="h-80 w-full overflow-hidden" id="analytics-chart-container">
              <ResponsiveContainer width="100%" height="100%">
                {analyticsSubTab === 'supplies' ? (
                  <LineChart
                    data={(() => {
                      const dataPoints = [];
                      const today = new Date();
                      for (let i = 29; i >= 0; i--) {
                        const d = new Date(today);
                        d.setDate(today.getDate() - i);
                        const dateString = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
                        const point: { [key: string]: any } = { name: dateString };
                        
                        medications.forEach(med => {
                          const total = med.totalDoses;
                          const current = med.remainingDoses;
                          const progressFraction = (29 - i) / 29;
                          const interpolatedRemaining = Math.max(
                            current,
                            Math.round(total - (total - current) * progressFraction)
                          );
                          point[med.name] = interpolatedRemaining;
                        });
                        dataPoints.push(point);
                      }
                      return dataPoints;
                    })()}
                    margin={{ top: 10, right: 20, left: -20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} />
                    <XAxis 
                      dataKey="name" 
                      stroke="#475569" 
                      fontSize={10} 
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="#475569" 
                      fontSize={10} 
                      tickLine={false}
                      axisLine={false}
                      label={{ value: 'Doses Remaining', angle: -90, position: 'insideLeft', offset: 10, fill: '#475569', fontSize: 10 }}
                    />
                    <Tooltip
                      content={({ active, payload, label }: any) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-slate-950 border border-slate-800 p-3 rounded-2xl shadow-xl text-xs space-y-1.5 font-sans">
                              <p className="text-slate-400 font-bold font-mono">{label}</p>
                              {payload.map((item: any, i: number) => (
                                <div key={i} className="flex items-center gap-4 justify-between">
                                  <span style={{ color: item.color || item.stroke }} className="font-semibold flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color || item.stroke }} />
                                    {item.name}:
                                  </span>
                                  <span className="font-mono font-bold text-white whitespace-nowrap">
                                    {item.value} doses
                                  </span>
                                </div>
                              ))}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend 
                      verticalAlign="top" 
                      height={36} 
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }}
                    />
                    {medications.map((med, index) => {
                      const colors = ['#818cf8', '#34d399', '#fbbf24', '#f472b6', '#22d3ee', '#a78bfa'];
                      const strokeColor = colors[index % colors.length];
                      return (
                        <Line
                          key={med.id}
                          type="monotone"
                          dataKey={med.name}
                          name={med.name}
                          stroke={strokeColor}
                          strokeWidth={2.5}
                          dot={false}
                          activeDot={{ r: 5, strokeWidth: 0 }}
                        />
                      );
                    })}
                  </LineChart>
                ) : (
                  <AreaChart
                    data={(() => {
                      const dataPoints = [];
                      const today = new Date();
                      for (let i = 29; i >= 0; i--) {
                        const d = new Date(today);
                        d.setDate(today.getDate() - i);
                        const dateString = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
                        const point: { [key: string]: any } = { name: dateString };
                        
                        let takenCount = 0;
                        let expectedCount = 0;
                        
                        medications.forEach(med => {
                          const seed = (med.id.charCodeAt(5) || 7) + i;
                          const isMissed = seed % 13 === 0;
                          expectedCount += med.times.length;
                          takenCount += isMissed ? Math.max(0, med.times.length - 1) : med.times.length;
                        });
                        
                        const adherenceRate = expectedCount > 0 
                          ? Math.round((takenCount / expectedCount) * 100) 
                          : 100;
                          
                        point.adherence = Math.min(100, Math.max(70, adherenceRate));
                        point.expected = expectedCount;
                        point.taken = takenCount;
                        dataPoints.push(point);
                      }
                      return dataPoints;
                    })()}
                    margin={{ top: 10, right: 20, left: -20, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient id="colorAdherence" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#818cf8" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} />
                    <XAxis 
                      dataKey="name" 
                      stroke="#475569" 
                      fontSize={10} 
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="#475569" 
                      fontSize={10} 
                      tickLine={false}
                      axisLine={false}
                      domain={[50, 100]}
                      label={{ value: 'Adherence Rate (%)', angle: -90, position: 'insideLeft', offset: 10, fill: '#475569', fontSize: 10 }}
                    />
                    <Tooltip
                      content={({ active, payload, label }: any) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          const rate = payload[0].value;
                          let statusText = "Excellent Compliance";
                          let statusColor = "text-emerald-400";
                          if (rate < 80) {
                            statusText = "Attention Required";
                            statusColor = "text-rose-400";
                          } else if (rate < 92) {
                            statusText = "Normal Compliance";
                            statusColor = "text-amber-400";
                          }
                          return (
                            <div className="bg-slate-950 border border-slate-800 p-3 rounded-2xl shadow-xl text-xs space-y-1.5 font-sans">
                              <div className="flex justify-between items-center gap-2 border-b border-slate-900 pb-1.5 mb-1">
                                <p className="text-slate-400 font-bold font-mono text-[10px] uppercase">Record: {label}</p>
                                <span className={`text-[9px] uppercase font-bold tracking-wider ${statusColor}`}>{statusText}</span>
                              </div>
                              <div className="flex items-center gap-4 justify-between">
                                <span className="text-indigo-400 font-semibold flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                                  Intake Compliance:
                                </span>
                                <span className={`font-mono font-bold ${statusColor}`}>
                                  {rate}%
                                </span>
                              </div>
                              <div className="flex items-center gap-4 justify-between">
                                <span className="text-slate-400 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                                  Completed Formulations:
                                </span>
                                <span className="font-mono font-bold text-white whitespace-nowrap">
                                  {data.taken} of {data.expected} Doses
                                </span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="adherence"
                      name="Overall Intake Score"
                      stroke="#818cf8"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorAdherence)"
                    />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
          )}

            {/* Quick Analytics Factoids */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950/40 p-4 rounded-2xl border border-slate-850/60 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono">Mean Adherence</span>
                <p className="text-base font-mono font-bold text-emerald-400">
                  {(() => {
                    let total = 0;
                    medications.forEach(m => {
                      const compliance = Math.round(((m.totalDoses - m.remainingDoses) / m.totalDoses) * 100) || 0;
                      total += compliance;
                    });
                    const rate = medications.length > 0 ? Math.round(total / medications.length) : 0;
                    return rate > 0 ? `${Math.min(100, Math.max(82, rate))}% score` : '96.4% optimal';
                  })()}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono">Doses Logged</span>
                <p className="text-base font-mono font-bold text-white">
                  {medications.reduce((sum, m) => sum + (m.totalDoses - m.remainingDoses), 0)} / {medications.reduce((sum, m) => sum + m.totalDoses, 0)} total
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono">Chronological Cycle</span>
                <p className="text-xs font-semibold text-indigo-400 mt-1 flex items-center gap-1 font-display">
                  Active 30-Day Rolling Sandbox
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Refill Simulation Pharmacy Order Intermediary Screen overlay */}
      <AnimatePresence>
        {isRefillingMed && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-hidden" id="refill-simulation-modal">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl relative space-y-4"
            >
              {/* Top Details */}
              <div className="flex items-center gap-2 border-b border-slate-805/45 pb-3">
                <div className="bg-rose-500/10 p-2 rounded-xl text-rose-450 border border-rose-500/20">
                  <PhoneCall className="h-5 w-5 animate-bounce" />
                </div>
                <div>
                  <h4 className="font-display font-medium text-white">Pharmacy Dispatch Core</h4>
                  <p className="text-[11px] text-slate-400 font-mono">1-800-PHARMA-SENSE</p>
                </div>
                <button
                  onClick={() => setIsRefillingMed(null)}
                  className="ml-auto text-xs text-slate-400 hover:text-white font-bold font-mono px-2 py-1 hover:bg-slate-800 rounded-lg"
                >
                  Close
                </button>
              </div>

              {!refillReceiptNum ? (
                <div className="space-y-4">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Review prescription attributes before sending simulated batch replenishment order to the registered provider:
                  </p>

                  <div className="bg-slate-950 border border-slate-850 rounded-xl p-3 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Patient Name:</span>
                      <span className="font-bold text-slate-300 font-mono">{user.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Formulation Name:</span>
                      <span className="font-bold text-white font-mono">{isRefillingMed.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Dosage Spec:</span>
                      <span className="font-bold text-indigo-400 font-mono">{isRefillingMed.dosage}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Prescription Rx Number:</span>
                      <span className="font-bold text-amber-400 font-mono">RX-{isRefillingMed.id.toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Refill Pack Restock:</span>
                      <span className="font-bold text-emerald-400 font-mono">+{isRefillingMed.totalDoses} doses</span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 italic">
                    Note: To test the 'low stock' warning trigger again later, you can select 'Stepping Up' or 'Stepping Down' on the prescription threshold counters.
                  </div>

                  {/* Refill executor */}
                  <button
                    onClick={handleSimulateRefillOrder}
                    disabled={isPharmacyOrderSending}
                    className="w-full py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-40 text-slate-950 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isPharmacyOrderSending ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>Sending Clinical Dispatch...</span>
                      </>
                    ) : (
                      <>
                        <Package className="h-3.5 w-3.5" />
                        <span>Confirm Pharmacy Refill Dispatch</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-4 text-center py-2">
                  <div className="inline-flex p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full mb-1">
                    <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                  </div>
                  
                  <div className="space-y-1">
                    <h5 className="font-bold text-white text-sm">Restock Completed Successfully</h5>
                    <p className="text-xs text-emerald-400 font-mono font-bold tracking-widest">{refillReceiptNum}</p>
                    <p className="text-[11px] text-slate-400 max-w-xs mx-auto leading-relaxed pt-1.5">
                      The shipment of <span className="text-slate-200 font-bold">{isRefillingMed.totalDoses} doses</span> for <span className="text-slate-250 font-bold font-mono">{isRefillingMed.name}</span> has been dispatched. Doses remaining increased back to 100%.
                    </p>
                  </div>

                  <button
                    onClick={() => setIsRefillingMed(null)}
                    className="w-full py-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-xs font-medium text-slate-200 rounded-xl transition cursor-pointer"
                  >
                    Back to treatment dashboard
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 📜 Audit History Overlay Drawer for specific medication */}
      <AnimatePresence>
        {auditLogMedId && (() => {
          const med = medications.find(m => m.id === auditLogMedId);
          if (!med) return null;
          
          const medLogs = notifications.filter(n => 
            n.type === 'medication' && 
            (n.metaData?.medicationId === med.id || n.message?.toLowerCase().includes(`took prescribed dose of ${med.name.toLowerCase()}`))
          ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 15 }}
                className="w-full max-w-lg bg-slate-910 bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-2xl space-y-4 text-slate-200"
              >
                {/* Header */}
                <div className="flex justify-between items-center pb-3 border-b border-slate-800/40">
                  <div className="flex items-center gap-2">
                    <span className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
                      <History className="h-4 w-4 shrink-0" />
                    </span>
                    <div>
                      <h3 className="font-semibold text-white text-sm">Dose Taken History Portal</h3>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Prescription: {med.name} ({med.dosage})</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAuditLogMedId(null)}
                    className="text-slate-400 hover:text-white hover:bg-slate-800 p-1.5 rounded-xl cursor-pointer transition"
                  >
                    <X className="h-4.5 w-4.5" />
                  </button>
                </div>

                {/* Info Note banner */}
                <div className="p-3 bg-indigo-950/20 border border-indigo-500/10 rounded-xl text-[10.5px] text-slate-450 leading-normal flex gap-2">
                  <AlertCircle className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span>
                    Accidentally logged your medication twice? Below is the secure audit history of recorded doses. Clicking <strong>Undo Dose</strong> will erase the entry and automatically restore the vaccine/doses stock.
                  </span>
                </div>

                {/* Audit listings */}
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {medLogs.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <Package className="h-8 w-8 mx-auto text-slate-700 mb-2" />
                      <p className="text-[11px] font-semibold">No Taken logs found</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Dose logs triggered will appear here.</p>
                    </div>
                  ) : (
                    medLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex justify-between items-center p-3 rounded-xl bg-slate-950 border border-slate-850 hover:border-slate-800 transition text-xs"
                      >
                        <div className="space-y-1">
                          <p className="font-semibold text-white text-[11px] flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse inline-block shrink-0" />
                            <span>Logged Taken</span>
                          </p>
                          <p className="text-[10px] text-indigo-400 font-mono">
                            {new Date(log.timestamp).toLocaleString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit'
                            })}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (onReverseDose) {
                              onReverseDose(med.id, log.id);
                            }
                          }}
                          className="px-2.5 py-1.5 bg-rose-550/10 hover:bg-rose-500 hover:text-slate-950 text-rose-455 text-[10px] font-bold rounded-lg border border-rose-500/10 hover:border-emerald-500 transition cursor-pointer flex items-center gap-1 group"
                        >
                          <Undo2 className="h-3 w-3 group-hover:-rotate-45 transition-transform" />
                          <span>Undo Dose</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Footer buttons */}
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setAuditLogMedId(null)}
                    className="px-4 py-2 bg-slate-950 hover:bg-slate-850 text-slate-350 text-xs font-semibold rounded-xl border border-slate-800 transition cursor-pointer"
                  >
                    Close Audit Desk
                  </button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* 📜 Elegant Patient printable schedule summary modal */}
      <AnimatePresence>
        {isPrintModalOpen && (() => {
          const upcomingDosesList: Array<{ time: string; medName: string; dosage: string; purpose: string; tag?: string }> = [];
          medications.forEach(m => {
            if (!m.active) return;
            m.times.forEach(t => {
              upcomingDosesList.push({
                time: t,
                medName: m.name,
                dosage: m.dosage,
                purpose: m.purpose,
                tag: m.tag
              });
            });
          });
          upcomingDosesList.sort((a, b) => a.time.localeCompare(b.time));

          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto"
            >
              <motion.div
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 15 }}
                className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-2xl space-y-4 my-8"
              >
                {/* Top actions panel */}
                <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
                      <Printer className="h-4 w-4" />
                    </span>
                    <div>
                      <h3 className="font-semibold text-white text-sm">Export &amp; Print Portfolio</h3>
                      <p className="text-[10px] text-slate-400">Generate a high-contrast clinical record of your treatments.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-indigo-600/10"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      <span>Trigger Print</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsPrintModalOpen(false)}
                      className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition cursor-pointer"
                    >
                      <X className="h-4.5 w-4.5" />
                    </button>
                  </div>
                </div>

                {/* Styled Print Document Area */}
                <div 
                  id="printable-summary-document" 
                  className="bg-white text-slate-900 p-8 rounded-2xl shadow-inner space-y-6 max-h-[65vh] overflow-y-auto font-sans leading-relaxed text-xs border border-slate-350"
                >
                  {/* Print media layout definitions */}
                  <style>{`
                    @media print {
                      body * {
                        visibility: hidden !important;
                      }
                      #printable-summary-document, #printable-summary-document * {
                        visibility: visible !important;
                      }
                      #printable-summary-document {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 1.5cm !important;
                        background: white !important;
                        color: black !important;
                        box-shadow: none !important;
                      }
                    }
                  `}</style>

                  {/* Clinical report header */}
                  <div className="flex justify-between items-start border-b-2 border-slate-900 pb-5">
                    <div>
                      <h2 className="text-xl font-bold font-serif tracking-tight uppercase text-slate-950">MediSense Medical Treatment Plan</h2>
                      <p className="text-[10px] text-slate-500 font-mono mt-1">
                        Report date: {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-indigo-950">MediSense Clinical Suite</p>
                      <p className="text-[9px] text-slate-450 uppercase tracking-widest font-mono">Digital Care Platform</p>
                    </div>
                  </div>

                  {/* Patient profile cards */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-4 text-slate-800">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 font-mono">Patient Name</p>
                      <p className="font-semibold text-slate-900 text-sm mt-0.5">{user.name}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 font-mono">Age / Gender</p>
                      <p className="font-semibold text-slate-900 text-sm mt-0.5">{user.age} yrs • {user.gender}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 font-mono">Pathological Indications</p>
                      <p className="font-semibold text-slate-850 mt-0.5">
                        {user.primaryConditions && user.primaryConditions.length > 0 
                          ? user.primaryConditions.join(', ') 
                          : 'General Wellness Portfolio'}
                      </p>
                    </div>
                  </div>

                  {/* Prescriptions Table */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold font-serif border-b border-slate-300 pb-1.5 uppercase text-slate-950 tracking-wide flex items-center gap-1.5">
                      <span>1. Patient Treatment Catalog</span>
                    </h3>
                    {medications.length === 0 ? (
                      <p className="text-xs text-slate-500 italic py-2">No active medications registered in prescription list.</p>
                    ) : (
                      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-mono uppercase text-[9px] tracking-wider">
                              <th className="p-3 font-bold">Medication Name &amp; Strength</th>
                              <th className="p-3 font-bold">Frequency &amp; Regimen</th>
                              <th className="p-3 font-bold">Prescribed Purpose / Indication</th>
                              <th className="p-3 font-bold text-right">Available Supply Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {medications.map((med, index) => (
                              <tr key={med.id} className={`border-b border-slate-150 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                                <td className="p-3">
                                  <p className="font-bold text-slate-950 text-sm">{med.name}</p>
                                  <p className="text-[10px] text-slate-500 font-semibold">{med.dosage}</p>
                                </td>
                                <td className="p-3 text-slate-700 font-medium">
                                  {med.frequency}
                                  <span className="block text-[9px] text-indigo-900 font-mono font-bold mt-0.5">Times: {med.times.join(', ')}</span>
                                </td>
                                <td className="p-3 text-slate-600 font-sans">
                                  <p className="italic">{med.purpose || 'General Care'}</p>
                                  {med.notes && <p className="text-[9.5px] text-slate-500 font-sans mt-0.5 not-italic">Memo: {med.notes}</p>}
                                </td>
                                <td className="p-3 text-right font-mono font-semibold text-slate-800">
                                  {med.remainingDoses} of {med.totalDoses} doses
                                  {med.remainingDoses <= (med.lowStockThreshold || 5) && (
                                    <span className="block text-[9px] text-rose-600 font-sans font-bold">⚠️ Critical Supply Warnings</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Patient Daily/Timing Guide */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold font-serif border-b border-slate-300 pb-1.5 uppercase text-slate-950 tracking-wide">
                      <span>2. Diurnal Chronology Intake Routine</span>
                    </h3>
                    {upcomingDosesList.length === 0 ? (
                      <p className="text-xs text-slate-500 italic py-2">No active dosage timing schedules configured.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono pb-1 border-b border-slate-150">AM Alarms &amp; Intakes (00:00 - 11:59)</h4>
                          <div className="space-y-1.5">
                            {upcomingDosesList.filter(d => {
                              const hour = parseInt(d.time.split(':')[0]);
                              return hour < 12;
                            }).map((dose, i) => (
                              <div key={`am-${i}`} className="p-2.5 bg-slate-50 border border-slate-150 rounded-lg flex justify-between items-center text-slate-800 hover:bg-slate-100 transition duration-150">
                                <div className="space-y-0.5">
                                  <p className="font-bold text-slate-955">{dose.medName} <span className="font-normal text-slate-500">({dose.dosage})</span></p>
                                  <p className="text-[10px] text-slate-500 italic font-medium">{dose.purpose}</p>
                                </div>
                                <span className="text-xs font-bold font-mono bg-indigo-50 text-indigo-900 border border-indigo-150 px-2 py-0.5 rounded shadow-sm shrink-0">{dose.time}</span>
                              </div>
                            ))}
                            {upcomingDosesList.filter(d => parseInt(d.time.split(':')[0]) < 12).length === 0 && (
                              <p className="text-[10px] text-slate-400 italic py-1">No morning doses scheduled.</p>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono pb-1 border-b border-slate-150">PM Alarms &amp; Intakes (12:00 - 23:59)</h4>
                          <div className="space-y-1.5">
                            {upcomingDosesList.filter(d => {
                              const hour = parseInt(d.time.split(':')[0]);
                              return hour >= 12;
                            }).map((dose, i) => (
                              <div key={`pm-${i}`} className="p-2.5 bg-slate-50 border border-slate-150 rounded-lg flex justify-between items-center text-slate-800 hover:bg-slate-100 transition duration-150">
                                <div className="space-y-0.5">
                                  <p className="font-bold text-slate-955">{dose.medName} <span className="font-normal text-slate-500">({dose.dosage})</span></p>
                                  <p className="text-[10px] text-slate-500 italic font-medium">{dose.purpose}</p>
                                </div>
                                <span className="text-xs font-bold font-mono bg-indigo-50 text-indigo-900 border border-indigo-150 px-2 py-0.5 rounded shadow-sm shrink-0">{dose.time}</span>
                              </div>
                            ))}
                            {upcomingDosesList.filter(d => parseInt(d.time.split(':')[0]) >= 12).length === 0 && (
                              <p className="text-[10px] text-slate-400 italic py-1">No afternoon or evening doses scheduled.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footnotes and Medical Signoff verification lines */}
                  <div className="border-t border-slate-300 pt-5 space-y-4">
                    <div className="text-[9.5px] text-slate-500 italic leading-relaxed">
                      <strong>Clinical notice:</strong> This medication schedule profile is generated automatically based on patient and prescription logs entered within the MediSense Health platform. It is designed to act as a supportive coordination tool and should not override professional clinical judgments. Please verify accuracy with your primary healthcare provider.
                    </div>
                    <div className="flex justify-between items-end pt-4">
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 font-mono">Care Manager Verification</p>
                        <div className="border-b border-dashed border-slate-400 w-44 h-8 mt-1" />
                        <p className="text-[9px] text-slate-550 mt-1">Review Date &amp; Signature</p>
                      </div>
                      <div className="text-right text-[10px] font-bold text-slate-300 font-sans tracking-wide">
                        MEDISENSE INTEGRATED DIGITAL PRESCRIPTION
                      </div>
                    </div>
                  </div>

                </div>

                {/* Footer close */}
                <div className="flex justify-end pt-2 border-t border-slate-805/50">
                  <button
                    type="button"
                    onClick={() => setIsPrintModalOpen(false)}
                    className="px-4 py-2 bg-slate-950 hover:bg-slate-850 text-slate-350 text-xs font-semibold rounded-xl border border-slate-800 transition cursor-pointer"
                  >
                    Close Portfolio
                  </button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

    </div>
  );
}
