package main

import (
	"log"
	"net/http"
	"strconv"

	"github.com/shravann/api/internal/api"
	"github.com/shravann/api/internal/config"
	"github.com/shravann/api/internal/db"
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

	st := store.New(gormDB)
	server := api.NewServer(st)

	addr := ":" + strconv.Itoa(cfg.Port)
	log.Printf("listening on %s", addr)
	if err := http.ListenAndServe(addr, server); err != nil {
		log.Fatalf("server: %v", err)
	}
}
