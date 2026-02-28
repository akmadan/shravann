package main

import (
	"log"
	"net/http"
	"strconv"

	"github.com/shravann/api/internal/api"
	"github.com/shravann/api/internal/config"
	"github.com/shravann/api/internal/db"
	lk "github.com/shravann/api/internal/livekit"
	"github.com/shravann/api/internal/store"
)

func main() {
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

	st := store.New(gormDB)
	server := api.NewServer(st, lkClient)

	addr := ":" + strconv.Itoa(cfg.Port)
	log.Printf("listening on %s", addr)
	if err := http.ListenAndServe(addr, server); err != nil {
		log.Fatalf("server: %v", err)
	}
}
