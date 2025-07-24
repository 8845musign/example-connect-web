# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Root-level commands (run from project root)
```bash
# Install dependencies for all packages
npm run install:all

# Start development servers (frontend + backend concurrently)
npm run dev

# Build everything (proto generation + backend + frontend)
npm run build

# Generate Protocol Buffer code (MUST run before building)
npm run proto:generate

# Lint all packages
npm run lint:all        # Fix issues
npm run lint:check      # Check without fixing

# Format all packages
npm run format:all      # Format code
npm run format:check    # Check formatting
```

### Backend commands (run from /backend)
```bash
npm run dev        # Start with hot reload (tsx watch)
npm run build      # Compile TypeScript
npm run start      # Run compiled code
npm run lint       # Fix linting issues
npm run format     # Format code
```

### Frontend commands (run from /frontend)
```bash
npm run dev        # Start React Router dev server
npm run build      # Build for production
npm run start      # Serve production build
npm run typecheck  # Generate types and run TypeScript check
npm run lint       # Fix linting issues
npm run format     # Format code
```

## Architecture Overview

This is a real-time streaming dashboard demonstrating gRPC-Web communication patterns using connect-web v2 and React Router v7.

### Communication Flow
```
[Backend Services] → gRPC/HTTP2 → [connect-node] → [connect-web] → [React UI]
     ↑                                                    ↓
     └─────────── Dynamic Filters ←──────────────────────┘
```

### Key Technologies
- **Frontend**: React 18, React Router v7 (client-side only), @connectrpc/connect-web v2, Vite
- **Backend**: Node.js, Express, @connectrpc/connect-node v2
- **Protocol**: Protocol Buffers with buf toolchain

### gRPC Patterns Implemented
1. **Server Streaming**: Real-time metrics and logs (one-way server→client)
2. **Bidirectional Streaming**: Interactive queries with dynamic filtering
3. **Unary RPC**: Single request/response for summaries

### Project Structure
```
connect-web/
├── proto/                 # Protocol Buffer definitions
│   └── monitoring/v1/    # Service definitions (metrics, logs, service)
├── backend/              
│   ├── src/
│   │   ├── services/     # gRPC service implementations
│   │   │   ├── MonitoringService.ts  # Main service
│   │   │   └── InteractiveService.ts # Bidirectional streaming
│   │   ├── utils/        # Data generators
│   │   └── proto/gen/    # Generated protobuf code
├── frontend/
│   ├── app/
│   │   ├── routes/       # File-based routing
│   │   │   ├── _index.tsx        # Dashboard home
│   │   │   ├── metrics.$type.tsx # Dynamic metric routes
│   │   │   ├── logs.tsx          # Log streaming
│   │   │   └── interactive.tsx   # Bidirectional demo
│   │   ├── components/   # UI components
│   │   └── lib/          
│   │       ├── proto/    # Generated protobuf code
│   │       ├── hooks/    # Streaming hooks
│   │       └── client.ts # connect-web client setup
```

### Development Notes

1. **Protocol Buffers**: Always run `npm run proto:generate` after modifying .proto files
2. **ES Modules**: Project uses `"type": "module"` - use ES import/export syntax
3. **Concurrent Dev**: Backend runs on port 8080, frontend on port 3000
4. **No SSR**: React Router v7 is configured for client-side rendering only
5. **Streaming Lifecycle**: Use useEffect cleanup to properly close streams
6. **Error Handling**: Implement try-catch for stream errors and connection failures

### Testing
Currently no testing framework is configured. When adding tests, consider Vitest for compatibility with Vite.

### Important Patterns

#### Backend Service Implementation
Services extend base classes and implement async generators for streaming:
```typescript
async *streamMetrics(req: StreamMetricsRequest): AsyncGenerator<MetricData> {
  while (!context.signal.aborted) {
    yield generateMetric();
    await delay(req.intervalMs);
  }
}
```

#### Frontend Stream Consumption
Use hooks with proper cleanup:
```typescript
useEffect(() => {
  const abortController = new AbortController();
  const stream = client.streamMetrics(request, {
    signal: abortController.signal
  });
  
  // Process stream...
  
  return () => abortController.abort();
}, [dependencies]);
```

#### Route Organization
React Router v7 uses file-based routing:
- `routes/_index.tsx` → `/`
- `routes/metrics.$type.tsx` → `/metrics/:type`
- `routes/logs.tsx` → `/logs`