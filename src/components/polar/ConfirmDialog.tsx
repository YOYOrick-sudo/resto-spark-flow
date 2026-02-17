import * as React from "react";
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
import { cn } from "@/lib/utils";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Spinner } from "./LoadingStates";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onConfirmWithReason?: (reason: string) => void;
  variant?: "default" | "destructive";
  isLoading?: boolean;
  showReasonField?: boolean;
  reasonPlaceholder?: string;
  reasonRequired?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Bevestigen",
  cancelLabel = "Annuleren",
  onConfirm,
  onConfirmWithReason,
  variant = "default",
  isLoading = false,
  showReasonField = false,
  reasonPlaceholder = "Reden (optioneel)",
  reasonRequired = false,
}: ConfirmDialogProps) {
  const [reason, setReason] = React.useState("");

  React.useEffect(() => {
    if (!open) setReason("");
  }, [open]);

  const handleConfirm = () => {
    if (showReasonField && onConfirmWithReason) {
      onConfirmWithReason(reason);
    } else {
      onConfirm();
    }
  };

  const confirmDisabled = isLoading || (showReasonField && reasonRequired && !reason.trim());

  const Icon = variant === "destructive" ? Trash2 : AlertTriangle;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-start gap-4">
            <div
              className={cn(
                "flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full",
                variant === "destructive"
                  ? "bg-destructive/10"
                  : "bg-warning/10"
              )}
            >
              <Icon
                className={cn(
                  "h-6 w-6",
                  variant === "destructive"
                    ? "text-destructive"
                    : "text-warning"
                )}
              />
            </div>
            <div className="flex-1 pt-1">
              <AlertDialogTitle className="text-lg font-semibold">
                {title}
              </AlertDialogTitle>
              <AlertDialogDescription className="mt-2 text-sm text-muted-foreground">
                {description}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        {showReasonField && (
          <div className="mt-4">
            <textarea
              className="w-full rounded-button border-[1.5px] border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 focus-visible:!border-primary disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px] resize-none"
              placeholder={reasonPlaceholder}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isLoading}
            />
          </div>
        )}
        <AlertDialogFooter className="mt-6">
          <AlertDialogCancel disabled={isLoading}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={confirmDisabled}
            className={cn(
              variant === "destructive" &&
                "bg-destructive text-destructive-foreground hover:bg-destructive/90"
            )}
          >
            {isLoading ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Bezig...
              </>
            ) : (
              confirmLabel
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
