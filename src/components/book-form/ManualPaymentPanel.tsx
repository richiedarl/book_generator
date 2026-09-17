/**
 * Manual payment panel for the book form.
 *
 * Shows the business account the user must transfer to, lets them submit the
 * reference for admin confirmation, and surfaces the token once confirmed.
 * The account details come from the server so they are never hardcoded here.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { formatAmount, formatDateTime } from "@/lib/format";
import {
  fetchPublicPaymentConfig,
  fetchUserPayments,
  PublicPaymentConfig,
  submitManualPayment,
  UserPaymentRecord,
} from "@/lib/payment-api";

interface ManualPaymentPanelProps {
  accessToken: string;
  onAccessTokenChange: (token: string) => void;
  signedInEmail: string | null;
  signedInName?: string | null;
  tokenRequired?: boolean;
  disabled?: boolean;
}

type PanelStage = "details" | "submitting" | "awaiting";

export function ManualPaymentPanel({
  accessToken,
  onAccessTokenChange,
  signedInEmail,
  signedInName,
  tokenRequired = false,
  disabled,
}: ManualPaymentPanelProps) {
  const [config, setConfig] = useState<PublicPaymentConfig | null>(null);
  const [payments, setPayments] = useState<UserPaymentRecord[]>([]);
  const [stage, setStage] = useState<PanelStage>("details");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [name, setName] = useState(signedInName ?? "");
  const [email, setEmail] = useState(signedInEmail ?? "");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [freeTokenEmail, setFreeTokenEmail] = useState(signedInEmail ?? "");
  const [isRequestingFreeToken, setIsRequestingFreeToken] = useState(false);

  const refreshPayments = useCallback(async () => {
    if (!signedInEmail) return;
    try {
      const records = await fetchUserPayments();
      setPayments(records);
      if (records.some((record) => record.status === "pending")) setStage("awaiting");
    } catch {
      // Viewing history is optional; ignore failures here.
    }
  }, [signedInEmail]);

  useEffect(() => {
    fetchPublicPaymentConfig()
      .then(setConfig)
      .catch(() => setError("Payment details are unavailable right now."));
    refreshPayments();
  }, [refreshPayments]);

  const latestPayment = payments[0] ?? null;
  const confirmedPayment = payments.find((record) => record.token) ?? null;

  const handleFreeTokenRequest = async () => {
    const requestedEmail = (signedInEmail ?? freeTokenEmail).trim();
    if (!requestedEmail) {
      setError("Enter your email to receive one free generation token.");
      return;
    }

    setIsRequestingFreeToken(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/tokens/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: requestedEmail }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to issue a free token");
      onAccessTokenChange(result.token);
      setNotice("Your one free generation token is ready. It has been placed in the token field below.");
    } catch (err: any) {
      setError(err.message || "Unable to issue a free token");
    } finally {
      setIsRequestingFreeToken(false);
    }
  };

  const handleSubmit = async () => {
    if (!reference.trim()) {
      setError("Enter the payment reference from your transfer.");
      return;
    }

    if (!name.trim()) {
      setError("Enter your name so the payment can be identified.");
      return;
    }

    if (!email.trim()) {
      setError("Enter the email address the token should be sent to.");
      return;
    }

    setIsBusy(true);
    setError("");
    setNotice("");

    try {
      const result = await submitManualPayment({
        payerName: name.trim(),
        reference: reference.trim(),
        notes: notes.trim() || undefined,
        email: email.trim(),
      });
      setNotice(result.message);
      setStage("awaiting");
      await refreshPayments();
    } catch (err: any) {
      setError(err.message || "Failed to submit your payment");
    } finally {
      setIsBusy(false);
    }
  };

  if (!config) {
    return (
      <div className="payment-panel">
        <p className="payment-instructions">
          {error || "Loading payment details…"}
        </p>
      </div>
    );
  }

  return (
    <div className="payment-panel">
      <div className="payment-panel-head">
        <h3 className="payment-panel-title">{config.providerName}</h3>
        <div className="payment-amount">{formatAmount(config.amount, config.currency)}</div>
      </div>

      <dl className="payment-account">
        <div className="payment-row">
          <dt>Business name</dt>
          <dd>{config.businessName}</dd>
        </div>
        <div className="payment-row">
          <dt>Account number</dt>
          <dd className="mono-value">{config.accountNumber}</dd>
        </div>
        <div className="payment-row">
          <dt>Bank</dt>
          <dd>{config.bankName}</dd>
        </div>
        <div className="payment-row">
          <dt>You receive</dt>
          <dd>
            {config.tokenUses > 0 ? `${config.tokenUses} generations` : "Unlimited generations"},
            {" "}
            valid {config.tokenExpiryDays} days
          </dd>
        </div>
      </dl>

      <p className="payment-instructions">{config.instructions}</p>

      <div className="payment-actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() =>
            navigator.clipboard?.writeText(config.accountNumber).catch(() => {})
          }
          disabled={disabled}
        >
          Copy account number
        </button>
        {stage === "details" && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setStage("submitting")}
            disabled={disabled}
          >
            I have made this transfer
          </button>
        )}
      </div>

      {stage === "submitting" && (
        <div className="payment-reference-label">
          {!signedInName && (
            <div className="field">
              <label htmlFor="paymentName">Name</label>
              <input id="paymentName" type="text" placeholder="Your name" value={name} onChange={(event) => setName(event.target.value)} disabled={isBusy} />
            </div>
          )}

          {!signedInEmail && (
            <div className="field">
              <label htmlFor="paymentEmail">Email for your token</label>
              <input id="paymentEmail" type="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} disabled={isBusy} />
            </div>
          )}

          <div className="field">
            <label htmlFor="paymentReference">Payment reference</label>
            <input
              id="paymentReference"
              type="text"
              placeholder="e.g. the transaction ID or narration from your transfer"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              disabled={isBusy}
            />
          </div>

          <div className="field">
            <label htmlFor="paymentNotes">
              Anything else? <span className="hint">optional</span>
            </label>
            <textarea
              id="paymentNotes"
              rows={2}
              placeholder="e.g. transferred from a different account name"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              disabled={isBusy}
            />
          </div>

          <div className="payment-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={isBusy || disabled}
            >
              {isBusy ? "Submitting…" : "Submit payment"}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setStage("details")}
              disabled={isBusy}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {(notice || stage === "awaiting" || latestPayment) && (
        <div className={`payment-status ${latestPayment?.status ?? "pending"}`}>
          <strong>
            {latestPayment?.status === "completed"
              ? "Payment confirmed"
              : latestPayment?.status === "rejected"
                ? "Payment not confirmed"
                : "Awaiting confirmation"}
          </strong>

          {latestPayment ? (
            <>
              <div>
                Reference {latestPayment.reference ?? "—"} · submitted{" "}
                {formatDateTime(latestPayment.createdAt)}
              </div>
              {latestPayment.status === "pending" && (
                <div>
                  {config.emailDeliveryEnabled
                    ? "Your token will be emailed as soon as an administrator verifies the transfer."
                    : "An administrator will verify the transfer and provide your token."}
                </div>
              )}
              {latestPayment.status === "rejected" && (
                <div>
                  {latestPayment.rejectedReason ||
                    "The transfer could not be verified. Please check the reference and try again."}
                </div>
              )}
            </>
          ) : (
            <div>{notice}</div>
          )}

          {latestPayment?.status === "pending" && signedInEmail && (
            <div className="payment-token">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={refreshPayments}
              >
                Check status
              </button>
            </div>
          )}

          {confirmedPayment?.token && (
            <div className="payment-token">
              <code>{confirmedPayment.token}</code>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => onAccessTokenChange(confirmedPayment.token as string)}
              >
                Use this token
              </button>
            </div>
          )}
        </div>
      )}

      {error && <div className="error">{error}</div>}

      {tokenRequired && !accessToken && (
        <div className="free-token-panel">
          <h4>Start with one free book generation</h4>
          <p className="hint">Submit your email to receive a single-use token. No account or payment is required.</p>
          {!signedInEmail && (
            <input
              type="email"
              aria-label="Email for one free generation"
              placeholder="you@example.com"
              value={freeTokenEmail}
              onChange={(event) => setFreeTokenEmail(event.target.value)}
              disabled={isRequestingFreeToken || disabled}
            />
          )}
          <button type="button" className="btn btn-secondary" onClick={handleFreeTokenRequest} disabled={isRequestingFreeToken || disabled}>
            {isRequestingFreeToken ? "Requesting…" : "Get one free book generation"}
          </button>
        </div>
      )}

      <div className="field payment-reference-label">
        <label htmlFor="accessToken">
          Already have an access token?
        </label>
        <input
          id="accessToken"
          type="text"
          placeholder="sk-…"
          value={accessToken}
          onChange={(event) => onAccessTokenChange(event.target.value)}
          disabled={disabled}
        />
        <p className="hint">
          Paste a token if you received one by email, or leave this blank until your
          payment is confirmed.
        </p>
      </div>
    </div>
  );
}
