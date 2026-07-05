package staticgen_test

import "encoding/json"

func staticgenTestJSONUnmarshal(b []byte, v any) error {
	return json.Unmarshal(b, v)
}

func staticgenTestJSONMarshal(v any) ([]byte, error) {
	return json.Marshal(v)
}
