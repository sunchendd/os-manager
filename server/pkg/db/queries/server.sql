-- name: ListServers :many
SELECT * FROM server
WHERE workspace_id = $1
ORDER BY created_at DESC;

-- name: GetServerInWorkspace :one
SELECT * FROM server
WHERE id = $1 AND workspace_id = $2;

-- name: CreateServer :one
INSERT INTO server (
    workspace_id,
    name,
    host,
    environment,
    ssh_username,
    credential_ref,
    tags
) VALUES (
    $1, $2, $3, $4, $5, $6, $7
) RETURNING *;

-- name: UpdateServer :one
UPDATE server SET
    name = COALESCE(sqlc.narg('name'), name),
    host = COALESCE(sqlc.narg('host'), host),
    environment = COALESCE(sqlc.narg('environment'), environment),
    ssh_username = COALESCE(sqlc.narg('ssh_username'), ssh_username),
    credential_ref = COALESCE(sqlc.narg('credential_ref'), credential_ref),
    tags = COALESCE(sqlc.narg('tags'), tags),
    updated_at = now()
WHERE id = $1
RETURNING *;

-- name: DeleteServer :exec
DELETE FROM server
WHERE id = $1;

-- name: CreateServerMetricSnapshot :one
INSERT INTO server_metric_snapshot (
    server_id,
    cpu_idle_percent,
    memory_free_percent,
    disk_free_percent,
    gpu_free_percent,
    collected_at
) VALUES (
    $1, $2, $3, $4, $5, $6
) RETURNING *;

-- name: GetLatestServerMetricSnapshot :one
SELECT * FROM server_metric_snapshot
WHERE server_id = $1
ORDER BY collected_at DESC
LIMIT 1;

-- name: CountServerMetricSnapshots :one
SELECT COUNT(*)::bigint FROM server_metric_snapshot
WHERE server_id = $1;

-- name: ListServerRelatedIssues :many
SELECT
        i.id,
        i.title,
        i.status,
        i.number,
        w.issue_prefix
FROM issue_ops_context ioc
JOIN issue i ON i.id = ioc.issue_id
JOIN workspace w ON w.id = i.workspace_id
WHERE ioc.target_server_id = sqlc.arg(target_server_id)
    AND i.workspace_id = sqlc.arg(workspace_id)
ORDER BY i.updated_at DESC
LIMIT sqlc.arg(limit_count);