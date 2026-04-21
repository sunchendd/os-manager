-- name: GetIssueOpsContextByIssueInWorkspace :one
SELECT ioc.*
FROM issue_ops_context ioc
JOIN issue i ON i.id = ioc.issue_id
WHERE ioc.issue_id = $1 AND i.workspace_id = $2;

-- name: UpsertIssueOpsContext :one
INSERT INTO issue_ops_context (
    issue_id,
    target_server_id,
    ops_intent,
    risk_level,
    execution_mode
)
SELECT
    i.id,
    s.id,
    $3,
    $4,
    $5
FROM issue i
LEFT JOIN server s ON s.id = $2 AND s.workspace_id = i.workspace_id
WHERE i.id = $1 AND i.workspace_id = $6
ON CONFLICT (issue_id) DO UPDATE SET
    target_server_id = EXCLUDED.target_server_id,
    ops_intent = EXCLUDED.ops_intent,
    risk_level = EXCLUDED.risk_level,
    execution_mode = EXCLUDED.execution_mode,
    updated_at = now()
RETURNING *;

-- name: DeleteIssueOpsContextByIssue :exec
DELETE FROM issue_ops_context
WHERE issue_id = $1;