import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { 
  AssistantMode, 
  Document, 
  Message, 
  PerformanceStats, 
  SystemLog 
} from "./types";
import Sidebar from "./components/Sidebar";
import ChatArea from "./components/ChatArea";
import KnowledgeBase from "./components/KnowledgeBase";
import ResearchDashboard from "./components/ResearchDashboard";
import AdminConsole from "./components/AdminConsole";
import TransparentMapLogo from "./components/TransparentMapLogo";
import { 
  MessageSquare, 
  BookOpen, 
  LineChart, 
  Database, 
  AlertTriangle,
  Info,
  LogOut,
  User as UserIcon,
  ChevronLeft,
  ChevronRight,
  Check,
  Menu,
  Shield
} from "lucide-react";
import { onAuthStateChanged, loginWithGoogle, logout, auth } from "./lib/firebase";
import { fetchChatSessions, saveChatSession, deleteChatSession, getChatSession, shareChatSession, updateMessageRating, ChatSession } from "./lib/chatSessions";
import { User } from "firebase/auth";

const checkIsAdmin = (u: User | null): boolean => {
  if (!u) return false;
  const email = u.email?.toLowerCase().trim() || "";
  return email === "kmjoy569@gmail.com";
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [webSearchEnabled, setWebSearchEnabled] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loginError, setLoginError] = useState<{ code: string; message: string } | null>(null);
  
  const isActualAdminUser = checkIsAdmin(user);
  
  // Resizable & minimizable sidebar states
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isMobileDocsOpen, setIsMobileDocsOpen] = useState(false);
  
  // Chat Sessions state
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isSharedView, setIsSharedView] = useState(false);
  const [sharedSession, setSharedSession] = useState<ChatSession | null>(null);

  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<"CHAT" | "KNOWLEDGE" | "DASHBOARD" | "ADMIN">("CHAT");
  
  // RAG State
  const [currentMode, setCurrentMode] = useState<AssistantMode>(AssistantMode.GENERAL);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Telemetry & Logs
  const [stats, setStats] = useState<PerformanceStats>({
    avgLatency: 760,
    totalTokens: 0,
    accuracyScore: 92,
    retrievalPrecision: 88,
    embeddingQuality: 85,
    hallucinationRate: 3,
    totalQuestions: 0,
    documentCount: 7
  });
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);

  // Local helper to append logs
  const appendSystemLog = (level: "info" | "warn" | "error", message: string) => {
    const newLog: SystemLog = {
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toISOString(),
      level,
      message
    };
    setSystemLogs((prev) => [newLog, ...prev].slice(0, 100));
  };

  // Fetch initial system state from full-stack backend
  const fetchSystemState = async (userId: string) => {
    try {
      // 1. Fetch index documents
      const docsRes = await fetch("/api/documents", {
        headers: { "user-id": userId }
      });
      if (docsRes.ok) {
        const docsData = await docsRes.json();
        setDocuments(docsData);
        // Default to select all documents for maximum RAG coverage
        setSelectedDocIds(docsData.map((d: Document) => d.id));
      }

      // 2. Fetch Performance Stats
      const statsRes = await fetch("/api/stats", {
        headers: { "user-id": userId }
      });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      // 3. Fetch Telemetry logs
      const logsRes = await fetch("/api/logs");
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setSystemLogs(logsData);
      }
      
      // 4. Fetch Chat Sessions
      const fetchedSessions = await fetchChatSessions(userId);
      setChatSessions(fetchedSessions);
      
      appendSystemLog("info", "Successfully synchronized system state with backend RAG container.");
    } catch (e: any) {
      appendSystemLog("error", "Failed to connect with backend server. Retrying state link...");
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log("Auth State Changed - User:", currentUser ? { uid: currentUser.uid, email: currentUser.email, displayName: currentUser.displayName } : null);
      setUser(currentUser);
      setAuthLoading(false);
      if (currentUser) {
        fetchSystemState(currentUser.uid);
        setIsAdmin(checkIsAdmin(currentUser));
      } else {
        setIsAdmin(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAdmin && (activeTab === "DASHBOARD" || activeTab === "ADMIN")) {
      setActiveTab("CHAT");
    }
  }, [isAdmin, activeTab]);

  const startResizing = (e: any) => {
    e.preventDefault();
    setIsResizing(true);
  };

  // Touch Gestures for mobile swipe-to-minimize / swipe-to-expand
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const touchStartedInScrollable = useRef(false);

  const handleTouchStart = (e: any) => {
    // Detect if the touch originated inside a designated scrollable region
    // (sidebar lists, chat message thread, etc). If so, skip swipe-to-collapse
    // handling entirely so native vertical scrolling is never interrupted.
    const target = e.target as HTMLElement;
    touchStartedInScrollable.current = !!target.closest('[data-scrollable="true"]');

    setTouchStartX(e.touches[0].clientX);
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchEnd = (e: any) => {
    if (touchStartX === null || touchStartY === null || touchStartedInScrollable.current) {
      setTouchStartX(null);
      setTouchStartY(null);
      touchStartedInScrollable.current = false;
      return;
    }
    
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    
    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;
    
    // Check horizontal swipe threshold (at least 50px)
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
      if (diffX < 0) {
        // Swipe left -> collapse sidebar
        setSidebarCollapsed(true);
        appendSystemLog("info", "Minimized sidebar via swipe gesture.");
      } else {
        // Swipe right -> expand if touch started on the left boundary
        if (touchStartX < 80) {
          setSidebarCollapsed(false);
          appendSystemLog("info", "Restored sidebar via swipe gesture.");
        }
      }
    }
    
    setTouchStartX(null);
    setTouchStartY(null);
    touchStartedInScrollable.current = false;
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = Math.max(200, Math.min(500, e.clientX));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  const handleDeleteSession = async (sessionId: string) => {
    try {
      appendSystemLog("info", `Deleting conversation session: ${sessionId}`);
      const success = await deleteChatSession(sessionId);
      if (success) {
        setChatSessions((prev) => prev.filter((s) => s.id !== sessionId));
        if (currentSessionId === sessionId) {
          setMessages([]);
          setCurrentSessionId(null);
        }
        appendSystemLog("info", "Deleted chat session from secure repository.");
      } else {
        throw new Error("API call returned failure state.");
      }
    } catch (e: any) {
      appendSystemLog("error", `Failed to delete conversation: ${e.message || e}`);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shareId = params.get("share");
    if (shareId) {
      setIsSharedView(true);
      getChatSession(shareId).then((session) => {
        if (session) {
          setSharedSession(session);
          setMessages(session.messages || []);
          appendSystemLog("info", `Public shared conversation session loaded: "${session.title}"`);
        } else {
          appendSystemLog("error", "The public shared chat session was not found or is private.");
        }
      });
    }
  }, []);

  const handleBackToMySession = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("share");
    window.history.pushState({}, "", url.toString());
    
    setIsSharedView(false);
    setSharedSession(null);
    setMessages([]);
    setCurrentSessionId(null);
    appendSystemLog("info", "Returned to live secure application workspace.");
  };

  const handleShareSession = async (sessionId: string) => {
    const success = await shareChatSession(sessionId);
    if (success) {
      const shareUrl = `${window.location.origin}${window.location.pathname}?share=${sessionId}`;
      try {
        await navigator.clipboard.writeText(shareUrl);
        appendSystemLog("info", `Conversation shared publicly! URL copied to clipboard: ${shareUrl}`);
        alert(`Sharing enabled! Public link copied to clipboard:\n\n${shareUrl}`);
      } catch (err) {
        appendSystemLog("warn", `Shared successfully, but failed to auto-copy: ${shareUrl}`);
        alert(`Sharing enabled! Here is your public link:\n\n${shareUrl}`);
      }
    } else {
      appendSystemLog("error", "Failed to mark conversation as shared. Please try again.");
    }
  };

  const handleRateMessage = async (messageId: string, rating: "up" | "down" | null) => {
    // Update local messages state first for immediate UI feedback
    setMessages(prev => prev.map(msg => msg.id === messageId ? { ...msg, rating: rating === null ? undefined : rating } : msg));

    if (!currentSessionId) {
      return;
    }

    // Persist to Firestore
    const success = await updateMessageRating(currentSessionId, messageId, rating);
    if (success) {
      appendSystemLog("info", `Saved message feedback: ${rating ? `Thumbs ${rating.toUpperCase()}` : "Cleared rating"}.`);
      // Update local sessions array cache
      setChatSessions(prev => prev.map(s => {
        if (s.id === currentSessionId) {
          const updatedMessages = s.messages.map(msg => msg.id === messageId ? { ...msg, rating: rating === null ? undefined : rating } : msg);
          return { ...s, messages: updatedMessages };
        }
        return s;
      }));
    } else {
      appendSystemLog("error", "Failed to save feedback to the secure cloud repository.");
    }
  };

  const handleLogin = async () => {
    setLoginError(null);
    try {
      await loginWithGoogle();
    } catch (error: any) {
      console.error("Login failed", error);
      const code = error.code || "unknown";
      let message = error.message || "An unexpected error occurred during sign-in.";
      
      if (code === 'auth/unauthorized-domain') {
        message = "This domain is not authorized in your Firebase project yet.";
      } else if (code === 'auth/popup-blocked') {
        message = "Google login popup was blocked by your web browser.";
      }
      
      setLoginError({ code, message });
    }
  };

  // Handle document toggle selection in sidebar
  const handleToggleDoc = (id: string) => {
    setSelectedDocIds((prev) => 
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };

  // Document Upload callback
  const handleUploadSuccess = (newDoc: Document) => {
    setDocuments((prev) => [newDoc, ...prev]);
    setSelectedDocIds((prev) => [...prev, newDoc.id]); // Automatically select new documents
    if (user) fetchSystemState(user.uid); // Reload server stats & logs
  };

  // Document Delete callback
  const handleDeleteSuccess = (id: string) => {
    setDocuments((prev) => prev.filter(d => d.id !== id));
    setSelectedDocIds((prev) => prev.filter(d => d !== id));
    if (user) fetchSystemState(user.uid); // Reload server stats & logs
  };

  // Chat Submission Core
  const handleSendMessage = async (text: string) => {
    if (isGenerating || !user) return;

    // 1. Construct user message object
    const userMsg: Message = {
      id: Math.random().toString(36).substring(7),
      role: "user",
      content: text,
      timestamp: new Date().toISOString()
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setIsGenerating(true);
    appendSystemLog("info", `Analyzing query parameters for routing... Mode: ${currentMode}`);

    try {
      // 2. Dispatch query to backend RAG chat router
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "user-id": user.uid
        },
        body: JSON.stringify({
          messages: updatedMessages,
          selectedDocIds,
          mode: currentMode,
          webSearchEnabled
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "RAG engine failed to synthesize answer.");
      }

      // 3. Append model response to thread
      const modelResponseMsg: Message = {
        id: data.id,
        role: "model",
        content: data.content,
        timestamp: data.timestamp,
        citations: data.citations,
        confidence: data.confidence,
        retrievedChunks: data.retrievedChunks,
        detectedLang: data.detectedLang,
        latencyMs: data.latencyMs,
        tokensUsed: data.tokensUsed
      };

      const finalMessages = [...updatedMessages, modelResponseMsg];
      setMessages(finalMessages);
      appendSystemLog("info", `Synthesized answer generated successfully. Quality confidence: ${data.confidence}%`);
      
      // Save session to Firestore
      const sessionId = currentSessionId || Math.random().toString(36).substring(7);
      const title = currentSessionId ? undefined : text.slice(0, 40) + (text.length > 40 ? '...' : '');
      await saveChatSession(sessionId, title || "New Chat", finalMessages);
      if (!currentSessionId) {
        setCurrentSessionId(sessionId);
        // Refresh sessions list
        const fetchedSessions = await fetchChatSessions(user.uid);
        setChatSessions(fetchedSessions);
      } else {
        // Update local session
        setChatSessions(prev => prev.map(s => s.id === sessionId ? { ...s, messages: finalMessages } : s));
      }
      
      // 4. Refetch stats & logs to update dashboard graphics dynamically
      const statsRes = await fetch("/api/stats");
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
      
      const logsRes = await fetch("/api/logs");
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setSystemLogs(logsData);
      }

    } catch (err: any) {
      appendSystemLog("error", `RAG synthesis failure: ${err.message || err}`);
      
      // Fallback response inside the chat in case of catastrophic network drop
      const errorResponseMsg: Message = {
        id: Math.random().toString(36).substring(7),
        role: "model",
        content: `I apologize, but I encountered an issue consulting the active RAG indices. This can occur if your environment does not have a valid Gemini API Key configured in the secrets panel. Please check your **Settings > Secrets** panel.`,
        timestamp: new Date().toISOString(),
        confidence: 0,
        detectedLang: "English"
      };
      setMessages((prev) => [...prev, errorResponseMsg]);
    } finally {
      setIsGenerating(false);
    }
  };

  // Reset thread
  const handleClearChat = () => {
    setMessages([]);
    setCurrentSessionId(null);
    appendSystemLog("info", "Active chat conversation thread reset.");
  };
  
  const handleLoadSession = (sessionId: string) => {
    const session = chatSessions.find(s => s.id === sessionId);
    if (session) {
      setMessages(session.messages || []);
      setCurrentSessionId(sessionId);
      appendSystemLog("info", `Loaded session: ${session.title}`);
    }
  };

  // Knowledge Base Bridge: autofills and submits query from cards
  const handleSelectQueryFromKB = (query: string) => {
    setActiveTab("CHAT");
    setTimeout(() => {
      handleSendMessage(query);
    }, 150);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-bg-base font-sans text-slate-100">
      
      {authLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full"></div>
        </div>
      ) : !user && !isSharedView ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-[#050807] p-6 relative overflow-hidden">
          {/* Ambient background glow elements */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full filter blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-700/5 rounded-full filter blur-3xl pointer-events-none"></div>

          <div className="flex flex-col items-center max-w-md w-full relative z-10">
            {/* Animated Floating Dark Logo */}
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              whileHover={{ scale: 1.05 }}
              className="w-20 h-20 rounded-2xl bg-[#0a110d] border border-emerald-900/30 flex items-center justify-center glow-emerald-glow mb-6 overflow-hidden shadow-2xl cursor-pointer"
            >
              <TransparentMapLogo 
                src="/2.png" 
                removeColor="black" 
                alt="BanglaMind AI Dark Logo" 
                className="w-14 h-14" 
                glowColor="rgba(16, 185, 129, 0.8)" 
                glowRadius="8px"
              />
            </motion.div>
            
            <h1 className="text-3xl font-display font-bold text-white mb-2 text-center">Welcome to BanglaMind AI</h1>
            <p className="text-slate-400 mb-8 max-w-md text-center text-sm leading-relaxed">
              Your intelligent, Bangladesh-centric assistant. Sign in to access personalized research, knowledge base, and interactive AI capabilities.
            </p>

            {loginError && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full bg-red-950/50 border border-red-500/30 text-red-200 p-4 rounded-xl mb-6 text-sm text-left shadow-xl"
              >
                <div className="flex items-start space-x-2.5 mb-2.5">
                  <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-red-300">
                      {loginError.code === 'auth/unauthorized-domain' ? 'Firebase Domain Setup Required' : 'Sign-In Failed'}
                    </h4>
                    <p className="text-xs text-red-400/90 mt-0.5">{loginError.message}</p>
                  </div>
                </div>

                {loginError.code === 'auth/unauthorized-domain' && (
                  <div className="bg-black/50 p-3 rounded-lg text-xs space-y-2 text-slate-300 font-sans border border-red-950/40">
                    <p className="font-medium text-amber-400">Add your domain in Firebase Console:</p>
                    <ol className="list-decimal list-inside space-y-1.5 pl-1 text-[11px] text-slate-300 leading-relaxed">
                      <li>Go to the <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-emerald-400 underline hover:text-emerald-300 font-medium">Firebase Console</a></li>
                      <li>Select your project: <strong className="text-white">banglamind-ai</strong></li>
                      <li>Go to <strong>Authentication</strong> &gt; <strong>Settings</strong> &gt; <strong>Authorized Domains</strong></li>
                      <li>Click <strong>Add domain</strong> and paste this host:
                        <div className="bg-slate-900 px-2.5 py-1.5 rounded border border-slate-800 text-[10px] font-mono select-all my-1.5 text-emerald-400 font-bold break-all">
                          {window.location.hostname || "your-applet-domain.render.com"}
                        </div>
                      </li>
                    </ol>
                  </div>
                )}

                {loginError.code === 'auth/popup-blocked' && (
                  <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                    Please allow popups for this website in your browser settings (usually clicking the lock/info icon in the address bar) and try again.
                  </p>
                )}

                <button 
                  onClick={() => setLoginError(null)} 
                  className="mt-3 text-xs font-semibold text-slate-400 hover:text-white underline transition-colors"
                >
                  Dismiss Error
                </button>
              </motion.div>
            )}
            
            <button
              onClick={handleLogin}
              className="flex items-center space-x-3 bg-white hover:bg-slate-100 text-slate-900 px-6 py-3.5 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] cursor-pointer mb-10 w-full justify-center"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span>Continue with Google</span>
            </button>

            {/* Showcase Card with White Background using 1.png */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="bg-white text-slate-800 p-4 rounded-xl shadow-2xl w-full border border-slate-200 flex items-center space-x-4 hover:shadow-emerald-500/5 transition-all"
            >
              <div className="w-12 h-12 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100 overflow-hidden shadow-inner">
                <TransparentMapLogo 
                  src="/1.png" 
                  removeColor="white" 
                  alt="BanglaMind AI Light Logo" 
                  className="w-10 h-10" 
                  glowColor="rgba(16, 185, 129, 0.4)" 
                  glowRadius="4px"
                />
              </div>
              <div className="text-left overflow-hidden">
                <p className="text-[10px] font-mono text-emerald-600 font-bold tracking-widest uppercase">Verified Portal</p>
                <h4 className="text-sm font-bold text-slate-900 truncate">NID & e-Passport Verification</h4>
                <p className="text-[11px] text-slate-500 truncate">Sovereign document index systems active</p>
              </div>
            </motion.div>
          </div>
        </div>
      ) : (
        <>
          {/* Top Universal Navbar */}
          <header className="px-6 py-3 border-b border-emerald-900/20 bg-bg-base/80 backdrop-blur-md flex flex-col md:flex-row items-center justify-between shrink-0 gap-3 z-10 relative shadow-md">
            <div className="flex items-center space-x-3.5 w-full md:w-auto justify-between md:justify-start">
              <div className="flex items-center space-x-3">
                {user && (
                  <button
                    onClick={() => {
                      setSidebarCollapsed(!sidebarCollapsed);
                      appendSystemLog("info", `Mobile menu toggled: ${sidebarCollapsed ? "expanded" : "collapsed"}`);
                    }}
                    className="md:hidden p-2 rounded-lg bg-[#0a110d] border border-emerald-900/30 text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
                    title="Toggle menu"
                  >
                    <Menu className="w-4 h-4" />
                  </button>
                )}
                <motion.div 
                  whileHover={{ scale: 1.05, rotate: 4 }}
                  className="w-9 h-9 rounded-xl bg-[#0a110d] border border-emerald-900/30 flex items-center justify-center glow-emerald-glow shadow-lg shadow-emerald-500/20 overflow-hidden cursor-pointer"
                >
                  <TransparentMapLogo 
                    src="/2.png" 
                    removeColor="black" 
                    alt="BanglaMind AI Logo" 
                    className="w-7 h-7" 
                    glowColor="rgba(16, 185, 129, 0.7)" 
                    glowRadius="4px"
                  />
                </motion.div>

                <div>
                  <h1 className="font-display font-bold text-sm tracking-tight text-white flex items-center">
                    <span>BanglaMind <span className="text-emerald-500 font-extrabold">AI</span> Portal</span>
                    {user && isActualAdminUser && (
                      <span className="ml-1.5 text-[7px] tracking-wider font-mono font-bold px-1.5 py-0.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.4)]">
                        ADMIN
                      </span>
                    )}
                  </h1>
                  <p className="text-[10px] text-slate-400 font-mono leading-none mt-1">Intelligent Search & Research Assistant</p>
                </div>
              </div>
            </div>

            {/* Nav tabs + user actions grouped into one row so they never split onto separate lines on mobile */}
            <div className="flex items-center justify-between w-full md:w-auto gap-3">
              {/* Modular Navigation Tabs with glass styles - Hidden or locked for guests in Shared mode */}
              {user && (
                <nav 
                  className="flex space-x-1 p-1 bg-[#050807] rounded-xl border border-emerald-900/15 shadow-inner overflow-x-auto flex-nowrap max-w-[calc(100vw-140px)] md:max-w-none"
                  style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-x" }}
                  data-scrollable="true"
                >
                  <button
                    onClick={() => setActiveTab("CHAT")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer shrink-0 ${
                      activeTab === "CHAT" 
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/10" 
                        : "text-slate-400 hover:text-slate-200 hover:bg-emerald-900/10"
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Chat</span>
                  </button>
                  
                  {isAdmin && (
                    <>
                      <button
                        onClick={() => setActiveTab("KNOWLEDGE")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer shrink-0 ${
                          activeTab === "KNOWLEDGE" 
                            ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/10" 
                            : "text-slate-400 hover:text-slate-200 hover:bg-emerald-900/10"
                        }`}
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Knowledge Base</span>
                      </button>

                      <button
                        onClick={() => setActiveTab("DASHBOARD")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer shrink-0 ${
                          activeTab === "DASHBOARD" 
                            ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/10" 
                            : "text-slate-400 hover:text-slate-200 hover:bg-emerald-900/10"
                        }`}
                      >
                        <LineChart className="w-3.5 h-3.5" />
                        <span>Dashboard</span>
                      </button>

                      <button
                        onClick={() => setActiveTab("ADMIN")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer shrink-0 ${
                          activeTab === "ADMIN" 
                            ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/10" 
                            : "text-slate-400 hover:text-slate-200 hover:bg-emerald-900/10"
                        }`}
                      >
                        <Database className="w-3.5 h-3.5" />
                        <span>Admin Console</span>
                      </button>
                    </>
                  )}
                </nav>
              )}

              <div className="flex items-center space-x-3 shrink-0">
                {user ? (
                  <>
                    <div className="hidden sm:flex items-center space-x-2 bg-[#050807] py-1.5 px-3 rounded-full border border-emerald-900/20">
                      {user.photoURL ? (
                        <img src={user.photoURL} alt="Profile" className="w-5 h-5 rounded-full" />
                      ) : (
                        <UserIcon className="w-4 h-4 text-emerald-500" />
                      )}
                      <span className="text-[11px] font-medium text-slate-300 truncate max-w-[100px]">{user.displayName || user.email}</span>
                      {isActualAdminUser && (
                        <span className="text-[8px] tracking-wider font-mono font-bold px-1.5 py-0.5 bg-gradient-to-r from-emerald-500 to-emerald-600 border border-emerald-400/20 text-white rounded flex items-center gap-0.5 shadow-[0_0_8px_rgba(16,185,129,0.3)] select-none">
                          <Shield className="w-2.5 h-2.5 fill-white text-emerald-300 shrink-0" />
                          ROOT ADMIN
                        </span>
                      )}
                    </div>

                    {/* Dynamic simulated admin privilege switch for testing and preview */}
                    {isActualAdminUser && (
                      <button 
                        onClick={() => {
                          setIsAdmin(!isAdmin);
                          appendSystemLog("info", `Security Overrides: Switched session role to ${!isAdmin ? "ADMINISTRATOR" : "STANDARD_USER"}.`);
                        }}
                        className={`text-[10px] font-mono font-bold px-3 py-1.5 rounded-full border transition-all cursor-pointer flex items-center space-x-1.5 ${
                          isAdmin 
                            ? "bg-emerald-500 text-slate-950 border-emerald-400 font-extrabold shadow-[0_0_15px_rgba(16,185,129,0.5)]" 
                            : "bg-amber-500 text-slate-950 border-amber-400 font-extrabold shadow-[0_0_15px_rgba(245,158,11,0.5)]"
                        }`}
                        title="Developer Override: Switch between Administrator View and User Preview mode"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping shrink-0"></span>
                        <span>ROLE: {isAdmin ? "ADMIN ACTIVE" : "PREVIEW GUEST USER"}</span>
                      </button>
                    )}

                    <button 
                      onClick={logout}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer"
                      title="Logout"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleLogin}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs py-2 px-4 rounded-lg transition-colors cursor-pointer shadow-md font-mono uppercase"
                  >
                    Log In
                  </button>
                )}
              </div>
            </div>
          </header>

          {/* Main viewport area matching current tab */}
          <main className="flex-1 overflow-hidden relative">
            {activeTab === "CHAT" && (
              <div 
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                className="flex h-full w-full overflow-hidden relative"
              >
                {/* Mobile sidebar dark backdrop overlay when expanded */}
                {!sidebarCollapsed && (
                  <div 
                    onClick={() => setSidebarCollapsed(true)}
                    className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-xs z-35 transition-opacity cursor-pointer"
                  ></div>
                )}

                {/* Sidebar with upload handles */}
                <div data-scrollable="true" className="contents">
                  <Sidebar
                    currentMode={currentMode}
                    setMode={setCurrentMode}
                    documents={documents}
                    selectedDocIds={selectedDocIds}
                    toggleDocSelection={handleToggleDoc}
                    onUploadSuccess={handleUploadSuccess}
                    onDeleteSuccess={handleDeleteSuccess}
                    addLogMessage={appendSystemLog}
                    userId={user?.uid}
                    webSearchEnabled={webSearchEnabled}
                    setWebSearchEnabled={setWebSearchEnabled}
                    chatSessions={chatSessions}
                    currentSessionId={currentSessionId}
                    onLoadSession={handleLoadSession}
                    onNewChat={handleClearChat}
                    isAdmin={isAdmin}
                    onDeleteSession={handleDeleteSession}
                    width={sidebarWidth}
                    collapsed={sidebarCollapsed}
                    onClose={() => setSidebarCollapsed(true)}
                  />
                </div>
                
                {/* Resizer Handle */}
                {!sidebarCollapsed && (
                  <div
                    onMouseDown={startResizing}
                    className={`w-[4px] hover:w-[6px] h-full cursor-col-resize bg-emerald-950/20 hover:bg-emerald-500/40 transition-all relative group shrink-0 z-20 ${isResizing ? 'bg-emerald-500/60 w-[6px]' : ''}`}
                  >
                    {/* Floating collapse button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSidebarCollapsed(true);
                      }}
                      className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 w-4 h-8 bg-[#0a110d] border border-emerald-900/40 rounded flex items-center justify-center text-slate-400 hover:text-emerald-400 shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-40 cursor-pointer"
                      title="Collapse Sidebar"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Conversations frame */}
                <div data-scrollable="true" className="contents">
                  <ChatArea
                    mode={currentMode}
                    messages={messages}
                    selectedDocIds={selectedDocIds}
                    onSendMessage={handleSendMessage}
                    onClearChat={handleClearChat}
                    isGenerating={isGenerating}
                    addLogMessage={appendSystemLog}
                    currentSessionId={currentSessionId}
                    onShareSession={handleShareSession}
                    isSharedView={isSharedView}
                    onBackToMySession={handleBackToMySession}
                    onRateMessage={handleRateMessage}
                    isAdmin={isAdmin}
                  />
                </div>

                {/* Floating Action Button for mobile-friendly document toggling (Admin / Authorized only) */}
                {isAdmin && (
                  <button
                    onClick={() => setIsMobileDocsOpen(true)}
                    className="md:hidden fixed bottom-24 right-4 z-40 flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs py-2.5 px-4 rounded-full shadow-lg shadow-emerald-950/40 active:scale-95 transition-all cursor-pointer border border-emerald-500/20"
                    title="Active Sources Toggle"
                  >
                    <Database className="w-3.5 h-3.5 animate-pulse" />
                    <span>Sources ({selectedDocIds.length})</span>
                  </button>
                )}

                {/* Mobile Document Selector Bottom Sheet Drawer */}
                {isMobileDocsOpen && (
                  <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
                    {/* Backdrop */}
                    <div 
                      onClick={() => setIsMobileDocsOpen(false)}
                      className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
                    ></div>
                    
                    {/* Sliding Bottom Sheet */}
                    <motion.div 
                      initial={{ y: "100%" }}
                      animate={{ y: 0 }}
                      exit={{ y: "100%" }}
                      transition={{ type: "spring", damping: 25, stiffness: 200 }}
                      className="relative w-full max-h-[80vh] bg-[#070c09] border-t border-emerald-900/40 rounded-t-2xl p-5 flex flex-col shadow-2xl overflow-hidden z-10"
                    >
                      {/* Swipe handle decoration */}
                      <div className="w-12 h-1.5 bg-emerald-950/60 rounded-full mx-auto mb-4 shrink-0"></div>
                      
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-display font-bold text-sm text-emerald-50">Active Retrieval Sources</h3>
                          <p className="text-[10px] text-slate-500">Toggle documents to customize RAG synthesis scope</p>
                        </div>
                        <button 
                          onClick={() => setIsMobileDocsOpen(false)}
                          className="text-[11px] font-semibold text-slate-400 hover:text-emerald-400 cursor-pointer border border-emerald-900/30 bg-[#0a110d] px-2.5 py-1 rounded-lg"
                        >
                          Close
                        </button>
                      </div>
                      
                      {/* Document Checklist Scroll Container */}
                      <div 
                        className="flex-1 overflow-y-auto overscroll-contain space-y-2 pr-1 mb-4"
                        style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}
                        data-scrollable="true"
                      >
                        {documents.length === 0 ? (
                          <div className="text-center py-8 text-xs text-slate-500">
                            No documents indexed yet.
                          </div>
                        ) : (
                          documents.map((doc) => {
                            const isSelected = selectedDocIds.includes(doc.id);
                            return (
                              <div 
                                key={doc.id}
                                onClick={() => handleToggleDoc(doc.id)}
                                className={`p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                                  isSelected 
                                    ? "border-emerald-500/30 bg-emerald-900/10 text-emerald-400" 
                                    : "border-emerald-900/15 bg-bg-base/40 text-slate-300"
                                }`}
                              >
                                <div className="flex items-center space-x-3 overflow-hidden flex-1">
                                  <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                                    isSelected 
                                      ? "border-emerald-500 bg-emerald-500 text-slate-950" 
                                      : "border-emerald-900/30"
                                  }`}>
                                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                  </div>
                                  <div className="overflow-hidden leading-tight">
                                    <div className="font-semibold text-xs truncate">{doc.title}</div>
                                    <div className="flex items-center space-x-2 mt-1 text-[9px] text-slate-500 font-mono">
                                      <span className="uppercase text-emerald-500 font-bold">{doc.type}</span>
                                      <span>•</span>
                                      <span>{doc.size}</span>
                                      <span>•</span>
                                      <span>{doc.wordCount} w</span>
                                    </div>
                                  </div>
                                </div>
                                {doc.isPreseeded && (
                                  <span className="text-[8px] font-mono tracking-wider text-emerald-500 bg-emerald-500/10 py-0.5 px-1.5 rounded shrink-0">
                                    SYSTEM
                                  </span>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                      
                      {/* Action footer */}
                      <div className="flex items-center justify-between pt-3 border-t border-emerald-900/20 text-[10px] text-slate-500 font-mono">
                        <span>{selectedDocIds.length} of {documents.length} Selected</span>
                        <button 
                          onClick={() => {
                            if (selectedDocIds.length === documents.length) {
                              setSelectedDocIds([]);
                            } else {
                              setSelectedDocIds(documents.map(d => d.id));
                            }
                          }}
                          className="text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer font-semibold"
                        >
                          {selectedDocIds.length === documents.length ? "Deselect All" : "Select All"}
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "KNOWLEDGE" && isAdmin && (
              <KnowledgeBase onSelectQuery={handleSelectQueryFromKB} />
            )}

            {activeTab === "DASHBOARD" && isAdmin && (
              <ResearchDashboard stats={stats} addLogMessage={appendSystemLog} documents={documents} />
            )}

            {activeTab === "ADMIN" && isAdmin && (
              <AdminConsole 
                logs={systemLogs} 
                onAddLog={appendSystemLog} 
                documentCount={documents.length} 
                stats={stats}
                documents={documents}
              />
            )}
          </main>
        </>
      )}
    </div>
  );
}
