"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { orpc } from "@/lib/orpc";
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

type DeletePortfolioAlertProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  portfolioName: string;
};

export function DeletePortfolioAlert({
  open,
  onOpenChange,
  portfolioName,
}: DeletePortfolioAlertProps) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation(
    orpc.portfolio.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: orpc.portfolio.get.key() });
        toast.success("Portfolio deleted successfully");
        onOpenChange(false);
      },
      onError: (error) => {
        toast.error(error.message ?? "Failed to delete portfolio");
      },
    })
  );

  const handleDelete = () => {
    deleteMutation.mutate({});
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Portfolio</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete &quot;{portfolioName}&quot;? This will
            permanently delete your portfolio and all holdings. This action cannot
            be undone.
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
              "Delete Portfolio"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
