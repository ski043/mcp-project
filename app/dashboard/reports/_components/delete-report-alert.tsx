"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { orpc } from "@/lib/orpc";
import { formatDate } from "@/lib/format";
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

type DeleteReportAlertProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: {
    id: string;
    createdAt: Date;
    sentiment: string | null;
  };
  onDeleted?: () => void;
};

export function DeleteReportAlert({
  open,
  onOpenChange,
  report,
  onDeleted,
}: DeleteReportAlertProps) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation(
    orpc.report.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: orpc.report.list.key() });
        toast.success("Report deleted successfully");
        onOpenChange(false);
        onDeleted?.();
      },
      onError: (error) => {
        toast.error(error.message ?? "Failed to delete report");
      },
    })
  );

  const handleDelete = () => {
    deleteMutation.mutate({ reportId: report.id });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Report</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the {report.sentiment ?? "neutral"}{" "}
            report from {formatDate(report.createdAt)}? This action cannot be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMutation.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteMutation.isPending ? (
              <>
                <Loader2 className="animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete Report"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
