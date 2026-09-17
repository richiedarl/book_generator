/**
 * Admin Pricing — token price, currency, generation capacity and expiry.
 * The business account that receives transfers lives under Payment Settings.
 */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatMinorUnits } from "@/lib/format";

interface PricingConfig {
  purchaseTokenPriceCents: number;
  purchaseTokenCurrency: "ngn" | "usd";
  purchaseTokenUses: number; // 0 or negative = unlimited
  purchaseTokenExpiryDays: number;
}

const DEFAULT_PRICING: PricingConfig = {
  purchaseTokenPriceCents: 4900,
  purchaseTokenCurrency: "ngn",
  purchaseTokenUses: 20,
  purchaseTokenExpiryDays: 30,
};

export default function AdminPricingPage() {
  const [pricing, setPricing] = useState<PricingConfig>(DEFAULT_PRICING);
  const [priceAmount, setPriceAmount] = useState("49.00");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
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
      if (!response.ok) throw new Error(data.error || "Failed to load pricing");

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

    setIsSaving(true);
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
      if (!response.ok) throw new Error(data.error || "Failed to save pricing");

      setPricing(data.pricing);
      setPriceAmount((data.pricing.purchaseTokenPriceCents / 100).toFixed(2));
      setSuccess("Pricing saved successfully.");
    } catch (err: any) {
      setError(err.message || "Failed to save pricing");
    } finally {
      setIsSaving(false);
    }
  };

  const isInfiniteUses = pricing.purchaseTokenUses <= 0;
  const usesDisplay = isInfiniteUses ? "Unlimited" : String(pricing.purchaseTokenUses);
  const costPerGeneration = () => {
    if (isInfiniteUses) return "—";
    return formatMinorUnits(
      Math.round(pricing.purchaseTokenPriceCents / pricing.purchaseTokenUses),
      pricing.purchaseTokenCurrency
    );
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
        <h1>Pricing</h1>
        <p>What a token costs and how much it grants.</p>
      </div>

      {error && <div className="admin-message error">{error}</div>}
      {success && <div className="admin-message success">{success}</div>}

      <section className="admin-section">
        <h2>Purchase Token Settings</h2>
        <p className="section-help">
          These settings apply when an administrator confirms a manual payment:
          the confirmed token is issued with the generation count and validity period below.
          Set generations to 0 or negative for unlimited usage — the token still expires
          after the validity period.
        </p>

        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="price">Token Price</label>
            <div className="currency-input-wrapper">
              <select
                id="currency"
                value={pricing.purchaseTokenCurrency}
                onChange={(event) =>
                  setPricing({
                    ...pricing,
                    purchaseTokenCurrency: event.target.value as "ngn" | "usd",
                  })
                }
              >
                <option value="ngn">₦ NGN (Primary)</option>
                <option value="usd">$ USD (Alternative)</option>
              </select>
              <input
                id="price"
                type="number"
                min="0"
                step="0.01"
                className="currency-input"
                value={priceAmount}
                onChange={(event) => setPriceAmount(event.target.value)}
                aria-label="Token price"
              />
            </div>
            <p className="form-hint">
              Shown to users as{" "}
              {formatMinorUnits(pricing.purchaseTokenPriceCents, pricing.purchaseTokenCurrency)}.
              The exact figure users transfer is set in{" "}
              <Link href="/admin/payment-settings">Payment Settings</Link>.
            </p>
          </div>

          <div className="form-group">
            <label htmlFor="uses">Generations Per Token</label>
            <div className="uses-row">
              <input
                id="uses"
                type="number"
                min="-1"
                max="10000"
                step="1"
                value={pricing.purchaseTokenUses}
                onChange={(event) =>
                  setPricing({
                    ...pricing,
                    purchaseTokenUses: Number.parseInt(event.target.value, 10) || 0,
                  })
                }
              />
              <span className="uses-hint">0 = unlimited</span>
            </div>
            <p className="form-hint">
              How many book generations each confirmed token allows.
            </p>
          </div>

          <div className="form-group">
            <label htmlFor="expiry">Token Expiry (Days)</label>
            <input
              id="expiry"
              type="number"
              min="1"
              max="3650"
              step="1"
              value={pricing.purchaseTokenExpiryDays}
              onChange={(event) =>
                setPricing({
                  ...pricing,
                  purchaseTokenExpiryDays: Number.parseInt(event.target.value, 10) || 1,
                })
              }
            />
            <p className="form-hint">
              Validity period after confirmation. Unlimited tokens still expire after this.
            </p>
          </div>
        </div>

        <div className="form-actions">
          <button className="btn-primary" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving…" : "Save Pricing"}
          </button>
        </div>
      </section>

      <section className="admin-section">
        <h2>Payment Account</h2>
        <p className="section-help">
          The business name, account number, bank and instructions users are shown are
          managed under Payment Settings. Users transfer directly to that account and an
          administrator confirms each payment from the Payments screen.
        </p>
        <Link href="/admin/payment-settings" className="btn-secondary">
          Open Payment Settings →
        </Link>
      </section>

      <section className="admin-section">
        <h2>Current Configuration</h2>
        <div className="config-display">
          <div className="config-row">
            <span>Price</span>
            <strong>
              {formatMinorUnits(pricing.purchaseTokenPriceCents, pricing.purchaseTokenCurrency)}
            </strong>
          </div>
          <div className="config-row">
            <span>Generations per token</span>
            <strong>{usesDisplay}</strong>
          </div>
          <div className="config-row">
            <span>Expiry</span>
            <strong>{pricing.purchaseTokenExpiryDays} days</strong>
          </div>
          <div className="config-row">
            <span>Cost per generation</span>
            <strong>{costPerGeneration()}</strong>
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
        .uses-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .uses-row input {
          flex: 1;
          min-width: 0;
        }
        .uses-hint {
          font-size: 13px;
          color: var(--text-muted);
          white-space: nowrap;
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
