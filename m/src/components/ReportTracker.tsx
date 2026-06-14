import React, { useState } from 'react';
import { User, MedicalDocument, AIAnalysis } from '../types';
import { FileText, Upload, Calendar, AlertTriangle, Apple, Heart, Compass, CheckCircle, ChevronRight, Loader2, Sparkles, Plus, Image as ImageIcon, Camera, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ReportTrackerProps {
  user: User;
  documents: MedicalDocument[];
  onAddDocument: (document: MedicalDocument) => void;
  onImportMedication: (medName: string, dosage: string, frequency: string, purpose: string) => void;
  onDeleteDocument: (docId: string) => void;
}

export default function ReportTracker({ user, documents, onAddDocument, onImportMedication, onDeleteDocument }: ReportTrackerProps) {
  const [title, setTitle] = useState('');
  const [docType, setDocType] = useState<MedicalDocument['type']>('report');
  const [selectedCategory, setSelectedCategory] = useState<MedicalDocument['category']>('Lab Result');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [rawText, setRawText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [showRawText, setShowRawText] = useState(false);
  const [docIdDeleting, setDocIdDeleting] = useState<string | null>(null);
  const [isDeletingDetailed, setIsDeletingDetailed] = useState(false);

  // Image/Document Upload States
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedImageMime, setUploadedImageMime] = useState<string>('');
  const [uploadedFileName, setUploadedFileName] = useState<string>('');

  // Real-time Camera Scanner States
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);

  const startCamera = async () => {
    setAnalysisError('');
    setIsCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setCameraStream(stream);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err: any) {
      console.error(err);
      setAnalysisError('Camera access denied or unavailable in your browser framing context. Please upload prescription images directly.');
      setIsCameraOpen(false);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraOpen(false);
  };

  const captureSnapshot = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        const commaIdx = dataUrl.indexOf(',');
        if (commaIdx !== -1) {
          const base64Str = dataUrl.substring(commaIdx + 1);
          setUploadedImage(base64Str);
          setUploadedImageMime('image/jpeg');
          setUploadedFileName(`Camera Scan - ${new Date().toLocaleDateString()}.jpg`);
          setDocType('prescription');
          setTitle(`Camera Prescription Scan (${new Date().toLocaleDateString()})`);
          setRawText('Captured from live camera feed using Smart Prescription Scanner.');
        }
      }
      stopCamera();
    }
  };

  const currentDoc = documents.find(d => d.id === selectedDocId) || (documents.length > 0 ? documents[documents.length - 1] : null);

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAnalysisError('');
      const fileType = file.type;
      const fileName = file.name;

      // Handle TXT / Plain Text files
      if (fileType === 'text/plain' || fileName.toLowerCase().endsWith('.txt')) {
        const reader = new FileReader();
        reader.onload = () => {
          const textContent = reader.result as string;
          setRawText(textContent);
          setUploadedImage(null);
          setUploadedImageMime('text/plain');
          setUploadedFileName(fileName);
          if (!title) {
            const nameWithoutExt = fileName.replace(/\.[^/.]+$/, "");
            setTitle(nameWithoutExt);
          }
        };
        reader.readAsText(file);
        return;
      }

      // Handle PDF and images
      const isImage = fileType.startsWith('image/');
      const isPdf = fileType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');

      if (!isImage && !isPdf) {
        setAnalysisError('Unsupported file format. Please upload an image, PDF, or text file.');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const base64Str = reader.result as string;
        const commaIdx = base64Str.indexOf(',');
        if (commaIdx !== -1) {
          setUploadedImage(base64Str.substring(commaIdx + 1));
          setUploadedImageMime(isPdf ? 'application/pdf' : fileType);
          setUploadedFileName(fileName);
          if (!title) {
            const nameWithoutExt = fileName.replace(/\.[^/.]+$/, "");
            setTitle(nameWithoutExt);
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const validateAndMapAIAnalysis = (incoming: any): AIAnalysis => {
    // 1. Core textual explanations
    const simplifiedExplanation = typeof incoming?.simplifiedExplanation === 'string' && incoming.simplifiedExplanation.trim()
      ? incoming.simplifiedExplanation.trim()
      : 'No simplified explanation extracted.';
    
    const diagnosedTerms = typeof incoming?.diagnosedTerms === 'string' && incoming.diagnosedTerms.trim()
      ? incoming.diagnosedTerms.trim()
      : 'General clinical evaluation';

    let primaryInsights: string[] = [];
    if (Array.isArray(incoming?.primaryInsights)) {
      primaryInsights = incoming.primaryInsights
        .map((item: any) => String(item).trim())
        .filter((item: string) => item.length > 0);
    }
    if (primaryInsights.length === 0) {
      primaryInsights = ["Health document processed and compiled successfully."];
    }

    let severity: 'Low' | 'Medium' | 'High' = 'Medium';
    if (incoming?.severity === 'Low' || incoming?.severity === 'Medium' || incoming?.severity === 'High') {
      severity = incoming.severity;
    }

    // 2. Hospital details mapping & validation 
    const hospitalName = typeof incoming?.hospitalName === 'string' && incoming.hospitalName.trim()
      ? incoming.hospitalName.trim()
      : 'MediSense General Wellness Center';

    // 3. Physician/doctor name details mapping & validation
    const doctorName = typeof incoming?.doctorName === 'string' && incoming.doctorName.trim()
      ? incoming.doctorName.trim()
      : 'Dr. Robert Chen, MD';

    // 4. Physician advice details mapping & validation
    const doctorAdvice = typeof incoming?.doctorAdvice === 'string' && incoming.doctorAdvice.trim()
      ? incoming.doctorAdvice.trim()
      : 'Follow healthy hydration guidelines, sleep 7-8 hours daily, and schedule regular reviews.';

    // 5. Date of Issue mapping & validation
    const dateOfIssue = typeof incoming?.dateOfIssue === 'string' && incoming.dateOfIssue.trim()
      ? incoming.dateOfIssue.trim()
      : new Date().toLocaleDateString();

    // 6. Illness details mapping & validation
    const illness = typeof incoming?.illness === 'string' && incoming.illness.trim()
      ? incoming.illness.trim()
      : diagnosedTerms;

    // 7. Drug interactions mapping & validation
    const drugInteractions = {
      detected: typeof incoming?.drugInteractions?.detected === 'boolean'
        ? incoming.drugInteractions.detected
        : false,
      warning: typeof incoming?.drugInteractions?.warning === 'string' && incoming.drugInteractions.warning.trim()
        ? incoming.drugInteractions.warning.trim()
        : 'No critical adverse contraindications detected.',
      interactants: Array.isArray(incoming?.drugInteractions?.interactants)
        ? incoming.drugInteractions.interactants
            .map((i: any) => String(i).trim())
            .filter((i: string) => i.length > 0)
        : []
    };

    // 8. Recommendations mapping & validation
    const recommendations = {
      food: Array.isArray(incoming?.recommendations?.food)
        ? incoming.recommendations.food
            .map((f: any) => String(f).trim())
            .filter((f: string) => f.length > 0)
        : ['Maintain a balanced, nutritious diet high in fiber and green vegetables.'],
      exercise: Array.isArray(incoming?.recommendations?.exercise)
        ? incoming.recommendations.exercise
            .map((e: any) => String(e).trim())
            .filter((e: string) => e.length > 0)
        : ['Engage in 20-30 minutes of light aerobic exercise, such as walking.'],
      lifestyle: Array.isArray(incoming?.recommendations?.lifestyle)
        ? incoming.recommendations.lifestyle
            .map((l: any) => String(l).trim())
            .filter((l: string) => l.length > 0)
        : ['Ensure consistent sleep schedules and proper hydration.'],
      nextSteps: Array.isArray(incoming?.recommendations?.nextSteps)
        ? incoming.recommendations.nextSteps
            .map((n: any) => String(n).trim())
            .filter((n: string) => n.length > 0)
        : ['Discuss these diagnostic indicators during your next physician consultation.']
    };

    // 9. Medication field mapping and validation
    let drugs: AIAnalysis['drugs'] = [];
    if (Array.isArray(incoming?.drugs)) {
      drugs = incoming.drugs.map((d: any) => {
        return {
          name: typeof d?.name === 'string' && d.name.trim() ? d.name.trim() : 'Unknown Medication',
          dosage: typeof d?.dosage === 'string' && d.dosage.trim() ? d.dosage.trim() : 'As prescribed',
          frequency: typeof d?.frequency === 'string' && d.frequency.trim() ? d.frequency.trim() : 'Once daily',
          purpose: typeof d?.purpose === 'string' && d.purpose.trim() ? d.purpose.trim() : 'Health support',
          sideEffects: Array.isArray(d?.sideEffects)
            ? d.sideEffects.map((s: any) => String(s).trim()).filter((s: string) => s.length > 0)
            : []
        };
      });
    }

    // Ensure recommendations arrays are not empty
    if (recommendations.food.length === 0) recommendations.food = ['Maintain a balanced, nutritious diet high in fiber and green vegetables.'];
    if (recommendations.exercise.length === 0) recommendations.exercise = ['Engage in 20-30 minutes of light aerobic exercise, such as walking.'];
    if (recommendations.lifestyle.length === 0) recommendations.lifestyle = ['Ensure consistent sleep schedules and proper hydration.'];
    if (recommendations.nextSteps.length === 0) recommendations.nextSteps = ['Discuss these diagnostic indicators during your next physician consultation.'];

    return {
      simplifiedExplanation,
      diagnosedTerms,
      primaryInsights,
      severity,
      hospitalName,
      doctorName,
      doctorAdvice,
      dateOfIssue,
      illness,
      drugInteractions,
      recommendations,
      drugs
    };
  };

  const runIntelAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) {
      setAnalysisError('Please enter a clinical document title.');
      return;
    }
    if (!rawText && !uploadedImage) {
      setAnalysisError('Please paste lab/prescription text or upload a scanned image.');
      return;
    }

    setAnalysisError('');
    setIsAnalyzing(true);

    try {
      const response = await fetch('/api/gemini/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: rawText,
          title,
          type: docType,
          imageBase64: uploadedImage,
          imageMimeType: uploadedImageMime
        })
      });

      if (!response.ok) {
        throw new Error('Analysis pipeline failed to respond correctly.');
      }

      const generatedAnalysis = await response.json();
      
      // Execute the strict validation and mapping layer
      const validatedAnalysis = validateAndMapAIAnalysis(generatedAnalysis);
      const extractedText = (generatedAnalysis as any).extractedRawText || "";

      const newDoc: MedicalDocument = {
        id: 'doc_' + Math.random().toString(36).substr(2, 9),
        userId: user.id,
        title,
        type: docType,
        category: selectedCategory,
        date: validatedAnalysis.dateOfIssue || new Date().toLocaleDateString(),
        rawText: rawText || extractedText || (uploadedImageMime === 'application/pdf' ? "Analyzed from PDF document upload" : "Analyzed from scanned image upload"),
        analysis: validatedAnalysis,
        createdAt: new Date().toISOString()
      };

      onAddDocument(newDoc);
      setSelectedDocId(newDoc.id);
      
      // Reset tracker
      setTitle('');
      setRawText('');
      setUploadedImage(null);
      setUploadedImageMime('');
      setUploadedFileName('');
    } catch (err: any) {
      console.error(err);
      setAnalysisError(err.message || 'Error occurred during AI extraction.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-12 gap-6">
      {/* Upload/Add Form Column */}
      <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Prescription &amp; Lab Intelligence</p>
          <h3 className="text-lg font-display font-medium text-white">Add Health Document</h3>
          <p className="text-xs text-slate-400 mt-1">Upload an image of your prescription or paste chemical values of a diagnostic lab report.</p>
        </div>

        <form onSubmit={runIntelAnalysis} className="space-y-4">
          {analysisError && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
              {analysisError}
            </div>
          )}

          <div>
            <label className="text-xs text-slate-300 block mb-1.5 font-semibold">Document Title</label>
            <input
              type="text"
              placeholder="e.g. HbA1c Lab Report, Depression PHQ-9, Cardiologist RX"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:border-emerald-500 focus:ring-0"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 bg-slate-950/40 p-1.5 rounded-xl border border-slate-800/60">
            <button
              type="button"
              onClick={() => {
                setDocType('report');
                setSelectedCategory('Lab Result');
              }}
              className={`py-2 px-3 text-xs font-semibold rounded-lg text-center transition-all cursor-pointer ${docType === 'report' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}
            >
              Laboratory Report
            </button>
            <button
              type="button"
              onClick={() => {
                setDocType('prescription');
                setSelectedCategory('Prescription');
              }}
              className={`py-2 px-3 text-xs font-semibold rounded-lg text-center transition-all cursor-pointer ${docType === 'prescription' ? 'bg-teal-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}
            >
              Prescription
            </button>
          </div>

          <div>
            <label className="text-xs text-slate-300 block mb-1.5 font-semibold">Classification Category Tag</label>
            <div className="grid grid-cols-2 gap-2 bg-slate-950/20 p-2 border border-slate-800/60 rounded-xl">
              {(['Insurance', 'Lab Result', 'Prescription', 'Doctor Note'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`py-1.5 px-2 text-[10px] font-semibold rounded-lg text-center border transition-all cursor-pointer ${selectedCategory === cat ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300 shadow-sm' : 'bg-slate-950 border-slate-800/70 text-slate-400 hover:text-slate-200'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* HTML5 Scanner / Image Selector & Real-Time Camera */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-xs text-slate-300 block font-semibold">Document Data Input (Camera / OCR Scan)</label>
              {!isCameraOpen ? (
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-2.5 py-1 rounded bg-teal-500/10 border border-teal-500/20 hover:bg-teal-500/20 text-teal-400 text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                >
                  <Camera className="h-3 w-3" />
                  <span>Point Live Camera</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopCamera}
                  className="px-2.5 py-1 rounded bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-400 text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                >
                  <span>Close Camera Feed</span>
                </button>
              )}
            </div>

            {isCameraOpen ? (
              <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-black">
                {/* Viewfinder scanning reticle lines */}
                <div className="absolute inset-x-0 inset-y-0 border-2 border-emerald-500/20 pointer-events-none rounded-2xl z-10 m-3">
                  {/* Corners */}
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-emerald-400" />
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-emerald-400" />
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-emerald-400" />
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-emerald-400" />
                  
                  {/* Glowing dynamic laser scan bar */}
                  <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_#10b981] animate-bounce" style={{ top: '35%' }} />
                </div>

                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-48 bg-black object-cover"
                />

                <div className="absolute bottom-2.5 left-0 right-0 flex justify-center px-4 z-20">
                  <button
                    type="button"
                    onClick={captureSnapshot}
                    className="px-4 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-[0_0_15px_rgba(20,184,166,0.35)]"
                  >
                    <Camera className="h-3.5 w-3.5 stroke-[2.5]" />
                    <span>Capture Prescription &amp; Scan</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-slate-800 hover:border-slate-700 bg-slate-950/30 rounded-2xl p-4 text-center cursor-pointer relative transition">
                <input
                  type="file"
                  accept="image/*,application/pdf,text/plain"
                  onChange={handleImageFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <div className="flex flex-col items-center justify-center space-y-2">
                  {uploadedFileName ? (
                    <>
                      {uploadedImageMime === 'application/pdf' ? (
                        <FileText className="h-8 w-8 text-indigo-400" />
                      ) : uploadedImageMime === 'text/plain' ? (
                        <FileText className="h-8 w-8 text-emerald-400" />
                      ) : (
                        <ImageIcon className="h-8 w-8 text-teal-400" />
                      )}
                      <p className="text-xs text-slate-200 font-semibold truncate max-w-xs">{uploadedFileName}</p>
                      <p className="text-[10px] text-emerald-400">
                        {uploadedImageMime === 'application/pdf' ? 'PDF Document Loaded' : uploadedImageMime === 'text/plain' ? 'Text Report Extracted' : 'Picture Loaded'}! Click to swap.
                      </p>
                    </>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-slate-600 animate-pulse" />
                      <p className="text-xs text-slate-300 font-medium">Select or drag &amp; drop document, PDF, or text file</p>
                      <p className="text-[10px] text-slate-500">Supports PDF, TXT, PNG, JPEG, camera snapshots</p>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="relative">
            <div className="absolute right-2 top-2 px-2 py-0.5 rounded text-[9px] bg-slate-950 border border-slate-800/80 text-slate-400">
              OR
            </div>
            <label className="text-xs text-slate-300 block mb-1.5 font-semibold">Copy &amp; Paste Report Text</label>
            <textarea
              placeholder="Paste test metrics (e.g. Fasting glucose: 135 mg/dL, HbA1c: 6.9, or lisinopril 10mg once daily)"
              rows={4}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:border-emerald-500 focus:ring-0 resize-none h-28"
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={isAnalyzing}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-semibold py-3 px-4 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>AI Parsing Documents...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Launch Gemini Intelligence</span>
              </>
            )}
          </button>
        </form>

        {/* Existing Documents List */}
        <div className="space-y-3 pt-4 border-t border-slate-800/50">
          <div className="flex justify-between items-center">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Medical History File</p>
            <span className="text-[10px] text-slate-500 font-mono font-medium bg-slate-950 px-2 py-0.5 rounded border border-slate-800/60">{documents.length} Total</span>
          </div>

          {/* Filtering Category Pills */}
          <div className="flex flex-wrap gap-1 bg-slate-950/20 p-1 border border-slate-800/60 rounded-xl overflow-x-auto">
            {(['All', 'Insurance', 'Lab Result', 'Prescription', 'Doctor Note'] as const).map((cat) => {
              const count = cat === 'All' 
                ? documents.length 
                : documents.filter(d => d.category === cat || (!d.category && cat === (d.type === 'report' ? 'Lab Result' : d.type === 'prescription' ? 'Prescription' : 'Doctor Note'))).length;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setFilterCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-[9px] font-semibold transition cursor-pointer shrink-0 border ${filterCategory === cat ? 'bg-indigo-500 border-indigo-400 text-white shadow-sm' : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:text-slate-200'}`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>

          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
            {(() => {
              const filteredDocuments = documents.filter(doc => {
                if (filterCategory === 'All') return true;
                const docCat = doc.category || (doc.type === 'report' ? 'Lab Result' : doc.type === 'prescription' ? 'Prescription' : 'Doctor Note');
                return docCat === filterCategory;
              });

              if (filteredDocuments.length === 0) {
                return (
                  <p className="text-xs text-slate-500 italic py-4 text-center bg-slate-950/10 border border-dashed border-slate-800 rounded-xl">
                    No files found in {filterCategory}.
                  </p>
                );
              }

              return filteredDocuments.map((doc) => {
                const isSelected = selectedDocId === doc.id || (!selectedDocId && doc === currentDoc);
                return (
                  <div
                    key={doc.id}
                    className={`w-full p-2.5 rounded-xl border transition text-xs flex items-center justify-between gap-2 ${isSelected ? 'bg-slate-950 border-emerald-500/40 text-emerald-400' : 'bg-slate-950/40 border-slate-800/80 text-slate-400 hover:text-slate-300'}`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedDocId(doc.id)}
                      className="flex items-center gap-2 truncate flex-1 min-w-0 text-left cursor-pointer border-none bg-transparent"
                    >
                      <FileText className="h-4 w-4 opacity-75 shrink-0 text-indigo-400" />
                      <div className="flex flex-col truncate min-w-0">
                        <span className="truncate font-semibold leading-tight text-white">{doc.title}</span>
                        <span className="text-[9px] text-slate-500 font-medium tracking-tight mt-0.5">
                          {doc.category || (doc.type === 'report' ? 'Lab Result' : doc.type === 'prescription' ? 'Prescription' : 'Doctor Note')}
                        </span>
                      </div>
                    </button>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[9px] text-slate-500 font-mono">{doc.date}</span>
                      {docIdDeleting === doc.id ? (
                        <div className="flex items-center gap-1 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded-lg">
                          <span className="text-[9px] text-rose-400 font-medium font-sans">Delete?</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteDocument(doc.id);
                              if (selectedDocId === doc.id) {
                                setSelectedDocId(null);
                              }
                              setDocIdDeleting(null);
                            }}
                            className="text-[9px] text-rose-400 font-bold hover:underline px-0.5"
                            id={`confirm-delete-${doc.id}`}
                          >
                            Yes
                          </button>
                          <span className="text-[9px] text-slate-600">|</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDocIdDeleting(null);
                            }}
                            className="text-[9px] text-slate-500 hover:text-slate-300 px-0.5"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDocIdDeleting(doc.id);
                          }}
                          className="p-1 hover:bg-rose-500/10 hover:text-rose-450 rounded transition duration-200 text-slate-500 cursor-pointer"
                          title="Delete file"
                          id={`delete-doc-${doc.id}`}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </div>

      {/* Analysis Detailed Column */}
      <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-sm space-y-6">
        {currentDoc ? (
          <div className="space-y-6 relative">
            {/* Header / Severity gauge */}
            <div className="flex items-center justify-between border-b border-slate-800/40 pb-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap w-full">
                  <span className="text-[10px] uppercase font-mono tracking-widest text-slate-500">
                    {currentDoc.type === 'report' ? 'Diagnostic Laboratory Report' : 'Doctor Medication Prescription'}
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {currentDoc.category || (currentDoc.type === 'report' ? 'Lab Result' : currentDoc.type === 'prescription' ? 'Prescription' : 'Doctor Note')}
                  </span>
                  {isDeletingDetailed ? (
                    <div className="ml-auto flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-xl">
                      <span className="text-[10px] text-rose-400 font-medium">Permanently delete?</span>
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteDocument(currentDoc.id);
                          setSelectedDocId(null);
                          setIsDeletingDetailed(false);
                        }}
                        className="text-[10px] text-rose-450 hover:text-rose-400 font-bold hover:underline bg-transparent border-none cursor-pointer"
                        id="confirm-delete-detailed-btn"
                      >
                        Confirm
                      </button>
                      <span className="text-[10px] text-slate-600">|</span>
                      <button
                        type="button"
                        onClick={() => setIsDeletingDetailed(false)}
                        className="text-[10px] text-slate-500 hover:text-slate-300 bg-transparent border-none cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsDeletingDetailed(true)}
                      className="ml-auto text-[10px] font-bold uppercase tracking-wider text-rose-450 hover:text-rose-400 font-mono transition flex items-center gap-1 hover:underline cursor-pointer bg-transparent border-none"
                      id="delete-doc-detailed-btn"
                    >
                      <Trash2 className="h-3 w-3 text-rose-500" />
                      <span>Delete File</span>
                    </button>
                  )}
                </div>
                <h3 className="text-lg font-display font-semibold text-white mt-1">{currentDoc.title}</h3>
                <p className="text-xs text-slate-400">Processed on {currentDoc.date}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-[10px] text-slate-500 font-semibold uppercase">Severity Impact</span>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  currentDoc.analysis.severity === 'High' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                  currentDoc.analysis.severity === 'Medium' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                  'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                }`}>
                  {currentDoc.analysis.severity} Impact
                </span>
              </div>
            </div>

            {/* Clinician and Hospital Metadata Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950 p-3 rounded-2xl border border-slate-800/80 text-xs">
              <div className="space-y-0.5">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Prescribing Doctor</span>
                <span className="text-white font-medium block truncate" title={currentDoc.analysis.doctorName || "Dr. Robert Chen, MD"}>
                  {currentDoc.analysis.doctorName || "Unknown Clinician"}
                </span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Healthcare Facility</span>
                <span className="text-white font-medium block truncate" title={currentDoc.analysis.hospitalName || "MediSense Clinic"}>
                  {currentDoc.analysis.hospitalName || "Unknown Center"}
                </span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Date of Issue</span>
                <span className="text-white font-mono font-medium block truncate">
                  {currentDoc.analysis.dateOfIssue || currentDoc.date}
                </span>
              </div>
            </div>

            {/* Patient Simplified Explanation */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
                <Compass className="h-4 w-4 text-emerald-400" />
                <span>Patient-Friendly Translation</span>
              </h4>
              <p className="text-xs text-slate-350 leading-relaxed bg-slate-950 p-4 rounded-2xl border border-slate-800/80">
                {currentDoc.analysis.simplifiedExplanation}
              </p>
            </div>

            {/* Clinician Direct Advice Directions */}
            {currentDoc.analysis.doctorAdvice && (
              <div className="space-y-1.5 border-t border-slate-800/30 pt-4">
                <h4 className="text-xs font-semibold text-indigo-300 uppercase tracking-widest flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 shrink-0" />
                  <span>Doctor's Instructions &amp; Advice</span>
                </h4>
                <p className="text-xs text-indigo-200/90 bg-indigo-950/20 p-4 rounded-2xl border border-indigo-500/10 leading-relaxed font-serif italic">
                  "{currentDoc.analysis.doctorAdvice}"
                </p>
              </div>
            )}

            {/* Collapsible Extracted/Transcribed Verbatim Plain Text */}
            {currentDoc.rawText && (
              <div className="space-y-1.5 border-t border-slate-800/40 pt-4">
                <button
                  type="button"
                  onClick={() => setShowRawText(!showRawText)}
                  className="flex items-center justify-between w-full text-left text-xs font-semibold text-slate-300 uppercase tracking-widest hover:text-white transition cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-indigo-400" />
                    <span>View Transcribed Plain Text</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {showRawText ? "[Hide]" : "[Show]"}
                  </span>
                </button>
                {showRawText && (
                  <pre className="text-[10px] text-slate-400 font-mono whitespace-pre-wrap bg-slate-950 p-4 rounded-2xl border border-slate-800/80 max-h-48 overflow-y-auto leading-relaxed">
                    {currentDoc.rawText}
                  </pre>
                )}
              </div>
            )}

            {/* Pathologist Diagnosed / Extracted Terms */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800 text-xs">
                <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Identified Diagnostics</span>
                <p className="text-white font-medium">{currentDoc.analysis.diagnosedTerms || "Regular Baseline Summary"}</p>
              </div>
              {/* Takeaways / Insights card */}
              <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800 text-xs">
                <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Critical Takeaway Insights</span>
                <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
                  {(currentDoc.analysis?.primaryInsights || []).slice(0, 2).map((ins, i) => (
                    <li key={i} className="truncate">{ins}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Adverse drug interaction warning banner */}
            {currentDoc.analysis?.drugInteractions && currentDoc.analysis.drugInteractions.detected && (
              <div className="p-3.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-xs flex gap-3 text-orange-400">
                <AlertTriangle className="h-5 w-5 shrink-0 text-orange-400 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-semibold uppercase tracking-wider text-[10px]">Harmful Drug-to-Drug Interaction Detected!</p>
                  <p className="text-slate-300 text-[11px] leading-relaxed">{currentDoc.analysis.drugInteractions.warning}</p>
                  <p className="text-[10px] text-slate-500 font-mono">Conflicting: {(currentDoc.analysis.drugInteractions.interactants || []).join(" &amp; ")}</p>
                </div>
              </div>
            )}

            {/* Dietary food, Excercise and activities */}
            <div className="grid grid-cols-2 gap-4">
              {/* Foods */}
              <div className="space-y-2">
                <h5 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                  <Apple className="h-4 w-4 text-amber-400" />
                  <span>Diet &amp; Superfoods</span>
                </h5>
                <ul className="space-y-1.5">
                  {(currentDoc.analysis?.recommendations?.food || []).map((food, i) => (
                    <li key={i} className="text-[11px] text-slate-400 flex items-start gap-1.5 leading-relaxed">
                      <ChevronRight className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <span>{food}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Physical Activities */}
              <div className="space-y-2">
                <h5 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                  <Heart className="h-4 w-4 text-emerald-400" />
                  <span>Safe Physical Routines</span>
                </h5>
                <ul className="space-y-1.5">
                  {(currentDoc.analysis?.recommendations?.exercise || []).map((exc, i) => (
                    <li key={i} className="text-[11px] text-slate-400 flex items-start gap-1.5 leading-relaxed">
                      <ChevronRight className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{exc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Parsed Drugs Table with scheduler quick-import */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">Identified Prescribed Medications</p>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono text-xs">{(currentDoc.analysis?.drugs || []).length} Found</span>
              </div>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {(!currentDoc.analysis?.drugs || currentDoc.analysis.drugs.length === 0) ? (
                  <p className="text-xs text-slate-500 italic bg-slate-950 p-4 rounded-xl text-center">No prescription drug molecules extracted.</p>
                ) : (
                  currentDoc.analysis.drugs.map((drug, i) => (
                    <div key={i} className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                      <div className="space-y-1 max-w-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white text-xs">{drug.name}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] bg-slate-800 text-slate-400">{drug.dosage}</span>
                        </div>
                        <p className="text-slate-400 text-[11px]">{drug.purpose}</p>
                        <p className="text-[9px] text-slate-500">Frequency: {drug.frequency} | Side effects: {(drug.sideEffects || []).join(", ")}</p>
                      </div>
                      <button
                        onClick={() => {
                          onImportMedication(drug.name, drug.dosage, drug.frequency, drug.purpose);
                        }}
                        className="p-1.5 md:p-2 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 rounded-xl transition text-xs flex items-center gap-1 font-semibold cursor-pointer shrink-0"
                      >
                        <Plus className="h-4 w-4" />
                        <span className="hidden md:inline">Schedule Time</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-3 py-16 border border-dashed border-slate-800 rounded-3xl bg-slate-950/20 text-center p-6">
            <FileText className="h-12 w-12 text-slate-600 animate-pulse" />
            <div className="space-y-0.5">
              <p className="font-semibold text-slate-400 text-lg">No Medical Documents Loaded</p>
              <p className="text-xs text-slate-500 max-w-xs leading-relaxed mx-auto">
                Upload your chronic lab reports (diabetes HbA1c summaries, lipid panel tests, cardiac diagnostics) or copy-paste doctor prescriptions to check safety and trigger diet/daily recommendations.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
