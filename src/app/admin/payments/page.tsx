/**
 * Admin Payments.
 *
 * The manual transfer confirmation workflow: review pending submissions,
 * confirm them (which issues and emails a token), reject them, resend a token
 * email, or reopen a rejected submission.
 */

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AdminPaymentRecord,
  AdminPaymentSummary,
  fetchAdminPayments,
  runPaymentAction,
} from "@/lib/payment-api";
import { formatAmount } from "@/lib/format";
import { PendingPaymentList } from "@/components/payments/PendingPaymentList";
import { PaymentHistoryTable } from "@/components/payments/PaymentHistoryTable";

const EMPTY_SUMMARY: AdminPaymentSummary = {
  total: 0,
  pending: 0,
  confirmed: 0,
  rejected: 0,
  deliveredTokens: 0,
  undeliveredTokens: 0,
  revenueByCurrency: {},
};

type FilterKey = "all" | "pending" | "confirmed" | "rejected";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "rejected", label: "Rejected" },
];

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<AdminPaymentRecord[]>([]);
  const [summary, setSummary] = useState<AdminPaymentSummary>(EMPTY_SUMMARY);
  const [isLoading, setIsLoading] = useState(true);
  const [busyPaymentId, setBusyPaymentId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");

  const loadPayments = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await fetchAdminPayments();
      setPayments(data.payments);
      setSummary(data.summary);
    } catch (err: any) {
      setError(err.message || "Failed to load payments");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const sendAction = useCallback(
    async (payment: AdminPaymentRecord, action: "confirm" | "reject" | "deliver-token" | "reopen") => {
      if (action === "confirm" || action === "reject") {
        const verb = action === "confirm" ? "Confirm" : "Mark as unconfirmed";
        const detail =
          action === "confirm"
            ? "A token will be issued and emailed to this user immediately."
            : "No token will be issued for this payment.";
        if (!window.confirm(`${verb} the payment of ${formatAmount(payment.amount, payment.currency)} from ${payment.email}?\n\n${detail}`)) {
          return;
        }
      }

      setBusyPaymentId(payment.id);
      setError("");
      setNotice("");

      try {
        const result = await runPaymentAction(action, payment.id);
        setNotice(result.message);
        if (result.deliveryError) {
          setError(result.deliveryError);
        }
        await loadPayments();
      } catch (err: any) {
        setError(err.message || "The payment action failed");
      } finally {
        setBusyPaymentId(null);
      }
    },
    [loadPayments]
  );

  const pendingPayments = useMemo(
    () => payments.filter((payment) => payment.status === "pending"),
    [payments]
  );

  const filteredPayments = useMemo(() => {
    if (filter === "all") return payments;
    if (filter === "confirmed") {
      return payments.filter((payment) => payment.status === "completed");
    }
    return payments.filter((payment) => payment.status === filter);
  }, [payments, filter]);

  const revenueEntries = Object.entries(summary.revenueByCurrency);

  if (isLoading) {
    return (
      <div className="admin-page">
        <div className="admin-loading">Loading payments…</div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>Payments</h1>
        <p>
          Verify bank transfers, then confirm them to issue and email the user's token.
        </p>
      </div>

      {error && <div className="admin-message error">{error}</div>}
      {notice && <div className="admin-message success">{notice}</div>}

      <section className="dashboard-cards">
        <div className="stat-card">
          <div className="stat-value">{summary.pending}</div>
          <div className="stat-label">Awaiting Confirmation</div>
          <div className="stat-sub">needs a decision</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{summary.confirmed}</div>
          <div className="stat-label">Confirmed Payments</div>
          <div className="stat-sub">tokens issued</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{summary.undeliveredTokens}</div>
          <div className="stat-label">Tokens Not Delivered</div>
          <div className="stat-sub">{summary.deliveredTokens} delivered by email</div>
        </div>
        {revenueEntries.length === 0 ? (
          <div className="stat-card">
            <div className="stat-value">{formatAmount(0, "ngn")}</div>
            <div className="stat-label">Confirmed Revenue</div>
            <div className="stat-sub">no confirmed payments yet</div>
          </div>
        ) : (
          revenueEntries.map(([currency, amount]) => (
            <div className="stat-card" key={currency}>
              <div className="stat-value">{formatAmount(amount, currency)}</div>
              <div className="stat-label">Confirmed Revenue</div>
              <div className="stat-sub">{currency.toUpperCase()}</div>
            </div>
          ))
        )}
      </section>

      <section className="admin-section">
        <div className="section-head">
          <h2>Pending Submissions</h2>
          <Link href="/admin/payment-settings" className="section-link">
            Edit payment details
          </Link>
        </div>
        <p className="section-help">
          Confirm only after the transfer has arrived in the business account.
        </p>
        <PendingPaymentList
          payments={pendingPayments}
          busyPaymentId={busyPaymentId}
          onConfirm={(payment) => sendAction(payment, "confirm")}
          onReject={(payment) => sendAction(payment, "reject")}
        />
      </section>

      <section className="admin-section">
        <div className="section-head">
          <h2>Payment History</h2>
          <div className="filter-row">
            {FILTERS.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`filter-chip ${filter === item.key ? "active" : ""}`}
                onClick={() => setFilter(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {summary.undeliveredTokens > 0 && (
          <p className="section-help">
            {summary.undeliveredTokens} confirmed payment
            {summary.undeliveredTokens === 1 ? " has" : "s have"} a token that was not
            delivered by email. Use <strong>Resend token</strong>, or copy the token and
            send it to the user yourself.
          </p>
        )}

        <PaymentHistoryTable
          payments={filteredPayments}
          busyPaymentId={busyPaymentId}
          onResendToken={(payment) => sendAction(payment, "deliver-token")}
          onReopen={(payment) => sendAction(payment, "reopen")}
        />
      </section>

      <section className="admin-section">
        <h2>Account Details Shown to Users</h2>
        <PaymentAccountPreview />
      </section>

      <style jsx>{`
        .section-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }
        .section-head h2 {
          margin: 0;
        }
        .section-link {
          font-size: 13px;
          color: var(--accent-olive);
          text-decoration: none;
        }
        .section-link:hover {
          text-decoration: underline;
        }
        .filter-row {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .filter-chip {
          border: 1px solid var(--line);
          background: transparent;
          color: var(--text-muted);
          border-radius: 999px;
          padding: 5px 14px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .filter-chip:hover {
          border-color: var(--ink);
          color: var(--ink);
        }
        .filter-chip.active {
          background: var(--ink);
          border-color: var(--ink);
          color: var(--bg-cream);
        }
      `}</style>
    </div>
  );
}

/** Read-only confirmation of exactly what users are told to pay. */
function PaymentAccountPreview() {
  const [account, setAccount] = useState<{
    businessName: string;
    accountNumber: string;
    bankName: string;
    amount: number;
    currency: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/admin/payment-config")
      .then((response) => response.json())
      .then((data) => {
        if (data.payment) setAccount(data.payment);
      })
      .catch(() => setAccount(null));
  }, []);

  if (!account) {
    return <p className="section-help">Loading account details…</p>;
  }

  return (
    <div className="config-display">
      <div className="config-row">
        <span>Business name</span>
        <strong>{account.businessName}</strong>
      </div>
      <div className="config-row">
        <span>Account number</span>
        <strong>{account.accountNumber}</strong>
      </div>
      <div className="config-row">
        <span>Bank</span>
        <strong>{account.bankName}</strong>
      </div>
      <div className="config-row">
        <span>Amount</span>
        <strong>{formatAmount(account.amount, account.currency)}</strong>
      </div>
    </div>
  );
}
