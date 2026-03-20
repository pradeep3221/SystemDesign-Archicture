# .NET Solution Structures — .NET 8 / 9 / 10

> A modular reference guide for architecting modern .NET APIs.
> Updated for **C# 12/13**, Minimal APIs, .NET Aspire, Native AOT, and modern tooling.

---

## How to Use This Guide

Each topic is a standalone file — read only what you need.
Files are numbered for recommended reading order, but any section can be opened independently.

---

## Architecture Foundations

| # | Topic | Description |
|---|---|---|
| 00 | [Platform Overview](<00-platform-overview.md>) | .NET 8 / 9 / 10 versions, C# 12 / 13 features |
| 01 | [Tiered Structure](<01-tiered-structure.md>) | Browser → API → DB, cloud-native overview |
| 02 | [n-Layered Architecture](<02-n-layered-architecture.md>) | Presentation, Business, Data layers, projects, cross-cutting concerns |
| 03 | [DDD Architecture](<03-ddd-architecture.md>) | Domain model, aggregates, CQRS with MediatR, infrastructure layer |
| 04 | [Clean Architecture](<04-clean-architecture.md>) | Onion / Hexagonal, dependency rule, solution layout, MediatR behaviours |
| 05 | [Vertical Slice Architecture](<05-vertical-slice.md>) | Feature-based slices, FastEndpoints, Carter, when to use |
| 06 | [.NET Aspire](<06-aspire.md>) | Cloud-native orchestration, AppHost, ServiceDefaults, integrations |

---

## Common Concerns

| # | Topic | Description |
|---|---|---|
| 07 | [Common Concerns](<07-common-concerns.md>) | API tech, Minimal APIs, EF Core, DI, caching, rate limiting, resilience, health checks, async |
| 08 | [Security & Authentication](<08-security-auth.md>) | JWT, OAuth2/OIDC, policy auth, Data Protection, CORS, OWASP mitigations |
| 12 | [API Versioning](<12-api-versioning.md>) | `Asp.Versioning.Http`, URL segment, header, query string, deprecation |
| 13 | [Configuration & Options Pattern](<13-configuration-options.md>) | `IOptions<T>`, validation, named options, Key Vault, AWS Secrets, env vars |
| 15 | [Feature Flags](<15-feature-flags.md>) | `Microsoft.FeatureManagement`, percentage rollout, targeting, Azure App Config |
| 16 | [Pagination](<16-pagination.md>) | Offset-based, cursor/keyset-based, comparison |
| 17 | [Multi-Tenancy](<17-multi-tenancy.md>) | Tenant resolution, shared schema, separate DB, EF global query filters |
| 18 | [File Upload & Download](<18-file-upload-download.md>) | IFormFile, streaming large files, Azure Blob, SAS URLs |
| 19 | [Response Compression](<19-response-compression.md>) | Brotli / Gzip, MIME types, ordering |
| 20 | [JSON & Output Formatting](<20-json-output-formatting.md>) | STJ options, source generation, custom converters, content negotiation |
| 21 | [Middleware Pipeline & Ordering](<21-middleware-pipeline.md>) | Correct `Use*()` order, common mistakes, custom middleware, endpoint filters |
| 22 | [Native AOT](<22-native-aot.md>) | Trade-offs, project setup, AOT-compatible patterns, library compatibility |

---

## Background & Scheduling

| # | Topic | Description |
|---|---|---|
| 14 | [Background Jobs & Scheduling](<14-background-jobs.md>) | `BackgroundService` + `PeriodicTimer`, Hangfire, Quartz.NET, comparison |

---

## API Protocols

| # | Topic | Description |
|---|---|---|
| 23 | [SignalR](<23-signalr.md>) | Real-time hubs, `IHubContext`, Redis backplane, TypeScript client |
| 24 | [gRPC](<24-grpc.md>) | Proto definition, server streaming, typed client, gRPC-JSON transcoding |
| 25 | [OData](<25-odata.md>) | EDM model, `[EnableQuery]`, query examples, security restrictions |
| 26 | [GraphQL](<26-graphql.md>) | Hot Chocolate, schema-first, mutations, subscriptions, DataLoader, Strawberry Shake |

---

## Distributed Systems

| # | Topic | Description |
|---|---|---|
| 09 | [Microservices Patterns](<09-microservices.md>) | API Gateway (YARP), Saga, Outbox, service mesh, Dapr |
| 10 | [Messaging & Event-Driven](<10-messaging.md>) | MassTransit, RabbitMQ, Kafka, Azure Service Bus, idempotency |
| 11 | [Observability](<11-observability.md>) | OpenTelemetry, custom traces/metrics, Serilog, Seq, Grafana stack |

---

## Reference

| # | Topic | Description |
|---|---|---|
| 27 | [NuGet Package Reference](<27-nuget-reference.md>) | Full list of recommended packages, organised by concern |

---

## Quick Decision Guide

```
What kind of API do I need?
├── Standard REST / CRUD          → 02-n-layered-architecture
├── Complex domain / rules-heavy  → 03-ddd-architecture
├── Feature-per-file / modular    → 05-vertical-slice
├── Queryable / admin / BI        → 25-odata
├── Flexible / front-end driven   → 26-graphql
├── High-perf service-to-service  → 24-grpc
└── Real-time push                → 23-signalr

How should I structure my solution?
├── Small / medium app            → 02-n-layered-architecture
├── Domain-rich                   → 03-ddd + 04-clean-architecture
├── Feature-focused               → 05-vertical-slice
└── Cloud / distributed           → 06-aspire + 09-microservices

What cross-cutting concern do I need?
├── Auth / JWT / OAuth2           → 08-security-auth
├── Multiple API versions         → 12-api-versioning
├── Config / secrets              → 13-configuration-options
├── Feature gating                → 15-feature-flags
├── Large result sets             → 16-pagination
├── Multiple tenants              → 17-multi-tenancy
├── File handling                 → 18-file-upload-download
├── Background processing         → 14-background-jobs
├── Async messaging               → 10-messaging
└── Monitoring / alerting         → 11-observability
```

---

*Stack: .NET 8 / 9 / 10 — ASP.NET Core — C# 12 / 13 — EF Core 8 / 9*
*Last reviewed: March 2026*
