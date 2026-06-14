import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import { User, SymptomLog, Medication, MedicalDocument, MonthlyProgressReport, WellnessHabit, HealthNotification } from '../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, ReferenceLine } from 'recharts';
import { FileText, Sparkles, Loader2, Heart, Apple, CheckSquare, Settings, Activity, Award, UserCheck, TrendingDown, ChevronDown, Download, Printer, FileSpreadsheet, Pill, Clock, ShieldAlert, Calendar } from 'lucide-react';
import { motion } from 'motion/react';

// CustomTooltip component for Blood Glucose line chart with deep custom colors and notes
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-950/95 border border-slate-800 p-3.5 rounded-2xl shadow-2xl space-y-2 pointer-events-none backdrop-blur-md max-w-sm">
        <p className="text-[10px] text-slate-500 font-mono font-bold tracking-wider uppercase">{data.fullDate}</p>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-slate-400">Glucose Measure:</span>
            <span className="text-xs font-mono font-bold text-white bg-indigo-500/15 border border-indigo-500/20 px-1.5 py-0.5 rounded-lg">
              {data.glucose} mg/dL
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-slate-400">Symptom Severity:</span>
            <span className="text-xs font-mono font-bold text-white bg-purple-500/15 border border-purple-500/20 px-1.5 py-0.5 rounded-lg">
              {data.severity}/10
            </span>
          </div>
        </div>
        {data.notes && (
          <div className="text-[10px] text-slate-400/90 leading-relaxed border-t border-slate-800/60 pt-1.5 mt-1">
            <span className="font-semibold text-slate-500">Patient Note:</span> &ldquo;{data.notes}&rdquo;
          </div>
        )}
      </div>
    );
  }
  return null;
};

interface MonthlyReportProps {
  user: User;
  symptomLogs: SymptomLog[];
  medications: Medication[];
  documents: MedicalDocument[];
  reports: MonthlyProgressReport[];
  wellnessHabits: WellnessHabit[];
  notifications?: HealthNotification[];
  onAddReport: (report: MonthlyProgressReport) => void;
}

export default function MonthlyReport({ 
  user, 
  symptomLogs, 
  medications, 
  documents, 
  reports, 
  wellnessHabits, 
  notifications = [], 
  onAddReport 
}: MonthlyReportProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

  // Date filtering state
  const [startDate, setStartDate] = useState(() => {
    // Default to 30 days ago
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    // Default to today
    return new Date().toISOString().split('T')[0];
  });
  const [isDateFilterActive, setIsDateFilterActive] = useState(true);

  // Filter lists based on date range selection
  const filteredSymptomLogs = isDateFilterActive
    ? symptomLogs.filter(log => {
        const logDate = log.loggedAt.split('T')[0];
        return logDate >= startDate && logDate <= endDate;
      })
    : symptomLogs;

  const filteredWellnessHabits = isDateFilterActive
    ? wellnessHabits.filter(h => {
        return h.date >= startDate && h.date <= endDate;
      })
    : wellnessHabits;

  const filteredDocuments = isDateFilterActive
    ? documents.filter(doc => {
        const docDate = (doc.date || doc.createdAt).split('T')[0];
        return docDate >= startDate && docDate <= endDate;
      })
    : documents;

  const activeReport = reports.find(r => r.id === selectedReportId) || (reports.length > 0 ? reports[reports.length - 1] : null);

  // Extract and align blood glucose logs over time
  const glucoseData = [...filteredSymptomLogs]
    .filter(log => log.symptomType === 'Glucose' && log.value !== undefined)
    .sort((a, b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime())
    .map(log => {
      const dateObj = new Date(log.loggedAt);
      return {
        dateStr: dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' }),
        fullDate: dateObj.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        glucose: Number(log.value),
        severity: log.severity,
        notes: log.notes || ''
      };
    });

  const avgGlucose = glucoseData.length > 0 
    ? Math.round(glucoseData.reduce((sum, item) => sum + item.glucose, 0) / glucoseData.length)
    : user.vitals.bloodGlucose;

  const maxGlucose = glucoseData.length > 0
    ? Math.max(...glucoseData.map(item => item.glucose))
    : user.vitals.bloodGlucose;

  const minGlucose = glucoseData.length > 0
    ? Math.min(...glucoseData.map(item => item.glucose))
    : user.vitals.bloodGlucose;

  const getGlycemicStatus = () => {
    if (glucoseData.length === 0) return { label: 'Baseline Vitals Mode', color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20 shadow-indigo-500/5' };
    if (avgGlucose > 130) return { label: 'Elevated Glycemic Margin', color: 'text-rose-400 bg-rose-500/10 border-rose-500/20 shadow-rose-500/5' };
    if (avgGlucose < 80) return { label: 'Sub-Healthy Target Bounds', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20 shadow-amber-500/5' };
    return { label: 'Steady Glycemic Range', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 shadow-emerald-500/5' };
  };

  const glycemicStatus = getGlycemicStatus();

  // Generate the 7-day list ending today (June 10, 2026) to calculate daily medication adherence rates
  const getWeeklyAdherenceData = () => {
    const daysData = [];
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Total scheduled doses count per day based on medications
    const totalScheduled = medications.filter(m => m.active).reduce((sum, m) => sum + m.times.length, 0) || 2;

    for (let i = 6; i >= 0; i--) {
      const d = new Date(2026, 5, 10); // Today is Jun 10, 2026
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = weekdays[d.getDay()];
      const dayDateStr = `${months[d.getMonth()]} ${d.getDate()}`;

      // Find actual dose logs in notifications
      const dayLogs = notifications.filter(notif => {
        const nDate = notif.timestamp.split('T')[0];
        const isMed = notif.type === 'medication';
        const isTook = notif.title?.toLowerCase().includes('dose taken') || 
                       notif.message?.toLowerCase().includes('took') || 
                       notif.message?.toLowerCase().includes('administered');
        return nDate === dateStr && (isMed || isTook);
      });

      let takenCount = dayLogs.length;

      // Seeding fallback matching user behavior for demo
      // Let's make some days 100% and some days inconsistent so they can "identify inconsistent days"
      if (takenCount === 0 && user.id === 'user_kavisha14') {
        if (i === 6 || i === 5 || i === 2 || i === 1) { // 2026-06-04, 2026-06-05, 2026-06-08, 2026-06-09
          takenCount = totalScheduled; // 100% compliant
        } else if (i === 3 || i === 0) { // 2026-06-07, 2026-06-10 (today, partial)
          takenCount = Math.floor(totalScheduled / 2) || 1; // 50%
        } else if (i === 4) { // 2026-06-06
          takenCount = 0; // 0%
        }
      }

      const rate = totalScheduled > 0 ? Math.min(100, Math.round((takenCount / totalScheduled) * 100)) : 0;

      daysData.push({
        dateStr,
        dayName,
        dayDateStr,
        takenCount,
        totalScheduled,
        rate
      });
    }
    return daysData;
  };

  const weeklyAdherenceData = getWeeklyAdherenceData();

  const downloadCSV = () => {
    if (!activeReport) return;
    
    let csv = '';
    
    // Header
    csv += `"METRICIDAL / CLINICAL PATIENT HEALTH SUMMARY"\n`;
    csv += `"Generated At:","${new Date().toLocaleString()}"\n\n`;
    
    // Patient Details
    csv += `"PATIENT DEMOGRAPHICS"\n`;
    csv += `"Name:","${user.name}"\n`;
    csv += `"Email:","${user.email || 'N/A'}"\n`;
    csv += `"Age:","${user.age}"\n`;
    csv += `"Gender:","${user.gender}"\n`;
    csv += `"Primary Chronic Conditions:","${user.primaryConditions.join(', ')}"\n\n`;
    
    // Vitals
    csv += `"CURRENT CLINICAL VITALS"\n`;
    csv += `"Blood Pressure (Systolic):","${user.vitals.bloodPressureSys} mmHg"\n`;
    csv += `"Blood Pressure (Diastolic):","${user.vitals.bloodPressureDia} mmHg"\n`;
    csv += `"Blood Glucose:","${user.vitals.bloodGlucose} mg/dL"\n`;
    csv += `"Heart Rate:","${user.vitals.heartRate} bpm"\n`;
    csv += `"Weight:","${user.vitals.weight} kg"\n`;
    csv += `"Vitals Last Updated:","${new Date(user.vitals.lastUpdated).toLocaleString()}"\n\n`;
    
    // Report Summary
    csv += `"LATEST AI PROGRESS REPORT ANALYSIS (${activeReport.month.toUpperCase()} ${activeReport.year})"\n`;
    csv += `"Health Score (0-100 Aggregate):","${activeReport.healthScore}"\n`;
    
    const cleanSummary = activeReport.summary.replace(/"/g, '""');
    const cleanTrend = activeReport.trendDiagnosis.replace(/"/g, '""');
    csv += `"Synthesis Summary:","${cleanSummary}"\n`;
    csv += `"Clinical Trend Analysis:","${cleanTrend}"\n\n`;
    
    // Action items
    csv += `"KEY ACTION ITEMS CHECKLIST"\n`;
    if (activeReport.keyActionItems && activeReport.keyActionItems.length > 0) {
      activeReport.keyActionItems.forEach((item, index) => {
        csv += `"[${index + 1}]","${item.replace(/"/g, '""')}"\n`;
      });
    } else {
      csv += `"No key action items defined."\n`;
    }
    csv += `\n`;
    
    // Recommendations
    csv += `"CLINICAL RECOMMENDATIONS"\n`;
    csv += `"Dietary:",\n`;
    if (activeReport.recommendations.dietary && activeReport.recommendations.dietary.length > 0) {
      activeReport.recommendations.dietary.forEach(item => {
        csv += `,"- ${item.replace(/"/g, '""')}"\n`;
      });
    }
    csv += `"Activities:",\n`;
    if (activeReport.recommendations.activities && activeReport.recommendations.activities.length > 0) {
      activeReport.recommendations.activities.forEach(item => {
        csv += `,"- ${item.replace(/"/g, '""')}"\n`;
      });
    }
    csv += `\n`;
    
    // Medication Adherence section
    csv += `"MEDICATION COMPLIANCE & ADHERENCE HISTORY"\n`;
    csv += `"Name","Dosage","Frequency","Doses Taken","Total Doses","Adherence Rate","Status"\n`;
    
    if (medications && medications.length > 0) {
      medications.forEach(med => {
        const taken = med.totalDoses - med.remainingDoses;
        const adherencePct = med.totalDoses > 0 ? Math.round((taken / med.totalDoses) * 100) : 100;
        const status = med.active ? 'Active' : 'Stopped';
        csv += `"${med.name}","${med.dosage}","${med.frequency}","${taken}","${med.totalDoses}","${adherencePct}%","${status}"\n`;
      });
    } else {
      csv += `"No medications currently listed."\n`;
    }
    csv += `\n`;
    
    // Symptoms Log summary
    csv += `"RECENT SYMPTOM RECORD LOGS"\n`;
    csv += `"Date","Symptom Type","Severity Score (1-10)","Clinical Notes"\n`;
    if (filteredSymptomLogs && filteredSymptomLogs.length > 0) {
      filteredSymptomLogs.slice(-15).forEach(log => {
        csv += `"${new Date(log.loggedAt).toLocaleDateString()}","${log.symptomType}","${log.severity}","${(log.notes || '').replace(/"/g, '""')}"\n`;
      });
    } else {
      csv += `"No symptom log events stored."\n`;
    }
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${user.name.replace(/\s+/g, '_')}_Health_Summary_${activeReport.month}_${activeReport.year}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadTextSummary = () => {
    if (!activeReport) return;
    
    let text = `========================================================================\n`;
    text += `             METRICSHEALTH - INTEGRATED CLINICAL SUMMARY\n`;
    text += `========================================================================\n`;
    text += `Report Month: ${activeReport.month} ${activeReport.year}\n`;
    text += `Generated At: ${new Date().toLocaleString()}\n`;
    text += `Patient Name: ${user.name}\n`;
    text += `Patient Email: ${user.email || 'N/A'}\n`;
    text += `Patient Age/Gender: ${user.age} yrs / ${user.gender}\n`;
    text += `Primary Conditions: ${user.primaryConditions.join(', ')}\n`;
    text += `------------------------------------------------------------------------\n\n`;
    
    text += `[1] CLINICAL VITALS BASELINE\n`;
    text += `------------------------------------------------------------------------\n`;
    text += `  * Blood Pressure: ${user.vitals.bloodPressureSys}/${user.vitals.bloodPressureDia} mmHg\n`;
    text += `  * Blood Glucose: ${user.vitals.bloodGlucose} mg/dL\n`;
    text += `  * Heart Rate: ${user.vitals.heartRate} bpm\n`;
    text += `  * Body Weight: ${user.vitals.weight} kg\n`;
    text += `  * Last Updated: ${new Date(user.vitals.lastUpdated).toLocaleString()}\n\n`;
    
    text += `[2] CLINICAL SYNTHESIS SUMMARY\n`;
    text += `------------------------------------------------------------------------\n`;
    text += `  Aggregate Health Score: ${activeReport.healthScore}/100\n\n`;
    text += `  Synthesis summary:\n`;
    text += `  ${activeReport.summary}\n\n`;
    text += `  Clinical Trend Analysis:\n`;
    text += `  ${activeReport.trendDiagnosis}\n\n`;
    
    text += `[3] ADVOCATED ACTION ITEM CHECKLIST\n`;
    text += `------------------------------------------------------------------------\n`;
    if (activeReport.keyActionItems && activeReport.keyActionItems.length > 0) {
      activeReport.keyActionItems.forEach((item, i) => {
        text += `  [ ] ${item}\n`;
      });
    } else {
      text += `  No key action items defined.\n`;
    }
    text += `\n`;
    
    text += `[4] CLINICAL WELLNESS RECOMMENDATIONS\n`;
    text += `------------------------------------------------------------------------\n`;
    text += `  DIETARY ADVICES:\n`;
    if (activeReport.recommendations.dietary && activeReport.recommendations.dietary.length > 0) {
      activeReport.recommendations.dietary.forEach(diet => {
        text += `    - ${diet}\n`;
      });
    } else {
      text += `    No specific dietary guidelines listed.\n`;
    }
    text += `\n`;
    text += `  PHYSICAL MOVEMENT:\n`;
    if (activeReport.recommendations.activities && activeReport.recommendations.activities.length > 0) {
      activeReport.recommendations.activities.forEach(act => {
        text += `    - ${act}\n`;
      });
    } else {
      text += `    No specific activities guidelines listed.\n`;
    }
    text += `\n`;
    
    text += `[5] MEDICATION ADHERENCE HISTORY SUMMARY\n`;
    text += `------------------------------------------------------------------------\n`;
    if (medications && medications.length > 0) {
      medications.forEach(med => {
        const taken = med.totalDoses - med.remainingDoses;
        const adherencePct = med.totalDoses > 0 ? Math.round((taken / med.totalDoses) * 100) : 100;
        text += `  * ${med.name} (${med.dosage}):\n`;
        text += `    Adherence Rate: ${adherencePct}% (${taken} of ${med.totalDoses} doses taken)\n`;
        text += `    Frequency: ${med.frequency}\n`;
        text += `    Status: ${med.active ? 'ACTIVE TREATMENT' : 'STOPPED'}\n\n`;
      });
    } else {
      text += `  No medications recorded.\n\n`;
    }
    
    text += `[6] HISTORICAL SYMPTOM LOG ENTRIES\n`;
    text += `------------------------------------------------------------------------\n`;
    if (symptomLogs && symptomLogs.length > 0) {
      symptomLogs.slice(-10).forEach(log => {
        text += `  * [${new Date(log.loggedAt).toLocaleDateString()}] ${log.symptomType} (Severity: ${log.severity}/10)\n`;
        if (log.notes) {
          text += `    Notes: ${log.notes}\n`;
        }
      });
    } else {
      text += `  No symptom logs recorded.\n`;
    }
    
    text += `\n========================================================================\n`;
    text += `       END OF CLINICAL DEEP DIVE LOGS - MEDISENSE SECURE ARCHIVE\n`;
    text += `========================================================================\n`;
    
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${user.name.replace(/\s+/g, '_')}_Health_Summary_${activeReport.month}_${activeReport.year}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportFilteredSnapshotPDF = () => {
    // Create new A4 PDF in portrait orientation
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const docWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let y = 20;

    const addText = (text: string, x: number, lineY: number, size: number, style: 'normal'|'bold'|'italic'|'bolditalic' = 'normal', color: [number, number, number] = [30, 41, 59], wrapWidth?: number) => {
      doc.setFont('Helvetica', style);
      doc.setFontSize(size);
      doc.setTextColor(color[0], color[1], color[2]);
      if (wrapWidth) {
        const lines = doc.splitTextToSize(text, wrapWidth);
        doc.text(lines, x, lineY);
        return lines.length * (size * 0.35 + 1.5); // returns approximate block height
      } else {
        doc.text(text, x, lineY);
        return size * 0.35 + 1.5;
      }
    };

    // Header Color Block (Indigo Brand header)
    doc.setFillColor(79, 70, 229); // indigo-600
    doc.rect(margin, y, docWidth - 2 * margin, 24, 'F');
    
    // Title
    addText("MEDISENSE CLINICAL RECORD PROGRESS SNAPSHOT", margin + 5, y + 9, 12, 'bold', [255, 255, 255]);
    addText(`Date-Scoped Clinician Summary • Range: ${startDate} to ${endDate}`, margin + 5, y + 16, 9, 'normal', [224, 231, 255]);
    addText(`Date: ${new Date().toLocaleDateString()}`, docWidth - margin - 5 - 28, y + 12, 9, 'normal', [224, 231, 255]);

    y += 32;

    // Grid details for demographics & vitals
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, y, docWidth - 2 * margin, 38, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.rect(margin, y, docWidth - 2 * margin, 38, 'S');

    // Column 1: Demographics
    addText("PATIENT DEMOGRAPHICS", margin + 5, y + 6, 9.5, 'bold', [15, 23, 42]);
    addText(`Name: ${user.name}`, margin + 5, y + 13, 9, 'normal', [71, 85, 105]);
    addText(`Email: ${user.email || 'None connected'}`, margin + 5, y + 19, 9, 'normal', [71, 85, 105]);
    addText(`Age / Gender: ${user.age} Years Old / ${user.gender}`, margin + 5, y + 25, 9, 'normal', [71, 85, 105]);
    
    const conditionsStr = user.primaryConditions.join(', ');
    const conditionLines = doc.splitTextToSize(`Primary Diagnoses: ${conditionsStr || 'General Monitoring'}`, (docWidth - 2 * margin) / 2 - 10);
    doc.text(conditionLines, margin + 5, y + 31);

    // Column 2: Vitals
    const col2X = docWidth / 2 + 5;
    addText("CLINICAL VITALS BASELINE", col2X, y + 6, 9.5, 'bold', [15, 23, 42]);
    addText(`Blood Pressure: ${user.vitals.bloodPressureSys}/${user.vitals.bloodPressureDia} mmHg`, col2X, y + 13, 9, 'normal', [71, 85, 105]);
    addText(`Blood Glucose: ${user.vitals.bloodGlucose} mg/dL`, col2X, y + 19, 9, 'normal', [71, 85, 105]);
    addText(`Resting Heart Rate: ${user.vitals.heartRate} bpm`, col2X, y + 25, 9, 'normal', [71, 85, 105]);
    addText(`Self-reported Weight: ${user.vitals.weight} kg`, col2X, y + 31, 9, 'normal', [71, 85, 105]);

    y += 46;

    // Helper for printing sections and supporting dynamic page breaks
    const checkPageBreak = (heightNeeded: number) => {
      if (y + heightNeeded > doc.internal.pageSize.getHeight() - 15) {
        doc.addPage();
        y = 20;
        return true;
      }
      return false;
    };

    const sectionWidth = docWidth - 2 * margin;

    // Date Range Scoped Insights Card
    checkPageBreak(30);
    doc.setFillColor(243, 244, 246);
    doc.rect(margin, y, sectionWidth, 22, 'F');
    doc.setDrawColor(209, 213, 219);
    doc.rect(margin, y, sectionWidth, 22, 'S');

    addText("HEALTH RECORD PROGRESS INSIGHT", margin + 4, y + 6, 10, 'bold', [15, 23, 42]);
    addText(`This dynamically generated snapshot compiles tracking telemetry scoped from ${startDate} to ${endDate}.`, margin + 4, y + 12, 8.5, 'normal', [71, 85, 105]);
    addText(`Total symptoms logged: ${filteredSymptomLogs.length} | Completed habits in period: ${filteredWellnessHabits.filter(h => h.completed).length}`, margin + 4, y + 17, 8.5, 'italic', [79, 70, 229]);

    y += 28;

    // Active Treatments & Medications schedule
    checkPageBreak(50);
    addText("Medication Trials & Adherence Audits", margin, y, 11, 'bold', [15, 23, 42]);
    y += 4;
    doc.setLineWidth(0.4);
    doc.setDrawColor(79, 70, 229);
    doc.line(margin, y, docWidth - margin, y);
    y += 6;

    // Header Table
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, sectionWidth, 8, 'F');
    addText("Medication Name", margin + 4, y + 5.5, 9, 'bold', [71, 85, 105]);
    addText("Dosage", margin + 50, y + 5.5, 9, 'bold', [71, 85, 105]);
    addText("Frequency", margin + 85, y + 5.5, 9, 'bold', [71, 85, 105]);
    addText("Compliance Rate", margin + 130, y + 5.5, 9, 'bold', [71, 85, 105]);
    y += 8;

    if (medications && medications.length > 0) {
      medications.forEach(med => {
        checkPageBreak(12);
        const taken = med.totalDoses - med.remainingDoses;
        const adherencePct = med.totalDoses > 0 ? Math.round((taken / med.totalDoses) * 100) : 100;

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(51, 65, 85);
        
        doc.text(med.name, margin + 4, y + 6);
        doc.text(med.dosage, margin + 50, y + 6);
        doc.text(med.frequency, margin + 85, y + 6);
        doc.text(`${taken} of ${med.totalDoses} doses taken (${adherencePct}% adherence)`, margin + 130, y + 6);
        
        doc.setDrawColor(226, 232, 240);
        doc.line(margin, y + 9, docWidth - margin, y + 9);
        y += 9;
      });
    } else {
      addText("No drugs recorded.", margin + 4, y + 6, 9, 'italic', [100, 116, 139]);
      y += 10;
    }
    y += 6;

    // Symptoms table
    checkPageBreak(50);
    addText("Patient-Logged Symptoms History (In Target Scope)", margin, y, 11, 'bold', [15, 23, 42]);
    y += 4;
    doc.line(margin, y, docWidth - margin, y);
    y += 6;

    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, sectionWidth, 8, 'F');
    addText("Date Logged", margin + 4, y + 5.5, 9, 'bold', [71, 85, 105]);
    addText("Symptom", margin + 30, y + 5.5, 9, 'bold', [71, 85, 105]);
    addText("Severity", margin + 70, y + 5.5, 9, 'bold', [71, 85, 105]);
    addText("Patient Annotations", margin + 95, y + 5.5, 9, 'bold', [71, 85, 105]);
    y += 8;

    const filteredLogs = (filteredSymptomLogs || []);
    if (filteredLogs.length > 0) {
      filteredLogs.forEach(log => {
        const dStr = new Date(log.loggedAt).toLocaleDateString();
        const rawNotes = log.notes || '';
        const notesLines = doc.splitTextToSize(rawNotes, docWidth - margin - 100);
        const rowHeight = Math.max(9, notesLines.length * 4.5 + 4);
        
        checkPageBreak(rowHeight);
        
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(51, 65, 85);
        
        doc.text(dStr, margin + 4, y + 6);
        doc.text(log.symptomType, margin + 30, y + 6);
        doc.text(`${log.severity}/10`, margin + 70, y + 6);
        doc.text(notesLines, margin + 95, y + 6);
        
        doc.setDrawColor(226, 232, 240);
        doc.line(margin, y + rowHeight, docWidth - margin, y + rowHeight);
        y += rowHeight;
      });
    } else {
      addText("No symptom logs recorded in this period.", margin + 4, y + 6, 9, 'italic', [100, 116, 139]);
      y += 10;
    }
    y += 6;

    // Habits consistency summary table
    checkPageBreak(50);
    addText("Wellness Habit Logs & Compliance Tracking", margin, y, 11, 'bold', [15, 23, 42]);
    y += 4;
    doc.line(margin, y, docWidth - margin, y);
    y += 6;

    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, sectionWidth, 8, 'F');
    addText("Habit Practice Title", margin + 4, y + 5.5, 9, 'bold', [71, 85, 105]);
    addText("Execution Date", margin + 100, y + 5.5, 9, 'bold', [71, 85, 105]);
    addText("Compliance Status", margin + 145, y + 5.5, 9, 'bold', [71, 85, 105]);
    y += 8;

    const filteredHabits = (filteredWellnessHabits || []);
    if (filteredHabits.length > 0) {
      filteredHabits.forEach(h => {
        checkPageBreak(10);
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(51, 65, 85);

        doc.text(h.name, margin + 4, y + 6);
        doc.text(h.date, margin + 100, y + 6);
        doc.text(h.completed ? "COMPLETED" : "PLANNED", margin + 145, y + 6);

        doc.setDrawColor(226, 232, 240);
        doc.line(margin, y + 9, docWidth - margin, y + 9);
        y += 9;
      });
    } else {
      addText("No wellness habits logged in this period.", margin + 4, y + 6, 9, 'italic', [100, 116, 139]);
      y += 10;
    }

    // Footnotes signature
    checkPageBreak(40);
    y += 10;
    doc.setLineWidth(0.3);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y, docWidth - margin, y);
    y += 5;
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("MediSense Secure Cryptographic Health Vault • Patient-controlled medical access. Platform v4.2.0-Alpha", margin, y);
    doc.text("All telemetry logs compiled with clinical accuracy. Not a substitute for actual professional medical diagnoses.", margin, y + 4);

    // Dr. Signature box
    y += 8;
    checkPageBreak(25);
    doc.setLineWidth(0.3);
    doc.setDrawColor(148, 163, 184);
    doc.line(docWidth - margin - 50, y + 10, docWidth - margin, y + 10);
    addText("Clinician Signature / Date", docWidth - margin - 50, y + 14, 8, 'bold', [100, 116, 139]);

    doc.save(`${user.name.replace(/\s+/g, '_')}_Progress_Snapshot_${startDate}_to_${endDate}.pdf`);
  };

  const exportPDF = () => {
    if (!activeReport) return;
    
    // Create new A4 PDF in portrait orientation
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const docWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let y = 20;

    const addText = (text: string, x: number, lineY: number, size: number, style: 'normal'|'bold'|'italic'|'bolditalic' = 'normal', color: [number, number, number] = [30, 41, 59], wrapWidth?: number) => {
      doc.setFont('Helvetica', style);
      doc.setFontSize(size);
      doc.setTextColor(color[0], color[1], color[2]);
      if (wrapWidth) {
        const lines = doc.splitTextToSize(text, wrapWidth);
        doc.text(lines, x, lineY);
        return lines.length * (size * 0.35 + 1.5); // returns approximate block height
      } else {
        doc.text(text, x, lineY);
        return size * 0.35 + 1.5;
      }
    };

    // Header Color Block (Indigo Brand header)
    doc.setFillColor(99, 102, 241); // #6366f1
    doc.rect(margin, y, docWidth - 2 * margin, 24, 'F');
    
    // Title
    addText("MEDISENSE CLINICAL HEALTH SUMMARY REPORT", margin + 5, y + 9, 13, 'bold', [255, 255, 255]);
    addText(`30-Day Health Summary & Compliance Trends • Month of ${activeReport.month.toUpperCase()} ${activeReport.year}`, margin + 5, y + 16, 9.5, 'normal', [224, 231, 255]);
    addText(`Date: ${new Date().toLocaleDateString()}`, docWidth - margin - 5 - 28, y + 12, 9, 'normal', [224, 231, 255]);

    y += 32;

    // Grid details for demographics & vitals
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, y, docWidth - 2 * margin, 38, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.rect(margin, y, docWidth - 2 * margin, 38, 'S');

    // Column 1: Demographics
    addText("PATIENT DEMOGRAPHICS", margin + 5, y + 6, 9.5, 'bold', [15, 23, 42]);
    addText(`Name: ${user.name}`, margin + 5, y + 13, 9, 'normal', [71, 85, 105]);
    addText(`Email: ${user.email || 'None connected'}`, margin + 5, y + 19, 9, 'normal', [71, 85, 105]);
    addText(`Age / Gender: ${user.age} Years Old / ${user.gender}`, margin + 5, y + 25, 9, 'normal', [71, 85, 105]);
    
    const conditionsStr = user.primaryConditions.join(', ');
    const conditionLines = doc.splitTextToSize(`Primary Diagnoses: ${conditionsStr}`, (docWidth - 2*margin) / 2 - 10);
    doc.text(conditionLines, margin + 5, y + 31);

    // Column 2: Vitals
    const col2X = docWidth / 2 + 5;
    addText("CLINICAL VITALS BASELINE", col2X, y + 6, 9.5, 'bold', [15, 23, 42]);
    addText(`Blood Pressure: ${user.vitals.bloodPressureSys}/${user.vitals.bloodPressureDia} mmHg`, col2X, y + 13, 9, 'normal', [71, 85, 105]);
    addText(`Blood Glucose: ${user.vitals.bloodGlucose} mg/dL`, col2X, y + 19, 9, 'normal', [71, 85, 105]);
    addText(`Resting Heart Rate: ${user.vitals.heartRate} bpm`, col2X, y + 25, 9, 'normal', [71, 85, 105]);
    addText(`Self-reported Weight: ${user.vitals.weight} kg`, col2X, y + 31, 9, 'normal', [71, 85, 105]);

    y += 46;

    // Health Score Block
    doc.setFillColor(239, 246, 255); // blue-50 fill
    doc.rect(margin, y, docWidth - 2 * margin, 18, 'F');
    doc.setDrawColor(191, 219, 254); // blue-200 border
    doc.rect(margin, y, docWidth - 2 * margin, 18, 'S');

    addText("Clinical Compliance Health Score:", margin + 5, y + 11, 11, 'bold', [30, 58, 138]);
    doc.setFillColor(37, 99, 235);
    doc.rect(docWidth - margin - 22, y + 3, 16, 12, 'F');
    
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text(String(activeReport.healthScore), docWidth - margin - 14, y + 11, { align: 'center' });
    
    addText("0-100 Dynamic health score predicated on logs & tracking", margin + 70, y + 11, 8.5, 'italic', [59, 130, 246]);

    y += 26;

    // Helper for printing sections and supporting dynamic page breaks
    const checkPageBreak = (heightNeeded: number) => {
      if (y + heightNeeded > doc.internal.pageSize.getHeight() - 15) {
        doc.addPage();
        y = 20;
        return true;
      }
      return false;
    };

    const sectionWidth = docWidth - 2 * margin;

    // Summary Section
    addText("Clinical Synthesis Summary", margin, y, 11, 'bold', [15, 23, 42]);
    y += 4;
    doc.setLineWidth(0.4);
    doc.setDrawColor(99, 102, 241);
    doc.line(margin, y, docWidth - margin, y);
    y += 5;

    const summaryLines = doc.splitTextToSize(activeReport.summary, sectionWidth);
    const summaryHeight = summaryLines.length * 5;
    checkPageBreak(summaryHeight + 10);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(51, 65, 85);
    doc.text(summaryLines, margin, y);
    y += summaryHeight + 10;

    // Trend Diagnosis
    checkPageBreak(30);
    addText("Trend Diagnosis & Bio-Markers Analysis", margin, y, 11, 'bold', [15, 23, 42]);
    y += 4;
    doc.line(margin, y, docWidth - margin, y);
    y += 5;

    const trendLines = doc.splitTextToSize(activeReport.trendDiagnosis, sectionWidth);
    const trendHeight = trendLines.length * 5;
    checkPageBreak(trendHeight + 10);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(51, 65, 85);
    doc.text(trendLines, margin, y);
    y += trendHeight + 11;

    // Recommendations stacked
    checkPageBreak(40);
    addText("Wellness Recommendations & Actions", margin, y, 11, 'bold', [15, 23, 42]);
    y += 4;
    doc.line(margin, y, docWidth - margin, y);
    y += 6;

    addText("Dietary Guidelines:", margin, y, 9.5, 'bold', [15, 23, 42]);
    y += 5;
    const dietaryList = activeReport.recommendations.dietary || [];
    if (dietaryList.length > 0) {
      dietaryList.forEach(item => {
        const itemLines = doc.splitTextToSize(`• ${item}`, sectionWidth - 5);
        checkPageBreak(itemLines.length * 4.5);
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(itemLines, margin + 4, y);
        y += itemLines.length * 4.5 + 1;
      });
    } else {
      addText("No specific dietary instructions specified.", margin + 4, y, 9, 'normal', [100, 116, 139]);
      y += 5;
    }
    y += 3;

    addText("Physical Activities:", margin, y, 9.5, 'bold', [15, 23, 42]);
    y += 5;
    const activitiesList = activeReport.recommendations.activities || [];
    if (activitiesList.length > 0) {
      activitiesList.forEach(item => {
        const itemLines = doc.splitTextToSize(`• ${item}`, sectionWidth - 5);
        checkPageBreak(itemLines.length * 4.5);
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(itemLines, margin + 4, y);
        y += itemLines.length * 4.5 + 1;
      });
    } else {
      addText("No physical activities prescribed.", margin + 4, y, 9, 'normal', [100, 116, 139]);
      y += 5;
    }
    y += 3;

    addText("Self-Management Action Checklist:", margin, y, 9.5, 'bold', [15, 23, 42]);
    y += 5;
    const actionList = activeReport.keyActionItems || [];
    if (actionList.length > 0) {
      actionList.forEach(item => {
        const itemLines = doc.splitTextToSize(`[ ] ${item}`, sectionWidth - 5);
        checkPageBreak(itemLines.length * 4.5);
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(itemLines, margin + 4, y);
        y += itemLines.length * 4.5 + 1;
      });
    } else {
      addText("No outstanding daily actions listed.", margin + 4, y, 9, 'normal', [100, 116, 139]);
      y += 5;
    }
    y += 8;

    // NEXT SECTION: Therapy & Adherence Metrics
    checkPageBreak(50);
    addText("Therapy & Medication Adherence Metrics", margin, y, 11, 'bold', [15, 23, 42]);
    y += 4;
    doc.line(margin, y, docWidth - margin, y);
    y += 6;

    // Header
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, sectionWidth, 8, 'F');
    addText("Medication Name", margin + 4, y + 5.5, 9, 'bold', [71, 85, 105]);
    addText("Dosage", margin + 50, y + 5.5, 9, 'bold', [71, 85, 105]);
    addText("Frequency", margin + 85, y + 5.5, 9, 'bold', [71, 85, 105]);
    addText("Compliance Status", margin + 130, y + 5.5, 9, 'bold', [71, 85, 105]);
    y += 8;

    if (medications && medications.length > 0) {
      medications.forEach(med => {
        checkPageBreak(12);
        const taken = med.totalDoses - med.remainingDoses;
        const adherencePct = med.totalDoses > 0 ? Math.round((taken / med.totalDoses) * 105) : 100;
        const displayPct = adherencePct > 100 ? 100 : adherencePct;

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(51, 65, 85);
        
        doc.text(med.name, margin + 4, y + 6);
        doc.text(med.dosage, margin + 50, y + 6);
        doc.text(med.frequency, margin + 85, y + 6);
        doc.text(`${taken} of ${med.totalDoses} doses (${displayPct}% Compliance)`, margin + 130, y + 6);
        
        doc.setDrawColor(226, 232, 240);
        doc.line(margin, y + 9, docWidth - margin, y + 9);
        y += 9;
      });
    } else {
      addText("No registered medications logs.", margin + 4, y + 6, 9, 'italic', [100, 116, 139]);
      y += 10;
    }
    y += 6;

    // Symptoms table
    checkPageBreak(50);
    addText("Recent Patient-Logged Symptoms History", margin, y, 11, 'bold', [15, 23, 42]);
    y += 4;
    doc.line(margin, y, docWidth - margin, y);
    y += 6;

    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, sectionWidth, 8, 'F');
    addText("Date Logged", margin + 4, y + 5.5, 9, 'bold', [71, 85, 105]);
    addText("Symptom", margin + 30, y + 5.5, 9, 'bold', [71, 85, 105]);
    addText("Severity", margin + 70, y + 5.5, 9, 'bold', [71, 85, 105]);
    addText("Patient Annotations", margin + 95, y + 5.5, 9, 'bold', [71, 85, 105]);
    y += 8;

    const filteredLogs = (filteredSymptomLogs || []).slice(-10);
    if (filteredLogs.length > 0) {
      filteredLogs.forEach(log => {
        const dStr = new Date(log.loggedAt).toLocaleDateString();
        const rawNotes = log.notes || '';
        const notesLines = doc.splitTextToSize(rawNotes, docWidth - margin - 100);
        const rowHeight = Math.max(9, notesLines.length * 4.5 + 4);
        
        checkPageBreak(rowHeight);
        
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(51, 65, 85);
        
        doc.text(dStr, margin + 4, y + 6);
        doc.text(log.symptomType, margin + 30, y + 6);
        doc.text(`${log.severity}/10`, margin + 70, y + 6);
        doc.text(notesLines, margin + 95, y + 6);
        
        doc.setDrawColor(226, 232, 240);
        doc.line(margin, y + rowHeight, docWidth - margin, y + rowHeight);
        y += rowHeight;
      });
    } else {
      addText("No symptom log histories found in last 30 days.", margin + 4, y + 6, 9, 'italic', [100, 116, 139]);
      y += 10;
    }

    // Footnotes signature
    checkPageBreak(25);
    y += 12;
    doc.setLineWidth(0.3);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y, docWidth - margin, y);
    y += 5;
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("MediSense Secure Cryptographic Health Vault • Patient-controlled medical record portal. Platform v4.2.0-Alpha", margin, y);
    doc.text("This document is generated directly from secure localized storage. Recommended for clinical diagnostic review.", margin, y + 3.5);

    doc.save(`${user.name.replace(/\s+/g, '_')}_Clinical_Report_${activeReport.month}_${activeReport.year}.pdf`);
  };

  const printPDF = () => {
    if (!activeReport) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Allow popups to print your Health Summary Report.');
      return;
    }
    
    const dietaryList = (activeReport.recommendations.dietary || []).map(d => `<li>${d}</li>`).join('');
    const activitiesList = (activeReport.recommendations.activities || []).map(a => `<li>${a}</li>`).join('');
    const actionList = (activeReport.keyActionItems || []).map(items => `<li>[ ] ${items}</li>`).join('');
    
    const medsRows = (medications || []).map(med => {
      const taken = med.totalDoses - med.remainingDoses;
      const adherencePct = med.totalDoses > 0 ? Math.round((taken / med.totalDoses) * 105) : 100;
      const displayPct = adherencePct > 100 ? 100 : adherencePct;
      return `
        <tr>
          <td><strong>${med.name}</strong></td>
          <td>${med.dosage}</td>
          <td>${med.frequency}</td>
          <td>${taken} / ${med.totalDoses}</td>
          <td><span class="badge ${displayPct >= 80 ? 'good' : 'warning'}">${displayPct}% Compliance</span></td>
        </tr>
      `;
    }).join('');
    
    const symptomsRows = (filteredSymptomLogs || []).slice(-10).map(log => {
      return `
        <tr>
          <td>${new Date(log.loggedAt).toLocaleDateString()}</td>
          <td>${log.symptomType}</td>
          <td>${log.severity}/10</td>
          <td>${log.notes || ''}</td>
        </tr>
      `;
    }).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Health Summary - ${user.name}</title>
        <style>
          body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #1e293b;
            line-height: 1.5;
            padding: 40px;
            background: #ffffff;
          }
          .header {
            border-bottom: 2px solid #6366f1;
            padding-bottom: 20px;
            margin-bottom: 30px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }
          .title {
            font-size: 28px;
            font-weight: 700;
            color: #0f172a;
            margin: 0;
            text-transform: uppercase;
            letter-spacing: -0.5px;
          }
          .medisense-brand {
            color: #6366f1;
          }
          .subtitle {
            font-size: 14px;
            color: #64748b;
            margin: 5px 0 0 0;
          }
          .meta-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
            background: #f8fafc;
            padding: 20px;
            border-radius: 12px;
            border: 1px solid #e2e8f0;
          }
          .meta-col p {
            margin: 6px 0;
            font-size: 14px;
          }
          .meta-col strong {
            color: #334155;
          }
          .score-card {
            background: #eff6ff;
            border: 1px solid #bfdbfe;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 30px;
            display: flex;
            align-items: center;
            gap: 20px;
          }
          .score-num {
            font-size: 36px;
            font-weight: 800;
            color: #2563eb;
            background: #ffffff;
            border: 4px solid #3b82f6;
            width: 70px;
            height: 70px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
          }
          .score-info h3 {
            margin: 0 0 4px 0;
            font-size: 16px;
            color: #1e3a8a;
          }
          .score-info p {
            margin: 0;
            font-size: 13px;
            color: #3b82f6;
          }
          h2 {
            font-size: 18px;
            font-weight: 700;
            color: #0f172a;
            border-left: 4px solid #6366f1;
            padding-left: 10px;
            margin-top: 30px;
            margin-bottom: 15px;
          }
          .content-block {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
            font-size: 14px;
          }
          ul {
            margin: 0;
            padding-left: 20px;
          }
          li {
            margin-bottom: 8px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            font-size: 13px;
          }
          th, td {
            text-align: left;
            padding: 10px 12px;
            border-bottom: 1px solid #e2e8f0;
          }
          th {
            background: #f1f5f9;
            color: #475569;
            font-weight: 600;
          }
          .badge {
            display: inline-block;
            padding: 3px 8px;
            font-size: 11px;
            font-weight: 600;
            border-radius: 6px;
          }
          .badge.good {
            background: #dcfce7;
            color: #15803d;
          }
          .badge.warning {
            background: #fef3c7;
            color: #b45309;
          }
          .footer {
            margin-top: 50px;
            border-top: 1px solid #e2e8f0;
            padding-top: 15px;
            text-align: center;
            font-size: 11px;
            color: #94a3b8;
          }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">Health <span class="medisense-brand">Summary</span></h1>
            <p class="subtitle">Secure Chronic Illness Monitoring Report</p>
          </div>
          <div style="text-align: right;">
            <p style="margin: 0; font-size: 13px; font-weight: 600; color: #475569;">MONTH OF ${activeReport.month.toUpperCase()} ${activeReport.year}</p>
            <p style="margin: 4px 0 0 0; font-size: 11px; color: #94a3b8;">Printed on ${new Date().toLocaleDateString()}</p>
          </div>
        </div>

        <div class="meta-grid">
          <div class="meta-col">
            <p><strong>Patient Name:</strong> ${user.name}</p>
            <p><strong>Email Contacts:</strong> ${user.email || 'None connected'}</p>
            <p><strong>Demographics:</strong> ${user.age} Years Old / ${user.gender}</p>
            <p><strong>Primary Management:</strong> ${user.primaryConditions.join(', ')}</p>
          </div>
          <div class="meta-col">
            <p><strong>Blood Pressure:</strong> ${user.vitals.bloodPressureSys}/${user.vitals.bloodPressureDia} mmHg</p>
            <p><strong>Blood Glucose:</strong> ${user.vitals.bloodGlucose} mg/dL</p>
            <p><strong>Resting Heart Rate:</strong> ${user.vitals.heartRate} bpm</p>
            <p><strong>Self-reported Weight:</strong> ${user.vitals.weight} kg</p>
          </div>
        </div>

        <div class="score-card">
          <div class="score-num">${activeReport.healthScore}</div>
          <div class="score-info">
            <h3>Aggregate Clinical Score</h3>
            <p>Calculated dynamic compliance score based on logged medications adherence and symptom tracking frequency.</p>
          </div>
        </div>

        <h2>Clinical Synthesis Summary</h2>
        <div class="content-block">
          <p style="margin: 0; white-space: pre-wrap;">${activeReport.summary}</p>
        </div>

        <h2>Trend Diagnosis & Symptom Interdependency</h2>
        <div class="content-block">
          <p style="margin: 0; white-space: pre-wrap;">${activeReport.trendDiagnosis}</p>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          <div>
            <h2>Wellness Recommendations</h2>
            <div class="content-block" style="min-height: 120px;">
              <strong>Dietary:</strong>
              <ul style="margin-top: 8px;">${dietaryList || '<li>No specific guidelines listed.</li>'}</ul>
              <strong style="display: block; margin-top: 12px;">Physical Activities:</strong>
              <ul style="margin-top: 8px;">${activitiesList || '<li>No specific activities listed.</li>'}</ul>
            </div>
          </div>
          <div>
            <h2>Action Item Checklist</h2>
            <div class="content-block" style="min-height: 120px;">
              <ul style="list-style-type: none; padding-left: 0;">
                ${actionList || '<li>No action items defined.</li>'}
              </ul>
            </div>
          </div>
        </div>

        <h2>Active Treatment & Adherence Metrics</h2>
        <div class="content-block">
          <table>
            <thead>
              <tr>
                <th>Medication</th>
                <th>Dosage</th>
                <th>Frequency</th>
                <th>Doses Logged</th>
                <th>Adherence Status</th>
              </tr>
            </thead>
            <tbody>
              ${medsRows || '<tr><td colspan="5" style="text-align: center;">No registered medication logs.</td></tr>'}
            </tbody>
          </table>
        </div>

        <h2>Recent Patient-Logged Symptoms</h2>
        <div class="content-block">
          <table>
            <thead>
              <tr>
                <th>Date Logged</th>
                <th>Symptom Category</th>
                <th>Severity Score</th>
                <th>Patient Notes</th>
              </tr>
            </thead>
            <tbody>
              ${symptomsRows || '<tr><td colspan="4" style="text-align: center;">No logged symptoms listed.</td></tr>'}
            </tbody>
          </table>
        </div>

        <div class="footer">
          <p>This report compiles patient-generated logging evidence with clinical heuristics. Not a substitute for actual professional medical diagnoses.</p>
          <p>MediSense Secure Cryptographic Health Vault • Platform v4.2.0-Alpha</p>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const generateReport = async () => {
    setIsGenerating(true);
    setErrorText('');

    try {
      const response = await fetch('/api/gemini/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conditions: user.primaryConditions,
          vitals: user.vitals,
          loggedSymptoms: filteredSymptomLogs.map(l => ({
            type: l.symptomType,
            severity: l.severity,
            notes: l.notes,
            loggedAt: l.loggedAt
          })),
          medications: medications.map(m => ({
            name: m.name,
            dosage: m.dosage,
            times: m.times,
            remaining: m.remainingDoses,
            total: m.totalDoses
          })),
          documentTitles: filteredDocuments.map(d => d.title),
          wellnessHabits: filteredWellnessHabits.map(h => ({
            name: h.name,
            completed: h.completed,
            date: h.date
          })),
          dateRange: isDateFilterActive ? { startDate, endDate } : undefined
        })
      });

      if (!response.ok) {
        throw new Error('Progress report generation pipeline responded with error.');
      }

      const generated: Omit<MonthlyProgressReport, 'id' | 'userId' | 'month' | 'year' | 'generatedAt'> = await response.json();
      
      const newReport: MonthlyProgressReport = {
        id: 'report_' + Math.random().toString(36).substr(2, 9),
        userId: user.id,
        month: new Date().toLocaleString('default', { month: 'long' }),
        year: new Date().getFullYear(),
        healthScore: generated.healthScore,
        summary: generated.summary,
        trendDiagnosis: generated.trendDiagnosis,
        keyActionItems: generated.keyActionItems,
        recommendations: generated.recommendations,
        generatedAt: new Date().toISOString()
      };

      onAddReport(newReport);
      setSelectedReportId(newReport.id);
    } catch (err: any) {
      console.error(err);
      setErrorText(err.message || 'Error occurred while generating analytics.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Score Color helper
  const getScoreColor = (score: number) => {
    if (score >= 80) return { text: 'text-emerald-400', stroke: '#6366f1', bg: 'bg-emerald-500/10' };
    if (score >= 60) return { text: 'text-amber-400', stroke: '#f59e0b', bg: 'bg-amber-500/10' };
    return { text: 'text-rose-405', stroke: '#ef4444', bg: 'bg-rose-500/10' };
  };

  return (
    <div className="grid lg:grid-cols-12 gap-6">
      {/* Sidebar selection Column */}
      <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Historical Progress</p>
          <h3 className="text-lg font-display font-medium text-white">Monthly AI Reports</h3>
          <p className="text-xs text-slate-400 mt-1">Generate comprehensive tracking files powered by clinical logic.</p>
        </div>

        {errorText && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            {errorText}
          </div>
        )}

        {/* Date Range Picker Widget */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-3.5" id="report-date-range-scoping">
          <div className="flex items-center justify-between border-b border-slate-850 pb-2">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-indigo-400" />
              <span>Report Date Scoping</span>
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isDateFilterActive}
                onChange={(e) => setIsDateFilterActive(e.target.checked)}
                className="sr-only peer"
                id="toggle-date-filter"
              />
              <div className="w-7 h-4 bg-slate-800 rounded-full peer peer-focus:ring-0 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white"></div>
              <span className="ml-1.5 text-[9px] font-bold text-slate-400 peer-checked:text-indigo-400 select-none">
                {isDateFilterActive ? "Active" : "Disabled"}
              </span>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[9px] font-mono font-bold text-slate-500 uppercase">From Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setIsDateFilterActive(true);
                }}
                disabled={!isDateFilterActive}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-slate-200 text-[11px] font-semibold focus:outline-none focus:border-indigo-500 transition disabled:opacity-40 disabled:pointer-events-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-mono font-bold text-slate-500 uppercase">To Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setIsDateFilterActive(true);
                }}
                disabled={!isDateFilterActive}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-slate-200 text-[11px] font-semibold focus:outline-none focus:border-indigo-500 transition disabled:opacity-40 disabled:pointer-events-none"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-1 pt-1 border-t border-slate-850">
            <button
              onClick={() => {
                const today = new Date();
                const d = new Date();
                d.setDate(today.getDate() - 7);
                setStartDate(d.toISOString().split('T')[0]);
                setEndDate(today.toISOString().split('T')[0]);
                setIsDateFilterActive(true);
              }}
              disabled={!isDateFilterActive}
              className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-350 text-[9px] font-bold rounded-lg transition disabled:opacity-40 cursor-pointer"
            >
              7d
            </button>
            <button
              onClick={() => {
                const today = new Date();
                const d = new Date();
                d.setDate(today.getDate() - 30);
                setStartDate(d.toISOString().split('T')[0]);
                setEndDate(today.toISOString().split('T')[0]);
                setIsDateFilterActive(true);
              }}
              disabled={!isDateFilterActive}
              className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-350 text-[9px] font-bold rounded-lg transition disabled:opacity-40 cursor-pointer"
            >
              30d
            </button>
            <button
              onClick={() => {
                const today = new Date();
                const d = new Date();
                d.setDate(today.getDate() - 90);
                setStartDate(d.toISOString().split('T')[0]);
                setEndDate(today.toISOString().split('T')[0]);
                setIsDateFilterActive(true);
              }}
              disabled={!isDateFilterActive}
              className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-350 text-[9px] font-bold rounded-lg transition disabled:opacity-40 cursor-pointer"
            >
              90d
            </button>
            <button
              onClick={() => {
                const today = new Date();
                const start = new Date(today.getFullYear(), today.getMonth(), 1);
                setStartDate(start.toISOString().split('T')[0]);
                setEndDate(today.toISOString().split('T')[0]);
                setIsDateFilterActive(true);
              }}
              disabled={!isDateFilterActive}
              className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-350 text-[9px] font-bold rounded-lg transition disabled:opacity-40 cursor-pointer"
            >
              This Month
            </button>
          </div>
        </div>

        <div className="pt-1">
          <button
            onClick={exportFilteredSnapshotPDF}
            className="w-full bg-indigo-600/20 border border-indigo-500/30 hover:bg-indigo-600/30 text-indigo-100 text-xs font-bold py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
            id="download-report-btn"
          >
            <Download className="h-3.5 w-3.5 text-indigo-400" />
            <span>Download Report (PDF Snapshot)</span>
          </button>
          <p className="text-[10px] text-slate-500 mt-1.5 text-center leading-normal">
            Compiles currently filtered symptoms ({filteredSymptomLogs.length}), medications, and habits within the designated scope for medical records.
          </p>
        </div>

        <button
          onClick={generateReport}
          disabled={isGenerating}
          className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-bold py-3 px-4 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Analyzing Stored Health Data...</span>
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              <span>Compile Monthly Progress Report</span>
            </>
          )}
        </button>

        <div className="space-y-2 pt-4 border-t border-slate-800/50">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Report Catalog ({reports.length})</p>
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {reports.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">No monthly progress sheets generated yet.</p>
            ) : (
              [...reports].reverse().map((rep) => {
                const colorTheme = getScoreColor(rep.healthScore);
                return (
                  <button
                    key={rep.id}
                    onClick={() => setSelectedReportId(rep.id)}
                    className={`w-full p-3 rounded-2xl text-left border transition flex items-center justify-between cursor-pointer ${activeReport?.id === rep.id ? 'bg-slate-950 border-emerald-500/40 text-emerald-400' : 'bg-slate-950/40 border-slate-800/80 text-slate-400 hover:text-slate-300'}`}
                  >
                    <div className="space-y-0.5 truncate mr-3">
                      <p className="font-semibold text-white text-xs">{rep.month} Progress Summary</p>
                      <p className="text-[10px] text-slate-500">Compiled on {new Date(rep.generatedAt).toLocaleDateString()}</p>
                    </div>
                    <div className={`h-9 w-9 rounded-xl ${colorTheme.bg} border border-slate-800 flex items-center justify-center font-mono font-bold text-xs ${colorTheme.text} shrink-0`}>
                      {rep.healthScore}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Report Display details Column */}
      <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-sm space-y-6">
        {activeReport ? (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800/40 pb-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-505">Integrative Clinical Progress</span>
                <h3 className="text-xl font-display font-semibold text-white">{activeReport.month} {activeReport.year} Health File</h3>
                <p className="text-xs text-slate-400">Generated on {new Date(activeReport.generatedAt).toLocaleString()}</p>
              </div>

              <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
                {/* Direct Export Printable PDF Button */}
                <button
                  onClick={exportPDF}
                  className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-450 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.25)] border border-emerald-450/20"
                  id="direct-export-pdf-btn"
                >
                  <Printer className="h-3.5 w-3.5 text-slate-950" />
                  <span>Export Printable PDF</span>
                </button>

                {/* Download Menu Button */}
                <div className="relative">
                  <button
                    onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-[0_0_15px_rgba(79,70,229,0.25)] border border-indigo-500/30"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download Options</span>
                    <ChevronDown className="h-3 w-3" />
                  </button>

                  {showDownloadMenu && (
                    <>
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setShowDownloadMenu(false)}
                      />
                      <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#0a0a0a] border border-white/10 shadow-2xl p-2 z-50 space-y-1 backdrop-blur-xl">
                        <button
                          onClick={() => {
                            downloadCSV();
                            setShowDownloadMenu(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-left text-slate-300 hover:text-white hover:bg-white/5 transition cursor-pointer"
                        >
                          <FileSpreadsheet className="h-4 w-4 text-indigo-400 shrink-0" />
                          <div>
                            <p className="font-semibold text-slate-200 text-[11px]">Export as CSV Sheet</p>
                            <p className="text-[9px] text-slate-500">Adherence sheet & clinical tables</p>
                          </div>
                        </button>

                        <button
                          onClick={() => {
                            downloadTextSummary();
                            setShowDownloadMenu(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-left text-slate-300 hover:text-white hover:bg-white/5 transition cursor-pointer"
                        >
                          <FileText className="h-4 w-4 text-purple-400 shrink-0" />
                          <div>
                            <p className="font-semibold text-slate-200 text-[11px]">Export Formatted Text</p>
                            <p className="text-[9px] text-slate-500">Plain text medical layout file</p>
                          </div>
                        </button>

                        <button
                          onClick={() => {
                            exportPDF();
                            setShowDownloadMenu(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-left text-slate-300 hover:text-white hover:bg-white/5 transition cursor-pointer"
                        >
                          <Printer className="h-4 w-4 text-emerald-450 shrink-0" />
                          <div>
                            <p className="font-semibold text-slate-200 text-[11px]">Export Printable PDF</p>
                            <p className="text-[9px] text-emerald-400 font-bold font-mono">Dynamic direct PDF rendering</p>
                          </div>
                        </button>

                        <button
                          onClick={() => {
                            printPDF();
                            setShowDownloadMenu(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-left text-slate-300 hover:text-white hover:bg-white/5 transition cursor-pointer"
                        >
                          <Printer className="h-4 w-4 text-indigo-400 shrink-0" />
                          <div>
                            <p className="font-semibold text-slate-100 text-[11px]">Print Web Report Layout</p>
                            <p className="text-[9px] text-slate-500">Clinical clean formatted page</p>
                          </div>
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Arc gauge / SVG meter */}
                <div className="flex items-center gap-3 bg-slate-950 border border-slate-800/80 p-2.5 rounded-2xl shrink-0">
                  <div className="relative h-12 w-12 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="24" cy="24" r="20" stroke="#1e293b" strokeWidth="3" fill="transparent" />
                      <motion.circle 
                        cx="24" 
                        cy="24" 
                        r="20" 
                        stroke={getScoreColor(activeReport.healthScore).stroke} 
                        strokeWidth="3" 
                        fill="transparent" 
                        strokeDasharray={`${2 * Math.PI * 20}`} 
                        initial={{ strokeDashoffset: 2 * Math.PI * 20 }}
                        animate={{ strokeDashoffset: 2 * Math.PI * 20 * (1 - activeReport.healthScore / 100) }}
                        transition={{ duration: 1.2, ease: "easeOut", delay: 0.1 }}
                      />
                    </svg>
                    <span className={`absolute font-mono font-bold text-[13px] ${getScoreColor(activeReport.healthScore).text}`}>{activeReport.healthScore}</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block">Aggregate Score</span>
                    <span className="text-[10px] text-white font-medium">Trajectory stable</span>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Summary and Diagnosis */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
                  <Award className="h-4 w-4 text-emerald-400" />
                  <span>Interactive Health Synthesis</span>
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-4 rounded-2xl border border-slate-800/80">
                  {activeReport.summary}
                </p>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
                  <TrendingDown className="h-4 w-4 text-emerald-400" />
                  <span>Clinical Trend Analysis (Symptom Interdependence)</span>
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-4 rounded-2xl border border-slate-850/80 border-dashed">
                  {activeReport.trendDiagnosis}
                </p>
              </div>
            </div>

            {/* Blood Glucose Trajectory Trend Line Chart */}
            <motion.div 
              initial={{ opacity: 0, y: 35 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.65, ease: "easeOut" }}
              className="bg-slate-950 p-5 rounded-2xl border border-slate-800/80 space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/40 pb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-500/10 text-indigo-400 uppercase tracking-wider border border-indigo-500/20">Glycemic Trajectory</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${glycemicStatus.color}`}>
                      {glycemicStatus.label}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-white flex items-center gap-1.5 mt-1">
                    <Activity className="h-4 w-4 text-indigo-400 animate-pulse" />
                    <span>Monthly Blood Glucose Tracking Analysis</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 font-medium">Dynamic daily glucose coordinates in alignment with severity score metrics.</p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="bg-slate-900/60 border border-slate-800/40 px-2.5 py-1.5 rounded-xl text-center min-w-[70px]">
                    <span className="text-[8px] text-slate-500 font-bold block uppercase font-mono">Average</span>
                    <span className="text-xs font-bold text-white font-mono">{avgGlucose} <span className="text-[9px] font-normal text-slate-500">mg/dL</span></span>
                  </div>
                  <div className="bg-slate-900/60 border border-slate-800/40 px-2.5 py-1.5 rounded-xl text-center min-w-[70px]">
                    <span className="text-[8px] text-slate-500 font-bold block uppercase font-mono">Highest</span>
                    <span className="text-xs font-bold text-indigo-400 font-mono">{maxGlucose} <span className="text-[9px] font-normal text-slate-500">mg/dL</span></span>
                  </div>
                  <div className="bg-slate-900/60 border border-slate-800/40 px-2.5 py-1.5 rounded-xl text-center min-w-[70px]">
                    <span className="text-[8px] text-slate-500 font-bold block uppercase font-mono">Lowest</span>
                    <span className="text-xs font-bold text-emerald-400 font-mono">{minGlucose} <span className="text-[9px] font-normal text-slate-500">mg/dL</span></span>
                  </div>
                </div>
              </div>

              <div className="h-56 w-full text-xs">
                {glucoseData.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2 border border-dashed border-slate-800/60 rounded-xl bg-slate-900/10 p-5 text-center">
                    <Activity className="h-8 w-8 text-slate-600" />
                    <p className="font-semibold text-slate-400 text-xs">No Blood Glucose Logs Analyzed</p>
                    <p className="text-[10px] text-slate-500 max-w-xs leading-relaxed">
                      Add a metabolic level log on the Daily Tracker under &apos;Glucose&apos; symptom type to plot detailed compliance lines.
                    </p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={glucoseData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="dateStr" stroke="#64748b" fontSize={10} tickLine={false} />
                      <YAxis stroke="#64748b" fontSize={10} tickLine={false} domain={['auto', 'auto']} />
                      <Tooltip content={<CustomTooltip />} />
                      <ReferenceLine y={100} stroke="#10b981" strokeDasharray="3 3" strokeOpacity={0.3} label={{ value: 'Fasting Target (100)', fill: '#10b981', fontSize: 8, position: 'insideBottomRight' }} />
                      <ReferenceLine y={140} stroke="#f59e0b" strokeDasharray="3 3" strokeOpacity={0.3} label={{ value: 'Postprandial (140)', fill: '#f59e0b', fontSize: 8, position: 'insideTopRight' }} />
                      <Line
                        type="monotone"
                        dataKey="glucose"
                        name="Blood Glucose (mg/dL)"
                        stroke="#6366f1"
                        strokeWidth={3}
                        dot={{ fill: '#6366f1', stroke: '#ffffff', strokeWidth: 1.5, r: 3.5 }}
                        activeDot={{ r: 5, stroke: '#312e81', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </motion.div>

            {/* Weekly Medication Adherence Heatmap */}
            <motion.div 
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="bg-slate-950 p-5 rounded-3xl border border-slate-800/80 space-y-4"
              id="weekly-adherence-heatmap-section"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/40">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-400 uppercase tracking-wider border border-emerald-500/20">Therapy Adherence</span>
                  </div>
                  <h4 className="text-sm font-semibold text-white flex items-center gap-1.5 mt-1">
                    <Pill className="h-4 w-4 text-emerald-400" />
                    <span>Weekly Medication Adherence Heatmap</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 font-medium">A 7-day retrospective grid tracking completed doses to easily isolate inconsistent compliance days.</p>
                </div>

                {/* Grid legend */}
                <div className="flex flex-wrap items-center gap-3 bg-slate-900/40 border border-slate-850 p-2 rounded-xl text-[9px] text-slate-400">
                  <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-slate-800 border border-slate-705 block"></span><span>0% Missed</span></div>
                  <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500/25 border border-amber-500/40 block"></span><span>1-50% Partial</span></div>
                  <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500/50 border border-amber-500/60 block"></span><span>51-99% High</span></div>
                  <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 block"></span><span>100% Complete</span></div>
                </div>
              </div>

              {/* Day grid */}
              <div className="grid grid-cols-2 sm:grid-cols-7 gap-3">
                {weeklyAdherenceData.map((day) => {
                  let cellBg = "bg-slate-900/30 border-slate-850";
                  let textCol = "text-slate-400";
                  let indicatorLight = "bg-slate-850";
                  
                  if (day.rate === 100) {
                    cellBg = "bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/15";
                    textCol = "text-emerald-400";
                    indicatorLight = "bg-emerald-400";
                  } else if (day.rate > 50) {
                    cellBg = "bg-amber-500/20 border-amber-500/35 hover:bg-amber-500/25";
                    textCol = "text-amber-400";
                    indicatorLight = "bg-amber-500";
                  } else if (day.rate > 0) {
                    cellBg = "bg-amber-500/10 border-amber-500/25 hover:bg-amber-500/15";
                    textCol = "text-amber-550";
                    indicatorLight = "bg-amber-600";
                  } else if (day.totalScheduled > 0) {
                    cellBg = "bg-rose-500/5 border-rose-500/15 hover:bg-rose-500/10";
                    textCol = "text-rose-400";
                    indicatorLight = "bg-rose-500";
                  }

                  return (
                    <div 
                      key={day.dateStr} 
                      className={`relative border p-3 rounded-2xl flex flex-col justify-between h-24 transition-all ${cellBg}`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] text-slate-500 font-bold block">{day.dayName}</span>
                          <span className="text-[10px] text-slate-450 font-mono font-semibold">{day.dayDateStr}</span>
                        </div>
                        {/* Little pulsing indicator light if active */}
                        <span className={`w-1.5 h-1.5 rounded-full ${indicatorLight} ${day.rate === 0 && day.totalScheduled > 0 ? "animate-pulse font-bold" : ""}`} />
                      </div>

                      <div className="space-y-0.5">
                        <span className={`text-sm font-bold font-mono tracking-tight block ${textCol}`}>
                          {day.rate}%
                        </span>
                        <span className="text-[9px] text-slate-500/90 font-bold block">
                          {day.takenCount} of {day.totalScheduled} doses
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Alert note for gaps */}
              {weeklyAdherenceData.some(d => d.rate < 100) && (
                <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/5 border border-amber-500/20 rounded-xl text-[10px] text-amber-400 leading-normal">
                  <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0 animate-pulse" />
                  <span>Interactive Compliance Advisory: High-risk gaps or partial compliance detected within the past week. Please double check logs to stabilize medication velocity!</span>
                </div>
              )}
            </motion.div>

            {/* Recommendations layout */}
            <div className="grid grid-cols-2 gap-5">
              {/* Dietary */}
              <div className="space-y-2.5">
                <h5 className="text-xs font-bold text-slate-300 uppercase tracking-lighter flex items-center gap-1.5">
                  <Apple className="h-4 w-4 text-amber-400" />
                  <span>Proactive Diet modifications</span>
                </h5>
                <ul className="space-y-2">
                  {(activeReport.recommendations.dietary || []).map((diet, i) => (
                    <li key={i} className="text-[11px] text-slate-400 flex items-start gap-1.5 leading-relaxed bg-slate-950/40 p-2 rounded-xl border border-slate-800/30">
                      <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-400 rounded-md font-mono text-[9px] font-semibold">DIET</span>
                      <span>{diet}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Physical Activities */}
              <div className="space-y-2.5">
                <h5 className="text-xs font-bold text-slate-300 uppercase tracking-lighter flex items-center gap-1.5">
                  <Heart className="h-4 w-4 text-emerald-400" />
                  <span>Advised physical wellness</span>
                </h5>
                <ul className="space-y-2">
                  {(activeReport.recommendations.activities || []).map((act, i) => (
                    <li key={i} className="text-[11px] text-slate-400 flex items-start gap-1.5 leading-relaxed bg-slate-950/40 p-2 rounded-xl border border-slate-800/30">
                      <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-md font-mono text-[9px] font-semibold">MOVE</span>
                      <span>{act}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Action items checkboxes */}
            <div className="space-y-3 pt-2">
              <p className="text-xs font-semibold text-slate-300 uppercase tracking-widest">Next Month Action Checklist</p>
              <div className="grid md:grid-cols-3 gap-3">
                {(activeReport.keyActionItems || []).map((item, i) => (
                  <div key={i} className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs flex gap-2.5 items-start">
                    <input
                      type="checkbox"
                      className="mt-0.5 rounded border-slate-800 text-emerald-500 focus:ring-0 cursor-pointer h-4 w-4 bg-slate-950"
                    />
                    <span className="text-slate-300 leading-normal">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-3 py-16 border border-dashed border-slate-800 rounded-3xl bg-slate-950/20 text-center p-6">
            <Award className="h-12 w-12 text-slate-600 animate-pulse" />
            <div className="space-y-0.5">
              <p className="font-semibold text-slate-400 text-lg">No Monthly Reports Generated</p>
              <p className="text-xs text-slate-500 max-w-xs leading-relaxed mx-auto">
                Click &apos;Compile Monthly Progress Report&apos; on the left sidebar to prompt Gemini to automatically synthesize your historical symptoms logs, vital baselines, and chemical reports.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
