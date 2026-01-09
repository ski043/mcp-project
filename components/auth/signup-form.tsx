"use client";

import * as React from "react";
import { useForm } from "@tanstack/react-form";
import { useTransition } from "react";

import { signupSchema } from "@/app/schema/auth";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

export function SignupForm({ ...props }: React.ComponentProps<typeof Card>) {
  const [isEmailPending, startEmailTransition] = useTransition();
  const [isOAuthPending, startOAuthTransition] = useTransition();
  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
    validators: {
      onSubmit: signupSchema,
    },
    onSubmit: async ({ value }) => {
      await authClient.signUp.email({
        name: value.name,
        email: value.email,
        password: value.password,
      });
    },
  });

  const handleSocialSignIn = (provider: "github") => {
    startOAuthTransition(async () => {
      await authClient.signIn.social({ provider });
    });
  };

  return (
    <Card {...props}>
      <CardHeader>
        <CardTitle>Create an account</CardTitle>
        <CardDescription>
          Enter your information below to create your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          id="signup-form"
          onSubmit={(e) => {
            e.preventDefault();
            startEmailTransition(async () => {
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
                    <FieldLabel htmlFor={field.name}>Full Name</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="text"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      placeholder="John Doe"
                      autoComplete="name"
                    />
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                );
              }}
            </form.Field>
            <form.Field name="email">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="email"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      placeholder="m@example.com"
                      autoComplete="email"
                    />
                    <FieldDescription>
                      We&apos;ll use this to contact you. We will not share your
                      email with anyone else.
                    </FieldDescription>
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                );
              }}
            </form.Field>
            <form.Field name="password">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Password</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="password"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      autoComplete="new-password"
                    />
                    <FieldDescription>
                      Must be at least 8 characters long.
                    </FieldDescription>
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                );
              }}
            </form.Field>
            <FieldGroup>
              <Field>
                <Button
                  type="submit"
                  form="signup-form"
                  disabled={isEmailPending || isOAuthPending}
                >
                  {isEmailPending && (
                    <Loader2 className="animate-spin" />
                  )}
                  {isEmailPending ? "Creating account..." : "Create Account"}
                </Button>
                <Button
                  variant="outline"
                  type="button"
                  disabled={isEmailPending || isOAuthPending}
                  onClick={() => handleSocialSignIn("github")}
                >
                  {isOAuthPending && (
                    <Loader2 className="animate-spin" />
                  )}
                  Continue with GitHub
                </Button>
                <FieldDescription className="px-6 text-center">
                  Already have an account? <a href="#">Sign in</a>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
