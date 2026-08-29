"use client";

import { useEffect, useState } from "react";
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
        <Shelf />
        <MainArea />
      </div>

      <style jsx>{`${getStyles()}`}</style>
    </div>
  );
}

function getStyles() {
  return `
    .app-layout {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }

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
      background: #2d4a3f;
      color: white;
      border-color: #2d4a3f;
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

    .app-main {
      display: flex;
      flex: 1;
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
    }
  `;
}
