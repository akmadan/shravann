package db

import (
	"context"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// New opens a GORM DB connection. Caller must run migrations separately (e.g. migrate -path migrations -database $DATABASE_URL up).
func New(dsn string) (*gorm.DB, error) {
	return gorm.Open(postgres.Open(dsn), &gorm.Config{})
}

// WithContext returns a session that uses the given context (for timeouts/cancel).
func WithContext(ctx context.Context, db *gorm.DB) *gorm.DB {
	return db.WithContext(ctx)
}
