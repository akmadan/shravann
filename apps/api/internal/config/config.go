package config

import (
	"os"
	"strconv"
)

type Config struct {
	Port        int
	DatabaseURL string

	LiveKitURL       string
	LiveKitAPIKey    string
	LiveKitAPISecret string

	EncryptionKey string // hex-encoded 32-byte key for encrypting API keys at rest
}

func Load() Config {
	port := 8080
	if p := os.Getenv("PORT"); p != "" {
		if v, err := strconv.Atoi(p); err == nil {
			port = v
		}
	}
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		dsn = "postgres://postgres@localhost:5432/db_shravann?sslmode=disable"
	}
	return Config{
		Port:             port,
		DatabaseURL:      dsn,
		LiveKitURL:       os.Getenv("LIVEKIT_URL"),
		LiveKitAPIKey:    os.Getenv("LIVEKIT_API_KEY"),
		LiveKitAPISecret: os.Getenv("LIVEKIT_API_SECRET"),
		EncryptionKey:    os.Getenv("ENCRYPTION_KEY"),
	}
}
