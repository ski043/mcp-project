"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { orpc } from "@/lib/orpc";
import { AVAILABLE_MODELS } from "@/lib/ai-models";
import { OUTPUT_CHANNELS, type OutputChannel } from "@/lib/reports";
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
import { Toggle } from "@/components/ui/toggle";

type GenerateReportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function GenerateReportDialog({
  open,
  onOpenChange,
}: GenerateReportDialogProps) {
  const router = useRouter();
  const [selectedModel, setSelectedModel] = useState<string>(AVAILABLE_MODELS[0].id);
  const [selectedChannels, setSelectedChannels] = useState<OutputChannel[]>([
    "dashboard",
  ]);

  const initiateMutation = useMutation(
    orpc.report.initiate.mutationOptions({
      onSuccess: (data) => {
        // Redirect to report page where streaming will happen
        onOpenChange(false);
        setSelectedChannels(["dashboard"]);
        router.push(`/dashboard/reports/${data.reportId}`);
      },
      onError: (error) => {
        toast.error(error.message ?? "Failed to initiate report");
      },
    })
  );

  const toggleChannel = (channel: OutputChannel) => {
    setSelectedChannels((prev) =>
      prev.includes(channel)
        ? prev.filter((c) => c !== channel)
        : [...prev, channel]
    );
  };

  const handleGenerate = () => {
    if (selectedChannels.length === 0) {
      toast.error("Select at least one output channel");
      return;
    }
    initiateMutation.mutate({
      model: selectedModel,
      outputChannels: selectedChannels,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Generate Report</DialogTitle>
          <DialogDescription>
            Generate an AI-powered analysis of your portfolio
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <Field>
            <FieldLabel>AI Model</FieldLabel>
            <FieldDescription>
              Select the model to generate your report
            </FieldDescription>
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_MODELS.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel>Output Channels</FieldLabel>
            <FieldDescription>
              Where to publish your report
            </FieldDescription>
            <div className="flex flex-wrap gap-2 mt-2">
              {OUTPUT_CHANNELS.map((channel) => (
                <Toggle
                  key={channel.id}
                  pressed={selectedChannels.includes(channel.id)}
                  onPressedChange={() => toggleChannel(channel.id)}
                  variant="outline"
                  className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                >
                  {channel.label}
                </Toggle>
              ))}
            </div>
          </Field>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={initiateMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={initiateMutation.isPending || selectedChannels.length === 0}
          >
            {initiateMutation.isPending ? (
              <>
                <Loader2 className="animate-spin" />
                Preparing...
              </>
            ) : (
              "Generate Report"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
