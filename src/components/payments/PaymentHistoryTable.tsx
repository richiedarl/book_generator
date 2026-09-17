/**
 * Full payment history with the per-row admin actions:
 * resend the token email, copy the issued token, reopen a rejected payment.
 */

"use client";

import { useState } from "react";
import { AdminPaymentRecord } from "@/lib/payment-api";
import { formatAmount, formatDateTime } from "@/lib/format";
import { PaymentStatusBadge } from "./PaymentStatusBadge";

interface PaymentHistoryTableProps {
  payments: AdminPaymentRecord[];
  busyPaymentId: string | null;
  onResendToken: (payment: AdminPaymentRecord) => void;
  onReopen: (payment: AdminPaymentRecord) => void;
}

export function PaymentHistoryTable({
  payments,
  busyPaymentId,
  onResendToken,
  onReopen,
}: PaymentHistoryTableProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyValue = async (payment: AdminPaymentRecord, field: "name" | "email" | "token") => {
    const value = field === "name" ? payment.payerName : field === "email" ? payment.email : payment.token;
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedId(`${payment.id}:${field}`);
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setCopiedId(null);
    }
  };

  if (payments.length === 0) {
    return <div className="empty-state">No payments recorded yet.</div>;
  }

  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            <th>Submitted</th>
            <th>Payer</th>
            <th>Amount</th>
            <th>Reference</th>
            <th>Status</th>
            <th>Token</th>
            <th>Delivery</th>
            <th>Confirmed by</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((payment) => {
            const isBusy = busyPaymentId === payment.id;
            const canResend = payment.status === "completed" && !!payment.token;

            return (
              <tr key={payment.id}>
                <td>{formatDateTime(payment.createdAt)}</td>
                <td className="cell-wrap">
                  <div>{payment.payerName || "—"}</div>
                  <div className="cell-sub">{payment.email || "—"}</div>
                  <div className="row-actions inline-actions">
                    {payment.payerName && <button type="button" className="btn-secondary btn-compact" onClick={() => copyValue(payment, "name")}>{copiedId === `${payment.id}:name` ? "Copied" : "Copy name"}</button>}
                    {payment.email && <button type="button" className="btn-secondary btn-compact" onClick={() => copyValue(payment, "email")}>{copiedId === `${payment.id}:email` ? "Copied" : "Copy email"}</button>}
                  </div>
                </td>
                <td>{formatAmount(payment.amount, payment.currency)}</td>
                <td className="cell-wrap">
                  {payment.reference ? <code>{payment.reference}</code> : "—"}
                </td>
                <td>
                  <PaymentStatusBadge status={payment.status} />
                </td>
                <td className="cell-wrap">
                  {payment.token ? <code>{payment.token}</code> : "—"}
                </td>
                <td>
                  {payment.tokenDeliveryStatus ? (
                    <PaymentStatusBadge status={payment.tokenDeliveryStatus} />
                  ) : (
                    "—"
                  )}
                </td>
                <td className="cell-wrap">
                  <div>{payment.confirmedBy || "—"}</div>
                  {payment.confirmedAt && (
                    <div className="cell-sub">{formatDateTime(payment.confirmedAt)}</div>
                  )}
                </td>
                <td>
                  <div className="row-actions">
                    {canResend && (
                      <>
                        <button
                          type="button"
                          className="btn-secondary btn-compact"
                          onClick={() => onResendToken(payment)}
                          disabled={isBusy}
                        >
                          {isBusy ? "Sending…" : "Resend token"}
                        </button>
                        <button
                          type="button"
                          className="btn-secondary btn-compact"
                          onClick={() => copyValue(payment, "token")}
                        >
                          {copiedId === `${payment.id}:token` ? "Copied" : "Copy token"}
                        </button>
                      </>
                    )}
                    {payment.status === "rejected" && (
                      <button
                        type="button"
                        className="btn-secondary btn-compact"
                        onClick={() => onReopen(payment)}
                        disabled={isBusy}
                      >
                        Reopen
                      </button>
                    )}
                    {payment.status === "pending" && (
                      <span className="row-hint">Awaiting confirmation</span>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <style jsx>{`
        .cell-wrap {
          overflow-wrap: anywhere;
        }
        .cell-wrap code {
          font-family: var(--font-mono);
          font-size: 12px;
        }
        .cell-sub {
          font-size: 12px;
          color: var(--text-muted);
          margin-top: 2px;
        }
        .row-actions {
          display: flex;
          flex-direction: column;
          gap: 6px;
          align-items: flex-start;
        }
        .inline-actions {
          flex-direction: row;
          flex-wrap: wrap;
          margin-top: 6px;
        }
        .row-hint {
          font-size: 12px;
          color: var(--text-muted);
        }
        .row-actions :global(.btn-compact) {
          padding: 6px 10px;
          font-size: 12px;
          white-space: nowrap;
        }
      `}</style>
    </div>
  );
}
