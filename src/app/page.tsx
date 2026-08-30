"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { BookProvider, useBook } from "@/context/BookContext";
import { Shelf } from "@/components/Shelf";
import { MainArea } from "@/components/MainArea";

export default function Home() {
  return (
    <BookProvider>
      <HomeContent />
    </BookProvider>
  );
}

function HomeContent() {
  const { state, actions } = useBook();
  const [user, setUser] = useState<{ id: string; email: string; name: string; isAdmin: boolean; accessToken?: string } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check Gemini availability when the book becomes ready
  useEffect(() => {
    if (state.status === "ready") {
      actions.checkGeminiAvailability();
    }
  }, [state.status, actions.checkGeminiAvailability]);

  // Fetch user session on mount
  useEffect(() => {
    fetch("/api/auth/me")
      .then(res => res.json())
      .then(data => {
        if (data.user) setUser(data.user);
        setMounted(true);
      })
      .catch(() => { setMounted(true); });
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => { scrollToBottom(); }, [chatMessages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isStreaming) return;

    const userMessage = chatInput.trim();
    setChatMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setChatInput("");
    setIsStreaming(true);

    try {
      // Build context from current book state
      const context = buildBookContext(state);

      const response = await fetch("/api/claude-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: getSystemPrompt(context) },
            ...chatMessages,
            { role: "user", content: userMessage }
          ]
        }),
      });

      if (!response.ok) throw new Error("Failed to get response");

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = "";

      // Add empty assistant message
      setChatMessages(prev => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n\n");

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;

          const jsonStr = trimmed.slice(6).trim();
          if (!jsonStr) continue;

          try {
            const event = JSON.parse(jsonStr);
            if (event.type === "content" && event.text) {
              assistantMessage += event.text;
              setChatMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = {
                  ...newMessages[newMessages.length - 1],
                  content: assistantMessage
                };
                return newMessages;
              });
            }
          } catch {}
        }
      }
    } catch (err) {
      console.error("Chat error:", err);
      setChatMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          role: "assistant",
          content: "Sorry, I couldn't respond. Please try again."
        };
        return newMessages;
      });
    } finally {
      setIsStreaming(false);
    }
  };

  // Prevent FOUC - don't render until mounted
  if (!mounted) {
    return (
      <div className="app-layout">
        <header className="app-header">
          <div className="header-left">
            <Link href="/" className="app-logo">The Shelf</Link>
          </div>
          <div className="header-right">
            <div className="auth-links">
              <Link href="/login" className="header-link">Sign In</Link>
              <Link href="/register" className="header-link primary">Get Started</Link>
            </div>
          </div>
        </header>
        <div className="app-main">
          <aside className="chat-sidebar" />
          <Shelf />
          <MainArea />
        </div>
        <style jsx>{`${getStyles()}`}</style>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <header className="app-header">
        <button
          className="sidebar-toggle"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label={sidebarOpen ? "Close chat" : "Open chat"}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            {sidebarOpen ? (
              <path d="M9 18l6-6-6-6"/>
            ) : (
              <path d="M15 18l-6-6 6-6"/>
            )}
          </svg>
        </button>
        <div className="header-left">
          <Link href="/" className="app-logo">The Shelf</Link>
        </div>
        <div className="header-right">
          {user ? (
            <div className="user-menu">
              <span className="user-avatar" aria-hidden="true">{user.name.charAt(0).toUpperCase()}</span>
              <span className="user-name">{user.name}</span>
              {user.isAdmin && (
                <Link href="/admin" className="header-link admin-link">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  Admin
                </Link>
              )}
              <button onClick={handleLogout} className="header-link logout-link">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                Logout
              </button>
            </div>
          ) : (
            <div className="auth-links">
              <Link href="/login" className="header-link">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                  <polyline points="10 17 15 12 10 7"/>
                  <line x1="15" y1="12" x2="3" y2="12"/>
                </svg>
                Sign In
              </Link>
              <Link href="/register" className="header-link primary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Get Started
              </Link>
            </div>
          )}
        </div>
      </header>
      <div className="app-main">
        <aside className={`chat-sidebar ${sidebarOpen ? "open" : "closed"}`}>
          <div className="sidebar-header">
            <h3>Claude Assistant</h3>
            <p className="sidebar-subtitle">Ask about your book, get writing help, or brainstorm ideas</p>
          </div>
          <div className="sidebar-messages" ref={messagesEndRef}>
            {chatMessages.length === 0 && (
              <div className="welcome-message">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                <h4>Hi! I'm Claude, your writing assistant.</h4>
                <p>I can help you with your book, answer questions, or brainstorm ideas. What would you like to do?</p>
                <div className="quick-actions">
                  <button className="quick-action" onClick={() => setChatInput("Help me brainstorm chapter ideas for my book")}>
                    <span>💡</span> Brainstorm chapters
                  </button>
                  <button className="quick-action" onClick={() => setChatInput("Review my current chapter and suggest improvements")}>
                    <span>✍️</span> Review my writing
                  </button>
                  <button className="quick-action" onClick={() => setChatInput("Explain the difference between writing styles")}>
                    <span>📚</span> Explain styles
                  </button>
                  <button className="quick-action" onClick={() => setChatInput("Help me write a compelling book description")}>
                    <span>📖</span> Book description
                  </button>
                </div>
              </div>
            )}
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`message ${msg.role}`}>
                <div className="message-avatar">
                  {msg.role === "user" ? (
                    <span>{user?.name?.charAt(0).toUpperCase() || "U"}</span>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z"/>
                      <path d="M9 11l3 3 7-7"/>
                    </svg>
                  )}
                </div>
                <div className="message-content">
                  <div className="message-text">{formatMessage(msg.content)}</div>
                  {msg.role === "assistant" && isStreaming && idx === chatMessages.length - 1 && (
                    <span className="typing-indicator">
                      <span></span><span></span><span></span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <form onSubmit={handleSendMessage} className="sidebar-input-form">
            <div className="input-wrapper">
              <textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask Claude anything about your book..."
                rows={1}
                disabled={isStreaming}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
              />
            </div>
            <button
              type="submit"
              className="send-button"
              disabled={!chatInput.trim() || isStreaming}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </form>
        </aside>
        <Shelf />
        <MainArea />
      </div>

      <style jsx>{`${getStyles()}`}</style>
    </div>
  );
}

function buildBookContext(state: any): string {
  const parts: string[] = [];

  if (state.config) {
    parts.push(`Book: "${state.config.title || "Untitled"}"`);
    parts.push(`Topic: ${state.config.topic}`);
    parts.push(`Category: ${state.config.bookCategory}`);
    parts.push(`Audience: ${state.config.targetAudience}`);
    parts.push(`Style: ${state.config.writingStyle || "Conversational"}`);
    parts.push(`Tone: ${state.config.tone || "Friendly"}`);
  }

  if (state.concept) {
    parts.push(`\nConcept:`);
    parts.push(`Title: ${state.concept.title}`);
    parts.push(`Subtitle: ${state.concept.subtitle}`);
    parts.push(`Chapters: ${state.concept.chapters.map((c: any, i: number) => `${i+1}. ${c.title}`).join(", ")}`);
  }

  if (state.chapters.length > 0) {
    parts.push(`\nCurrent Progress:`);
    state.chapters.forEach((ch: any, i: number) => {
      if (ch.content) {
        parts.push(`Chapter ${i+1} (${ch.title}): ${ch.content.length} chars written`);
      }
    });
  }

  return parts.join("\n");
}

function getSystemPrompt(context: string): string {
  return `You are Claude, an expert writing assistant integrated into "The Shelf" - an AI-powered book creation platform.

Current Book Context:
${context || "No book configured yet."}

Your role:
- Help users with their book: brainstorming, outlining, writing, editing
- Answer questions about writing craft, structure, style
- Provide feedback on their content
- Suggest improvements and alternatives
- Be encouraging but honest

Guidelines:
- Keep responses concise but helpful
- Use markdown for formatting when appropriate
- Reference their specific book context when relevant
- If they ask about something outside writing, politely redirect
- Don't generate full chapters - this platform handles that separately`;
}

function formatMessage(content: string): React.ReactNode {
  // Parse markdown-like content with code blocks
  const lines = content.split('\n');
  const nodes: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockLang = '';
  let codeBuffer: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBlockLang = trimmed.slice(3).trim();
        codeBuffer = [];
      } else {
        inCodeBlock = false;
        nodes.push(
          <pre key={`code-${i}`} className="code-block">
            <code className={codeBlockLang ? `language-${codeBlockLang}` : ''}>
              {codeBuffer.join('\n')}
            </code>
          </pre>
        );
        codeBuffer = [];
        codeBlockLang = '';
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    // Handle inline formatting
    if (line.trim() === '') {
      nodes.push(<br key={i} />);
      continue;
    }

    const parts = line.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/);
    const formatted = parts.map((part, j) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={j}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith("*") && part.endsWith("*") && part.length > 1) {
        return <em key={j}>{part.slice(1, -1)}</em>;
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return <code key={j} className="inline-code">{part.slice(1, -1)}</code>;
      }
      return <span key={j}>{part}</span>;
    });
    nodes.push(<div key={i} className="message-line">{formatted}</div>);
  }

  return <div className="formatted-message">{nodes}</div>;
}

function getStyles() {
  return `
    /* CSS Variables */
    :global(:root) {
      --ink: #1a1a1a;
      --ink-soft: #5a5a5a;
      --ink-faint: #9a9a9a;
      --paper: #ffffff;
      --paper-soft: #fafafa;
      --paper-deep: #f5f5f0;
      --line: #e8e8e0;
      --accent-forest: #3b5d50;
      --accent-forest-dark: #2d4a3f;
      --accent-gold: #c8a63a;
      --accent-rust: #b84a2e;
      --accent-forest-light: rgba(59, 93, 80, 0.08);
      --accent-rust-light: rgba(184, 74, 46, 0.08);
      --display: 'Cormorant Garamond', Georgia, serif;
      --body: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      --mono: 'JetBrains Mono', 'Fira Code', monospace;
    }

    /* Layout */
    .app-layout {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      background: var(--paper);
    }

    /* Header */
    .app-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      height: 64px;
      padding: 0 32px;
      background: var(--paper);
      border-bottom: 1px solid var(--line);
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .sidebar-toggle {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border: none;
      background: transparent;
      border-radius: 8px;
      color: var(--ink-soft);
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .sidebar-toggle:hover {
      background: var(--paper-soft);
      color: var(--ink);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 24px;
    }

    .app-logo {
      font-family: var(--display);
      font-size: 24px;
      color: var(--ink);
      text-decoration: none;
      font-weight: 600;
      letter-spacing: -0.02em;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .auth-links {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .header-link {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      color: var(--ink-soft);
      text-decoration: none;
      font-size: 14px;
      font-weight: 500;
      padding: 10px 20px;
      border-radius: 8px;
      border: 1px solid transparent;
      transition: all 0.15s ease;
      white-space: nowrap;
    }

    .header-link:hover {
      color: var(--ink);
      background: var(--paper-soft);
      border-color: var(--line);
    }

    .header-link svg {
      flex-shrink: 0;
      opacity: 0.7;
    }

    .header-link:hover svg {
      opacity: 1;
    }

    .header-link.primary {
      background: var(--accent-forest);
      color: white;
      border-color: var(--accent-forest);
    }

    .header-link.primary:hover {
      background: var(--accent-forest-dark);
      color: white;
      border-color: var(--accent-forest-dark);
    }

    .header-link.primary svg {
      opacity: 1;
    }

    .user-menu {
      display: flex;
      align-items: center;
      gap: 12px;
      padding-left: 20px;
      border-left: 1px solid var(--line);
    }

    .user-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--accent-forest), var(--accent-gold));
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: var(--display);
      font-size: 14px;
      font-weight: 600;
      flex-shrink: 0;
    }

    .user-name {
      font-size: 14px;
      color: var(--ink);
      font-weight: 500;
    }

    .admin-link {
      color: var(--accent-forest) !important;
      background: rgba(59, 93, 80, 0.08);
      border-color: rgba(59, 93, 80, 0.2);
    }

    .admin-link:hover {
      background: rgba(59, 93, 80, 0.15) !important;
      color: var(--accent-forest) !important;
    }

    .logout-link {
      color: var(--ink-soft);
      background: transparent;
    }

    .logout-link:hover {
      color: var(--accent-rust);
      background: rgba(160, 0, 0, 0.05);
      border-color: rgba(160, 0, 0, 0.15);
    }

    /* Main Layout */
    .app-main {
      display: flex;
      flex: 1;
      overflow: hidden;
    }

    /* Chat Sidebar - Claude Code Style */
    .chat-sidebar {
      width: 380px;
      min-width: 380px;
      max-width: 380px;
      background: #1a1a2e;
      border-right: 1px solid #2d2d44;
      display: flex;
      flex-direction: column;
      transition: all 0.3s ease;
      z-index: 50;
      color: #e8e8f0;
      font-family: var(--mono);
      font-size: 13px;
    }

    .chat-sidebar.closed {
      width: 0;
      min-width: 0;
      max-width: 0;
      border-right: none;
      overflow: hidden;
    }

    .sidebar-header {
      padding: 16px 20px;
      border-bottom: 1px solid #2d2d44;
      flex-shrink: 0;
      background: #161628;
    }

    .sidebar-header h3 {
      margin: 0 0 4px;
      font-family: var(--mono);
      font-size: 12px;
      font-weight: 600;
      color: #8b8bb0;
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }

    .sidebar-subtitle {
      margin: 0;
      font-size: 11px;
      color: #666688;
    }

    .sidebar-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px 20px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .welcome-message {
      color: #8b8bb0;
      padding: 20px 0;
      text-align: left;
    }

    .welcome-message svg {
      color: #4a9eff;
      margin-bottom: 16px;
      opacity: 0.8;
    }

    .welcome-message h4 {
      margin: 0 0 8px;
      font-family: var(--mono);
      font-size: 14px;
      font-weight: 600;
      color: #e8e8f0;
    }

    .welcome-message p {
      margin: 0 0 20px;
      font-size: 13px;
      line-height: 1.6;
    }

    .quick-actions {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .quick-action {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      background: transparent;
      border: 1px solid #2d2d44;
      border-radius: 6px;
      font-size: 12px;
      color: #a0a0c0;
      cursor: pointer;
      transition: all 0.15s ease;
      text-align: left;
      font-family: var(--mono);
    }

    .quick-action:hover {
      background: rgba(74, 158, 255, 0.1);
      border-color: #4a9eff;
      color: #4a9eff;
    }

    .message {
      display: flex;
      gap: 10px;
      animation: fadeInUp 0.15s ease;
    }

    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .message-avatar {
      width: 28px;
      height: 28px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: var(--mono);
      font-size: 11px;
      font-weight: 600;
      flex-shrink: 0;
    }

    .message.user .message-avatar {
      background: #4a9eff;
      color: #1a1a2e;
    }

    .message.assistant .message-avatar {
      background: linear-gradient(135deg, #4a9eff, #7c4dff);
      color: white;
    }

    .message-content {
      flex: 1;
      min-width: 0;
    }

    .formatted-message {
      line-height: 1.6;
    }

    .message-line {
      margin: 2px 0;
    }

    .formatted-message strong {
      font-weight: 600;
      color: #e8e8f0;
    }

    .formatted-message em {
      font-style: italic;
      color: #c0c0d0;
    }

    .inline-code {
      font-family: var(--mono);
      font-size: 12px;
      background: rgba(255,255,255,0.08);
      padding: 1px 6px;
      border-radius: 3px;
      color: #ffd700;
    }

    .code-block {
      background: #0d0d1a;
      border: 1px solid #2d2d44;
      border-radius: 6px;
      padding: 12px;
      margin: 8px 0;
      overflow-x: auto;
    }

    .code-block code {
      font-family: var(--mono);
      font-size: 11px;
      line-height: 1.5;
      color: #e8e8f0;
    }

    .typing-indicator {
      display: inline-flex;
      gap: 3px;
      padding-left: 4px;
    }

    .typing-indicator span {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: #4a9eff;
      opacity: 0.4;
      animation: typing 1.4s infinite ease-in-out;
    }

    .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
    .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }

    @keyframes typing {
      0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
      30% { transform: translateY(-3px); opacity: 1; }
    }

    .sidebar-input-form {
      display: flex;
      gap: 10px;
      padding: 16px 20px;
      border-top: 1px solid #2d2d44;
      background: #161628;
      flex-shrink: 0;
    }

    .input-wrapper {
      flex: 1;
    }

    .input-wrapper textarea {
      width: 100%;
      min-height: 44px;
      max-height: 120px;
      padding: 12px 14px;
      border: 1px solid #2d2d44;
      border-radius: 6px;
      background: #0d0d1a;
      font-family: var(--mono);
      font-size: 13px;
      color: #e8e8f0;
      line-height: 1.5;
      resize: none;
      transition: all 0.15s ease;
    }

    .input-wrapper textarea:focus {
      outline: none;
      border-color: #4a9eff;
      box-shadow: 0 0 0 2px rgba(74, 158, 255, 0.2);
      background: #161628;
    }

    .input-wrapper textarea::placeholder {
      color: #666688;
    }

    .input-wrapper textarea:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .send-button {
      width: 44px;
      height: 44px;
      border: none;
      background: #4a9eff;
      color: #1a1a2e;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.15s ease;
      flex-shrink: 0;
    }

    .send-button:hover:not(:disabled) {
      background: #5aafff;
      transform: scale(1.02);
    }

    .send-button:disabled {
      opacity: 0.4;
      cursor: not-allowed;
      transform: none;
    }

    /* Responsive */
    @media (max-width: 1024px) {
      .chat-sidebar {
        position: fixed;
        left: 0;
        top: 64px;
        bottom: 0;
        z-index: 100;
        box-shadow: 4px 0 24px rgba(0,0,0,0.1);
      }

      .chat-sidebar.closed {
        transform: translateX(-100%);
        width: 380px;
        min-width: 380px;
        max-width: 380px;
        border-right: 1px solid var(--line);
      }

      .chat-sidebar.open {
        transform: translateX(0);
      }

      .sidebar-toggle {
        display: flex;
      }
    }

    @media (min-width: 1025px) {
      .sidebar-toggle {
        display: none;
      }
    }

    @media (max-width: 640px) {
      .app-header {
        padding: 0 16px;
        height: 56px;
      }
      .user-name {
        display: none;
      }
      .header-link span {
        display: none;
      }
      .header-link {
        padding: 8px 12px;
      }
      .user-menu {
        padding-left: 12px;
        gap: 8px;
      }
      .chat-sidebar {
        width: 100%;
        min-width: 100%;
        max-width: 100%;
      }
      .chat-sidebar.closed {
        transform: translateX(-100%);
      }
    }
  `;
}