package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"hash/fnv"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgtype"
	db "github.com/multica-ai/multica/server/pkg/db/generated"
)

type ServerResponse struct {
	ID            string   `json:"id"`
	WorkspaceID   string   `json:"workspace_id"`
	Name          string   `json:"name"`
	Host          string   `json:"host"`
	Environment   string   `json:"environment"`
	SSHUsername   string   `json:"ssh_username"`
	CredentialRef string   `json:"credential_ref"`
	Tags          []string `json:"tags"`
	CreatedAt     string   `json:"created_at"`
	UpdatedAt     string   `json:"updated_at"`
}

type CreateServerRequest struct {
	Name          string   `json:"name"`
	Host          string   `json:"host"`
	Environment   string   `json:"environment"`
	SSHUsername   string   `json:"ssh_username"`
	CredentialRef string   `json:"credential_ref"`
	Tags          []string `json:"tags"`
}

type UpdateServerRequest struct {
	Name          *string   `json:"name"`
	Host          *string   `json:"host"`
	Environment   *string   `json:"environment"`
	SSHUsername   *string   `json:"ssh_username"`
	CredentialRef *string   `json:"credential_ref"`
	Tags          *[]string `json:"tags"`
}

type ServerMetricSnapshotResponse struct {
	CPUIdlePercent    float64 `json:"cpu_idle_percent"`
	MemoryFreePercent float64 `json:"memory_free_percent"`
	DiskFreePercent   float64 `json:"disk_free_percent"`
	GPUFreePercent    float64 `json:"gpu_free_percent"`
	CollectedAt       string  `json:"collected_at"`
}

type ServerRelatedIssueResponse struct {
	ID         string `json:"id"`
	Identifier string `json:"identifier"`
	Title      string `json:"title"`
	Status     string `json:"status"`
}

func encodeServerTags(tags []string) []byte {
	if len(tags) == 0 {
		return []byte("[]")
	}
	data, err := json.Marshal(tags)
	if err != nil {
		return []byte("[]")
	}
	return data
}

func decodeServerTags(raw []byte) []string {
	if len(raw) == 0 {
		return []string{}
	}
	var tags []string
	if err := json.Unmarshal(raw, &tags); err != nil {
		return []string{}
	}
	if tags == nil {
		return []string{}
	}
	return tags
}

func serverToResponse(server db.Server) ServerResponse {
	return ServerResponse{
		ID:            uuidToString(server.ID),
		WorkspaceID:   uuidToString(server.WorkspaceID),
		Name:          server.Name,
		Host:          server.Host,
		Environment:   server.Environment,
		SSHUsername:   server.SshUsername,
		CredentialRef: server.CredentialRef,
		Tags:          decodeServerTags(server.Tags),
		CreatedAt:     timestampToString(server.CreatedAt),
		UpdatedAt:     timestampToString(server.UpdatedAt),
	}
}

func serverMetricSnapshotToResponse(snapshot db.ServerMetricSnapshot) ServerMetricSnapshotResponse {
	return ServerMetricSnapshotResponse{
		CPUIdlePercent:    snapshot.CpuIdlePercent,
		MemoryFreePercent: snapshot.MemoryFreePercent,
		DiskFreePercent:   snapshot.DiskFreePercent,
		GPUFreePercent:    snapshot.GpuFreePercent,
		CollectedAt:       timestampToString(snapshot.CollectedAt),
	}
}

func serverRelatedIssueToResponse(issue db.ListServerRelatedIssuesRow) ServerRelatedIssueResponse {
	return ServerRelatedIssueResponse{
		ID:         uuidToString(issue.ID),
		Identifier: issue.IssuePrefix + "-" + strconv.Itoa(int(issue.Number)),
		Title:      issue.Title,
		Status:     issue.Status,
	}
}

func deterministicMetricValue(serverID, metric string, refreshCount int64, min, max float64) float64 {
	hasher := fnv.New32a()
	_, _ = hasher.Write([]byte(serverID))
	_, _ = hasher.Write([]byte(":"))
	_, _ = hasher.Write([]byte(metric))
	_, _ = hasher.Write([]byte(":"))
	_, _ = hasher.Write([]byte(strconv.FormatInt(refreshCount, 10)))

	span := max - min
	if span <= 0 {
		return min
	}
	return min + (float64(hasher.Sum32()%10000)/10000.0)*span
}

func buildServerMetricSnapshotParams(serverID string, refreshCount int64) db.CreateServerMetricSnapshotParams {
	return db.CreateServerMetricSnapshotParams{
		ServerID:          parseUUID(serverID),
		CpuIdlePercent:    deterministicMetricValue(serverID, "cpu_idle_percent", refreshCount, 35, 90),
		MemoryFreePercent: deterministicMetricValue(serverID, "memory_free_percent", refreshCount, 20, 85),
		DiskFreePercent:   deterministicMetricValue(serverID, "disk_free_percent", refreshCount, 25, 92),
		GpuFreePercent:    deterministicMetricValue(serverID, "gpu_free_percent", refreshCount, 0, 100),
		CollectedAt:       pgtype.Timestamptz{Time: time.Now().UTC(), Valid: true},
	}
}

func (h *Handler) ensureServerSnapshot(ctx context.Context, queries *db.Queries, server db.Server) (db.ServerMetricSnapshot, error) {
	snapshot, err := queries.GetLatestServerMetricSnapshot(ctx, server.ID)
	if err == nil {
		return snapshot, nil
	}
	if !isNotFound(err) {
		return db.ServerMetricSnapshot{}, err
	}
	return queries.CreateServerMetricSnapshot(ctx, buildServerMetricSnapshotParams(uuidToString(server.ID), 0))
}

func (h *Handler) ListServers(w http.ResponseWriter, r *http.Request) {
	workspaceID := h.resolveWorkspaceID(r)
	if _, ok := h.workspaceMember(w, r, workspaceID); !ok {
		return
	}

	servers, err := h.Queries.ListServers(r.Context(), parseUUID(workspaceID))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list servers")
		return
	}

	resp := make([]ServerResponse, len(servers))
	for i, server := range servers {
		resp[i] = serverToResponse(server)
	}

	writeJSON(w, http.StatusOK, map[string]any{"servers": resp, "total": len(resp)})
}

func (h *Handler) GetServer(w http.ResponseWriter, r *http.Request) {
	workspaceID := h.resolveWorkspaceID(r)
	if _, ok := h.workspaceMember(w, r, workspaceID); !ok {
		return
	}

	server, err := h.Queries.GetServerInWorkspace(r.Context(), db.GetServerInWorkspaceParams{
		ID:          parseUUID(chi.URLParam(r, "id")),
		WorkspaceID: parseUUID(workspaceID),
	})
	if err != nil {
		writeError(w, http.StatusNotFound, "server not found")
		return
	}

	writeJSON(w, http.StatusOK, serverToResponse(server))
}

func (h *Handler) CreateServer(w http.ResponseWriter, r *http.Request) {
	var req CreateServerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Name == "" || req.Host == "" || req.SSHUsername == "" || req.CredentialRef == "" {
		writeError(w, http.StatusBadRequest, "name, host, ssh_username, and credential_ref are required")
		return
	}

	workspaceID := h.resolveWorkspaceID(r)
	if _, ok := h.workspaceMember(w, r, workspaceID); !ok {
		return
	}

	environment := req.Environment
	if environment == "" {
		environment = "unknown"
	}

	tx, err := h.TxStarter.Begin(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create server")
		return
	}
	defer tx.Rollback(r.Context())

	qtx := h.Queries.WithTx(tx)
	server, err := qtx.CreateServer(r.Context(), db.CreateServerParams{
		WorkspaceID:   parseUUID(workspaceID),
		Name:          req.Name,
		Host:          req.Host,
		Environment:   environment,
		SshUsername:   req.SSHUsername,
		CredentialRef: req.CredentialRef,
		Tags:          encodeServerTags(req.Tags),
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create server")
		return
	}
	if _, err := qtx.CreateServerMetricSnapshot(r.Context(), buildServerMetricSnapshotParams(uuidToString(server.ID), 0)); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create server")
		return
	}
	if err := tx.Commit(r.Context()); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create server")
		return
	}

	writeJSON(w, http.StatusCreated, serverToResponse(server))
}

func (h *Handler) UpdateServer(w http.ResponseWriter, r *http.Request) {
	workspaceID := h.resolveWorkspaceID(r)
	if _, ok := h.workspaceMember(w, r, workspaceID); !ok {
		return
	}

	id := chi.URLParam(r, "id")
	current, err := h.Queries.GetServerInWorkspace(r.Context(), db.GetServerInWorkspaceParams{
		ID:          parseUUID(id),
		WorkspaceID: parseUUID(workspaceID),
	})
	if err != nil {
		writeError(w, http.StatusNotFound, "server not found")
		return
	}

	bodyBytes, err := ioReadAll(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "failed to read request body")
		return
	}

	var req UpdateServerRequest
	if err := json.Unmarshal(bodyBytes, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	params := db.UpdateServerParams{ID: current.ID}
	if req.Name != nil {
		params.Name = pgtype.Text{String: *req.Name, Valid: true}
	}
	if req.Host != nil {
		params.Host = pgtype.Text{String: *req.Host, Valid: true}
	}
	if req.Environment != nil {
		params.Environment = pgtype.Text{String: *req.Environment, Valid: true}
	}
	if req.SSHUsername != nil {
		params.SshUsername = pgtype.Text{String: *req.SSHUsername, Valid: true}
	}
	if req.CredentialRef != nil {
		params.CredentialRef = pgtype.Text{String: *req.CredentialRef, Valid: true}
	}
	if req.Tags != nil {
		params.Tags = encodeServerTags(*req.Tags)
	}

	updated, err := h.Queries.UpdateServer(r.Context(), params)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update server")
		return
	}

	writeJSON(w, http.StatusOK, serverToResponse(updated))
}

func (h *Handler) DeleteServer(w http.ResponseWriter, r *http.Request) {
	workspaceID := h.resolveWorkspaceID(r)
	if _, ok := h.workspaceMember(w, r, workspaceID); !ok {
		return
	}

	id := chi.URLParam(r, "id")
	if _, err := h.Queries.GetServerInWorkspace(r.Context(), db.GetServerInWorkspaceParams{
		ID:          parseUUID(id),
		WorkspaceID: parseUUID(workspaceID),
	}); err != nil {
		writeError(w, http.StatusNotFound, "server not found")
		return
	}

	if err := h.Queries.DeleteServer(r.Context(), parseUUID(id)); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to delete server")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) GetServerMetrics(w http.ResponseWriter, r *http.Request) {
	workspaceID := h.resolveWorkspaceID(r)
	if _, ok := h.workspaceMember(w, r, workspaceID); !ok {
		return
	}

	server, err := h.Queries.GetServerInWorkspace(r.Context(), db.GetServerInWorkspaceParams{
		ID:          parseUUID(chi.URLParam(r, "id")),
		WorkspaceID: parseUUID(workspaceID),
	})
	if err != nil {
		writeError(w, http.StatusNotFound, "server not found")
		return
	}

	snapshot, err := h.ensureServerSnapshot(r.Context(), h.Queries, server)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load server metrics")
		return
	}

	writeJSON(w, http.StatusOK, serverMetricSnapshotToResponse(snapshot))
}

func (h *Handler) RefreshServerMetrics(w http.ResponseWriter, r *http.Request) {
	workspaceID := h.resolveWorkspaceID(r)
	if _, ok := h.workspaceMember(w, r, workspaceID); !ok {
		return
	}

	server, err := h.Queries.GetServerInWorkspace(r.Context(), db.GetServerInWorkspaceParams{
		ID:          parseUUID(chi.URLParam(r, "id")),
		WorkspaceID: parseUUID(workspaceID),
	})
	if err != nil {
		writeError(w, http.StatusNotFound, "server not found")
		return
	}

	count, err := h.Queries.CountServerMetricSnapshots(r.Context(), server.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to refresh server metrics")
		return
	}

	snapshot, err := h.Queries.CreateServerMetricSnapshot(
		r.Context(),
		buildServerMetricSnapshotParams(uuidToString(server.ID), count),
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to refresh server metrics")
		return
	}

	writeJSON(w, http.StatusOK, serverMetricSnapshotToResponse(snapshot))
}

func (h *Handler) GetServerRelatedIssues(w http.ResponseWriter, r *http.Request) {
	workspaceID := h.resolveWorkspaceID(r)
	if _, ok := h.workspaceMember(w, r, workspaceID); !ok {
		return
	}

	serverID := chi.URLParam(r, "id")
	if _, err := h.Queries.GetServerInWorkspace(r.Context(), db.GetServerInWorkspaceParams{
		ID:          parseUUID(serverID),
		WorkspaceID: parseUUID(workspaceID),
	}); err != nil {
		writeError(w, http.StatusNotFound, "server not found")
		return
	}

	issues, err := h.Queries.ListServerRelatedIssues(r.Context(), db.ListServerRelatedIssuesParams{
		TargetServerID: parseUUID(serverID),
		WorkspaceID:    parseUUID(workspaceID),
		LimitCount:     20,
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load related issues")
		return
	}

	resp := make([]ServerRelatedIssueResponse, len(issues))
	for i, issue := range issues {
		resp[i] = serverRelatedIssueToResponse(issue)
	}

	writeJSON(w, http.StatusOK, map[string]any{"issues": resp})
}

func ioReadAll(r *http.Request) ([]byte, error) {
	buf := bytes.Buffer{}
	if _, err := buf.ReadFrom(r.Body); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}
