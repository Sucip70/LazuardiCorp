-- Template gallery and user customizations

CREATE TABLE IF NOT EXISTS templates (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug           VARCHAR(128) NOT NULL UNIQUE,
    name           VARCHAR(255) NOT NULL,
    category       VARCHAR(64)  NOT NULL,
    description    TEXT         NOT NULL DEFAULT '',
    preview_image  TEXT,
    json_data      JSONB        NOT NULL DEFAULT '{}',
    version        INT          NOT NULL DEFAULT 1,
    is_builtin     BOOLEAN      NOT NULL DEFAULT FALSE,
    user_id        UUID         REFERENCES users(id) ON DELETE SET NULL,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_templates_category ON templates (category);
CREATE INDEX IF NOT EXISTS idx_templates_user_id ON templates (user_id);
CREATE INDEX IF NOT EXISTS idx_templates_json_data_gin ON templates USING GIN (json_data);

CREATE TABLE IF NOT EXISTS template_versions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    version     INT  NOT NULL,
    json_data   JSONB NOT NULL,
    changelog   TEXT NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (template_id, version)
);

CREATE INDEX IF NOT EXISTS idx_template_versions_template ON template_versions (template_id);

CREATE TABLE IF NOT EXISTS user_templates (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    custom_data JSONB NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_templates_user ON user_templates (user_id);
CREATE INDEX IF NOT EXISTS idx_user_templates_template ON user_templates (template_id);
