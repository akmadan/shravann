package api

import (
	"encoding/json"
	"net/http"

	"gorm.io/gorm"
)

func JSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func Err(w http.ResponseWriter, err error) {
	if err == gorm.ErrRecordNotFound {
		JSON(w, http.StatusNotFound, map[string]string{"error": "not found"})
		return
	}
	if e, ok := err.(*errMsg); ok {
		JSON(w, e.code, map[string]string{"error": e.msg})
		return
	}
	JSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
}

func BadRequest(w http.ResponseWriter, msg string) {
	JSON(w, http.StatusBadRequest, map[string]string{"error": msg})
}

func NotFound(w http.ResponseWriter) {
	JSON(w, http.StatusNotFound, map[string]string{"error": "not found"})
}
