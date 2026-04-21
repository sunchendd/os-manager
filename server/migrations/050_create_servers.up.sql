CREATE TABLE server (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    host TEXT NOT NULL,
    environment TEXT NOT NULL DEFAULT 'unknown',
    ssh_username TEXT NOT NULL,
    credential_ref TEXT NOT NULL,
    tags JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_server_workspace ON server(workspace_id);
CREATE INDEX idx_server_workspace_host ON server(workspace_id, host);

CREATE TABLE server_metric_snapshot (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    server_id UUID NOT NULL REFERENCES server(id) ON DELETE CASCADE,
    cpu_idle_percent DOUBLE PRECISION NOT NULL,
    memory_free_percent DOUBLE PRECISION NOT NULL,
    disk_free_percent DOUBLE PRECISION NOT NULL,
    gpu_free_percent DOUBLE PRECISION NOT NULL,
    collected_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_server_metric_snapshot_server_collected_at
    ON server_metric_snapshot(server_id, collected_at DESC);

CREATE TABLE issue_ops_context (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id UUID NOT NULL REFERENCES issue(id) ON DELETE CASCADE,
    target_server_id UUID REFERENCES server(id) ON DELETE SET NULL,
    ops_intent TEXT,
    risk_level TEXT,
    execution_mode TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(issue_id)
);

CREATE INDEX idx_issue_ops_context_issue ON issue_ops_context(issue_id);
CREATE INDEX idx_issue_ops_context_target_server ON issue_ops_context(target_server_id);