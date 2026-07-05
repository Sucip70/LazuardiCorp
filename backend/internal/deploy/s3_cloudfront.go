package deploy

import (
	"bytes"
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/acm"
	acmtypes "github.com/aws/aws-sdk-go-v2/service/acm/types"
	"github.com/aws/aws-sdk-go-v2/service/cloudfront"
	cftypes "github.com/aws/aws-sdk-go-v2/service/cloudfront/types"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	s3types "github.com/aws/aws-sdk-go-v2/service/s3/types"

	"github.com/lazuardicorp/backend/internal/config"
	"github.com/lazuardicorp/backend/internal/staticgen"
)

// S3CloudFrontProvider uploads static files to S3 and optionally fronts them with CloudFront.
type S3CloudFrontProvider struct {
	cfg    config.DeployS3Config
	s3     *s3.Client
	cf     *cloudfront.Client
	acm    *acm.Client
	region string
}

func NewS3CloudFrontProvider(cfg config.DeployS3Config) (*S3CloudFrontProvider, error) {
	if cfg.Bucket == "" {
		return nil, fmt.Errorf("DEPLOY_S3_BUCKET or AWS_S3_BUCKET is required")
	}
	region := cfg.Region
	if region == "" {
		region = "us-east-1"
	}

	loadOpts := []func(*awsconfig.LoadOptions) error{
		awsconfig.WithRegion(region),
	}
	if cfg.AccessKey != "" && cfg.SecretKey != "" {
		loadOpts = append(loadOpts, awsconfig.WithCredentialsProvider(
			credentials.NewStaticCredentialsProvider(cfg.AccessKey, cfg.SecretKey, ""),
		))
	}
	awsCfg, err := awsconfig.LoadDefaultConfig(context.Background(), loadOpts...)
	if err != nil {
		return nil, fmt.Errorf("load aws config: %w", err)
	}

	s3Opts := []func(*s3.Options){}
	cfOpts := []func(*cloudfront.Options){}
	if cfg.Endpoint != "" {
		s3Opts = append(s3Opts, func(o *s3.Options) {
			o.BaseEndpoint = aws.String(cfg.Endpoint)
			o.UsePathStyle = true
		})
	}

	acmCfg := awsCfg
	if cfg.Endpoint != "" {
		// ACM requires a real AWS region endpoint; skip custom S3 endpoint for ACM.
		acmCfg, _ = awsconfig.LoadDefaultConfig(context.Background(), loadOpts...)
	}

	return &S3CloudFrontProvider{
		cfg:    cfg,
		s3:     s3.NewFromConfig(awsCfg, s3Opts...),
		cf:     cloudfront.NewFromConfig(awsCfg, cfOpts...),
		acm:    acm.NewFromConfig(acmCfg),
		region: region,
	}, nil
}

func (p *S3CloudFrontProvider) Name() string { return "s3" }

func (p *S3CloudFrontProvider) Deploy(ctx context.Context, bundle staticgen.SiteBundle, opts Options) (Result, error) {
	bucket := opts.S3Bucket
	if bucket == "" {
		bucket = p.cfg.Bucket
	}
	prefix := opts.S3Prefix
	if prefix == "" {
		prefix = p.cfg.Prefix
	}
	if opts.IsPreview && opts.PreviewToken != "" {
		prefix = strings.Trim(prefix, "/") + "/previews/" + opts.PreviewToken
	} else {
		prefix = strings.Trim(prefix, "/") + "/" + strings.Trim(opts.SitePrefix, "/")
	}

	if p.cfg.CreateBucket {
		if err := p.ensureBucket(ctx, bucket); err != nil {
			return Result{}, err
		}
	}

	upload := func(ctx context.Context, key string, body []byte, contentType, cacheControl string) error {
		input := &s3.PutObjectInput{
			Bucket:       aws.String(bucket),
			Key:          aws.String(key),
			Body:         bytes.NewReader(body),
			ContentType:  aws.String(contentType),
			CacheControl: aws.String(cacheControl),
		}
		if strings.HasSuffix(key, ".html") || strings.HasSuffix(key, "index.html") {
			input.ContentType = aws.String("text/html; charset=utf-8")
		}
		_, err := p.s3.PutObject(ctx, input)
		return err
	}
	if err := SyncBundle(ctx, prefix, bundle, upload); err != nil {
		return Result{}, err
	}

	url := p.publicURL(bucket, prefix)
	cfID := opts.CloudFrontID
	if cfID == "" {
		cfID = p.cfg.CloudFrontID
	}
	if cfID != "" {
		if err := p.invalidate(ctx, cfID, []string{"/*"}); err != nil {
			return Result{}, err
		}
		if domain, err := p.distributionDomain(ctx, cfID); err == nil && domain != "" {
			url = "https://" + domain
			if opts.IsPreview && opts.PreviewToken != "" {
				url = url + "/previews/" + opts.PreviewToken + "/"
			} else {
				url = url + "/" + strings.Trim(prefix, "/") + "/"
			}
		}
	}

	return Result{
		ExternalID: bucket + ":" + prefix,
		URL:        url,
		PreviewURL: url,
		Metadata: map[string]string{
			"bucket":              bucket,
			"prefix":              prefix,
			"cloudfront_id":       cfID,
			"cloudfront_invalidate": "true",
		},
	}, nil
}

func (p *S3CloudFrontProvider) AddDomain(ctx context.Context, externalRef, domain string, opts Options) (DomainResult, error) {
	host, err := NormalizeDomain(domain)
	if err != nil {
		return DomainResult{}, err
	}

	cfID := opts.CloudFrontID
	if cfID == "" {
		cfID = p.cfg.CloudFrontID
	}

	var records []DNSRecord
	distDomain := ""

	if cfID != "" {
		certARN, validationRecords, err := p.requestACMCertificate(ctx, host)
		if err != nil {
			return DomainResult{}, err
		}
		records = append(records, validationRecords...)
		if err := p.attachDomainToDistribution(ctx, cfID, host, certARN); err != nil {
			return DomainResult{}, err
		}
		distDomain, _ = p.distributionDomain(ctx, cfID)
		records = append(records, CNAMEForCloudFront(host, distDomain)...)
	} else {
		records = CNAMEForCloudFront(host, p.publicURL(p.cfg.Bucket, ""))
	}

	return DomainResult{
		Hostname:   host,
		Status:     "pending",
		SSLStatus:  "issuing",
		DNSRecords: records,
	}, nil
}

func (p *S3CloudFrontProvider) RemoveDomain(_ context.Context, _, domain string, _ Options) error {
	_, err := NormalizeDomain(domain)
	return err
}

func (p *S3CloudFrontProvider) CheckDomain(_ context.Context, _, domain string, _ Options) (DomainResult, error) {
	host, err := NormalizeDomain(domain)
	if err != nil {
		return DomainResult{}, err
	}
	return DomainResult{
		Hostname:  host,
		Status:    "pending",
		SSLStatus: "issuing",
	}, nil
}

func (p *S3CloudFrontProvider) ProvisionSSL(ctx context.Context, externalRef, domain string, opts Options) (DomainResult, error) {
	return p.AddDomain(ctx, externalRef, domain, opts)
}

func (p *S3CloudFrontProvider) ensureBucket(ctx context.Context, bucket string) error {
	_, err := p.s3.HeadBucket(ctx, &s3.HeadBucketInput{Bucket: aws.String(bucket)})
	if err == nil {
		return nil
	}
	_, err = p.s3.CreateBucket(ctx, &s3.CreateBucketInput{
		Bucket: aws.String(bucket),
		CreateBucketConfiguration: func() *s3types.CreateBucketConfiguration {
			if p.region != "us-east-1" {
				return &s3types.CreateBucketConfiguration{LocationConstraint: s3types.BucketLocationConstraint(p.region)}
			}
			return nil
		}(),
	})
	if err != nil && !strings.Contains(err.Error(), "BucketAlreadyOwnedByYou") {
		return fmt.Errorf("create bucket %s: %w", bucket, err)
	}

	_, err = p.s3.PutBucketWebsite(ctx, &s3.PutBucketWebsiteInput{
		Bucket: aws.String(bucket),
		WebsiteConfiguration: &s3types.WebsiteConfiguration{
			IndexDocument: &s3types.IndexDocument{Suffix: aws.String("index.html")},
			ErrorDocument: &s3types.ErrorDocument{Key: aws.String("404.html")},
		},
	})
	return err
}

func (p *S3CloudFrontProvider) invalidate(ctx context.Context, distributionID string, paths []string) error {
	if distributionID == "" {
		return nil
	}
	_, err := p.cf.CreateInvalidation(ctx, &cloudfront.CreateInvalidationInput{
		DistributionId: aws.String(distributionID),
		InvalidationBatch: &cftypes.InvalidationBatch{
			CallerReference: aws.String(fmt.Sprintf("laz-%d", time.Now().UnixNano())),
			Paths: &cftypes.Paths{
				Quantity: aws.Int32(int32(len(paths))),
				Items:    paths,
			},
		},
	})
	return err
}

func (p *S3CloudFrontProvider) distributionDomain(ctx context.Context, id string) (string, error) {
	out, err := p.cf.GetDistribution(ctx, &cloudfront.GetDistributionInput{
		Id: aws.String(id),
	})
	if err != nil {
		return "", err
	}
	if out.Distribution != nil && out.Distribution.DomainName != nil {
		return *out.Distribution.DomainName, nil
	}
	return "", nil
}

func (p *S3CloudFrontProvider) requestACMCertificate(ctx context.Context, domain string) (string, []DNSRecord, error) {
	out, err := p.acm.RequestCertificate(ctx, &acm.RequestCertificateInput{
		DomainName:       aws.String(domain),
		ValidationMethod: acmtypes.ValidationMethodDns,
	})
	if err != nil {
		return "", nil, err
	}
	certARN := aws.ToString(out.CertificateArn)

	desc, err := p.acm.DescribeCertificate(ctx, &acm.DescribeCertificateInput{
		CertificateArn: out.CertificateArn,
	})
	if err != nil {
		return certARN, nil, err
	}

	records := make([]DNSRecord, 0)
	if desc.Certificate != nil {
		for _, opt := range desc.Certificate.DomainValidationOptions {
			if opt.ResourceRecord != nil {
				records = append(records, ACMValidationRecords(
					domain,
					aws.ToString(opt.ResourceRecord.Name),
					aws.ToString(opt.ResourceRecord.Value),
				)...)
			}
		}
	}
	return certARN, records, nil
}

func (p *S3CloudFrontProvider) attachDomainToDistribution(ctx context.Context, cfID, domain, certARN string) error {
	getOut, err := p.cf.GetDistributionConfig(ctx, &cloudfront.GetDistributionConfigInput{
		Id: aws.String(cfID),
	})
	if err != nil {
		return err
	}
	cfg := getOut.DistributionConfig
	aliases := []string{}
	if cfg.Aliases != nil {
		aliases = append(aliases, cfg.Aliases.Items...)
	}
	aliases = append(aliases, domain)
	cfg.Aliases = &cftypes.Aliases{
		Quantity: aws.Int32(int32(len(aliases))),
		Items:    aliases,
	}
	if certARN != "" {
		cfg.ViewerCertificate = &cftypes.ViewerCertificate{
			ACMCertificateArn:      aws.String(certARN),
			SSLSupportMethod:       cftypes.SSLSupportMethodSniOnly,
			MinimumProtocolVersion: cftypes.MinimumProtocolVersionTLSv122021,
		}
	}
	_, err = p.cf.UpdateDistribution(ctx, &cloudfront.UpdateDistributionInput{
		Id:                 aws.String(cfID),
		DistributionConfig: cfg,
		IfMatch:            getOut.ETag,
	})
	return err
}

func (p *S3CloudFrontProvider) publicURL(bucket, prefix string) string {
	if p.cfg.PublicBaseURL != "" {
		base := strings.TrimRight(p.cfg.PublicBaseURL, "/")
		if prefix != "" {
			return base + "/" + strings.Trim(prefix, "/") + "/"
		}
		return base + "/"
	}
	base := fmt.Sprintf("https://%s.s3.%s.amazonaws.com", bucket, p.region)
	if prefix != "" {
		return base + "/" + strings.Trim(prefix, "/") + "/"
	}
	return base + "/"
}

// CreateDistribution provisions a new CloudFront distribution for an S3 website origin.
func (p *S3CloudFrontProvider) CreateDistribution(ctx context.Context, bucket string) (string, string, error) {
	originID := "S3-" + bucket
	out, err := p.cf.CreateDistribution(ctx, &cloudfront.CreateDistributionInput{
		DistributionConfig: &cftypes.DistributionConfig{
			CallerReference: aws.String(fmt.Sprintf("laz-%s", bucket)),
			Enabled:         aws.Bool(true),
			DefaultRootObject: aws.String("index.html"),
			Origins: &cftypes.Origins{
				Quantity: aws.Int32(1),
				Items: []cftypes.Origin{{
					Id:         aws.String(originID),
					DomainName: aws.String(fmt.Sprintf("%s.s3.%s.amazonaws.com", bucket, p.region)),
					S3OriginConfig: &cftypes.S3OriginConfig{
						OriginAccessIdentity: aws.String(""),
					},
				}},
			},
			DefaultCacheBehavior: &cftypes.DefaultCacheBehavior{
				TargetOriginId:       aws.String(originID),
				ViewerProtocolPolicy: cftypes.ViewerProtocolPolicyRedirectToHttps,
				AllowedMethods: &cftypes.AllowedMethods{
					Quantity: aws.Int32(2),
					Items:    []cftypes.Method{cftypes.MethodGet, cftypes.MethodHead},
				},
				ForwardedValues: &cftypes.ForwardedValues{
					QueryString: aws.Bool(false),
					Cookies:     &cftypes.CookiePreference{Forward: cftypes.ItemSelectionNone},
				},
				MinTTL: aws.Int64(0),
			},
			ViewerCertificate: &cftypes.ViewerCertificate{
				CloudFrontDefaultCertificate: aws.Bool(true),
			},
		},
	})
	if err != nil {
		return "", "", err
	}
	id := aws.ToString(out.Distribution.Id)
	domain := aws.ToString(out.Distribution.DomainName)
	return id, domain, nil
}
