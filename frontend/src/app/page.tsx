"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { LogIn, Brain, NotebookPen, Mail, Lock, Loader2, Calendar as CalendarIcon, MessageSquare, Network, User } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import axios from "axios";
import DumpWindow from "@/components/DumpWindow";
import ResultsBoard from "@/components/ResultsBoard";
import CalendarView from "@/components/CalendarView";
import NotesView from "@/components/NotesView";
import ChatView from "@/components/ChatView";

export default function Home() {
  const { user, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, logout } = useAuth();
  
  // Auth Form State
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // View State
  const [activeView, setActiveView] = useState<"dashboard" | "calendar" | "notes" | "chat">("dashboard");

  // Data state
  const [data, setData] = useState({
    study_notes: [],
    tasks: [],
    calendar_events: []
  });
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Load user data from Firestore on login
  useEffect(() => {
    if (user) {
      const loadData = async () => {
        try {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const fetchedData = docSnap.data() as any;
            
            // Migrate old string notes to object format
            if (fetchedData.study_notes) {
              fetchedData.study_notes = fetchedData.study_notes.map((note: any, idx: number) => {
                if (typeof note === 'string') {
                  return {
                    id: `legacy-${idx}-${Date.now()}`,
                    title: `Untitled Note ${idx + 1}`,
                    content: note,
                    updated_at: Date.now() - (idx * 1000)
                  };
                }
                return note;
              });
            }
            
            setData(fetchedData);
          }
        } catch (error) {
          console.error("Failed to load user data:", error);
        } finally {
          setIsDataLoaded(true);
        }
      };
      loadData();
    }
  }, [user]);

  // Save user data to Firestore
  const saveToFirestore = async (newData: any) => {
    if (!user) return;
    try {
      await setDoc(doc(db, "users", user.uid), newData, { merge: true });
    } catch (error) {
      console.error("Failed to save data:", error);
    }
  };

  const handleNewResults = (newResults: any, targetNoteId?: string) => {
    setData((prev: any) => {
      let newNotes = prev.study_notes ? [...prev.study_notes] : [];
      
      if (newResults.study_notes?.markdown_content) {
        if (!targetNoteId || targetNoteId === 'new') {
          newNotes.unshift({
            id: Date.now().toString(),
            title: "New Note",
            content: newResults.study_notes.markdown_content,
            updated_at: Date.now()
          });
        } else {
          const noteIdx = newNotes.findIndex((n: any) => n.id === targetNoteId);
          if (noteIdx >= 0) {
            newNotes[noteIdx].content += `\n\n---\n\n${newResults.study_notes.markdown_content}`;
            newNotes[noteIdx].updated_at = Date.now();
            
            // Bring to front
            const updatedNote = newNotes.splice(noteIdx, 1)[0];
            newNotes.unshift(updatedNote);
          }
        }
      }

      const updated = {
        ...prev,
        study_notes: newNotes,
        tasks: newResults.tasks?.tasks 
          ? [...newResults.tasks.tasks.map((t: any) => ({ ...t, id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` })), ...(prev.tasks || [])] 
          : (prev.tasks || []),
        calendar_events: newResults.calendar_events?.events 
          ? [...newResults.calendar_events.events.map((e: any) => ({ ...e, id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` })), ...(prev.calendar_events || [])] 
          : (prev.calendar_events || [])
      };
      saveToFirestore(updated);
      return updated;
    });
  };

  const handleUpdateNote = (id: string, updates: any) => {
    setData((prev: any) => {
      const newNotes = prev.study_notes.map((n: any) => 
        n.id === id ? { ...n, ...updates, updated_at: Date.now() } : n
      );
      const updated = { ...prev, study_notes: newNotes };
      saveToFirestore(updated);
      return updated;
    });
  };

  const handleDeleteNote = (id: string) => {
    setData((prev: any) => {
      const newNotes = prev.study_notes.filter((n: any) => n.id !== id);
      const updated = { ...prev, study_notes: newNotes };
      saveToFirestore(updated);
      return updated;
    });
  };

  const handleRemoveTask = (id: string | number) => {
    setData((prev: any) => {
      let newTasks = [...prev.tasks];
      if (typeof id === 'number') {
        newTasks.splice(id, 1);
      } else {
        newTasks = newTasks.filter((t: any) => t.id !== id);
      }
      const updated = { ...prev, tasks: newTasks };
      saveToFirestore(updated);
      return updated;
    });
  };

  const handleRemoveEvent = async (id: string | number) => {
    // 1. Delete from Google Calendar if synced
    const targetEvent = data.calendar_events.find((ev: any, idx: number) => 
      typeof id === 'number' ? idx === id : ev.id === id
    ) as any;

    if (targetEvent && targetEvent.googleEventId) {
      const token = typeof window !== 'undefined' ? localStorage.getItem('google_calendar_access_token') : null;
      if (token) {
        try {
          await axios.delete(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events/${targetEvent.googleEventId}`,
            {
              headers: { Authorization: `Bearer ${token}` }
            }
          );
        } catch (error) {
          console.error("Failed to delete event from Google Calendar:", error);
        }
      }
    }

    // 2. Delete locally
    setData((prev: any) => {
      let newEvents = [...prev.calendar_events];
      if (typeof id === 'number') {
        newEvents.splice(id, 1);
      } else {
        newEvents = newEvents.filter((ev: any) => ev.id !== id);
      }
      const updated = { ...prev, calendar_events: newEvents };
      saveToFirestore(updated);
      return updated;
    });
  };

  const handleEventSynced = (localId: string, googleEventId: string) => {
    setData((prev: any) => {
      const newEvents = prev.calendar_events.map((ev: any) => 
        ev.id === localId ? { ...ev, googleEventId } : ev
      );
      const updated = { ...prev, calendar_events: newEvents };
      saveToFirestore(updated);
      return updated;
    });
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setIsAuthenticating(true);
    
    const fakeEmail = username.toLowerCase().trim() + '@nolook.local';
    
    try {
      if (isLogin) {
        await signInWithEmail(fakeEmail, password);
      } else {
        await signUpWithEmail(fakeEmail, password);
      }
    } catch (error: any) {
      console.error("Auth error", error);
      // Clean up firebase error message
      let msg = error.message;
      if (msg.includes("auth/invalid-credential")) msg = "Invalid username or password.";
      if (msg.includes("auth/email-already-in-use")) msg = "Username already in use.";
      if (msg.includes("auth/weak-password")) msg = "Password should be at least 6 characters.";
      if (msg.includes("auth/configuration-not-found")) msg = "Auth Provider not enabled in Firebase Console.";
      setAuthError(msg);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleGoogleAuth = async () => {
    setAuthError("");
    try {
      await signInWithGoogle();
    } catch (error: any) {
      console.error("Google Auth error", error);
      let msg = error.message;
      if (msg.includes("auth/configuration-not-found")) msg = "Google Sign-In is not enabled in Firebase Console.";
      setAuthError(msg);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-950 p-4 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-indigo-600/30 rounded-full blur-3xl animate-glow-blob mix-blend-screen pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-fuchsia-600/30 rounded-full blur-3xl animate-glow-blob-delayed mix-blend-screen pointer-events-none" />
        
        <div className="z-10 flex flex-col items-center max-w-md w-full bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-[0_0_40px_-10px_rgba(79,70,229,0.3)]">
          <div className="bg-indigo-500/20 p-4 rounded-full mb-6 ring-1 ring-indigo-500/50">
            <NotebookPen className="w-12 h-12 text-indigo-400" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2 text-center">
            No-Look Note Taker
          </h1>
          <p className="text-gray-400 text-center mb-8 text-sm">
            Dump your chaotic thoughts. Let AI organize them.
          </p>

          {authError && (
            <div className="w-full mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm text-center">
              {authError}
            </div>
          )}
          
          <form onSubmit={handleEmailAuth} className="w-full space-y-4 mb-6">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-300">Username</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input 
                  type="text" 
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-gray-900/50 border border-gray-700 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                  placeholder="cooluser123"
                />
              </div>
            </div>
            
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-300">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-900/50 border border-gray-700 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isAuthenticating}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
            >
              {isAuthenticating && <Loader2 className="w-4 h-4 animate-spin" />}
              {isLogin ? "Sign In" : "Sign Up"}
            </button>
          </form>

          <div className="w-full flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-gray-800"></div>
            <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Or</span>
            <div className="flex-1 h-px bg-gray-800"></div>
          </div>

          <button
            onClick={handleGoogleAuth}
            className="group flex w-full items-center justify-center gap-3 rounded-lg bg-white px-6 py-2.5 text-sm font-semibold text-gray-900 transition-all hover:bg-gray-100 shadow-lg shadow-white/5"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </button>

          <p className="mt-8 text-sm text-gray-500">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button onClick={() => setIsLogin(!isLogin)} className="text-indigo-400 font-medium hover:text-indigo-300">
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-950 text-gray-50 overflow-hidden">
      <aside className="w-64 border-r border-gray-800 bg-gray-950/50 backdrop-blur-sm flex flex-col z-10 hidden md:flex">
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-lg">
            <NotebookPen className="w-6 h-6" />
            <span>Note Taker</span>
          </div>
        </div>
        
        <div className="flex-1 p-4 space-y-4">
          <button 
            onClick={() => setActiveView("dashboard")}
            className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg border font-medium transition-colors ${
              activeView === "dashboard" 
                ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" 
                : "text-gray-400 border-transparent hover:bg-gray-800/50 hover:text-gray-300"
            }`}
          >
            <Brain className="w-5 h-5" />
            Dashboard
          </button>
          <button 
            onClick={() => setActiveView("calendar")}
            className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg border font-medium transition-colors ${
              activeView === "calendar" 
                ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" 
                : "text-gray-400 border-transparent hover:bg-gray-800/50 hover:text-gray-300"
            }`}
          >
            <CalendarIcon className="w-5 h-5" />
            Calendar
          </button>
          <button 
            onClick={() => setActiveView("notes")}
            className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg border font-medium transition-colors ${
              activeView === "notes" 
                ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" 
                : "text-gray-400 border-transparent hover:bg-gray-800/50 hover:text-gray-300"
            }`}
          >
            <NotebookPen className="w-5 h-5" />
            Notes
          </button>
          <button 
            onClick={() => setActiveView("chat")}
            className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg border font-medium transition-colors ${
              activeView === "chat" 
                ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" 
                : "text-gray-400 border-transparent hover:bg-gray-800/50 hover:text-gray-300"
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            Chat
          </button>
          
          <div className="pt-4 border-t border-gray-800 space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Settings</label>
            <div className="space-y-1">
              <label className="text-xs text-gray-400">Gemini API Key</label>
              <input 
                type="password"
                placeholder="AIzaSy..."
                className="w-full bg-gray-900/50 border border-gray-700 rounded-lg py-1.5 px-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                value={typeof window !== 'undefined' ? localStorage.getItem('gemini_api_key') || '' : ''}
                onChange={(e) => {
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('gemini_api_key', e.target.value);
                    setData(prev => ({...prev}));
                  }
                }}
              />
              <p className="text-[10px] text-gray-500 leading-tight">Stored locally. Required for processing notes.</p>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-3 mb-4">
            {user.photoURL ? (
              <img src={user.photoURL} alt="Profile" className="w-10 h-10 rounded-full border border-gray-700" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-indigo-900/50 border border-indigo-500/30 flex items-center justify-center">
                <span className="text-sm font-bold text-indigo-300">{user.email?.replace('@nolook.local', '')[0].toUpperCase()}</span>
              </div>
            )}
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{user.displayName || 'User'}</p>
              <p className="text-xs text-gray-500 truncate">{user.email?.replace('@nolook.local', '')}</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-gray-400 rounded-lg hover:bg-gray-800 hover:text-white transition-colors border border-gray-800"
          >
            <LogIn className="w-4 h-4" />
            <span className="text-sm font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto bg-gray-950 relative">
        <div className="fixed top-[-20%] left-[-10%] w-[600px] h-[600px] bg-indigo-900/20 rounded-full blur-[120px] animate-glow-blob pointer-events-none" />
        <div className="fixed bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-fuchsia-900/10 rounded-full blur-[120px] animate-glow-blob-delayed pointer-events-none" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none fixed"></div>
        
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 relative z-10">
          <header className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                {activeView === 'dashboard' && `Welcome back${user.displayName ? `, ${user.displayName.split(' ')[0]}` : ''}!`}
                {activeView === 'calendar' && 'Your Calendar'}
                {activeView === 'notes' && 'Your Notes'}
              </h1>
              <p className="text-gray-400">
                {activeView === 'dashboard' && 'Ready to dump some thoughts?'}
                {activeView === 'calendar' && 'Your extracted events and deadlines.'}
                {activeView === 'notes' && 'Review your extracted knowledge.'}
              </p>
            </div>
          </header>
          
          <div className={`w-full ${activeView === 'dashboard' ? 'block' : 'hidden'}`}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="col-span-1 lg:col-span-2">
                <DumpWindow onResults={handleNewResults} notes={data.study_notes || []} />
              </div>
              
              {isDataLoaded ? (
                <ResultsBoard 
                  data={data} 
                  onRemoveTask={handleRemoveTask} 
                  onRemoveEvent={handleRemoveEvent} 
                />
              ) : (
                <div className="col-span-1 lg:col-span-2 flex justify-center p-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                </div>
              )}
            </div>
          </div>

          <div className={`w-full ${activeView === 'calendar' ? 'block' : 'hidden'}`}>
            {isDataLoaded ? (
              <CalendarView 
                events={data.calendar_events || []} 
                onEventSynced={handleEventSynced}
              />
            ) : (
              <div className="flex justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
              </div>
            )}
          </div>

          <div className={`w-full ${activeView === 'notes' ? 'block' : 'hidden'}`}>
            {isDataLoaded ? (
              <NotesView 
                notes={data.study_notes || []} 
                onUpdateNote={handleUpdateNote}
                onDeleteNote={handleDeleteNote}
              />
            ) : (
              <div className="flex justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
              </div>
            )}
          </div>

          <div className={`w-full ${activeView === 'chat' ? 'block' : 'hidden'}`}>
            {isDataLoaded ? (
              <ChatView data={data} />
            ) : (
              <div className="flex justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
              </div>
            )}
          </div>
          </div>
      </main>
    </div>
  );
}
