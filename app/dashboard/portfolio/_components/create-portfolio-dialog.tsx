"use client";

import { useState, useTransition } from "react";
import { z } from "zod";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BriefcaseIcon, Loader2, SparklesIcon } from "lucide-react";
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
import { Card, CardContent } from "@/components/ui/card";
import { createPortfolioSchema } from "@/app/schemas/portfolio";

type CreatePortfolioDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const defaultValues: z.input<typeof createPortfolioSchema> = {
  name: "",
  description: "",
  isDemo: false,
};

export function CreatePortfolioDialog({
  open,
  onOpenChange,
}: CreatePortfolioDialogProps) {
  const [mode, setMode] = useState<"select" | "demo" | "personal">("select");
  const [isPending, startTransition] = useTransition();
  const queryClient = useQueryClient();

  const createMutation = useMutation(
    orpc.portfolio.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: orpc.portfolio.get.key() });
        toast.success("Portfolio created successfully");
        onOpenChange(false);
        setMode("select");
        form.reset();
      },
      onError: (error) => {
        toast.error(error.message ?? "Failed to create portfolio");
      },
    })
  );

  const form = useForm({
    defaultValues,
    validators: {
      onSubmit: createPortfolioSchema,
    },
    onSubmit: async ({ value }) => {
      createMutation.mutate({
        name: value.name,
        description: value.description,
        isDemo: false,
      });
    },
  });

  const handleDemoCreate = () => {
    startTransition(() => {
      createMutation.mutate({
        name: "Demo Portfolio",
        description: "Pre-populated demo portfolio with sample tech stocks",
        isDemo: true,
      });
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create Your Portfolio</DialogTitle>
          <DialogDescription>
            Choose how you&rsquo;d like to get started with portfolio tracking
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {mode === "select" && (
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Demo Portfolio Option */}
              <Card
                className="cursor-pointer transition-all hover:border-primary hover:shadow-md"
                onClick={() => setMode("demo")}
              >
                <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                  <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-primary/10">
                    <SparklesIcon className="size-6 text-primary" />
                  </div>
                  <h3 className="mb-2 font-semibold">Demo Portfolio</h3>
                  <p className="text-sm text-muted-foreground">
                    Get started instantly with 5 sample tech stocks
                  </p>
                </CardContent>
              </Card>

              {/* Personal Portfolio Option */}
              <Card
                className="cursor-pointer transition-all hover:border-primary hover:shadow-md"
                onClick={() => setMode("personal")}
              >
                <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                  <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-primary/10">
                    <BriefcaseIcon className="size-6 text-primary" />
                  </div>
                  <h3 className="mb-2 font-semibold">Personal Portfolio</h3>
                  <p className="text-sm text-muted-foreground">
                    Start from scratch and add your own holdings
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {mode === "demo" && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/50 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <SparklesIcon className="size-5 text-primary" />
                  <h4 className="font-semibold">Demo Portfolio</h4>
                </div>
                <p className="mb-3 text-sm text-muted-foreground">
                  Your demo portfolio will include these holdings:
                </p>
                <ul className="space-y-1 text-sm">
                  <li>• 50 shares of AAPL (Apple)</li>
                  <li>• 20 shares of GOOGL (Alphabet)</li>
                  <li>• 30 shares of MSFT (Microsoft)</li>
                  <li>• 15 shares of TSLA (Tesla)</li>
                  <li>• 25 shares of NVDA (NVIDIA)</li>
                </ul>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setMode("select")}
                  disabled={isPending || createMutation.isPending}
                >
                  Back
                </Button>
                <Button
                  onClick={handleDemoCreate}
                  disabled={isPending || createMutation.isPending}
                >
                  {isPending || createMutation.isPending ? (
                    <>
                      <Loader2 className="animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Demo Portfolio"
                  )}
                </Button>
              </div>
            </div>
          )}

          {mode === "personal" && (
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
                          disabled={isPending || createMutation.isPending}
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
                          disabled={isPending || createMutation.isPending}
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
                    onClick={() => setMode("select")}
                    disabled={isPending || createMutation.isPending}
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={isPending || createMutation.isPending}
                  >
                    {isPending || createMutation.isPending ? (
                      <>
                        <Loader2 className="animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Portfolio"
                    )}
                  </Button>
                </div>
              </FieldGroup>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
