"use client";

import { use } from "react";
import { ServerDetailPage } from "@multica/views/servers/components";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ServerDetailPage serverId={id} />;
}