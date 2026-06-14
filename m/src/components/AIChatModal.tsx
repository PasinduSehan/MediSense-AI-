import React, { useState, useRef, useEffect } from 'react';
import { User, SymptomLog, Medication } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, Send, Loader2, Bot, User as UserIcon, AlertTriangle, ShieldCheck, HelpCircle } from 'lucide-react';

interface AIChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  medications: Medication[];
  symptomLogs: SymptomLog[];
}

interface Message {
  id: string;
  sender: 'user' | 'model';
  text: string;
  timestamp: string;
}

export default function AIChatModal({ isOpen, onClose, user, medications, symptomLogs }: AIChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize with a customized warm welcome message incorporating patient context
  useEffect(() => {
    if (messages.length === 0) {
      const activeMeds = medications.filter(m => m.active).map(m => m.name);
      const conditions = user.primaryConditions;
      
      let contextTip = '';
      if (conditions.length > 0) {
        contextTip += ` for managing your ${conditions.join(', ')}`;
      }
      if (activeMeds.length > 0) {
        contextTip += `, and reviewed your active medications: ${activeMeds.slice(0, 3).join(', ')}`;
      }

      setMessages([
        {
          id: 'welcome_' + Date.now(),
          sender: 'model',
          text: `Hello ${user.name}! I am **MediSense AI**, your patient-counseling assistant.\n\nI have loaded your clinical profile${contextTip}. How can I assist you with your treatment, dosage questions, potential drug interactions, or symptom trends today?`,
          timestamp: new Date().toISOString()
        }
      ]);
    }
  }, [user, medications, messages.length]);

  // Handle auto-scroll to the bottom of the chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const rawMsg = textToSend !== undefined ? textToSend : inputMessage;
    const msg = rawMsg.trim();
    if (!msg || isLoading) return;

    if (textToSend === undefined) {
      setInputMessage('');
    }

    const userMsgId = 'msg_' + Date.now() + '_user';
    const newUserMsg: Message = {
      id: userMsgId,
      sender: 'user',
      text: msg,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, newUserMsg]);
    setIsLoading(true);

    try {
      // Gather relevant client metrics for the AI backend
      const activeMeds = medications.map(m => ({
        name: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
        active: m.active
      }));

      const logsParsed = symptomLogs.slice(-15).map(l => ({
        type: l.symptomType,
        severity: l.severity,
        notes: l.notes || '',
        loggedAt: l.loggedAt
      }));

      // Call our server endpoint
      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          history: messages.map(m => ({
            sender: m.sender,
            text: m.text
          })),
          patientProfile: {
            name: user.name,
            age: user.age,
            gender: user.gender,
            conditions: user.primaryConditions,
            vitals: {
              bp: `${user.vitals.bloodPressureSys}/${user.vitals.bloodPressureDia}`,
              glucose: user.vitals.bloodGlucose,
              heart: user.vitals.heartRate
            }
          },
          medications: activeMeds,
          symptomLogs: logsParsed
        })
      });

      if (!response.ok) {
        throw new Error('AI consultation channel responded with an error.');
      }

      const data = await response.json();
      const modelMsgId = 'msg_' + Date.now() + '_model';
      
      setMessages(prev => [
        ...prev,
        {
          id: modelMsgId,
          sender: 'model',
          text: data.reply || 'I am having trouble parsing my diagnostic thoughts right now. Please restate your query.',
          timestamp: new Date().toISOString()
        }
      ]);
    } catch (error: any) {
      console.error('Chat error:', error);
      const errorMsgId = 'msg_' + Date.now() + '_err';
      setMessages(prev => [
        ...prev,
        {
          id: errorMsgId,
          sender: 'model',
          text: `⚠️ **Network Error:** I'm having trouble reaching the clinical AI backend. Please check your network connection and try again.`,
          timestamp: new Date().toISOString()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to render text with clean basic markdown styling (bolding, linebreaks, bullets)
  const renderMessageContent = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      let content: React.ReactNode = line;

      // Handle bullet points
      const trimmed = line.trim();
      const isBullet = trimmed.startsWith('* ') || trimmed.startsWith('- ');
      const displayLine = isBullet ? trimmed.substring(2) : line;

      // Find bold patterns **word**
      const parts = displayLine.split('**');
      if (parts.length > 1) {
        content = parts.map((part, pIdx) => {
          if (pIdx % 2 === 1) {
            return <strong key={pIdx} className="font-bold text-white tracking-wide">{part}</strong>;
          }
          return part;
        });
      }

      if (isBullet) {
        return (
          <li key={idx} className="list-disc ml-5 my-1 text-slate-300 leading-relaxed text-xs">
            {content}
          </li>
        );
      }

      return (
        <p key={idx} className={`leading-relaxed text-xs text-slate-300 ${trimmed === '' ? 'h-3' : 'my-1.5'}`}>
          {content}
        </p>
      );
    });
  };

  const suggestions = [
    { label: 'Check my drug drug interaction risks', search: 'Check my active medications for any adverse drug interactions' },
    { label: 'Summarize my recent symptoms', search: 'Identify trends and triggers in my recent symptom history' },
    { label: 'Suggest lifestyle & dietary steps', search: 'List dietary and routine guidelines for my primary conditions' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop Mask */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 z-60 backdrop-blur-sm"
          />

          {/* Floating Chat Panel Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 50, right: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 50 }}
            className="fixed bottom-6 right-6 z-70 w-full max-w-[420px] h-[580px] bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
            id="medisense-chat-panel"
          >
            {/* Header Section */}
            <header className="bg-slate-900 border-b border-slate-800 px-5 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-[0_0_15px_rgba(79,70,229,0.5)]">
                  <Sparkles className="h-4.5 w-4.5 text-white animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-display font-semibold text-white flex items-center gap-1">
                    <span>MediSense AI Chat</span>
                    <span className="text-[9px] uppercase tracking-wider bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded-md text-indigo-400 font-bold font-mono">
                      Safe Mode
                    </span>
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono">Empathetic Medical Counselor</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl border border-transparent hover:border-slate-800 hover:bg-slate-950 text-slate-400 hover:text-white transition cursor-pointer"
                id="close-chat-btn"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            {/* Chat Dialog Space */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
              {messages.map((message) => {
                const isAI = message.sender === 'model';
                return (
                  <div key={message.id} className={`flex gap-3 max-w-[85%] ${isAI ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}>
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isAI ? 'bg-indigo-500/15 border border-indigo-500/20 text-indigo-400' : 'bg-white/5 border border-white/5 text-slate-300'}`}>
                      {isAI ? <Bot className="h-4 w-4" /> : <UserIcon className="h-4 w-4" />}
                    </div>
                    <div className="space-y-1">
                      <div className={`p-3.5 rounded-2xl border ${isAI ? 'bg-slate-900/60 border-slate-800/80 rounded-tl-sm' : 'bg-indigo-600 text-white border-indigo-500/20 rounded-tr-sm shadow-[0_0_15px_rgba(79,70,229,0.15)]'}`}>
                        {renderMessageContent(message.text)}
                      </div>
                      <span className={`text-[8px] font-mono block text-slate-500 ${isAI ? 'text-left' : 'text-right'}`}>
                        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })}

              {isLoading && (
                <div className="flex gap-3 mr-auto max-w-[85%]">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/15 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 animate-spin">
                    <Loader2 className="h-4 w-4" />
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 rounded-tl-sm">
                    <p className="text-xs text-slate-400 italic flex items-center gap-2">
                      <span>Synthesizing pharmacological and symptomatic records...</span>
                    </p>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Suggestions Chips Board */}
            {messages.length === 1 && !isLoading && (
              <div className="px-5 py-2 space-y-1.5 border-t border-slate-800/40 shrink-0 bg-slate-950">
                <p className="text-[9px] uppercase tracking-widest text-slate-500 font-mono font-bold flex items-center gap-1">
                  <HelpCircle className="h-3 w-3" />
                  <span>Interactive Quick Inquiries</span>
                </p>
                <div className="flex flex-col gap-1.5">
                  {suggestions.map((sug, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(sug.search)}
                      className="w-full text-left bg-slate-900 hover:bg-indigo-650/10 border border-slate-800 hover:border-indigo-500/30 text-[11px] text-slate-350 hover:text-white px-3 py-1.5 rounded-xl transition cursor-pointer truncate"
                    >
                      💡 {sug.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Interactive Safety Advisory row */}
            <div className="px-5 py-2 bg-rose-500/5 border-t border-slate-800/45 shrink-0 flex items-center gap-2 text-rose-455 text-[9px] leading-relaxed">
              <AlertTriangle className="h-3 w-3 text-rose-400 shrink-0" />
              <span><strong>Patient Advisory:</strong> Educational purposes only. Please consult a qualified clinical professional for diagnostics or dosing.</span>
            </div>

            {/* Input Action Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="bg-slate-900 border-t border-slate-800 p-3 flex gap-2 items-center shrink-0"
              id="medisense-chat-form"
            >
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask about medications, risks, side effects, or symptoms..."
                disabled={isLoading}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition disabled:opacity-50"
                id="chat-input-field"
              />
              <button
                type="submit"
                disabled={isLoading || !inputMessage.trim()}
                className="p-2 h-9 w-9 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold transition flex items-center justify-center shrink-0 cursor-pointer shadow-[0_0_10px_rgba(79,70,229,0.3)]"
                id="send-chat-message-btn"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
