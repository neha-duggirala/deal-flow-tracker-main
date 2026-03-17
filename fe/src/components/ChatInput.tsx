import { useState } from "react";
import { motion } from "framer-motion";
import { Send, Paperclip, Sparkles, Loader2 } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => void;
  onAnalyze: () => void | Promise<void>;
  disabled?: boolean;
  isAnalyzing?: boolean;
}

const ChatInput = ({ onSend, onAnalyze, disabled, isAnalyzing }: ChatInputProps) => {
  const [value, setValue] = useState("");

  const handleSend = () => {
    if (!value.trim()) return;
    onSend(value.trim());
    setValue("");
  };

  return (
    <div className="border-t border-border bg-card p-4">
      <div className="flex items-end gap-2">
        <div className="flex-1 relative">
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type a message or paste communication..."
            rows={2}
            disabled={disabled || isAnalyzing}
            className="w-full resize-none rounded-lg border border-border bg-muted p-3 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 font-sans transition-all"
          />
          <button
            className="absolute right-3 bottom-3 text-muted-foreground hover:text-foreground transition-colors"
            title="Attach file"
          >
            <Paperclip className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleSend}
            disabled={!value.trim() || disabled || isAnalyzing}
            className="h-10 px-4 rounded-lg bg-primary text-primary-foreground font-medium text-sm flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
            Send
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onAnalyze}
            disabled={disabled || isAnalyzing}
            className="h-10 px-4 rounded-lg border border-primary/30 bg-primary/10 text-primary font-medium text-sm flex items-center gap-2 hover:bg-primary/20 transition-all disabled:opacity-40"
          >
            {isAnalyzing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {isAnalyzing ? "Analyzing..." : "Analyze"}
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default ChatInput;
