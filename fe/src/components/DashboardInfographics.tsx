import { useMemo, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Deal } from "@/data/types";
import { MOCK_DEALS } from "@/data/mockData";
import { TrendingUp, AlertCircle, CheckCircle, Clock, Loader2, ArrowRight } from "lucide-react";
import { useQdrantDeals, type QdrantDeal } from "@/hooks/useQdrantDeals";

interface DashboardInfographicsProps {
  onViewDeal?: (deal: Deal) => void;
}

const DashboardInfographics = ({ onViewDeal }: DashboardInfographicsProps) => {
  const { fetchAllDeals, loading: qdrantLoading } = useQdrantDeals();
  const [qdrantDeals, setQdrantDeals] = useState<QdrantDeal[]>([]);
  const [useQdrant, setUseQdrant] = useState(true);

  // Fetch Qdrant deals on component mount
  useEffect(() => {
    const loadDeals = async () => {
      if (useQdrant) {
        const deals = await fetchAllDeals(10);
        if (deals.length > 0) {
          setQdrantDeals(deals);
        } else {
          // Fallback to mock data if Qdrant is empty
          setUseQdrant(false);
        }
      }
    };
    loadDeals();
  }, [fetchAllDeals, useQdrant]);

  const stats = useMemo(() => {
    // Use Qdrant data if available, otherwise use mock data
    const deals = useQdrant && qdrantDeals.length > 0 ? qdrantDeals : MOCK_DEALS;

    if (useQdrant && qdrantDeals.length > 0) {
      // Process Qdrant deals
      const statusCounts = {
        "Processing / Documentary Verification": 0,
        "Blocked": 0,
        "Settling / FX Conversion": 0,
        "In-Transit / Logistics Coordination": 0,
        "Expansion / Investment Phase": 0,
        "Localization / Regulatory Approval": 0,
        "Negotiation / Ruble Settlement Pilot": 0,
        "In-Transit / Retail Distribution": 0,
        "Contracting / Customs": 0,
        "Fulfillment / Payments": 0,
      };

      qdrantDeals.forEach(deal => {
        const status = deal.status as keyof typeof statusCounts;
        if (status in statusCounts) {
          statusCounts[status]++;
        }
      });

      const closedDeals = statusCounts["Processing / Documentary Verification"] || 0;
      const blockedDeals = statusCounts["Blocked"] || 0;
      const actionNeeded = qdrantDeals.length - closedDeals - blockedDeals;
      const totalDeals = qdrantDeals.length;
      const avgConfidence = qdrantDeals.reduce((sum, d) => sum + (d.confidence_score || 0), 0) / totalDeals;
      const successRate = (closedDeals / totalDeals) * 100;

      // Portfolio by sector
      const sectorMap = new Map<string, number>();
      qdrantDeals.forEach(deal => {
        const current = sectorMap.get(deal.sector) || 0;
        sectorMap.set(deal.sector, current + 1);
      });

      const portfolioBySector = Array.from(sectorMap.entries()).map(([sector, count]) => ({
        name: sector,
        value: count,
      }));

      // Risk distribution
      const riskMap = new Map<string, number>();
      qdrantDeals.forEach(deal => {
        const riskLevel = deal.status.includes("Blocked") ? "High" : deal.status.includes("In-Transit") ? "Medium" : "Low";
        const current = riskMap.get(riskLevel) || 0;
        riskMap.set(riskLevel, current + 1);
      });

      const riskDistribution = Array.from(riskMap.entries()).map(([risk, count]) => ({
        name: risk,
        count,
      }));

      return {
        closedDeals,
        totalDeals,
        blockedDeals,
        actionNeeded,
        totalValue: (closedDeals * 2.5).toFixed(1),
        successRate: successRate.toFixed(0),
        avgConfidence: (avgConfidence * 100).toFixed(0),
        avgProgress: ((closedDeals / totalDeals) * 100).toFixed(0),
        portfolioBySector,
        statusDistribution: [
          { name: "Processing", value: closedDeals, fill: "#10b981" },
          { name: "In Progress", value: actionNeeded, fill: "#f59e0b" },
          { name: "Blocked", value: blockedDeals, fill: "#ef4444" },
        ],
        riskDistribution,
      };
    } else {
      // Original mock data processing
      const closedDeals = MOCK_DEALS.filter(d => d.status === "on_track").length;
      const totalDeals = MOCK_DEALS.length;
      const blockedDeals = MOCK_DEALS.filter(d => d.status === "blocked").length;
      const actionNeeded = MOCK_DEALS.filter(d => d.status === "action_needed").length;

      const totalValue = MOCK_DEALS.reduce((sum, d) => sum + parseFloat(d.value.replace(/[$M]/g, "")), 0);
      const successRate = (closedDeals / totalDeals) * 100;
      const avgConfidence = MOCK_DEALS.reduce((sum, d) => sum + d.confidenceScore, 0) / totalDeals;
      const avgProgress = MOCK_DEALS.reduce((sum, d) => sum + d.progress, 0) / totalDeals;

      const sectorMap = new Map<string, number>();
      MOCK_DEALS.forEach(deal => {
        const current = sectorMap.get(deal.sector) || 0;
        sectorMap.set(deal.sector, current + parseFloat(deal.value.replace(/[$M]/g, "")));
      });

      const portfolioBySector = Array.from(sectorMap.entries()).map(([sector, value]) => ({
        name: sector,
        value: parseFloat(value.toFixed(1)),
      }));

      const statusDistribution = [
        { name: "On Track", value: closedDeals, fill: "#10b981" },
        { name: "Action Needed", value: actionNeeded, fill: "#f59e0b" },
        { name: "Blocked", value: blockedDeals, fill: "#ef4444" },
      ];

      const riskMap = new Map<string, number>();
      MOCK_DEALS.forEach(deal => {
        const current = riskMap.get(deal.riskLevel) || 0;
        riskMap.set(deal.riskLevel, current + 1);
      });

      const riskDistribution = Array.from(riskMap.entries()).map(([risk, count]) => ({
        name: risk,
        count,
      }));

      return {
        closedDeals,
        totalDeals,
        blockedDeals,
        actionNeeded,
        totalValue: totalValue.toFixed(1),
        successRate: successRate.toFixed(0),
        avgConfidence: (avgConfidence * 100).toFixed(0),
        avgProgress: avgProgress.toFixed(0),
        portfolioBySector,
        statusDistribution,
        riskDistribution,
      };
    }
  }, [useQdrant, qdrantDeals]);

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (delay: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: delay * 0.1,
        duration: 0.5,
        ease: "easeOut",
      },
    }),
  };

  return (
    <div className="h-full overflow-y-auto bg-background p-6">
      {qdrantLoading && (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading portfolio data from Qdrant...</p>
          </div>
        </div>
      )}

      {!qdrantLoading && (
        <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl font-bold text-foreground mb-2">Portfolio Performance Dashboard</h1>
          <p className="text-muted-foreground">
            Track your relationship portfolio health, deal status, and key performance indicators at a glance
          </p>
        </motion.div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Successful Deals */}
          <motion.div
            custom={0}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Deal Success Rate</p>
                <p className="text-3xl font-bold text-foreground">{stats.successRate}%</p>
                <p className="text-xs text-emerald-600 mt-2">
                  {stats.closedDeals} of {stats.totalDeals} deals progressing well
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </motion.div>

          {/* Portfolio Value */}
          <motion.div
            custom={1}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Portfolio Under Management</p>
                <p className="text-3xl font-bold text-foreground">${stats.totalValue}M</p>
                <p className="text-xs text-blue-600 mt-2">Total deal pipeline value</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </motion.div>

          {/* Issues Requiring Attention */}
          <motion.div
            custom={2}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Deals At Risk</p>
                <p className="text-3xl font-bold text-foreground">{stats.actionNeeded + stats.blockedDeals}</p>
                <p className="text-xs text-amber-600 mt-2">
                  Require immediate action or intervention
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </motion.div>

          {/* Average Confidence */}
          <motion.div
            custom={3}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">AI Confidence Level</p>
                <p className="text-3xl font-bold text-foreground">{stats.avgConfidence}%</p>
                <p className="text-xs text-cyan-600 mt-2">Avg predicted deal success</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-cyan-600" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Deal Status Distribution */}
          <motion.div
            custom={4}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className="bg-card border border-border rounded-lg p-6"
          >
            <h2 className="text-lg font-semibold text-foreground mb-4">Deal Status Distribution</h2>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={stats.statusDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name} (${value})`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {stats.statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Portfolio by Sector */}
          <motion.div
            custom={5}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className="bg-card border border-border rounded-lg p-6"
          >
            <h2 className="text-lg font-semibold text-foreground mb-4">Portfolio Value by Sector</h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stats.portfolioBySector}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#1e3a8a" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Risk Distribution */}
          <motion.div
            custom={6}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className="bg-card border border-border rounded-lg p-6"
          >
            <h2 className="text-lg font-semibold text-foreground mb-4">Risk Distribution</h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stats.riskDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#06b6d4" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Performance Metrics */}
          <motion.div
            custom={7}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className="bg-card border border-border rounded-lg p-6"
          >
            <h2 className="text-lg font-semibold text-foreground mb-4">Performance Metrics</h2>
            <div className="space-y-4">
              {/* Progress */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-muted-foreground">Overall Progress</span>
                  <span className="text-sm font-bold text-foreground">{stats.avgProgress}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
                    style={{ width: `${stats.avgProgress}%` }}
                  />
                </div>
              </div>

              {/* Success Rate Progress */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-muted-foreground">Success Rate</span>
                  <span className="text-sm font-bold text-foreground">{stats.successRate}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-green-500 rounded-full"
                    style={{ width: `${stats.successRate}%` }}
                  />
                </div>
              </div>

              {/* Average Confidence */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-muted-foreground">Confidence Score</span>
                  <span className="text-sm font-bold text-foreground">{stats.avgConfidence}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                    style={{ width: `${stats.avgConfidence}%` }}
                  />
                </div>
              </div>

              {/* Deal Health */}
              <div className="mt-6 pt-4 border-t border-border">
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-3">
                  Portfolio Summary
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Active Deals</span>
                    <span className="font-bold text-foreground">{stats.totalDeals}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Healthy Status</span>
                    <span className="font-bold text-emerald-600">{stats.closedDeals}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Requires Review</span>
                    <span className="font-bold text-amber-600">{stats.actionNeeded}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Critical Issues</span>
                    <span className="font-bold text-red-600">{stats.blockedDeals}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Footer Note */}
        <motion.div
          custom={8}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex items-start justify-between"
        >
          <div>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium">Quick Actions:</span> Use the Deal Pipeline tab to manage individual transactions, review communications, and track specific deal progress. Monitor bottlenecks and take corrective action to keep your portfolio on track.
            </p>
          </div>
          <ArrowRight className="h-5 w-5 text-primary flex-shrink-0 mt-0.5 ml-3" />
        </motion.div>
        </div>
      )}
    </div>
  );
};

export default DashboardInfographics;
