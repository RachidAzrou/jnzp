import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertCircle } from "lucide-react";

interface AdvisoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: string;
  checklistItems?: string[];
  onConfirm: () => void;
  onCancel?: () => void;
}

export function AdvisoryDialog({
  open,
  onOpenChange,
  title,
  message,
  checklistItems,
  onConfirm,
  onCancel,
}: AdvisoryDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-warning" />
            <AlertDialogTitle>{title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-3 pt-2">
            <p>{message}</p>
            
            {checklistItems && checklistItems.length > 0 && (
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <p className="text-sm font-medium text-foreground">Controleer of je het volgende hebt:</p>
                <ul className="space-y-1 text-sm">
                  {checklistItems.map((item, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-muted-foreground mt-0.5">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <p className="text-xs text-muted-foreground italic">
              Dit is een advies. Je kunt doorgaan zonder alles te hebben voltooid.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>
            Nog niet klaar
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Bevestigen en doorgaan
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
