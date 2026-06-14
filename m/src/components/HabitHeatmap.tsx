import React, { useState, useMemo } from 'react';
import { WellnessHabit } from '../types';
import { 
  Flame, Sparkles, AlertCircle, Check, HelpCircle, 
  TrendingUp, CalendarRange, Trophy, RefreshCw, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface HabitHeatmapProps {
  wellnessHabits: WellnessHabit[];
  onToggleWellnessHabit: (habitName: string, dateStr: string) => void;
  selectedDate: string;
}

const HEATMAP_HABITS = [
  { name: 'Drank 2L Water', icon: '💧', colorClass: 'text-sky-400', bgClass: 'bg-sky-500/20 border-sky-500/30 text-sky-300', activeBg: 'bg-sky-600 border-sky-400 shadow-sky-500/20' },
  { name: '8 Hours Sleep', icon: '😴', colorClass: 'text-violet-400', bgClass: 'bg-violet-500/20 border-violet-500/30 text-violet-300', activeBg: 'bg-violet-600 border-violet-400 shadow-violet-500/20' },
  { name: 'No Sugar Treats', icon: '🥗', colorClass: 'text-emerald-400', bgClass: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300', activeBg: 'bg-emerald-600 border-emerald-400 shadow-emerald-500/20' },
  { name: 'Took Prescribed Dosage', icon: '💊', colorClass: 'text-rose-400', bgClass: 'bg-rose-500/20 border-rose-500/30 text-rose-300', activeBg: 'bg-rose-600 border-rose-400 shadow-rose-500/20' },
  { name: '30 Min Outdoor Walk', icon: '🚶', colorClass: 'text-amber-400', bgClass: 'bg-amber-500/20 border-amber-500/30 text-amber-300', activeBg: 'bg-amber-600 border-amber-400 shadow-amber-500/20' },
  { name: 'Logged Daily Vitals', icon: '📊', colorClass: 'text-teal-405', bgClass: 'bg-teal-500/20 border-teal-500/30 text-teal-300', activeBg: 'bg-teal-600 border-teal-400 shadow-teal-500/20' },
  { name: '10 Min Mindful Breathing', icon: '🧘', colorClass: 'text-fuchsia-400', bgClass: 'bg-fuchsia-500/20 border-fuchsia-500/30 text-fuchsia-300', activeBg: 'bg-fuchsia-600 border-fuchsia-400 shadow-fuchsia-500/20' }
];

export default function HabitHeatmap({ 
  wellnessHabits, 
  onToggleWellnessHabit, 
  selectedDate 
}: HabitHeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<{
    habitName: string;
    dateStr: string;
    label: string;
    completed: boolean;
  } | null>(null);

  // Generate the last 7 days chronologically (ending with Today)
  const last7Days = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dateStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('default', { weekday: 'short' });
      const dayNum = d.getDate();
      
      const todayStr = new Date().toISOString().split('T')[0];
      const isToday = dateStr === todayStr;
      
      return {
        dateStr,
        dayName,
        dayNum,
        isToday,
        label: isToday ? 'Today' : `${dayName} ${dayNum}`
      };
    });
  }, []);

  // Compute Habit metrics for the last 7 days
  const metrics = useMemo(() => {
    let totalSlots = 7 * HEATMAP_HABITS.length;
    let completedSlots = 0;
    let perfectDaysCount = 0;
    
    // Track count completed by habit name to find longest streak or highest completed
    const completionByHabit: Record<string, number> = {};
    
    last7Days.forEach(day => {
      let completedOnDay = 0;
      HEATMAP_HABITS.forEach(habit => {
        const isCompleted = wellnessHabits.some(
          h => h.name === habit.name && h.date === day.dateStr && h.completed
        );
        if (isCompleted) {
          completedSlots++;
          completedOnDay++;
          completionByHabit[habit.name] = (completionByHabit[habit.name] || 0) + 1;
        }
      });
      if (completedOnDay === HEATMAP_HABITS.length) {
        perfectDaysCount++;
      }
    });

    const completionRate = Math.round((completedSlots / totalSlots) * 100) || 0;
    
    // Find highest performing habit this week
    let topHabitName = 'None';
    let topHabitCount = 0;
    HEATMAP_HABITS.forEach(h => {
      const count = completionByHabit[h.name] || 0;
      if (count > topHabitCount) {
        topHabitCount = count;
        topHabitName = h.name;
      }
    });

    return {
      completionRate,
      perfectDaysCount,
      topHabitName,
      topHabitCount,
      completedSlots
    };
  }, [wellnessHabits, last7Days]);

  // Helper to check if a specific habit was completed on a specific day
  const isHabitCompleted = (habitName: string, dateStr: string) => {
    return wellnessHabits.some(h => h.name === habitName && h.date === dateStr && h.completed);
  };

  // Helper to count completed habits for a specific day
  const getDayCompletionCount = (dateStr: string) => {
    return HEATMAP_HABITS.filter(habit => isHabitCompleted(habit.name, dateStr)).length;
  };

  // Sound chime creator for success feedbacks
  const playToggleSound = (success: boolean) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (success) {
        // High soft chime
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.frequency.setValueAtTime(880.00, audioCtx.currentTime + 0.08); // A5
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.005, audioCtx.currentTime + 0.25);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.25);
      } else {
        // Descending quiet tone
        osc.frequency.setValueAtTime(329.63, audioCtx.currentTime); // E4
        osc.frequency.setValueAtTime(261.63, audioCtx.currentTime + 0.1); // C4
        gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.005, audioCtx.currentTime + 0.2);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.2);
      }
    } catch {}
  };

  return (
    <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-4 md:p-5 space-y-4" id="habit-heatmap-root">
      
      {/* Heatmap header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/30 pb-3">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-500/10 p-1.5 rounded-lg border border-indigo-500/20">
            <Flame className="h-4 w-4 text-orange-500 animate-pulse fill-orange-500" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">7-Day Consistency Matrix</h4>
            <p className="text-[10px] text-slate-400">Visual mapping of habits over the past 7 days. Tap any box to record status.</p>
          </div>
        </div>

        {/* Heatmap color guide index */}
        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400" id="heatmap-color-index">
          <span>Incomplete</span>
          <div className="flex gap-1">
            <div className="w-3.5 h-3.5 rounded bg-slate-950 border border-slate-800" />
            <div className="w-3.5 h-3.5 rounded bg-indigo-500/20 border border-indigo-500/30" />
            <div className="w-3.5 h-3.5 rounded bg-indigo-500/40" />
            <div className="w-3.5 h-3.5 rounded bg-indigo-500/60" />
            <div className="w-3.5 h-3.5 rounded bg-indigo-600 shadow-md shadow-indigo-500/10" />
          </div>
          <span className="text-indigo-400 font-bold">100% Habit Streak</span>
        </div>
      </div>

      {/* Grid containing heatmap & information cards */}
      <div className="grid lg:grid-cols-12 gap-4">
        
        {/* Heatmap Matrix table (span 9) */}
        <div className="lg:col-span-9 overflow-x-auto pb-2 lg:pb-0" id="heatmap-matrix-wrapper">
          <div className="min-w-[620px] space-y-2">
            
            {/* Table Header: Abbreviated dates */}
            <div className="grid grid-cols-12 gap-1 pb-1">
              {/* Spacer for habits title column */}
              <div className="col-span-5 text-[10px] uppercase tracking-wider text-slate-500 font-bold font-mono pl-2">
                Routine Habit Name
              </div>
              
              {/* Day headers */}
              {last7Days.map((day) => (
                <div 
                  key={day.dateStr} 
                  className={`col-span-1 text-center flex flex-col items-center justify-center p-1 rounded-lg ${
                    day.isToday 
                      ? 'bg-indigo-500/10 border border-indigo-500/25 text-indigo-300' 
                      : 'text-slate-400'
                  }`}
                >
                  <span className="text-[9px] uppercase font-bold font-mono block leading-none">
                    {day.dayName}
                  </span>
                  <span className="text-xs font-semibold leading-none mt-1 font-mono">
                    {day.dayNum}
                  </span>
                </div>
              ))}
            </div>

            {/* Matrix Rows: 1 per habit */}
            <div className="space-y-1.5" id="heatmap-rows-container">
              {HEATMAP_HABITS.map((habit) => (
                <div 
                  key={habit.name} 
                  className="grid grid-cols-12 gap-1 items-center bg-slate-950/20 hover:bg-slate-950/55 p-1 rounded-xl transition duration-150"
                >
                  
                  {/* Row descriptor (span 5) */}
                  <div className="col-span-5 flex items-center gap-2 pl-1">
                    <span className="text-sm shrink-0" role="img" aria-label={habit.name}>
                      {habit.icon}
                    </span>
                    <span className="text-slate-200 text-xs font-medium truncate" title={habit.name}>
                      {habit.name}
                    </span>
                  </div>

                  {/* 7 Interactive Day cells */}
                  {last7Days.map((day) => {
                    const completed = isHabitCompleted(habit.name, day.dateStr);
                    const isSelectedDate = selectedDate === day.dateStr;

                    // Compute dynamic interactive styling
                    let cellStyle = "bg-slate-950/80 border border-slate-800 hover:border-slate-700 hover:bg-slate-900";
                    if (completed) {
                      cellStyle = `${habit.activeBg} text-white shadow-sm`;
                    } else if (isSelectedDate) {
                      cellStyle = "bg-slate-950/80 border-2 border-indigo-500/40 hover:border-indigo-400";
                    }

                    return (
                      <div key={day.dateStr} className="col-span-1 flex justify-center">
                        <button
                          onClick={() => {
                            onToggleWellnessHabit(habit.name, day.dateStr);
                            playToggleSound(!completed);
                          }}
                          onMouseEnter={() => setHoveredCell({
                            habitName: habit.name,
                            dateStr: day.dateStr,
                            label: day.label,
                            completed
                          })}
                          onMouseLeave={() => setHoveredCell(null)}
                          className={`w-8 h-8 md:w-9 md:h-9 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer text-xs relative ${cellStyle}`}
                          title={`${habit.name} on ${day.label}: ${completed ? 'Completed' : 'Pending'}`}
                          id={`heatmap-cell-${habit.name.replace(/\s+/g, '-')}-${day.dateStr}`}
                        >
                          {completed ? (
                            <motion.div
                              initial={{ scale: 0.6, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                            >
                              <Check className="h-3.5 w-3.5 stroke-[3.5]" />
                            </motion.div>
                          ) : (
                            <span className="text-[9px] text-slate-700 font-bold opacity-0 hover:opacity-100 group-hover:opacity-100">
                              +
                            </span>
                          )}

                          {/* Glow overlay for today */}
                          {day.isToday && !completed && (
                            <span className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
                          )}
                        </button>
                      </div>
                    );
                  })}

                </div>
              ))}
            </div>

            {/* Matrix Footer: Daily Intensity Indicators */}
            <div className="grid grid-cols-12 gap-1 pt-1.5 border-t border-slate-900">
              <div className="col-span-5 text-[9px] uppercase tracking-wider text-slate-500 font-bold font-mono pl-2 flex items-center">
                <span>Daily Intensity Index:</span>
              </div>

              {last7Days.map((day) => {
                const count = getDayCompletionCount(day.dateStr);
                const percent = Math.round((count / HEATMAP_HABITS.length) * 100);

                let badgeColor = "bg-slate-955 text-slate-500 border border-slate-900";
                if (count === HEATMAP_HABITS.length) {
                  badgeColor = "bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/10";
                } else if (count >= 4) {
                  badgeColor = "bg-indigo-600/40 text-indigo-200 border border-indigo-500/20";
                } else if (count >= 1) {
                  badgeColor = "bg-slate-900 text-slate-300 border border-slate-800";
                }

                return (
                  <div key={day.dateStr} className="col-span-1 flex flex-col items-center">
                    <span 
                      className={`px-1.5 py-0.5 rounded-lg text-[9px] font-mono font-medium block text-center min-w-[24px] ${badgeColor}`}
                      title={`${count} of ${HEATMAP_HABITS.length} habits completed (${percent}%)`}
                    >
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>

          </div>
        </div>

        {/* Dynamic Analytics & Info Column (span 3) */}
        <div className="lg:col-span-3 bg-slate-950/60 rounded-2xl border border-slate-900 p-3.5 flex flex-col justify-between space-y-3.5" id="heatmap-sidebar">
          
          <div className="space-y-2.5">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block font-mono">
              Consistency Metrics
            </span>

            {/* Linear Weekly Rate Gauges */}
            <div className="space-y-1.5 bg-slate-900/40 p-2.5 rounded-xl border border-slate-850">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400 font-medium">Weekly Rate</span>
                <span className="font-mono text-indigo-400 font-bold">{metrics.completionRate}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full transition-all duration-500"
                  style={{ width: `${metrics.completionRate}%` }}
                />
              </div>
              <span className="text-[9px] text-slate-500 block leading-tight font-mono">
                {metrics.completedSlots} of {7 * HEATMAP_HABITS.length} logs completed
              </span>
            </div>

            {/* Dynamic Streaks & Star Achievements in Sidebar */}
            <div className="space-y-2 text-xs">
              
              <div className="flex items-center gap-2.5 p-2 bg-slate-900/30 rounded-xl border border-slate-900">
                <div className="bg-amber-500/10 p-1.5 rounded-lg text-amber-400 border border-amber-500/20">
                  <Trophy className="h-3.5 w-3.5" />
                </div>
                <div>
                  <span className="text-[9px] text-slate-505 uppercase tracking-wider block font-bold font-mono">Perfect Days</span>
                  <p className="text-slate-200 font-semibold">{metrics.perfectDaysCount} / 7 Days</p>
                </div>
              </div>

              {metrics.topHabitCount > 0 ? (
                <div className="flex items-center gap-2.5 p-2 bg-slate-900/30 rounded-xl border border-slate-900">
                  <div className="bg-emerald-500/10 p-1.5 rounded-lg text-emerald-400 border border-emerald-500/20">
                    <Zap className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[9px] text-slate-505 uppercase tracking-wider block font-bold font-mono">Top Routine Habit</span>
                    <p className="text-slate-200 font-semibold truncate text-[11px]">{metrics.topHabitName}</p>
                    <span className="text-[9px] text-slate-500 font-mono">Logged {metrics.topHabitCount}x this week</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 p-2 bg-slate-900/20 rounded-xl border border-slate-900 text-slate-500 italic">
                  <span className="text-[10px]">No habit logs detected this calendar cycle.</span>
                </div>
              )}

            </div>
          </div>

          {/* Interactive Cell Info Tooltip Banner */}
          <div className="border-t border-slate-900 pt-2.5">
            <AnimatePresence mode="wait">
              {hoveredCell ? (
                <motion.div 
                  key="hovered"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="bg-indigo-950/20 border border-indigo-900/30 rounded-xl p-2.5 text-center space-y-1"
                >
                  <p className="text-[10px] text-indigo-400 font-mono font-bold uppercase tracking-wider leading-none">
                    {hoveredCell.label}
                  </p>
                  <p className="text-xs font-semibold text-white truncate max-w-full">
                    {hoveredCell.habitName}
                  </p>
                  <span className={`inline-block text-[9px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                    hoveredCell.completed 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                      : 'bg-slate-900 text-slate-400 border border-slate-800'
                  }`}>
                    {hoveredCell.completed ? 'Completed ✓' : 'Pending +'}
                  </span>
                </motion.div>
              ) : (
                <motion.div 
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-2.5 text-center text-[10px] text-slate-500 italic leading-relaxed"
                >
                  💡 Tip: Consistent self-care dampens chronic glycemic & blood pressure spikes. Complete daily lists to stabilize vital metrics!
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>

      </div>

    </div>
  );
}
