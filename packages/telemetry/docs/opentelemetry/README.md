# OpenTelemetry Telemetry Package

This package provides OpenTelemetry-based telemetry for **CLI, Web, Desktop, and Agent** applications in the Guepard monorepo. The implementation focuses on **distributed tracing with spans** for observability and billing, with experimental metrics support for monitoring.

## 📚 Documentation

- **[docs/opentelemetry/IMPLEMENTATION.md](./IMPLEMENTATION.md)** - Comprehensive implementation guide
- **[docs/opentelemetry/EXAMPLES.md](./EXAMPLES.md)** - Usage examples for all apps
- **[docs/opentelemetry/STRUCTURE.md](./STRUCTURE.md)** - Package structure guide
- **[docs/opentelemetry/NO_TELEMETRY.md](./NO_TELEMETRY.md)** - How to disable telemetry

## Quick Start

### CLI

```typescript
import { withActionSpan } from '@guepard/telemetry/otel/utils';

await withActionSpan(
  telemetry,
  {
    actionName: 'project.list',
    appType: 'cli',
    mode: 'command',
    workspace: { userId: 'user123' },
  },
  async (span) => {
    // Command logic
    return result;
  },
);
```

### Web/Desktop (React)

```typescript
import { TelemetryProvider, useTelemetry } from '@guepard/telemetry/otel';

function App() {
  return (
    <TelemetryProvider telemetry={telemetry}>
      <MyComponent />
    </TelemetryProvider>
  );
}

function MyComponent() {
  const { telemetry } = useTelemetry();
  // Use telemetry...
}
```

### Agent

```typescript
const agent = new FactoryAgent({
  conversationSlug,
  repositories,
  telemetry: container.telemetry, // Pass telemetry instance
});
// Telemetry is automatically instrumented with nested spans
```

## Location

All telemetry code is in `/packages/telemetry/src/otel` and is reusable across:
- **CLI** (`apps/cli`)
- **Web** (`apps/web`)
- **Desktop** (`apps/desktop`)
- **Agent** (`packages/agent-factory-sdk`)

## Architecture

### Core Components

1. **OtelTelemetryManager** (`src/otel/manager.ts`)
   - Main OpenTelemetry SDK manager
   - Lazy-loads Node.js modules to prevent browser bundling
   - Handles spans, metrics, and events
   - Supports ConsoleSpanExporter (default) and OTLP exporters
   - Session management with cryptographically secure IDs
   - Automatic attribute serialization
   - Resource attributes (service name, host info, process info, session ID)

2. **Telemetry Utilities** (`src/otel/utils.ts`)
   - Generic utilities for all app types
   - `withActionSpan()` - Wraps actions with telemetry and automatic span lifecycle
   - `createActionAttributes()` - Standardized attribute creation with workspace context
   - `recordQueryMetrics()` - Records query execution metrics (for monitoring)
   - `recordTokenUsage()` - Records AI token usage metrics (for monitoring)

3. **Agent Helpers** (`src/otel/agent-helpers.ts`)
   - `createConversationAttributes()` - Conversation span attributes
   - `createMessageAttributes()` - Message span attributes
   - `createActorAttributes()` - Actor span attributes with model parsing
   - `createLLMAttributes()` - LLM span attributes (model, provider, temperature, maxTokens)
   - `createLLMSpanAttributes()` - Alias for LLM span creation
   - `withActorTelemetry()` - Wraps agent actors with telemetry and proper context propagation
   - `endActorSpanWithEvent()` - Ends actor spans with events
   - `extractTokenUsage()` - Extracts token usage from various provider formats

4. **Event Schemas** (`src/events/`)
   - `cli.events.ts` - CLI event constants
   - `web.events.ts` - Web event constants
   - `desktop.events.ts` - Desktop event constants
   - `agent.events.ts` - Agent event constants

5. **React Context** (`src/otel/context.tsx`)
   - `TelemetryProvider` - React context provider
   - `useTelemetry()` - React hook

6. **Filtering Span Exporter** (`src/otel/filtering-exporter.ts`)
   - Filters spans based on app-specific telemetry settings
   - Allows selective export of general vs app-specific spans

## Span-Based Billing System

**Primary Billing Mechanism:**
- Token usage captured as **span attributes** on LLM call spans
- Spans exported via OTLP to OpenTelemetry Collector
- Collector uses `spanmetrics` connector to extract metrics from spans
- Metrics derived from spans stored in ClickHouse for billing queries
- Span attributes provide full context: model, provider, conversation, actor

**Span Attributes for Billing:**
- `agent.llm.prompt.tokens` - Prompt tokens used
- `agent.llm.completion.tokens` - Completion tokens generated
- `agent.llm.total.tokens` - Total tokens (prompt + completion)
- `agent.llm.model.name` - Model identifier
- `agent.llm.provider.id` - Provider (azure, ollama, webllm, etc.)
- `agent.conversation.id` - Conversation identifier
- `agent.actor.id` - Actor identifier (detectIntent, greeting, etc.)

**Span Hierarchy (Critical for Billing):**
```
Agent conversation span (per respond() call)
 └─ Message span (per USER_INPUT)
      └─ Actor spans (detectIntent, summarizeIntent, greeting, readData, loadContext)
           └─ LLM spans (in model providers)
                └─ Token usage attributes (agent.llm.prompt.tokens, agent.llm.completion.tokens, agent.llm.total.tokens)
```

## Current Status

### ✅ Implemented

- ✅ **CLI Telemetry** - All commands instrumented with spans
- ✅ **Agent Telemetry** - FactoryAgent and XState actors instrumented with nested spans
- ✅ **LLM Telemetry** - Token usage captured as span attributes for billing
- ✅ **Web Integration** - Query spans instrumented in web app
- ✅ **Span-Based Billing** - Token usage in span attributes, exported via OTLP
- ✅ **Events** - Comprehensive event schemas for all apps
- ✅ **React Context** - TelemetryProvider and hooks for web/desktop
- ✅ **Helper Functions** - Type-safe attribute creation helpers (no hardcoding)

### ⚠️ Known Limitations

**XState Context Propagation:** Due to XState's async actor invocation via `fromPromise`, perfect span nesting may not always be achieved. Spans are still created with correct attributes and can be correlated via `agent.conversation.id`. This does not affect billing data collection.

**Metrics Export:** Direct metrics export is experimental and not fully working. Billing relies on span attributes exported via OTLP, which are then processed by the collector's `spanmetrics` connector to generate billing metrics.

## Metrics (Experimental - Monitoring Only)

**Status:** Metrics export is experimental and not fully working. Currently used for monitoring and telemetry purposes only, not for billing.

### Command/Action Metrics
- `cli.command.duration` (histogram, ms)
- `cli.command.count` (counter)
- `cli.command.success.count` (counter)
- `cli.command.error.count` (counter)

### Query Metrics
- `cli.query.duration` (histogram, ms)
- `cli.query.count` (counter)
- `cli.query.rows.returned` (histogram)

### Token Usage Metrics (Experimental)
- `ai.tokens.prompt` (counter) - For monitoring only
- `ai.tokens.completion` (counter) - For monitoring only
- `ai.tokens.total` (counter) - For monitoring only

**Note:** Billing relies on span attributes, not direct metrics export. Metrics are supplementary for monitoring dashboards.

## Configuration

### Environment Variables

```bash
# Disable telemetry entirely
OTEL_SDK_DISABLED=true

# OTLP Exporter Endpoint (optional)
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317

# Service Name (optional)
OTEL_SERVICE_NAME=guepard-web-server

# Log Level (optional)
OTEL_LOG_LEVEL=info

# Enable debug logging and console exporters (default: false)
QWERY_TELEMETRY_DEBUG=true
```

### ClickHouse Integration for Billing

**Billing Data Flow:**
1. Application creates spans with token usage attributes (`agent.llm.prompt.tokens`, `agent.llm.completion.tokens`, `agent.llm.total.tokens`)
2. Spans exported via OTLP to OpenTelemetry Collector
3. Collector uses `spanmetrics` connector to extract metrics from spans
4. Span-derived metrics exported to ClickHouse
5. Billing queries extract token usage from span-derived metrics

**Collector Configuration:**
- Traces pipeline receives spans from OTLP receiver
- `spanmetrics` connector configured to extract token usage from span attributes
- Metrics exported to ClickHouse via `clickhouse` exporter
- Billing queries run against span-derived metrics tables

## Exports

```typescript
// Main exports
export { TelemetryManager } from '@guepard/telemetry/otel';
export { OtelClientService } from '@guepard/telemetry/otel';
export { OtelNullTelemetryService } from '@guepard/telemetry/otel';

// React context
export { TelemetryProvider, useTelemetry } from '@guepard/telemetry/otel';

// Utilities
export {
  withActionSpan,
  createActionAttributes,
  parseActionName,
  recordQueryMetrics,
  recordTokenUsage,
  type ActionContext,
  type WorkspaceContext,
} from '@guepard/telemetry/otel/utils';

// Agent helpers
export {
  createConversationAttributes,
  createMessageAttributes,
  createActorAttributes,
  createLLMAttributes,
  createLLMSpanAttributes,
  withActorTelemetry,
  endActorSpanWithEvent,
  extractTokenUsage,
} from '@guepard/telemetry/otel/agent-helpers';

// Event constants
export { 
  CLI_EVENTS,
WEB_EVENTS,
DESKTOP_EVENTS,
AGENT_EVENTS } from '@guepard/telemetry';
```

**Note:** Both `/otel` and `/opentelemetry` subpath exports are available for backward compatibility.

## File Structure

```
packages/telemetry/
├── src/
│   ├── otel/
│   │   ├── manager.ts              # OtelTelemetryManager (main SDK manager)
│   │   ├── utils.ts                 # Generic utilities (withActionSpan, etc.)
│   │   ├── agent-helpers.ts         # Agent-specific helpers (createLLMAttributes, etc.)
│   │   ├── context.tsx               # React context provider
│   │   ├── client-service.ts         # Client-side telemetry service
│   │   ├── null-service.ts          # No-op service
│   │   ├── filtering-exporter.ts    # Span filtering exporter
│   │   └── index.ts                 # Package exports
│   ├── events/
│   │   ├── cli.events.ts
│   │   ├── web.events.ts
│   │   ├── desktop.events.ts
│   │   └── agent.events.ts
│   └── ...
├── docs/
│   └── opentelemetry/
│       ├── IMPLEMENTATION.md        # Implementation guide
│       ├── EXAMPLES.md              # Usage examples
│       ├── STRUCTURE.md             # Package structure
│       └── NO_TELEMETRY.md         # Disable telemetry guide
└── package.json
```

## Key Features

- **Span-Based Billing** - Token usage captured as span attributes, exported to ClickHouse
- **Nested Span Hierarchies** - Proper parent-child relationships for distributed tracing
- **Type-Safe Helpers** - Helper functions for creating attributes (no hardcoding)
- **Session Management** - Cryptographically secure session IDs for correlation
- **Browser-Safe** - OpenTelemetry code externalized in web builds
- **Zero-Config** - Works out-of-the-box with console exporter
- **Production-Ready** - OTLP export for observability platforms

## Next Steps

1. ✅ **Web Integration** - Query spans instrumented in web app
2. [ ] **Desktop Integration** - Use `TelemetryProvider` in desktop app
3. [ ] **Metrics Dashboard** - Set up Grafana dashboards for span-derived metrics
4. [ ] **Billing Queries** - Optimize ClickHouse queries for span-derived token usage
5. [ ] **Metrics Export Stabilization** - Fix direct metrics export (currently experimental)
