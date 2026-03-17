import { motion } from "framer-motion";
import { ChevronRight, Clock, DollarSign } from "lucide-react";
import { Deal } from "@/data/types";
import StatusBadge from "./StatusBadge";

interface DealCardProps {
  deal: Deal;
  isSelected: boolean;
  onClick: () => void;
  index: number;
}

const DealCard = ({ deal, isSelected, onClick, index }: DealCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      onClick={onClick}
      className={`group cursor-pointer rounded-lg border p-4 transition-all duration-200 ${
        isSelected
          ? "border-primary/50 bg-primary/5 glow-primary"
          : "border-border bg-card hover:border-primary/20 hover:bg-card/80"
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-mono text-primary mb-1">{deal.id}</p>
          <h3 className="text-sm font-semibold text-foreground truncate">{deal.title}</h3>
        </div>
        <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isSelected ? "text-primary rotate-90" : "group-hover:translate-x-0.5"}`} />
      </div>

      <p className="text-xs text-muted-foreground mb-3 truncate">{deal.parties}</p>

      <div className="flex items-center justify-between">
        <StatusBadge status={deal.status} size="sm" />
        <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
          <span className="flex items-center gap-1">
            <DollarSign className="h-3 w-3" />
            {deal.value}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {deal.lastActivity}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-1 rounded-full bg-muted overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${deal.progress}%` }}
          transition={{ duration: 0.8, delay: index * 0.05 + 0.3 }}
          className={`h-full rounded-full ${
            deal.status === "blocked" ? "bg-destructive" : deal.status === "action_needed" ? "bg-warning" : "bg-primary"
          }`}
        />
      </div>
    </motion.div>
  );
};

export default DealCard;
