"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { BookProvider, useBook } from "@/context/BookContext";
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
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [isChatStreaming, setIsChatStreaming] = useState(false);
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleSendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    const message = chatInput.trim();
    if (!message || isChatStreaming) return;

    setChatInput("");
    setChatMessages((current) => [...current, { role: "user", content: message }, { role: "assistant", content: "" }]);
    setIsChatStreaming(true);

    try {
      const response = await fetch("/api/claude-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: "You are a concise writing assistant for The Shelf book studio. Help with book planning, structure, and writing craft. Do not generate full chapters." },
            ...chatMessages,
            { role: "user", content: message },
          ],
        }),
      });
      if (!response.ok || !response.body) throw new Error("Unable to reach the writing desk");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value, { stream: true }).split("\n\n")) {
          if (!line.trim().startsWith("data: ")) continue;
          try {
            const eventData = JSON.parse(line.trim().slice(6));
            if (eventData.type === "content" && eventData.text) {
              assistantMessage += eventData.text;
              setChatMessages((current) => current.map((item, index) => index === current.length - 1 ? { ...item, content: assistantMessage } : item));
            }
          } catch {}
        }
      }
    } catch {
      setChatMessages((current) => current.map((item, index) => index === current.length - 1 ? { ...item, content: "I couldn't respond right now. Please try again." } : item));
    } finally {
      setIsChatStreaming(false);
    }
  };

  // Prevent FOUC - don't render until mounted
  if (!mounted) {
    return (
      <div className="app-layout min-h-screen bg-[var(--bg-cream)]">
        <header className="app-header">
          <div className="header-left">
            <Link href="/" className="app-logo">The Shelf</Link>
          </div>
          <div className="header-right">
            <div className="auth-links">
              <Link href="/login" className="header-link">Sign In</Link>
            </div>
          </div>
        </header>
        <div className="app-main flex-1">
          <main className="content-area flex-1">
            <MainArea />
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout min-h-screen bg-[var(--bg-cream)]">
      <header className="app-header">
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
            </div>
          )}
        </div>
      </header>
      <div className="app-main flex-1">
        <main className="content-area flex-1">
          <MainArea />
        </main>
      </div>
      <div className="chat-invitation">
        <div className="chat-invitation-bubble" aria-hidden="true">
          <span className="chat-invitation-icon">✦</span>
          <span>Chat with Sheldon AI</span>
          <span className="chat-invitation-arrow">↓</span>
        </div>
        <span className="chat-pulse-light" aria-hidden="true" />
        <button className="chat-launcher" type="button" onClick={() => setIsChatOpen(true)} aria-label="Open writing desk">
          <span aria-hidden="true">✦</span> Writing desk
        </button>
      </div>
      {isChatOpen && (
        <aside className="writing-desk" aria-label="Writing desk">
          <div className="writing-desk-header">
            <div><span className="writing-desk-kicker">QUIET ASSISTANCE</span><h2>Writing desk</h2></div>
            <button type="button" onClick={() => setIsChatOpen(false)} aria-label="Close writing desk">×</button>
          </div>
          <div className="writing-desk-messages">
            {chatMessages.length === 0 && <p className="writing-desk-empty">Ask for a structural idea, a clearer angle, or a thoughtful edit.</p>}
            {chatMessages.map((message, index) => <div key={index} className={`desk-message ${message.role}`}>{message.content || (isChatStreaming ? "..." : "")}</div>)}
            <div ref={messagesEndRef} />
          </div>
          <form className="writing-desk-form" onSubmit={handleSendMessage}>
            <textarea value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder="Ask about your book..." rows={2} disabled={isChatStreaming} />
            <button type="submit" disabled={!chatInput.trim() || isChatStreaming}>Send</button>
          </form>
        </aside>
      )}
    </div>
  );
}

function getStyles() {
  return `
    /* CSS Variables - alias variables for legacy component compatibility */
    :global(:root) {
      --display: var(--font-display);
      --body: var(--font-body);
      --mono: var(--font-mono);
    }

    /* Layout */
    .app-layout {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      background: var(--bg-cream);
    }

    /* Header */
    .app-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      height: 64px;
      padding: 0 32px;
      background: var(--paper);
      border-bottom: 1px solid var(--border-tan);
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

    /* Chat Sidebar — dark editorial theme per DESIGN_SPECS.md */
    .chat-sidebar {
      width: 380px;
      min-width: 380px;
      max-width: 380px;
      background: var(--dark-bg);
      border-right: 1px solid var(--dark-border);
      display: flex;
      flex-direction: column;
      transition: all 0.3s ease;
      z-index: 50;
      color: var(--dark-text);
      font-family: var(--font-mono);
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
      border-bottom: 1px solid var(--dark-border);
      flex-shrink: 0;
      background: var(--dark-panel);
    }

    .sidebar-header h3 {
      margin: 0 0 4px;
      font-family: var(--font-mono);
      font-size: 12px;
      font-weight: 600;
      color: var(--dark-muted);
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }

    .sidebar-subtitle {
      margin: 0;
      font-size: 11px;
      color: var(--dark-muted);
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
      color: var(--dark-muted);
      padding: 20px 0;
      text-align: left;
    }

    .welcome-message svg {
      color: var(--dark-text);
      margin-bottom: 16px;
      opacity: 0.6;
    }

    .welcome-message h4 {
      margin: 0 0 8px;
      font-family: var(--font-display);
      font-size: 16px;
      font-weight: 600;
      color: var(--dark-text);
    }

    .welcome-message p {
      margin: 0 0 20px;
      font-size: 13px;
      line-height: 1.6;
      color: var(--dark-muted);
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
      border: 1px solid var(--dark-border);
      border-radius: 4px;
      font-size: 12px;
      color: var(--dark-muted);
      cursor: pointer;
      transition: all 0.15s ease;
      text-align: left;
      font-family: var(--font-mono);
    }

    .quick-action:hover {
      background: rgba(255, 255, 255, 0.05);
      border-color: var(--dark-text);
      color: var(--dark-text);
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
      font-family: var(--font-mono);
      font-size: 11px;
      font-weight: 600;
      flex-shrink: 0;
    }

    .message.user .message-avatar {
      background: var(--dark-text);
      color: var(--dark-bg);
    }

    .message.assistant .message-avatar {
      background: var(--dark-text);
      color: var(--dark-bg);
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
      color: var(--dark-text);
    }

    .formatted-message em {
      font-style: italic;
      color: var(--dark-muted);
    }

    .inline-code {
      font-family: var(--font-mono);
      font-size: 12px;
      background: rgba(255, 255, 255, 0.08);
      padding: 1px 6px;
      border-radius: 3px;
      color: var(--dark-text);
    }

    .code-block {
      background: var(--dark-panel);
      border: 1px solid var(--dark-border);
      border-radius: 6px;
      padding: 12px;
      margin: 8px 0;
      overflow-x: auto;
    }

    .code-block code {
      font-family: var(--font-mono);
      font-size: 11px;
      line-height: 1.5;
      color: var(--dark-text);
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
      background: var(--dark-text);
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
      border-top: 1px solid var(--dark-border);
      background: var(--dark-panel);
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
      border: 1px solid var(--dark-border);
      border-radius: 4px;
      background: var(--dark-bg);
      font-family: var(--font-mono);
      font-size: 13px;
      color: var(--dark-text);
      line-height: 1.5;
      resize: none;
      transition: all 0.15s ease;
    }

    .input-wrapper textarea:focus {
      outline: none;
      border-color: var(--dark-text);
      box-shadow: 0 0 0 2px rgba(232, 232, 240, 0.1);
      background: var(--dark-panel);
    }

    .input-wrapper textarea::placeholder {
      color: var(--dark-placeholder);
    }

    .input-wrapper textarea:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .send-button {
      width: 44px;
      height: 44px;
      border: none;
      background: var(--dark-text);
      color: var(--dark-bg);
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.15s ease;
      flex-shrink: 0;
    }

    .send-button:hover:not(:disabled) {
      background: var(--dark-muted);
      transform: scale(1.02);
    }

    .send-button:disabled {
      opacity: 0.4;
      cursor: not-allowed;
      transform: none;
    }

    /* Content Area (Right Side) */
    .content-area {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    /* Mobile Chat Toggle */
    .mobile-chat-toggle {
      display: none;
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 56px;
      height: 56px;
      border: none;
      background: var(--dark-text);
      color: var(--dark-bg);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 4px 16px rgba(43, 43, 38, 0.2);
      z-index: 90;
      transition: all 0.2s ease;
    }

    .mobile-chat-toggle:hover {
      background: var(--dark-muted);
      transform: scale(1.05);
      box-shadow: 0 6px 20px rgba(43, 43, 38, 0.3);
    }

    .chat-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      min-width: 20px;
      height: 20px;
      background: #ff3b30;
      color: white;
      border-radius: 10px;
      font-size: 10px;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 6px;
    }

    /* Two-Column Layout for Desktop */
    @media (min-width: 1025px) {
      .app-main {
        display: flex;
        flex-direction: row;
      }

      .chat-sidebar {
        position: relative;
        width: 380px;
        min-width: 380px;
        max-width: 380px;
        height: calc(100vh - 64px);
      }

      .chat-sidebar.closed {
        width: 0;
        min-width: 0;
        max-width: 0;
      }
    }

    /* Tablet and Mobile */
    @media (max-width: 1024px) {
      .chat-sidebar {
        position: fixed;
        left: 0;
        top: 64px;
        bottom: 0;
        width: 380px;
        min-width: 380px;
        max-width: 380px;
        z-index: 100;
        box-shadow: 4px 0 24px rgba(0,0,0,0.3);
      }

      .chat-sidebar.closed {
        transform: translateX(-100%);
      }

      .chat-sidebar.open {
        transform: translateX(0);
      }

      .content-area {
        width: 100%;
      }

      .mobile-chat-toggle {
        display: flex;
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
      .chat-invitation {
        top: 68px;
        right: 12px;
        bottom: auto;
        gap: 6px;
        align-items: flex-end;
      }
      .chat-invitation-bubble {
        max-width: calc(100vw - 40px);
        font-size: 10px;
        padding: 7px 9px;
      }
      .chat-sidebar.closed {
        transform: translateX(-100%);
      }
    }
  `;
}