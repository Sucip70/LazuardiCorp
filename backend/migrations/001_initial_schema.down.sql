BEGIN;

DROP TRIGGER IF EXISTS trg_project_templates_updated_at ON project_templates;
DROP TRIGGER IF EXISTS trg_assets_updated_at ON assets;
DROP TRIGGER IF EXISTS trg_components_updated_at ON components;
DROP TRIGGER IF EXISTS trg_pages_version_snapshot ON pages;
DROP TRIGGER IF EXISTS trg_pages_updated_at ON pages;
DROP TRIGGER IF EXISTS trg_projects_updated_at ON projects;
DROP TRIGGER IF EXISTS trg_users_updated_at ON users;

DROP FUNCTION IF EXISTS snapshot_page_version();
DROP FUNCTION IF EXISTS set_updated_at();

DROP TABLE IF EXISTS project_templates;
DROP TABLE IF EXISTS assets;
DROP TABLE IF EXISTS components;
DROP TABLE IF EXISTS page_versions;
DROP TABLE IF EXISTS pages;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS users;

COMMIT;
