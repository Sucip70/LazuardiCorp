package cache

import (
	"fmt"
	"strings"

	"github.com/google/uuid"
)

const prefix = "laz:"

// Key builders — centralized naming for invalidation patterns.

func SessionKey(tokenHash string) string {
	return prefix + "session:" + tokenHash
}

func UserSessionPattern(userID uuid.UUID) string {
	return prefix + "session:user:" + userID.String() + ":*"
}

func UserSessionIndex(userID uuid.UUID, tokenHash string) string {
	return prefix + "session:user:" + userID.String() + ":" + tokenHash
}

func PreviewKey(projectID, pageID uuid.UUID) string {
	return prefix + fmt.Sprintf("preview:%s:%s", projectID, pageID)
}

func PreviewProjectPattern(projectID uuid.UUID) string {
	return prefix + fmt.Sprintf("preview:%s:", projectID)
}

func ComponentsKey() string {
	return prefix + "components:all"
}

func APIResponseKey(method, path, userID string) string {
	path = strings.ReplaceAll(path, "/", ":")
	return prefix + fmt.Sprintf("api:%s:%s:%s", method, path, userID)
}

func APIProjectPattern(projectID uuid.UUID) string {
	return prefix + fmt.Sprintf("api:GET:*:%s*", projectID)
}

func UserProjectsKey(userID uuid.UUID) string {
	return prefix + "api:GET:projects:list:" + userID.String()
}
