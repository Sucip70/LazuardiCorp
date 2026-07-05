package config

import (
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Port          string
	DatabaseURL   string
	JWTSecret     string
	JWTExpiry     time.Duration
	CORSOrigin    string
	ExportTempDir string
	Storage       StorageConfig
	Assets        AssetConfig
	Redis         RedisConfig
	Cache         CacheConfig
	CDN           CDNConfig
	Deploy        DeployConfig
}

type RedisConfig struct {
	URL     string
	Enabled bool
}

type CacheConfig struct {
	PreviewTTL     time.Duration
	ComponentsTTL  time.Duration
	APITTL         time.Duration
	SessionEnabled bool
}

type CDNConfig struct {
	Enabled bool
	BaseURL string
	MaxAge  int
}

type DeployConfig struct {
	DefaultProvider     string
	AutoDeployOnSave    bool
	PreviewPublicBaseURL string
	PreviewTokenTTL     time.Duration
	S3                  DeployS3Config
	Netlify             NetlifyConfig
	Vercel              VercelConfig
	ACME                ACMEConfig
}

type DeployS3Config struct {
	Region              string
	Bucket              string
	Prefix              string
	AccessKey           string
	SecretKey           string
	Endpoint            string
	CloudFrontID        string
	CreateBucket        bool
	PublicBaseURL       string
}

type NetlifyConfig struct {
	Token  string
	SiteID string
}

type VercelConfig struct {
	Token   string
	TeamID  string
	ProjectID string
}

type ACMEConfig struct {
	Enabled      bool
	Email        string
	Staging      bool
	DirectoryURL string
}

type StorageConfig struct {
	Driver        string
	LocalPath     string
	PublicBaseURL string
	S3Bucket      string
	S3Region      string
	S3Endpoint    string
	S3AccessKey   string
	S3SecretKey   string
	S3PublicBaseURL string
}

type AssetConfig struct {
	MaxSizeBytes int64
	AllowedMIMEs []string
}

func Load() Config {
	port := getenv("PORT", "8080")
	databaseURL := getenv("DATABASE_URL", "postgres://postgres:12345678@localhost:5432/postgres?sslmode=disable")
	jwtSecret := getenv("JWT_SECRET", "dev-secret-change-me")
	corsOrigin := getenv("CORS_ORIGIN", "http://localhost:5173")
	exportTempDir := getenv("EXPORT_TEMP_DIR", os.TempDir())

	expiryHours := 72
	jwtExpiry := time.Duration(expiryHours) * time.Hour
	if v := os.Getenv("JWT_EXPIRY_HOURS"); v != "" {
		if parsed, err := time.ParseDuration(v + "h"); err == nil {
			jwtExpiry = parsed
		}
	}

	maxSize := int64(10 * 1024 * 1024)
	if v := os.Getenv("ASSET_MAX_SIZE_BYTES"); v != "" {
		if parsed, err := strconv.ParseInt(v, 10, 64); err == nil {
			maxSize = parsed
		}
	}

	allowedMIMEs := []string{}
	if v := os.Getenv("ASSET_ALLOWED_MIMES"); v != "" {
		for _, mime := range strings.Split(v, ",") {
			mime = strings.TrimSpace(mime)
			if mime != "" {
				allowedMIMEs = append(allowedMIMEs, mime)
			}
		}
	}

	return Config{
		Port:          port,
		DatabaseURL:   databaseURL,
		JWTSecret:     jwtSecret,
		JWTExpiry:     jwtExpiry,
		CORSOrigin:    corsOrigin,
		ExportTempDir: exportTempDir,
		Storage: StorageConfig{
			Driver:          getenv("STORAGE_DRIVER", "local"),
			LocalPath:       getenv("STORAGE_LOCAL_PATH", "./storage"),
			PublicBaseURL:   getenv("STORAGE_PUBLIC_URL", "http://localhost:8080/files"),
			S3Bucket:        os.Getenv("AWS_S3_BUCKET"),
			S3Region:        getenv("AWS_REGION", "us-east-1"),
			S3Endpoint:      os.Getenv("AWS_S3_ENDPOINT"),
			S3AccessKey:     os.Getenv("AWS_ACCESS_KEY_ID"),
			S3SecretKey:     os.Getenv("AWS_SECRET_ACCESS_KEY"),
			S3PublicBaseURL: os.Getenv("AWS_S3_PUBLIC_URL"),
		},
		Assets: AssetConfig{
			MaxSizeBytes: maxSize,
			AllowedMIMEs: allowedMIMEs,
		},
		Redis: RedisConfig{
			URL:     os.Getenv("REDIS_URL"),
			Enabled: getenv("REDIS_ENABLED", "true") != "false" && os.Getenv("REDIS_URL") != "",
		},
		Cache: CacheConfig{
			PreviewTTL:     durationFromEnv("CACHE_PREVIEW_TTL", 15*time.Minute),
			ComponentsTTL:  durationFromEnv("CACHE_COMPONENTS_TTL", 24*time.Hour),
			APITTL:         durationFromEnv("CACHE_API_TTL", 5*time.Minute),
			SessionEnabled: getenv("CACHE_SESSIONS", "true") != "false",
		},
		CDN: CDNConfig{
			Enabled: os.Getenv("CDN_BASE_URL") != "",
			BaseURL: os.Getenv("CDN_BASE_URL"),
			MaxAge:  intFromEnv("CDN_MAX_AGE", 86400),
		},
		Deploy: DeployConfig{
			DefaultProvider:      getenv("DEPLOY_DEFAULT_PROVIDER", "s3"),
			AutoDeployOnSave:     getenv("AUTO_DEPLOY_ON_SAVE", "false") == "true",
			PreviewPublicBaseURL: getenv("PREVIEW_PUBLIC_BASE_URL", "http://localhost:8080"),
			PreviewTokenTTL:      durationFromEnv("PREVIEW_TOKEN_TTL", 24*time.Hour),
			S3: DeployS3Config{
				Region:        getenv("DEPLOY_AWS_REGION", getenv("AWS_REGION", "us-east-1")),
				Bucket:        firstNonEmpty(os.Getenv("DEPLOY_S3_BUCKET"), os.Getenv("AWS_S3_BUCKET")),
				Prefix:        getenv("DEPLOY_S3_PREFIX", "sites/"),
				AccessKey:     os.Getenv("AWS_ACCESS_KEY_ID"),
				SecretKey:     os.Getenv("AWS_SECRET_ACCESS_KEY"),
				Endpoint:      os.Getenv("AWS_S3_ENDPOINT"),
				CloudFrontID:  os.Getenv("CLOUDFRONT_DISTRIBUTION_ID"),
				CreateBucket:  getenv("DEPLOY_S3_CREATE_BUCKET", "true") == "true",
				PublicBaseURL: os.Getenv("DEPLOY_PUBLIC_BASE_URL"),
			},
			Netlify: NetlifyConfig{
				Token:  os.Getenv("NETLIFY_TOKEN"),
				SiteID: os.Getenv("NETLIFY_SITE_ID"),
			},
			Vercel: VercelConfig{
				Token:     os.Getenv("VERCEL_TOKEN"),
				TeamID:    os.Getenv("VERCEL_TEAM_ID"),
				ProjectID: os.Getenv("VERCEL_PROJECT_ID"),
			},
			ACME: ACMEConfig{
				Enabled:      os.Getenv("ACME_EMAIL") != "",
				Email:        os.Getenv("ACME_EMAIL"),
				Staging:      getenv("ACME_STAGING", "false") == "true",
				DirectoryURL: os.Getenv("ACME_DIRECTORY_URL"),
			},
		},
	}
}

func firstNonEmpty(values ...string) string {
	for _, v := range values {
		if v != "" {
			return v
		}
	}
	return ""
}

func durationFromEnv(key string, fallback time.Duration) time.Duration {
	if v := os.Getenv(key); v != "" {
		if d, err := time.ParseDuration(v); err == nil {
			return d
		}
	}
	return fallback
}

func intFromEnv(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return fallback
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
