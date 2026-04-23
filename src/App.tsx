/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, 
  CheckCircle2, 
  Circle, 
  Plus, 
  Search, 
  ChevronRight, 
  Calendar, 
  User, 
  Mail, 
  ExternalLink,
  ClipboardList,
  Home,
  Clock,
  Sparkles,
  ArrowLeft,
  Trash2,
  Phone,
  Settings,
  LogOut,
  ShieldCheck,
  Archive,
  ArchiveRestore,
  RotateCcw
} from 'lucide-react';
import { Project, Step, DEFAULT_STEPS } from './types';
import { draftOwnerEmail } from './services/geminiService';
import { 
  auth, 
  db, 
  login, 
  logout 
} from './services/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  deleteDoc, 
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [aiDraft, setAiDraft] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Migration logic: LocalStorage -> Firebase (runs once when user logs in)
  useEffect(() => {
    if (!user || projects.length > 0) return;

    const migrate = async () => {
      const saved = localStorage.getItem('rental_projects');
      if (saved) {
        const localData = JSON.parse(saved);
        if (localData.length > 0) {
          console.log("Migrating local data to Firebase...");
          for (const proj of localData) {
            try {
              await addDoc(collection(db, 'projects'), {
                ...proj,
                id: undefined, // Let Firebase generate new ID
                createdBy: user.uid,
                isArchived: proj.isArchived ?? false,
                createdAt: serverTimestamp(),
              });
            } catch (e) {
              console.error("Migration error:", e);
            }
          }
          localStorage.removeItem('rental_projects'); // Clear after success
        }
      }
    };

    migrate();
  }, [user, projects.length]);

  // Firestore Data Listener
  useEffect(() => {
    if (!user) {
      setProjects([]);
      return;
    }

    const q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        createdAt: (doc.data().createdAt as Timestamp)?.toMillis() || Date.now()
      })) as Project[];
      setProjects(docs);
    });

    return () => unsubscribe();
  }, [user]);

  const addProject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    const formData = new FormData(e.currentTarget);
    
    try {
      await addDoc(collection(db, 'projects'), {
        apartmentName: formData.get('apartment') as string,
        currentTenant: formData.get('tenant') as string,
        owner: formData.get('owner') as string,
        ownerEmail: formData.get('email') as string,
        terminationDate: formData.get('date') as string,
        createdAt: serverTimestamp(),
        createdBy: user.uid,
        isArchived: false,
        steps: DEFAULT_STEPS.map((s, i) => ({ ...s, id: `step-${i}` })),
      });
      setIsAddingProject(false);
    } catch (error) {
      console.error("Error adding project:", error);
      alert("Fehler beim Speichern. Prüfen Sie die Berechtigungen.");
    }
  };

  const archiveProject = async (id: string, currentlyArchived: boolean) => {
    const actionText = currentlyArchived ? 'Objekt wiederherstellen?' : 'Sicher dass sie es löschen?';
    if (confirm(actionText)) {
      try {
        await updateDoc(doc(db, 'projects', id), {
          isArchived: !currentlyArchived,
          updatedAt: serverTimestamp()
        });
        if (selectedProjectId === id) setSelectedProjectId(null);
      } catch (error) {
        console.error("Error archiving project:", error);
      }
    }
  };

  const permanentlyDeleteProject = async (id: string) => {
    if (confirm('Objekt endgültig aus der Datenbank löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
      try {
        await deleteDoc(doc(db, 'projects', id));
        if (selectedProjectId === id) setSelectedProjectId(null);
      } catch (error) {
        console.error("Error deleting project:", error);
      }
    }
  };

  const toggleStep = async (projectId: string, stepId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    const updatedSteps = project.steps.map(s => 
      s.id === stepId ? { ...s, isCompleted: !s.isCompleted } : s
    );

    try {
      await updateDoc(doc(db, 'projects', projectId), {
        steps: updatedSteps,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error updating step:", error);
    }
  };

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  const handleAiDraft = async () => {
    if (!selectedProject) return;
    setIsGenerating(true);
    const draft = await draftOwnerEmail(selectedProject);
    setAiDraft(draft ?? 'Entwurf konnte nicht geladen werden.');
    setIsGenerating(false);
  };

  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.apartmentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.currentTenant.toLowerCase().includes(searchTerm.toLowerCase());
    const projectIsArchived = p.isArchived || false;
    const matchesArchiveStatus = projectIsArchived === showArchived;
    return matchesSearch && matchesArchiveStatus;
  });

  if (authLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50 text-slate-400">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-xs font-bold uppercase tracking-widest">Initialisierung</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden text-center p-8">
          <div className="w-16 h-16 bg-slate-900 text-white flex items-center justify-center rounded-2xl mx-auto mb-6 shadow-lg rotate-3 hover:rotate-0 transition-transform cursor-default">
            <Building2 size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">V-Manager Pro</h1>
          <p className="text-slate-500 text-sm mb-8 px-4">Professionelle Mietverwaltung für Ihr Team. Bitte melden Sie sich an.</p>
          
          <button 
            onClick={login}
            className="w-full py-3 bg-white border border-slate-200 rounded-xl font-bold text-sm text-slate-700 flex items-center justify-center gap-3 hover:bg-slate-50 transition-all shadow-sm active:scale-95"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/smartlock/google.svg" className="w-5 h-5" alt="Google" />
            Mit Google anmelden
          </button>
          
          <p className="mt-8 text-[10px] text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2">
            <ShieldCheck size={12} /> Sicher & Cloud-basiert
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* SIDEBAR: PROPERTY LIST OR STATS */}
      <div className="w-80 flex flex-col border-r border-slate-200 bg-white border-t-4 border-t-slate-900 shrink-0 shadow-sm z-20">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
           <div className="flex items-center gap-2">
            <div className="bg-slate-900 p-1.5 rounded text-white">
              <Building2 size={18} />
            </div>
            <h1 className="text-sm font-bold uppercase tracking-widest text-slate-800">V-Manager <span className="text-blue-600">Pro</span></h1>
           </div>
           <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsAddingProject(true)}
              className="text-slate-400 hover:text-blue-600 transition-colors p-1"
            >
              <Plus size={20} />
            </button>
            <button 
              onClick={logout}
              className="text-slate-400 hover:text-red-500 transition-colors p-1"
              title="Abmelden"
            >
              <LogOut size={18} />
            </button>
           </div>
        </div>

        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={user.photoURL || ''} className="w-6 h-6 rounded-full border border-slate-200" alt="User" />
            <p className="text-[10px] font-bold text-slate-500 truncate max-w-[120px]">{user.displayName}</p>
          </div>
          <span className="bg-green-100 text-green-700 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tighter">Online</span>
        </div>

        <div className="p-4 pt-2">
          <div className="flex bg-slate-100 p-1 rounded-lg mb-4">
            <button 
              onClick={() => setShowArchived(false)}
              className={`flex-1 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${
                !showArchived ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Aktiv
            </button>
            <button 
              onClick={() => setShowArchived(true)}
              className={`flex-1 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${
                showArchived ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Archiv
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text" 
              placeholder="Suchen..." 
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-2">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-2">Aktive Prozesse</h2>
          </div>
          {filteredProjects.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {filteredProjects.map(project => {
                const completedSteps = project.steps.filter(s => s.isCompleted).length;
                const progress = Math.round((completedSteps / project.steps.length) * 100);
                const isActive = selectedProjectId === project.id;
                
                return (
                  <div 
                    key={project.id}
                    onClick={() => setSelectedProjectId(project.id)}
                    className={`p-4 border-l-4 cursor-pointer transition-all ${
                      isActive ? 'border-blue-600 bg-blue-50/40' : 'border-transparent hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-bold text-sm text-slate-800 truncate pr-2">{project.apartmentName}</p>
                      <span className="text-[10px] font-mono font-bold text-slate-400">{progress}%</span>
                    </div>
                    <p className="text-xs text-slate-500 mb-3">{project.currentTenant}</p>
                    <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                      <div 
                        className="bg-blue-600 h-full transition-all duration-500" 
                        style={{ width: `${progress}%` }} 
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400">
              <ClipboardList className="mx-auto mb-2 opacity-20" size={32} />
              <p className="text-xs">Keine Einheiten</p>
            </div>
          )}
        </div>

        <div className="p-4 bg-slate-900 mt-auto">
          <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Status Gesamt</p>
          <div className="flex justify-between items-end">
            <span className="text-2xl font-mono text-white leading-none">
              {projects.length < 10 ? `0${projects.length}` : projects.length}
            </span>
            <span className="text-[10px] text-slate-500 pb-0.5">Laufende Vorgänge</span>
          </div>
        </div>
      </div>

      {/* MAIN WORKFLOW AREA */}
      <div className="flex-1 flex flex-col p-8 gap-6 overflow-hidden">
        {selectedProject ? (
          <>
            <header className="flex justify-between items-center shrink-0">
              <div>
                <nav className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                  <span>Prozesse</span>
                  <ChevronRight size={12} />
                  <span className="text-slate-600 font-medium">{selectedProject.apartmentName}</span>
                </nav>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">{selectedProject.apartmentName}</h1>
                  <span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Kündigung</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => archiveProject(selectedProject.id, selectedProject.isArchived)}
                  className={`p-2 transition-all rounded-lg ${
                    selectedProject.isArchived 
                      ? 'text-blue-600 hover:bg-blue-50' 
                      : 'text-slate-300 hover:text-red-500 hover:bg-red-50'
                  }`}
                  title={selectedProject.isArchived ? "Wiederherstellen" : "Löschen (Archivieren)"}
                >
                  {selectedProject.isArchived ? <RotateCcw size={18} /> : <Trash2 size={18} />}
                </button>
                {selectedProject.isArchived && (
                  <button 
                    onClick={() => permanentlyDeleteProject(selectedProject.id)}
                    className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 transition-all rounded-lg"
                    title="Endgültig löschen"
                  >
                    <Archive size={18} />
                  </button>
                )}
                <button 
                  onClick={() => setSelectedProjectId(null)}
                  className="px-4 py-2 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Schließen
                </button>
                <button 
                  className={`px-4 py-2 rounded text-xs font-bold transition-all shadow-sm ${
                    selectedProject.steps.every(s => s.isCompleted)
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  Prozess abschließen
                </button>
              </div>
            </header>

            {/* AI Assistant Output Section (integrated into flow) */}
            <AnimatePresence>
                {(aiDraft || isGenerating) && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-blue-600 text-white rounded-lg p-5 shadow-lg border border-blue-700 relative mb-2">
                      <Sparkles className="absolute right-4 top-4 text-white/10 w-24 h-24" />
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                            <Sparkles size={14} /> KI-Unterstützung: E-Mail Entwurf
                          </h3>
                          {!isGenerating && (
                            <button onClick={() => setAiDraft(null)} className="text-white/60 hover:text-white"><Plus className="rotate-45" size={18}/></button>
                          )}
                        </div>
                        
                        {isGenerating ? (
                          <div className="flex items-center gap-3 py-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <p className="text-xs italic opacity-80">Entwurf wird generiert...</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="text-xs leading-relaxed font-medium bg-slate-900/20 p-4 rounded-lg border border-white/10 whitespace-pre-wrap max-h-48 overflow-y-auto">
                              {aiDraft}
                            </div>
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(aiDraft!);
                                alert('Kopiert!');
                              }}
                              className="w-full bg-white text-blue-600 py-2 rounded font-bold text-[11px] hover:bg-blue-50 transition-all uppercase tracking-wider"
                            >
                              Text kopieren
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

            {/* WORKFLOW LIST (THE "HIGH DENSITY" GRID) */}
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 gap-px bg-slate-200 border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                {selectedProject.steps.map((step, idx) => (
                  <div 
                    key={step.id} 
                    onClick={() => toggleStep(selectedProject.id, step.id)}
                    className={`flex items-center gap-4 p-4 cursor-pointer transition-colors ${
                      step.isCompleted ? 'bg-slate-50' : 'bg-white hover:bg-blue-50/30'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-2 transition-all ${
                      step.isCompleted 
                        ? 'bg-green-500 border-green-500 text-white' 
                        : 'border-slate-300 text-slate-400 group-hover:border-blue-400'
                    }`}>
                      {step.isCompleted ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                      ) : (
                        <span className="text-[10px] font-bold">{idx + 1}</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-semibold truncate ${step.isCompleted ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                          {step.label}
                        </p>
                        {step.system && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider border ${
                            step.system === 'impower' 
                              ? 'bg-blue-50 text-blue-600 border-blue-100' 
                              : step.system === 'everreal'
                              ? 'bg-orange-50 text-orange-600 border-orange-100'
                              : 'bg-purple-50 text-purple-600 border-purple-100'
                          }`}>
                            {step.system}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 truncate">{step.description}</p>
                    </div>

                    <div className="flex items-center gap-4">
                      {idx === 1 && !step.isCompleted && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleAiDraft(); }}
                          className="flex items-center gap-1 text-[11px] font-bold text-blue-600 px-3 py-1 bg-blue-100/50 hover:bg-blue-100 rounded transition-all"
                        >
                          <Sparkles size={12} />
                          Entwurf
                        </button>
                      )}
                      
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                        step.isCompleted 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {step.isCompleted ? 'Erledigt' : 'Offen'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          /* DASHBOARD PLACEHOLDER / LIST VIEW */
          <div className="flex-1 flex flex-col items-center justify-center bg-white border border-slate-200 border-dashed rounded-2xl">
            <div className="bg-slate-100 p-6 rounded-full mb-4">
              <Building2 className="text-slate-300" size={48} />
            </div>
            <h2 className="text-xl font-bold text-slate-800">Kein Objekt ausgewählt</h2>
            <p className="text-slate-500 text-sm max-w-sm text-center mt-2">Wählen Sie links ein Objekt aus oder erstellen Sie über den "+" Button ein neues Vermietungsprojekt.</p>
            <button 
              onClick={() => setIsAddingProject(true)}
              className="mt-6 px-6 py-2.5 bg-blue-600 text-white rounded font-bold text-sm shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2"
            >
              <Plus size={18} /> Neues Objekt
            </button>
          </div>
        )}
      </div>

      {/* RIGHT: CONTEXT CARD */}
      <div className="w-72 shrink-0 flex flex-col p-6 gap-6 border-l border-slate-200 bg-white/50 backdrop-blur-sm">
        {selectedProject ? (
          <>
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Mieter-Daten</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded bg-slate-100 flex items-center justify-center text-slate-500 font-bold border border-slate-200">
                    {selectedProject.currentTenant.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{selectedProject.currentTenant}</p>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                      <Mail size={10} /> Kontakt hinterlegt
                    </p>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Kündigung zum</p>
                    <p className="text-sm font-mono mt-0.5 text-slate-700">{selectedProject.terminationDate}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Laufzeit</p>
                    <p className="text-sm text-slate-700">3 Monate Kündigungsfr.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Eigentümer</h3>
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-800">{selectedProject.owner}</p>
                <a href={`mailto:${selectedProject.ownerEmail}`} className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1">
                  <Mail size={12} /> {selectedProject.ownerEmail}
                </a>
              </div>
            </div>

            <div className="bg-slate-100/50 border border-slate-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                <h3 className="text-[10px] font-bold text-slate-800 uppercase tracking-widest uppercase">System-Zugriff</h3>
              </div>
              <div className="space-y-2">
                <a 
                  href="https://app.impower.de/dashboard" 
                  target="_blank" 
                  rel="noreferrer"
                  className="flex items-center justify-between w-full py-2 px-3 bg-blue-600 text-white rounded text-[11px] font-bold hover:bg-blue-700 transition-colors uppercase tracking-widest shadow-sm"
                >
                  Impower Dashboard <ExternalLink size={12} />
                </a>
                <a 
                  href="https://borgmann-frank.mycasavi.com/tenants/7417/manage/dashboard/" 
                  target="_blank" 
                  rel="noreferrer"
                  className="flex items-center justify-between w-full py-2 px-3 bg-purple-600 text-white rounded text-[11px] font-bold hover:bg-purple-700 transition-colors uppercase tracking-widest shadow-sm"
                >
                  Casavi Dashboard <ExternalLink size={12} />
                </a>
                <button className="flex items-center justify-between w-full py-2 px-3 bg-orange-600 text-white rounded text-[11px] font-bold hover:bg-orange-700 transition-colors uppercase tracking-widest shadow-sm">
                  Everreal öffnen <ExternalLink size={12} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center opacity-40 text-slate-400 text-center px-4">
             <Settings className="mb-2 animate-[spin_10s_linear_infinite]" size={32} />
             <p className="text-[10px] uppercase font-bold tracking-widest leading-loose">Warten auf Selektion</p>
          </div>
        )}
      </div>

      {/* Add Project Modal */}
      <AnimatePresence>
        {isAddingProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-lg shadow-2xl overflow-hidden border border-slate-200"
            >
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-700">Neues Vermietungsprojekt</h3>
                <button onClick={() => setIsAddingProject(false)} className="text-slate-400 hover:text-slate-600"><Plus className="rotate-45" size={24} /></button>
              </div>

              <form onSubmit={addProject} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Objektbezeichnung</label>
                  <input name="apartment" required placeholder="z.B. Gartenweg 4, EG Links" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Mieter Name</label>
                    <input name="tenant" required placeholder="M. Schmidt" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Kündigung zum</label>
                    <input type="date" name="date" required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Eigentümer</label>
                  <input name="owner" required placeholder="Dr. Roland Hausen" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none" />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">E-Mail Eigentümer</label>
                  <input type="email" name="email" required placeholder="hausen@immobilien.de" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none" />
                </div>

                <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded font-bold text-xs uppercase tracking-widest mt-4 shadow-md hover:bg-blue-700 transition-all">
                  Vorgang anlegen
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
