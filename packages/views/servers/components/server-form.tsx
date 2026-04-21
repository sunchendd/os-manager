"use client";

import { useEffect, useMemo, useState } from "react";
import type { CreateServerRequest, Server } from "@multica/core/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@multica/ui/components/ui/dialog";
import { Button } from "@multica/ui/components/ui/button";
import { Input } from "@multica/ui/components/ui/input";
import { Label } from "@multica/ui/components/ui/label";

interface ServerFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValues?: Partial<Server>;
  onSubmit: (payload: CreateServerRequest) => Promise<void> | void;
  title: string;
  description: string;
  submitLabel: string;
  isSubmitting?: boolean;
}

function toTagString(tags?: string[]) {
  return tags?.join(", ") ?? "";
}

function parseTags(input: string) {
  return input
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function ServerForm({
  open,
  onOpenChange,
  initialValues,
  onSubmit,
  title,
  description,
  submitLabel,
  isSubmitting = false,
}: ServerFormProps) {
  const [name, setName] = useState("");
  const [host, setHost] = useState("");
  const [environment, setEnvironment] = useState("");
  const [sshUsername, setSshUsername] = useState("");
  const [credentialRef, setCredentialRef] = useState("");
  const [tags, setTags] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(initialValues?.name ?? "");
    setHost(initialValues?.host ?? "");
    setEnvironment(initialValues?.environment ?? "");
    setSshUsername(initialValues?.ssh_username ?? "");
    setCredentialRef(initialValues?.credential_ref ?? "");
    setTags(toTagString(initialValues?.tags));
  }, [initialValues, open]);

  const canSubmit = useMemo(
    () => name.trim() && host.trim() && sshUsername.trim() && credentialRef.trim(),
    [credentialRef, host, name, sshUsername],
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit || isSubmitting) return;
    await onSubmit({
      name: name.trim(),
      host: host.trim(),
      environment: environment.trim() || undefined,
      ssh_username: sshUsername.trim(),
      credential_ref: credentialRef.trim(),
      tags: parseTags(tags),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="server-name">Name</Label>
              <Input id="server-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="prod-node-01" />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="server-host">Host</Label>
              <Input id="server-host" value={host} onChange={(event) => setHost(event.target.value)} placeholder="10.0.0.12" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="server-environment">Environment</Label>
              <Input id="server-environment" value={environment} onChange={(event) => setEnvironment(event.target.value)} placeholder="prod" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="server-ssh-username">SSH Username</Label>
              <Input id="server-ssh-username" value={sshUsername} onChange={(event) => setSshUsername(event.target.value)} placeholder="root" />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="server-credential-ref">Credential Reference</Label>
              <Input
                id="server-credential-ref"
                value={credentialRef}
                onChange={(event) => setCredentialRef(event.target.value)}
                placeholder="cred:workspace:prod-root"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="server-tags">Tags</Label>
              <Input id="server-tags" value={tags} onChange={(event) => setTags(event.target.value)} placeholder="gpu, api, primary" />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit || isSubmitting}>
              {isSubmitting ? "Saving..." : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
