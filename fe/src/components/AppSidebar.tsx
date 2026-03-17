import { motion } from "framer-motion";
import {
  LayoutDashboard,
  MessageSquare,
  BarChart3,
  Settings,
  Zap,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";

interface AppSidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

const navItems = [
  { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { id: "deals", icon: BarChart3, label: "Deal Pipeline" },
  { id: "chat", icon: MessageSquare, label: "Communications" },
  { id: "settings", icon: Settings, label: "Settings" },
];

const AppSidebar = ({ activeView, onViewChange }: AppSidebarProps) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 220 }}
      transition={{ duration: 0.2 }}
      className="h-screen flex flex-col border-r border-border bg-sidebar"
    >
      {/* Logo */}
      <button
        onClick={() => onViewChange("dashboard")}
        className="flex items-center gap-2.5 px-4 h-14 border-b border-border hover:bg-muted/50 transition-colors cursor-pointer"
      >
        <div className="h-8 w-8 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center flex-shrink-0">
          <Zap className="h-4 w-4 text-primary" />
        </div>
        {!collapsed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="overflow-hidden">
            <p className="text-sm font-bold text-foreground tracking-tight">DealFlow</p>
            <p className="text-[10px] font-mono text-primary uppercase tracking-widest">AI Agent</p>
          </motion.div>
        )}
      </button>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-1">
        {navItems.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                isActive
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent"
              }`}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {!collapsed && <span className="font-medium">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="p-2 border-t border-border">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </motion.aside>
  );
};

export default AppSidebar;
