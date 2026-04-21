import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mockPush = vi.hoisted(() => vi.fn());

vi.mock("@multica/core/hooks", () => ({
  useWorkspaceId: () => "ws-1",
}));

vi.mock("@multica/core/paths", async () => {
  const actual = await vi.importActual<typeof import("@multica/core/paths")>(
    "@multica/core/paths",
  );
  return {
    ...actual,
    useWorkspacePaths: () => ({
      servers: () => "/ws-1/servers",
      issueDetail: (id: string) => `/ws-1/issues/${id}`,
    }),
  };
});

vi.mock("../../navigation", () => ({
  AppLink: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  useNavigation: () => ({ push: mockPush }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("./server-form", () => ({
  ServerForm: () => null,
}));

vi.mock("@multica/core/servers", () => ({
  serverDetailOptions: () => ({
    queryKey: ["servers", "ws-1", "detail", "server-1"],
    queryFn: () => Promise.resolve({
      id: "server-1",
      workspace_id: "ws-1",
      name: "prod-node-01",
      host: "10.0.0.12",
      environment: "prod",
      ssh_username: "root",
      credential_ref: "cred:test:prod-node-01",
      tags: ["prod"],
      created_at: "2026-04-20T10:00:00Z",
      updated_at: "2026-04-20T10:00:00Z",
    }),
  }),
  serverMetricsOptions: () => ({
    queryKey: ["servers", "ws-1", "metrics", "server-1"],
    queryFn: () => Promise.resolve({
      cpu_idle_percent: 62.5,
      memory_free_percent: 41.2,
      disk_free_percent: 73.1,
      gpu_free_percent: 18.4,
      collected_at: "2026-04-20T10:05:00Z",
    }),
  }),
  serverRelatedIssuesOptions: () => ({
    queryKey: ["servers", "ws-1", "related-issues", "server-1"],
    queryFn: () => Promise.resolve({
      issues: [
        {
          id: "issue-1",
          identifier: "MUL-42",
          title: "Patch kernel on prod node",
          status: "in_progress",
        },
      ],
    }),
  }),
  useDeleteServer: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useRefreshServerMetrics: () => ({ isPending: false, mutate: vi.fn() }),
  useUpdateServer: () => ({ isPending: false, mutateAsync: vi.fn() }),
}));

import { ServerDetailPage } from "./server-detail-page";

function renderPage() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={client}>
      <ServerDetailPage serverId="server-1" />
    </QueryClientProvider>,
  );
}

describe("ServerDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders issues bound to the current server", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Related issues")).toBeInTheDocument();
    });

    expect(screen.getByText("MUL-42")).toBeInTheDocument();
    expect(screen.getByText("Patch kernel on prod node")).toBeInTheDocument();

    const issueLink = screen.getByRole("link", { name: /Patch kernel on prod node/i });
    expect(issueLink).toHaveAttribute("href", "/ws-1/issues/issue-1");
  });
});