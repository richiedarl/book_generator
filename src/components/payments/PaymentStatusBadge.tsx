/**
 * Status pill for a payment or a token delivery state.
 * Reuses the admin `role-badge` base style with a local colour modifier.
 */

"use client";

import { humanizeStatus } from "@/lib/format";

export type PaymentTone = "pending" | "completed" | "rejected" | "failed" | "neutral";

const STATUS_TONES: Record<string, PaymentTone> = {
  pending: "pending",
  completed: "completed",
  rejected: "rejected",
  failed: "failed",
  delivered: "completed",
  manual: "pending",
  pending_delivery: "pending",
  pending_confirmation: "pending",
  not_applicable: "neutral",
};

interface PaymentStatusBadgeProps {
  status: string | null;
  label?: string;
}

export function PaymentStatusBadge({ status, label }: PaymentStatusBadgeProps) {
  const tone: PaymentTone = (status && STATUS_TONES[status]) || "neutral";

  return (
    <span className={`role-badge status-${tone}`}>{label ?? humanizeStatus(status)}</span>
  );
}
