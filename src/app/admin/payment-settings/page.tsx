/**
 * Admin Payment Settings.
 *
 * Everything users see when paying is stored in the database and edited here,
 * so the business name, account number, bank and instructions can change
 * without a code change. Saving immediately updates the payment interface.
 */

"use client";

import { useEffect, useState } from "react";
import { formatAmount } from "@/lib/format";

interface PaymentConfig {
  businessName: string;
  accountNumber: string;
  bankName: string;
  providerName: string;
  instructions: string;
  amount: number;
  currency: "ngn" | "usd";
}

const EMPTY_CONFIG: PaymentConfig = {
  businessName: "",
  accountNumber: "",
  bankName: "",
  providerName: "",
  instructions: "",
  amount: 0,
  currency: "ngn",
};

export default function AdminPaymentSettingsPage() {
  const [config, setConfig] = useState<PaymentConfig>(EMPTY_CONFIG);
  const [amountInput, setAmountInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [emailDeliveryEnabled, setEmailDeliveryEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/payment-config");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to load payment settings");

      setConfig(data.payment);
      setAmountInput(String(data.payment.amount));
    } catch (err: any) {
      setError(err.message || "Failed to load payment settings");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetch("/api/payment-config")
      .then((response) => response.json())
      .then((data) => setEmailDeliveryEnabled(!!data.payment?.emailDeliveryEnabled))
      .catch(() => setEmailDeliveryEnabled(null));
  }, []);

  const handleSave = async () => {
    const amount = Number.parseFloat(amountInput);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a valid amount greater than zero.");
      return;
    }

    setIsSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/admin/payment-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...config, amount }),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Failed to save payment settings");

      setConfig(data.payment);
      setAmountInput(String(data.payment.amount));
      setSuccess("Payment settings saved. Users will see the new details immediately.");
    } catch (err: any) {
      setError(err.message || "Failed to save payment settings");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="admin-page">
        <div className="admin-loading">Loading payment settings…</div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>Payment Settings</h1>
        <p>
          The account users pay into. Changes here appear in the payment interface
          immediately — no code change or redeploy required.
        </p>
      </div>

      {error && <div className="admin-message error">{error}</div>}
      {success && <div className="admin-message success">{success}</div>}

      <section className="admin-section">
        <h2>Business Account Details</h2>
        <p className="section-help">
          Users are shown these details and asked to make a bank transfer, then submit
          their payment reference for confirmation.
        </p>

        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="businessName">Business Name</label>
            <input
              id="businessName"
              type="text"
              value={config.businessName}
              onChange={(event) => setConfig({ ...config, businessName: event.target.value })}
              placeholder="e.g. SALESECO AFRICA LIMITED"
            />
          </div>

          <div className="form-group">
            <label htmlFor="accountNumber">Account Number</label>
            <input
              id="accountNumber"
              type="text"
              inputMode="numeric"
              value={config.accountNumber}
              onChange={(event) => setConfig({ ...config, accountNumber: event.target.value })}
              placeholder="e.g. 6611477366"
              style={{ fontFamily: "var(--font-mono)" }}
            />
          </div>

          <div className="form-group">
            <label htmlFor="bankName">Bank / Payment Provider</label>
            <input
              id="bankName"
              type="text"
              value={config.bankName}
              onChange={(event) => setConfig({ ...config, bankName: event.target.value })}
              placeholder="e.g. Moniepoint"
            />
          </div>

          <div className="form-group">
            <label htmlFor="providerName">Transfer Method Label</label>
            <input
              id="providerName"
              type="text"
              value={config.providerName}
              onChange={(event) => setConfig({ ...config, providerName: event.target.value })}
              placeholder="e.g. Manual bank transfer"
            />
            <p className="form-hint">Shown as the heading above the account details.</p>
          </div>

          <div className="form-group">
            <label htmlFor="amount">Amount to Transfer</label>
            <div className="currency-input-wrapper">
              <select
                id="currency"
                value={config.currency}
                onChange={(event) =>
                  setConfig({ ...config, currency: event.target.value as "ngn" | "usd" })
                }
                aria-label="Currency"
              >
                <option value="ngn">NGN</option>
                <option value="usd">USD</option>
              </select>
              <input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                className="currency-input"
                value={amountInput}
                onChange={(event) => setAmountInput(event.target.value)}
              />
            </div>
            <p className="form-hint">
              Currently shown to users as {formatAmount(config.amount, config.currency)}.
            </p>
          </div>

          <div className="form-group form-group-wide">
            <label htmlFor="instructions">Payment Instructions</label>
            <textarea
              id="instructions"
              rows={3}
              value={config.instructions}
              onChange={(event) => setConfig({ ...config, instructions: event.target.value })}
            />
            <p className="form-hint">
              Tell the user exactly what to do. Keep it short — this is shown in the payment panel.
            </p>
          </div>
        </div>

        <div className="form-actions">
          <button className="btn-primary" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving…" : "Save Payment Settings"}
          </button>
        </div>
      </section>

      <section className="admin-section">
        <h2>Email Delivery</h2>
        <p className="section-help">
          When a payment is confirmed the user's token is emailed automatically.
        </p>
        {emailDeliveryEnabled === null ? (
          <p className="section-help">Checking email configuration…</p>
        ) : emailDeliveryEnabled ? (
          <div className="admin-message success">
            Email delivery is configured. Tokens are emailed to users automatically after
            an administrator confirms their payment.
          </div>
        ) : (
          <div className="admin-message error">
            No email transport is configured, so tokens cannot be emailed automatically.
            Set SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS (or RESEND_API_KEY) in the
            environment. Until then, confirmed tokens are marked for manual delivery and
            you can copy the token from the Payments screen.
          </div>
        )}
      </section>

      <section className="admin-section">
        <h2>What Users See</h2>
        <p className="section-help">A preview of the payment panel shown in the book form.</p>

        <div className="preview-panel">
          <div className="preview-label">{config.providerName || "Manual bank transfer"}</div>
          <div className="preview-amount">{formatAmount(config.amount, config.currency)}</div>

          <dl className="preview-rows">
            <div className="preview-row">
              <dt>Business name</dt>
              <dd>{config.businessName || "—"}</dd>
            </div>
            <div className="preview-row">
              <dt>Account number</dt>
              <dd className="mono-value">{config.accountNumber || "—"}</dd>
            </div>
            <div className="preview-row">
              <dt>Bank</dt>
              <dd>{config.bankName || "—"}</dd>
            </div>
          </dl>

          {config.instructions && <p className="preview-instructions">{config.instructions}</p>}
        </div>
      </section>

      <style jsx>{`
        .form-group-wide {
          grid-column: 1 / -1;
        }
        .currency-input-wrapper {
          display: flex;
          gap: 8px;
        }
        .currency-input-wrapper select {
          flex: 0 0 110px;
          width: 110px;
          min-width: 0;
        }
        .currency-input-wrapper .currency-input {
          flex: 1 1 auto;
          width: auto;
          min-width: 0;
        }
        .preview-panel {
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 20px 22px;
          background: var(--paper);
        }
        .preview-label {
          font-family: var(--font-mono);
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--text-muted);
        }
        .preview-amount {
          font-family: var(--display);
          font-size: 28px;
          color: var(--ink);
          margin: 6px 0 16px;
        }
        .preview-rows {
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .preview-row {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          border-bottom: 1px dashed var(--line);
          padding-bottom: 8px;
        }
        .preview-row dt {
          font-size: 13px;
          color: var(--text-muted);
        }
        .preview-row dd {
          margin: 0;
          font-size: 14px;
          color: var(--ink);
          font-weight: 500;
          text-align: right;
        }
        .mono-value {
          font-family: var(--font-mono);
          letter-spacing: 0.04em;
        }
        .preview-instructions {
          margin: 16px 0 0;
          font-size: 13px;
          line-height: 1.6;
          color: var(--ink-soft);
        }
        @media (max-width: 640px) {
          .preview-row {
            flex-direction: column;
            gap: 2px;
          }
          .preview-row dd {
            text-align: left;
          }
        }
      `}</style>
    </div>
  );
}
