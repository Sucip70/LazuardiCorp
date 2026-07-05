package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/datatypes"

	"github.com/lazuardicorp/backend/internal/config"
	"github.com/lazuardicorp/backend/internal/dto"
	"github.com/lazuardicorp/backend/internal/model"
	"github.com/lazuardicorp/backend/internal/repository"
)

var (
	ErrUnauthorized = errors.New("unauthorized")
	ErrInvalidInput = errors.New("invalid input")
)

type Claims struct {
	UserID string `json:"user_id"`
	Email  string `json:"email"`
	jwt.RegisteredClaims
}

type AuthService struct {
	users    *repository.UserRepository
	sessions *SessionService
	secret   []byte
	expiry   time.Duration
	useCache bool
}

func NewAuthService(users *repository.UserRepository, sessions *SessionService, cfg config.Config) *AuthService {
	return &AuthService{
		users:    users,
		sessions: sessions,
		secret:   []byte(cfg.JWTSecret),
		expiry:   cfg.JWTExpiry,
		useCache: cfg.Cache.SessionEnabled && sessions != nil,
	}
}

func (s *AuthService) Register(req dto.RegisterRequest) (dto.AuthResponse, error) {
	if _, err := s.users.FindByEmail(req.Email); err == nil {
		return dto.AuthResponse{}, fmt.Errorf("%w: email already registered", repository.ErrConflict)
	} else if !errors.Is(err, repository.ErrNotFound) {
		return dto.AuthResponse{}, err
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return dto.AuthResponse{}, err
	}

	user := &model.User{
		Email:        req.Email,
		PasswordHash: string(hash),
		Name:         req.Name,
	}
	if err := s.users.Create(user); err != nil {
		return dto.AuthResponse{}, err
	}

	token, err := s.generateToken(user)
	if err != nil {
		return dto.AuthResponse{}, err
	}
	resp := dto.AuthResponse{Token: token, User: toUserResponse(user)}
	s.storeSession(context.Background(), token, resp.User)
	return resp, nil
}

func (s *AuthService) Login(req dto.LoginRequest) (dto.AuthResponse, error) {
	user, err := s.users.FindByEmail(req.Email)
	if err != nil {
		return dto.AuthResponse{}, ErrUnauthorized
	}
	if bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)) != nil {
		return dto.AuthResponse{}, ErrUnauthorized
	}

	token, err := s.generateToken(user)
	if err != nil {
		return dto.AuthResponse{}, err
	}
	resp := dto.AuthResponse{Token: token, User: toUserResponse(user)}
	s.storeSession(context.Background(), token, resp.User)
	return resp, nil
}

func (s *AuthService) Logout(ctx context.Context, token string) error {
	if !s.useCache || s.sessions == nil {
		return nil
	}
	return s.sessions.Revoke(ctx, token)
}

func (s *AuthService) ValidateSession(ctx context.Context, token string) error {
	if !s.useCache || s.sessions == nil {
		return nil
	}
	_, err := s.sessions.Validate(ctx, token)
	return err
}

func (s *AuthService) Me(userID uuid.UUID) (dto.UserResponse, error) {
	user, err := s.users.FindByID(userID)
	if err != nil {
		return dto.UserResponse{}, err
	}
	return toUserResponse(user), nil
}

func (s *AuthService) UpdateProfile(userID uuid.UUID, req dto.UpdateProfileRequest) (dto.UserResponse, error) {
	user, err := s.users.FindByID(userID)
	if err != nil {
		return dto.UserResponse{}, err
	}
	user.Name = req.Name
	if err := s.users.Update(user); err != nil {
		return dto.UserResponse{}, err
	}
	return toUserResponse(user), nil
}

func (s *AuthService) ChangePassword(userID uuid.UUID, req dto.ChangePasswordRequest) error {
	user, err := s.users.FindByID(userID)
	if err != nil {
		return err
	}
	if bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.CurrentPassword)) != nil {
		return ErrUnauthorized
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	user.PasswordHash = string(hash)
	return s.users.Update(user)
}

func (s *AuthService) ParseToken(tokenString string) (uuid.UUID, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (any, error) {
		return s.secret, nil
	})
	if err != nil || !token.Valid {
		return uuid.Nil, ErrUnauthorized
	}
	claims, ok := token.Claims.(*Claims)
	if !ok {
		return uuid.Nil, ErrUnauthorized
	}
	return uuid.Parse(claims.UserID)
}

func (s *AuthService) storeSession(ctx context.Context, token string, user dto.UserResponse) {
	if !s.useCache || s.sessions == nil {
		return
	}
	_ = s.sessions.Create(ctx, token, user, time.Now().Add(s.expiry))
}

func (s *AuthService) generateToken(user *model.User) (string, error) {
	claims := Claims{
		UserID: user.ID.String(),
		Email:  user.Email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(s.expiry)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(s.secret)
}

func toUserResponse(user *model.User) dto.UserResponse {
	return dto.UserResponse{
		ID:    user.ID.String(),
		Email: user.Email,
		Name:  user.Name,
	}
}

func jsonOrEmpty(raw json.RawMessage) datatypes.JSON {
	if len(raw) == 0 {
		return datatypes.JSON([]byte("{}"))
	}
	return datatypes.JSON(raw)
}

func rawJSON(data datatypes.JSON) json.RawMessage {
	if len(data) == 0 {
		return json.RawMessage([]byte("{}"))
	}
	return json.RawMessage(data)
}
