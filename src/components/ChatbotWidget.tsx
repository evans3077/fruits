import React, { useEffect, useRef, useState } from 'react';
import { MessageCircle, RotateCcw, Send, Sparkles, X } from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
}

const QUICK_PROMPTS = [
  'Compare Berry vs Kiwi nutrition and sugar',
  'What are the 330ml and 1L KES prices?',
  'Do you deliver to Westlands or Nyali?',
  'Which promo codes work at checkout?',
];

export const ChatbotWidget: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: 'Jambo! Ask me about Blendy flavours, 330ml vs 1L KES pricing, nutrition facts, Kenyan delivery zones, or M-Pesa checkout.',
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open, sending]);

  const sendMessage = async (rawText: string) => {
    const trimmed = rawText.trim();
    if (!trimmed || sending) return;

    setErrorMsg(null);
    const userTurn: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: trimmed,
    };

    const historyForApi = messages
      .filter((m) => m.id !== 'welcome')
      .map((m) => ({ role: m.role, text: m.text }));

    setMessages((prev) => [...prev, userTurn]);
    setInput('');
    setSending(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: historyForApi,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `Chat request failed (${res.status}).`);
      }
      const replyText = String(data.reply || '').trim();
      if (!replyText) {
        throw new Error('The assistant returned an empty response.');
      }
      setMessages((prev) => [
        ...prev,
        {
          id: `m-${Date.now()}`,
          role: 'model',
          text: replyText,
        },
      ]);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to reach Blendy concierge.');
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleReset = () => {
    setErrorMsg(null);
    setMessages([
      {
        id: 'welcome',
        role: 'model',
        text: 'Conversation reset. Ask me about Berry, Kiwi, Banana, or Strawberry smoothies, nutrition, or delivery in Kenya.',
      },
    ]);
  };

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
      {open && (
        <section
          aria-label="Blendy Smoothie Concierge"
          className="w-[calc(100vw-2.5rem)] sm:w-[380px] h-[520px] max-h-[78vh] rounded-2xl bg-white border border-zinc-200 shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="px-4 py-3.5 bg-zinc-950 text-white flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-amber-300" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">Blendy Concierge</p>
                <p className="text-[11px] text-zinc-400 truncate">
                  Flavours, nutrition &amp; Kenya delivery
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleReset}
                title="Reset conversation"
                aria-label="Reset conversation"
                className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close chat"
                className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FAF9F7]"
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed whitespace-pre-line ${
                    msg.role === 'user'
                      ? 'bg-zinc-900 text-white rounded-br-sm'
                      : 'bg-white border border-zinc-200 text-zinc-800 rounded-bl-sm'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {sending && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm bg-white border border-zinc-200 px-3.5 py-2.5 text-xs text-zinc-500">
                  Thinking...
                </div>
              </div>
            )}

            {errorMsg && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900"
              >
                {errorMsg}
              </div>
            )}

            {/* Quick Prompt Suggestions on fresh chat */}
            {messages.length <= 1 && !sending && (
              <div className="pt-2 space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  Suggested questions
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_PROMPTS.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => sendMessage(q)}
                      className="text-left text-xs px-2.5 py-1.5 rounded-lg bg-white border border-zinc-200 text-zinc-700 hover:border-zinc-900 hover:text-zinc-950 transition-colors cursor-pointer"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="p-3 bg-white border-t border-zinc-200 flex items-center gap-2"
          >
            <label htmlFor="blendy-chat-input" className="sr-only">
              Ask Blendy Concierge
            </label>
            <input
              id="blendy-chat-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about flavours, calories, delivery..."
              disabled={sending}
              className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-zinc-300 text-sm focus:outline-none focus:border-zinc-950 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              aria-label="Send message"
              className="w-10 h-10 rounded-xl bg-zinc-900 text-white flex items-center justify-center hover:bg-zinc-800 transition-colors disabled:opacity-45 cursor-pointer shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close Blendy assistant' : 'Ask Blendy assistant'}
        className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-zinc-950 text-white text-sm font-semibold shadow-xl hover:bg-zinc-800 transition-colors cursor-pointer"
      >
        {open ? <X className="w-4 h-4" /> : <MessageCircle className="w-4 h-4" />}
        <span>{open ? 'Close Chat' : 'Ask Blendy'}</span>
      </button>
    </div>
  );
};
