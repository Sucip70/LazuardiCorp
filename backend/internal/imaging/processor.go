package imaging

import (
	"bytes"
	"fmt"
	"image"
	_ "image/gif"
	"image/jpeg"
	"image/png"
	"io"

	"github.com/disintegration/imaging"
)

const (
	ThumbnailMaxSize = 320
	OptimizedMaxSize = 1920
	JPEGQuality      = 85
)

type Variants struct {
	Width    int
	Height   int
	Original []byte
	Thumbnail []byte
	Optimized []byte
	ThumbnailMime string
	OptimizedMime string
}

// ProcessRaster decodes an image and produces thumbnail + optimized variants.
// SVG and GIF are returned unchanged without variants.
func ProcessRaster(data []byte, mimeType string) (*Variants, error) {
	if mimeType == "image/svg+xml" {
		return &Variants{
			Original:      data,
			ThumbnailMime: mimeType,
			OptimizedMime: mimeType,
		}, nil
	}

	img, format, err := image.Decode(bytes.NewReader(data))
	if err != nil {
		return nil, fmt.Errorf("decode image: %w", err)
	}

	bounds := img.Bounds()
	out := &Variants{
		Width:         bounds.Dx(),
		Height:        bounds.Dy(),
		Original:      data,
		ThumbnailMime: outputMime(format, mimeType),
		OptimizedMime: outputMime(format, mimeType),
	}

	if format == "gif" {
		out.Thumbnail = data
		out.Optimized = data
		return out, nil
	}

	thumb := imaging.Fit(img, ThumbnailMaxSize, ThumbnailMaxSize, imaging.Lanczos)
	opt := img
	if bounds.Dx() > OptimizedMaxSize || bounds.Dy() > OptimizedMaxSize {
		opt = imaging.Fit(img, OptimizedMaxSize, OptimizedMaxSize, imaging.Lanczos)
	}

	thumbBytes, err := encodeImage(thumb, format)
	if err != nil {
		return nil, err
	}
	optBytes, err := encodeImage(opt, format)
	if err != nil {
		return nil, err
	}

	out.Thumbnail = thumbBytes
	out.Optimized = optBytes
	return out, nil
}

func outputMime(format, inputMime string) string {
	switch format {
	case "png":
		return "image/png"
	case "jpeg", "jpg":
		return "image/jpeg"
	case "gif":
		return "image/gif"
	default:
		if inputMime != "" {
			return inputMime
		}
		return "image/jpeg"
	}
}

func encodeImage(img image.Image, format string) ([]byte, error) {
	var buf bytes.Buffer
	switch format {
	case "png":
		if err := png.Encode(&buf, img); err != nil {
			return nil, err
		}
	case "gif":
		return nil, fmt.Errorf("gif re-encode not supported")
	default:
		if err := jpeg.Encode(&buf, img, &jpeg.Options{Quality: JPEGQuality}); err != nil {
			return nil, err
		}
	}
	return buf.Bytes(), nil
}

func ReadAll(r io.Reader, maxBytes int64) ([]byte, error) {
	lr := io.LimitReader(r, maxBytes+1)
	data, err := io.ReadAll(lr)
	if err != nil {
		return nil, err
	}
	if int64(len(data)) > maxBytes {
		return nil, fmt.Errorf("file exceeds maximum size of %d bytes", maxBytes)
	}
	return data, nil
}

func Dimensions(data []byte) (int, int, error) {
	cfg, _, err := image.DecodeConfig(bytes.NewReader(data))
	if err != nil {
		return 0, 0, err
	}
	return cfg.Width, cfg.Height, nil
}
