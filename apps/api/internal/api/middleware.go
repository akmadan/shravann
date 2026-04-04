package api

import (
	"context"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

type contextKey string

const UserIDKey contextKey = "user_id"

// RequireAuth extracts the user ID from (in priority order):
//  1. Authorization: Bearer <jwt>
//  2. Cookie "shravann_token" (JWT)
//  3. X-User-ID header (for internal/worker calls)
func RequireAuth(jwtSecret []byte) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			var userID string

			if bearer := r.Header.Get("Authorization"); strings.HasPrefix(bearer, "Bearer ") {
				tokenStr := strings.TrimPrefix(bearer, "Bearer ")
				userID = parseJWT(tokenStr, jwtSecret)
			}

			if userID == "" {
				if c, err := r.Cookie(tokenCookieName); err == nil && c.Value != "" {
					userID = parseJWT(c.Value, jwtSecret)
				}
			}

			if userID == "" {
				userID = r.Header.Get("X-User-ID")
			}

			if userID == "" {
				JSON(w, http.StatusUnauthorized, map[string]string{"error": "authentication required"})
				return
			}

			ctx := context.WithValue(r.Context(), UserIDKey, userID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func parseJWT(tokenStr string, secret []byte) string {
	token, err := jwt.ParseWithClaims(tokenStr, &jwtClaims{}, func(t *jwt.Token) (any, error) {
		return secret, nil
	})
	if err != nil {
		return ""
	}
	if claims, ok := token.Claims.(*jwtClaims); ok && token.Valid {
		return claims.UserID
	}
	return ""
}

func UserIDFrom(ctx context.Context) string {
	v, _ := ctx.Value(UserIDKey).(string)
	return v
}
