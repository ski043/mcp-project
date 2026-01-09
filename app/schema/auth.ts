import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters long."),
});

export const signupSchema = z.object({
  name: z.string().min(1, "Full name is required."),
  email: z.email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters long."),
});

export type LoginValues = z.infer<typeof loginSchema>;
export type SignupValues = z.infer<typeof signupSchema>;
