import { queryOptions } from "@tanstack/react-query";
import { api } from "../api";

export const serverKeys = {
  all: (wsId: string) => ["servers", wsId] as const,
  list: (wsId: string) => [...serverKeys.all(wsId), "list"] as const,
  detail: (wsId: string, id: string) => [...serverKeys.all(wsId), "detail", id] as const,
  metrics: (wsId: string, id: string) => [...serverKeys.all(wsId), "metrics", id] as const,
  relatedIssues: (wsId: string, id: string) => [...serverKeys.all(wsId), "related-issues", id] as const,
};

export function serverListOptions(wsId: string) {
  return queryOptions({
    queryKey: serverKeys.list(wsId),
    queryFn: () => api.listServers(),
  });
}

export function serverDetailOptions(wsId: string, id: string) {
  return queryOptions({
    queryKey: serverKeys.detail(wsId, id),
    queryFn: () => api.getServer(id),
  });
}

export function serverMetricsOptions(wsId: string, id: string) {
  return queryOptions({
    queryKey: serverKeys.metrics(wsId, id),
    queryFn: () => api.getServerMetrics(id),
  });
}

export function serverRelatedIssuesOptions(wsId: string, id: string) {
  return queryOptions({
    queryKey: serverKeys.relatedIssues(wsId, id),
    queryFn: () => api.listServerRelatedIssues(id),
  });
}