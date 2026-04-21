import { afterEach, describe, expect, it, vi } from "vitest";

const { apiMock } = vi.hoisted(() => ({
  apiMock: {
    listServers: vi.fn(),
    getServer: vi.fn(),
    getServerMetrics: vi.fn(),
    listServerRelatedIssues: vi.fn(),
  },
}));

vi.mock("../api", () => ({
  api: apiMock,
}));

import { serverDetailOptions, serverKeys, serverListOptions, serverMetricsOptions, serverRelatedIssuesOptions } from "./queries";

afterEach(() => {
  vi.clearAllMocks();
});

describe("server queries", () => {
  it("uses stable query keys for list, detail, and metrics", () => {
    expect(serverKeys.list("ws-1")).toEqual(["servers", "ws-1", "list"]);
    expect(serverKeys.detail("ws-1", "srv-1")).toEqual(["servers", "ws-1", "detail", "srv-1"]);
    expect(serverKeys.metrics("ws-1", "srv-1")).toEqual(["servers", "ws-1", "metrics", "srv-1"]);
    expect(serverKeys.relatedIssues("ws-1", "srv-1")).toEqual(["servers", "ws-1", "related-issues", "srv-1"]);
  });

  it("delegates queryFns to the server api methods", async () => {
    apiMock.listServers.mockResolvedValue({ servers: [{ id: "srv-1" }], total: 1 });
    apiMock.getServer.mockResolvedValue({ id: "srv-1" });
    apiMock.getServerMetrics.mockResolvedValue({ cpu_idle_percent: 55 });
    apiMock.listServerRelatedIssues.mockResolvedValue({ issues: [{ id: "issue-1", identifier: "MUL-42", title: "Patch kernel", status: "in_progress" }] });

    const listOptions = serverListOptions("ws-1");
    const detailOptions = serverDetailOptions("ws-1", "srv-1");
    const metricsOptions = serverMetricsOptions("ws-1", "srv-1");
    const relatedIssuesOptions = serverRelatedIssuesOptions("ws-1", "srv-1");

    const list = await listOptions.queryFn?.({ queryKey: listOptions.queryKey } as never);
    const detail = await detailOptions.queryFn?.({ queryKey: detailOptions.queryKey } as never);
    const metrics = await metricsOptions.queryFn?.({ queryKey: metricsOptions.queryKey } as never);
    const relatedIssues = await relatedIssuesOptions.queryFn?.({ queryKey: relatedIssuesOptions.queryKey } as never);

    expect(apiMock.listServers).toHaveBeenCalledTimes(1);
    expect(apiMock.getServer).toHaveBeenCalledWith("srv-1");
    expect(apiMock.getServerMetrics).toHaveBeenCalledWith("srv-1");
    expect(apiMock.listServerRelatedIssues).toHaveBeenCalledWith("srv-1");
    expect(list).toEqual({ servers: [{ id: "srv-1" }], total: 1 });
    expect(detail).toEqual({ id: "srv-1" });
    expect(metrics).toEqual({ cpu_idle_percent: 55 });
    expect(relatedIssues).toEqual({ issues: [{ id: "issue-1", identifier: "MUL-42", title: "Patch kernel", status: "in_progress" }] });
  });
});