$baseUrl = if ($env:API_URL) { $env:API_URL } else { "http://localhost:8080" }

Write-Host "Smoke testing API at $baseUrl"

$list = Invoke-RestMethod -Uri "$baseUrl/api/projects" -Method Get
Write-Host "GET /api/projects -> $($list.Count) project(s)"

$created = Invoke-RestMethod -Uri "$baseUrl/api/projects" -Method Post -ContentType "application/json" -Body '{"data":{"name":"Smoke Test","version":1}}'
$id = $created.id
Write-Host "POST /api/projects -> id=$id"

$loaded = Invoke-RestMethod -Uri "$baseUrl/api/projects/$id" -Method Get
Write-Host "GET /api/projects/$id -> data=$($loaded.data | ConvertTo-Json -Compress)"

$updated = Invoke-RestMethod -Uri "$baseUrl/api/projects/$id" -Method Put -ContentType "application/json" -Body '{"data":{"name":"Smoke Test","version":2}}'
Write-Host "PUT /api/projects/$id -> version=$($updated.data.version)"

Invoke-WebRequest -Uri "$baseUrl/api/projects/$id" -Method Delete | Out-Null
Write-Host "DELETE /api/projects/$id -> 204"

Write-Host "Smoke test passed."
