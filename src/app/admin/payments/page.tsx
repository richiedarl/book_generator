/**
 * Admin Payments — review all token-purchase payments.
 * Auth is handled by the parent admin layout.
 */

"use client";

import { useState, useEffect } from "react";

interface PaymentRecord {
  id: string;
  token: string | null;
  tokenType: string | null;
  userEmail: string | null;
  userId: string | null;
  amount: number;
  currency: string;
  status: string;
  provider: string | null;
  providerPaymentId: string | null;
  createdAt: number;
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [paymentCount, setPaymentCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/payments");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load payments");
      }

      setPayments(data.payments || []);
      setTotalRevenue(data.totalRevenue || 0);
      setPaymentCount(data.paymentCount || 0);
    } catch (err: any) {
      setError(err.message || "Failed to load payments");
    } finally {
      setIsLoading(false);
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

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  if (isLoading) {
    return (
      <div className="admin-page">
        <div className="admin-loading">Loading payments…</div>
      </div>
    );
  }

  const revenueDollars = (totalRevenue / 100).toFixed(2);
  const completedPayments = payments.filter(p => p.status === 'completed');
  const pendingPayments = payments.filter(p => p.status === 'pending');
  const failedPayments = payments.filter(p => p.status === 'failed');

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>Received Payments</h1>
        <p>All revenue from token purchases.</p>
      </div>

      {error && <div className="admin-message error">{error}</div>}

      {/* Summary cards */}
      <section className="dashboard-cards">
        <div className="stat-card">
          <div className="stat-value">${revenueDollars}</div>
          <div className="stat-label">Total Revenue</div>
          <div className="stat-sub">{paymentCount} payment{paymentCount === 1 ? '' : 's'} · {completedPayments.length} completed</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{pendingPayments.length}</div>
          <div className="stat-label">Pending</div>
          <div className="stat-sub">{formatCurrency(pendingPayments.reduce((sum, p) => sum + p.amount, 0))} USD equivalent</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{failedPayments.length}</div>
          <div className="stat-label">Failed</div>
          <div className="stat-sub">requires attention</div>
        </div>
      </section>

      {/* Payments table */}
      <section className="admin-section">
        <h2>Payment History</h2>
        {payments.length === 0 ? (
          <div className="empty-state">No payments recorded yet.</div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Provider</th>
                  <th>Token Type</th>
                  <th>User Email</th>
                  <th>Payment ID</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td>{formatDate(p.createdAt)}</td>
                    <td>{formatCurrency(p.amount)}</td>
                    <td>
                      <span className={`role-badge ${p.status === 'completed' ? 'admin' : p.status === 'pending' ? 'user' : ''} status-${p.status}`}>
                        {p.status}
                      </span>
                    </td>
                    <td>{p.provider || "—"}</td>
                    <td>{p.tokenType ? <span className="capitalize">{p.tokenType}</span> : "—"}</td>
                    <td>{p.userEmail || "—"}</td>
                    <td>
                      {p.providerPaymentId ? (
                        <code>{p.providerPaymentId.substring(0, 20)}…</code>
                      ) : (
                        <span className="no-token">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
