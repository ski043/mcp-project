import Arcade from "@arcadeai/arcadejs";
import { z } from "zod";

import { env } from "@/lib/env";
import { authorized } from "../middlewares/auth";

const arcadeClient = new Arcade({ apiKey: env.ARCADE_API_KEY });

type ArcadeNoAuthResponse = {
  tool: string;
  keywords: string;
  results: unknown[];
  raw: unknown;
};

type ArcadeOAuthResponse =
  | {
      status: "authorization_required";
      tool: string;
      authId?: string;
      authUrl?: string;
    }
  | {
      status: "completed";
      tool: string;
      document: Record<string, unknown> | null;
    };

export const arcadeNoAuthTest = authorized
  .route({
    path: "/arcade-test/no-auth",
    method: "POST",
    summary: "Arcade test: no-auth Google News search",
  })
  .input(
    z.object({
      keywords: z.string().min(1).optional(),
    })
  )
  .handler(async ({ context, input }) => {
    const userId = context.user.email ?? context.user.id;
    const keywords = input.keywords ?? "MCP URL mode elicitation";

    const response = await arcadeClient.tools.execute({
      tool_name: "GoogleNews.SearchNewsStories",
      input: { keywords },
      user_id: userId,
    });

    const output = response.output?.value as
      | { news_results?: unknown[] }
      | undefined;

    const payload: ArcadeNoAuthResponse = {
      tool: "GoogleNews.SearchNewsStories",
      keywords,
      results: output?.news_results ?? [],
      raw: output ?? null,
    };

    return payload;
  });

export const arcadeOAuthDocTest = authorized
  .route({
    path: "/arcade-test/oauth-doc",
    method: "POST",
    summary: "Arcade test: OAuth Google Docs create",
  })
  .input(
    z.object({
      title: z.string().min(1).optional(),
      text: z.string().min(1).optional(),
      waitForAuth: z.boolean().optional().default(false),
    })
  )
  .handler(async ({ context, input }) => {
    const userId = context.user.email ?? context.user.id;
    const toolName = "GoogleDocs.CreateDocumentFromText";

    const authResponse = await arcadeClient.tools.authorize({
      tool_name: toolName,
      user_id: userId,
    });

    if (authResponse.status !== "completed") {
      if (!input.waitForAuth) {
        const payload: ArcadeOAuthResponse = {
          status: "authorization_required",
          tool: toolName,
          authId: authResponse.id,
          authUrl: authResponse.url,
        };

        return payload;
      }

      await arcadeClient.auth.waitForCompletion(authResponse);
    }

    const title = input.title ?? "Arcade OAuth Test";
    const text =
      input.text ??
      `Arcade OAuth test document for ${userId} at ${new Date().toISOString()}`;

    const response = await arcadeClient.tools.execute({
      tool_name: toolName,
      input: {
        title,
        text_content: text,
      },
      user_id: userId,
    });

    const document = (response.output?.value ??
      null) as Record<string, unknown> | null;

    const payload: ArcadeOAuthResponse = {
      status: "completed",
      tool: toolName,
      document,
    };

    return payload;
  });
