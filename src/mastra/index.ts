
import { Mastra } from '@mastra/core/mastra';
import { registerApiRoute } from "@mastra/core/server";
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { Observability, DefaultExporter, CloudExporter, SensitiveDataFilter } from '@mastra/observability';
import { weatherWorkflow } from './workflows/weather-workflow';
import { weatherAgent } from './agents/weather-agent';
import { toolCallAppropriatenessScorer, completenessScorer, translationScorer } from './scorers/weather-scorer';

export const mastra = new Mastra({
  workflows: { weatherWorkflow },
  agents: { weatherAgent },
  scorers: { toolCallAppropriatenessScorer, completenessScorer, translationScorer },
  storage: new LibSQLStore({
    id: "mastra-storage",
    // stores observability, scores, ... into persistent file storage
    url: "file:./mastra.db",
  }),
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
  observability: new Observability({
    configs: {
      default: {
        serviceName: 'mastra',
        exporters: [
          new DefaultExporter(), // Persists traces to storage for Mastra Studio
          new CloudExporter(), // Sends traces to Mastra Cloud (if MASTRA_CLOUD_ACCESS_TOKEN is set)
        ],
        spanOutputProcessors: [
          new SensitiveDataFilter(), // Redacts sensitive data like passwords, tokens, keys
        ],
      },
    },
  }),
  server: {
    build: {
      openAPIDocs: true,
    },
    apiRoutes: [
      registerApiRoute('/health', {
        method: 'GET',
        openapi: {
          summary: 'Health check',
          tags: ['System'],
        },
        handler: async (c) => {
          return c.json({ status: 'ok' });
        },
      }),
    ],
  },
});

// After running `mastra dev`:
//
// 1. GET http://localhost:4111/openapi.json        → 404 (was available pre-V1)
// 2. GET http://localhost:4111/api/openapi.json     → 200 (new location)
//
// 3. The spec contains:
//    "servers": [{"url": "/api"}]
//
// 4. The /health custom route appears in the spec without /api/ prefix,
//    but is grouped under the /api server base URL.
//
//    In reality:
//    - GET http://localhost:4111/health      → 200 (actual route)
//    - GET http://localhost:4111/api/health   → 404 (spec implies this should work)