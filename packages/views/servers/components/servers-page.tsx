"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Ellipsis, Plus, Server as ServerIcon, Trash2, PencilLine } from "lucide-react";
import { toast } from "sonner";
import { serverListOptions } from "@multica/core/servers";
import { useCreateServer, useDeleteServer, useUpdateServer } from "@multica/core/servers";
import type { Server } from "@multica/core/types";
import { useWorkspaceId } from "@multica/core/hooks";
import { useWorkspacePaths } from "@multica/core/paths";
import { AppLink } from "../../navigation";
import { PageHeader } from "../../layout/page-header";
import { Skeleton } from "@multica/ui/components/ui/skeleton";
import { Button } from "@multica/ui/components/ui/button";
import { Badge } from "@multica/ui/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@multica/ui/components/ui/dropdown-menu";
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

function formatUpdatedAt(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function ServerRow({
  server,
  href,
  onEdit,
  onDelete,
}: {
  server: Server;
  href: string;
  onEdit: (server: Server) => void;
  onDelete: (server: Server) => void;
}) {
  return (
    <div className="group/row flex items-center gap-3 px-5 py-3 text-sm transition-colors hover:bg-accent/40">
      <AppLink href={href} className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-background text-muted-foreground">
            <ServerIcon className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium">{server.name}</div>
            <div className="truncate text-xs text-muted-foreground">{server.host}</div>
          </div>
        </div>
      </AppLink>

      <div className="hidden w-28 shrink-0 text-xs text-muted-foreground md:block">
        {server.environment || "—"}
      </div>
      <div className="hidden w-28 shrink-0 text-xs text-muted-foreground md:block">
        {server.ssh_username}
      </div>
      <div className="hidden min-w-0 flex-1 shrink-0 items-center gap-1 lg:flex">
        {server.tags.length > 0 ? server.tags.slice(0, 3).map((tag) => (
          <Badge key={tag} variant="outline" className="text-[10px] font-normal">
            {tag}
          </Badge>
        )) : <span className="text-xs text-muted-foreground">No tags</span>}
      </div>
      <div className="hidden w-28 shrink-0 text-right text-xs text-muted-foreground lg:block">
        {formatUpdatedAt(server.updated_at)}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              className="rounded-md p-1.5 text-muted-foreground opacity-0 transition hover:bg-accent hover:text-foreground group-hover/row:opacity-100"
            >
              <Ellipsis className="h-4 w-4" />
            </button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(server)}>
            <PencilLine className="mr-2 h-3.5 w-3.5" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onDelete(server)}>
            <Trash2 className="mr-2 h-3.5 w-3.5" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function ServersPage() {
  const wsId = useWorkspaceId();
  const wsPaths = useWorkspacePaths();
  const { data, isLoading } = useQuery(serverListOptions(wsId));
  const servers = useMemo(() => data?.servers ?? [], [data]);

  const createServer = useCreateServer();
  const updateServer = useUpdateServer();
  const deleteServer = useDeleteServer();

  const [createOpen, setCreateOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<Server | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Server | null>(null);

  return (
    <div className="flex h-full flex-col">
      <PageHeader className="justify-between px-5">
        <div className="flex items-center gap-2">
          <ServerIcon className="h-4 w-4 text-muted-foreground" />
          <h1 className="text-sm font-medium">Servers</h1>
          {!isLoading && servers.length > 0 ? (
            <span className="text-xs text-muted-foreground tabular-nums">{servers.length}</span>
          ) : null}
        </div>

        <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          New server
        </Button>
      </PageHeader>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-2 p-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-14 w-full" />
            ))}
          </div>
        ) : servers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
            <ServerIcon className="mb-3 h-10 w-10 opacity-30" />
            <p className="text-sm">No servers yet</p>
            <p className="mt-1 text-xs">Add your first target server to start linking ops work.</p>
            <Button size="sm" variant="outline" className="mt-4" onClick={() => setCreateOpen(true)}>
              Create server
            </Button>
          </div>
        ) : (
          <>
            <div className="sticky top-0 z-[1] flex items-center gap-3 border-b bg-muted/30 px-5 py-2 text-xs font-medium text-muted-foreground">
              <span className="min-w-0 flex-1">Server</span>
              <span className="hidden w-28 shrink-0 md:block">Environment</span>
              <span className="hidden w-28 shrink-0 md:block">SSH User</span>
              <span className="hidden flex-1 shrink-0 lg:block">Tags</span>
              <span className="hidden w-28 shrink-0 text-right lg:block">Updated</span>
              <span className="w-8 shrink-0" />
            </div>
            {servers.map((server) => (
              <ServerRow
                key={server.id}
                server={server}
                href={wsPaths.serverDetail(server.id)}
                onEdit={setEditingServer}
                onDelete={setDeleteTarget}
              />
            ))}
          </>
        )}
      </div>

      <ServerForm
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create server"
        description="Register a workspace-scoped server target for ops issues and snapshots."
        submitLabel="Create server"
        isSubmitting={createServer.isPending}
        onSubmit={async (payload) => {
          await createServer.mutateAsync(payload);
          setCreateOpen(false);
          toast.success("Server created");
        }}
      />

      <ServerForm
        open={!!editingServer}
        onOpenChange={(open) => {
          if (!open) setEditingServer(null);
        }}
        initialValues={editingServer ?? undefined}
        title="Edit server"
        description="Update connection metadata and inventory fields for this server."
        submitLabel="Save changes"
        isSubmitting={updateServer.isPending}
        onSubmit={async (payload) => {
          if (!editingServer) return;
          await updateServer.mutateAsync({ id: editingServer.id, ...payload });
          setEditingServer(null);
          toast.success("Server updated");
        }}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete server?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes {deleteTarget?.name || "this server"} from the workspace inventory. Existing issue links will keep their history but lose the live target reference.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!deleteTarget) return;
                await deleteServer.mutateAsync(deleteTarget.id);
                setDeleteTarget(null);
                toast.success("Server deleted");
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
