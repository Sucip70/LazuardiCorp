package cache_test

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/lazuardicorp/backend/internal/cache"
	"github.com/lazuardicorp/backend/internal/config"
)

func setupRedis(b *testing.B) (*miniredis.Miniredis, cache.Store) {
	b.Helper()
	mr, err := miniredis.Run()
	if err != nil {
		b.Fatal(err)
	}
	store, err := cache.NewRedis(config.RedisConfig{URL: "redis://" + mr.Addr(), Enabled: true})
	if err != nil {
		b.Fatal(err)
	}
	return mr, store
}

func BenchmarkMemoryStoreSet(b *testing.B) {
	store := cache.NewMemory()
	ctx := context.Background()
	payload := []byte(`{"hello":"world"}`)
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		key := fmt.Sprintf("bench:set:%d", i%1000)
		if err := store.Set(ctx, key, payload, time.Minute); err != nil {
			b.Fatal(err)
		}
	}
}

func BenchmarkMemoryStoreGetHit(b *testing.B) {
	store := cache.NewMemory()
	ctx := context.Background()
	key := "bench:get:hit"
	_ = store.Set(ctx, key, []byte("payload"), time.Minute)
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		if _, err := store.Get(ctx, key); err != nil {
			b.Fatal(err)
		}
	}
}

func BenchmarkMemoryStoreGetMiss(b *testing.B) {
	store := cache.NewMemory()
	ctx := context.Background()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = store.Get(ctx, fmt.Sprintf("bench:miss:%d", i))
	}
}

func BenchmarkRedisStoreSet(b *testing.B) {
	mr, store := setupRedis(b)
	defer mr.Close()
	ctx := context.Background()
	payload := []byte(`{"hello":"world"}`)
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		key := fmt.Sprintf("laz:bench:set:%d", i%1000)
		if err := store.Set(ctx, key, payload, time.Minute); err != nil {
			b.Fatal(err)
		}
	}
}

func BenchmarkRedisStoreGetHit(b *testing.B) {
	mr, store := setupRedis(b)
	defer mr.Close()
	ctx := context.Background()
	key := "laz:bench:get:hit"
	_ = store.Set(ctx, key, []byte("payload"), time.Minute)
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		if _, err := store.Get(ctx, key); err != nil {
			b.Fatal(err)
		}
	}
}

func BenchmarkRedisDeleteByPrefix(b *testing.B) {
	mr, store := setupRedis(b)
	defer mr.Close()
	ctx := context.Background()
	for i := 0; i < 100; i++ {
		_ = store.Set(ctx, fmt.Sprintf("laz:preview:proj:page:%d", i), []byte("html"), time.Minute)
	}
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		if _, err := store.DeleteByPrefix(ctx, "laz:preview:proj:"); err != nil {
			b.Fatal(err)
		}
	}
}

// TestMemoryStoreRoundTrip validates basic cache semantics used by the API layer.
func TestMemoryStoreRoundTrip(t *testing.T) {
	store := cache.NewMemory()
	ctx := context.Background()
	key := cache.ComponentsKey()
	val := []byte(`[{"name":"Button"}]`)
	if err := store.Set(ctx, key, val, time.Minute); err != nil {
		t.Fatal(err)
	}
	got, err := store.Get(ctx, key)
	if err != nil {
		t.Fatal(err)
	}
	if string(got) != string(val) {
		t.Fatalf("got %s", got)
	}
	n, err := store.DeleteByPrefix(ctx, "laz:components:")
	if err != nil || n != 1 {
		t.Fatalf("deleted %d err=%v", n, err)
	}
}
