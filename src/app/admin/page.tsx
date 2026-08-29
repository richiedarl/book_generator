"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

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

export default function AdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [config, setConfig] = useState<AuthConfig>({ tokenRequired: false });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [modalError, setModalError] = useState("");

  // Form states for editing
  const [editName, setEditName] = useState("");
  const [editIsAdmin, setEditIsAdmin] = useState(false);

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    try {
      const response = await fetch("/api/auth/me");
      const data = await response.json();

      if (!data.user || !data.user.isAdmin) {
        router.push("/");
        return;
      }

      await loadUsers();
      await loadConfig();
    } catch (err) {
      router.push("/login");
    }
  };

  const loadUsers = async () => {
    try {
      const response = await fetch("/api/admin/users");
      const data = await response.json();

      if (data.users) {
        setUsers(data.users.map((u: any) => ({
          ...u,
          isAdmin: u.isAdmin,
          createdAt: u.createdAt,
        })));
      }
    } catch (err) {
      setError("Failed to load users");
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

  const handleToggleAdmin = async (user: User) => {
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

      // Generate access token if becoming admin
      if (editIsAdmin && !editingUser.isAdmin) {
        // The server will handle token generation
      }

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
        <div className="admin-loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>Admin Panel</h1>
        <p>Manage users and system configuration</p>
      </div>

      {error && <div className="admin-message error">{error}</div>}
      {success && <div className="admin-message success">{success}</div>}

      {/* Config Section */}
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

      {/* Users Section */}
      <section className="admin-section">
        <h2>User Management</h2>

        <div className="users-table-container">
          <table className="users-table">
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
                        <code>{user.accessToken.substring(0, 20)}...</code>
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

        {users.length === 0 && (
          <div className="empty-state">No users found</div>
        )}
      </section>

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

      <style jsx>{`
        .admin-page {
          max-width: 1000px;
          margin: 0 auto;
          padding: 40px 20px;
        }

        .admin-header {
          margin-bottom: 32px;
        }

        .admin-header h1 {
          font-family: var(--display);
          font-size: 32px;
          color: var(--ink);
          margin: 0 0 8px;
        }

        .admin-header p {
          color: var(--ink-soft);
          margin: 0;
        }

        .admin-message {
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 24px;
          font-size: 14px;
        }

        .admin-message.error {
          background: #fef0f0;
          border: 1px solid #fcc;
          color: var(--accent-rust);
        }

        .admin-message.success {
          background: #f0fef0;
          border: 1px solid #cfc;
          color: var(--accent-forest);
        }

        .admin-section {
          background: var(--paper);
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 24px;
        }

        .admin-section h2 {
          font-family: var(--mono);
          font-size: 12px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--accent-forest);
          margin: 0 0 20px;
        }

        .config-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          background: var(--paper-soft);
          border-radius: 8px;
        }

        .config-info h3 {
          margin: 0 0 4px;
          font-size: 16px;
          color: var(--ink);
        }

        .config-info p {
          margin: 0;
          font-size: 13px;
          color: var(--ink-soft);
        }

        .toggle-switch {
          position: relative;
          width: 56px;
          height: 28px;
        }

        .toggle-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .toggle-slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: var(--line);
          transition: 0.3s;
          border-radius: 28px;
        }

        .toggle-slider:before {
          position: absolute;
          content: "";
          height: 22px;
          width: 22px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: 0.3s;
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }

        .toggle-switch input:checked + .toggle-slider {
          background-color: var(--accent-forest);
        }

        .toggle-switch input:checked + .toggle-slider:before {
          transform: translateX(28px);
        }

        .users-table-container {
          overflow-x: auto;
        }

        .users-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }

        .users-table th,
        .users-table td {
          padding: 12px 16px;
          text-align: left;
          border-bottom: 1px solid var(--line);
        }

        .users-table th {
          font-family: var(--mono);
          font-size: 10px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--ink-soft);
          font-weight: 600;
          background: var(--paper-soft);
        }

        .users-table tr:last-child td {
          border-bottom: none;
        }

        .users-table tr:hover td {
          background: var(--paper-soft);
        }

        .role-badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .role-badge.admin {
          background: rgba(59, 93, 80, 0.15);
          color: var(--accent-forest);
        }

        .role-badge.user {
          background: var(--ink-faint);
          color: var(--ink-soft);
        }

        .token-display {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .token-display code {
          font-family: var(--mono);
          font-size: 11px;
          background: var(--paper-deep);
          padding: 2px 8px;
          border-radius: 4px;
        }

        .btn-copy {
          font-size: 10px;
          padding: 2px 8px;
          background: transparent;
          border: 1px solid var(--line);
          border-radius: 4px;
          color: var(--ink-soft);
          cursor: pointer;
        }

        .btn-copy:hover {
          background: var(--paper-soft);
          border-color: var(--accent-forest);
          color: var(--accent-forest);
        }

        .no-token {
          color: var(--ink-faint);
          font-style: italic;
        }

        .action-buttons {
          display: flex;
          gap: 8px;
        }

        .btn-icon {
          width: 32px;
          height: 32px;
          border: none;
          background: transparent;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s ease;
        }

        .btn-icon:hover:not(.disabled) {
          background: var(--paper-soft);
        }

        .btn-icon.edit:hover {
          background: rgba(59, 93, 80, 0.1);
        }

        .btn-icon.delete:hover {
          background: rgba(160, 0, 0, 0.1);
        }

        .btn-icon.disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .empty-state {
          text-align: center;
          padding: 40px;
          color: var(--ink-faint);
        }

        /* Modal */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .modal {
          background: var(--paper);
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 24px;
          width: 100%;
          max-width: 480px;
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal h3 {
          margin: 0 0 20px;
          font-size: 18px;
          color: var(--ink);
        }

        .modal-error {
          background: #fef0f0;
          border: 1px solid #fcc;
          color: var(--accent-rust);
          padding: 10px 12px;
          border-radius: 6px;
          margin-bottom: 16px;
          font-size: 13px;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          font-family: var(--mono);
          font-size: 10px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--ink-soft);
          margin-bottom: 6px;
        }

        .form-group input[type="text"] {
          width: 100%;
          padding: 10px 12px;
          border: 1.5px solid var(--line);
          border-radius: 8px;
          background: var(--paper);
          font-family: var(--body);
          font-size: 14px;
          color: var(--ink);
        }

        .form-group input[type="text"]:focus {
          outline: none;
          border-color: var(--accent-forest);
          box-shadow: 0 0 0 2px rgba(59, 93, 80, 0.1);
        }

        .checkbox-group label {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          font-family: var(--body);
          font-size: 14px;
          color: var(--ink);
        }

        .form-hint {
          margin: 8px 0 0;
          font-size: 12px;
          color: var(--ink-faint);
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 24px;
          padding-top: 16px;
          border-top: 1px solid var(--line);
        }

        .btn-primary,
        .btn-secondary {
          padding: 10px 20px;
          border-radius: 8px;
          font-family: var(--mono);
          font-size: 10px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-primary {
          background: var(--accent-forest);
          color: white;
          border: none;
        }

        .btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(34, 48, 43, 0.2);
        }

        .btn-secondary {
          background: transparent;
          color: var(--ink);
          border: 1px solid var(--line);
        }

        .btn-secondary:hover {
          background: var(--paper-soft);
          border-color: var(--accent-forest);
          color: var(--accent-forest);
        }

        .admin-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 200px;
          color: var(--ink-soft);
        }
      `}</style>
    </div>
  );
}