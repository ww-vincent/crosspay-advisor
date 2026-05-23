'use client';

import { useState, useRef, useEffect, useCallback, type FormEvent, type KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar } from '@/components/ui/avatar';
import { useRates } from '@/hooks/use-rates';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  timestamp: string;
}

interface Session {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
}

const STORAGE_KEY = 'crosspay-chat-sessions';

const QUICK_ACTIONS = [
  { label: 'USD/CNY 最新汇率', icon: '💰' },
  { label: '换汇 1000 美元最优方案', icon: '🔄' },
  { label: '近期汇率走势分析', icon: '📈' },
  { label: '哪些银行手续费最低', icon: '🏦' },
];

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'assistant',
  content:
    '你好！我是你的智能换汇顾问。我可以帮你分析实时汇率、对比不同渠道的换汇成本、推荐最优换汇时机。有什么我可以帮你的吗？',
  timestamp: '',
};

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

function loadSessions(): Session[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSessions(sessions: Session[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    // Storage full or unavailable
  }
}

function getTitle(firstMsg: string): string {
  const max = 20;
  return firstMsg.length > max ? firstMsg.slice(0, max) + '...' : firstMsg;
}

export function ChatPanel() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { rates } = useRates();

  const fiatRates = rates.filter((r) => r.type === 'fiat').slice(0, 6);

  // Load sessions from localStorage on mount
  useEffect(() => {
    const saved = loadSessions();
    if (saved.length > 0) {
      setSessions(saved);
      setActiveSessionId(saved[0].id);
    } else {
      // Create first session
      const newSession: Session = {
        id: generateId(),
        title: '新对话',
        messages: [{ ...WELCOME_MESSAGE, timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) }],
        createdAt: Date.now(),
      };
      setSessions([newSession]);
      setActiveSessionId(newSession.id);
      saveSessions([newSession]);
    }
  }, []);

  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const messages = activeSession?.messages || [];

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Persist sessions whenever they change
  const updateSessions = useCallback((newSessions: Session[]) => {
    setSessions(newSessions);
    saveSessions(newSessions);
  }, []);

  const createNewSession = useCallback(() => {
    const newSession: Session = {
      id: generateId(),
      title: '新对话',
      messages: [{ ...WELCOME_MESSAGE, timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) }],
      createdAt: Date.now(),
    };
    const newSessions = [newSession, ...sessions];
    updateSessions(newSessions);
    setActiveSessionId(newSession.id);
    setSidebarOpen(false);
  }, [sessions, updateSessions]);

  const deleteSession = useCallback((sessionId: string) => {
    const newSessions = sessions.filter((s) => s.id !== sessionId);
    if (newSessions.length === 0) {
      const newSession: Session = {
        id: generateId(),
        title: '新对话',
        messages: [{ ...WELCOME_MESSAGE, timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) }],
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
  }, [sessions, activeSessionId, updateSessions]);

  const updateSessionMessages = useCallback((sessionId: string, msgs: Message[], title?: string) => {
    const newSessions = sessions.map((s) => {
      if (s.id !== sessionId) return s;
      return {
        ...s,
        messages: msgs,
        ...(title ? { title } : {}),
      };
    });
    updateSessions(newSessions);
  }, [sessions, updateSessions]);

  const handleSend = async (text?: string) => {
    const content = (text ?? inputValue).trim();
    if (!content || isTyping || !activeSession) return;

    const now = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: now,
    };

    const aiMessageId = generateId();
    const aiMessage: Message = {
      id: aiMessageId,
      role: 'assistant',
      content: '',
      timestamp: now,
    };

    const newMessages = [...activeSession.messages, userMessage, aiMessage];

    // Update title on first user message
    const isFirstUserMsg = activeSession.messages.filter((m) => m.role === 'user').length === 0;
    const title = isFirstUserMsg ? getTitle(content) : undefined;

    updateSessionMessages(activeSession.id, newMessages, title);
    setInputValue('');
    setIsTyping(true);

    // Cancel any previous request
    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content, sessionId: activeSession.id }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        updateSessionMessages(activeSession.id,
          newMessages.map((m) =>
            m.id === aiMessageId
              ? { ...m, content: '抱歉，服务暂时不可用，请稍后再试。' }
              : m
          )
        );
        setIsTyping(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        updateSessionMessages(activeSession.id,
          newMessages.map((m) =>
            m.id === aiMessageId
              ? { ...m, content: '抱歉，响应读取失败，请稍后再试。' }
              : m
          )
        );
        setIsTyping(false);
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';
      const sessionId = activeSession.id;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          if (trimmed.startsWith('data:')) {
            const raw = trimmed.slice(5).trim();
            if (raw === '[DONE]') continue;

            try {
              const data = JSON.parse(raw);

              if (data.type === 'answer' && data.content?.answer) {
                accumulated += data.content.answer;
                const currentAcc = accumulated;
                const currentAiId = aiMessageId;
                setSessions((prev) => {
                  const updated = prev.map((s) => {
                    if (s.id !== sessionId) return s;
                    return {
                      ...s,
                      messages: s.messages.map((m) =>
                        m.id === currentAiId ? { ...m, content: currentAcc } : m
                      ),
                    };
                  });
                  saveSessions(updated);
                  return updated;
                });
              }
              // Skip thinking content
            } catch {
              // Skip non-parseable lines
            }
          }
        }
      }

      // If no content was accumulated, show a fallback message
      if (!accumulated) {
        updateSessionMessages(sessionId,
          newMessages.map((m) =>
            m.id === aiMessageId
              ? { ...m, content: '抱歉，未收到有效回复，请稍后再试。' }
              : m
          )
        );
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error('[ChatPanel] Stream error:', err);
      updateSessionMessages(activeSession.id,
        [...activeSession.messages, userMessage, aiMessage].map((m) =>
          m.id === aiMessageId
            ? { ...m, content: '抱歉，网络连接异常，请稍后再试。' }
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
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-full min-h-0">
      {/* Sidebar - session list */}
      <div
        className={`absolute inset-y-0 left-0 z-20 w-72 transform border-r border-border bg-[#0B1120] transition-transform duration-200 ease-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-semibold text-foreground">历史会话</span>
            <button
              onClick={() => setSidebarOpen(false)}
              className="rounded-md p-1 text-muted-foreground hover:text-foreground"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div className="p-3">
            <button
              onClick={createNewSession}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-emerald-500/50 hover:text-emerald-400"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              新建对话
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-3 pb-3">
            {sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => {
                  setActiveSessionId(session.id);
                  setSidebarOpen(false);
                }}
                className={`group mb-1 flex cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 text-xs transition-colors ${
                  session.id === activeSessionId
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'text-muted-foreground hover:bg-card hover:text-foreground'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{session.title}</div>
                  <div className="mt-0.5 text-[10px] opacity-60">
                    {session.messages.filter((m) => m.role === 'user').length} 条对话
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSession(session.id);
                  }}
                  className="ml-2 shrink-0 rounded p-1 opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex h-full min-h-0 flex-1 flex-col">
        {/* Quick rate ticker */}
        <div className="flex items-center gap-4 border-b border-border bg-card/50 px-6 py-2.5 overflow-x-auto">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
            历史会话
          </button>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-1.5">
            <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span className="text-xs text-emerald-400">在线</span>
          </div>
          <div className="h-4 w-px bg-border" />
          {fiatRates.length > 0 ? (
            fiatRates.map((item) => {
              const isUp = item.change >= 0;
              const fmt = item.rate >= 1 ? item.rate.toFixed(4) : item.rate.toFixed(5);
              return (
                <div key={item.pair} className="flex items-center gap-2 whitespace-nowrap text-xs">
                  <span className="text-muted-foreground">{item.pair}</span>
                  <span className="font-mono font-medium text-foreground">{fmt}</span>
                  <span className={`font-mono ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                    {isUp ? '+' : ''}{item.change.toFixed(2)}%
                  </span>
                </div>
              );
            })
          ) : (
            <span className="text-xs text-muted-foreground">加载中...</span>
          )}
        </div>

        {/* Chat messages */}
        <ScrollArea className="min-h-0 flex-1 px-6" ref={scrollRef}>
          <div className="space-y-4 py-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`slide-up flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                {msg.role === 'assistant' ? (
                  <Avatar className="mt-0.5 h-8 w-8 shrink-0 rounded-lg">
                    <div className="flex h-full w-full items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 text-xs font-bold text-white">
                      FX
                    </div>
                  </Avatar>
                ) : (
                  <Avatar className="mt-0.5 h-8 w-8 shrink-0 rounded-lg">
                    <div className="flex h-full w-full items-center justify-center rounded-lg bg-secondary text-xs font-medium text-foreground">
                      我
                    </div>
                  </Avatar>
                )}
                <div
                  className={`max-w-[75%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === 'assistant'
                      ? 'bg-card text-card-foreground border border-border'
                      : 'bg-gradient-to-br from-emerald-600/90 to-cyan-600/90 text-white'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-invert prose-sm max-w-none [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_th]:text-xs [&_th]:font-semibold [&_th]:text-muted-foreground [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1 [&_td]:text-xs [&_tr]:border-b [&_tr]:border-border [&_thead]:bg-muted/50 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_h1]:text-base [&_h1]:font-bold [&_h2]:text-sm [&_h2]:font-bold [&_h3]:text-sm [&_h3]:font-semibold [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-3 [&_blockquote]:border-l-2 [&_blockquote]:border-emerald-500 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_strong]:text-foreground">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    msg.content
                  )}
                  {msg.role === 'assistant' && !msg.content && isTyping && (
                    <div className="flex items-center gap-1">
                      <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-400" style={{ animationDelay: '0ms' }} />
                      <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-400" style={{ animationDelay: '150ms' }} />
                      <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-400" style={{ animationDelay: '300ms' }} />
                    </div>
                  )}
                  {msg.timestamp && (
                    <div
                      className={`mt-1.5 text-[10px] ${
                        msg.role === 'assistant' ? 'text-muted-foreground' : 'text-white/60'
                      }`}
                    >
                      {msg.timestamp}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && messages.length > 0 && messages[messages.length - 1]?.role === 'user' && (
              <div className="slide-up flex gap-3">
                <Avatar className="mt-0.5 h-8 w-8 shrink-0 rounded-lg">
                  <div className="flex h-full w-full items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 text-xs font-bold text-white">
                    FX
                  </div>
                </Avatar>
                <div className="rounded-xl border border-border bg-card px-4 py-3">
                  <div className="flex items-center gap-1">
                    <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-400" style={{ animationDelay: '0ms' }} />
                    <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-400" style={{ animationDelay: '150ms' }} />
                    <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-400" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Quick actions */}
        <div className="flex items-center gap-2 overflow-x-auto border-t border-border px-6 py-2.5">
          <span className="shrink-0 text-xs text-muted-foreground">快捷提问：</span>
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => handleSend(action.label)}
              disabled={isTyping}
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card/50 px-3 py-1.5 text-xs text-foreground transition-colors hover:border-emerald-500/50 hover:bg-emerald-500/10 disabled:opacity-50"
            >
              <span>{action.icon}</span>
              <span>{action.label}</span>
            </button>
          ))}
        </div>

        {/* Input area */}
        <form onSubmit={handleSubmit} className="border-t border-border px-6 py-3">
          <div className="flex items-end gap-3">
            <Textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入你的换汇问题..."
              className="min-h-[44px] max-h-[120px] resize-none rounded-xl border-border bg-card text-sm placeholder:text-muted-foreground focus-visible:ring-emerald-500/30"
              rows={1}
            />
            <Button
              type="submit"
              disabled={!inputValue.trim() || isTyping}
              className="h-[44px] shrink-0 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-5 text-sm font-medium text-white hover:from-emerald-600 hover:to-cyan-600 disabled:opacity-50"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
