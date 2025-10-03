import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordRequirementsProps {
  password: string;
  className?: string;
}

export const PasswordRequirements = ({ password, className }: PasswordRequirementsProps) => {
  const hasMinLength = password.length >= 12;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  const characterTypes = [hasUppercase, hasLowercase, hasDigit, hasSpecial].filter(Boolean).length;
  const hasEnoughTypes = characterTypes >= 3;

  const requirements = [
    { text: "Minimaal 12 tekens", met: hasMinLength },
    { text: "Minimaal 3 van de volgende:", met: hasEnoughTypes, isHeader: true },
    { text: "  • Hoofdletters (A-Z)", met: hasUppercase, isIndented: true },
    { text: "  • Kleine letters (a-z)", met: hasLowercase, isIndented: true },
    { text: "  • Cijfers (0-9)", met: hasDigit, isIndented: true },
    { text: "  • Speciale tekens (!@#$%...)", met: hasSpecial, isIndented: true },
  ];

  if (!password) return null;

  return (
    <div className={cn("space-y-1 text-sm", className)}>
      {requirements.map((req, index) => (
        <div 
          key={index} 
          className={cn(
            "flex items-start gap-2",
            req.isHeader && "font-medium mt-2",
            req.isIndented && "ml-2"
          )}
        >
          {!req.isHeader && (
            req.met ? (
              <Check className="h-4 w-4 text-success flex-shrink-0 mt-0.5" />
            ) : (
              <X className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            )
          )}
          <span className={cn(
            req.met && !req.isHeader ? "text-success" : "text-muted-foreground"
          )}>
            {req.text}
          </span>
        </div>
      ))}
    </div>
  );
};
