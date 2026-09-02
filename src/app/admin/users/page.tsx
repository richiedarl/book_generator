/**
 * Admin User Management — list, edit, and delete users.
 * Auth is handled by the parent admin layout.
 */

"use client";

import { useState, useEffect } from "react";

interface User {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
  accessToken?: string;
  createdAt: number;
}

interface AuthConfig {
  tokenRequired: boolean;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [config, setConfig] = useState<AuthConfig>({ tokenRequired: false });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Edit user modal
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState("");
  const [editIsAdmin, setEditIsAdmin] = useState(false);
  const [modalError, setModalError] = useState("");

  useEffect(() => {
    loadUsers();
    loadConfig();
  }, []);

  const loadUsers = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/users");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load users");
      }

      setUsers(data.users.map((u: any) => ({
        ...u,
        isAdmin: u.isAdmin,
        createdAt: u.createdAt,
      })));
    } catch (err: any) {
      setError(err.message || "Failed to load users");
    } finally {
      setIsLoading(false);
    }
  };

  const loadConfig = async () => {
    try {
      const response = await fetch("/api/admin/config");
      const data = await response.json();

      if (data.config) {
        setConfig(data.config);
      }
    } catch (err) {
      console.error("Failed to load config:", err);
    }
  };

  const handleToggleAdmin = (user: User) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditIsAdmin(user.isAdmin);
    setModalError("");
    setShowModal(true);
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;

    setModalError("");

    try {
      const updates: any = {
        name: editName,
        isAdmin: editIsAdmin,
      };

      // Remove access token if removing admin
      if (!editIsAdmin && editingUser.isAdmin) {
        updates.accessToken = null;
      }

      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: editingUser.id, ...updates }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update user");
      }

      setSuccess("User updated successfully");
      setShowModal(false);
      setEditingUser(null);
      await loadUsers();
    } catch (err: any) {
      setModalError(err.message || "Failed to update user");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user? This cannot be undone.")) return;

    try {
      const response = await fetch(`/api/admin/users?userId=${userId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete user");
      }

      setSuccess("User deleted successfully");
      await loadUsers();
    } catch (err: any) {
      setError(err.message || "Failed to delete user");
    }
  };

  const handleToggleTokenRequirement = async () => {
    const newValue = !config.tokenRequired;

    try {
      const response = await fetch("/api/admin/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenRequired: newValue }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update config");
      }

      setConfig(data.config);
      setSuccess(newValue ? "Token requirement enabled" : "Token requirement disabled");
    } catch (err: any) {
      setError(err.message || "Failed to update config");
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
        <h1>User Management</h1>
        <p>View and manage user accounts and roles.</p>
      </div>

      {error && <div className="admin-message error">{error}</div>}
      {success && <div className="admin-message success">{success}</div>}

      {/* Token Requirement Toggle */}
      <section className="admin-section">
        <h2>System Configuration</h2>
        <div className="config-item">
          <div className="config-info">
            <h3>Token Requirement</h3>
            <p>When enabled, users must provide a valid access token to generate books.</p>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={config.tokenRequired}
              onChange={handleToggleTokenRequirement}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </section>

      {/* Users Table */}
      <section className="admin-section">
        <h2>Users ({users.length})</h2>

        {users.length === 0 ? (
          <div className="empty-state">No users found</div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Access Token</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`role-badge ${user.isAdmin ? "admin" : "user"}`}>
                        {user.isAdmin ? "Admin" : "User"}
                      </span>
                    </td>
                    <td>
                      {user.accessToken ? (
                        <div className="token-display">
                          <code>{user.accessToken.substring(0, 20)}…</code>
                          <button
                            className="btn-copy"
                            onClick={() => navigator.clipboard.writeText(user.accessToken!)}
                            title="Copy token"
                          >
                            Copy
                          </button>
                        </div>
                      ) : (
                        <span className="no-token">—</span>
                      )}
                    </td>
                    <td>{formatDate(user.createdAt)}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn-icon edit"
                          onClick={() => handleToggleAdmin(user)}
                          title="Edit"
                        >
                          ✏️
                        </button>
                        {!user.isAdmin || users.filter(u => u.isAdmin).length > 1 ? (
                          <button
                            className="btn-icon delete"
                            onClick={() => handleDeleteUser(user.id)}
                            title="Delete"
                          >
                            🗑️
                          </button>
                        ) : (
                          <span className="btn-icon disabled" title="Cannot delete last admin">🗑️</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Edit User Modal */}
        {showModal && editingUser && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h3>Edit User: {editingUser.email}</h3>

              {modalError && <div className="modal-error">{modalError}</div>}

              <div className="form-group">
                <label htmlFor="editName">Name</label>
                <input
                  type="text"
                  id="editName"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>

              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={editIsAdmin}
                    onChange={(e) => setEditIsAdmin(e.target.checked)}
                  />
                  <span>Admin Access</span>
                </label>
                <p className="form-hint">
                  {editIsAdmin
                    ? "User will receive an access token for book generation"
                    : "User will lose admin privileges and access token"}
                </p>
              </div>

              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button className="btn-primary" onClick={handleSaveUser}>
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
