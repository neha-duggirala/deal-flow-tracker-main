import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, ListTodo, Shield, Target } from "lucide-react";
import { Deal } from "@/data/types";
import StatusBadge from "./StatusBadge";

interface DealDetailPanelProps {
  deal: Deal;
}

const DealDetailPanel = ({ deal }: DealDetailPanelProps) => {
  return (
    <motion.div
      key={deal.id}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="h-full overflow-y-auto p-4 space-y-4"
    >
      {/* Header */}
      <div>
        <p className="text-xs font-mono text-primary mb-1">{deal.id}</p>
        <h2 className="text-lg font-bold text-foreground">{deal.title}</h2>
        <p className="text-sm text-muted-foreground mt-1">{deal.parties}</p>
      </div>

      {/* Status & Risk */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-xs font-mono text-muted-foreground uppercase mb-2">Status</p>
          <StatusBadge status={deal.status} />
        </div>
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-xs font-mono text-muted-foreground uppercase mb-2">Risk Level</p>
          <div className="flex items-center gap-2">
            <Shield className={`h-4 w-4 ${
              deal.riskLevel === "High" ? "text-destructive" : deal.riskLevel === "Medium" ? "text-warning" : "text-accent"
            }`} />
            <span className="text-sm font-semibold text-foreground">{deal.riskLevel}</span>
          </div>
        </div>
      </div>

      {/* Confidence */}
      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-mono text-muted-foreground uppercase">AI Confidence</p>
          <span className="text-sm font-mono font-bold text-primary">{Math.round(deal.confidenceScore * 100)}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${deal.confidenceScore * 100}%` }}
            transition={{ duration: 0.8 }}
            className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
          />
        </div>
      </div>

      {/* Sector & Value */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-xs font-mono text-muted-foreground uppercase mb-1">Sector</p>
          <p className="text-sm font-medium text-foreground">{deal.sector}</p>
        </div>
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-xs font-mono text-muted-foreground uppercase mb-1">Deal Value</p>
          <p className="text-sm font-mono font-bold text-foreground">{deal.value}</p>
        </div>
      </div>

      {/* Bottlenecks */}
      {deal.bottlenecks.length > 0 && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <p className="text-xs font-mono text-destructive uppercase font-semibold">Bottlenecks</p>
          </div>
          <ul className="space-y-1.5">
            {deal.bottlenecks.map((b, i) => (
              <li key={i} className="text-sm text-foreground flex items-start gap-2">
                <span className="text-destructive mt-1">•</span>
                {b}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Suggested Tasks */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
        <div className="flex items-center gap-2 mb-2">
          <ListTodo className="h-4 w-4 text-primary" />
          <p className="text-xs font-mono text-primary uppercase font-semibold">AI Suggested Tasks</p>
        </div>
        <ul className="space-y-2">
          {deal.suggestedTasks.map((task, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-foreground">
              <Target className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
              {task}
            </li>
          ))}
        </ul>
      </div>

      {/* Progress */}
      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-mono text-muted-foreground uppercase">Deal Progress</p>
          <span className="text-sm font-mono font-bold text-foreground">{deal.progress}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${deal.progress}%` }}
            transition={{ duration: 0.8 }}
            className={`h-full rounded-full ${
              deal.status === "blocked" ? "bg-destructive" : deal.status === "action_needed" ? "bg-warning" : "bg-accent"
            }`}
          />
        </div>
      </div>
    </motion.div>
  );
};

export default DealDetailPanel;
