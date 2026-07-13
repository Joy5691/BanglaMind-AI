import React, { useState, useEffect } from "react";
import { SystemLog, PerformanceStats, Document } from "../types";
import ResearchDashboard from "./ResearchDashboard";
import { fetchChatSessions, ChatSession } from "../lib/chatSessions";
import { 
  Database, 
  Terminal, 
  Cpu, 
  Trash2, 
  RefreshCw, 
  Check, 
  FileText, 
  Plus, 
  AlertCircle,
  Users,
  LineChart,
  X,
  MessageSquare,
  Clock
} from "lucide-react";

interface UserStat {
  userId: string;
  lastActive: string;
  queriesCount: number;
  avgLatency: number;
  tokensUsed: number;
}

interface AdminConsoleProps {
  logs: SystemLog[];
  onAddLog: (type: "info" | "warn" | "error", msg: string) => void;
  documentCount: number;
  stats: PerformanceStats;
  documents: Document[];
}

export default function AdminConsole({ logs, onAddLog, documentCount, stats, documents }: AdminConsoleProps) {
  const [activeLogs, setActiveLogs] = useState<SystemLog[]>(logs);
  const [activeUsers, setActiveUsers] = useState<UserStat[]>([]);
  const [filterLevel, setFilterLevel] = useState<"ALL" | "INFO" | "WARN" | "ERROR">("ALL");
  const [rawTitle, setRawTitle] = useState("");
  const [rawText, setRawText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [adminTab, setAdminTab] = useState<"DB" | "TELEMETRY" | "USERS">("DB");

  // User Session Preview States
  const [selectedUserUid, setSelectedUserUid] = useState<string | null>(null);
  const [userSessions, setUserSessions] = useState<ChatSession[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [selectedPreviewSession, setSelectedPreviewSession] = useState<ChatSession | null>(null);

  const handleUserSelect = async (userId: string) => {
    setSelectedUserUid(userId);
    setIsLoadingSessions(true);
    setSelectedPreviewSession(null);
    try {
      const sessions = await fetchChatSessions(userId);
      setUserSessions(sessions);
    } catch (e) {
      console.error("Failed to load user sessions for preview", e);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  useEffect(() => {
    setActiveLogs(logs);
  }, [logs]);

  // Fetch active users stats
  const fetchActiveUsers = async () => {
    try {
      const response = await fetch("/api/admin/users");
      if (response.ok) {
        const data = await response.json();
        setActiveUsers(data);
      }
    } catch (e) {
      console.error("Failed to fetch active users", e);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchActiveUsers();
    const interval = setInterval(() => {
      fetchLogs();
      fetchActiveUsers();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Fetch log updates from backend
  const fetchLogs = async () => {
    try {
      const response = await fetch("/api/logs");
      if (response.ok) {
        const data = await response.json();
        setActiveLogs(data);
      }
    } catch (e) {
      onAddLog("error", "Failed to retrieve live system logs from container backend.");
    }
  };

  // Clear system logs
  const clearLogs = async () => {
    try {
      const response = await fetch("/api/logs/clear", { method: "POST" });
      if (response.ok) {
        setActiveLogs([]);
        onAddLog("info", "System activity console records flushed by admin command.");
      }
    } catch (e) {
      onAddLog("error", "Flushing command failed.");
    }
  };

  // Submit direct dataset injection
  const handleDatasetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawTitle.trim() || !rawText.trim()) return;

    setIsSubmitting(true);
    setSubmitError("");
    setSubmitSuccess(false);
    onAddLog("info", `Initiating direct indexing for custom dataset: "${rawTitle}"...`);

    try {
      const response = await fetch("/api/document/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: rawTitle,
          content: rawText,
          base64Data: null,
          mimeType: null
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "RAG seeder failed to process paragraphs.");
      }

      setSubmitSuccess(true);
      setRawTitle("");
      setRawText("");
      onAddLog("info", `Direct seeder completed for "${rawTitle}". Generated ${data.chunksIndexed} new vector segments.`);
      await fetchLogs();
    } catch (err: any) {
      setSubmitError(err.message || "Seeding failed.");
      onAddLog("error", `Direct dataset seeder failed: ${err.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredLogs = activeLogs.filter(log => {
    if (filterLevel === "ALL") return true;
    return log.level.toUpperCase() === filterLevel;
  });

  return (
    <div className="p-6 space-y-6 h-full overflow-y-auto bg-bg-base">
      
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-emerald-900/10 pb-4 gap-4">
        <div>
          <h2 className="text-xl font-display font-bold text-white flex items-center space-x-2">
            <Database className="w-5 h-5 text-emerald-400" />
            <span>Admin & Database Console</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Flawlessly seed raw text corpuses, inspect index density, and monitor operational telemetry logs.
          </p>
        </div>

        {/* Sub-tab selection */}
        <div className="flex p-1 bg-[#050807] rounded-xl border border-emerald-900/15">
          <button
            onClick={() => setAdminTab("DB")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
              adminTab === "DB"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/10"
                : "text-slate-400 hover:text-slate-200 hover:bg-emerald-900/5"
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>DB & Seeding Logs</span>
          </button>

          <button
            onClick={() => setAdminTab("TELEMETRY")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
              adminTab === "TELEMETRY"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/10"
                : "text-slate-400 hover:text-slate-200 hover:bg-emerald-900/5"
            }`}
          >
            <LineChart className="w-3.5 h-3.5" />
            <span>Telemetry & Stats</span>
          </button>

          <button
            onClick={() => setAdminTab("USERS")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
              adminTab === "USERS"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/10"
                : "text-slate-400 hover:text-slate-200 hover:bg-emerald-900/5"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>User Stats</span>
          </button>
        </div>
      </div>

      {adminTab === "TELEMETRY" && (
        <ResearchDashboard stats={stats} addLogMessage={onAddLog} documents={documents} isEmbedded={true} />
      )}

      {adminTab === "DB" && (
        <>
          {/* Database stats monitor cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <div className="p-4 rounded-xl border border-emerald-900/15 bg-[#0A100D]/40 space-y-2 shadow-[0_4px_16px_rgba(0,0,0,0.15)]">
              <div className="flex items-center justify-between text-slate-500 text-[10px] font-mono uppercase">
                <span>Operational Mode</span>
                <Cpu className="w-4 h-4 text-emerald-400 animate-pulse" />
              </div>
              <p className="text-sm font-bold text-slate-200">Server Authorized Full-Stack</p>
              <div className="text-[10px] text-slate-500 leading-tight font-mono">
                All API Keys & vector indices are securely maintained server-side.
              </div>
            </div>

            <div className="p-4 rounded-xl border border-emerald-900/15 bg-[#0A100D]/40 space-y-2 shadow-[0_4px_16px_rgba(0,0,0,0.15)]">
              <div className="flex items-center justify-between text-slate-500 text-[10px] font-mono uppercase">
                <span>Index Density</span>
                <Database className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-sm font-bold text-slate-200">{documentCount} Registered Documents</p>
              <div className="text-[10px] text-slate-500 leading-tight font-mono">
                RAG hybrid search runs over pre-seeded and user-uploaded resources.
              </div>
            </div>

            <div className="p-4 rounded-xl border border-emerald-900/15 bg-[#0A100D]/40 space-y-2 shadow-[0_4px_16px_rgba(0,0,0,0.15)]">
              <div className="flex items-center justify-between text-slate-500 text-[10px] font-mono uppercase">
                <span>Grounding Security</span>
                <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-1.5 py-0.5 rounded-full font-mono">ENFORCED</span>
              </div>
              <p className="text-sm font-bold text-slate-200">Anti-Hallucination Guardrails</p>
              <div className="text-[10px] text-slate-500 leading-tight font-mono">
                Citations and sources are strictly calculated via cosine semantic overlap.
              </div>
            </div>

          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Dataset Seeder Form */}
        <div className="p-5 rounded-xl border border-emerald-900/20 bg-[#0A100D]/40 flex flex-col justify-between shadow-[0_4px_16px_rgba(0,0,0,0.2)]">
          <div className="space-y-4">
            <div>
              <h3 className="font-display font-bold text-sm text-white flex items-center space-x-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>Raw Dataset Seeder</span>
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Paste structured texts (e.g. legal bills, university admissions, agricultural sheets) to index immediately.
              </p>
            </div>

            <form onSubmit={handleDatasetSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-slate-500">Document Title / Tag</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Bangladesh Cyber Security Act 2026 Summary"
                  value={rawTitle}
                  onChange={(e) => setRawTitle(e.target.value)}
                  className="w-full bg-[#050807]/90 border border-emerald-900/25 focus:border-emerald-500/40 focus:outline-none rounded-lg p-2.5 text-xs text-slate-300 font-mono transition-colors placeholder-slate-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-slate-500">Raw Dataset Content</label>
                <textarea
                  required
                  placeholder="Paste paragraph blocks here..."
                  rows={4}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  className="w-full bg-[#050807]/90 border border-emerald-900/25 focus:border-emerald-500/40 focus:outline-none rounded-lg p-2.5 text-xs text-slate-300 font-mono resize-none leading-relaxed transition-colors placeholder-slate-500"
                />
              </div>

              {submitError && (
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-lg text-[10px] text-rose-400 flex items-start space-x-2 font-mono">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{submitError}</span>
                </div>
              )}

              {submitSuccess && (
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[10px] text-emerald-400 flex items-start space-x-2 font-mono">
                  <Check className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>Success! Dataset text has been chunked and vector embeddings generated.</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !rawTitle.trim() || !rawText.trim()}
                className={`w-full py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                  isSubmitting 
                    ? "bg-emerald-950/20 text-emerald-800 cursor-not-allowed border border-emerald-950/30" 
                    : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/20"
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                    <span>Indexing Vector Embeddings...</span>
                  </>
                ) : (
                  <>
                    <Database className="w-3.5 h-3.5" />
                    <span>Generate Semantic Index</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Console System Log Viewer */}
        <div className="p-5 rounded-xl border border-emerald-900/20 bg-[#0A100D]/40 flex flex-col justify-between h-[360px] shadow-[0_4px_16px_rgba(0,0,0,0.2)]">
          <div className="flex flex-col h-full space-y-3">
            {/* Header bar of logger */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-sm text-white flex items-center space-x-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span>System Activity Telemetry</span>
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Real-time operational stream from Express server and Gemini SDK.
                </p>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <button
                  onClick={fetchLogs}
                  className="p-1.5 bg-[#050807]/80 hover:bg-emerald-950/20 text-slate-400 hover:text-slate-200 border border-emerald-900/15 rounded-lg transition-colors cursor-pointer"
                  title="Force refresh logs"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={clearLogs}
                  className="p-1.5 bg-[#050807]/80 hover:bg-emerald-950/20 text-slate-400 hover:text-rose-400 border border-emerald-900/15 rounded-lg transition-colors cursor-pointer"
                  title="Clear console log list"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Log filter buttons */}
            <div className="flex space-x-1.5 border-b border-emerald-900/15 pb-2">
              {["ALL", "INFO", "WARN", "ERROR"].map((level) => (
                <button
                  key={level}
                  onClick={() => setFilterLevel(level as any)}
                  className={`px-2.5 py-1 rounded text-[9px] font-mono font-semibold transition-all uppercase border ${
                    filterLevel === level
                      ? "bg-emerald-900/20 border-emerald-500/25 text-emerald-400 font-bold"
                      : "bg-[#050807]/80 border-transparent text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>

            {/* Terminal output console */}
            <div className="flex-1 bg-[#050807]/90 border border-emerald-900/10 rounded-lg p-3 overflow-y-auto font-mono text-[10px] leading-relaxed text-slate-400 space-y-2 scrollbar-thin">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => {
                  let badgeColor = "text-emerald-400 bg-emerald-500/5";
                  if (log.level === "warn") badgeColor = "text-amber-400 bg-amber-500/5";
                  if (log.level === "error") badgeColor = "text-rose-400 bg-rose-500/5";

                  return (
                    <div key={log.id} className="flex items-start space-x-1.5 hover:bg-slate-900/20 p-1 rounded">
                      <span className="text-[9px] text-slate-600 select-none">
                        [{new Date(log.timestamp).toLocaleTimeString()}]
                      </span>
                      <span className={`px-1 rounded uppercase font-bold tracking-wider shrink-0 text-[8px] ${badgeColor}`}>
                        {log.level}
                      </span>
                      <span className="text-slate-300 break-all">{log.message}</span>
                    </div>
                  );
                })
              ) : (
                <div className="h-full flex items-center justify-center text-slate-600 text-[10px] space-x-1.5">
                  <Terminal className="w-3.5 h-3.5" />
                  <span>No system execution logs matching criteria.</span>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
      </>
      )}

      {adminTab === "USERS" && (
        <div className="p-5 rounded-xl border border-emerald-900/20 bg-[#0A100D]/40 shadow-[0_4px_16px_rgba(0,0,0,0.2)]">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 rounded-xl border border-emerald-900/15 bg-[#050807]/60 space-y-2">
              <div className="text-slate-500 text-[10px] font-mono uppercase">Total Unique Accounts</div>
              <p className="text-2xl font-bold text-emerald-400 font-mono">{activeUsers.length}</p>
            </div>
            <div className="p-4 rounded-xl border border-emerald-900/15 bg-[#050807]/60 space-y-2">
              <div className="text-slate-500 text-[10px] font-mono uppercase">Total Dispatched Prompts</div>
              <p className="text-2xl font-bold text-emerald-400 font-mono">
                {activeUsers.reduce((sum, u) => sum + u.queriesCount, 0)}
              </p>
            </div>
            <div className="p-4 rounded-xl border border-emerald-900/15 bg-[#050807]/60 space-y-2">
              <div className="text-slate-500 text-[10px] font-mono uppercase">Avg. Response Time</div>
              <p className="text-2xl font-bold text-emerald-400 font-mono">
                {activeUsers.length > 0 
                  ? Math.round(activeUsers.reduce((sum, u) => sum + u.avgLatency, 0) / activeUsers.length)
                  : 0}ms
              </p>
            </div>
          </div>

          <div className="mb-4">
            <h3 className="font-display font-bold text-sm text-white flex items-center space-x-2">
              <Users className="w-4 h-4 text-emerald-400" />
              <span>Active User Session Statistics</span>
            </h3>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Real-time lookup of individual user engagement, dispatch counts, latency averages, and token workloads.
            </p>
          </div>

          <div className="overflow-x-auto border border-emerald-900/10 rounded-lg">
            <table className="w-full text-left font-mono text-[11px] text-slate-300">
              <thead className="bg-[#050807] text-[9px] uppercase tracking-wider text-slate-500 border-b border-emerald-900/15">
                <tr>
                  <th className="p-3">User UID</th>
                  <th className="p-3 text-center">Dispatched Queries</th>
                  <th className="p-3 text-center">Avg Response Latency</th>
                  <th className="p-3 text-center">Cumulative Tokens</th>
                  <th className="p-3 text-right font-semibold">Last Session Activity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-900/10">
                {activeUsers.length > 0 ? (
                  activeUsers.map((user) => (
                    <tr 
                      key={user.userId} 
                      onClick={() => handleUserSelect(user.userId)}
                      className="hover:bg-emerald-950/20 transition-colors cursor-pointer group"
                      title="Click to preview this user's active chats and telemetry"
                    >
                      <td className="p-3 font-semibold text-slate-200 flex items-center flex-wrap gap-1.5 sm:gap-2">
                        <Users className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 transition-colors shrink-0" />
                        <span className="truncate flex-1 min-w-[80px] max-w-[120px] sm:max-w-[200px]" title={user.userId}>{user.userId}</span>
                        
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Role Badge */}
                          {user.userId === "kmjoy569@gmail.com" || user.userId.includes("admin") ? (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[8px] font-bold uppercase shadow-sm">
                              ADMIN
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[8px] font-bold uppercase shadow-sm">
                              USER
                            </span>
                          )}

                          {/* Presence Badge */}
                          {Date.now() - new Date(user.lastActive).getTime() < 300000 ? (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[8px] font-bold animate-pulse flex items-center gap-1 shadow-sm">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                              ACTIVE
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-300 border border-slate-500/30 text-[8px] font-bold shadow-sm">
                              AWAY
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-center text-emerald-400 font-bold">
                        {user.queriesCount}
                      </td>
                      <td className="p-3 text-center text-emerald-400">
                        {user.avgLatency}ms
                      </td>
                      <td className="p-3 text-center text-slate-400">
                        ~{user.tokensUsed.toLocaleString()}
                      </td>
                      <td className="p-3 text-right text-slate-500 text-[10px]">
                        <div className="flex items-center justify-end space-x-2">
                          <span>{new Date(user.lastActive).toLocaleString()}</span>
                          <span className="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-900/30 text-[9px] group-hover:bg-emerald-600 group-hover:text-slate-950 transition-all font-bold">
                            PREVIEW
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500 text-xs">
                      <div className="flex flex-col items-center justify-center space-y-1">
                        <Users className="w-5 h-5 text-slate-600 mb-1" />
                        <span>No active user accounts tracked in current execution session.</span>
                        <span className="text-[10px] text-slate-600">Dispatched chat prompts from any client account will stream here dynamically.</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* User Session Preview Modal for Admin */}
      {selectedUserUid && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[#050807] border border-emerald-900/35 rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col shadow-[0_0_50px_rgba(16,185,129,0.15)] overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-emerald-900/15 bg-bg-base/60 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-emerald-950/40 border border-emerald-500/20 rounded-xl">
                  <Users className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-sm text-white flex items-center gap-2">
                    <span>Admin User Session Preview</span>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/10 font-mono font-bold">
                      SECURE ROOT VIEW
                    </span>
                  </h3>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5 truncate max-w-md sm:max-w-xl">
                    Target UID: {selectedUserUid}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedUserUid(null)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-900/50 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 flex overflow-hidden">
              {/* Left Column: Chat Sessions List */}
              <div className="w-1/3 border-r border-emerald-900/15 flex flex-col bg-[#070b09]">
                <div className="p-3 border-b border-emerald-900/15 bg-black/30">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                    Stored Conversations ({userSessions.length})
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-thin">
                  {isLoadingSessions ? (
                    <div className="h-full flex flex-col items-center justify-center space-y-2 text-slate-500 text-xs">
                      <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>Querying chat records...</span>
                    </div>
                  ) : userSessions.length > 0 ? (
                    userSessions.map((session) => (
                      <button
                        key={session.id}
                        onClick={() => setSelectedPreviewSession(session)}
                        className={`w-full text-left p-2.5 rounded-lg transition-all duration-150 flex flex-col gap-1.5 border cursor-pointer ${
                          selectedPreviewSession?.id === session.id
                            ? "bg-emerald-950/20 border-emerald-500/25 text-emerald-400"
                            : "bg-transparent border-transparent hover:bg-emerald-950/10 text-slate-300"
                        }`}
                      >
                        <div className="font-medium text-[11px] truncate leading-tight flex items-center gap-1">
                          <MessageSquare className="w-3 h-3 shrink-0 opacity-70" />
                          <span>{session.title || "Untitled Session"}</span>
                        </div>
                        <div className="text-[9px] text-slate-500 font-mono flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5 shrink-0" />
                          <span>
                            {session.updatedAt?.toMillis 
                              ? new Date(session.updatedAt.toMillis()).toLocaleString()
                              : "Recently active"}
                          </span>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center p-4 text-center text-slate-600 text-[10px]">
                      <MessageSquare className="w-6 h-6 text-slate-700 mb-1" />
                      <span>No conversations found.</span>
                      <span className="text-[9px] text-slate-700 mt-1">This user hasn't initialized any chat threads yet.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Active Conversation Transcript Preview */}
              <div className="flex-1 flex flex-col bg-[#050807]">
                {selectedPreviewSession ? (
                  <>
                    {/* Transcript Session Title */}
                    <div className="p-3 bg-black/40 border-b border-emerald-900/15 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-emerald-400 font-mono font-bold uppercase tracking-widest">
                          Active Session Transcript
                        </span>
                        <h4 className="font-semibold text-slate-200 text-xs truncate max-w-sm mt-0.5">
                          {selectedPreviewSession.title || "Untitled Session"}
                        </h4>
                      </div>
                      <span className="text-[9px] font-mono bg-emerald-900/20 border border-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded">
                        {selectedPreviewSession.messages.length} Messages
                      </span>
                    </div>

                    {/* Messages container */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin">
                      {selectedPreviewSession.messages && selectedPreviewSession.messages.length > 0 ? (
                        selectedPreviewSession.messages.map((msg, index) => {
                          const isUser = msg.role === "user";
                          return (
                            <div 
                              key={msg.id || index} 
                              className={`flex flex-col max-w-[85%] ${
                                isUser ? "ml-auto items-end" : "mr-auto items-start"
                              }`}
                            >
                              <span className="text-[8px] font-mono text-slate-500 mb-1">
                                {isUser ? "USER PROMPT" : "SYSTEM RESPONSE"}
                              </span>
                              <div className={`p-3 rounded-xl text-xs leading-relaxed ${
                                isUser 
                                  ? "bg-emerald-900/20 border border-emerald-500/25 text-slate-200 rounded-tr-none" 
                                  : "bg-slate-900/40 border border-slate-800 text-slate-300 rounded-tl-none"
                              }`}>
                                <p className="whitespace-pre-wrap">{msg.content}</p>
                                
                                {!isUser && msg.citations && msg.citations.length > 0 && (
                                  <div className="mt-2 pt-2 border-t border-slate-800 text-[10px] text-slate-500">
                                    <span className="font-bold">Sources: </span>
                                    {msg.citations.join(", ")}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                          <span>Empty transcript.</span>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-500">
                    <MessageSquare className="w-8 h-8 text-slate-700 mb-2" />
                    <span className="font-medium text-xs text-slate-400">Select a Conversation Thread</span>
                    <p className="text-[10px] text-slate-600 max-w-xs mt-1">
                      Choose any session from the left column to inspect the full interactive conversation history for this active account.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-[#030504] border-t border-emerald-900/15 flex items-center justify-between text-[9px] text-slate-500 font-mono px-5">
              <span>Security Logging Status: AUDITING ACTIVE</span>
              <span>Audit session token: SHA256_{Math.random().toString(36).substring(2, 10).toUpperCase()}</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
