package livekit

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/livekit/protocol/auth"
	"github.com/livekit/protocol/livekit"
	lksdk "github.com/livekit/server-sdk-go/v2"
)

type Config struct {
	URL       string
	APIKey    string
	APISecret string
}

type Client struct {
	cfg  Config
	room *lksdk.RoomServiceClient
}

func NewClient(cfg Config) *Client {
	room := lksdk.NewRoomServiceClient(cfg.URL, cfg.APIKey, cfg.APISecret)
	return &Client{cfg: cfg, room: room}
}

type RoomMetadata struct {
	AgentID             string `json:"agent_id"`
	ParticipantIdentity string `json:"participant_identity,omitempty"`
}

// CreateSessionRoom creates a LiveKit room for a voice session and returns
// the room name and a participant token the caller can use to join.
// Room name encodes participant_identity (session-{agentID}__{ts}__{identity}) so the worker
// can parse it when job metadata is empty (LiveKit dispatch often does not pass room metadata).
func (c *Client) CreateSessionRoom(ctx context.Context, agentID, participantIdentity string) (roomName string, token string, err error) {
	sanitized := strings.ReplaceAll(participantIdentity, "__", "_")
	if sanitized == "" {
		sanitized = "user"
	}
	roomName = fmt.Sprintf("session-%s__%d__%s", agentID, time.Now().UnixMilli(), sanitized)

	meta, _ := json.Marshal(RoomMetadata{AgentID: agentID, ParticipantIdentity: participantIdentity})
	log.Printf("[livekit] CreateSessionRoom: room=%s agent_id=%s participant_identity=%s metadata=%s",
		roomName, agentID, participantIdentity, string(meta))

	_, err = c.room.CreateRoom(ctx, &livekit.CreateRoomRequest{
		Name:     roomName,
		Metadata: string(meta),
	})
	if err != nil {
		log.Printf("[livekit] CreateSessionRoom failed: room=%s err=%v", roomName, err)
		return "", "", fmt.Errorf("create room: %w", err)
	}

	at := auth.NewAccessToken(c.cfg.APIKey, c.cfg.APISecret)
	grant := &auth.VideoGrant{
		Room:     roomName,
		RoomJoin: true,
	}
	at.SetVideoGrant(grant).
		SetIdentity(participantIdentity).
		SetValidFor(24 * time.Hour)

	token, err = at.ToJWT()
	if err != nil {
		log.Printf("[livekit] CreateSessionRoom token failed: room=%s err=%v", roomName, err)
		return "", "", fmt.Errorf("generate token: %w", err)
	}

	log.Printf("[livekit] CreateSessionRoom ok: room=%s participant_identity=%s token_len=%d",
		roomName, participantIdentity, len(token))
	return roomName, token, nil
}
