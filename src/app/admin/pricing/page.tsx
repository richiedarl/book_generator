/**
 * Admin Pricing — manage token pricing, currency, and Paystack payment settings.
 * Auth is handled by the parent admin layout.
 */

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface PricingConfig {
  purchaseTokenPriceCents: number;
  purchaseTokenCurrency: 'ngn' | 'usd';
  purchaseTokenUses: number; // 0 or negative = infinite
  purchaseTokenExpiryDays: number;
  paystackSecretKey: string;
  paystackPublicKey: string;
  paystackWebhookSecret: string;
  paymentProvider: 'paystack' | 'none';
}

export default function AdminPricingPage() {
  const [pricing, setPricing] = useState<PricingConfig>({
    purchaseTokenPriceCents: 4900,
    purchaseTokenCurrency: 'ngn',
    purchaseTokenUses: 20,
    purchaseTokenExpiryDays: 30,
    paystackSecretKey: '',
    paystackPublicKey: '',
    paystackWebhookSecret: '',
    paymentProvider: 'none',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [priceAmount, setPriceAmount] = useState("49.00");

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
  setPriceAmount((data.pricing.purchaseTokenPriceCents / 100).toFixed(2));
    } catch (err: any) {
      setError(err.message || "Failed to load pricing");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    const amount = Number.parseFloat(priceAmount);
    if (!Number.isFinite(amount) || amount < 0) {
      setError("Enter a valid token price.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/admin/pricing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...pricing,
          purchaseTokenPriceCents: Math.round(amount * 100),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save pricing");
      }

      setPricing(data.pricing);
  setPriceAmount((data.pricing.purchaseTokenPriceCents / 100).toFixed(2));
      setSuccess("Pricing saved successfully");
    } catch (err: any) {
      setError(err.message || "Failed to save pricing");
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (cents: number, currency: 'ngn' | 'usd') => {
    const amount = cents / 100;
    if (currency === 'ngn') {
      return `₦${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    }
    return `$${amount.toFixed(2)}`;
  };

  const isInfiniteUses = () => pricing.purchaseTokenUses <= 0;
  const getUsesDisplay = () => isInfiniteUses() ? '∞ Unlimited' : pricing.purchaseTokenUses.toString();
  const getCostPerGeneration = () => {
    if (isInfiniteUses()) return '∞';
    if (pricing.purchaseTokenUses === 0) return '—';
    return formatCurrency(Math.round(pricing.purchaseTokenPriceCents / pricing.purchaseTokenUses), pricing.purchaseTokenCurrency);
  };

  if (isLoading) {
    return <div className="admin-page"><div className="admin-loading">Loading…</div></div>;
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>Pricing Management</h1>
        <p>Configure token pricing, currency, generation capacity, and payment settings.</p>
      </div>

      {error && <div className="admin-message error">{error}</div>}
      {success && <div className="admin-message success">{success}</div>}

      <section className="admin-section">
        <h2>Purchase Token Settings</h2>
        <p className="section-help">
          These settings control the price, currency, generation capacity, and validity period
          of purchased tokens. NGN is the primary currency; USD is available as an alternative.
          Set generations to 0 or negative for unlimited usage — the token still expires after the
          expiry period but allows unlimited generations within that window.
        </p>

        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="price">Token Price</label>
            <div className="currency-input-wrapper">
              <select
                id="currency"
                value={pricing.purchaseTokenCurrency}
                onChange={(e) => setPricing({ ...pricing, purchaseTokenCurrency: e.target.value as 'ngn' | 'usd' })}
              >
                <option value="ngn">₦ NGN (Primary)</option>
                <option value="usd">$ USD (Alternative)</option>
              </select>
              <input
                type="number"
                id="price"
                min="0"
                step="0.01"
                value={priceAmount}
                onChange={(e) => setPriceAmount(e.target.value)}
                className="currency-input"
                aria-label={`Token price in ${pricing.purchaseTokenCurrency === 'ngn' ? 'Naira' : 'US dollars'}`}
              />
            </div>
            <p className="form-hint">
              Enter the token price in {pricing.purchaseTokenCurrency === 'ngn' ? 'Naira' : 'US dollars'}.
              Current: {formatCurrency(pricing.purchaseTokenPriceCents, pricing.purchaseTokenCurrency)}
            </p>
          </div>

          <div className="form-group">
            <label htmlFor="uses">Generations Per Token</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="number"
                id="uses"
                min="-1"
                max="10000"
                step="1"
                value={pricing.purchaseTokenUses}
                onChange={(e) => setPricing({ ...pricing, purchaseTokenUses: parseInt(e.target.value, 10) || 0 })}
                style={{ flex: 1 }}
              />
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>0 = ∞</span>
            </div>
            <p className="form-hint">
              How many book generations each purchased token allows.
              Set to 0 for unlimited generations — the token still expires after the validity period.
            </p>
          </div>

          <div className="form-group">
            <label htmlFor="expiry">Token Expiry (Days)</label>
            <input
              type="number"
              id="expiry"
              min="1"
              max="3650"
              step="1"
              value={pricing.purchaseTokenExpiryDays}
              onChange={(e) => setPricing({ ...pricing, purchaseTokenExpiryDays: parseInt(e.target.value, 10) || 1 })}
            />
            <p className="form-hint">Token validity period after purchase. Unlimited-usage tokens still expire after this period.</p>
          </div>
        </div>

        <div className="form-actions">
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save Pricing"}
          </button>
        </div>
      </section>

      {/* Paystack Configuration */}
      <section className="admin-section">
        <h2>Payment Provider: Paystack</h2>
        <p className="section-help">
          Configure Paystack to allow users to pay for tokens. Set the payment provider to
          "paystack" and provide your Paystack secret key. When set to "none", only admins
          can create free tokens.
        </p>

        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="provider">Payment Provider</label>
            <select
              id="provider"
              value={pricing.paymentProvider}
              onChange={(e) => setPricing({ ...pricing, paymentProvider: e.target.value as 'paystack' | 'none' })}
            >
              <option value="none">None (Admin Free Tokens Only)</option>
              <option value="paystack">Paystack</option>
            </select>
            <p className="form-hint">Users can only pay for tokens when a payment provider is configured.</p>
          </div>

          {pricing.paymentProvider === 'paystack' && (
            <>
              <div className="form-group">
                <label htmlFor="secretKey">Secret Key</label>
                <input
                  type="password"
                  id="secretKey"
                  placeholder="sk_live_..."
                  value={showSecretKey ? pricing.paystackSecretKey : ''}
                  onChange={(e) => setPricing({ ...pricing, paystackSecretKey: e.target.value })}
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}
                />
                <div className="form-hint-row">
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={showSecretKey}
                      onChange={(e) => setShowSecretKey(e.target.checked)}
                    />
                    Show secret key
                  </label>
                </div>
                <p className="form-hint">Your Paystack secret key from the Paystack dashboard.</p>
              </div>

              <div className="form-group">
                <label htmlFor="publicKey">Public Key</label>
                <input
                  type="text"
                  id="publicKey"
                  placeholder="pk_live_..."
                  value={pricing.paystackPublicKey}
                  onChange={(e) => setPricing({ ...pricing, paystackPublicKey: e.target.value })}
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}
                />
                <p className="form-hint">Your Paystack public key from the Paystack dashboard.</p>
              </div>

              <div className="form-group">
                <label htmlFor="webhookSecret">Webhook Secret</label>
                <input
                  type="password"
                  id="webhookSecret"
                  placeholder="whsec_..."
                  value={pricing.paystackWebhookSecret}
                  onChange={(e) => setPricing({ ...pricing, paystackWebhookSecret: e.target.value })}
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}
                />
                <p className="form-hint">Webhook secret for verifying Paystack payment callbacks.</p>
              </div>
            </>
          )}
        </div>

        <div className="form-actions">
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save Payment Settings"}
          </button>
        </div>

        {pricing.paymentProvider !== 'paystack' && (
          <div className="admin-message error" style={{ marginTop: '16px' }}>
            ⚠️ Payment provider is not configured. Paid tokens cannot be created until a provider is set up. Admins can still create free tokens.
          </div>
        )}
      </section>

      {/* Free Token Creation */}
      <section className="admin-section">
        <h2>Free Token Creation (Admin Only)</h2>
        <p className="section-help">
          Admins can generate tokens at no cost for testing, partnerships, or giveaways.
          These tokens use the same token settings (uses, expiry) but record no payment.
        </p>
        <Link href="/admin/tokens" className="btn-secondary">
          Go to Token Management →
        </Link>
      </section>

      {/* Config display */}
      <section className="admin-section">
        <h2>Current Configuration</h2>
        <div className="config-display">
          <div className="config-row">
            <span>Price</span>
            <strong>{formatCurrency(pricing.purchaseTokenPriceCents, pricing.purchaseTokenCurrency)}</strong>
          </div>
          <div className="config-row">
            <span>Generations per token</span>
            <strong>{getUsesDisplay()}</strong>
          </div>
          <div className="config-row">
            <span>Expiry</span>
            <strong>{pricing.purchaseTokenExpiryDays} days</strong>
          </div>
          <div className="config-row">
            <span>Payment provider</span>
            <strong>{pricing.paymentProvider === 'paystack' ? 'Paystack' : 'None'}</strong>
          </div>
          <div className="config-row">
            <span>Cost per generation</span>
            <strong>{getCostPerGeneration()}</strong>
          </div>
        </div>
      </section>

      <style jsx>{`
        .currency-input-wrapper {
          display: flex;
          gap: 8px;
        }
        .currency-input-wrapper select {
          flex: 0 0 170px;
          width: 170px;
          min-width: 0;
        }
        .currency-input-wrapper .currency-input {
          flex: 1 1 auto;
          width: auto;
          min-width: 0;
        }
        .form-hint-row {
          display: flex;
          align-items: center;
          margin-top: 8px;
        }
        @media (max-width: 640px) {
          .currency-input-wrapper select {
            flex-basis: 145px;
            width: 145px;
          }
        }
      `}</style>
    </div>
  );
}
