"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, ExternalLinkIcon } from "lucide-react";
import { toast } from "sonner";

import { orpc } from "@/lib/orpc";
import { PUBLISH_CHANNELS, type PublishChannel } from "@/lib/reports";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field";

type PublishReportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportId: string;
};

export function PublishReportDialog({
  open,
  onOpenChange,
  reportId,
}: PublishReportDialogProps) {
  const queryClient = useQueryClient();
  const [selectedChannel, setSelectedChannel] = useState<PublishChannel>("email");
  const [authUrl, setAuthUrl] = useState<string | null>(null);

  const publishMutation = useMutation(
    orpc.report.publish.mutationOptions({
      onSuccess: (data) => {
        if (data.status === "authorization_required" && data.authUrl) {
          setAuthUrl(data.authUrl);
          toast.info("Authorization required. Click the link to authorize.");
        } else {
          queryClient.invalidateQueries({ queryKey: orpc.report.list.key() });
          queryClient.invalidateQueries({
            queryKey: orpc.report.get.key({ input: { reportId } }),
          });
          toast.success(`Report published to ${selectedChannel}`);
          onOpenChange(false);
          setAuthUrl(null);
        }
      },
      onError: (error) => {
        toast.error(error.message ?? "Failed to publish report");
      },
    })
  );

  const handlePublish = () => {
    publishMutation.mutate({
      reportId,
      channel: selectedChannel,
      waitForAuth: false,
    });
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setAuthUrl(null);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Publish Report</DialogTitle>
          <DialogDescription>
            Export your report to an external service
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <Field>
            <FieldLabel>Destination</FieldLabel>
            <FieldDescription>
              Select where to publish your report
            </FieldDescription>
            <Select
              value={selectedChannel}
              onValueChange={(v) => setSelectedChannel(v as PublishChannel)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PUBLISH_CHANNELS.map((channel) => (
                  <SelectItem key={channel.id} value={channel.id}>
                    {channel.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {authUrl && (
            <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-950">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                Authorization required. Please authorize access to{" "}
                {selectedChannel === "email"
                  ? "Gmail"
                  : selectedChannel === "notion"
                    ? "Notion"
                    : "Google Docs"}.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => window.open(authUrl, "_blank")}
              >
                <ExternalLinkIcon className="size-4" />
                Authorize
              </Button>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={publishMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handlePublish}
            disabled={publishMutation.isPending}
          >
            {publishMutation.isPending ? (
              <>
                <Loader2 className="animate-spin" />
                Publishing...
              </>
            ) : authUrl ? (
              "Retry Publish"
            ) : (
              "Publish"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
