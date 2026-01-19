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
import { Textarea } from "@/components/ui/textarea";
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldGroup,
} from "@/components/ui/field";
import { updatePortfolioSchema } from "@/app/schemas/portfolio";

type EditPortfolioDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  portfolio: {
    id: string;
    name: string;
    description: string | null;
  };
};

export function EditPortfolioDialog({
  open,
  onOpenChange,
  portfolio,
}: EditPortfolioDialogProps) {
  const [isPending, startTransition] = useTransition();
  const queryClient = useQueryClient();

  const updateMutation = useMutation(
    orpc.portfolio.update.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: orpc.portfolio.get.key() });
        toast.success("Portfolio updated successfully");
        onOpenChange(false);
        form.reset();
      },
      onError: (error) => {
        toast.error(error.message ?? "Failed to update portfolio");
      },
    })
  );

  const form = useForm({
    defaultValues: {
      name: portfolio.name,
      description: portfolio.description ?? "",
    },
    validators: {
      onSubmit: updatePortfolioSchema,
    },
    onSubmit: async ({ value }) => {
      updateMutation.mutate({
        name: value.name,
        description: value.description,
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Portfolio</DialogTitle>
          <DialogDescription>
            Update your portfolio name and description
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
            <form.Field name="name">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Portfolio Name</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      placeholder="My Investment Portfolio"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      disabled={isPending || updateMutation.isPending}
                    />
                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                  </Field>
                );
              }}
            </form.Field>

            <form.Field name="description">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>
                      Description
                    </FieldLabel>
                    <FieldDescription>
                      Add a brief description of your portfolio strategy or goals
                    </FieldDescription>
                    <Textarea
                      id={field.name}
                      name={field.name}
                      placeholder="Long-term growth portfolio focused on technology..."
                      value={field.state.value ?? ""}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      disabled={isPending || updateMutation.isPending}
                      rows={3}
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
                disabled={isPending || updateMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending || updateMutation.isPending}
              >
                {isPending || updateMutation.isPending ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
