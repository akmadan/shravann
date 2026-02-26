package api

import (
	"context"
	"net/http"
)

type contextKey string

const UserIDKey contextKey = "user_id"

// RequireUserID reads X-User-ID header and sets it in context. For dev only; replace with real auth later.
func RequireUserID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID := r.Header.Get("X-User-ID")
		if userID == "" {
			JSON(w, http.StatusUnauthorized, map[string]string{"error": "missing X-User-ID header"})
			return
		}
		ctx := context.WithValue(r.Context(), UserIDKey, userID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func UserIDFrom(ctx context.Context) string {
	v, _ := ctx.Value(UserIDKey).(string)
	return v
}
