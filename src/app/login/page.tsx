"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }

      router.push("/");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-header">
            <Link href="/" className="auth-logo">The Shelf</Link>
            <h1>Welcome back</h1>
            <p>Sign in to continue</p>
          </div>
          <form className="auth-form">
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input type="email" id="email" placeholder="you@example.com" required disabled />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input type="password" id="password" placeholder="Your password" required disabled />
            </div>
            <button type="submit" className="btn-primary" disabled>Sign In</button>
          </form>
          <p className="auth-footer">Don't have an account? <Link href="/register">Create one</Link></p>
          <style jsx>{`${getStyles()}`}</style>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <Link href="/" className="auth-logo">The Shelf</Link>
          <h1>Welcome back</h1>
          <p>Sign in to continue</p>
        </div>

        {error && <div className="auth-error" role="alert">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <div className="input-wrapper">
              <svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <rect x="2" y="4" width="20" height="16" rx="2"/>
                <path d="m22 6-10 7L2 6"/>
              </svg>
              <input
                type="email"
                id="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="input-wrapper">
              <svg className="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <input
                type="password"
                id="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={isLoading}>
            {isLoading ? (
              <>
                <svg className="spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
                  <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round">
                    <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
                  </path>
                </svg>
                Signing in...
              </>
            ) : "Sign In"}
          </button>
        </form>

        <p className="auth-footer">Don't have an account? <Link href="/register">Create one</Link></p>

        <style jsx>{`${getStyles()}`}</style>
      </div>
    </div>
  );
}

function getStyles() {
  return `
    .auth-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      background: var(--paper-soft);
      background-image:
        radial-gradient(circle at 20% 80%, rgba(59, 93, 80, 0.04) 0%, transparent 50%),
        radial-gradient(circle at 80% 20%, rgba(200, 166, 58, 0.04) 0%, transparent 50%);
    }

    .auth-container {
      width: 100%;
      max-width: 420px;
      background: var(--paper);
      border: 1px solid var(--line);
      border-radius: 20px;
      padding: 48px 40px;
      box-shadow:
        0 1px 3px rgba(34, 48, 43, 0.05),
        0 8px 32px rgba(34, 48, 43, 0.08);
    }

    .auth-header {
      text-align: center;
      margin-bottom: 40px;
    }

    .auth-logo {
      display: inline-block;
      font-family: var(--display);
      font-size: 32px;
      color: var(--ink);
      text-decoration: none;
      font-weight: 600;
      letter-spacing: -0.02em;
      margin-bottom: 24px;
    }

    .auth-header h1 {
      font-family: var(--display);
      font-size: 28px;
      color: var(--ink);
      margin: 0 0 8px;
      font-weight: 600;
    }

    .auth-header p {
      color: var(--ink-soft);
      margin: 0;
      font-size: 16px;
    }

    .auth-error {
      display: flex;
      align-items: center;
      gap: 10px;
      background: #fef0f0;
      border: 1px solid #fcc;
      color: var(--accent-rust);
      padding: 14px 16px;
      border-radius: 10px;
      font-size: 14px;
      margin-bottom: 24px;
      animation: shakeIn 0.3s ease;
    }

    @keyframes shakeIn {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-4px); }
      75% { transform: translateX(4px); }
    }

    .auth-error::before {
      content: "";
      width: 18px;
      height: 18px;
      flex-shrink: 0;
      background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23b84a2e' stroke-width='2'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Cline x1='12' y1='8' x2='12' y2='12'/%3E%3Cline x1='12' y1='16' x2='12.01' y2='16'/%3E%3C/svg%3E") center/contain no-repeat;
    }

    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 22px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .form-group label {
      font-family: var(--mono);
      font-size: 11px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--ink-soft);
      font-weight: 500;
    }

    .input-wrapper {
      position: relative;
    }

    .input-icon {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--ink-faint);
      pointer-events: none;
      transition: color 0.15s ease;
    }

    .form-group input {
      width: 100%;
      padding: 14px 16px 14px 48px;
      border: 1.5px solid var(--line);
      border-radius: 10px;
      background: var(--paper);
      font-family: var(--body);
      font-size: 15px;
      color: var(--ink);
      transition: all 0.15s ease;
    }

    .form-group input::placeholder {
      color: var(--ink-faint);
    }

    .form-group input:focus {
      outline: none;
      border-color: var(--accent-forest);
      box-shadow: 0 0 0 3px rgba(59, 93, 80, 0.12);
    }

    .form-group input:focus + .input-icon,
    .form-group:focus-within .input-icon {
      color: var(--accent-forest);
    }

    .form-group input:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      background: var(--paper-soft);
    }

    .btn-primary {
      width: 100%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 16px 24px;
      background: var(--accent-forest);
      color: white;
      border: none;
      border-radius: 10px;
      font-family: var(--mono);
      font-size: 12px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      cursor: pointer;
      transition: all 0.15s ease;
      margin-top: 8px;
      position: relative;
      overflow: hidden;
    }

    .btn-primary::before {
      content: "";
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, rgba(255,255,255,0.1), transparent);
      opacity: 0;
      transition: opacity 0.15s ease;
    }

    .btn-primary:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 6px 24px rgba(59, 93, 80, 0.3);
    }

    .btn-primary:hover:not(:disabled)::before {
      opacity: 1;
    }

    .btn-primary:active:not(:disabled) {
      transform: translateY(0);
    }

    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }

    .spinner {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .auth-footer {
      text-align: center;
      margin-top: 28px;
      color: var(--ink-soft);
      font-size: 15px;
    }

    .auth-footer a {
      color: var(--accent-forest);
      text-decoration: none;
      font-weight: 600;
      position: relative;
    }

    .auth-footer a::after {
      content: "";
      position: absolute;
      bottom: -2px;
      left: 0;
      width: 100%;
      height: 2px;
      background: currentColor;
      transform: scaleX(0);
      transform-origin: right;
      transition: transform 0.2s ease;
    }

    .auth-footer a:hover::after {
      transform: scaleX(1);
      transform-origin: left;
    }

    /* Global CSS variables */
    :global(:root) {
      --ink: #1a1a1a;
      --ink-soft: #5a5a5a;
      --ink-faint: #9a9a9a;
      --paper: #ffffff;
      --paper-soft: #fafafa;
      --paper-deep: #f5f5f0;
      --line: #e8e8e0;
      --accent-forest: #3b5d50;
      --accent-gold: #c8a63a;
      --accent-rust: #b84a2e;
      --accent-forest-light: rgba(59, 93, 80, 0.08);
      --accent-rust-light: rgba(184, 74, 46, 0.08);
      --display: 'Cormorant Garamond', Georgia, serif;
      --body: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      --mono: 'JetBrains Mono', 'Fira Code', monospace;
    }
  `;
}