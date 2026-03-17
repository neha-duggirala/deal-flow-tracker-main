import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Activity, Zap } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string | number;
  change?: string;
  trend?: "up" | "down" | "neutral";
  icon: "activity" | "trending" | "zap";
  delay?: number;
}

const icons = {
  activity: Activity,
  trending: TrendingUp,
  zap: Zap,
};

const MetricCard = ({ label, value, change, trend, icon, delay = 0 }: MetricCardProps) => {
  const Icon = icons[icon];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="rounded-lg border border-border bg-card p-4 hover:border-primary/30 transition-all duration-300"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">{label}</span>
        <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </div>
      <div className="text-2xl font-bold font-mono text-foreground">{value}</div>
      {change && (
        <div className={`flex items-center gap-1 mt-1 text-xs font-mono ${
          trend === "up" ? "text-accent" : trend === "down" ? "text-destructive" : "text-muted-foreground"
        }`}>
          {trend === "up" ? <TrendingUp className="h-3 w-3" /> : trend === "down" ? <TrendingDown className="h-3 w-3" /> : null}
          {change}
        </div>
      )}
    </motion.div>
  );
};

export default MetricCard;
