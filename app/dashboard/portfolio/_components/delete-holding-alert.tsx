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

type DeleteHoldingAlertProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  holding: {
    id: string;
    ticker: string;
    quantity: number;
  };
};

export function DeleteHoldingAlert({
  open,
  onOpenChange,
  holding,
}: DeleteHoldingAlertProps) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation(
    orpc.portfolio.removeHolding.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: orpc.portfolio.get.key() });
        toast.success(`${holding.ticker} removed from portfolio`);
        onOpenChange(false);
      },
      onError: (error) => {
        toast.error(error.message ?? "Failed to remove holding");
      },
    })
  );

  const handleDelete = () => {
    deleteMutation.mutate({ holdingId: holding.id });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove Holding</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to remove {holding.quantity} shares of{" "}
            <span className="font-mono font-semibold">{holding.ticker}</span> from
            your portfolio? This action cannot be undone.
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
                Removing...
              </>
            ) : (
              "Remove Holding"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
