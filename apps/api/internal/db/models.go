package db

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
)

type User struct {
	ID             uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	Email          string    `gorm:"type:text;not null;uniqueIndex"`
	Name           string    `gorm:"type:text;not null"`
	AvatarURL      *string   `gorm:"column:avatar_url;type:text"`
	AuthProvider   string    `gorm:"column:auth_provider;type:text;not null;uniqueIndex:idx_users_auth"`
	AuthProviderID string    `gorm:"column:auth_provider_id;type:text;not null;uniqueIndex:idx_users_auth"`
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

func (User) TableName() string { return "users" }

type Project struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	Name      string    `gorm:"type:text;not null"`
	Slug      string    `gorm:"type:text;not null;uniqueIndex"`
	CreatedBy uuid.UUID `gorm:"type:uuid;not null;index"`
	CreatedAt time.Time
	UpdatedAt time.Time

	CreatedByUser User `gorm:"foreignKey:CreatedBy"`
}

func (Project) TableName() string { return "projects" }

type ProjectMemberRole string

const (
	RoleOwner  ProjectMemberRole = "owner"
	RoleAdmin  ProjectMemberRole = "admin"
	RoleMember ProjectMemberRole = "member"
)

type ProjectMember struct {
	ProjectID uuid.UUID         `gorm:"type:uuid;primaryKey"`
	UserID    uuid.UUID         `gorm:"type:uuid;primaryKey"`
	Role      ProjectMemberRole `gorm:"type:text;not null;default:member"`
	InvitedBy *uuid.UUID        `gorm:"type:uuid"`
	JoinedAt  time.Time         `gorm:"not null"`

	Project Project `gorm:"foreignKey:ProjectID"`
	User    User    `gorm:"foreignKey:UserID"`
}

func (ProjectMember) TableName() string { return "project_members" }

type Agent struct {
	ID            uuid.UUID      `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	ProjectID     uuid.UUID      `gorm:"type:uuid;not null;index"`
	Name          string         `gorm:"type:text;not null"`
	Slug          string         `gorm:"type:text;not null;uniqueIndex:idx_agents_project_slug"`
	SystemPrompt  string         `gorm:"column:system_prompt;type:text;not null;default:''"`
	Model         string         `gorm:"type:text;not null;default:gpt-4o"`
	VoiceProvider *string        `gorm:"column:voice_provider;type:text"`
	VoiceConfig   datatypes.JSON `gorm:"column:voice_config;type:jsonb;not null;default:'{}'"`
	Language      string         `gorm:"type:text;not null;default:en"`
	Metadata      datatypes.JSON `gorm:"type:jsonb;not null;default:'{}'"`
	IsActive      bool           `gorm:"not null;default:true"`
	CreatedBy     uuid.UUID      `gorm:"type:uuid;not null"`
	CreatedAt     time.Time
	UpdatedAt     time.Time

	Project Project `gorm:"foreignKey:ProjectID"`
}

func (Agent) TableName() string { return "agents" }

type AgentParticipant struct {
	ID                 uuid.UUID      `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	AgentID            uuid.UUID      `gorm:"type:uuid;not null;index;uniqueIndex:idx_participant_agent_role"`
	Name               string         `gorm:"type:text;not null"`
	Role               string         `gorm:"type:text;not null;uniqueIndex:idx_participant_agent_role"`
	SystemPrompt       string         `gorm:"column:system_prompt;type:text;not null;default:''"`
	Model              string         `gorm:"type:text;not null;default:gpt-4o"`
	VoiceProvider      *string        `gorm:"column:voice_provider;type:text"`
	VoiceID            *string        `gorm:"column:voice_id;type:text"`
	VoiceConfig        datatypes.JSON `gorm:"column:voice_config;type:jsonb;not null;default:'{}'"`
	HandoffDescription string         `gorm:"column:handoff_description;type:text;not null;default:''"`
	IsEntryPoint       bool           `gorm:"column:is_entry_point;not null;default:false"`
	Position           int            `gorm:"not null;default:0"`
	CreatedAt          time.Time
	UpdatedAt          time.Time

	Agent Agent `gorm:"foreignKey:AgentID"`
}

func (AgentParticipant) TableName() string { return "agent_participants" }

type SessionChannel string

const (
	ChannelChat  SessionChannel = "chat"
	ChannelVoice SessionChannel = "voice"
	ChannelAPI   SessionChannel = "api"
)

type SessionStatus string

const (
	StatusActive SessionStatus = "active"
	StatusEnded  SessionStatus = "ended"
	StatusError  SessionStatus = "error"
)

type Session struct {
	ID               uuid.UUID      `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	AgentID          uuid.UUID      `gorm:"type:uuid;not null;index"`
	ExternalUserID   *string        `gorm:"column:external_user_id;type:text"`
	Channel          SessionChannel `gorm:"type:text;not null;default:chat"`
	Status           SessionStatus  `gorm:"type:text;not null;default:active"`
	Metadata         datatypes.JSON `gorm:"type:jsonb;not null;default:'{}'"`
	StartedAt        time.Time      `gorm:"not null"`
	EndedAt          *time.Time
	CreatedAt        time.Time      `gorm:"not null"`

	Agent Agent `gorm:"foreignKey:AgentID"`
}

func (Session) TableName() string { return "sessions" }

// ProjectMemberWithUser is used for listing members with user details (join result).
type ProjectMemberWithUser struct {
	ProjectMember
	UserEmail   string `gorm:"column:email"`
	UserName    string `gorm:"column:name"`
	UserAvatarURL *string `gorm:"column:avatar_url"`
}

func (ProjectMemberWithUser) TableName() string { return "project_members" }
