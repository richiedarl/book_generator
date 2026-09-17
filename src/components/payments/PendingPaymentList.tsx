/**
 * Submissions awaiting an administrator's decision.
 * Confirming issues the token and emails it; rejecting marks it unconfirmed.
 */

"use client";

import { AdminPaymentRecord } from "@/lib/payment-api";
import { formatAmount, formatDateTime } from "@/lib/format";

interface PendingPaymentListProps {
  payments: AdminPaymentRecord[];
  busyPaymentId: string | null;
  onConfirm: (payment: AdminPaymentRecord) => void;
  onReject: (payment: AdminPaymentRecord) => void;
}

export function PendingPaymentList({
  payments,
  busyPaymentId,
  onConfirm,
  onReject,
}: PendingPaymentListProps) {
  if (payments.length === 0) {
    return (
      <div className="empty-state">
        No payments are waiting for confirmation.
      </div>
    );
  }

  return (
    <div className="pending-list">
      {payments.map((payment) => {
        const isBusy = busyPaymentId === payment.id;

        return (
          <article className="pending-card" key={payment.id}>
            <div className="pending-main">
              <div className="pending-amount">
                {formatAmount(payment.amount, payment.currency)}
              </div>
              <div className="pending-meta">
                <div className="pending-email">{payment.payerName || "Name not provided"}</div>
                <div className="pending-email">{payment.email || "No email on record"}</div>
                <div className="pending-submitted">Submitted {formatDateTime(payment.createdAt)}</div>
                <div className="pending-reference">
                  Reference: <code>{payment.reference || "not provided"}</code>
                </div>
                {payment.notes && <p className="pending-notes">{payment.notes}</p>}
              </div>
            </div>

            <div className="pending-actions">
              <button
                type="button"
                className="btn-primary"
                onClick={() => onConfirm(payment)}
                disabled={isBusy}
              >
                {isBusy ? "Working…" : "Confirm payment"}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => onReject(payment)}
                disabled={isBusy}
              >
                Mark unconfirmed
              </button>
            </div>
          </article>
        );
      })}

      <style jsx>{`
        .pending-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .pending-card {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          flex-wrap: wrap;
          border: 1px solid var(--line);
          border-left: 3px solid var(--accent-gold);
          border-radius: 10px;
          padding: 18px 20px;
          background: var(--paper);
        }
        .pending-main {
          flex: 1 1 320px;
          min-width: 0;
        }
        .pending-amount {
          font-family: var(--display);
          font-size: 22px;
          color: var(--ink);
          margin-bottom: 6px;
        }
        .pending-meta {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .pending-email {
          font-size: 14px;
          font-weight: 500;
          color: var(--ink);
          overflow-wrap: anywhere;
        }
        .pending-submitted,
        .pending-reference {
          font-size: 13px;
          color: var(--text-muted);
        }
        .pending-reference code {
          font-family: var(--font-mono);
          font-size: 12px;
          color: var(--ink-soft);
          overflow-wrap: anywhere;
        }
        .pending-notes {
          margin: 8px 0 0;
          font-size: 13px;
          line-height: 1.6;
          color: var(--ink-soft);
          white-space: pre-wrap;
        }
        .pending-actions {
          display: flex;
          flex-direction: column;
          gap: 8px;
          flex: 0 0 auto;
        }
        @media (max-width: 640px) {
          .pending-actions {
            width: 100%;
          }
          .pending-actions :global(.btn-primary),
          .pending-actions :global(.btn-secondary) {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
