package dto

type AssetResponse struct {
	ID               string `json:"id"`
	PublicID         string `json:"public_id"`
	ProjectID        string `json:"project_id"`
	Filename         string `json:"filename"`
	OriginalFilename string `json:"original_filename"`
	MimeType         string `json:"mime_type"`
	SizeBytes        int64  `json:"size_bytes"`
	Width            int    `json:"width"`
	Height           int    `json:"height"`
	Alt              string `json:"alt"`
	URL              string `json:"url"`
	ThumbnailURL     string `json:"thumbnail_url"`
	OptimizedURL     string `json:"optimized_url"`
	CreatedAt        string `json:"created_at"`
}

type AssetListResponse struct {
	Assets []AssetResponse `json:"assets"`
}

type UploadAssetResponse struct {
	Asset AssetResponse `json:"asset"`
}
