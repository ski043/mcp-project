"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BriefcaseIcon,
  PlusIcon,
  MoreVerticalIcon,
  PencilIcon,
  TrashIcon,
} from "lucide-react";

import { orpc } from "@/lib/orpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreatePortfolioDialog } from "./_components/create-portfolio-dialog";
import { EditPortfolioDialog } from "./_components/edit-portfolio-dialog";
import { AddHoldingDialog } from "./_components/add-holding-dialog";
import { DeletePortfolioAlert } from "./_components/delete-portfolio-alert";
import { DeleteHoldingAlert } from "./_components/delete-holding-alert";

export default function PortfolioPage() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addHoldingDialogOpen, setAddHoldingDialogOpen] = useState(false);
  const [deletePortfolioAlertOpen, setDeletePortfolioAlertOpen] = useState(false);
  const [deleteHoldingAlert, setDeleteHoldingAlert] = useState<{
    open: boolean;
    holding: { id: string; ticker: string; quantity: number } | null;
  }>({ open: false, holding: null });

  const { data, isLoading } = useQuery(orpc.portfolio.get.queryOptions());

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mb-2 text-muted-foreground">Loading portfolio...</div>
        </div>
      </div>
    );
  }

  const portfolio = data?.portfolio;

  // Empty state - no portfolio exists
  if (!portfolio) {
    return (
      <>
        <div className="flex h-full items-center justify-center p-4">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <BriefcaseIcon />
              </EmptyMedia>
              <EmptyTitle>Create Your Portfolio</EmptyTitle>
              <EmptyDescription>
                Start tracking your investments and get AI-powered portfolio analysis
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={() => setCreateDialogOpen(true)} size="lg">
                <PlusIcon className="size-4" />
                Create Portfolio
              </Button>
            </EmptyContent>
          </Empty>
        </div>

        <CreatePortfolioDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
        />
      </>
    );
  }

  // Portfolio exists - show portfolio content
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{portfolio.name}</h1>
          {portfolio.description && (
            <p className="mt-1 text-muted-foreground">{portfolio.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setAddHoldingDialogOpen(true)}>
            <PlusIcon className="size-4" />
            Add Holding
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="size-9">
                <MoreVerticalIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                <PencilIcon className="mr-2 h-4 w-4" />
                Edit Portfolio
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setDeletePortfolioAlertOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <TrashIcon className="mr-2 h-4 w-4 hover:text-destructive" />
                Delete Portfolio
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Holdings list */}
      {portfolio.holdings && portfolio.holdings.length > 0 ? (
        <Card>
          <CardContent className="p-6">
            <h3 className="mb-4 font-semibold">Holdings ({portfolio.holdings.length})</h3>
            <div className="space-y-2">
              {portfolio.holdings.map((holding) => (
                <div
                  key={holding.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex-1">
                    <div className="font-mono font-semibold">{holding.ticker}</div>
                    <div className="text-sm text-muted-foreground">
                      {holding.quantity} shares @ ${holding.purchasePrice}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-muted-foreground">
                      {new Date(holding.purchaseDate).toLocaleDateString()}
                    </div>
                    <Button
                      variant="destructive"
                      size="icon"

                      onClick={() =>
                        setDeleteHoldingAlert({
                          open: true,
                          holding: {
                            id: holding.id,
                            ticker: holding.ticker,
                            quantity: holding.quantity,
                          },
                        })
                      }
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No Holdings Yet</EmptyTitle>
            <EmptyDescription>
              Add your first stock to get started tracking your investments
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => setAddHoldingDialogOpen(true)}>
              <PlusIcon className="size-4" />
              Add Holding
            </Button>
          </EmptyContent>
        </Empty>
      )}

      {/* Dialogs and Alerts */}
      <EditPortfolioDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        portfolio={{
          id: portfolio.id,
          name: portfolio.name,
          description: portfolio.description,
        }}
      />

      <AddHoldingDialog
        open={addHoldingDialogOpen}
        onOpenChange={setAddHoldingDialogOpen}
      />

      <DeletePortfolioAlert
        open={deletePortfolioAlertOpen}
        onOpenChange={setDeletePortfolioAlertOpen}
        portfolioName={portfolio.name}
      />

      {deleteHoldingAlert.holding && (
        <DeleteHoldingAlert
          open={deleteHoldingAlert.open}
          onOpenChange={(open) =>
            setDeleteHoldingAlert({ open, holding: null })
          }
          holding={deleteHoldingAlert.holding}
        />
      )}
    </div>
  );
}
