package storage

import (
	"context"
	"fmt"
	"io"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/lazuardicorp/backend/internal/config"
)

type S3Storage struct {
	client    *s3.Client
	bucket    string
	publicURL string
}

func NewS3Storage(cfg config.StorageConfig) (*S3Storage, error) {
	if cfg.S3Bucket == "" {
		return nil, fmt.Errorf("AWS_S3_BUCKET is required for s3 storage")
	}

	loadOpts := []func(*awsconfig.LoadOptions) error{
		awsconfig.WithRegion(cfg.S3Region),
	}
	if cfg.S3AccessKey != "" && cfg.S3SecretKey != "" {
		loadOpts = append(loadOpts, awsconfig.WithCredentialsProvider(
			credentials.NewStaticCredentialsProvider(cfg.S3AccessKey, cfg.S3SecretKey, ""),
		))
	}

	awsCfg, err := awsconfig.LoadDefaultConfig(context.Background(), loadOpts...)
	if err != nil {
		return nil, fmt.Errorf("load aws config: %w", err)
	}

	clientOpts := []func(*s3.Options){}
	if cfg.S3Endpoint != "" {
		clientOpts = append(clientOpts, func(o *s3.Options) {
			o.BaseEndpoint = aws.String(cfg.S3Endpoint)
			o.UsePathStyle = true
		})
	}

	publicURL := strings.TrimRight(cfg.S3PublicBaseURL, "/")
	if publicURL == "" {
		region := cfg.S3Region
		if region == "" {
			region = "us-east-1"
		}
		publicURL = fmt.Sprintf("https://%s.s3.%s.amazonaws.com", cfg.S3Bucket, region)
	}

	return &S3Storage{
		client:    s3.NewFromConfig(awsCfg, clientOpts...),
		bucket:    cfg.S3Bucket,
		publicURL: publicURL,
	}, nil
}

func (s *S3Storage) ProviderName() string { return "s3" }

func (s *S3Storage) Put(ctx context.Context, key string, body io.Reader, contentType string, size int64) error {
	input := &s3.PutObjectInput{
		Bucket:      aws.String(s.bucket),
		Key:         aws.String(key),
		Body:        body,
		ContentType: aws.String(contentType),
	}
	if size > 0 {
		input.ContentLength = aws.Int64(size)
	}
	_, err := s.client.PutObject(ctx, input)
	return err
}

func (s *S3Storage) Get(ctx context.Context, key string) (io.ReadCloser, error) {
	out, err := s.client.GetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		return nil, err
	}
	return out.Body, nil
}

func (s *S3Storage) Delete(ctx context.Context, keys ...string) error {
	for _, key := range keys {
		if key == "" {
			continue
		}
		if _, err := s.client.DeleteObject(ctx, &s3.DeleteObjectInput{
			Bucket: aws.String(s.bucket),
			Key:    aws.String(key),
		}); err != nil {
			return err
		}
	}
	return nil
}

func (s *S3Storage) PublicURL(key string) string {
	return s.publicURL + "/" + strings.TrimPrefix(key, "/")
}
