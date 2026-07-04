package model

import "encoding/json"

type Project struct {
	ID   string          `json:"id"`
	Data json.RawMessage `json:"data"`
}

type ProjectInput struct {
	Data json.RawMessage `json:"data"`
}
