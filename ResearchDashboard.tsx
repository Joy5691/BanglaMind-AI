import React, { useState, useRef, useEffect } from "react";
import Prism from "prismjs";
import "prismjs/themes/prism-tomorrow.css";
// Import common programming languages to enable syntax highlighting
import "prismjs/components/prism-python";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-json";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-markdown";
import "prismjs/components/prism-css";

import { 
  Message, 
  AssistantMode, 
  RAGChunk 
} from "../types";
import { motion } from "motion/react";
import TransparentMapLogo from "./TransparentMapLogo";
import { 
  Send, 
  Mic, 
  MicOff, 
  Volume2, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  ShieldAlert, 
  Activity, 
  FileCheck, 
  Languages, 
  Copy, 
  Check, 
  Sparkles,
  Info,
  ExternalLink,
  Globe,
  Share2,
  ThumbsUp,
  ThumbsDown
} from "lucide-react";

interface ChatAreaProps {
  mode: AssistantMode;
  messages: Message[];
  selectedDocIds: string[];
  onSendMessage: (text: string) => Promise<void>;
  onClearChat: () => void;
  isGenerating: boolean;
  addLogMessage: (type: "info" | "warn" | "error", msg: string) => void;
  currentSessionId?: string | null;
  onShareSession?: (sessionId: string) => void;
  isSharedView?: boolean;
  onBackToMySession?: () => void;
  onRateMessage?: (messageId: string, rating: "up" | "down" | null) => Promise<void>;
  isAdmin?: boolean;
}

export default function ChatArea({
  mode,
  messages,
  selectedDocIds,
  onSendMessage,
  onClearChat,
  isGenerating,
  addLogMessage,
  currentSessionId,
  onShareSession,
  isSharedView,
  onBackToMySession,
  onRateMessage,
  isAdmin = false
}: ChatAreaProps) {
  const [inputText, setInputText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [activeInspectorId, setActiveInspectorId] = useState<string | null>(null);
  const [expandedChunkId, setExpandedChunkId] = useState<string | null>(null);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [activeSpeechMsgId, setActiveSpeechMsgId] = useState<string | null>(null);
  
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating]);

  // Speech-to-Text Setup
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "bn-BD"; // Support Bangla natively! Fallback to English if they speak English.
      
      rec.onresult = (e: any) => {
        const transcript = e.results[0][0].transcript;
        setInputText((prev) => prev + (prev ? " " : "") + transcript);
        addLogMessage("info", `STT Captures Speech: "${transcript}"`);
        setIsListening(false);
      };

      rec.onerror = (e: any) => {
        addLogMessage("warn", `STT Microphone error: ${e.error}`);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      addLogMessage("error", "Web Speech API is not supported in this browser environment.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setIsListening(true);
      // Toggle language based on query context
      const textHasBangla = /[\u0980-\u09ff]/.test(inputText);
      recognitionRef.current.lang = textHasBangla ? "bn-BD" : "en-US";
      addLogMessage("info", `Starting Mic capture (Locale: ${recognitionRef.current.lang})...`);
      recognitionRef.current.start();
    }
  };

  // Text-to-Speech playback
  const speakText = (text: string, msgId: string) => {
    if (!window.speechSynthesis) {
      addLogMessage("error", "Speech Synthesis is not supported in this browser.");
      return;
    }

    if (activeSpeechMsgId === msgId) {
      window.speechSynthesis.cancel();
      setActiveSpeechMsgId(null);
      return;
    }

    window.speechSynthesis.cancel();
    
    // Clean text from markdown formatting before reading
    const cleanText = text
      .replace(/[#*`_\[\]]/g, "")
      .replace(/\[Source:.*?\]/g, "")
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Choose voice based on Bangla characters presence
    const hasBangla = /[\u0980-\u09ff]/.test(cleanText);
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => hasBangla ? v.lang.startsWith("bn") : v.lang.startsWith("en"));
    
    if (voice) utterance.voice = voice;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onend = () => {
      setActiveSpeechMsgId(null);
    };

    utterance.onerror = () => {
      setActiveSpeechMsgId(null);
    };

    setActiveSpeechMsgId(msgId);
    window.speechSynthesis.speak(utterance);
    addLogMessage("info", `Speaking response chunk: "${cleanText.substring(0, 40)}..."`);
  };

  // Handle send message
  const handleSend = async () => {
    if (!inputText.trim() || isGenerating) return;
    const textToSend = inputText;
    setInputText("");
    await onSendMessage(textToSend);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Suggestive starter queries based on assistant mode
  const getPromptStarters = () => {
    switch (mode) {
      case AssistantMode.STUDENT:
        return [
          { title: "CGPA formula", query: "SSC and HSC grading scale and GPA calculation formula of Bangladesh?" },
          { title: "Scholarship opportunities", query: "Tell me about Japanese MEXT scholarship guidelines for Bangladeshi students." }
        ];
      case AssistantMode.PROGRAMMING:
        return [
          { title: "Explain Binary Search", query: "Can you explain binary search algorithm and provide a python implementation?" },
          { title: "Vite HMR config", query: "Show me a clean vite.config.ts setup for React 19 fullstack application." }
        ];
      case AssistantMode.RESEARCH:
        return [
          { title: "RAG Evaluation Metrics", query: "How are BLEU, ROUGE, and BERTScore used to evaluate Retrieval-Augmented Generation?" },
          { title: "Bangla NLP benchmarks", query: "What are the common dataset benchmarks available for Bangla sentiment analysis?" }
        ];
      case AssistantMode.AGRICULTURE:
        return [
          { title: "Rice Blast prevent", query: "What is Rice Blast disease, and what are the fungicides and cures recommended in Bangladesh?" },
          { title: "Jute planting season", query: "When is the optimal planting time and soil requirements for Jute cultivation?" }
        ];
      case AssistantMode.GOVERNMENT:
        return [
          { title: "Correct NID errors", query: "How do I correct errors in my National ID (NID) card and what are the fees?" },
          { title: "e-Passport timelines", query: "What are the fees and delivery times (Super Express vs Regular) for Bangladeshi e-Passports?" }
        ];
      case AssistantMode.HEALTH:
        return [
          { title: "Dengue platelet danger", query: "Dengue prevention guidelines. At what platelet count should I go to the hospital?" },
          { title: "Blood report Terms", query: "Explain the standard components of a CBC blood report: Hemoglobin and Platelets." }
        ];
      case AssistantMode.BUSINESS:
        return [
          { title: "Get Trade License", query: "What is the procedure and required documents to obtain a Trade License in Dhaka City Corporation?" },
          { title: "Tax filing steps", query: "What are the basic steps for online TIN registration and tax filing for individuals?" }
        ];
      default:
        return [
          { title: "NID Spelling Correction", query: "How to correct spelling errors on a Bangladesh National ID online?" },
          { title: "Rice Disease Prevention", query: "What is Rice Blast disease, and how can Bangladeshi farmers prevent it?" },
          { title: "e-Passport Requirements", query: "What documents are required to apply for a Bangladeshi e-Passport?" }
        ];
    }
  };

  // Copy code to clipboard helper
  const copyCodeToClipboard = (code: string, blockId: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(blockId);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  // Simple Markdown-to-JSX Parser
  const renderFormattedContent = (content: string) => {
    const lines = content.split("\n");
    let isInsideCodeBlock = false;
    let codeContent = "";
    let codeLanguage = "";
    let codeBlockId = "";

    const renderedJSX: React.ReactNode[] = [];

    lines.forEach((line, idx) => {
      // Handle Code Block delimiters
      if (line.trim().startsWith("```")) {
        if (isInsideCodeBlock) {
          // Close Code Block
          const blockId = codeBlockId;
          const capturedCode = codeContent.trim();
          const lang = codeLanguage || "code";
          
          let highlightedHTML = "";
          let hasHighlighting = false;
          try {
            const normalizedLang = lang.toLowerCase().trim();
            let grammar = Prism.languages[normalizedLang];
            if (!grammar) {
              if (normalizedLang === "js" || normalizedLang === "jsx" || normalizedLang === "ts" || normalizedLang === "tsx") {
                grammar = Prism.languages.javascript;
              } else if (normalizedLang === "html" || normalizedLang === "xml" || normalizedLang === "svg") {
                grammar = Prism.languages.markup;
              } else if (normalizedLang === "sh" || normalizedLang === "shell") {
                grammar = Prism.languages.bash;
              } else if (normalizedLang === "py") {
                grammar = Prism.languages.python;
              }
            }
            if (grammar) {
              highlightedHTML = Prism.highlight(capturedCode, grammar, normalizedLang);
              hasHighlighting = true;
            }
          } catch (e) {
            console.warn("Prism highlight failed", e);
          }
          
          renderedJSX.push(
            <div key={`code-${idx}`} className="my-3 rounded-lg overflow-hidden border border-slate-800 bg-slate-950 font-mono text-xs">
              <div className="flex justify-between items-center bg-slate-900 px-4 py-2 border-b border-slate-800">
                <span className="text-[10px] text-slate-500 font-mono uppercase">{lang}</span>
                <button
                  onClick={() => copyCodeToClipboard(capturedCode, blockId)}
                  className="text-slate-400 hover:text-white flex items-center space-x-1 transition-colors text-[10px] cursor-pointer"
                >
                  {copiedCodeId === blockId ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-4 overflow-x-auto text-slate-300">
                {hasHighlighting ? (
                  <code 
                    className={`language-${lang}`} 
                    dangerouslySetInnerHTML={{ __html: highlightedHTML }} 
                  />
                ) : (
                  <code>{capturedCode}</code>
                )}
              </pre>
            </div>
          );
          
          isInsideCodeBlock = false;
          codeContent = "";
          codeLanguage = "";
          codeBlockId = "";
        } else {
          // Open Code Block
          isInsideCodeBlock = true;
          codeLanguage = line.trim().substring(3) || "javascript";
          codeBlockId = `block-${idx}-${Math.random().toString(36).substring(5)}`;
        }
        return;
      }

      if (isInsideCodeBlock) {
        codeContent += line + "\n";
        return;
      }

      // Headers
      if (line.trim().startsWith("### ")) {
        renderedJSX.push(<h3 key={idx} className="text-sm font-semibold font-display text-emerald-400 mt-4 mb-2">{line.substring(4)}</h3>);
        return;
      }
      if (line.trim().startsWith("## ")) {
        renderedJSX.push(<h2 key={idx} className="text-base font-bold font-display text-emerald-400 mt-4 mb-2">{line.substring(3)}</h2>);
        return;
      }
      if (line.trim().startsWith("# ")) {
        renderedJSX.push(<h1 key={idx} className="text-lg font-bold font-display text-emerald-300 mt-5 mb-2">{line.substring(2)}</h1>);
        return;
      }

      // Bullet lists
      if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
        renderedJSX.push(
          <div key={idx} className="flex items-start space-x-2 my-1 pl-2">
            <span className="text-emerald-500 mt-1 text-sm">•</span>
            <p className="text-slate-300 text-xs flex-1">{parseInlineStyles(line.trim().substring(2))}</p>
          </div>
        );
        return;
      }

      // Default paragraph line with inline parsing
      if (line.trim()) {
        renderedJSX.push(<p key={idx} className="text-slate-300 text-xs leading-relaxed my-2">{parseInlineStyles(line)}</p>);
      } else {
        renderedJSX.push(<div key={idx} className="h-2"></div>);
      }
    });

    return renderedJSX;
  };

  // Helper to parse bold, italic, inline code in markdown
  const parseInlineStyles = (text: string): React.ReactNode[] => {
    // Basic regex splitting for **bold**, `code`, [Source:], and HTTP links
    const parts: React.ReactNode[] = [];
    let currentIdx = 0;
    
    // Quick regex scanner
    const regex = /(\*\*.*?\*\*|`.*?`|\[(?:Verified )?Source:.*?\]|https?:\/\/[^\s]+)/g;
    let match;
    let keyIdx = 0;

    while ((match = regex.exec(text)) !== null) {
      const matchIndex = match.index;
      
      // Append preceding plain text
      if (matchIndex > currentIdx) {
        parts.push(<span key={`text-${keyIdx++}`}>{text.substring(currentIdx, matchIndex)}</span>);
      }

      const matchStr = match[0];
      if (matchStr.startsWith("**") && matchStr.endsWith("**")) {
        parts.push(<strong key={`bold-${keyIdx++}`} className="font-semibold text-emerald-300">{matchStr.slice(2, -2)}</strong>);
      } else if (matchStr.startsWith("`") && matchStr.endsWith("`")) {
        parts.push(<code key={`code-${keyIdx++}`} className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] text-emerald-400 font-mono">{matchStr.slice(1, -1)}</code>);
      } else if (matchStr.startsWith("[Source:") || matchStr.startsWith("[Verified Source:")) {
        const sourceText = matchStr.replace(/\[(?:Verified )?Source:/, "").slice(0, -1).trim();
        let displayTitle = sourceText;
        let domain = "";
        try {
          if (sourceText.startsWith("http")) {
            const url = new URL(sourceText);
            domain = url.hostname;
            displayTitle = domain; // Show domain on the badge itself if it's a URL
          }
        } catch(e) {}
        
        parts.push(
          <span 
            key={`cite-${keyIdx++}`} 
            className="inline-flex items-center space-x-0.5 bg-emerald-500/10 text-emerald-400 font-mono text-[9px] px-1.5 py-0.5 rounded mx-1 font-semibold select-none border border-emerald-500/20 relative group cursor-help transition-colors hover:bg-emerald-500/20"
          >
            <FileCheck className="w-2.5 h-2.5 shrink-0" />
            <span className="truncate max-w-[120px]">{displayTitle}</span>
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-50 w-max max-w-[250px]">
              <div className="bg-slate-900 border border-emerald-500/30 text-slate-200 text-xs p-2 rounded-lg shadow-xl font-sans font-normal text-left shadow-emerald-900/20">
                <div className="font-bold text-emerald-400 mb-1 text-[10px] uppercase tracking-wider">Source Citation</div>
                <div className="text-white font-medium line-clamp-3 leading-snug">{sourceText}</div>
                {domain && (
                  <div className="mt-1.5 pt-1.5 border-t border-slate-700/50 text-[10px] text-slate-400 flex items-center">
                    <span className="w-3 h-3 mr-1 inline-flex items-center justify-center rounded-full bg-slate-800">
                      <Globe className="w-2 h-2 text-slate-400" />
                    </span>
                    {domain}
                  </div>
                )}
              </div>
              <div className="w-2 h-2 bg-slate-900 border-r border-b border-emerald-500/30 transform rotate-45 -mt-1"></div>
            </div>
          </span>
        );
      } else if (matchStr.startsWith("http")) {
        parts.push(
          <a
            key={`link-${keyIdx++}`}
            href={matchStr}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 break-all"
          >
            {matchStr}
          </a>
        );
      }

      currentIdx = regex.lastIndex;
    }

    if (currentIdx < text.length) {
      parts.push(<span key={`text-${keyIdx++}`}>{text.substring(currentIdx)}</span>);
    }

    return parts.length > 0 ? parts : [<span key="0">{text}</span>];
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-bg-base" id="chat-panel">
      {/* Active Mode Banner */}
      <div className="px-6 py-4 border-b border-emerald-900/20 bg-bg-base/80 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white glow-emerald-glow">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-sm leading-none text-emerald-50">
              {mode === AssistantMode.GENERAL ? "BanglaMind AI" : mode.replace("_", " ")} Mode
            </h2>
            {isAdmin && (
              <p className="text-[10px] text-slate-500 mt-1 flex items-center space-x-1">
                <span>Retrieval Active:</span>
                <span className="text-emerald-500 font-semibold">{selectedDocIds.length > 0 ? `${selectedDocIds.length} sources` : "All Global Sources"}</span>
              </p>
            )}
          </div>
        </div>

        {/* Clear thread action */}
        {messages.length > 0 && (
          <div className="flex items-center space-x-2">
            {!isSharedView && currentSessionId && (
              <button
                onClick={() => onShareSession && onShareSession(currentSessionId)}
                className="text-slate-400 hover:text-emerald-400 px-3 py-1.5 rounded-lg border border-emerald-900/35 bg-[#0A100D]/40 hover:bg-[#0A100D]/80 transition-all flex items-center space-x-1.5 text-[10px] uppercase font-mono font-bold cursor-pointer"
                title="Share Conversation"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share</span>
              </button>
            )}
            {!isSharedView && (
              <button
                onClick={onClearChat}
                className="text-slate-400 hover:text-rose-400 px-3 py-1.5 rounded-lg border border-emerald-900/35 bg-[#0A100D]/40 hover:bg-[#0A100D]/80 transition-all flex items-center space-x-1.5 text-[10px] uppercase font-mono font-bold cursor-pointer"
                title="Reset thread"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Message History */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {messages.length === 0 ? (
          /* Empty State Welcome Portal */
          <div className="max-w-2xl mx-auto text-center mt-12 space-y-8">
            <div className="space-y-3">
              <motion.div 
                animate={{ scale: [1, 1.03, 1] }}
                transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
                className="w-16 h-16 rounded-2xl bg-[#0a110d] border border-emerald-900/30 flex items-center justify-center mx-auto glow-emerald-glow overflow-hidden cursor-pointer"
              >
                <TransparentMapLogo 
                  src="/2.png" 
                  removeColor="black" 
                  alt="BanglaMind AI Logo" 
                  className="w-12 h-12" 
                  glowColor="rgba(16, 185, 129, 0.8)" 
                  glowRadius="6px"
                />
              </motion.div>
              <h2 className="text-2xl font-display font-bold text-white tracking-tight">
                Shagotom to BanglaMind AI!
              </h2>
              <p className="text-slate-400 text-xs max-w-md mx-auto leading-relaxed">
                Bangladesh’s premier intelligent research assistant. Formulate queries in Bangla, English, or phonetic Banglish. Ask about public guidelines, education systems, agricultural diseases, healthcare terminologies, or local laws!
              </p>
            </div>

            {/* Prompt Starter Deck */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto">
              {getPromptStarters().map((starter, i) => (
                <button
                  key={i}
                  id={`starter-${i}`}
                  onClick={() => setInputText(starter.query)}
                  className="p-3.5 text-left rounded-xl border border-emerald-900/20 hover:border-emerald-500/40 bg-[#0A100D]/40 hover:bg-emerald-500/5 transition-all duration-300 group flex flex-col justify-between h-22"
                >
                  <span className="font-mono text-[10px] uppercase text-emerald-400 tracking-wider font-semibold">
                    {starter.title}
                  </span>
                  <p className="text-[11px] text-slate-400 group-hover:text-slate-300 truncate w-full mt-1.5">
                    {starter.query}
                  </p>
                </button>
              ))}
            </div>
            
            {isAdmin && (
              <div className="flex items-center justify-center space-x-2 text-[10px] text-slate-500 font-mono">
                <Info className="w-3.5 h-3.5 text-slate-600" />
                <span>Toggle active datasets in the left panel to constrain RAG index searches.</span>
              </div>
            )}
          </div>
        ) : (
          /* Conversation Thread */
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((msg) => {
              const isAI = msg.role === "model";
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className={`flex flex-col space-y-2 ${isAI ? "items-start" : "items-end"}`}
                >
                  
                  {/* Message Bubble Container */}
                  <div className={`max-w-[85%] rounded-2xl p-5 border transition-all ${
                    isAI 
                      ? "bg-[#0A100D]/80 backdrop-blur-sm border-emerald-900/20 text-slate-100 rounded-tl-none" 
                      : "bg-emerald-900/20 border-emerald-500/20 text-emerald-50 rounded-tr-none"
                  }`}>
                    
                    {/* Header bar within bubble (AI specific speech/copy actions) */}
                    {isAI && (
                      <div className="flex justify-between items-center mb-3 text-slate-500 border-b border-emerald-900/25 pb-2">
                        <div className="flex items-center space-x-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          <span className="font-display font-semibold text-[10px] uppercase text-emerald-400 tracking-wider">
                            BanglaMind AI
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          {/* Feedback Thumbs Up */}
                          {!isSharedView && onRateMessage && (
                            <button
                              onClick={() => onRateMessage(msg.id, msg.rating === "up" ? null : "up")}
                              className={`p-1 rounded transition-colors cursor-pointer ${
                                msg.rating === "up" 
                                  ? "text-emerald-400 bg-emerald-500/10" 
                                  : "hover:bg-[#050807]/60 hover:text-slate-200"
                              }`}
                              title="Helpful (Thumbs Up)"
                            >
                              <ThumbsUp className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {/* Feedback Thumbs Down */}
                          {!isSharedView && onRateMessage && (
                            <button
                              onClick={() => onRateMessage(msg.id, msg.rating === "down" ? null : "down")}
                              className={`p-1 rounded transition-colors cursor-pointer ${
                                msg.rating === "down" 
                                  ? "text-rose-400 bg-rose-500/10" 
                                  : "hover:bg-[#050807]/60 hover:text-slate-200"
                              }`}
                              title="Not helpful (Thumbs Down)"
                            >
                              <ThumbsDown className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {/* TTS Audio */}
                          <button
                            onClick={() => speakText(msg.content, msg.id)}
                            className={`p-1 rounded hover:bg-[#050807]/60 hover:text-slate-200 transition-colors cursor-pointer ${activeSpeechMsgId === msg.id ? "text-emerald-400 animate-pulse bg-emerald-500/10" : ""}`}
                            title="Read response aloud"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Formatted body */}
                    <div className="space-y-1">
                      {isAI ? renderFormattedContent(msg.content) : <p className="text-xs leading-relaxed text-slate-100">{msg.content}</p>}
                    </div>

                    {/* Metadata tags (Bottom edge of user message) */}
                    {!isAI && (
                      <div className="text-[9px] text-emerald-400/60 font-mono text-right mt-1">
                        Sent via web secure container
                      </div>
                    )}
                  </div>

                  {/* RAG VECTOR EXPLAINER DECK (Attached to bottom of AI message) */}
                  {isAdmin && isAI && msg.retrievedChunks && msg.retrievedChunks.length > 0 && (
                    <div className="w-full max-w-[85%] rounded-xl border border-emerald-900/20 bg-[#0A100D]/40 overflow-hidden text-xs">
                      <button
                        onClick={() => setActiveInspectorId(activeInspectorId === msg.id ? null : msg.id)}
                        className="w-full flex items-center justify-between p-3 text-slate-400 hover:text-slate-200 hover:bg-[#0A100D]/60 transition-colors"
                      >
                        <div className="flex items-center space-x-2">
                          <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
                          <span className="font-mono text-[10px] uppercase tracking-wider font-semibold">
                            RAG Semantic Inspector ({msg.retrievedChunks.length} contexts)
                          </span>
                        </div>
                        <div className="flex items-center space-x-3 text-[10px] font-mono text-slate-500">
                          <span>{msg.latencyMs}ms latency</span>
                          {activeInspectorId === msg.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </div>
                      </button>

                      {/* Expanded insights panel */}
                      {activeInspectorId === msg.id && (
                        <div className="border-t border-emerald-900/20 p-4 space-y-4 bg-bg-base/80">
                          {/* Metric Indicators */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="p-2.5 rounded-lg bg-[#0A100D] border border-emerald-900/15 text-center">
                              <div className="text-slate-500 font-mono text-[9px] uppercase">Confidence</div>
                              <div className="text-xs font-semibold text-emerald-400 mt-1 font-mono">
                                {msg.confidence}% Correct
                              </div>
                            </div>
                            <div className="p-2.5 rounded-lg bg-[#0A100D] border border-emerald-900/15 text-center">
                              <div className="text-slate-500 font-mono text-[9px] uppercase">NLP Language</div>
                              <div className="text-xs font-semibold text-emerald-400 mt-1 font-mono flex items-center justify-center space-x-1">
                                <Languages className="w-3 h-3" />
                                <span>{msg.detectedLang}</span>
                              </div>
                            </div>
                            <div className="p-2.5 rounded-lg bg-[#0A100D] border border-emerald-900/15 text-center">
                              <div className="text-slate-500 font-mono text-[9px] uppercase">Tokens Used</div>
                              <div className="text-xs font-semibold text-emerald-400 mt-1 font-mono">
                                ~{msg.tokensUsed} tokens
                              </div>
                            </div>
                            <div className="p-2.5 rounded-lg bg-[#0A100D] border border-emerald-900/15 text-center">
                              <div className="text-slate-500 font-mono text-[9px] uppercase">RAG Engine</div>
                              <div className="text-xs font-semibold text-emerald-400 mt-1 font-mono">
                                Dense Hybrid
                              </div>
                            </div>
                          </div>

                          {/* Dynamic retrieval list */}
                          <div className="space-y-2">
                            <h4 className="text-[10px] font-mono uppercase tracking-wider text-emerald-500/80 px-1 font-semibold">
                              Semantic Vector Match Results:
                            </h4>
                            {msg.retrievedChunks.map((chunk) => {
                              const isChunkExpanded = expandedChunkId === chunk.id;
                              return (
                                <div key={chunk.id} className="rounded-lg border border-emerald-900/15 bg-bg-base/30 overflow-hidden">
                                  <button
                                    onClick={() => setExpandedChunkId(isChunkExpanded ? null : chunk.id)}
                                    className="w-full text-left p-2.5 flex items-center justify-between text-slate-400 hover:text-slate-200 hover:bg-[#0A100D]/40 transition-colors"
                                  >
                                    <div className="flex items-center space-x-2">
                                      <FileCheck className="w-3.5 h-3.5 text-emerald-500" />
                                      <span className="font-semibold text-[11px] truncate max-w-xs sm:max-w-md text-slate-200">
                                        {chunk.documentTitle}
                                      </span>
                                    </div>
                                    <div className="flex items-center space-x-2 text-[10px] font-mono text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                                      <span>Sim: {chunk.similarity}%</span>
                                    </div>
                                  </button>
                                  {isChunkExpanded && (
                                    <div className="p-3 border-t border-emerald-900/15 bg-[#050807]/60 text-[11px] text-slate-400 leading-relaxed font-mono">
                                      {chunk.content}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Grounding Base alert tag */}
                  {isAdmin && isAI && (!msg.retrievedChunks || msg.retrievedChunks.length === 0) && (
                    <div className="flex items-center space-x-1.5 text-[10px] text-amber-500/80 bg-amber-500/5 border border-amber-500/10 px-2.5 py-1 rounded-lg ml-2 font-mono">
                      <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                      <span>Retrieved from pre-trained memory. Facts are unverified in loaded workspace.</span>
                    </div>
                  )}

                </motion.div>
              );
            })}
            
            {/* Thinking / Streaming loader bubble */}
            {isGenerating && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-start space-y-1"
              >
                <div className="bg-[#0A100D]/80 border border-emerald-900/25 max-w-[85%] rounded-2xl p-4 text-slate-300">
                  <div className="flex items-center space-x-2 text-xs text-slate-400 font-mono">
                    <div className="w-2.5 h-2.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="animate-pulse">Consulting knowledge base & synthesizing answer...</span>
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={chatBottomRef} />
          </div>
        )}
      </div>

      {/* Input Tray */}
      <div className="px-6 py-4 border-t border-emerald-900/15 bg-gradient-to-t from-[#050807] to-transparent">
        {isSharedView ? (
          <div className="max-w-3xl mx-auto p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
            <div>
              <div className="text-xs font-semibold text-emerald-400 mb-0.5">Read-Only Shared Conversation</div>
              <div className="text-[11px] text-slate-400">You are viewing a shared chat thread. Sign in or return to your application to start a new chat!</div>
            </div>
            {onBackToMySession && (
              <button
                onClick={onBackToMySession}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium cursor-pointer shrink-0 transition-all hover:scale-102 font-mono uppercase"
              >
                Go to App
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="max-w-3xl mx-auto flex items-end space-x-3 bg-[#0A100D]/90 border border-emerald-900/30 rounded-2xl p-2.5 relative shadow-2xl backdrop-blur-md focus-within:border-emerald-500/40 transition-colors">
              
              {/* Audio voice input microphone toggles */}
              <button
                onClick={toggleListening}
                className={`p-3 rounded-lg transition-colors shrink-0 ${
                  isListening 
                    ? "bg-rose-500 text-white animate-pulse" 
                    : "text-slate-400 hover:text-emerald-400 hover:bg-emerald-900/20"
                }`}
                title={isListening ? "Listening... click to stop" : "Speak to input"}
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              {/* Prompt input field */}
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={isListening ? "Microphone active: Speak in Bangla or English..." : "Ask BanglaMind AI anything about Bangladesh..."}
                rows={1}
                disabled={isGenerating}
                className="flex-1 bg-transparent border-0 ring-0 focus:ring-0 focus:outline-none text-slate-200 text-xs py-2 px-1 resize-none h-10 max-h-32 min-h-10 align-middle leading-relaxed placeholder-slate-500"
              />

              {/* Submission Trigger */}
              <button
                onClick={handleSend}
                disabled={!inputText.trim() || isGenerating}
                className={`p-3 rounded-lg transition-all shrink-0 ${
                  inputText.trim() && !isGenerating
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/20"
                    : "bg-emerald-950/20 text-emerald-800 cursor-not-allowed border border-emerald-950/30"
                }`}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            
            {/* Under-bar hint log */}
            <div className="max-w-3xl mx-auto mt-2 flex justify-between items-center text-[10px] text-slate-500 px-1 font-mono">
              <span>Press Enter to send, Shift+Enter for new line</span>
              {isListening && <span className="text-rose-400 animate-pulse font-semibold">● VOICE RECOGNITION ONLINE (SPEAK NOW)</span>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
