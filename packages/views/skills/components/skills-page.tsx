"use client";

import { useQuery } from "@tanstack/react-query";
import { useWorkspaceId } from "@multica/core/hooks";
import { useCurrentWorkspace } from "@multica/core/paths";
import { skillListOptions } from "@multica/core/workspace/queries";
import { BookOpenText, FileText } from "lucide-react";

export function SkillsPage() {
  const wsId = useWorkspaceId();
  const workspace = useCurrentWorkspace();
  const workspaceName = workspace?.name ?? "this workspace";
  const { data: skills = [], isLoading, error } = useQuery(skillListOptions(wsId));

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <BookOpenText className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Skills</h1>
            <p className="text-sm text-muted-foreground">
              {`Workspace skills shared across ${workspaceName}.`}
            </p>
          </div>
        </div>
      </header>

      {isLoading ? (
        <div className="rounded-xl border border-dashed p-8 text-sm text-muted-foreground">
          Loading skills...
        </div>
      ) : null}

      {error instanceof Error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error.message}
        </div>
      ) : null}

      {!isLoading && !error && skills.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <FileText className="h-5 w-5" />
          </div>
          <h2 className="mt-4 text-base font-medium">No workspace skills yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Import or create a shared skill to make repeatable workflows available across the workspace.
          </p>
        </div>
      ) : null}

      {!isLoading && !error && skills.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {skills.map((skill) => (
            <article key={skill.id} className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-medium">{skill.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {skill.description || "No description provided."}
                  </p>
                </div>
                <div className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                  {`${skill.files.length} files`}
                </div>
              </div>

              <div className="mt-4 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                {skill.content ? skill.content.slice(0, 160) : "This skill has no inline content preview."}
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}