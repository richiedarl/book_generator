/**
 * Admin Dashboard — overview of key metrics and quick links.
 * Auth is handled by the parent layout; this page assumes admin access.
 */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface AccessTokenInfo {
  id: string;
  token: string;
  type: 'purchase' | 'email';
  email: string | null;
  max_uses: number;
  used_count: number;
  expires_at: number | null;
  created_at: number;
}

interface User {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
  createdAt: number;
}

interface PaymentSummary {
  payments: any[];
  totalRevenue: number;
  paymentCount: number;
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function AdminDashboardPage() {
  const [tokens, setTokens] = useState<AccessTokenInfo[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [payments, setPayments] = useState<PaymentSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setIsLoading(true);
    setError("");
    try {
      const [tokensRes, usersRes, paymentsRes] = await Promise.all([
        fetch("/api/tokens/purchase"),
        fetch("/api/admin/users"),
        fetch("/api/admin/payments"),
      ]);

      const tData = await tokensRes.json();
      const uData = await usersRes.json();
      const pData = await paymentsRes.json();

      if (!tokensRes.ok) throw new Error(tData.error || "Failed to load tokens");
      if (!usersRes.ok) throw new Error(uData.error || "Failed to load users");
      if (!paymentsRes.ok) throw new Error(pData.error || "Failed to load payments");

      setTokens(tData.tokens || []);
      setUsers(uData.users || []);
      setPayments({
        payments: pData.payments || [],
        totalRevenue: pData.totalRevenue || 0,
        paymentCount: pData.paymentCount || 0,
      });
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return <div className="admin-dashboard"><div className="admin-loading">Loading dashboard…</div></div>;
  }

  const admins = users.filter(u => u.isAdmin);
  const regularUsers = users.filter(u => !u.isAdmin);
  const totalTokenUses = tokens.reduce((sum, t) => sum + t.used_count, 0);
  const totalTokenCapacity = tokens.reduce((sum, t) => sum + t.max_uses, 0);
  const activeTokens = tokens.filter(t => {
    const usesLeft = t.max_uses - t.used_count;
    const notExpired = t.expires_at ? Date.now() < t.expires_at : true;
    return usesLeft > 0 && notExpired;
  });

  const revenueDollars = payments ? (payments.totalRevenue / 100).toFixed(2) : "0.00";
  const tokenTypeCount = (type: string) => tokens.filter(t => t.type === type).length;

  return (
    <div className="admin-dashboard">
      {error && <div className="admin-message error">{error}</div>}

      {/* Overview cards */}
      <section className="dashboard-cards">
        <div className="stat-card">
          <div className="stat-value">{users.length}</div>
          <div className="stat-label">Total Users</div>
          <div className="stat-sub">{admins.length} admin{admins.length !== 1 ? 's' : ''} · {regularUsers.length} standard</div>
        </div>

        <div className="stat-card">
          <div className="stat-value">${revenueDollars}</div>
          <div className="stat-label">Revenue Earned</div>
          <div className="stat-sub">{payments?.paymentCount || 0} payment{payments?.paymentCount === 1 ? '' : 's'} (USD)</div>
        </div>

        <div className="stat-card">
          <div className="stat-value">{activeTokens.length}</div>
          <div className="stat-label">Active Tokens</div>
          <div className="stat-sub">{tokenTypeCount('purchase')} purchased · {tokenTypeCount('email')} email</div>
        </div>

        <div className="stat-card">
          <div className="stat-value">{totalTokenUses}</div>
          <div className="stat-label">Generations Used</div>
          <div className="stat-sub">out of {totalTokenCapacity} capacity</div>
        </div>
      </section>

      {/* Quick links */}
      <section className="dashboard-quick-links">
        <h2>Quick Actions</h2>
        <div className="quick-grid">
          <Link href="/admin/tokens" className="quick-card">
            <span className="quick-icon">🔑</span>
            <span className="quick-title">Manage Tokens</span>
            <span className="quick-desc">Create, review, and revoke access tokens</span>
          </Link>
          <Link href="/admin/users" className="quick-card">
            <span className="quick-icon">👥</span>
            <span className="quick-title">Manage Users</span>
            <span className="quick-desc">View and edit user accounts and roles</span>
          </Link>
          <Link href="/admin/payments" className="quick-card">
            <span className="quick-icon">💰</span>
            <span className="quick-title">View Payments</span>
            <span className="quick-desc">Review all token purchase payments</span>
          </Link>
        </div>
      </section>

      {/* Recent tokens */}
      <section className="dashboard-section">
        <h2>Recent Tokens</h2>
        {tokens.length === 0 ? (
          <p className="empty-text">No tokens have been created yet.</p>
        ) : (
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>Token</th>
                <th>Type</th>
                <th>Email</th>
                <th>Uses</th>
                <th>Expires</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {tokens.slice(0, 10).map(t => (
                <tr key={t.id}>
                  <td><code>{t.token.substring(0, 20)}…</code></td>
                  <td className="capitalize">{t.type}</td>
                  <td>{t.email || "—"}</td>
                  <td>{t.max_uses - t.used_count} / {t.max_uses}</td>
                  <td>{t.expires_at ? formatDate(t.expires_at) : "No expiry"}</td>
                  <td>{formatDate(t.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Recent users */}
      <section className="dashboard-section">
        <h2>Recent Users</h2>
        {users.length === 0 ? (
          <p className="empty-text">No users found.</p>
        ) : (
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.slice(0, 10).map(u => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>
                    <span className={`role-badge ${u.isAdmin ? "admin" : "user"}`}>
                      {u.isAdmin ? "Admin" : "User"}
                    </span>
                  </td>
                  <td>{formatDate(u.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
