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

  const formatCurrency = (cents: number, currency: string) => {
    const amount = cents / 100;
    if (currency === 'ngn') {
      return `₦${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    }
    return `$${amount.toFixed(2)}`;
  };

  if (isLoading) {
    return (
      <div className="admin-page">
        <div className="admin-loading">Loading payments…</div>
      </div>
    );
  }

  // Group by currency for display
  const ngnPayments = payments.filter(p => p.currency === 'ngn');
  const usdPayments = payments.filter(p => p.currency === 'usd');

  const ngnRevenue = ngnPayments.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0);
  const usdRevenue = usdPayments.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0);

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
          <div className="stat-value">{formatCurrency(ngnRevenue, 'ngn')}</div>
          <div className="stat-label">Total Revenue (NGN)</div>
          <div className="stat-sub">{ngnPayments.length} payment{ngnPayments.length === 1 ? '' : 's'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{formatCurrency(usdRevenue, 'usd')}</div>
          <div className="stat-label">Total Revenue (USD)</div>
          <div className="stat-sub">{usdPayments.length} payment{usdPayments.length === 1 ? '' : 's'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{payments.filter(p => p.status === 'pending').length}</div>
          <div className="stat-label">Pending</div>
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
                  <th>Currency</th>
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
                    <td>{formatCurrency(p.amount, p.currency)}</td>
                    <td>{p.currency.toUpperCase()}</td>
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