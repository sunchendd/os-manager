import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SkillsPage } from "./index";

const mockListSkills = vi.hoisted(() =>
  vi.fn().mockResolvedValue([
    {
      id: "skill-1",
      workspace_id: "ws-1",
      name: "deploy-preview",
      description: "Deploy preview environments for review.",
      content: "steps...",
      config: {},
      files: [],
      created_by: "user-1",
      created_at: "2026-04-20T00:00:00Z",
      updated_at: "2026-04-20T00:00:00Z",
    },
  ]),
);

vi.mock("@multica/core/hooks", () => ({
  useWorkspaceId: () => "ws-1",
}));

vi.mock("@multica/core/paths", async () => {
  const actual = await vi.importActual<typeof import("@multica/core/paths")>("@multica/core/paths");
  return {
    ...actual,
    useCurrentWorkspace: () => ({ id: "ws-1", name: "Acme", slug: "acme" }),
  };
});

vi.mock("@multica/core/api", () => ({
  api: {
    listSkills: (...args: unknown[]) => mockListSkills(...args),
  },
}));

describe("SkillsPage", () => {
  it("renders workspace skills", async () => {
    const client = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    render(
      <QueryClientProvider client={client}>
        <SkillsPage />
      </QueryClientProvider>,
    );

    expect(screen.getByRole("heading", { name: "Skills" })).toBeInTheDocument();
    expect(screen.getByText("Workspace skills shared across Acme.")).
      toBeInTheDocument();
    expect(await screen.findByText("deploy-preview")).toBeInTheDocument();
    expect(screen.getByText("Deploy preview environments for review.")).toBeInTheDocument();
  });
});