"use client";

import { useQuery } from "@tanstack/react-query";
import { AppLink } from "../../navigation";
import { useWorkspaceId } from "@multica/core/hooks";
import { useWorkspacePaths } from "@multica/core/paths";
import { serverDetailOptions, serverMetricsOptions } from "@multica/core/servers";
import type { IssueOpsContext } from "@multica/core/types";

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function ContextRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 text-xs">
      <span className="w-20 shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 text-foreground">{value}</span>
    </div>
  );
}

export function IssueServerSidebar({ opsContext }: { opsContext: IssueOpsContext }) {
  const wsId = useWorkspaceId();
  const paths = useWorkspacePaths();
  const targetServerId = opsContext.target_server_id ?? "";

  const { data: server, isLoading: serverLoading, isError: serverError } = useQuery({
    ...serverDetailOptions(wsId, targetServerId),
    enabled: !!targetServerId,
  });
  const { data: metrics } = useQuery({
    ...serverMetricsOptions(wsId, targetServerId),
    enabled: !!targetServerId,
  });

  return (
    <div>
      <div className="mb-2 px-2 py-1 text-xs font-medium">Server context</div>
      <div className="space-y-3 pl-2">
        {targetServerId ? (
          <div className="rounded-lg border p-3">
            {server ? (
              <div className="space-y-1.5">
                <AppLink href={paths.serverDetail(server.id)} className="text-sm font-medium hover:underline">
                  {server.name}
                </AppLink>
                <div className="text-xs text-muted-foreground">{server.host}</div>
                <div className="text-xs text-muted-foreground">{server.environment || "unknown"}</div>
              </div>
            ) : serverLoading ? (
              <div className="text-xs text-muted-foreground">Loading server…</div>
            ) : serverError ? (
              <div className="text-xs text-muted-foreground">Server link unavailable.</div>
            ) : null}

            {metrics && (
              <div className="mt-3 grid gap-1 text-xs text-foreground">
                <div>{formatPercent(metrics.cpu_idle_percent)} CPU idle</div>
                <div>{formatPercent(metrics.memory_free_percent)} memory free</div>
                <div>{formatPercent(metrics.disk_free_percent)} disk free</div>
                <div>{formatPercent(metrics.gpu_free_percent)} GPU free</div>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">
            No target server linked.
          </div>
        )}

        {opsContext.ops_intent && <ContextRow label="Intent" value={opsContext.ops_intent} />}
        {opsContext.risk_level && <ContextRow label="Risk" value={opsContext.risk_level} />}
        {opsContext.execution_mode && <ContextRow label="Mode" value={opsContext.execution_mode} />}
      </div>
    </div>
  );
}