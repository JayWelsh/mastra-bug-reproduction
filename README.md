# Mastra OpenAPI Spec Bug Reproduction

Minimal reproduction for OpenAPI spec issues introduced in Mastra V1.

## Issues

1. `/openapi.json` returns 404 — spec is now only served at `/api/openapi.json`
2. Paths in the spec no longer include the `/api/` prefix
3. Custom routes are included under `servers: [{url: "/api"}]` despite not being served under `/api/`

## Setup

```bash
npm install
```

## Reproduce

```bash
npx mastra dev
```

Wait for the server to start, then run the following:

### 1. Old endpoint is gone

```bash
curl -s http://localhost:4111/openapi.json
# Expected: OpenAPI spec (pre-V1 behavior)
# Actual: 404
```

### 2. Spec is now at /api/openapi.json

```bash
curl -s http://localhost:4111/api/openapi.json | jq '.servers'
# Returns: [{"url": "/api"}]
```

### 3. Paths lack /api/ prefix

```bash
curl -s http://localhost:4111/api/openapi.json | jq '.paths | keys'
# Returns paths like "/health", "/agents/{agentId}" — no /api/ prefix
```

### 4. Custom route is not served under /api/

```bash
curl -s http://localhost:4111/health
# 200 OK — this is where the route actually lives

curl -s http://localhost:4111/api/health
# 404 — but the spec implies it should be here (servers.url + path = /api/health)
```

## Expected Behavior

Either:

- **Option A**: Restore `/api/` in paths and serve the spec at `/openapi.json` (matching pre-V1 behavior)
- **Option B**: Use path-level `servers` overrides for custom routes so the spec is accurate:
  ```json
  {
    "servers": [{"url": "/api"}],
    "paths": {
      "/agents/{agentId}": { ... },
      "/health": {
        "servers": [{"url": "/"}],
        ...
      }
    }
  }
  ```
- **Option C**: At minimum, don't include custom routes under a `servers` base URL they aren't served under

## Environment

- `mastra` CLI: 1.3.7
- `@mastra/core`: 1.10.0 (resolved via deployer)
- `@mastra/server`: 1.10.0 (via `@mastra/deployer`)
- Node.js: v22.16.0