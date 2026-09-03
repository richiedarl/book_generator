/**
 * Admin Token Management — list, create, and delete access tokens.
 * Auth is handled by the parent admin layout.
 */

"use client";

import { useState, useEffect } from "react";

interface AccessTokenInfo {
  id: string;
  token: string;
  type: 'purchase' | 'email';
  email: string | null;
  max_uses: number;
  used_count: number;
  expires_at: number | null;
  created_at: number;
}

interface PricingConfig {
  purchaseTokenPriceCents: number;
  purchaseTokenCurrency: 'ngn' | 'usd';
  purchaseTokenUses: number;
  purchaseTokenExpiryDays: number;
}

export default function AdminTokensPage() {
  const [tokens, setTokens] = useState<AccessTokenInfo[]>([]);
  const [pricing, setPricing] = useState<PricingConfig>({
    purchaseTokenPriceCents: 4900,
    purchaseTokenCurrency: 'ngn',
    purchaseTokenUses: 20,
    purchaseTokenExpiryDays: 30,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Token creation modal
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [tokenEmail, setTokenEmail] = useState("");
  const [freeToken, setFreeToken] = useState(false);
  const [tokenCreating, setTokenCreating] = useState(false);
  const [createdToken, setCreatedToken] = useState("");

  useEffect(() => {
    loadTokens();
    loadPricing();
  }, []);

  const loadTokens = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch("/api/tokens/purchase");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load tokens");
      }

      setTokens(data.tokens || []);
    } catch (err: any) {
      setError(err.message || "Failed to load tokens");
    } finally {
      setIsLoading(false);
    }
  };

  const loadPricing = async () => {
    try {
      const response = await fetch("/api/admin/pricing");
      const data = await response.json();
      if (response.ok) {
        setPricing(data.pricing);
      }
    } catch (err) {
      console.error("Failed to load pricing:", err);
    }
  };

  const formatCurrency = (cents: number, currency: 'ngn' | 'usd') => {
    const amount = cents / 100;
    if (currency === 'ngn') {
      return `₦${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    }
    return `$${amount.toFixed(2)}`;
  };

  const getPriceLabel = () => {
    return formatCurrency(pricing.purchaseTokenPriceCents, pricing.purchaseTokenCurrency);
  };

  const getUsesDisplay = (max: number, used: number) => {
    if (max >= 999999) return '∞ Unlimited';
    return `${max - used} / ${max}`;
  };

  const handleCreateToken = async () => {
    setTokenCreating(true);
    setError("");
    setCreatedToken("");

    try {
      const response = await fetch("/api/tokens/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail: tokenEmail || undefined,
          free: freeToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 402) {
          throw new Error(data.error || "Payment provider not configured");
        }
        throw new Error(data.error || "Failed to create token");
      }

      setCreatedToken(data.token);

      let suffix = "";
      if (data.infiniteUses) {
        suffix = "Unlimited generations";
      } else {
        suffix = `${data.usesRemaining} uses remaining`;
      }

      if (data.expiresAt) {
        suffix += `, expires ${new Date(data.expiresAt).toLocaleString()}`;
      }

      if (data.free) {
        setSuccess(`Free token created — ${suffix}`);
      } else {
        setSuccess(`Token created (${getPriceLabel()}) — ${suffix}`);
      }

      await loadTokens();
    } catch (err: any) {
      setError(err.message || "Failed to create token");
    } finally {
      setTokenCreating(false);
    }
  };

  const handleDeleteToken = async (id: string) => {
    if (!confirm("Delete this token? This cannot be undone.")) return;

    try {
      const response = await fetch(`/api/tokens/purchase?id=${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete token");
      }

      setSuccess("Token deleted");
      await loadTokens();
    } catch (err: any) {
      setError(err.message || "Failed to delete token");
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

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
        <p>Create and manage access tokens for book generation.</p>
      </div>

      {error && <div className="admin-message error">{error}</div>}
      {success && <div className="admin-message success">{success}</div>}

      <section className="admin-section">
        <h2>Purchased Tokens</h2>
        <p className="section-help">
          Each paid purchase records a payment in the Payments section.
          Admins can create tokens for free using the "Free Token" checkbox below.
          Current price: {getPriceLabel()} ({pricing.purchaseTokenCurrency === 'ngn' ? '₦ NGN' : '$ USD'})
          <br />
          Current generation limit per token: {pricing.purchaseTokenUses <= 0 ? '∞ Unlimited' : pricing.purchaseTokenUses} (set in <Link href="/admin/pricing" style={{ color: 'var(--accent-olive)' }}>Pricing</Link>)
        </p>

        <div className="section-actions">
          <button
            onClick={() => { setShowTokenModal(true); setCreatedToken(""); setTokenEmail(""); setFreeToken(false); setError(""); setSuccess(""); }}
            className="btn btn-primary"
          >
            Create New Token ({getPriceLabel()})
          </button>
          {createdToken && (
            <div className="token-result">
              <code>{createdToken}</code>
              <button
                className="btn-copy"
                onClick={() => navigator.clipboard.writeText(createdToken)}
                title="Copy token"
              >
                Copy
              </button>
            </div>
          )}
        </div>

        {tokens.length === 0 ? (
          <div className="empty-state">No tokens created</div>
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
                      <span className={`role-badge ${token.type === 'email' ? 'user' : 'admin'}`}>
                        {token.type === 'email' ? 'Email' : 'Purchase'}
                      </span>
                    </td>
                    <td>{token.email || "—"}</td>
                    <td>{getUsesDisplay(token.max_uses, token.used_count)}</td>
                    <td>{token.expires_at ? formatDate(token.expires_at) : "No expiry"}</td>
                    <td>{formatDate(token.created_at)}</td>
                    <td>
                      <button
                        className="btn-icon delete"
                        onClick={() => handleDeleteToken(token.id)}
                        title="Delete token"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Create Token Modal */}
        {showTokenModal && (
          <div className="modal-overlay" onClick={() => setShowTokenModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h3>Create New Token</h3>

              {error && <div className="modal-error">{error}</div>}

              <div className="form-group">
                <label htmlFor="tokenEmail">User Email (optional)</label>
                <input
                  type="email"
                  id="tokenEmail"
                  placeholder="user@example.com"
                  value={tokenEmail}
                  onChange={(e) => setTokenEmail(e.target.value)}
                  disabled={tokenCreating}
                />
                <p className="form-hint">Leave blank to create a generic token.</p>
              </div>

              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={freeToken}
                    onChange={(e) => setFreeToken(e.target.checked)}
                  />
                  <span>Free Token (Admin Only)</span>
                </label>
                <p className="form-hint">
                  {freeToken
                    ? `Create a ${getPriceLabel()} token at no cost (no payment recorded).`
                    : `Create a ${getPriceLabel()} token. A payment will be recorded.`}
                </p>
              </div>

              <div className="modal-actions">
                <button
                  className="btn-secondary"
                  onClick={() => setShowTokenModal(false)}
                  disabled={tokenCreating}
                >
                  Cancel
                </button>
                <button
                  className="btn-primary"
                  onClick={handleCreateToken}
                  disabled={tokenCreating}
                >
                  {tokenCreating ? "Creating…" : freeToken ? "Create Free Token" : `Create Paid Token (${getPriceLabel()})`}
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}