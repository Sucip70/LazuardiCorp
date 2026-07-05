-- Deployment configuration and history

CREATE TABLE IF NOT EXISTS project_deploy_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
    provider VARCHAR(32) NOT NULL DEFAULT 's3',
    auto_deploy_on_save BOOLEAN NOT NULL DEFAULT FALSE,
    production_domain VARCHAR(255),
    netlify_site_id VARCHAR(128),
    vercel_project_id VARCHAR(128),
    s3_bucket VARCHAR(255),
    s3_prefix VARCHAR(512),
    cloudfront_distribution_id VARCHAR(64),
    external_site_url TEXT,
    last_deployment_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deployments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    provider VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    is_preview BOOLEAN NOT NULL DEFAULT FALSE,
    preview_token VARCHAR(64),
    url TEXT,
    preview_url TEXT,
    external_id VARCHAR(255),
    error_message TEXT,
    triggered_by VARCHAR(32) NOT NULL DEFAULT 'manual',
    metadata JSONB NOT NULL DEFAULT '{}',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deployments_project_id ON deployments(project_id);
CREATE INDEX IF NOT EXISTS idx_deployments_preview_token ON deployments(preview_token);

CREATE TABLE IF NOT EXISTS deployment_domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    deployment_id UUID REFERENCES deployments(id) ON DELETE SET NULL,
    hostname VARCHAR(255) NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    ssl_status VARCHAR(32) NOT NULL DEFAULT 'none',
    dns_records JSONB NOT NULL DEFAULT '[]',
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deployment_domains_project ON deployment_domains(project_id);
CREATE INDEX IF NOT EXISTS idx_deployment_domains_hostname ON deployment_domains(hostname);
