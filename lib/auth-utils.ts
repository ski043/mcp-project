import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";

export async function handleSocialSignIn(provider: "github") {
  try {
    await authClient.signIn.social(
      { provider },
      {
        onSuccess: () => {
          toast.success("Successfully signed in with GitHub");
        },
        onError: (ctx) => {
          toast.error(ctx.error.message ?? "Failed to sign in with GitHub");
        },
      }
    );
  } catch {
    toast.error("Failed to sign in with GitHub");
  }
}
