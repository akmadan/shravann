package livekit

import (
	"context"
	"encoding/json"
	"fmt"
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
	AgentID string `json:"agent_id"`
}

// CreateSessionRoom creates a LiveKit room for a voice session and returns
// the room name and a participant token the caller can use to join.
func (c *Client) CreateSessionRoom(ctx context.Context, agentID, participantIdentity string) (roomName string, token string, err error) {
	roomName = fmt.Sprintf("session-%s-%d", agentID, time.Now().UnixMilli())

	meta, _ := json.Marshal(RoomMetadata{AgentID: agentID})

	_, err = c.room.CreateRoom(ctx, &livekit.CreateRoomRequest{
		Name:     roomName,
		Metadata: string(meta),
	})
	if err != nil {
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
		return "", "", fmt.Errorf("generate token: %w", err)
	}

	return roomName, token, nil
}
