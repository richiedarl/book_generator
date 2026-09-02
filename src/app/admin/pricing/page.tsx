/**
 * Admin Pricing — manage token pricing and token creation settings.
 * Auth is handled by the parent admin layout.
 */

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface PricingConfig {
  purchaseTokenPriceCents: number;
  purchaseTokenUses: number;
  purchaseTokenExpiryDays: number;
}

export default function AdminPricingPage() {
  const [pricing, setPricing] = useState<PricingConfig>({
    purchaseTokenPriceCents: 4900,
    purchaseTokenUses: 20,
    purchaseTokenExpiryDays: 30,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadPricing();
  }, []);

  const loadPricing = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/pricing");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load pricing");
      }

      setPricing(data.pricing);
    } catch (err: any) {
      setError(err.message || "Failed to load pricing");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/admin/pricing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pricing),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save pricing");
      }

      setPricing(data.pricing);
      setSuccess("Pricing saved successfully");
    } catch (err: any) {
      setError(err.message || "Failed to save pricing");
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  if (isLoading) {
    return <div className="admin-page"><div className="admin-loading">Loading…</div></div>;
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>Pricing Management</h1>
        <p>Configure token pricing and generation settings.</p>
      </div>

      {error && <div className="admin-message error">{error}</div>}
      {success && <div className="admin-message success">{success}</div>}

      <section className="admin-section">
        <h2>Purchase Token Settings</h2>
        <p className="section-help">
          These settings control the price, generation capacity, and validity period
          of purchased tokens. Admins can also create tokens for free.
        </p>

        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="price">Token Price (USD)</label>
            <input
              type="number"
              id="price"
              min="0"
              step="1"
              value={pricing.purchaseTokenPriceCents}
              onChange={(e) => setPricing({ ...pricing, purchaseTokenPriceCents: parseInt(e.target.value, 10) || 0 })}
              className="currency-input"
            />
            <p className="form-hint">Current: {formatCurrency(pricing.purchaseTokenPriceCents)}</p>
          </div>

          <div className="form-group">
            <label htmlFor="uses">Generations Per Token</label>
            <input
              type="number"
              id="uses"
              min="1"
              max="1000"
              step="1"
              value={pricing.purchaseTokenUses}
              onChange={(e) => setPricing({ ...pricing, purchaseTokenUses: parseInt(e.target.value, 10) || 1 })}
            />
            <p className="form-hint">How many book generations each purchased token allows</p>
          </div>

          <div className="form-group">
            <label htmlFor="expiry">Token Expiry (Days)</label>
            <input
              type="number"
              id="expiry"
              min="1"
              max="365"
              step="1"
              value={pricing.purchaseTokenExpiryDays}
              onChange={(e) => setPricing({ ...pricing, purchaseTokenExpiryDays: parseInt(e.target.value, 10) || 1 })}
            />
            <p className="form-hint">Token validity period after purchase</p>
          </div>
        </div>

        <div className="form-actions">
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save Pricing"}
          </button>
        </div>
      </section>

      <section className="admin-section">
        <h2>Free Token Creation (Admin Only)</h2>
        <p className="section-help">
          Admins can generate tokens at no cost for testing, partnerships, or giveaways.
          These tokens use the same settings above but record no payment.
        </p>
        <Link href="/admin/tokens" className="btn-secondary">
          Go to Token Management →
        </Link>
      </section>

      <section className="admin-section">
        <h2>Current Configuration</h2>
        <div className="config-display">
          <div className="config-row">
            <span>Price</span>
            <strong>{formatCurrency(pricing.purchaseTokenPriceCents)}</strong>
          </div>
          <div className="config-row">
            <span>Generations per token</span>
            <strong>{pricing.purchaseTokenUses}</strong>
          </div>
          <div className="config-row">
            <span>Expiry</span>
            <strong>{pricing.purchaseTokenExpiryDays} days</strong>
          </div>
          <div className="config-row">
            <span>Cost per generation</span>
            <strong>{formatCurrency(Math.round(pricing.purchaseTokenPriceCents / pricing.purchaseTokenUses))}</strong>
          </div>
        </div>
      </section>
    </div>
  );
}