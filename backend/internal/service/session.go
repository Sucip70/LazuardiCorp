package service

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"time"

	"github.com/google/uuid"

	"github.com/lazuardicorp/backend/internal/cache"
	"github.com/lazuardicorp/backend/internal/dto"
)

// SessionService stores active JWT sessions in Redis for fast validation and revocation.
type SessionService struct {
	store cache.Store
	ttl   time.Duration
}

type sessionPayload struct {
	UserID    string `json:"user_id"`
	Email     string `json:"email"`
	Name      string `json:"name"`
	ExpiresAt int64  `json:"expires_at"`
}

func NewSessionService(store cache.Store, ttl time.Duration) *SessionService {
	return &SessionService{store: store, ttl: ttl}
}

func HashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

func (s *SessionService) Create(ctx context.Context, token string, user dto.UserResponse, expiresAt time.Time) error {
	if s.store == nil || !s.store.Enabled() {
		return nil
	}
	payload, err := json.Marshal(sessionPayload{
		UserID:    user.ID,
		Email:     user.Email,
		Name:      user.Name,
		ExpiresAt: expiresAt.Unix(),
	})
	if err != nil {
		return err
	}
	hash := HashToken(token)
	ttl := time.Until(expiresAt)
	if ttl <= 0 {
		ttl = s.ttl
	}
	if err := s.store.Set(ctx, cache.SessionKey(hash), payload, ttl); err != nil {
		return err
	}
	userID, _ := uuid.Parse(user.ID)
	return s.store.Set(ctx, cache.UserSessionIndex(userID, hash), []byte("1"), ttl)
}

func (s *SessionService) Validate(ctx context.Context, token string) (dto.UserResponse, error) {
	if s.store == nil || !s.store.Enabled() {
		return dto.UserResponse{}, nil
	}
	data, err := s.store.Get(ctx, cache.SessionKey(HashToken(token)))
	if err != nil {
		return dto.UserResponse{}, ErrUnauthorized
	}
	var payload sessionPayload
	if err := json.Unmarshal(data, &payload); err != nil {
		return dto.UserResponse{}, ErrUnauthorized
	}
	if payload.ExpiresAt > 0 && time.Now().Unix() > payload.ExpiresAt {
		return dto.UserResponse{}, ErrUnauthorized
	}
	return dto.UserResponse{ID: payload.UserID, Email: payload.Email, Name: payload.Name}, nil
}

func (s *SessionService) Revoke(ctx context.Context, token string) error {
	if s.store == nil || !s.store.Enabled() {
		return nil
	}
	return s.store.Delete(ctx, cache.SessionKey(HashToken(token)))
}

func (s *SessionService) RevokeAllForUser(ctx context.Context, userID uuid.UUID) error {
	if s.store == nil || !s.store.Enabled() {
		return nil
	}
	_, err := s.store.DeleteByPrefix(ctx, "laz:session:user:"+userID.String()+":")
	return err
}
