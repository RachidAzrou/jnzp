import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MessageSquare, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type MessageChannel = "PORTAL" | "WHATSAPP";

interface ChatMessageProps {
  message: string;
  channel: MessageChannel;
  senderRole: string;
  timestamp: string;
  isCurrentUser: boolean;
}

const channelConfig = {
  PORTAL: {
    label: "Portal",
    color: "bg-blue-500",
    icon: MessageSquare,
  },
  WHATSAPP: {
    label: "WhatsApp",
    color: "bg-green-500",
    icon: MessageSquare,
  },
};

const PII_KEYWORDS = ["BSN", "NIS", "rijksregisternummer", "polis", "IBAN", "geboortedatum"];

function containsPII(text: string): boolean {
  return PII_KEYWORDS.some((keyword) => 
    text.toLowerCase().includes(keyword.toLowerCase())
  );
}

export function ChatMessage({ message, channel, senderRole, timestamp, isCurrentUser }: ChatMessageProps) {
  const config = channelConfig[channel];
  const hasPII = containsPII(message);

  return (
    <div
      className={cn(
        "flex flex-col gap-2 max-w-[80%]",
        isCurrentUser ? "ml-auto items-end" : "mr-auto items-start"
      )}
      role="article"
      aria-label={`Message from ${senderRole} via ${config.label}`}
    >
      {/* Channel Badge */}
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs">
          <config.icon className="h-3 w-3 mr-1" aria-hidden="true" />
          {config.label}
        </Badge>
        <span className="text-xs text-muted-foreground" aria-label={`Sent at ${timestamp}`}>
          {new Date(timestamp).toLocaleTimeString("nl-NL", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>

      {/* PII Warning */}
      {hasPII && (
        <Alert variant="destructive" className="text-xs">
          <AlertTriangle className="h-3 w-3" aria-hidden="true" />
          <AlertDescription>
            ⚠️ Dit bericht bevat mogelijk gevoelige informatie (BSN/NIS/Polis). Deel dit niet via onbeveiligde kanalen.
          </AlertDescription>
        </Alert>
      )}

      {/* Message Bubble */}
      <div
        className={cn(
          "rounded-lg px-4 py-3 shadow-sm",
          isCurrentUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted"
        )}
      >
        <p className="text-sm whitespace-pre-wrap">{message}</p>
      </div>
    </div>
  );
}
