package store

import (
	"context"

	"github.com/google/uuid"
	"github.com/shravann/api/internal/db"
	"gorm.io/gorm"
)

type Store struct {
	db *gorm.DB
}

func New(database *gorm.DB) *Store {
	return &Store{db: database}
}

// WithTx runs fn inside a transaction. If fn returns an error, the transaction is rolled back.
func (s *Store) WithTx(ctx context.Context, fn func(tx *gorm.DB) error) error {
	return s.db.WithContext(ctx).Transaction(fn)
}

// --- Users ---

func (s *Store) CreateUser(ctx context.Context, u *db.User) error {
	return s.db.WithContext(ctx).Create(u).Error
}

func (s *Store) GetUserByID(ctx context.Context, id string) (*db.User, error) {
	var u db.User
	err := s.db.WithContext(ctx).Where("id = ?", id).First(&u).Error
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (s *Store) GetUserByEmail(ctx context.Context, email string) (*db.User, error) {
	var u db.User
	err := s.db.WithContext(ctx).Where("email = ?", email).First(&u).Error
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (s *Store) GetUserByAuthProvider(ctx context.Context, provider, providerID string) (*db.User, error) {
	var u db.User
	err := s.db.WithContext(ctx).Where("auth_provider = ? AND auth_provider_id = ?", provider, providerID).First(&u).Error
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (s *Store) UpdateUser(ctx context.Context, u *db.User) error {
	return s.db.WithContext(ctx).Save(u).Error
}

func (s *Store) DeleteUser(ctx context.Context, id string) error {
	return s.db.WithContext(ctx).Where("id = ?", id).Delete(&db.User{}).Error
}

// UpsertUserByAuthProvider finds a user by auth_provider+auth_provider_id.
// If found, updates name/email/avatar. If not, creates a new user.
func (s *Store) UpsertUserByAuthProvider(ctx context.Context, u *db.User) (*db.User, error) {
	var existing db.User
	err := s.db.WithContext(ctx).
		Where("auth_provider = ? AND auth_provider_id = ?", u.AuthProvider, u.AuthProviderID).
		First(&existing).Error
	if err == nil {
		existing.Email = u.Email
		existing.Name = u.Name
		existing.AvatarURL = u.AvatarURL
		if err := s.db.WithContext(ctx).Save(&existing).Error; err != nil {
			return nil, err
		}
		return &existing, nil
	}
	if err := s.db.WithContext(ctx).Create(u).Error; err != nil {
		return nil, err
	}
	return u, nil
}

// --- Projects ---

func (s *Store) CreateProject(ctx context.Context, p *db.Project) error {
	return s.db.WithContext(ctx).Create(p).Error
}

func (s *Store) GetProjectByID(ctx context.Context, id string) (*db.Project, error) {
	var p db.Project
	err := s.db.WithContext(ctx).Where("id = ?", id).First(&p).Error
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (s *Store) GetProjectBySlug(ctx context.Context, slug string) (*db.Project, error) {
	var p db.Project
	err := s.db.WithContext(ctx).Where("slug = ?", slug).First(&p).Error
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (s *Store) ListProjectsByUser(ctx context.Context, userID string) ([]db.Project, error) {
	var list []db.Project
	err := s.db.WithContext(ctx).Table("projects").
		Joins("JOIN project_members ON project_members.project_id = projects.id").
		Where("project_members.user_id = ?", userID).
		Order("projects.created_at DESC").
		Find(&list).Error
	return list, err
}

func (s *Store) UpdateProject(ctx context.Context, p *db.Project) error {
	return s.db.WithContext(ctx).Save(p).Error
}

func (s *Store) DeleteProject(ctx context.Context, id string) error {
	return s.db.WithContext(ctx).Where("id = ?", id).Delete(&db.Project{}).Error
}

// --- Project members ---

func (s *Store) AddProjectMember(ctx context.Context, m *db.ProjectMember) error {
	return s.db.WithContext(ctx).Create(m).Error
}

func (s *Store) GetProjectMember(ctx context.Context, projectID, userID string) (*db.ProjectMember, error) {
	var m db.ProjectMember
	err := s.db.WithContext(ctx).Where("project_id = ? AND user_id = ?", projectID, userID).First(&m).Error
	if err != nil {
		return nil, err
	}
	return &m, nil
}

func (s *Store) ListProjectMembers(ctx context.Context, projectID string) ([]db.ProjectMemberWithUser, error) {
	var list []db.ProjectMemberWithUser
	err := s.db.WithContext(ctx).Table("project_members").
		Select("project_members.*, users.email AS email, users.name AS name, users.avatar_url AS avatar_url").
		Joins("JOIN users ON users.id = project_members.user_id").
		Where("project_members.project_id = ?", projectID).
		Order("project_members.joined_at ASC").
		Find(&list).Error
	return list, err
}

func (s *Store) UpdateMemberRole(ctx context.Context, projectID, userID string, role db.ProjectMemberRole) error {
	return s.db.WithContext(ctx).Model(&db.ProjectMember{}).
		Where("project_id = ? AND user_id = ?", projectID, userID).
		Update("role", role).Error
}

func (s *Store) RemoveProjectMember(ctx context.Context, projectID, userID string) error {
	return s.db.WithContext(ctx).Where("project_id = ? AND user_id = ?", projectID, userID).Delete(&db.ProjectMember{}).Error
}

func (s *Store) CountProjectMembers(ctx context.Context, projectID string) (int64, error) {
	var n int64
	err := s.db.WithContext(ctx).Model(&db.ProjectMember{}).Where("project_id = ?", projectID).Count(&n).Error
	return n, err
}

// --- Agents ---

func (s *Store) CreateAgent(ctx context.Context, a *db.Agent) error {
	return s.db.WithContext(ctx).Create(a).Error
}

func (s *Store) GetAgentByID(ctx context.Context, id string) (*db.Agent, error) {
	var a db.Agent
	err := s.db.WithContext(ctx).Where("id = ?", id).First(&a).Error
	if err != nil {
		return nil, err
	}
	return &a, nil
}

func (s *Store) GetAgentBySlug(ctx context.Context, projectID, slug string) (*db.Agent, error) {
	var a db.Agent
	err := s.db.WithContext(ctx).Where("project_id = ? AND slug = ?", projectID, slug).First(&a).Error
	if err != nil {
		return nil, err
	}
	return &a, nil
}

func (s *Store) ListAgentsByProject(ctx context.Context, projectID string) ([]db.Agent, error) {
	var list []db.Agent
	err := s.db.WithContext(ctx).Where("project_id = ?", projectID).Order("created_at DESC").Find(&list).Error
	return list, err
}

func (s *Store) ListActiveAgentsByProject(ctx context.Context, projectID string) ([]db.Agent, error) {
	var list []db.Agent
	err := s.db.WithContext(ctx).Where("project_id = ? AND is_active = ?", projectID, true).Order("created_at DESC").Find(&list).Error
	return list, err
}

func (s *Store) UpdateAgent(ctx context.Context, a *db.Agent) error {
	return s.db.WithContext(ctx).Save(a).Error
}

func (s *Store) DeleteAgent(ctx context.Context, id string) error {
	return s.db.WithContext(ctx).Where("id = ?", id).Delete(&db.Agent{}).Error
}

// --- Agent Participants ---

func (s *Store) CreateParticipant(ctx context.Context, p *db.AgentParticipant) error {
	return s.db.WithContext(ctx).Create(p).Error
}

func (s *Store) GetParticipantByID(ctx context.Context, id string) (*db.AgentParticipant, error) {
	var p db.AgentParticipant
	err := s.db.WithContext(ctx).Where("id = ?", id).First(&p).Error
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (s *Store) ListParticipantsByAgent(ctx context.Context, agentID string) ([]db.AgentParticipant, error) {
	var list []db.AgentParticipant
	err := s.db.WithContext(ctx).Where("agent_id = ?", agentID).Order("position ASC, created_at ASC").Find(&list).Error
	return list, err
}

func (s *Store) UpdateParticipant(ctx context.Context, p *db.AgentParticipant) error {
	return s.db.WithContext(ctx).Save(p).Error
}

func (s *Store) DeleteParticipant(ctx context.Context, id string) error {
	return s.db.WithContext(ctx).Where("id = ?", id).Delete(&db.AgentParticipant{}).Error
}

// SetParticipantParents replaces all parents for a participant (many-to-many).
func (s *Store) SetParticipantParents(ctx context.Context, participantID string, parentIDs []string) error {
	pid, err := uuid.Parse(participantID)
	if err != nil {
		return err
	}
	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("participant_id = ?", pid).Delete(&db.AgentParticipantParent{}).Error; err != nil {
			return err
		}
		for _, parentID := range parentIDs {
			parentUUID, err := uuid.Parse(parentID)
			if err != nil {
				return err
			}
			if parentUUID == pid {
				continue
			}
			if err := tx.Create(&db.AgentParticipantParent{ParticipantID: pid, ParentID: parentUUID}).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

// ListParticipantParentIDs returns parent IDs for a participant.
func (s *Store) ListParticipantParentIDs(ctx context.Context, participantID string) ([]string, error) {
	var rows []db.AgentParticipantParent
	err := s.db.WithContext(ctx).Where("participant_id = ?", participantID).Find(&rows).Error
	if err != nil {
		return nil, err
	}
	ids := make([]string, len(rows))
	for i := range rows {
		ids[i] = rows[i].ParentID.String()
	}
	return ids, nil
}

// GetAgentWithParticipants loads an agent and all its participants in one shot (used by worker).
func (s *Store) GetAgentWithParticipants(ctx context.Context, agentID string) (*db.Agent, []db.AgentParticipant, error) {
	agent, err := s.GetAgentByID(ctx, agentID)
	if err != nil {
		return nil, nil, err
	}
	participants, err := s.ListParticipantsByAgent(ctx, agentID)
	if err != nil {
		return nil, nil, err
	}
	return agent, participants, nil
}

// --- Sessions ---

func (s *Store) CreateSession(ctx context.Context, sess *db.Session) error {
	return s.db.WithContext(ctx).Create(sess).Error
}

func (s *Store) GetSessionByID(ctx context.Context, id string) (*db.Session, error) {
	var sess db.Session
	err := s.db.WithContext(ctx).Where("id = ?", id).First(&sess).Error
	if err != nil {
		return nil, err
	}
	return &sess, nil
}

func (s *Store) ListSessionsByAgent(ctx context.Context, agentID string, limit, offset int) ([]db.Session, error) {
	var list []db.Session
	err := s.db.WithContext(ctx).Where("agent_id = ?", agentID).Order("started_at DESC").Limit(limit).Offset(offset).Find(&list).Error
	return list, err
}

func (s *Store) ListSessionsByStatus(ctx context.Context, agentID string, status db.SessionStatus) ([]db.Session, error) {
	var list []db.Session
	err := s.db.WithContext(ctx).Where("agent_id = ? AND status = ?", agentID, status).Order("started_at DESC").Find(&list).Error
	return list, err
}

func (s *Store) EndSession(ctx context.Context, id string) (*db.Session, error) {
	if err := s.db.WithContext(ctx).Model(&db.Session{}).Where("id = ?", id).
		Updates(map[string]interface{}{"status": db.StatusEnded, "ended_at": gorm.Expr("now()")}).Error; err != nil {
		return nil, err
	}
	return s.GetSessionByID(ctx, id)
}

func (s *Store) FailSession(ctx context.Context, id string) (*db.Session, error) {
	if err := s.db.WithContext(ctx).Model(&db.Session{}).Where("id = ?", id).Updates(map[string]interface{}{"status": db.StatusError, "ended_at": gorm.Expr("now()")}).Error; err != nil {
		return nil, err
	}
	return s.GetSessionByID(ctx, id)
}

func (s *Store) CountSessionsByAgent(ctx context.Context, agentID string) (int64, error) {
	var n int64
	err := s.db.WithContext(ctx).Model(&db.Session{}).Where("agent_id = ?", agentID).Count(&n).Error
	return n, err
}

// --- Forms ---

func (s *Store) CreateForm(ctx context.Context, f *db.Form) error {
	return s.db.WithContext(ctx).Create(f).Error
}

func (s *Store) GetFormByID(ctx context.Context, id string) (*db.Form, error) {
	var f db.Form
	err := s.db.WithContext(ctx).Where("id = ?", id).First(&f).Error
	if err != nil {
		return nil, err
	}
	return &f, nil
}

func (s *Store) GetFormWithFields(ctx context.Context, id string) (*db.Form, error) {
	var f db.Form
	err := s.db.WithContext(ctx).Where("id = ?", id).Preload("Fields", func(tx *gorm.DB) *gorm.DB {
		return tx.Order("position ASC, created_at ASC")
	}).First(&f).Error
	if err != nil {
		return nil, err
	}
	return &f, nil
}

func (s *Store) ListFormsByProject(ctx context.Context, projectID string) ([]db.Form, error) {
	var list []db.Form
	err := s.db.WithContext(ctx).Where("project_id = ?", projectID).Order("created_at DESC").Find(&list).Error
	return list, err
}

func (s *Store) UpdateForm(ctx context.Context, f *db.Form) error {
	return s.db.WithContext(ctx).Save(f).Error
}

func (s *Store) DeleteForm(ctx context.Context, id string) error {
	return s.db.WithContext(ctx).Where("id = ?", id).Delete(&db.Form{}).Error
}

// --- Form Fields ---

func (s *Store) CreateFormField(ctx context.Context, f *db.FormField) error {
	return s.db.WithContext(ctx).Create(f).Error
}

func (s *Store) GetFormFieldByID(ctx context.Context, id string) (*db.FormField, error) {
	var f db.FormField
	err := s.db.WithContext(ctx).Where("id = ?", id).First(&f).Error
	if err != nil {
		return nil, err
	}
	return &f, nil
}

func (s *Store) ListFormFields(ctx context.Context, formID string) ([]db.FormField, error) {
	var list []db.FormField
	err := s.db.WithContext(ctx).Where("form_id = ?", formID).Order("position ASC, created_at ASC").Find(&list).Error
	return list, err
}

func (s *Store) UpdateFormField(ctx context.Context, f *db.FormField) error {
	return s.db.WithContext(ctx).Save(f).Error
}

func (s *Store) DeleteFormField(ctx context.Context, id string) error {
	return s.db.WithContext(ctx).Where("id = ?", id).Delete(&db.FormField{}).Error
}

func (s *Store) DeleteFormFieldsByForm(ctx context.Context, formID string) error {
	return s.db.WithContext(ctx).Where("form_id = ?", formID).Delete(&db.FormField{}).Error
}

// --- Session Transcripts ---

func (s *Store) CreateSessionTranscripts(ctx context.Context, transcripts []db.SessionTranscript) error {
	if len(transcripts) == 0 {
		return nil
	}
	return s.db.WithContext(ctx).Create(&transcripts).Error
}

func (s *Store) ListSessionTranscripts(ctx context.Context, sessionID string) ([]db.SessionTranscript, error) {
	var list []db.SessionTranscript
	err := s.db.WithContext(ctx).Where("session_id = ?", sessionID).Order("position ASC").Find(&list).Error
	return list, err
}

// --- Project API Keys ---

func (s *Store) UpsertProjectAPIKey(ctx context.Context, key *db.ProjectAPIKey) error {
	var existing db.ProjectAPIKey
	err := s.db.WithContext(ctx).
		Where("project_id = ? AND provider = ?", key.ProjectID, key.Provider).
		First(&existing).Error
	if err == nil {
		existing.EncryptedKey = key.EncryptedKey
		return s.db.WithContext(ctx).Save(&existing).Error
	}
	return s.db.WithContext(ctx).Create(key).Error
}

func (s *Store) ListProjectAPIKeys(ctx context.Context, projectID string) ([]db.ProjectAPIKey, error) {
	var list []db.ProjectAPIKey
	err := s.db.WithContext(ctx).Where("project_id = ?", projectID).Order("provider ASC").Find(&list).Error
	return list, err
}

func (s *Store) GetProjectAPIKey(ctx context.Context, projectID, provider string) (*db.ProjectAPIKey, error) {
	var key db.ProjectAPIKey
	err := s.db.WithContext(ctx).Where("project_id = ? AND provider = ?", projectID, provider).First(&key).Error
	if err != nil {
		return nil, err
	}
	return &key, nil
}

func (s *Store) DeleteProjectAPIKey(ctx context.Context, projectID, provider string) error {
	return s.db.WithContext(ctx).Where("project_id = ? AND provider = ?", projectID, provider).Delete(&db.ProjectAPIKey{}).Error
}
