import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ListTodo,
  Loader2,
  Mail,
  RefreshCw,
  Send,
  Shield,
  Target,
  X,
} from "lucide-react";
import { Deal } from "@/data/types";
import StatusBadge from "./StatusBadge";
import {
  draftFollowup,
  approveDraft,
  type DraftFollowupResponsePayload,
} from "@/lib/api";

interface DealDetailPanelProps {
  deal: Deal;
  onNavigateToAnalysis?: () => void;
}

const DealDetailPanel = ({ deal, onNavigateToAnalysis }: DealDetailPanelProps) => {
  const [draftOpen, setDraftOpen] = useState(false);
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftData, setDraftData] = useState<DraftFollowupResponsePayload | null>(null);
  const [draftSubject, setDraftSubject] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [draftRecipient, setDraftRecipient] = useState("");
  const [draftError, setDraftError] = useState<string | null>(null);
  const [sendStatus, setSendStatus] = useState<"idle" | "sending" | "sent">("idle");

  const handleGenerateDraft = async () => {
    setDraftLoading(true);
    setDraftError(null);
    setSendStatus("idle");

    try {
      const result = await draftFollowup({
        deal_id: deal.id,
        sector: deal.sector,
        parties: deal.parties,
        deal_title: deal.title,
        bottlenecks: deal.bottlenecks,
        risk_level: deal.riskLevel,
      });

      setDraftData(result);
      setDraftSubject(result.subject);
      setDraftBody(result.body);
      setDraftRecipient(result.recipient);
      setDraftOpen(true);
    } catch (err) {
      setDraftError(err instanceof Error ? err.message : "Failed to generate draft");
    } finally {
      setDraftLoading(false);
    }
  };

  const handleApproveDraft = async () => {
    if (!draftData) return;

    setSendStatus("sending");
    try {
      await approveDraft({
        deal_id: deal.id,
        thread_id: draftData.thread_id,
        subject: draftSubject,
        body: draftBody,
        recipient: draftRecipient,
        action: "approve",
      });
      setSendStatus("sent");
    } catch (err) {
      setDraftError(err instanceof Error ? err.message : "Failed to send draft");
      setSendStatus("idle");
    }
  };

  const handleCloseDraft = () => {
    setDraftOpen(false);
    setDraftData(null);
    setDraftError(null);
    setSendStatus("idle");
  };

  return (
    <motion.div
      key={deal.id}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="h-full overflow-y-auto p-4 space-y-4"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-mono text-primary mb-1">{deal.id}</p>
          <h2 className="text-lg font-bold text-foreground">{deal.title}</h2>
          <p className="text-sm text-muted-foreground mt-1">{deal.parties}</p>
        </div>
        <div className="flex flex-col gap-1.5 flex-shrink-0">
          {onNavigateToAnalysis && (
            <button
              onClick={onNavigateToAnalysis}
              className="flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary font-semibold text-xs px-3 py-1.5 transition-colors"
            >
              AI Analysis
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={handleGenerateDraft}
            disabled={draftLoading}
            className="flex items-center gap-1.5 rounded-md border border-amber-400/40 bg-amber-50 hover:bg-amber-100 text-amber-700 font-semibold text-xs px-3 py-1.5 transition-colors disabled:opacity-50"
          >
            {draftLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Mail className="h-3.5 w-3.5" />
            )}
            {draftLoading ? "Drafting..." : "Draft Follow-up"}
          </button>
        </div>
      </div>

      {/* Draft Follow-up Section */}
      <AnimatePresence>
        {(draftOpen || draftError) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="rounded-lg border border-amber-300/50 bg-amber-50/50 p-3 space-y-3">
              {/* Draft Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-amber-600" />
                  <p className="text-xs font-mono text-amber-700 uppercase font-semibold">
                    Follow-up Draft
                  </p>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-200/60 text-amber-800">
                    GATEKEEPER REVIEW
                  </span>
                </div>
                <button
                  onClick={handleCloseDraft}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {draftError && (
                <div className="text-xs text-destructive bg-destructive/10 rounded px-2 py-1.5">
                  {draftError}
                </div>
              )}

              {draftData && (
                <>
                  {/* Recipient */}
                  <div>
                    <label className="text-[10px] font-mono text-muted-foreground uppercase block mb-1">
                      To
                    </label>
                    <input
                      value={draftRecipient}
                      onChange={(e) => setDraftRecipient(e.target.value)}
                      disabled={sendStatus === "sent"}
                      className="w-full text-xs rounded border border-border bg-background px-2 py-1.5 text-foreground focus:border-primary/50 focus:outline-none disabled:opacity-60"
                    />
                  </div>

                  {/* Subject */}
                  <div>
                    <label className="text-[10px] font-mono text-muted-foreground uppercase block mb-1">
                      Subject
                    </label>
                    <input
                      value={draftSubject}
                      onChange={(e) => setDraftSubject(e.target.value)}
                      disabled={sendStatus === "sent"}
                      className="w-full text-xs rounded border border-border bg-background px-2 py-1.5 text-foreground focus:border-primary/50 focus:outline-none disabled:opacity-60"
                    />
                  </div>

                  {/* Body */}
                  <div>
                    <label className="text-[10px] font-mono text-muted-foreground uppercase block mb-1">
                      Body
                    </label>
                    <textarea
                      value={draftBody}
                      onChange={(e) => setDraftBody(e.target.value)}
                      disabled={sendStatus === "sent"}
                      rows={6}
                      className="w-full text-xs rounded border border-border bg-background px-2 py-1.5 text-foreground leading-relaxed resize-y focus:border-primary/50 focus:outline-none disabled:opacity-60"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    {sendStatus === "sent" ? (
                      <div className="flex items-center gap-1.5 text-accent text-xs font-semibold">
                        <CheckCircle2 className="h-4 w-4" />
                        Approved & Sent
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={handleApproveDraft}
                          disabled={sendStatus === "sending"}
                          className="flex items-center gap-1.5 rounded-md bg-accent hover:bg-accent/90 text-white font-semibold text-xs px-3 py-1.5 transition-colors disabled:opacity-50"
                        >
                          {sendStatus === "sending" ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Send className="h-3.5 w-3.5" />
                          )}
                          {sendStatus === "sending" ? "Sending..." : "Approve & Send"}
                        </button>
                        <button
                          onClick={handleGenerateDraft}
                          disabled={draftLoading}
                          className="flex items-center gap-1.5 rounded-md border border-border bg-muted hover:bg-muted/80 text-foreground font-medium text-xs px-3 py-1.5 transition-colors disabled:opacity-50"
                        >
                          <RefreshCw className={`h-3.5 w-3.5 ${draftLoading ? "animate-spin" : ""}`} />
                          Regenerate
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
