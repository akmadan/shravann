package api

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	lk "github.com/shravann/api/internal/livekit"
	"github.com/shravann/api/internal/store"
)

func NewServer(s *store.Store, lkClient *lk.Client) http.Handler {
	h := NewHandler(s, lkClient)
	r := chi.NewRouter()

	r.Use(CORS)
	r.Use(chimiddleware.RequestID)
	r.Use(chimiddleware.RealIP)
	r.Use(chimiddleware.Logger)
	r.Use(chimiddleware.Recoverer)

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok"))
	})

	r.Post("/auth/sync", h.SyncUser)

	r.Route("/users", func(r chi.Router) {
		r.Post("/", h.CreateUser)
		r.Get("/{id}", h.GetUser)
		r.Patch("/{id}", h.UpdateUser)
	})

	// Projects, agents, forms require X-User-ID
	r.Group(func(r chi.Router) {
		r.Use(RequireUserID)
		r.Route("/projects", func(r chi.Router) {
			r.Get("/", h.ListProjects)
			r.Post("/", h.CreateProject)
			r.Get("/{id}", h.GetProject)
			r.Patch("/{id}", h.UpdateProject)
			r.Delete("/{id}", h.DeleteProject)
			r.Get("/{projectId}/members", h.ListProjectMembers)
			r.Post("/{projectId}/members", h.AddProjectMember)
			r.Patch("/{projectId}/members/{userId}", h.UpdateProjectMemberRole)
			r.Delete("/{projectId}/members/{userId}", h.RemoveProjectMember)
			r.Get("/{projectId}/agents", h.ListAgents)
			r.Post("/{projectId}/agents", h.CreateAgent)
			r.Get("/{projectId}/forms", h.ListForms)
			r.Post("/{projectId}/forms", h.CreateForm)
		})
	})

	// Agents by id (no auth for now - e.g. public agent lookup)
	r.Route("/agents", func(r chi.Router) {
		r.Get("/{id}", h.GetAgent)
		r.Patch("/{id}", h.UpdateAgent)
		r.Delete("/{id}", h.DeleteAgent)

		// Participants (sub-agents)
		r.Get("/{id}/participants", h.ListParticipants)
		r.Post("/{id}/participants", h.CreateParticipant)
		r.Get("/{id}/participants/{pid}", h.GetParticipant)
		r.Patch("/{id}/participants/{pid}", h.UpdateParticipant)
		r.Delete("/{id}/participants/{pid}", h.DeleteParticipant)

		// Sessions
		r.Post("/{agentId}/sessions", h.CreateSession)
		r.Get("/{agentId}/sessions", h.ListSessions)
		r.Post("/{id}/sessions/start", h.StartSession)
	})

	r.Route("/sessions", func(r chi.Router) {
		r.Get("/{id}", h.GetSession)
		r.Post("/{id}/end", h.EndSession)
	})

	// Forms by id (public GET for session app, auth-free PATCH/DELETE for dashboard)
	r.Route("/forms", func(r chi.Router) {
		r.Get("/{id}", h.GetForm)
		r.Patch("/{id}", h.UpdateForm)
		r.Delete("/{id}", h.DeleteForm)
	})

	return r
}
