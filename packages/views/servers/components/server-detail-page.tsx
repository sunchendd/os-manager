"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, Cpu, HardDrive, MemoryStick, PencilLine, RefreshCcw, Server as ServerIcon, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { serverDetailOptions, serverMetricsOptions, serverRelatedIssuesOptions, useDeleteServer, useRefreshServerMetrics, useUpdateServer } from "@multica/core/servers";
import type { ServerMetricSnapshot } from "@multica/core/types";
import { useWorkspaceId } from "@multica/core/hooks";
import { useWorkspacePaths } from "@multica/core/paths";
import { AppLink, useNavigation } from "../../navigation";
import { PageHeader } from "../../layout/page-header";
import { Skeleton } from "@multica/ui/components/ui/skeleton";
import { Button } from "@multica/ui/components/ui/button";
import { Badge } from "@multica/ui/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@multica/ui/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@multica/ui/components/ui/alert-dialog";
import { ServerForm } from "./server-form";

function formatTimestamp(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function MetricCard({
  title,
  description,
  value,
  icon,
}: {
  title: string;
  description: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <span className="text-muted-foreground">{icon}</span>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tabular-nums">{value.toFixed(1)}%</div>
      </CardContent>
    </Card>
  );
}

function metricsToCards(metrics: ServerMetricSnapshot) {
  return [
    {
      key: "cpu",
      title: "CPU Idle",
      description: "Current free compute headroom",
      value: metrics.cpu_idle_percent,
      icon: <Cpu className="h-4 w-4" />,
    },
    {
      key: "memory",
      title: "Memory Free",
      description: "Available system memory",
      value: metrics.memory_free_percent,
      icon: <MemoryStick className="h-4 w-4" />,
    },
    {
      key: "disk",
      title: "Disk Free",
      description: "Remaining storage capacity",
      value: metrics.disk_free_percent,
      icon: <HardDrive className="h-4 w-4" />,
    },
    {
      key: "gpu",
      title: "GPU Free",
      description: "Available accelerator capacity",
      value: metrics.gpu_free_percent,
      icon: <Activity className="h-4 w-4" />,
    },
  ];
}

export function ServerDetailPage({ serverId }: { serverId: string }) {
  const wsId = useWorkspaceId();
  const wsPaths = useWorkspacePaths();
  const router = useNavigation();
  const { data: server, isLoading } = useQuery(serverDetailOptions(wsId, serverId));
  const { data: metrics, isLoading: metricsLoading } = useQuery(serverMetricsOptions(wsId, serverId));
  const { data: relatedIssues, isLoading: relatedIssuesLoading } = useQuery(serverRelatedIssuesOptions(wsId, serverId));

  const updateServer = useUpdateServer();
  const deleteServer = useDeleteServer();
  const refreshMetrics = useRefreshServerMetrics();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const metricCards = useMemo(() => (metrics ? metricsToCards(metrics) : []), [metrics]);

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-56" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-32 w-full" />
          ))}
        </div>
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  if (!server) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
        <ServerIcon className="h-10 w-10 opacity-30" />
        <p className="text-sm">Server not found</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader className="justify-between px-5">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg border bg-background text-muted-foreground">
            <ServerIcon className="h-4 w-4" />
          </span>
          <div>
            <h1 className="text-sm font-medium">{server.name}</h1>
            <p className="text-xs text-muted-foreground">{server.host}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              refreshMetrics.mutate(server.id, {
                onSuccess: () => toast.success("Metrics refreshed"),
                onError: () => toast.error("Failed to refresh metrics"),
              });
            }}
            disabled={refreshMetrics.isPending}
          >
            <RefreshCcw className="mr-1 h-3.5 w-3.5" />
            {refreshMetrics.isPending ? "Refreshing..." : "Refresh"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
            <PencilLine className="mr-1 h-3.5 w-3.5" />
            Edit
          </Button>
          <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="mr-1 h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      </PageHeader>

      <div className="flex-1 space-y-6 overflow-y-auto p-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metricsLoading || !metrics ? Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-32 w-full" />
          )) : metricCards.map((card) => (
            <MetricCard key={card.key} title={card.title} description={card.description} value={card.value} icon={card.icon} />
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Connection</CardTitle>
              <CardDescription>Inventory metadata used to target ops workflows.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="text-xs text-muted-foreground">Host</div>
                <div className="mt-1 text-sm font-medium">{server.host}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Environment</div>
                <div className="mt-1 text-sm font-medium">{server.environment || "—"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">SSH Username</div>
                <div className="mt-1 text-sm font-medium">{server.ssh_username}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Credential Reference</div>
                <div className="mt-1 break-all text-sm font-medium">{server.credential_ref}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Metadata</CardTitle>
              <CardDescription>Server tags and snapshot freshness.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-xs text-muted-foreground">Tags</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {server.tags.length > 0 ? server.tags.map((tag) => (
                    <Badge key={tag} variant="outline">{tag}</Badge>
                  )) : <span className="text-sm text-muted-foreground">No tags</span>}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Last Snapshot</div>
                <div className="mt-1 text-sm font-medium">{formatTimestamp(metrics?.collected_at)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Created</div>
                <div className="mt-1 text-sm font-medium">{formatTimestamp(server.created_at)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Updated</div>
                <div className="mt-1 text-sm font-medium">{formatTimestamp(server.updated_at)}</div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Related issues</CardTitle>
            <CardDescription>Open work already bound to this server through ops context.</CardDescription>
          </CardHeader>
          <CardContent>
            {relatedIssuesLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-14 w-full" />
                ))}
              </div>
            ) : relatedIssues?.issues.length ? (
              <div className="space-y-3">
                {relatedIssues.issues.map((issue) => (
                  <AppLink
                    key={issue.id}
                    href={wsPaths.issueDetail(issue.id)}
                    className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3 transition-colors hover:bg-accent/40"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-muted-foreground">{issue.identifier}</div>
                      <div className="truncate text-sm font-medium">{issue.title}</div>
                    </div>
                    <Badge variant="outline" className="shrink-0 capitalize">
                      {issue.status.replace(/_/g, " ")}
                    </Badge>
                  </AppLink>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No issues are currently linked to this server.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <ServerForm
        open={editOpen}
        onOpenChange={setEditOpen}
        initialValues={server}
        title="Edit server"
        description="Update the server inventory record used by ops workflows."
        submitLabel="Save changes"
        isSubmitting={updateServer.isPending}
        onSubmit={async (payload) => {
          await updateServer.mutateAsync({ id: server.id, ...payload });
          setEditOpen(false);
          toast.success("Server updated");
        }}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete server?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes {server.name} from the workspace inventory. Linked issues will keep their audit history but lose the active server reference.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                await deleteServer.mutateAsync(server.id);
                setDeleteOpen(false);
                toast.success("Server deleted");
                router.push(wsPaths.servers());
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
