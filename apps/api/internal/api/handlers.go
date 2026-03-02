package api

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/shravann/api/internal/db"
	lk "github.com/shravann/api/internal/livekit"
	"github.com/shravann/api/internal/store"
	"gorm.io/datatypes"
)

type Handler struct {
	store   *store.Store
	livekit *lk.Client
}

func NewHandler(s *store.Store, lkClient *lk.Client) *Handler {
	return &Handler{store: s, livekit: lkClient}
}

// --- Users ---

func (h *Handler) CreateUser(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email          string  `json:"email"`
		Name           string  `json:"name"`
		AvatarURL      *string `json:"avatar_url"`
		AuthProvider   string  `json:"auth_provider"`
		AuthProviderID string  `json:"auth_provider_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		BadRequest(w, "invalid JSON")
		return
	}
	if body.Email == "" || body.Name == "" || body.AuthProvider == "" || body.AuthProviderID == "" {
		BadRequest(w, "email, name, auth_provider, auth_provider_id required")
		return
	}
	u := &db.User{
		Email:          body.Email,
		Name:           body.Name,
		AvatarURL:      body.AvatarURL,
		AuthProvider:   body.AuthProvider,
		AuthProviderID: body.AuthProviderID,
	}
	if err := h.store.CreateUser(r.Context(), u); err != nil {
		Err(w, err)
		return
	}
	JSON(w, http.StatusCreated, userResp(u))
}

func (h *Handler) GetUser(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	u, err := h.store.GetUserByID(r.Context(), id)
	if err != nil {
		Err(w, err)
		return
	}
	JSON(w, http.StatusOK, userResp(u))
}

func (h *Handler) UpdateUser(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	u, err := h.store.GetUserByID(r.Context(), id)
	if err != nil {
		Err(w, err)
		return
	}
	var body struct {
		Name      *string `json:"name"`
		Email     *string `json:"email"`
		AvatarURL *string `json:"avatar_url"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		BadRequest(w, "invalid JSON")
		return
	}
	if body.Name != nil {
		u.Name = *body.Name
	}
	if body.Email != nil {
		u.Email = *body.Email
	}
	if body.AvatarURL != nil {
		u.AvatarURL = body.AvatarURL
	}
	if err := h.store.UpdateUser(r.Context(), u); err != nil {
		Err(w, err)
		return
	}
	JSON(w, http.StatusOK, userResp(u))
}

func (h *Handler) SyncUser(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email          string  `json:"email"`
		Name           string  `json:"name"`
		AvatarURL      *string `json:"avatar_url"`
		AuthProvider   string  `json:"auth_provider"`
		AuthProviderID string  `json:"auth_provider_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		BadRequest(w, "invalid JSON")
		return
	}
	if body.Email == "" || body.AuthProvider == "" || body.AuthProviderID == "" {
		BadRequest(w, "email, auth_provider, auth_provider_id required")
		return
	}
	name := body.Name
	if name == "" {
		name = body.Email
	}
	u := &db.User{
		Email:          body.Email,
		Name:           name,
		AvatarURL:      body.AvatarURL,
		AuthProvider:   body.AuthProvider,
		AuthProviderID: body.AuthProviderID,
	}
	result, err := h.store.UpsertUserByAuthProvider(r.Context(), u)
	if err != nil {
		Err(w, err)
		return
	}
	JSON(w, http.StatusOK, userResp(result))
}

func userResp(u *db.User) map[string]any {
	resp := map[string]any{
		"id":               u.ID.String(),
		"email":            u.Email,
		"name":             u.Name,
		"auth_provider":    u.AuthProvider,
		"auth_provider_id": u.AuthProviderID,
		"created_at":       u.CreatedAt,
		"updated_at":       u.UpdatedAt,
	}
	if u.AvatarURL != nil {
		resp["avatar_url"] = *u.AvatarURL
	}
	return resp
}

// --- Projects ---

func (h *Handler) CreateProject(w http.ResponseWriter, r *http.Request) {
	userID := UserIDFrom(r.Context())
	if userID == "" {
		BadRequest(w, "X-User-ID required")
		return
	}
	var body struct {
		Name string `json:"name"`
		Slug string `json:"slug"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		BadRequest(w, "invalid JSON")
		return
	}
	if body.Name == "" || body.Slug == "" {
		BadRequest(w, "name and slug required")
		return
	}
	creatorID, err := uuid.Parse(userID)
	if err != nil {
		BadRequest(w, "invalid user id")
		return
	}
	p := &db.Project{
		Name:      body.Name,
		Slug:      body.Slug,
		CreatedBy: creatorID,
	}
	if err := h.store.CreateProject(r.Context(), p); err != nil {
		Err(w, err)
		return
	}
	member := &db.ProjectMember{
		ProjectID: p.ID,
		UserID:    creatorID,
		Role:      db.RoleOwner,
	}
	_ = h.store.AddProjectMember(r.Context(), member)
	JSON(w, http.StatusCreated, projectResp(p))
}

func (h *Handler) ListProjects(w http.ResponseWriter, r *http.Request) {
	userID := UserIDFrom(r.Context())
	if userID == "" {
		BadRequest(w, "X-User-ID required")
		return
	}
	list, err := h.store.ListProjectsByUser(r.Context(), userID)
	if err != nil {
		Err(w, err)
		return
	}
	out := make([]map[string]any, len(list))
	for i := range list {
		out[i] = projectResp(&list[i])
	}
	JSON(w, http.StatusOK, map[string]any{"projects": out})
}

func (h *Handler) GetProject(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	p, err := h.store.GetProjectByID(r.Context(), id)
	if err != nil {
		Err(w, err)
		return
	}
	JSON(w, http.StatusOK, projectResp(p))
}

func (h *Handler) UpdateProject(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	p, err := h.store.GetProjectByID(r.Context(), id)
	if err != nil {
		Err(w, err)
		return
	}
	var body struct {
		Name *string `json:"name"`
		Slug *string `json:"slug"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		BadRequest(w, "invalid JSON")
		return
	}
	if body.Name != nil {
		p.Name = *body.Name
	}
	if body.Slug != nil {
		p.Slug = *body.Slug
	}
	if err := h.store.UpdateProject(r.Context(), p); err != nil {
		Err(w, err)
		return
	}
	JSON(w, http.StatusOK, projectResp(p))
}

func (h *Handler) DeleteProject(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := h.store.DeleteProject(r.Context(), id); err != nil {
		Err(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func projectResp(p *db.Project) map[string]any {
	return map[string]any{
		"id":          p.ID.String(),
		"name":        p.Name,
		"slug":        p.Slug,
		"created_by":  p.CreatedBy.String(),
		"created_at":  p.CreatedAt,
		"updated_at":  p.UpdatedAt,
	}
}

// --- Project members ---

func (h *Handler) ListProjectMembers(w http.ResponseWriter, r *http.Request) {
	projectID := chi.URLParam(r, "projectId")
	list, err := h.store.ListProjectMembers(r.Context(), projectID)
	if err != nil {
		Err(w, err)
		return
	}
	out := make([]map[string]any, len(list))
	for i := range list {
		out[i] = projectMemberResp(&list[i])
	}
	JSON(w, http.StatusOK, map[string]any{"members": out})
}

func (h *Handler) AddProjectMember(w http.ResponseWriter, r *http.Request) {
	projectID := chi.URLParam(r, "projectId")
	var body struct {
		UserID string `json:"user_id"`
		Role   string `json:"role"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		BadRequest(w, "invalid JSON")
		return
	}
	if body.UserID == "" {
		BadRequest(w, "user_id required")
		return
	}
	role := db.RoleMember
	if body.Role != "" {
		role = db.ProjectMemberRole(body.Role)
	}
	pid, err := uuid.Parse(projectID)
	if err != nil {
		BadRequest(w, "invalid project id")
		return
	}
	uid, err := uuid.Parse(body.UserID)
	if err != nil {
		BadRequest(w, "invalid user id")
		return
	}
	inviterID := UserIDFrom(r.Context())
	var invitedBy *uuid.UUID
	if inviterID != "" {
		if id, err := uuid.Parse(inviterID); err == nil {
			invitedBy = &id
		}
	}
	m := &db.ProjectMember{
		ProjectID: pid,
		UserID:    uid,
		Role:      role,
		InvitedBy:  invitedBy,
	}
	if err := h.store.AddProjectMember(r.Context(), m); err != nil {
		Err(w, err)
		return
	}
	JSON(w, http.StatusCreated, map[string]any{
		"project_id": m.ProjectID.String(),
		"user_id":    m.UserID.String(),
		"role":       string(m.Role),
		"joined_at":  m.JoinedAt,
	})
}

func (h *Handler) UpdateProjectMemberRole(w http.ResponseWriter, r *http.Request) {
	projectID := chi.URLParam(r, "projectId")
	userID := chi.URLParam(r, "userId")
	var body struct {
		Role string `json:"role"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		BadRequest(w, "invalid JSON")
		return
	}
	if body.Role == "" {
		BadRequest(w, "role required")
		return
	}
	if err := h.store.UpdateMemberRole(r.Context(), projectID, userID, db.ProjectMemberRole(body.Role)); err != nil {
		Err(w, err)
		return
	}
	m, err := h.store.GetProjectMember(r.Context(), projectID, userID)
	if err != nil {
		Err(w, err)
		return
	}
	JSON(w, http.StatusOK, map[string]any{
		"project_id": m.ProjectID.String(),
		"user_id":    m.UserID.String(),
		"role":       string(m.Role),
	})
}

func (h *Handler) RemoveProjectMember(w http.ResponseWriter, r *http.Request) {
	projectID := chi.URLParam(r, "projectId")
	userID := chi.URLParam(r, "userId")
	if err := h.store.RemoveProjectMember(r.Context(), projectID, userID); err != nil {
		Err(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func projectMemberResp(m *db.ProjectMemberWithUser) map[string]any {
	r := map[string]any{
		"project_id": m.ProjectID.String(),
		"user_id":    m.UserID.String(),
		"role":       string(m.Role),
		"joined_at":  m.JoinedAt,
		"email":      m.UserEmail,
		"name":       m.UserName,
	}
	if m.UserAvatarURL != nil {
		r["avatar_url"] = *m.UserAvatarURL
	}
	return r
}

// --- Agents ---

func (h *Handler) CreateAgent(w http.ResponseWriter, r *http.Request) {
	projectID := chi.URLParam(r, "projectId")
	userID := UserIDFrom(r.Context())
	if userID == "" {
		BadRequest(w, "X-User-ID required")
		return
	}
	var body struct {
		Name          string          `json:"name"`
		Slug          string          `json:"slug"`
		SystemPrompt  string          `json:"system_prompt"`
		Model         string          `json:"model"`
		VoiceProvider *string         `json:"voice_provider"`
		VoiceConfig                json.RawMessage `json:"voice_config"`
		Language                   string          `json:"language"`
		Metadata                   json.RawMessage `json:"metadata"`
		SessionStartInputSchema    json.RawMessage `json:"session_start_input_schema"`
		FormID                     *string         `json:"form_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		BadRequest(w, "invalid JSON")
		return
	}
	if body.Name == "" || body.Slug == "" {
		BadRequest(w, "name and slug required")
		return
	}
	pid, err := uuid.Parse(projectID)
	if err != nil {
		BadRequest(w, "invalid project id")
		return
	}
	uid, err := uuid.Parse(userID)
	if err != nil {
		BadRequest(w, "invalid user id")
		return
	}
	voiceConfig := datatypes.JSON([]byte("{}"))
	if len(body.VoiceConfig) > 0 {
		voiceConfig = datatypes.JSON(append([]byte(nil), body.VoiceConfig...))
	}
	metadata := datatypes.JSON([]byte("{}"))
	if len(body.Metadata) > 0 {
		metadata = datatypes.JSON(append([]byte(nil), body.Metadata...))
	}
	sessionStartSchema := datatypes.JSON([]byte("[]"))
	if len(body.SessionStartInputSchema) > 0 {
		sessionStartSchema = datatypes.JSON(append([]byte(nil), body.SessionStartInputSchema...))
	}
	model := body.Model
	if model == "" {
		model = "gpt-4o"
	}
	lang := body.Language
	if lang == "" {
		lang = "en"
	}
	var formID *uuid.UUID
	if body.FormID != nil && *body.FormID != "" {
		fid, err := uuid.Parse(*body.FormID)
		if err != nil {
			BadRequest(w, "invalid form_id")
			return
		}
		formID = &fid
	}
	a := &db.Agent{
		ProjectID:                pid,
		Name:                     body.Name,
		Slug:                     body.Slug,
		SystemPrompt:             body.SystemPrompt,
		Model:                    model,
		VoiceProvider:            body.VoiceProvider,
		VoiceConfig:              voiceConfig,
		Language:                 lang,
		Metadata:                 metadata,
		SessionStartInputSchema:  sessionStartSchema,
		FormID:                   formID,
		CreatedBy:                uid,
	}
	if err := h.store.CreateAgent(r.Context(), a); err != nil {
		Err(w, err)
		return
	}
	JSON(w, http.StatusCreated, agentResp(a))
}

func (h *Handler) ListAgents(w http.ResponseWriter, r *http.Request) {
	projectID := chi.URLParam(r, "projectId")
	list, err := h.store.ListAgentsByProject(r.Context(), projectID)
	if err != nil {
		Err(w, err)
		return
	}
	out := make([]map[string]any, len(list))
	for i := range list {
		out[i] = agentResp(&list[i])
	}
	JSON(w, http.StatusOK, map[string]any{"agents": out})
}

func (h *Handler) GetAgent(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	a, err := h.store.GetAgentByID(r.Context(), id)
	if err != nil {
		Err(w, err)
		return
	}
	JSON(w, http.StatusOK, agentResp(a))
}

func (h *Handler) UpdateAgent(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	a, err := h.store.GetAgentByID(r.Context(), id)
	if err != nil {
		Err(w, err)
		return
	}
	var body struct {
		Name          *string         `json:"name"`
		Slug          *string         `json:"slug"`
		SystemPrompt  *string        `json:"system_prompt"`
		Model         *string         `json:"model"`
		VoiceProvider *string         `json:"voice_provider"`
		VoiceConfig   json.RawMessage `json:"voice_config"`
		Language      *string         `json:"language"`
		Metadata                   json.RawMessage `json:"metadata"`
		SessionStartInputSchema    json.RawMessage `json:"session_start_input_schema"`
		FormID                     *string         `json:"form_id"`
		IsActive                   *bool           `json:"is_active"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		BadRequest(w, "invalid JSON")
		return
	}
	if body.Name != nil {
		a.Name = *body.Name
	}
	if body.Slug != nil {
		a.Slug = *body.Slug
	}
	if body.SystemPrompt != nil {
		a.SystemPrompt = *body.SystemPrompt
	}
	if body.Model != nil {
		a.Model = *body.Model
	}
	if body.VoiceProvider != nil {
		a.VoiceProvider = body.VoiceProvider
	}
	if len(body.VoiceConfig) > 0 {
		a.VoiceConfig = datatypes.JSON(append([]byte(nil), body.VoiceConfig...))
	}
	if body.Language != nil {
		a.Language = *body.Language
	}
	if len(body.Metadata) > 0 {
		a.Metadata = datatypes.JSON(append([]byte(nil), body.Metadata...))
	}
	if len(body.SessionStartInputSchema) > 0 {
		a.SessionStartInputSchema = datatypes.JSON(append([]byte(nil), body.SessionStartInputSchema...))
	}
	if body.FormID != nil {
		if *body.FormID == "" {
			a.FormID = nil
		} else {
			fid, err := uuid.Parse(*body.FormID)
			if err != nil {
				BadRequest(w, "invalid form_id")
				return
			}
			a.FormID = &fid
		}
	}
	if body.IsActive != nil {
		a.IsActive = *body.IsActive
	}
	if err := h.store.UpdateAgent(r.Context(), a); err != nil {
		Err(w, err)
		return
	}
	JSON(w, http.StatusOK, agentResp(a))
}

func (h *Handler) DeleteAgent(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := h.store.DeleteAgent(r.Context(), id); err != nil {
		Err(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func agentResp(a *db.Agent) map[string]any {
	r := map[string]any{
		"id":                          a.ID.String(),
		"project_id":                  a.ProjectID.String(),
		"name":                        a.Name,
		"slug":                        a.Slug,
		"system_prompt":               a.SystemPrompt,
		"model":                       a.Model,
		"language":                    a.Language,
		"is_active":                   a.IsActive,
		"created_by":                  a.CreatedBy.String(),
		"created_at":                  a.CreatedAt,
		"updated_at":                  a.UpdatedAt,
		"voice_config":                a.VoiceConfig,
		"metadata":                    a.Metadata,
		"session_start_input_schema":  a.SessionStartInputSchema,
	}
	if a.VoiceProvider != nil {
		r["voice_provider"] = *a.VoiceProvider
	}
	if a.FormID != nil {
		r["form_id"] = a.FormID.String()
	}
	return r
}

// --- Sessions ---

func (h *Handler) CreateSession(w http.ResponseWriter, r *http.Request) {
	agentID := chi.URLParam(r, "agentId")
	var body struct {
		ExternalUserID *string         `json:"external_user_id"`
		Channel       string          `json:"channel"`
		Metadata      json.RawMessage `json:"metadata"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	if body.Channel == "" {
		body.Channel = string(db.ChannelChat)
	}
	if body.Metadata == nil {
		body.Metadata = []byte("{}")
	}
	aid, err := uuid.Parse(agentID)
	if err != nil {
		BadRequest(w, "invalid agent id")
		return
	}
	meta := datatypes.JSON([]byte("{}"))
	if len(body.Metadata) > 0 {
		meta = datatypes.JSON(append([]byte(nil), body.Metadata...))
	}
	sess := &db.Session{
		AgentID:          aid,
		ExternalUserID:   body.ExternalUserID,
		Channel:          db.SessionChannel(body.Channel),
		Metadata:         meta,
	}
	if err := h.store.CreateSession(r.Context(), sess); err != nil {
		Err(w, err)
		return
	}
	JSON(w, http.StatusCreated, sessionResp(sess))
}

func (h *Handler) GetSession(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	sess, err := h.store.GetSessionByID(r.Context(), id)
	if err != nil {
		Err(w, err)
		return
	}
	JSON(w, http.StatusOK, sessionResp(sess))
}

func (h *Handler) ListSessions(w http.ResponseWriter, r *http.Request) {
	agentID := chi.URLParam(r, "agentId")
	limit := 50
	offset := 0
	if l := r.URL.Query().Get("limit"); l != "" {
		if v, err := strconv.Atoi(l); err == nil && v > 0 && v <= 100 {
			limit = v
		}
	}
	if o := r.URL.Query().Get("offset"); o != "" {
		if v, err := strconv.Atoi(o); err == nil && v >= 0 {
			offset = v
		}
	}
	list, err := h.store.ListSessionsByAgent(r.Context(), agentID, limit, offset)
	if err != nil {
		Err(w, err)
		return
	}
	out := make([]map[string]any, len(list))
	for i := range list {
		out[i] = sessionResp(&list[i])
	}
	JSON(w, http.StatusOK, map[string]any{"sessions": out})
}

func (h *Handler) EndSession(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	sess, err := h.store.EndSession(r.Context(), id)
	if err != nil {
		Err(w, err)
		return
	}
	JSON(w, http.StatusOK, sessionResp(sess))
}

// --- Agent Participants ---

func (h *Handler) CreateParticipant(w http.ResponseWriter, r *http.Request) {
	agentID := chi.URLParam(r, "id")
	var body struct {
		Name                 string   `json:"name"`
		Role                 string   `json:"role"`
		SystemPrompt         string   `json:"system_prompt"`
		Model                string   `json:"model"`
		VoiceProvider        *string  `json:"voice_provider"`
		VoiceID              *string  `json:"voice_id"`
		HandoffDescription   string   `json:"handoff_description"`
		IsEntryPoint         bool     `json:"is_entry_point"`
		Position             int      `json:"position"`
		ParentParticipantIDs []string `json:"parent_participant_ids"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		BadRequest(w, "invalid JSON")
		return
	}
	if body.Name == "" || body.Role == "" {
		BadRequest(w, "name and role required")
		return
	}
	aid, err := uuid.Parse(agentID)
	if err != nil {
		BadRequest(w, "invalid agent id")
		return
	}
	model := body.Model
	if model == "" {
		model = "gpt-4o"
	}
	p := &db.AgentParticipant{
		AgentID:            aid,
		Name:               body.Name,
		Role:               body.Role,
		SystemPrompt:       body.SystemPrompt,
		Model:              model,
		VoiceProvider:      body.VoiceProvider,
		VoiceID:            body.VoiceID,
		HandoffDescription: body.HandoffDescription,
		IsEntryPoint:       body.IsEntryPoint,
		Position:           body.Position,
	}
	if err := h.store.CreateParticipant(r.Context(), p); err != nil {
		Err(w, err)
		return
	}
	if len(body.ParentParticipantIDs) > 0 {
		if err := h.store.SetParticipantParents(r.Context(), p.ID.String(), body.ParentParticipantIDs); err != nil {
			Err(w, err)
			return
		}
	}
	parentIDs := body.ParentParticipantIDs
	if parentIDs == nil {
		parentIDs = []string{}
	}
	JSON(w, http.StatusCreated, participantResp(p, parentIDs))
}

func (h *Handler) ListParticipants(w http.ResponseWriter, r *http.Request) {
	agentID := chi.URLParam(r, "id")
	list, err := h.store.ListParticipantsByAgent(r.Context(), agentID)
	if err != nil {
		Err(w, err)
		return
	}
	out := make([]map[string]any, len(list))
	for i := range list {
		parentIDs, _ := h.store.ListParticipantParentIDs(r.Context(), list[i].ID.String())
		out[i] = participantResp(&list[i], parentIDs)
	}
	JSON(w, http.StatusOK, map[string]any{"participants": out})
}

func (h *Handler) GetParticipant(w http.ResponseWriter, r *http.Request) {
	pid := chi.URLParam(r, "pid")
	p, err := h.store.GetParticipantByID(r.Context(), pid)
	if err != nil {
		Err(w, err)
		return
	}
	parentIDs, _ := h.store.ListParticipantParentIDs(r.Context(), pid)
	JSON(w, http.StatusOK, participantResp(p, parentIDs))
}

func (h *Handler) UpdateParticipant(w http.ResponseWriter, r *http.Request) {
	pid := chi.URLParam(r, "pid")
	p, err := h.store.GetParticipantByID(r.Context(), pid)
	if err != nil {
		Err(w, err)
		return
	}
	var body struct {
		Name                 *string  `json:"name"`
		Role                 *string  `json:"role"`
		SystemPrompt         *string  `json:"system_prompt"`
		Model                *string  `json:"model"`
		VoiceProvider        *string  `json:"voice_provider"`
		VoiceID              *string  `json:"voice_id"`
		HandoffDescription   *string  `json:"handoff_description"`
		IsEntryPoint         *bool    `json:"is_entry_point"`
		Position             *int     `json:"position"`
		ParentParticipantIDs []string `json:"parent_participant_ids"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		BadRequest(w, "invalid JSON")
		return
	}
	if body.Name != nil {
		p.Name = *body.Name
	}
	if body.Role != nil {
		p.Role = *body.Role
	}
	if body.SystemPrompt != nil {
		p.SystemPrompt = *body.SystemPrompt
	}
	if body.Model != nil {
		p.Model = *body.Model
	}
	if body.VoiceProvider != nil {
		p.VoiceProvider = body.VoiceProvider
	}
	if body.VoiceID != nil {
		p.VoiceID = body.VoiceID
	}
	if body.HandoffDescription != nil {
		p.HandoffDescription = *body.HandoffDescription
	}
	if body.IsEntryPoint != nil {
		p.IsEntryPoint = *body.IsEntryPoint
	}
	if body.Position != nil {
		p.Position = *body.Position
	}
	if body.ParentParticipantIDs != nil {
		if err := h.store.SetParticipantParents(r.Context(), pid, body.ParentParticipantIDs); err != nil {
			Err(w, err)
			return
		}
	}
	if err := h.store.UpdateParticipant(r.Context(), p); err != nil {
		Err(w, err)
		return
	}
	parentIDs, _ := h.store.ListParticipantParentIDs(r.Context(), pid)
	JSON(w, http.StatusOK, participantResp(p, parentIDs))
}

func (h *Handler) DeleteParticipant(w http.ResponseWriter, r *http.Request) {
	pid := chi.URLParam(r, "pid")
	if err := h.store.DeleteParticipant(r.Context(), pid); err != nil {
		Err(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func participantResp(p *db.AgentParticipant, parentIDs []string) map[string]any {
	r := map[string]any{
		"id":                    p.ID.String(),
		"agent_id":              p.AgentID.String(),
		"parent_participant_ids": parentIDs,
		"name":                  p.Name,
		"role":                  p.Role,
		"system_prompt":         p.SystemPrompt,
		"model":                 p.Model,
		"voice_config":          p.VoiceConfig,
		"handoff_description":   p.HandoffDescription,
		"is_entry_point":        p.IsEntryPoint,
		"position":              p.Position,
		"created_at":            p.CreatedAt,
		"updated_at":            p.UpdatedAt,
	}
	if p.VoiceProvider != nil {
		r["voice_provider"] = *p.VoiceProvider
	}
	if p.VoiceID != nil {
		r["voice_id"] = *p.VoiceID
	}
	return r
}

// --- Session Start (LiveKit) ---

func (h *Handler) StartSession(w http.ResponseWriter, r *http.Request) {
	agentID := chi.URLParam(r, "id")

	if h.livekit == nil {
		Err(w, &errMsg{code: http.StatusServiceUnavailable, msg: "LiveKit not configured"})
		return
	}

	agent, participants, err := h.store.GetAgentWithParticipants(r.Context(), agentID)
	if err != nil {
		Err(w, err)
		return
	}
	if !agent.IsActive {
		BadRequest(w, "agent is not active")
		return
	}
	if len(participants) == 0 {
		BadRequest(w, "agent has no participants configured")
		return
	}
	hasEntry := false
	for _, p := range participants {
		if p.IsEntryPoint {
			hasEntry = true
			break
		}
	}
	if !hasEntry {
		BadRequest(w, "agent has no entry point participant")
		return
	}

	var body struct {
		Identity         string            `json:"identity"`
		Channel          string            `json:"channel"`
		SessionStartData map[string]string `json:"session_start_data"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		BadRequest(w, "invalid JSON")
		return
	}
	if body.Identity == "" {
		body.Identity = "user"
	}
	channel := db.ChannelVoice
	if body.Channel == "chat" {
		channel = db.ChannelChat
	}

	log.Printf("[session] StartSession: agent_id=%s identity=%s channel=%s", agentID, body.Identity, channel)
	roomName, token, err := h.livekit.CreateSessionRoom(r.Context(), agentID, body.Identity)
	if err != nil {
		Err(w, err)
		return
	}

	meta := datatypes.JSON([]byte("{}"))
	if len(body.SessionStartData) > 0 {
		metaBytes, _ := json.Marshal(body.SessionStartData)
		meta = datatypes.JSON(metaBytes)
	}
	sess := &db.Session{
		AgentID:        agent.ID,
		ExternalUserID: &body.Identity,
		Channel:        channel,
		Status:         db.StatusActive,
		Metadata:       meta,
	}
	if err := h.store.CreateSession(r.Context(), sess); err != nil {
		Err(w, err)
		return
	}

	log.Printf("[session] StartSession created: session_id=%s room_name=%s identity=%s", sess.ID.String(), roomName, body.Identity)
	JSON(w, http.StatusCreated, map[string]any{
		"session":    sessionResp(sess),
		"room_name":  roomName,
		"token":      token,
	})
}

type errMsg struct {
	code int
	msg  string
}

func (e *errMsg) Error() string { return e.msg }

// --- Forms ---

func (h *Handler) CreateForm(w http.ResponseWriter, r *http.Request) {
	projectID := chi.URLParam(r, "projectId")
	userID := UserIDFrom(r.Context())
	if userID == "" {
		BadRequest(w, "X-User-ID required")
		return
	}
	var body struct {
		Name        string          `json:"name"`
		Slug        string          `json:"slug"`
		Description string          `json:"description"`
		Fields      json.RawMessage `json:"fields"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		BadRequest(w, "invalid JSON")
		return
	}
	if body.Name == "" || body.Slug == "" {
		BadRequest(w, "name and slug required")
		return
	}
	pid, err := uuid.Parse(projectID)
	if err != nil {
		BadRequest(w, "invalid project id")
		return
	}
	uid, err := uuid.Parse(userID)
	if err != nil {
		BadRequest(w, "invalid user id")
		return
	}
	f := &db.Form{
		ProjectID:   pid,
		Name:        body.Name,
		Slug:        body.Slug,
		Description: body.Description,
		CreatedBy:   uid,
	}
	if err := h.store.CreateForm(r.Context(), f); err != nil {
		Err(w, err)
		return
	}
	if len(body.Fields) > 0 {
		var fields []struct {
			Key        string          `json:"key"`
			Label      string          `json:"label"`
			Type       string          `json:"type"`
			Config     json.RawMessage `json:"config"`
			Validators json.RawMessage `json:"validators"`
			Required   bool            `json:"required"`
			Position   int             `json:"position"`
		}
		if err := json.Unmarshal(body.Fields, &fields); err == nil {
			for _, fd := range fields {
				fieldType := fd.Type
				if fieldType == "" {
					fieldType = "text"
				}
				config := datatypes.JSON([]byte("{}"))
				if len(fd.Config) > 0 {
					config = datatypes.JSON(append([]byte(nil), fd.Config...))
				}
				validators := datatypes.JSON([]byte("[]"))
				if len(fd.Validators) > 0 {
					validators = datatypes.JSON(append([]byte(nil), fd.Validators...))
				}
				ff := &db.FormField{
					FormID:     f.ID,
					Key:        fd.Key,
					Label:      fd.Label,
					Type:       fieldType,
					Config:     config,
					Validators: validators,
					Required:   fd.Required,
					Position:   fd.Position,
				}
				_ = h.store.CreateFormField(r.Context(), ff)
			}
		}
	}
	form, _ := h.store.GetFormWithFields(r.Context(), f.ID.String())
	if form == nil {
		form = f
	}
	JSON(w, http.StatusCreated, formResp(form))
}

func (h *Handler) ListForms(w http.ResponseWriter, r *http.Request) {
	projectID := chi.URLParam(r, "projectId")
	list, err := h.store.ListFormsByProject(r.Context(), projectID)
	if err != nil {
		Err(w, err)
		return
	}
	out := make([]map[string]any, len(list))
	for i := range list {
		out[i] = formResp(&list[i])
	}
	JSON(w, http.StatusOK, map[string]any{"forms": out})
}

func (h *Handler) GetForm(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	f, err := h.store.GetFormWithFields(r.Context(), id)
	if err != nil {
		Err(w, err)
		return
	}
	JSON(w, http.StatusOK, formResp(f))
}

func (h *Handler) UpdateForm(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	f, err := h.store.GetFormByID(r.Context(), id)
	if err != nil {
		Err(w, err)
		return
	}
	var body struct {
		Name        *string         `json:"name"`
		Slug        *string         `json:"slug"`
		Description *string         `json:"description"`
		Fields      json.RawMessage `json:"fields"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		BadRequest(w, "invalid JSON")
		return
	}
	if body.Name != nil {
		f.Name = *body.Name
	}
	if body.Slug != nil {
		f.Slug = *body.Slug
	}
	if body.Description != nil {
		f.Description = *body.Description
	}
	if err := h.store.UpdateForm(r.Context(), f); err != nil {
		Err(w, err)
		return
	}
	if len(body.Fields) > 0 {
		var fields []struct {
			ID         *string         `json:"id"`
			Key        string          `json:"key"`
			Label      string          `json:"label"`
			Type       string          `json:"type"`
			Config     json.RawMessage `json:"config"`
			Validators json.RawMessage `json:"validators"`
			Required   bool            `json:"required"`
			Position   int             `json:"position"`
		}
		if err := json.Unmarshal(body.Fields, &fields); err == nil {
			_ = h.store.DeleteFormFieldsByForm(r.Context(), f.ID.String())
			for _, fd := range fields {
				fieldType := fd.Type
				if fieldType == "" {
					fieldType = "text"
				}
				config := datatypes.JSON([]byte("{}"))
				if len(fd.Config) > 0 {
					config = datatypes.JSON(append([]byte(nil), fd.Config...))
				}
				validators := datatypes.JSON([]byte("[]"))
				if len(fd.Validators) > 0 {
					validators = datatypes.JSON(append([]byte(nil), fd.Validators...))
				}
				ff := &db.FormField{
					FormID:     f.ID,
					Key:        fd.Key,
					Label:      fd.Label,
					Type:       fieldType,
					Config:     config,
					Validators: validators,
					Required:   fd.Required,
					Position:   fd.Position,
				}
				_ = h.store.CreateFormField(r.Context(), ff)
			}
		}
	}
	form, _ := h.store.GetFormWithFields(r.Context(), f.ID.String())
	if form == nil {
		form = f
	}
	JSON(w, http.StatusOK, formResp(form))
}

func (h *Handler) DeleteForm(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := h.store.DeleteForm(r.Context(), id); err != nil {
		Err(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func formResp(f *db.Form) map[string]any {
	r := map[string]any{
		"id":          f.ID.String(),
		"project_id":  f.ProjectID.String(),
		"name":        f.Name,
		"slug":        f.Slug,
		"description": f.Description,
		"created_by":  f.CreatedBy.String(),
		"created_at":  f.CreatedAt,
		"updated_at":  f.UpdatedAt,
	}
	if f.Fields != nil {
		fields := make([]map[string]any, len(f.Fields))
		for i := range f.Fields {
			fields[i] = formFieldResp(&f.Fields[i])
		}
		r["fields"] = fields
	}
	return r
}

func formFieldResp(f *db.FormField) map[string]any {
	return map[string]any{
		"id":         f.ID.String(),
		"form_id":    f.FormID.String(),
		"key":        f.Key,
		"label":      f.Label,
		"type":       f.Type,
		"config":     f.Config,
		"validators": f.Validators,
		"required":   f.Required,
		"position":   f.Position,
		"created_at": f.CreatedAt,
		"updated_at": f.UpdatedAt,
	}
}

func sessionResp(s *db.Session) map[string]any {
	r := map[string]any{
		"id":         s.ID.String(),
		"agent_id":   s.AgentID.String(),
		"channel":    string(s.Channel),
		"status":     string(s.Status),
		"metadata":   s.Metadata,
		"started_at": s.StartedAt,
		"created_at": s.CreatedAt,
	}
	if s.ExternalUserID != nil {
		r["external_user_id"] = *s.ExternalUserID
	}
	if s.EndedAt != nil {
		r["ended_at"] = s.EndedAt
	}
	return r
}
