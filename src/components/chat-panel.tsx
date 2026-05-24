"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { useRates } from "@/hooks/use-rates";
import { useAuth } from "@/hooks/use-auth";
import {
  MessageSquare,
  Send,
  Bot,
  User,
  Sparkles,
  Menu,
  X,
  Plus,
  Trash2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Message {
  id: string;
  role: "assistant" | "user";
  content: string;
  timestamp: string;
}

interface Session {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
}

const QUICK_ACTIONS = [
  { label: "Latest USD/CNY rate", icon: "💰" },
  { label: "Best way to exchange $1000", icon: "🔄" },
  { label: "Recent rate trend analysis", icon: "📈" },
  { label: "Lowest fee banks comparison", icon: "🏦" },
];

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "Hello! I'm your smart exchange advisor. I can help you analyze real-time rates, compare exchange costs across channels, and recommend the best timing for conversions. How can I help you?",
  timestamp: "",
};

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

function getStorageKey(username: string): string {
  return `crosspay-chat-sessions-${username}`;
}

function loadSessions(username: string): Session[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(getStorageKey(username));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSessions(username: string, sessions: Session[]) {
  try {
    localStorage.setItem(getStorageKey(username), JSON.stringify(sessions));
  } catch {
    // Storage full or unavailable
  }
}

function getTitle(firstMsg: string): string {
  const max = 30;
  return firstMsg.length > max ? firstMsg.slice(0, max) + "..." : firstMsg;
}

export function ChatPanel() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { rates } = useRates();
  const { user } = useAuth();

  const fiatRates = rates.filter((r) => r.type === "fiat").slice(0, 6);

  useEffect(() => {
    if (!user?.username) return;
    const saved = loadSessions(user.username);
    if (saved.length > 0) {
      setSessions(saved);
      setActiveSessionId(saved[0].id);
    } else {
      const newSession: Session = {
        id: generateId(),
        title: "New Chat",
        messages: [
          {
            ...WELCOME_MESSAGE,
            timestamp: new Date().toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            }),
          },
        ],
        createdAt: Date.now(),
      };
      setSessions([newSession]);
      setActiveSessionId(newSession.id);
      saveSessions(user.username, [newSession]);
    }
  }, [user?.username]);

  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const messages = activeSession?.messages || [];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const updateSessions = useCallback(
    (newSessions: Session[]) => {
      setSessions(newSessions);
      if (user?.username) saveSessions(user.username, newSessions);
    },
    [user?.username]
  );

  const createNewSession = useCallback(() => {
    const newSession: Session = {
      id: generateId(),
      title: "New Chat",
      messages: [
        {
          ...WELCOME_MESSAGE,
          timestamp: new Date().toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ],
      createdAt: Date.now(),
    };
    const newSessions = [newSession, ...sessions];
    updateSessions(newSessions);
    setActiveSessionId(newSession.id);
    setSidebarOpen(false);
  }, [sessions, updateSessions]);

  const deleteSession = useCallback(
    (sessionId: string) => {
      const newSessions = sessions.filter((s) => s.id !== sessionId);
      if (newSessions.length === 0) {
        const newSession: Session = {
          id: generateId(),
          title: "New Chat",
          messages: [
            {
              ...WELCOME_MESSAGE,
              timestamp: new Date().toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              }),
            },
          ],
          createdAt: Date.now(),
        };
        updateSessions([newSession]);
        setActiveSessionId(newSession.id);
      } else {
        updateSessions(newSessions);
        if (activeSessionId === sessionId) {
          setActiveSessionId(newSessions[0].id);
        }
      }
    },
    [sessions, activeSessionId, updateSessions]
  );

  const updateSessionMessages = useCallback(
    (sessionId: string, msgs: Message[], title?: string) => {
      const newSessions = sessions.map((s) => {
        if (s.id !== sessionId) return s;
        return {
          ...s,
          messages: msgs,
          ...(title ? { title } : {}),
        };
      });
      updateSessions(newSessions);
    },
    [sessions, updateSessions]
  );

  const handleSend = async (text?: string) => {
    const content = (text ?? inputValue).trim();
    if (!content || isTyping || !activeSession) return;

    const now = new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const userMessage: Message = {
      id: generateId(),
      role: "user",
      content,
      timestamp: now,
    };

    const aiMessageId = generateId();
    const aiMessage: Message = {
      id: aiMessageId,
      role: "assistant",
      content: "",
      timestamp: now,
    };

    const newMessages = [...activeSession.messages, userMessage, aiMessage];

    const isFirstUserMsg =
      activeSession.messages.filter((m) => m.role === "user").length === 0;
    const title = isFirstUserMsg ? getTitle(content) : undefined;

    updateSessionMessages(activeSession.id, newMessages, title);
    setInputValue("");
    setIsTyping(true);

    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          sessionId: activeSession.id,
          username: user?.username,
        }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        updateSessionMessages(
          activeSession.id,
          newMessages.map((m) =>
            m.id === aiMessageId
              ? {
                  ...m,
                  content:
                    "Sorry, the service is temporarily unavailable. Please try again later.",
                }
              : m
          )
        );
        setIsTyping(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        updateSessionMessages(
          activeSession.id,
          newMessages.map((m) =>
            m.id === aiMessageId
              ? {
                  ...m,
                  content:
                    "Sorry, failed to read the response. Please try again later.",
                }
              : m
          )
        );
        setIsTyping(false);
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";
      const sessionId = activeSession.id;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          if (trimmed.startsWith("data:")) {
            const raw = trimmed.slice(5).trim();
            if (raw === "[DONE]") continue;

            try {
              const data = JSON.parse(raw);

              if (data.type === "answer" && data.content?.answer) {
                accumulated += data.content.answer;
                const currentAcc = accumulated;
                const currentAiId = aiMessageId;
                setSessions((prev) => {
                  const updated = prev.map((s) => {
                    if (s.id !== sessionId) return s;
                    return {
                      ...s,
                      messages: s.messages.map((m) =>
                        m.id === currentAiId
                          ? { ...m, content: currentAcc }
                          : m
                      ),
                    };
                  });
                  if (user?.username) saveSessions(user.username, updated);
                  return updated;
                });
              }
            } catch {
              // Skip non-parseable lines
            }
          }
        }
      }

      if (!accumulated) {
        updateSessionMessages(
          sessionId,
          newMessages.map((m) =>
            m.id === aiMessageId
              ? {
                  ...m,
                  content:
                    "Sorry, no valid response was received. Please try again later.",
                }
              : m
          )
        );
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      console.error("[ChatPanel] Stream error:", err);
      updateSessionMessages(
        activeSession.id,
        [...activeSession.messages, userMessage, aiMessage].map((m) =>
          m.id === aiMessageId
            ? {
                ...m,
                content:
                  "Sorry, a network error occurred. Please try again later.",
              }
            : m
        )
      );
    } finally {
      setIsTyping(false);
      abortRef.current = null;
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleSend();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-full min-h-0 bg-[#020202]">
      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - session list */}
      <div
        className={`fixed lg:relative inset-y-0 left-0 z-40 w-72 bg-zinc-950/95 border-r border-zinc-800/80 flex flex-col transition-transform duration-200 ease-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-900">
          <span className="font-mono text-xs text-emerald-400 font-semibold tracking-wider uppercase flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Advisor
          </span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 text-zinc-500 hover:text-white rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3">
          <button
            onClick={createNewSession}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-800 px-3 py-2 text-xs text-zinc-400 transition-colors hover:border-emerald-500/50 hover:text-emerald-400 font-sans"
          >
            <Plus className="w-3.5 h-3.5" />
            New Consultation
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-3">
          <h4 className="text-[10px] font-mono tracking-widest text-zinc-600 uppercase font-bold mb-2 px-2">
            Consultation Logs
          </h4>
          {sessions.map((session) => (
            <div
              key={session.id}
              onClick={() => {
                setActiveSessionId(session.id);
                setSidebarOpen(false);
              }}
              className={`group mb-1 flex cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 text-xs transition-colors ${
                session.id === activeSessionId
                  ? "bg-zinc-900 border border-zinc-800"
                  : "border border-transparent hover:bg-zinc-950/60"
              }`}
            >
              <div className="min-w-0 flex-1">
                <div
                  className={`truncate font-sans ${
                    session.id === activeSessionId
                      ? "text-white font-medium"
                      : "text-zinc-400"
                  }`}
                >
                  {session.title}
                </div>
                <div className="mt-0.5 text-[10px] text-zinc-600">
                  {session.messages.filter((m) => m.role === "user").length}{" "}
                  messages
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteSession(session.id);
                }}
                className="ml-2 shrink-0 rounded p-1 opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100 text-zinc-500"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-zinc-900">
          <div className="p-2 bg-zinc-900/20 border border-zinc-900 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-mono text-zinc-400">
                Node Secure Endpoint
              </span>
            </div>
            <p className="text-[9px] text-zinc-600 mt-1 font-sans">
              Full client-side transaction proxy. Your privacy is shielded.
            </p>
          </div>
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex h-full min-h-0 flex-1 flex-col">
        {/* Quick rate ticker */}
        <div className="flex items-center gap-4 border-b border-zinc-900 bg-[#030303] px-5 py-2.5 overflow-x-auto">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex lg:hidden shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs text-zinc-400 transition-colors hover:text-white"
          >
            <Menu className="w-3.5 h-3.5" />
            History
          </button>
          <div className="hidden lg:block h-4 w-px bg-zinc-800" />
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-emerald-400 font-mono">Online</span>
          </div>
          <div className="h-4 w-px bg-zinc-800" />
          {fiatRates.length > 0 ? (
            fiatRates.map((item) => {
              const isUp = item.change >= 0;
              const fmt =
                item.rate >= 1 ? item.rate.toFixed(4) : item.rate.toFixed(5);
              return (
                <div
                  key={item.pair}
                  className="flex items-center gap-2 whitespace-nowrap text-xs"
                >
                  <span className="text-zinc-500 font-mono">{item.pair}</span>
                  <span className="font-mono font-medium text-zinc-200">
                    {fmt}
                  </span>
                  <span
                    className={`font-mono text-[11px] ${
                      isUp ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {isUp ? "+" : ""}
                    {item.change.toFixed(2)}%
                  </span>
                </div>
              );
            })
          ) : (
            <span className="text-xs text-zinc-500">Loading rates...</span>
          )}
        </div>

        {/* Chat messages */}
        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-y-auto px-5 py-4 space-y-5 chat-scroll"
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`slide-up flex gap-3 ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-emerald-950 border border-emerald-800/40 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4 text-emerald-400" />
                </div>
              )}

              <div className="max-w-[80%] space-y-1">
                <div
                  className={`px-4 py-3 rounded-2xl text-sm leading-relaxed border ${
                    msg.role === "user"
                      ? "bg-zinc-100 text-zinc-950 border-white font-medium rounded-tr-none"
                      : "bg-zinc-900/60 text-zinc-200 border-zinc-800/40 rounded-tl-none font-light"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div className="prose prose-invert prose-sm max-w-none [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-zinc-800 [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_th]:text-xs [&_th]:font-semibold [&_th]:text-zinc-400 [&_td]:border [&_td]:border-zinc-800 [&_td]:px-2 [&_td]:py-1 [&_td]:text-xs [&_tr]:border-b [&_tr]:border-zinc-800 [&_thead]:bg-zinc-900/50 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_h1]:text-base [&_h1]:font-bold [&_h2]:text-sm [&_h2]:font-bold [&_h3]:text-sm [&_h3]:font-semibold [&_code]:rounded [&_code]:bg-zinc-800 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs [&_pre]:rounded-lg [&_pre]:bg-zinc-900 [&_pre]:p-3 [&_blockquote]:border-l-2 [&_blockquote]:border-emerald-500 [&_blockquote]:pl-3 [&_blockquote]:text-zinc-400 [&_strong]:text-zinc-100">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    msg.content
                  )}
                  {msg.role === "assistant" &&
                    !msg.content &&
                    isTyping && (
                      <div className="flex items-center gap-1">
                        <span
                          className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-400"
                          style={{ animationDelay: "0ms" }}
                        />
                        <span
                          className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-400"
                          style={{ animationDelay: "150ms" }}
                        />
                        <span
                          className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-400"
                          style={{ animationDelay: "300ms" }}
                        />
                      </div>
                    )}
                  {msg.timestamp && (
                    <div className="mt-1.5 text-[10px] text-zinc-600 font-mono uppercase tracking-widest">
                      {msg.timestamp}
                    </div>
                  )}
                </div>
              </div>

              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4 text-zinc-400" />
                </div>
              )}
            </div>
          ))}

          {/* Typing indicator for new messages */}
          {isTyping &&
            messages.length > 0 &&
            messages[messages.length - 1]?.role === "user" && (
              <div className="slide-up flex gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-950 border border-emerald-800/40 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-emerald-400 animate-pulse" />
                </div>
                <div className="bg-zinc-900/40 border border-zinc-800/20 px-4 py-3 rounded-2xl rounded-tl-none">
                  <div className="flex items-center gap-1">
                    <span
                      className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <span
                      className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <span
                      className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                </div>
              </div>
            )}

          <div ref={() => {}} />
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-2 overflow-x-auto border-t border-zinc-900 px-5 py-2.5 bg-[#030303]">
          <span className="shrink-0 text-[10px] text-zinc-500 font-mono uppercase tracking-wider">
            Quick:
          </span>
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => handleSend(action.label)}
              disabled={isTyping}
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900/40 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-white disabled:opacity-50 font-sans"
            >
              <span>{action.icon}</span>
              <span>{action.label}</span>
            </button>
          ))}
        </div>

        {/* Input area */}
        <form
          onSubmit={handleSubmit}
          className="border-t border-zinc-900 px-5 py-3 bg-[#030303]"
        >
          <div className="flex items-end gap-3">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about exchange rates..."
              className="min-h-[44px] max-h-[120px] resize-none rounded-xl border border-zinc-800 bg-zinc-900/40 text-sm py-3 px-4 text-zinc-100 placeholder:text-zinc-600 hover:border-zinc-700 focus:border-zinc-600 focus:outline-none transition-colors flex-1 font-sans"
              rows={1}
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isTyping}
              className="h-[44px] shrink-0 rounded-xl bg-emerald-500 hover:bg-emerald-400 px-5 text-sm font-semibold text-black transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.15)]"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <div className="flex justify-between items-center mt-2 text-[10px] text-zinc-600 font-mono">
            <span>Powered by Chain AI Quant Engine</span>
            <span>256bit Encrypted Broker Sync</span>
          </div>
        </form>
      </div>
    </div>
  );
}
