/**
 * Admin Token Management — list, issue, and revoke access tokens.
 *
 * Tokens are issued automatically when an administrator confirms a manual
 * payment. This screen covers the rest of the lifecycle: issuing a token by
 * hand and revoking one.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/format";

interface AccessTokenInfo {
  id: string;
  token: string;
  type: "purchase" | "email";
  email: string | null;
  max_uses: number;
  used_count: number;
  expires_at: number | null;
  created_at: number;
}

interface PricingConfig {
  purchaseTokenUses: number;
  purchaseTokenExpiryDays: number;
}

const UNLIMITED_USES = 999999;

export default function AdminTokensPage() {
  const [tokens, setTokens] = useState<AccessTokenInfo[]>([]);
  const [pricing, setPricing] = useState<PricingConfig>({
    purchaseTokenUses: 20,
    purchaseTokenExpiryDays: 30,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [tokenEmail, setTokenEmail] = useState("");
  const [isIssuing, setIsIssuing] = useState(false);
  const [issuedToken, setIssuedToken] = useState("");

  const loadTokens = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch("/api/tokens/purchase");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to load tokens");
      setTokens(data.tokens || []);
    } catch (err: any) {
      setError(err.message || "Failed to load tokens");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTokens();
    fetch("/api/admin/pricing")
      .then((response) => response.json())
      .then((data) => {
        if (data.pricing) setPricing(data.pricing);
      })
      .catch(() => {});
  }, [loadTokens]);

  const usesPerToken =
    pricing.purchaseTokenUses <= 0 ? "Unlimited" : String(pricing.purchaseTokenUses);
  const usesPerTokenLabel =
    usesPerToken === "Unlimited"
      ? "unlimited generations"
      : `${usesPerToken} generation${pricing.purchaseTokenUses === 1 ? "" : "s"}`;

  const issueToken = async () => {
    setIsIssuing(true);
    setError("");
    setSuccess("");
    setIssuedToken("");

    try {
      const response = await fetch("/api/tokens/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userEmail: tokenEmail.trim() || undefined }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to issue token");

      setIssuedToken(data.token);
      const usesLabel = data.infiniteUses
        ? "unlimited generations"
        : `${data.usesRemaining} generations`;
      const expiryLabel = data.expiresAt
        ? `, expires ${new Date(data.expiresAt).toLocaleString()}`
        : "";
      setSuccess(`Token issued — ${usesLabel}${expiryLabel}.`);
      await loadTokens();
    } catch (err: any) {
      setError(err.message || "Failed to issue token");
    } finally {
      setIsIssuing(false);
    }
  };

  const revokeToken = async (id: string) => {
    if (!window.confirm("Revoke this token? This cannot be undone.")) return;

    try {
      const response = await fetch(`/api/tokens/purchase?id=${id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to revoke token");

      setSuccess("Token revoked.");
      await loadTokens();
    } catch (err: any) {
      setError(err.message || "Failed to revoke token");
    }
  };

  const usesDisplay = (max: number, used: number) =>
    max >= UNLIMITED_USES ? "∞ Unlimited" : `${max - used} / ${max}`;

  if (isLoading) {
    return (
      <div className="admin-page">
        <div className="admin-loading">Loading…</div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>Token Management</h1>
        <p>Tokens grant book generations. Most are issued when a payment is confirmed.</p>
      </div>

      {error && <div className="admin-message error">{error}</div>}
      {success && <div className="admin-message success">{success}</div>}

      <section className="admin-section">
        <h2>Issued Tokens</h2>
        <p className="section-help">
          A confirmed manual payment issues a token automatically and emails it to the user.
          Issue one here only for support cases or arrangements outside the normal payment flow.
          <br />
          Each token grants {usesPerTokenLabel} and
          expires after {pricing.purchaseTokenExpiryDays} days (set in{" "}
          <Link href="/admin/pricing" className="inline-link">Pricing</Link>).
        </p>

        <div className="section-actions">
          <button
            type="button"
            onClick={() => {
              setShowTokenModal(true);
              setIssuedToken("");
              setTokenEmail("");
              setError("");
              setSuccess("");
            }}
            className="btn btn-primary"
          >
            Issue a Token
          </button>
          {issuedToken && (
            <div className="token-result">
              <code>{issuedToken}</code>
              <button
                type="button"
                className="btn-copy"
                onClick={() => navigator.clipboard.writeText(issuedToken)}
                title="Copy token"
              >
                Copy
              </button>
            </div>
          )}
        </div>

        {tokens.length === 0 ? (
          <div className="empty-state">No tokens issued yet</div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Token</th>
                  <th>Type</th>
                  <th>Email</th>
                  <th>Uses</th>
                  <th>Expires</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tokens.map((token) => (
                  <tr key={token.id}>
                    <td>
                      <code>{token.token.substring(0, 20)}…</code>
                    </td>
                    <td>
                      <span className={`role-badge ${token.type === "email" ? "user" : "admin"}`}>
                        {token.type === "email" ? "Email" : "Payment"}
                      </span>
                    </td>
                    <td className="cell-wrap">{token.email || "—"}</td>
                    <td>{usesDisplay(token.max_uses, token.used_count)}</td>
                    <td>{token.expires_at ? formatDate(token.expires_at) : "No expiry"}</td>
                    <td>{formatDate(token.created_at)}</td>
                    <td>
                      <button
                        type="button"
                        className="btn-icon delete"
                        onClick={() => revokeToken(token.id)}
                        title="Revoke token"
                      >
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showTokenModal && (
        <div className="modal-overlay" onClick={() => !isIssuing && setShowTokenModal(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <h3>Issue a Token</h3>

            <div className="form-group">
              <label htmlFor="tokenEmail">User Email (optional)</label>
              <input
                id="tokenEmail"
                type="email"
                placeholder="user@example.com"
                value={tokenEmail}
                onChange={(event) => setTokenEmail(event.target.value)}
                disabled={isIssuing}
              />
              <p className="form-hint">
                Recording the email keeps the token traceable to a person.
              </p>
            </div>

            <p className="modal-summary">
              Grants <strong>{usesPerToken}</strong> generations, valid for{" "}
              <strong>{pricing.purchaseTokenExpiryDays} days</strong>.
            </p>

            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowTokenModal(false)}
                disabled={isIssuing}
              >
                Cancel
              </button>
              <button type="button" className="btn-primary" onClick={issueToken} disabled={isIssuing}>
                {isIssuing ? "Issuing…" : "Issue Token"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .inline-link {
          color: var(--accent-olive);
        }
        .cell-wrap {
          overflow-wrap: anywhere;
        }
        .modal-summary {
          margin: 4px 0 0;
          font-size: 13px;
          color: var(--ink-soft);
        }
      `}</style>
    </div>
  );
}
