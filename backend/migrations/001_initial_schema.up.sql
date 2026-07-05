-- Lazuardi No-Code Website Builder — initial PostgreSQL schema
-- Requires PostgreSQL 14+ (gen_random_uuid built-in)

BEGIN;

-- ─── Extensions ─────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── Helper: auto-update updated_at ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── 1. users ───────────────────────────────────────────────────────────────
-- Account owners. Soft-deleted users retain rows for audit/recovery.

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) NOT NULL,
  password_hash TEXT         NOT NULL,
  name          VARCHAR(255) NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_users_email_active
  ON users (LOWER(email))
  WHERE deleted_at IS NULL;

CREATE INDEX idx_users_deleted_at
  ON users (deleted_at)
  WHERE deleted_at IS NOT NULL;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── 2. projects ────────────────────────────────────────────────────────────
-- A website project owned by one user. is_template marks reusable starters.

CREATE TABLE projects (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name               VARCHAR(255) NOT NULL,
  slug               VARCHAR(255) NOT NULL,
  description        TEXT         NOT NULL DEFAULT '',
  settings           JSONB        NOT NULL DEFAULT '{}',
  is_template        BOOLEAN      NOT NULL DEFAULT FALSE,
  template_source_id UUID         REFERENCES projects(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted_at         TIMESTAMPTZ,
  CONSTRAINT chk_projects_slug_format
    CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

CREATE INDEX idx_projects_user_id
  ON projects (user_id)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX idx_projects_user_slug_active
  ON projects (user_id, slug)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_projects_is_template
  ON projects (is_template)
  WHERE deleted_at IS NULL AND is_template = TRUE;

CREATE INDEX idx_projects_settings_gin
  ON projects USING GIN (settings);

CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── 3. pages ───────────────────────────────────────────────────────────────
-- Routable pages within a project. json_data stores the component tree.
-- version increments on each publish/save; full history lives in page_versions.

CREATE TABLE pages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID         NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name        VARCHAR(255) NOT NULL,
  slug        VARCHAR(255) NOT NULL,
  path        VARCHAR(512) NOT NULL DEFAULT '/',
  json_data   JSONB        NOT NULL DEFAULT '{"rootIds":[],"nodes":{}}',
  meta        JSONB        NOT NULL DEFAULT '{}',
  sort_order  INT          NOT NULL DEFAULT 0,
  is_home     BOOLEAN      NOT NULL DEFAULT FALSE,
  version     INT          NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ,
  CONSTRAINT chk_pages_version_positive CHECK (version >= 1),
  CONSTRAINT chk_pages_path_format
    CHECK (path ~ '^/(?:[a-zA-Z0-9._-]+(?:/[a-zA-Z0-9._-]+)*)?$')
);

CREATE INDEX idx_pages_project_id
  ON pages (project_id)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX idx_pages_project_path_active
  ON pages (project_id, path)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX idx_pages_project_slug_active
  ON pages (project_id, slug)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_pages_json_data_gin
  ON pages USING GIN (json_data);

CREATE INDEX idx_pages_meta_gin
  ON pages USING GIN (meta);

CREATE TRIGGER trg_pages_updated_at
  BEFORE UPDATE ON pages
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── 3b. page_versions ──────────────────────────────────────────────────────
-- Immutable snapshots for undo/history/audit.

CREATE TABLE page_versions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id        UUID        NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  version        INT         NOT NULL,
  json_data      JSONB       NOT NULL,
  meta           JSONB       NOT NULL DEFAULT '{}',
  change_summary TEXT,
  created_by     UUID        REFERENCES users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_page_versions_page_version UNIQUE (page_id, version)
);

CREATE INDEX idx_page_versions_page_id
  ON page_versions (page_id, version DESC);

CREATE INDEX idx_page_versions_json_data_gin
  ON page_versions USING GIN (json_data);

-- Auto-append version row when pages.version increments (optional hook)
CREATE OR REPLACE FUNCTION snapshot_page_version()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.version IS DISTINCT FROM OLD.version THEN
    INSERT INTO page_versions (page_id, version, json_data, meta, change_summary)
    VALUES (NEW.id, NEW.version, NEW.json_data, NEW.meta, 'auto-snapshot');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pages_version_snapshot
  AFTER UPDATE OF version, json_data ON pages
  FOR EACH ROW
  WHEN (NEW.version IS DISTINCT FROM OLD.version)
  EXECUTE FUNCTION snapshot_page_version();

-- ─── 4. components ──────────────────────────────────────────────────────────
-- Global component type catalog (Container, Button, Image, …).
-- Editors read default_props; instances live inside pages.json_data.

CREATE TABLE components (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             VARCHAR(128) NOT NULL,
  category         VARCHAR(64)  NOT NULL,
  default_props    JSONB        NOT NULL DEFAULT '{}',
  default_styles   JSONB        NOT NULL DEFAULT '{}',
  prop_schema      JSONB        NOT NULL DEFAULT '{}',
  accepts_children BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ,
  CONSTRAINT chk_components_category
    CHECK (category IN ('layout', 'typography', 'media', 'interactive', 'forms', 'navigation', 'feedback', 'custom'))
);

CREATE UNIQUE INDEX idx_components_name_active
  ON components (name)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_components_category
  ON components (category)
  WHERE deleted_at IS NULL;

CREATE TRIGGER trg_components_updated_at
  BEFORE UPDATE ON components
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── 5. assets ──────────────────────────────────────────────────────────────
-- Uploaded media metadata. Binary files live in S3/local storage.

CREATE TABLE assets (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id        UUID         NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  public_id         VARCHAR(64)  NOT NULL,
  filename          VARCHAR(512) NOT NULL,
  original_filename VARCHAR(512),
  url               TEXT         NOT NULL,
  thumbnail_url     TEXT,
  optimized_url     TEXT,
  storage_provider  VARCHAR(32)  NOT NULL DEFAULT 'local',
  storage_key       TEXT         NOT NULL,
  thumbnail_key     TEXT,
  optimized_key     TEXT,
  type              VARCHAR(128) NOT NULL,
  size              BIGINT       NOT NULL DEFAULT 0,
  width             INT,
  height            INT,
  alt               TEXT,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ,
  CONSTRAINT chk_assets_size_non_negative CHECK (size >= 0)
);

CREATE UNIQUE INDEX idx_assets_public_id_active
  ON assets (public_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_assets_project_id
  ON assets (project_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_assets_user_id
  ON assets (user_id)
  WHERE deleted_at IS NULL;

CREATE TRIGGER trg_assets_updated_at
  BEFORE UPDATE ON assets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── 6. project_templates ───────────────────────────────────────────────────
-- Standalone starter templates (marketplace / template gallery).
-- Distinct from projects.is_template which marks user-owned reusable projects.

CREATE TABLE project_templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(255) NOT NULL,
  description   TEXT         NOT NULL DEFAULT '',
  category      VARCHAR(64),
  json_data     JSONB        NOT NULL DEFAULT '{}',
  preview_image TEXT,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX idx_project_templates_category
  ON project_templates (category)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_project_templates_json_data_gin
  ON project_templates USING GIN (json_data);

CREATE TRIGGER trg_project_templates_updated_at
  BEFORE UPDATE ON project_templates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
