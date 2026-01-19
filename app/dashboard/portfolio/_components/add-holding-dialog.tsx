"use client";

import { useTransition } from "react";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { orpc } from "@/lib/orpc";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldGroup,
} from "@/components/ui/field";
import { addHoldingSchema } from "@/app/schemas/portfolio";

type AddHoldingDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AddHoldingDialog({
  open,
  onOpenChange,
}: AddHoldingDialogProps) {
  const [isPending, startTransition] = useTransition();
  const queryClient = useQueryClient();

  const addMutation = useMutation(
    orpc.portfolio.addHolding.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: orpc.portfolio.get.key() });
        toast.success("Holding added successfully");
        onOpenChange(false);
        form.reset();
      },
      onError: (error) => {
        toast.error(error.message ?? "Failed to add holding");
      },
    })
  );

  const form = useForm({
    defaultValues: {
      ticker: "",
      quantity: 0,
      purchasePrice: 0,
      purchaseDate: "",
    },
    validators: {
      onSubmit: addHoldingSchema,
    },
    onSubmit: async ({ value }) => {
      addMutation.mutate({
        ticker: value.ticker,
        quantity: value.quantity,
        purchasePrice: value.purchasePrice,
        purchaseDate: value.purchaseDate,
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Holding</DialogTitle>
          <DialogDescription>
            Add a new stock to your portfolio
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              await form.handleSubmit();
            });
          }}
        >
          <FieldGroup>
            <form.Field name="ticker">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Ticker Symbol</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      placeholder="AAPL"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) =>
                        field.handleChange(e.target.value.toUpperCase())
                      }
                      aria-invalid={isInvalid}
                      disabled={isPending || addMutation.isPending}
                    />
                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                  </Field>
                );
              }}
            </form.Field>

            <form.Field name="quantity">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Quantity</FieldLabel>
                    <FieldDescription>Number of shares</FieldDescription>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="10"
                      value={field.state.value || ""}
                      onBlur={field.handleBlur}
                      onChange={(e) =>
                        field.handleChange(parseFloat(e.target.value) || 0)
                      }
                      aria-invalid={isInvalid}
                      disabled={isPending || addMutation.isPending}
                    />
                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                  </Field>
                );
              }}
            </form.Field>

            <form.Field name="purchasePrice">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Purchase Price</FieldLabel>
                    <FieldDescription>Price per share in USD</FieldDescription>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="150.00"
                      value={field.state.value || ""}
                      onBlur={field.handleBlur}
                      onChange={(e) =>
                        field.handleChange(parseFloat(e.target.value) || 0)
                      }
                      aria-invalid={isInvalid}
                      disabled={isPending || addMutation.isPending}
                    />
                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                  </Field>
                );
              }}
            </form.Field>

            <form.Field name="purchaseDate">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Purchase Date</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="date"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      disabled={isPending || addMutation.isPending}
                    />
                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                  </Field>
                );
              }}
            </form.Field>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending || addMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending || addMutation.isPending}
              >
                {isPending || addMutation.isPending ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Holding"
                )}
              </Button>
            </div>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
