/**
 * Admin Layout — wraps all /admin/* routes with a sidebar navigation
 * and a shared auth gate.
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface SessionUser {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
  accessToken?: string;
}

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (!data.user || !data.user.isAdmin) {
        router.push("/login");
        return;
      }
      setUser(data.user);
    } catch {
      router.push("/login");
    } finally {
      setMounted(true);
    }
  };

  const [currentPath, setCurrentPath] = useState("");

  useEffect(() => {
    setCurrentPath(window.location.pathname);
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  if (!mounted) {
    return <div className="admin-page"><div className="admin-loading">Loading…</div></div>;
  }

  if (!user) {
    return null;
  }

  const navItems = [
    { href: "/", label: "Write something", icon: "✎" },
    { href: "/admin", label: "Dashboard", icon: "◆" },
    { href: "/admin/tokens", label: "Token Management", icon: "🔑" },
    { href: "/admin/users", label: "User Management", icon: "👥" },
    { href: "/admin/payments", label: "Received Payments", icon: "💰" },
    { href: "/admin/pricing", label: "Pricing", icon: "💲" },
  ];

  return (
    <div className="admin-app-layout min-h-screen bg-[var(--bg-cream)]">
      <header className="admin-header-bar">
        <div className="admin-header-left">
          <Link href="/" className="admin-logo">The Shelf</Link>
          <span className="admin-header-divider" />
          <span className="admin-header-title">Admin Panel</span>
        </div>
        <div className="admin-header-right">
          <span className="user-name">{user.name}</span>
          <span className="user-avatar">{user.name.charAt(0).toUpperCase()}</span>
          <button type="button" className="header-link logout-link" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <div className="admin-main">
        <nav className="admin-sidebar">
          <ul className="admin-nav-list">
            {navItems.map((item) => {
              const isActive =
                item.href === "/"
                  ? currentPath === "/"
                  : item.href === "/admin"
                  ? currentPath === "/admin"
                  : currentPath.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`admin-nav-item ${item.href === "/" ? "write-nav-item" : ""} ${isActive ? "active" : ""}`}
                  >
                    <span className="admin-nav-icon">{item.icon}</span>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}
