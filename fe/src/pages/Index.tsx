import { useState, useMemo, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Search, Filter, Bell, User, Loader2 } from "lucide-react";
import AppSidebar from "@/components/AppSidebar";
import MetricCard from "@/components/MetricCard";
import DealCard from "@/components/DealCard";
import DealDetailPanel from "@/components/DealDetailPanel";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import { MOCK_DEALS, MOCK_MESSAGES } from "@/data/mockData";
import StatusBadge from "@/components/StatusBadge";
import { Deal, Message, AnalysisResult } from "@/data/types";
import { useAnalyzeDeal, useDealStatus } from "@/hooks/useApi";

const Index = () => {
  const [activeView, setActiveView] = useState("dashboard");
  const [selectedDeal, setSelectedDeal] = useState<Deal>(MOCK_DEALS[0]);
  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);
  const [searchQuery, setSearchQuery] = useState("");
  const [analysisResults, setAnalysisResults] = useState<Map<string, AnalysisResult>>(new Map());
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { analyze: performAnalysis, loading: analysisLoading } = useAnalyzeDeal();

  const filteredMessages = useMemo(
    () => messages.filter((m) => m.dealId === selectedDeal.id),
    [messages, selectedDeal.id]
  );

  const filteredDeals = useMemo(
    () =>
      MOCK_DEALS.filter(
        (d) =>
          d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          d.id.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [searchQuery]
  );

  const handleSendMessage = (content: string) => {
    const newMsg: Message = {
      id: String(messages.length + 1),
      sender: "You (Relationship Manager)",
      content,
      timestamp: new Date().toLocaleString("en-US", {
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit",
      }),
      type: "chat",
      dealId: selectedDeal.id,
      sentiment: "neutral",
    };
    setMessages((prev) => [...prev, newMsg]);
  };

  const handleAnalyze = useCallback(async () => {
    if (!selectedDeal) {
      setError("No deal selected");
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      // Prepare the payload
      const dealMessages = filteredMessages.map((m) => ({
        sender: m.sender,
        content: m.content,
        timestamp: m.timestamp,
        type: m.type,
      }));

      const payload = {
        deal_id: selectedDeal.id,
        sector: selectedDeal.sector,
        parties: selectedDeal.parties,
        messages: dealMessages,
      };

      // Call the API
      const result = await performAnalysis(payload);

      // Store the analysis result
      setAnalysisResults((prev) => new Map(prev).set(selectedDeal.id, {
        status: result.status,
        bottleneck: result.bottleneck,
        suggestedTask: result.suggested_task,
        suggestedDraft: result.suggested_draft,
        riskLevel: result.risk_level,
        confidenceScore: result.confidence_score,
        fingerprints: result.fingerprints,
        requiresReview: result.requires_review,
        threadId: result.thread_id,
      }));

      // Add analysis message to chat
      const analysisMsg: Message = {
        id: String(messages.length + 1),
        sender: "AI Agent (Analyst)",
        content: `✅ Analysis Complete!\n\n📊 Status: ${result.status}\n📈 Risk Level: ${result.risk_level}\n🎯 Confidence: ${Math.round(result.confidence_score * 100)}%\n💡 Suggested Task: ${result.suggested_task}\n⚠️ Bottlenecks: ${result.bottleneck !== "None" ? result.bottleneck : "None identified"}\n\nThread ID: ${result.thread_id}`,
        timestamp: new Date().toLocaleString("en-US", {
          year: "numeric", month: "2-digit", day: "2-digit",
          hour: "2-digit", minute: "2-digit",
        }),
        type: "system",
        dealId: selectedDeal.id,
        sentiment: "neutral",
      };
      setMessages((prev) => [...prev, analysisMsg]);

      // Update the deal with new information
      setSelectedDeal((prev) => ({
        ...prev,
        status: result.status.toLowerCase().replace(" ", "_") === "on_track" ? "on_track" : 
                result.status.toLowerCase().replace(" ", "_") === "action_needed" ? "action_needed" : "blocked",
        riskLevel: result.risk_level,
        confidenceScore: result.confidence_score,
        bottlenecks: result.bottleneck !== "None" ? result.bottleneck.split("; ") : [],
        suggestedTasks: [result.suggested_task],
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to analyze deal";
      setError(errorMessage);

      const errorMsg: Message = {
        id: String(messages.length + 1),
        sender: "AI Agent (Error)",
        content: `❌ Analysis failed: ${errorMessage}\n\nPlease ensure the backend is running on http://localhost:8005`,
        timestamp: new Date().toLocaleString("en-US", {
          year: "numeric", month: "2-digit", day: "2-digit",
          hour: "2-digit", minute: "2-digit",
        }),
        type: "system",
        dealId: selectedDeal.id,
        sentiment: "negative",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsAnalyzing(false);
    }
  }, [selectedDeal, filteredMessages, messages.length, performAnalysis]);

  const metrics = useMemo(() => {
    const onTrack = MOCK_DEALS.filter((d) => d.status === "on_track").length;
    const blocked = MOCK_DEALS.filter((d) => d.status === "blocked").length;
    const totalValue = MOCK_DEALS.reduce((sum, d) => sum + parseFloat(d.value.replace(/[$M]/g, "")), 0);
    const avgConfidence = MOCK_DEALS.reduce((sum, d) => sum + d.confidenceScore, 0) / MOCK_DEALS.length;
    return { onTrack, blocked, totalValue: `$${totalValue.toFixed(1)}M`, avgConfidence: `${Math.round(avgConfidence * 100)}%` };
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar activeView={activeView} onViewChange={setActiveView} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 border-b border-border bg-card flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <h1 className="text-sm font-bold text-foreground">
              {activeView === "dashboard" ? "Mission Control" : activeView === "chat" ? "Communications Hub" : "Deal Pipeline"}
            </h1>
            <span className="text-xs font-mono text-muted-foreground">
              {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search deals..."
                className="h-8 w-52 rounded-md border border-border bg-muted pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none transition-colors"
              />
            </div>
            <button className="relative h-8 w-8 rounded-md border border-border bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
              <Bell className="h-3.5 w-3.5" />
              <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground flex items-center justify-center">3</span>
            </button>
            <div className="h-8 w-8 rounded-md bg-primary/15 border border-primary/30 flex items-center justify-center">
              <User className="h-3.5 w-3.5 text-primary" />
            </div>
          </div>
        </header>

        {/* Main content */}
        <div className="flex-1 overflow-hidden">
          {(activeView === "dashboard" || activeView === "deals") && (
            <div className="h-full flex flex-col">
              {/* Metrics row */}
              <div className="grid grid-cols-4 gap-4 p-6 pb-3">
                <MetricCard label="Active Deals" value={MOCK_DEALS.length} change="+2 this week" trend="up" icon="activity" delay={0} />
                <MetricCard label="On Track" value={metrics.onTrack} change="60% of total" trend="up" icon="trending" delay={0.1} />
                <MetricCard label="Pipeline Value" value={metrics.totalValue} change="+$3.2M MTD" trend="up" icon="zap" delay={0.2} />
                <MetricCard label="Avg Confidence" value={metrics.avgConfidence} change="-2% vs last week" trend="down" icon="activity" delay={0.3} />
              </div>

              {/* Deal list + detail + chat */}
              <div className="flex-1 flex overflow-hidden px-6 pb-6 gap-4">
                {/* Deal list */}
                <div className="w-80 flex-shrink-0 flex flex-col overflow-hidden rounded-lg border border-border bg-card">
                  <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                    <h2 className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Active Deals</h2>
                    <button className="text-muted-foreground hover:text-foreground transition-colors">
                      <Filter className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {filteredDeals.map((deal, i) => (
                      <DealCard
                        key={deal.id}
                        deal={deal}
                        isSelected={selectedDeal.id === deal.id}
                        onClick={() => setSelectedDeal(deal)}
                        index={i}
                      />
                    ))}
                  </div>
                </div>

                {/* Deal detail */}
                <div className="w-72 flex-shrink-0 rounded-lg border border-border bg-card overflow-hidden">
                  <div className="px-4 py-3 border-b border-border">
                    <h2 className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Deal Intelligence</h2>
                  </div>
                  <DealDetailPanel deal={selectedDeal} />
                </div>

                {/* Chat panel */}
                <div className="flex-1 flex flex-col rounded-lg border border-border bg-card overflow-hidden">
                  <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                    <h2 className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                      Communication Thread — {selectedDeal.id}
                    </h2>
                    <span className="text-xs font-mono text-primary">{filteredMessages.length} messages</span>
                  </div>
                  {error && (
                    <div className="px-4 py-2 bg-destructive/10 border-b border-destructive/20 text-xs text-destructive">
                      {error}
                    </div>
                  )}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {filteredMessages.length > 0 ? (
                      filteredMessages.map((msg, i) => (
                        <ChatMessage key={msg.id} message={msg} index={i} />
                      ))
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground text-sm font-mono">
                        No communications for this deal yet
                      </div>
                    )}
                  </div>
                  <ChatInput 
                    onSend={handleSendMessage} 
                    onAnalyze={handleAnalyze}
                    isAnalyzing={isAnalyzing}
                  />
                </div>
              </div>
            </div>
          )}

          {activeView === "chat" && (
            <div className="h-full flex">
              {/* Full chat view */}
              <div className="w-72 flex-shrink-0 border-r border-border bg-card overflow-y-auto p-2 space-y-2">
                {MOCK_DEALS.map((deal, i) => (
                  <DealCard
                    key={deal.id}
                    deal={deal}
                    isSelected={selectedDeal.id === deal.id}
                    onClick={() => setSelectedDeal(deal)}
                    index={i}
                  />
                ))}
              </div>
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="px-6 py-3 border-b border-border flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-foreground">{selectedDeal.title}</h2>
                    <p className="text-xs text-muted-foreground font-mono">{selectedDeal.parties}</p>
                  </div>
                  <StatusBadge status={selectedDeal.status} />
                </div>
                {error && (
                  <div className="px-6 py-2 bg-destructive/10 border-b border-destructive/20 text-xs text-destructive">
                    {error}
                  </div>
                )}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {filteredMessages.map((msg, i) => (
                    <ChatMessage key={msg.id} message={msg} index={i} />
                  ))}
                </div>
                <ChatInput 
                  onSend={handleSendMessage} 
                  onAnalyze={handleAnalyze}
                  isAnalyzing={isAnalyzing}
                />
              </div>
            </div>
          )}

          {activeView === "settings" && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-lg font-bold text-foreground mb-2">Settings</p>
                <p className="text-sm text-muted-foreground">API configuration, agent parameters, and system preferences</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
