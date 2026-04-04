package api

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/shravann/api/internal/db"
	"golang.org/x/crypto/bcrypt"
)

const (
	tokenCookieName = "shravann_token"
	tokenTTL        = 7 * 24 * time.Hour
)

type jwtClaims struct {
	jwt.RegisteredClaims
	UserID string `json:"uid"`
}

func (h *Handler) issueToken(userID string) (string, error) {
	now := time.Now()
	claims := jwtClaims{
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(tokenTTL)),
		},
		UserID: userID,
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(h.jwtSecret)
}

func (h *Handler) setTokenCookie(w http.ResponseWriter, token string) {
	http.SetCookie(w, &http.Cookie{
		Name:     tokenCookieName,
		Value:    token,
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   int(tokenTTL.Seconds()),
	})
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		BadRequest(w, "invalid JSON")
		return
	}
	if body.Email == "" || body.Password == "" {
		BadRequest(w, "email and password required")
		return
	}

	u, err := h.store.GetUserByEmail(r.Context(), body.Email)
	if err != nil {
		JSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid credentials"})
		return
	}
	if u.PasswordHash == nil {
		JSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid credentials"})
		return
	}
	if err := bcrypt.CompareHashAndPassword([]byte(*u.PasswordHash), []byte(body.Password)); err != nil {
		JSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid credentials"})
		return
	}

	token, err := h.issueToken(u.ID.String())
	if err != nil {
		Err(w, err)
		return
	}

	h.setTokenCookie(w, token)
	JSON(w, http.StatusOK, map[string]any{
		"user":                 userResp(u),
		"must_change_password": u.MustChangePassword,
	})
}

func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
		Name     string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		BadRequest(w, "invalid JSON")
		return
	}
	if body.Email == "" || body.Password == "" || body.Name == "" {
		BadRequest(w, "email, password, and name required")
		return
	}
	if len(body.Password) < 6 {
		BadRequest(w, "password must be at least 6 characters")
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(body.Password), bcrypt.DefaultCost)
	if err != nil {
		Err(w, err)
		return
	}
	hashStr := string(hash)

	u := &db.User{
		Email:        body.Email,
		Name:         body.Name,
		PasswordHash: &hashStr,
	}
	if err := h.store.CreateUser(r.Context(), u); err != nil {
		Err(w, err)
		return
	}

	token, err := h.issueToken(u.ID.String())
	if err != nil {
		Err(w, err)
		return
	}
	h.setTokenCookie(w, token)
	JSON(w, http.StatusCreated, map[string]any{"user": userResp(u)})
}

func (h *Handler) Me(w http.ResponseWriter, r *http.Request) {
	uid := UserIDFrom(r.Context())
	u, err := h.store.GetUserByID(r.Context(), uid)
	if err != nil {
		Err(w, err)
		return
	}
	JSON(w, http.StatusOK, map[string]any{
		"user":                 userResp(u),
		"must_change_password": u.MustChangePassword,
	})
}

func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	http.SetCookie(w, &http.Cookie{
		Name:     tokenCookieName,
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   -1,
	})
	JSON(w, http.StatusOK, map[string]string{"ok": "logged out"})
}

func (h *Handler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	uid := UserIDFrom(r.Context())
	var body struct {
		CurrentPassword string `json:"current_password"`
		NewPassword     string `json:"new_password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		BadRequest(w, "invalid JSON")
		return
	}
	if body.NewPassword == "" {
		BadRequest(w, "new_password required")
		return
	}
	if len(body.NewPassword) < 6 {
		BadRequest(w, "password must be at least 6 characters")
		return
	}

	u, err := h.store.GetUserByID(r.Context(), uid)
	if err != nil {
		Err(w, err)
		return
	}

	if u.PasswordHash != nil && !u.MustChangePassword {
		if body.CurrentPassword == "" {
			BadRequest(w, "current_password required")
			return
		}
		if err := bcrypt.CompareHashAndPassword([]byte(*u.PasswordHash), []byte(body.CurrentPassword)); err != nil {
			JSON(w, http.StatusUnauthorized, map[string]string{"error": "current password is incorrect"})
			return
		}
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(body.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		Err(w, err)
		return
	}

	if err := h.store.UpdatePassword(r.Context(), uid, string(hash)); err != nil {
		Err(w, err)
		return
	}

	JSON(w, http.StatusOK, map[string]string{"ok": "password changed"})
}
