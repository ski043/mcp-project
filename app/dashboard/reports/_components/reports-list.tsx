"use client";

import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  FileTextIcon,
  PlusIcon,
  MoreVerticalIcon,
  TrashIcon,
  ExternalLinkIcon,
  EyeIcon,
} from "lucide-react";

import { orpc } from "@/lib/orpc";
import { formatDate } from "@/lib/format";
import {
  getOutputStatusBadge,
  groupReportsByDate,
  extractReportTitle,
  stripMarkdown,
  SUMMARY_PREVIEW_LENGTH,
} from "@/lib/reports";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GenerateReportDialog } from "./generate-report-dialog";
import { DeleteReportAlert } from "./delete-report-alert";
import { PublishReportDialog } from "./publish-report-dialog";


export function ReportsList() {
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [deleteAlert, setDeleteAlert] = useState<{
    open: boolean;
    report: { id: string; createdAt: Date; sentiment: string | null } | null;
  }>({ open: false, report: null });
  const [publishDialog, setPublishDialog] = useState<{
    open: boolean;
    reportId: string | null;
  }>({ open: false, reportId: null });

  const { data } = useSuspenseQuery(orpc.report.list.queryOptions());

  const reports = data.reports;
  const groupedReports = groupReportsByDate(reports);

  // Empty state
  if (reports.length === 0) {
    return (
      <>
        <div className="flex h-full items-center justify-center p-4">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FileTextIcon />
              </EmptyMedia>
              <EmptyTitle>No Reports Yet</EmptyTitle>
              <EmptyDescription>
                Generate your first AI-powered portfolio analysis report
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={() => setGenerateDialogOpen(true)} size="lg">
                <PlusIcon className="size-4" />
                Generate Report
              </Button>
            </EmptyContent>
          </Empty>
        </div>

        <GenerateReportDialog
          open={generateDialogOpen}
          onOpenChange={setGenerateDialogOpen}
        />
      </>
    );
  }

  return (
    <div className="container mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground">
            AI-generated portfolio analysis reports
          </p>
        </div>
        <Button onClick={() => setGenerateDialogOpen(true)}>
          <PlusIcon className="size-4" />
          Generate Report
        </Button>
      </div>

      {/* Reports List */}
      <div className="space-y-8">
        {groupedReports.map((group) => (
          <div key={group.title} className="space-y-4">
            <h2 className="text-sm font-medium text-muted-foreground">
              {group.title}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {group.reports.map((report) => {
                const title = extractReportTitle(
                  report.summary,
                  report.createdAt
                );
                const preview = stripMarkdown(report.summary).slice(
                  0,
                  SUMMARY_PREVIEW_LENGTH
                );

                return (
                  <Card key={report.id}>
                    <CardContent className="p-4 flex flex-col h-full">
                      {/* Header with title and menu */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <Link
                          href={`/dashboard/reports/${report.id}`}
                          className="font-semibold text-base leading-tight hover:underline line-clamp-2 flex-1"
                        >
                          {title}
                        </Link>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              className="size-7 shrink-0 -mr-2 -mt-1"
                            >
                              <MoreVerticalIcon className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/reports/${report.id}`}>
                                <EyeIcon className="size-4" />
                                View Report
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                setPublishDialog({
                                  open: true,
                                  reportId: report.id,
                                })
                              }
                            >
                              <ExternalLinkIcon className="size-4" />
                              Publish to Channel
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() =>
                                setDeleteAlert({
                                  open: true,
                                  report: {
                                    id: report.id,
                                    createdAt: report.createdAt,
                                    sentiment: report.sentiment,
                                  },
                                })
                              }
                              className="text-destructive focus:text-destructive"
                            >
                              <TrashIcon className="size-4" />
                              Delete Report
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Metadata */}
                      <p className="text-xs text-muted-foreground mb-2">
                        {formatDate(report.createdAt)} · {report.model.split("/").pop()}
                      </p>

                      {/* Preview */}
                      <p className="text-sm text-muted-foreground line-clamp-3 flex-1 mb-3">
                        {preview || "No content yet..."}
                      </p>

                      {/* Output Channels */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {report.outputs.map((output) => (
                          <Badge
                            key={output.id}
                            variant={getOutputStatusBadge(output.status)}
                            className="text-[10px] px-1.5 py-0 h-5 capitalize"
                          >
                            {output.type}
                            {output.status === "sent" && output.url && (
                              <ExternalLinkIcon className="size-2.5 ml-0.5" />
                            )}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Dialogs */}
      <GenerateReportDialog
        open={generateDialogOpen}
        onOpenChange={setGenerateDialogOpen}
      />

      {deleteAlert.report && (
        <DeleteReportAlert
          open={deleteAlert.open}
          onOpenChange={(open) => setDeleteAlert({ open, report: null })}
          report={deleteAlert.report}
        />
      )}

      {publishDialog.reportId && (
        <PublishReportDialog
          open={publishDialog.open}
          onOpenChange={(open) => setPublishDialog({ open, reportId: null })}
          reportId={publishDialog.reportId}
        />
      )}
    </div>
  );
}
