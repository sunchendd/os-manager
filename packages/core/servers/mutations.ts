import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import { useWorkspaceId } from "../hooks";
import type { Server, CreateServerRequest, UpdateServerRequest, ListServersResponse } from "../types";
import { serverKeys } from "./queries";

export function useCreateServer() {
  const qc = useQueryClient();
  const wsId = useWorkspaceId();

  return useMutation({
    mutationFn: (data: CreateServerRequest) => api.createServer(data),
    onSuccess: (newServer) => {
      qc.setQueryData<ListServersResponse>(serverKeys.list(wsId), (old) =>
        old && !old.servers.some((server) => server.id === newServer.id)
          ? { ...old, servers: [...old.servers, newServer], total: old.total + 1 }
          : old,
      );
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: serverKeys.list(wsId) });
    },
  });
}

export function useUpdateServer() {
  const qc = useQueryClient();
  const wsId = useWorkspaceId();

  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & UpdateServerRequest) => api.updateServer(id, data),
    onMutate: ({ id, ...data }) => {
      qc.cancelQueries({ queryKey: serverKeys.list(wsId) });
      const prevList = qc.getQueryData<ListServersResponse>(serverKeys.list(wsId));
      const prevDetail = qc.getQueryData<Server>(serverKeys.detail(wsId, id));

      qc.setQueryData<ListServersResponse>(serverKeys.list(wsId), (old) =>
        old ? { ...old, servers: old.servers.map((server) => (server.id === id ? { ...server, ...data } : server)) } : old,
      );
      qc.setQueryData<Server>(serverKeys.detail(wsId, id), (old) =>
        old ? { ...old, ...data } : old,
      );

      return { prevList, prevDetail, id };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prevList) qc.setQueryData(serverKeys.list(wsId), ctx.prevList);
      if (ctx?.prevDetail) qc.setQueryData(serverKeys.detail(wsId, ctx.id), ctx.prevDetail);
    },
    onSettled: (_data, _err, vars) => {
      qc.invalidateQueries({ queryKey: serverKeys.list(wsId) });
      qc.invalidateQueries({ queryKey: serverKeys.detail(wsId, vars.id) });
      qc.invalidateQueries({ queryKey: serverKeys.metrics(wsId, vars.id) });
    },
  });
}

export function useDeleteServer() {
  const qc = useQueryClient();
  const wsId = useWorkspaceId();

  return useMutation({
    mutationFn: (id: string) => api.deleteServer(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: serverKeys.list(wsId) });
      const prevList = qc.getQueryData<ListServersResponse>(serverKeys.list(wsId));
      qc.setQueryData<ListServersResponse>(serverKeys.list(wsId), (old) =>
        old ? { ...old, servers: old.servers.filter((server) => server.id !== id), total: old.total - 1 } : old,
      );
      qc.removeQueries({ queryKey: serverKeys.detail(wsId, id) });
      qc.removeQueries({ queryKey: serverKeys.metrics(wsId, id) });
      return { prevList };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prevList) qc.setQueryData(serverKeys.list(wsId), ctx.prevList);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: serverKeys.list(wsId) });
    },
  });
}

export function useRefreshServerMetrics() {
  const qc = useQueryClient();
  const wsId = useWorkspaceId();

  return useMutation({
    mutationFn: (id: string) => api.refreshServerMetrics(id),
    onSuccess: (metrics, id) => {
      qc.setQueryData(serverKeys.metrics(wsId, id), metrics);
    },
    onSettled: (_data, _err, id) => {
      qc.invalidateQueries({ queryKey: serverKeys.metrics(wsId, id) });
    },
  });
}