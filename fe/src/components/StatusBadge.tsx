import { Activity, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { DealStatus } from "@/data/types";

interface StatusBadgeProps {
  status: DealStatus;
  size?: "sm" | "md";
}

const config: Record<DealStatus, { label: string; icon: typeof CheckCircle2; className: string }> = {
  on_track: {
    label: "On Track",
    icon: CheckCircle2,
    className: "bg-accent/10 text-accent border-accent/30",
  },
  action_needed: {
    label: "Action Needed",
    icon: AlertTriangle,
    className: "bg-warning/10 text-warning border-warning/30",
  },
  blocked: {
    label: "Blocked",
    icon: XCircle,
    className: "bg-destructive/10 text-destructive border-destructive/30",
  },
};

const StatusBadge = ({ status, size = "md" }: StatusBadgeProps) => {
  const { label, icon: Icon, className } = config[status];
  const sizeClasses = size === "sm" ? "text-xs px-2 py-0.5 gap-1" : "text-sm px-3 py-1 gap-1.5";

  return (
    <span className={`inline-flex items-center rounded-full border font-mono font-medium ${className} ${sizeClasses}`}>
      <Icon className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
      {label}
    </span>
  );
};

export default StatusBadge;
