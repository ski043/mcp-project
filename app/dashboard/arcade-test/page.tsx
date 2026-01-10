"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { orpc } from "@/lib/orpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

function isArcadeOAuthResponse(data: unknown): data is ArcadeOAuthResponse {
  if (!data || typeof data !== "object") return false;
  const obj = data as { status?: unknown };
  return (
    obj.status === "authorization_required" || obj.status === "completed"
  );
}

function toNewsItem(item: unknown) {
  if (!item || typeof item !== "object") return null;
  const obj = item as Record<string, unknown>;
  const title = typeof obj.title === "string" ? obj.title : null;
  const source = typeof obj.source === "string" ? obj.source : null;
  const link = typeof obj.link === "string" ? obj.link : null;
  if (!title && !source && !link) return null;
  return { title, source, link };
}

export default function ArcadeTestPage() {
  const [keywords, setKeywords] = useState("MCP URL mode elicitation");
  const [noAuthResponse, setNoAuthResponse] =
    useState<ArcadeNoAuthResponse | null>(null);

  const [docTitle, setDocTitle] = useState("Arcade OAuth Test");
  const [docText, setDocText] = useState("");
  const [oauthResponse, setOauthResponse] =
    useState<ArcadeOAuthResponse | null>(null);

  const noAuthMutation = useMutation(
    orpc.arcadeTest.noAuth.mutationOptions({
      onSuccess: (data) => setNoAuthResponse(data),
      onError: (error) => {
        toast.error("No-auth test failed", {
          description: getErrorMessage(error),
        });
      },
    })
  );

  const oauthMutation = useMutation(
    orpc.arcadeTest.oauthDoc.mutationOptions({
      onSuccess: (data) => {
        if (isArcadeOAuthResponse(data)) {
          setOauthResponse(data);
          return;
        }

        toast.error("OAuth test returned unexpected data");
      },
      onError: (error) => {
        toast.error("OAuth test failed", {
          description: getErrorMessage(error),
        });
      },
    })
  );

  const handleNoAuthTest = () => {
    setNoAuthResponse(null);
    noAuthMutation.mutate({
      keywords: keywords.trim() || undefined,
    });
  };

  const handleOAuthTest = () => {
    setOauthResponse(null);
    oauthMutation.mutate({
      title: docTitle.trim() || undefined,
      text: docText.trim() || undefined,
    });
  };

  const newsItems = Array.isArray(noAuthResponse?.results)
    ? noAuthResponse?.results
    : [];
  const authUrl =
    oauthResponse?.status === "authorization_required" &&
    typeof oauthResponse.authUrl === "string"
      ? oauthResponse.authUrl
      : null;
  const documentUrl =
    oauthResponse?.status === "completed" &&
    typeof oauthResponse.document?.documentUrl === "string"
      ? oauthResponse.document.documentUrl
      : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Arcade Test</h1>
        <p className="text-sm text-muted-foreground">
          Run quick Arcade tool checks before wiring agents or custom MCPs.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>No-auth tool</CardTitle>
              <Badge variant="secondary">
                {noAuthMutation.isPending
                  ? "running"
                  : noAuthResponse
                    ? "done"
                    : "idle"}
              </Badge>
            </div>
            <CardDescription>
              Calls Google News without OAuth to verify the Arcade key.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Keywords
              </label>
              <Input
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="Search keywords"
              />
            </div>
            {newsItems.length > 0 ? (
              <div className="space-y-2 rounded-lg border bg-muted/40 p-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Top results
                </p>
                <div className="space-y-2">
                  {newsItems.slice(0, 5).map((item, index) => {
                    const parsed = toNewsItem(item);
                    if (!parsed) return null;
                    return (
                      <div key={index} className="text-sm">
                        <p className="font-medium">
                          {parsed.source ? `${parsed.source} — ` : ""}
                          {parsed.title ?? "Untitled"}
                        </p>
                        {parsed.link ? (
                          <Link
                            href={parsed.link}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-muted-foreground underline underline-offset-4"
                          >
                            {parsed.link}
                          </Link>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
            {noAuthResponse ? (
              <div className="rounded-lg border bg-muted/40 p-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Raw output
                </p>
                <pre className="mt-2 max-h-64 overflow-auto text-xs leading-relaxed text-foreground/80">
                  {JSON.stringify(noAuthResponse.raw, null, 2)}
                </pre>
              </div>
            ) : null}
          </CardContent>
          <CardFooter>
            <Button
              onClick={handleNoAuthTest}
              disabled={noAuthMutation.isPending}
            >
              {noAuthMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Running...
                </>
              ) : (
                "Run no-auth test"
              )}
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>OAuth tool</CardTitle>
              <Badge variant="secondary">
                {oauthMutation.isPending
                  ? "running"
                  : oauthResponse
                    ? "done"
                    : "idle"}
              </Badge>
            </div>
            <CardDescription>
              Creates a Google Doc. You will be prompted to authorize once.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Document title
              </label>
              <Input
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                placeholder="Arcade OAuth Test"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Document text
              </label>
              <Textarea
                value={docText}
                onChange={(e) => setDocText(e.target.value)}
                placeholder="Write some content for the Google Doc."
                rows={4}
              />
            </div>
            {authUrl ? (
              <div className="rounded-lg border border-dashed bg-muted/30 p-3 text-sm">
                <p className="text-xs text-muted-foreground">
                  Authorization required. Open the link, complete OAuth, then
                  run the test again.
                </p>
                <Button asChild variant="outline" size="sm" className="mt-2">
                  <Link href={authUrl} target="_blank" rel="noreferrer">
                    Authorize Google Docs
                    <ExternalLink className="ml-2 size-4" />
                  </Link>
                </Button>
              </div>
            ) : null}
            {documentUrl ? (
              <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                <p className="text-xs font-medium text-muted-foreground">
                  Document created
                </p>
                <Link
                  href={documentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm underline underline-offset-4"
                >
                  {documentUrl}
                </Link>
              </div>
            ) : null}
            {oauthResponse?.status === "completed" ? (
              <div className="rounded-lg border bg-muted/40 p-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Raw output
                </p>
                <pre className="mt-2 max-h-64 overflow-auto text-xs leading-relaxed text-foreground/80">
                  {JSON.stringify(oauthResponse.document, null, 2)}
                </pre>
              </div>
            ) : null}
          </CardContent>
          <CardFooter>
            <Button
              onClick={handleOAuthTest}
              disabled={oauthMutation.isPending}
            >
              {oauthMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Running...
                </>
              ) : (
                "Run OAuth test"
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
