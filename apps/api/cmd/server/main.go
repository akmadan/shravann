package main

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"log"
	"net/http"
	"strconv"

	"github.com/joho/godotenv"
	"github.com/shravann/api/internal/api"
	"github.com/shravann/api/internal/config"
	"github.com/shravann/api/internal/crypto"
	"github.com/shravann/api/internal/db"
	lk "github.com/shravann/api/internal/livekit"
	"github.com/shravann/api/internal/store"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	_ = godotenv.Load()
	cfg := config.Load()

	gormDB, err := db.New(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("database: %v", err)
	}

	sqlDB, err := gormDB.DB()
	if err != nil {
		log.Fatalf("database connection: %v", err)
	}
	defer sqlDB.Close()

	if err := sqlDB.Ping(); err != nil {
		log.Fatalf("database ping: %v", err)
	}

	if err := gormDB.Exec(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`).Error; err != nil {
		log.Printf("pgcrypto: %v (gen_random_uuid may not work)", err)
	}
	if err := gormDB.AutoMigrate(
		&db.User{},
		&db.Project{},
		&db.ProjectMember{},
		&db.ProjectAPIKey{},
		&db.Agent{},
		&db.AgentParticipant{},
		&db.AgentParticipantParent{},
		&db.Form{},
		&db.FormField{},
		&db.Session{},
		&db.SessionTranscript{},
	); err != nil {
		log.Fatalf("auto-migrate: %v", err)
	}
	log.Println("database: schema migrated")

	var lkClient *lk.Client
	if cfg.LiveKitURL != "" && cfg.LiveKitAPIKey != "" && cfg.LiveKitAPISecret != "" {
		lkClient = lk.NewClient(lk.Config{
			URL:       cfg.LiveKitURL,
			APIKey:    cfg.LiveKitAPIKey,
			APISecret: cfg.LiveKitAPISecret,
		})
		log.Printf("livekit: connected to %s", cfg.LiveKitURL)
	} else {
		log.Println("livekit: not configured (set LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET)")
	}

	var encKey []byte
	if cfg.EncryptionKey != "" {
		var err error
		encKey, err = crypto.ParseHexKey(cfg.EncryptionKey)
		if err != nil {
			log.Fatalf("encryption key: %v", err)
		}
		log.Println("encryption: API key encryption enabled")
	} else {
		log.Println("encryption: ENCRYPTION_KEY not set — API key storage will be unavailable")
	}

	jwtSecret := resolveJWTSecret(cfg.JWTSecret)

	st := store.New(gormDB)
	seedAdminUser(st)

	server := api.NewServer(st, lkClient, encKey, jwtSecret)

	addr := ":" + strconv.Itoa(cfg.Port)
	log.Printf("listening on %s", addr)
	if err := http.ListenAndServe(addr, server); err != nil {
		log.Fatalf("server: %v", err)
	}
}

func resolveJWTSecret(configured string) []byte {
	if configured != "" {
		return []byte(configured)
	}
	key := make([]byte, 32)
	if _, err := rand.Read(key); err != nil {
		log.Fatalf("failed to generate random JWT secret: %v", err)
	}
	hex := hex.EncodeToString(key)
	log.Printf("jwt: no JWT_SECRET set — using random key (sessions won't survive restart): %s", hex)
	return key
}

func seedAdminUser(st *store.Store) {
	ctx := context.Background()
	count, err := st.CountUsers(ctx)
	if err != nil {
		log.Printf("seed: failed to count users: %v", err)
		return
	}
	if count > 0 {
		return
	}

	password := "admin"
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		log.Fatalf("seed: failed to hash password: %v", err)
	}
	hashStr := string(hash)

	u := &db.User{
		Email:              "admin@shravann.local",
		Name:               "Admin",
		PasswordHash:       &hashStr,
		MustChangePassword: true,
	}
	if err := st.CreateUser(ctx, u); err != nil {
		log.Fatalf("seed: failed to create admin user: %v", err)
	}

	log.Println("========================================")
	log.Println("  Default admin user created:")
	log.Println("  Email:    admin@shravann.local")
	log.Println("  Password: admin")
	log.Println("  (You will be prompted to change it)")
	log.Println("========================================")
}
