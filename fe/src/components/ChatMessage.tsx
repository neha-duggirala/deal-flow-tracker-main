import { motion } from "framer-motion";
import { Bot, Mail, MessageSquare, ThumbsUp, ThumbsDown, Minus } from "lucide-react";
import { Message } from "@/data/types";

interface ChatMessageProps {
  message: Message;
  index: number;
}

const sentimentIcons = {
  positive: { icon: ThumbsUp, className: "text-accent" },
  neutral: { icon: Minus, className: "text-muted-foreground" },
  negative: { icon: ThumbsDown, className: "text-destructive" },
};

const ChatMessage = ({ message, index }: ChatMessageProps) => {
  const isSystem = message.type === "system";
  const SentimentIcon = sentimentIcons[message.sentiment].icon;
  const sentimentClass = sentimentIcons[message.sentiment].className;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06 }}
      className={`flex gap-3 ${isSystem ? "pl-4" : ""}`}
    >
      {/* Avatar */}
      <div className={`flex-shrink-0 h-8 w-8 rounded-lg flex items-center justify-center ${
        isSystem ? "bg-primary/15 border border-primary/30" : "bg-secondary border border-border"
      }`}>
        {isSystem ? (
          <Bot className="h-4 w-4 text-primary" />
        ) : message.type === "email" ? (
          <Mail className="h-4 w-4 text-muted-foreground" />
        ) : (
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-xs font-semibold ${isSystem ? "text-primary" : "text-foreground"}`}>
            {message.sender}
          </span>
          <span className="text-xs text-muted-foreground font-mono">{message.timestamp}</span>
          <SentimentIcon className={`h-3 w-3 ${sentimentClass}`} />
        </div>
        <div className={`text-sm leading-relaxed rounded-lg p-3 ${
          isSystem
            ? "bg-primary/5 border border-primary/15 text-foreground font-mono text-xs"
            : "bg-secondary/50 border border-border text-secondary-foreground"
        }`}>
          {message.content.split("\n").map((line, i) => (
            <p key={i} className={i > 0 ? "mt-1.5" : ""}>{line}</p>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default ChatMessage;
