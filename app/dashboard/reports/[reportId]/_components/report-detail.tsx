"use client";

import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, TrashIcon, ExternalLinkIcon } from "lucide-react";

import { orpc } from "@/lib/orpc";
import { formatDate } from "@/lib/format";
import {
  getSentimentConfig,
  getOutputStatusBadge,
  extractReportTitle,
  stripFirstH1,
} from "@/lib/reports";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MessageResponse } from "@/components/ai-elements/message";
import { DeleteReportAlert } from "../../_components/delete-report-alert";
import { PublishReportDialog } from "../../_components/publish-report-dialog";
import { ReportStreaming } from "./report-streaming";

type ReportDetailProps = {
  reportId: string;
};

export function ReportDetail({ reportId }: ReportDetailProps) {
  const router = useRouter();
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);

  const { data } = useSuspenseQuery(
    orpc.report.get.queryOptions({ input: { reportId } })
  );

  const report = data.report;
  const isGenerating = report.status === "generating";
  const sentimentConfig = getSentimentConfig(report.sentiment);
  const SentimentIcon = sentimentConfig.icon;
  const title = extractReportTitle(report.summary, report.createdAt);

  return (
    <div className="container mx-auto max-w-4xl">
      {/* Header */}
      <div className="mb-8">


        <Link href="/dashboard/reports" className={buttonVariants({ variant: "outline", className: 'mb-4', size: 'sm' })}>
          <ArrowLeftIcon className="size-4" />
          <span>Back to Reports</span>
        </Link>




        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{title}</h1>
              {!isGenerating && (
                <Badge className={sentimentConfig.className}>
                  <SentimentIcon className="size-3" />
                  {sentimentConfig.label}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{formatDate(report.createdAt)}</span>
              <span>·</span>
              <span>{report.model.split("/").pop()}</span>
              {!isGenerating && report.outputs.length > 0 && (
                <>
                  <span>·</span>
                  {report.outputs.map((output) => (
                    <Badge
                      key={output.id}
                      variant={getOutputStatusBadge(output.status)}
                      className="text-xs capitalize"
                    >
                      {output.type}
                      {output.url && (
                        <a
                          href={output.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLinkIcon className="size-3 ml-1" />
                        </a>
                      )}
                    </Badge>
                  ))}
                </>
              )}
            </div>
          </div>

          {!isGenerating && (
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPublishDialogOpen(true)}
              >
                <ExternalLinkIcon className="size-4" />
                Publish
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteAlertOpen(true)}
              >
                <TrashIcon className="size-4" />
                Delete
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Report Content */}
      {isGenerating ? (
        <ReportStreaming reportId={reportId} />
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="prose prose-neutral dark:prose-invert max-w-none">
              <MessageResponse>{stripFirstH1(report.summary)}</MessageResponse>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <DeleteReportAlert
        open={deleteAlertOpen}
        onOpenChange={setDeleteAlertOpen}
        report={{
          id: report.id,
          createdAt: report.createdAt,
          sentiment: report.sentiment,
        }}
        onDeleted={() => router.push("/dashboard/reports")}
      />

      <PublishReportDialog
        open={publishDialogOpen}
        onOpenChange={setPublishDialogOpen}
        reportId={report.id}
      />
    </div>
  );
}
