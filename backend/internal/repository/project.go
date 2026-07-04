package repository

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/lazuardicorp/backend/internal/model"
)

var ErrNotFound = errors.New("project not found")

type ProjectRepository struct {
	pool *pgxpool.Pool
}

func NewProjectRepository(pool *pgxpool.Pool) *ProjectRepository {
	return &ProjectRepository{pool: pool}
}

func (r *ProjectRepository) List(ctx context.Context) ([]model.Project, error) {
	rows, err := r.pool.Query(ctx, `SELECT id, data FROM project ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var projects []model.Project
	for rows.Next() {
		var p model.Project
		if err := rows.Scan(&p.ID, &p.Data); err != nil {
			return nil, err
		}
		projects = append(projects, p)
	}

	if projects == nil {
		projects = []model.Project{}
	}

	return projects, rows.Err()
}

func (r *ProjectRepository) GetByID(ctx context.Context, id string) (model.Project, error) {
	var p model.Project
	err := r.pool.QueryRow(ctx, `SELECT id, data FROM project WHERE id = $1`, id).Scan(&p.ID, &p.Data)
	if errors.Is(err, pgx.ErrNoRows) {
		return model.Project{}, ErrNotFound
	}
	return p, err
}

func (r *ProjectRepository) Create(ctx context.Context, data json.RawMessage) (model.Project, error) {
	var p model.Project
	err := r.pool.QueryRow(
		ctx,
		`INSERT INTO project (data) VALUES ($1) RETURNING id, data`,
		data,
	).Scan(&p.ID, &p.Data)
	return p, err
}

func (r *ProjectRepository) Update(ctx context.Context, id string, data json.RawMessage) (model.Project, error) {
	var p model.Project
	err := r.pool.QueryRow(
		ctx,
		`UPDATE project SET data = $2 WHERE id = $1 RETURNING id, data`,
		id, data,
	).Scan(&p.ID, &p.Data)
	if errors.Is(err, pgx.ErrNoRows) {
		return model.Project{}, ErrNotFound
	}
	return p, err
}

func (r *ProjectRepository) Delete(ctx context.Context, id string) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM project WHERE id = $1`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
