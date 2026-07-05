package cache

import (
	"context"
	"strings"
	"sync"
	"time"
)

type memoryEntry struct {
	value     []byte
	expiresAt time.Time
}

// MemoryStore is an in-process cache for tests and benchmarks.
type MemoryStore struct {
	mu   sync.RWMutex
	data map[string]memoryEntry
}

func NewMemory() *MemoryStore {
	return &MemoryStore{data: map[string]memoryEntry{}}
}

func (m *MemoryStore) Enabled() bool { return true }

func (m *MemoryStore) Ping(_ context.Context) error { return nil }

func (m *MemoryStore) Get(_ context.Context, key string) ([]byte, error) {
	m.mu.RLock()
	entry, ok := m.data[key]
	m.mu.RUnlock()
	if !ok || time.Now().After(entry.expiresAt) {
		return nil, ErrCacheMiss{Key: key}
	}
	out := make([]byte, len(entry.value))
	copy(out, entry.value)
	return out, nil
}

func (m *MemoryStore) Set(_ context.Context, key string, value []byte, ttl time.Duration) error {
	dup := make([]byte, len(value))
	copy(dup, value)
	m.mu.Lock()
	m.data[key] = memoryEntry{value: dup, expiresAt: time.Now().Add(ttl)}
	m.mu.Unlock()
	return nil
}

func (m *MemoryStore) Delete(_ context.Context, keys ...string) error {
	m.mu.Lock()
	for _, key := range keys {
		delete(m.data, key)
	}
	m.mu.Unlock()
	return nil
}

func (m *MemoryStore) DeleteByPrefix(_ context.Context, prefix string) (int, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	n := 0
	for key := range m.data {
		if strings.HasPrefix(key, prefix) {
			delete(m.data, key)
			n++
		}
	}
	return n, nil
}

func (m *MemoryStore) Exists(ctx context.Context, key string) (bool, error) {
	_, err := m.Get(ctx, key)
	if err != nil {
		if _, ok := err.(ErrCacheMiss); ok {
			return false, nil
		}
		return false, err
	}
	return true, nil
}
