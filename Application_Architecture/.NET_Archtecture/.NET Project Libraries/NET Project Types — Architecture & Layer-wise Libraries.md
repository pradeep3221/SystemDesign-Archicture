# .NET Project Types — Architecture & Layer-wise Libraries

## Document Information

| Item | Value |
|---|---|
| Document focus | Modern .NET project types, architecture patterns, and layer-wise library choices |
| Runtime summary | Mapped for the latest modern .NET stack, including current platform features and cloud-native patterns |
| Version note | Explicit runtime/version details are intentionally kept only in this summary section |
| Last updated | April 2026 |

> **Key:** ✅ Must-Have | ⭐ Recommended Default | ⚙️ Advanced / Optional | 🔄 Alternative | 🟢 OSS | 🔴 Commercial | 🟡 OSS Core / Commercial Add-ons | 🆕 Newer platform capability

---

## Enforcement Model

Every standard in this document is tagged with an enforcement level. Teams **must not** ship without satisfying all **MUST** items. Deviations from **SHOULD** require a documented Architecture Decision Record (ADR). **MAY** items are discretionary.

| Level | Meaning | Enforcement Mechanism | Deviation Process |
|---|---|---|---|
| 🔒 **MUST** | Non-negotiable. Failure blocks release. | CI/CD gates, architecture tests (`NetArchTest.Rules`), automated policy checks | Requires VP-level exception with written ADR |
| 📋 **SHOULD** | Strong recommendation. Expected unless a valid reason exists. | Code review checklist, architecture review board | Team lead approves with ADR filed in repo |
| 💡 **MAY** | Optional. Use when it adds clear value. | Team discretion | No formal process required |

### Enforcement Tooling

| Enforcement Point | Tool / Mechanism | Examples |
|---|---|---|
| **Build-time** | `NetArchTest.Rules` / `ArchUnitNET` in CI | Domain MUST NOT reference Infrastructure; Handlers MUST return `Result<T>` |
| **PR review** | Checklist template in PR description | OpenTelemetry configured? Health checks registered? Secrets in Key Vault? |
| **Pipeline gate** | `dotnet test` + architecture test project | Blocks merge if dependency rules violated |
| **Runtime** | Health check endpoints + observability alerts | Liveness/readiness probes MUST be present in orchestrated deployments |
| **Periodic audit** | Quarterly dependency review | NuGet advisories, deprecated packages, license compliance |

> **Governance tip:** Start with **MUST** items only. Add **SHOULD** enforcement gradually as team maturity increases. Premature over-governance creates friction without value.

---

## 1. .NET Project Types

| # | Project Type | CLI Template | Primary Runtime | Typical Use Case | Key Notes |
|---|---|---|---|---|---|
| 1 | **Web API** | `webapi` | ASP.NET Core | REST/HTTP microservices, backend APIs | Built-in OpenAPI support; Native AOT possible |
| 2 | **Minimal API** | `webapi --use-minimal-apis` | ASP.NET Core | Lightweight HTTP endpoints, low-overhead APIs | `TypedResults`, Route Groups, Endpoint Filters |
| 3 | **MVC Web App** | `mvc` | ASP.NET Core | Server-rendered web applications | Razor views and classic MVC patterns |
| 4 | **Blazor Server** | `blazorserver` | ASP.NET Core | Interactive server-side UI with SignalR | Still relevant where server-side rendering is preferred |
| 5 | **Blazor WebAssembly** | `blazorwasm` | WebAssembly | Client-side SPA in .NET/C# | Good fit for rich client-side apps |
| 6 | **Blazor Web App (Unified)** 🆕 | `blazor` | ASP.NET Core | Unified Blazor with per-component render mode | Combines server, WASM, and auto render modes |
| 7 | **Blazor Hybrid (MAUI)** | `maui-blazor` | .NET MAUI | Cross-platform desktop/mobile with Blazor UI | Shared component model across web and device UI |
| 8 | **Worker Service** | `worker` | .NET Generic Host | Background processing, daemons | Best for schedulers, consumers, hosted jobs |
| 9 | **Console App** | `console` | .NET | CLI tools, batch jobs, scripts | Pair with Generic Host for configuration and DI |
| 10 | **gRPC Service** | `grpc` | ASP.NET Core | High-performance binary RPC services | Great for internal service-to-service communication |
| 11 | **SignalR Hub** | `webapi` + SignalR | ASP.NET Core | Real-time push / bidirectional communication | Useful for dashboards, chat, live updates |
| 12 | **Microservice** | `webapi` + Dockerized | ASP.NET Core | Independently deployable bounded contexts | Strong fit for DDD and event-driven systems |
| 13 | **Aspire AppHost** 🆕 | `aspire-apphost` | .NET + Aspire | Cloud-native orchestration & service composition | Useful for local orchestration and service discovery |
| 14 | **WPF Desktop** | `wpf` | .NET | Windows GUI applications | Strong desktop option for Windows-only apps |
| 15 | **WinForms Desktop** | `winforms` | .NET | Windows Forms GUI applications | Simple Windows desktop line-of-business apps |
| 16 | **MAUI App** | `maui` | .NET MAUI | Cross-platform mobile & desktop | Cross-device UI with native capabilities |
| 17 | **Class Library / SDK** | `classlib` | .NET / .NET Standard | Shared logic, reusable components, NuGet packages | Keep dependencies minimal and contracts stable |
| 18 | **Azure Function** | `func` (Azure Functions Core Tools) | Isolated Worker | Event-driven serverless compute | Best for triggers, timers, messaging, HTTP |
| 19 | **Test Project** | `xunit` / `nunit` / `mstest` | .NET | Unit / integration / E2E tests | Keep test type aligned with project boundary |

---

## 2. Recommended Application Architecture by Project Type

| Project Type | Primary Architecture | Secondary / Alternative | Pattern Notes |
|---|---|---|---|
| Web API | **Clean Architecture** | Vertical Slice, Layered (N-Tier) | CQRS works well for complex APIs |
| Minimal API | **Vertical Slice** | Clean Architecture | `RouteGroupBuilder` + `TypedResults`; endpoint filters for cross-cutting concerns |
| MVC Web App | **MVC + Clean Architecture** | Layered (N-Tier) | ViewModels map to Application DTOs |
| Blazor Web App (Unified) | **Clean Architecture + MVVM** | Vertical Slice | Per-component render mode selection and streaming rendering |
| Blazor WASM | **MVVM / Flux** | Clean Architecture | State management becomes important as UI grows |
| Blazor Hybrid | **MVVM** | Clean Architecture | Shared UI core with platform-specific host shell |
| Worker Service | **Layered / Domain Services** | Clean Architecture (light) | Focus on idempotency, retries, and observability |
| Console App | **Layered** | Vertical Slice | Simple tools can stay flat, larger tools benefit from hosting abstractions |
| gRPC Service | **Clean Architecture** | Layered | Proto contracts stay close to application boundaries |
| SignalR Hub | **Clean Architecture** | Layered | Keep business logic outside hubs |
| Microservice | **DDD + Clean Architecture** | CQRS + Event Sourcing | Bounded contexts and aggregate roots matter more than generic layering |
| Aspire AppHost | **Cloud-Native Composition** | N/A | Resource model, service discovery, telemetry wiring |
| WPF / WinForms | **MVVM** | MVP | Prefer Toolkit- or Prism-style composition |
| MAUI App | **MVVM + Shell** | Clean Architecture | Shell navigation with thin views and rich view models |
| Class Library | **Domain-Centric** | N/A | Keep framework coupling low |
| Azure Function | **Vertical Slice** | Clean Architecture (light) | Function handler should stay thin; push logic into services |

---

## 3. ⭐ Recommended Default Stack (Enterprise Baseline)

For teams starting a new **Web API or Microservice**, this opinionated baseline avoids analysis paralysis. Deviate only when a specific requirement demands it.

| Concern | Default Choice | Why This Default | Enforcement |
|---|---|---|---|
| **Architecture** | Clean Architecture + CQRS | Proven separation for medium-to-large services; scales well with team size | 🔒 MUST for services with >5 entities; 📋 SHOULD for smaller services |
| **API Style** | Minimal API | Lower ceremony for new services; use Controllers only when the project is already Controller-based | 📋 SHOULD for new services; 💡 MAY keep Controllers in existing projects |
| **ORM** | EF Core (write) + Dapper (read-heavy) | EF Core for change tracking and migrations; Dapper when raw query performance matters | 🔒 MUST use EF Core for writes; 📋 SHOULD use Dapper for read-heavy queries |
| **Mediator / CQRS** | MediatR | Familiar ecosystem default; pipeline behaviors cover validation, logging, caching | 📋 SHOULD for services with >5 entities |
| **Messaging** | MassTransit | Transport-agnostic bus with outbox, saga, and retry support out of the box | 🔒 MUST use outbox pattern for cross-service messaging |
| **Caching** | HybridCache + Redis | Two-level caching with stampede protection; built-in and forward-looking | 📋 SHOULD for read-heavy services |
| **Observability** | OpenTelemetry + Serilog | Vendor-neutral tracing and metrics; Serilog for rich structured logging | 🔒 MUST — all services require structured logging and distributed tracing |
| **Auth** | JWT Bearer + Entra ID / OpenIddict | Entra ID for corporate; OpenIddict when the app owns its identity | 🔒 MUST use token-based auth; 🔒 MUST use Entra ID for internal services |
| **Validation** | FluentValidation | Expressive rules; integrates cleanly as a MediatR pipeline behavior | 🔒 MUST validate all external input |
| **Mapping** | Mapster | Leaner than AutoMapper; code-gen mode for zero-reflection mapping | 📋 SHOULD use Mapster for new projects; 💡 MAY keep AutoMapper in existing |
| **Resilience** | `Microsoft.Extensions.Http.Resilience` | Built-in retry, circuit breaker, and hedging for outbound HTTP | 🔒 MUST for all outbound HTTP calls |
| **Result Pattern** | Ardalis.Result | Avoid exceptions for expected control flow; consistent error handling | 📋 SHOULD — handlers return `Result<T>` instead of throwing |
| **Testing** | xUnit + NSubstitute + FluentAssertions + Testcontainers | Readable tests with real infrastructure where it matters | 🔒 MUST have unit + integration tests; 📋 SHOULD use Testcontainers |
| **AI (when needed)** | `Microsoft.Extensions.AI` + Semantic Kernel | Vendor-neutral abstractions; SK for RAG and agent orchestration | 📋 SHOULD use abstraction layer; 🔒 MUST NOT hard-code model provider |

> **Note:** This is a starting point, not a mandate. Teams should adapt based on domain complexity, team familiarity, and operational constraints.

---

## 4. 🚫 Anti-Pattern Guide — When NOT to Use

Knowing when to **avoid** a tool is as important as knowing when to use it.

| Technology / Pattern | 🚫 Avoid When… | ✅ Use When… |
|---|---|---|
| **MediatR / CQRS** | Simple CRUD app with <5 entities and minimal business logic — adds indirection without payoff | Domain has distinct read/write models, complex validation pipelines, or cross-cutting behaviors |
| **DDD (full)** | Domain is mostly data-in/data-out with few business rules; DDD tactical patterns add ceremony for no gain | Rich business rules, complex invariants, multiple bounded contexts |
| **Event Sourcing** | Standard CRUD with no audit/history requirement — ES adds storage and replay complexity | Audit trail is a core requirement, or temporal queries ("what was the state at time X?") are needed |
| **Microservices** | Small team (<5 devs), single deployment unit, no independent scaling needs — distributed systems tax is too high | Independent deployment, separate scaling profiles, distinct bounded contexts owned by different teams |
| **Repository Pattern (generic)** | Generic `IRepository<T>` that wraps EF Core 1:1 — hides useful ORM features (Include, projection, split queries) | Specification-based repositories (Ardalis.Specification) that add real query reuse |
| **AutoMapper** | Only a few simple mappings — manual mapping or Mapster code-gen is clearer and faster | Large codebase with many mapping profiles and an established AutoMapper convention |
| **Blazor Server** | App requires offline support, low-latency UI on slow networks, or massive concurrent user counts — SignalR circuit overhead adds up | Internal LOB apps with small/medium user bases where server-side rendering simplifies the stack |
| **Vertical Slice (pure)** | Large team that needs strong layered governance and shared domain model — slices can diverge without discipline | Small team, Minimal API, feature-focused development with low cross-cutting concern overlap |
| **Hangfire** | Only need a simple `IHostedService` timer — Hangfire's dashboard and persistence are overhead | Dashboard visibility, delayed/recurring jobs, and retry semantics are genuinely needed |
| **Full Aspire orchestration** | Production multi-region deployment — Aspire is a dev-time tool, not a production orchestrator | Local development, multi-service inner loop, consistent service defaults |

---

## 5. Clean Architecture Layers Reference

```
┌─────────────────────────────────────────────────────────────────┐
│                     Presentation Layer                          │
│  Controllers · Minimal API Endpoints · Razor Pages · Blazor     │
│  Components · gRPC Services · SignalR Hubs · TypedResults        │
├─────────────────────────────────────────────────────────────────┤
│                     Application Layer                           │
│  CQRS Handlers · Use Cases · DTOs · Interfaces                  │
│  Pipeline Behaviors · Feature Flags · AI Abstractions           │
├─────────────────────────────────────────────────────────────────┤
│                       Domain Layer                              │
│  Entities · Aggregates · Domain Events · Value Objects          │
│  Smart Enums · Guard Clauses · TimeProvider · Money             │
├─────────────────────────────────────────────────────────────────┤
│                   Infrastructure Layer                          │
│  EF Core · Dapper · MassTransit · Azure SDK                     │
│  Redis · Blob Storage · External HTTP · Outbox                  │
├─────────────────────────────────────────────────────────────────┤
│                  Cross-Cutting Concerns                         │
│  Serilog · OpenTelemetry · Polly · FluentValidation             │
│  Identity · Hybrid Cache · Service Discovery                    │
└─────────────────────────────────────────────────────────────────┘
              ▲ Aspire service defaults can wire much of this ▲
```

### Key Platform Features Map

| Feature | Where It Lands | Why It Matters |
|---|---|---|
| **Built-in OpenAPI** | Presentation | Reduces dependency on extra spec-generation packages |
| **`TypedResults`** | Presentation | Better endpoint typing and OpenAPI inference |
| **`HybridCache`** | Infrastructure / Cross-cut | Simplifies two-level caching patterns |
| **`TimeProvider`** | Domain / Cross-cut | Standardized time abstraction for production code and tests |
| **`IHostedLifecycleService`** | Worker / Cross-cut | More granular start/stop lifecycle hooks |
| **Native AOT** | All layers | Useful for startup-sensitive services |
| **`System.CommandLine`** | Console | Better CLI structure for serious tooling |
| **Modern C# property features** | Domain | Cleaner value object and model implementations |
| **WASM multi-threading** | Blazor WASM | Better performance for richer browser workloads |
| **Unified Blazor render modes** | Blazor | One app model with multiple rendering strategies |
| **`Microsoft.Extensions.AI`** 🆕 | Application / Infra | Vendor-neutral AI abstractions |
| **Aspire** 🆕 | Orchestration | Local service composition, discovery, telemetry, dashboard |
| **SignalR stateful reconnect** | SignalR | Better reconnect behavior for real-time workloads |
| **JSON column support** | Infrastructure | Better persistence options for rich document shapes |
| **Complex types** | Domain / Infra | Cleaner mapping for value objects |

---

## 6. Layer-wise Libraries — Web API / Microservice (Most Complete Reference)

### 6.1 Presentation Layer

| Concern | ✅ Must-Have (OSS 🟢 / Comm 🔴) | 🔄 Alternatives | Notes |
|---|---|---|---|
| API Framework | `Microsoft.AspNetCore` 🟢 | Minimal APIs (built-in) | Core web framework; controllers and Minimal APIs both work well |
| API Versioning | `Asp.Versioning.Http` 🟢 | `Asp.Versioning.Mvc` 🟢 | URL/header/query versioning |
| API Documentation (UI) | `Scalar.AspNetCore` 🟢 | `Swashbuckle.AspNetCore` 🟢, `NSwag.AspNetCore` 🟢 | Scalar is a strong default UI choice |
| OpenAPI Spec Generation | `Microsoft.AspNetCore.OpenApi` 🟢 | `NSwag.AspNetCore` 🟢 | Prefer built-in spec generation where possible |
| Typed API Results | `TypedResults` (built-in) 🟢 | `IResult` implementations 🟢 | Helps endpoint clarity and response typing |
| Request Validation | `FluentValidation.AspNetCore` 🟢 | `DataAnnotations` (built-in) 🟢 | FluentValidation is better for complex rules |
| Endpoint Filters 🆕 | Built-in `IEndpointFilter` 🟢 | `ActionFilter` (MVC) 🟢 | Good for Minimal API validation, logging, auth checks |
| Output Caching | `Microsoft.AspNetCore.OutputCaching` 🟢 | `ResponseCaching` (built-in) 🟢 | Better than plain response caching for modern APIs |
| Rate Limiting | `Microsoft.AspNetCore.RateLimiting` 🟢 | `AspNetCoreRateLimit` 🟢 | Built-in rate-limiting primitives are usually enough |
| API Gateway (self-hosted) | `YARP` 🟢 | `Ocelot` 🟢, `Kong` 🔴 | YARP is a strong reverse-proxy choice |
| Problem Details | `Microsoft.AspNetCore.Http.Results` / built-in services 🟢 | `Hellang.Middleware.ProblemDetails` 🟢 | Prefer standard error responses |
| Health Checks | `AspNetCore.HealthChecks.*` 🟢 | `Microsoft.Extensions.Diagnostics.HealthChecks` 🟢 | Use built-in checks plus ecosystem packages as needed |
| Request Decompression 🆕 | `Microsoft.AspNetCore.RequestDecompression` 🟢 | — | Useful when clients send compressed payloads |
| CORS | `Microsoft.AspNetCore.Cors` 🟢 | — | Built-in |
| Compression | `Microsoft.AspNetCore.ResponseCompression` 🟢 | — | Brotli is often the better default |

---

### 6.2 Application Layer (Use Cases / CQRS)

| Concern | ✅ Must-Have | 🔄 Alternatives | Notes |
|---|---|---|---|
| CQRS / Mediator | `MediatR` 🟢 | `Atherio-Ltd/Kommand` 🟢, `Wolverine` 🟢, `Brighter` 🟢 | MediatR is the familiar default; Wolverine is strong for performance-focused apps |
| Pipeline Behaviors | `MediatR` Behaviors 🟢 | Wolverine Middleware 🟢 | Good for validation, logging, caching, authorization |
| Object Mapping | `Mapster` 🟢 | `AutoMapper` 🟢 | Mapster is leaner; AutoMapper is widely recognized |
| Validation | `FluentValidation` 🟢 | `GuardClauses` 🟢 | Combine request validation with guard clauses in domain logic |
| Result Pattern | `Ardalis.Result` 🟢 | `ErrorOr` 🟢, `OneOf` 🟢, `LanguageExt` 🟢 | Avoid exceptions for normal control flow |
| Specification Pattern | `Ardalis.Specification` 🟢 | Built manually | Useful when queries need reuse and consistency |
| Feature Flags | `Microsoft.FeatureManagement` 🟢 | `LaunchDarkly` 🔴, `Unleash` 🟢 | Works well with configuration-driven rollout |
| AI Abstractions 🆕 | `Microsoft.Extensions.AI` 🟢 | `Semantic Kernel` 🟢 | Useful for model-agnostic chat and embedding scenarios |
| Background Jobs (App) | `MediatR` Notifications 🟢 | `Hangfire` 🟡, `Quartz.NET` 🟢 | Good for domain event fan-out |
| Workflow / Saga 🆕 | `Wolverine` Saga 🟢 | `MassTransit` Saga 🟢, `Dapr` 🟢 | Use when business flow spans services or time |

---

### 6.3 Domain Layer

| Concern | ✅ Must-Have | 🔄 Alternatives | Notes |
|---|---|---|---|
| Base Entity / Value Object | `Ardalis.SmartEnum` 🟢 | Custom base classes | Keep domain free from infrastructure concerns |
| Domain Events | `MediatR` `INotification` 🟢 | `DomainEvents` (custom) | Raise inside aggregate, dispatch at unit-of-work boundary |
| Guard Clauses | `Ardalis.GuardClauses` 🟢 | `CommunityToolkit.Diagnostics` 🟢 | Lightweight and readable input validation |
| Enumeration Pattern | `Ardalis.SmartEnum` 🟢 | `NetEscapades.EnumGenerators` 🟢 | Good for richer enum-like behavior |
| Money / Currency | `NMoneys` 🟢 | `Money.Net` 🟢, Custom Value Object | Useful for finance and pricing domains |
| Time Abstraction | `TimeProvider` (built-in) 🟢 | `NodaTime` 🟢 | Prefer `TimeProvider` broadly; use `NodaTime` for richer time-zone modeling |
| Primitive Obsession 🆕 | `StronglyTypedId` 🟢 | `Vogen` 🟢 | Great for domain-safe identifiers |
| Complex Types 🆕 | Built-in complex type support 🟢 | Owned entities | Better fit for true value objects |

---

### 6.4 Infrastructure Layer

#### Data Access / ORM

| Concern | ✅ Must-Have | 🔄 Alternatives | Notes |
|---|---|---|---|
| ORM (full) | `Microsoft.EntityFrameworkCore` 🟢 | `NHibernate` 🟢 | Default choice for most .NET applications |
| Micro ORM | `Dapper` 🟢 | `RepoDB` 🟢, `SqlKata` 🟢 | Best when query control matters more than abstraction |
| EF Core SQL Server | `Microsoft.EntityFrameworkCore.SqlServer` 🟢 | `Npgsql.EntityFrameworkCore.PostgreSQL` 🟢 | Use the provider matching your database |
| EF Core PostgreSQL | `Npgsql.EntityFrameworkCore.PostgreSQL` 🟢 | — | Strong option for PostgreSQL-first systems |
| EF Core MySQL | `Pomelo.EntityFrameworkCore.MySql` 🟢 | `MySql.EntityFrameworkCore` 🟢 | Pomelo is commonly preferred |
| EF Core SQLite | `Microsoft.EntityFrameworkCore.Sqlite` 🟢 | — | Good for tests, prototypes, and local apps |
| EF Core In-Memory | `Microsoft.EntityFrameworkCore.InMemory` 🟢 | `Testcontainers` 🟢 | Use only for tests; prefer real databases for query realism |
| Migrations | EF Core CLI 🟢 | `FluentMigrator` 🟢, `DbUp` 🟢 | Choose scripts when DBAs require stronger control |
| Connection Resiliency | EF Core execution strategy 🟢 | `Polly` 🟢 | Combine database retries with transport-level resilience |
| Repository / UoW | `Ardalis.Specification.EFCore` 🟢 | Custom implementation | Avoid generic repository patterns that hide useful ORM features |
| JSON Columns 🆕 | Built-in JSON mapping/query support 🟢 | — | Useful for semi-structured data inside relational stores |
| Complex Types 🆕 | Built-in complex type mapping 🟢 | Owned entities | Better match for value objects without identity |
| Commercial ORM | `LLBLGen Pro` 🔴 | `DevExpress XPO` 🔴, `linq2db` 🟢 | Use when legacy mapping or code generation is a bigger concern |
| NoSQL (Cosmos DB) | `Microsoft.Azure.Cosmos` 🟢 | EF Core provider, custom repository | Good for document and partition-based designs |
| NoSQL (MongoDB) | `MongoDB.Driver` 🟢 | `MongoDB.EntityFrameworkCore` 🟢 | Official driver is the safest default |

#### Caching

| Concern | ✅ Must-Have | 🔄 Alternatives | Notes |
|---|---|---|---|
| Distributed Cache (Redis) | `StackExchange.Redis` 🟢 | `Microsoft.Extensions.Caching.StackExchangeRedis` 🟢 | Strong default Redis client |
| In-Memory Cache | `Microsoft.Extensions.Caching.Memory` 🟢 | — | Built-in; use only for single-node/local cache scenarios |
| Hybrid Cache 🆕 | `Microsoft.Extensions.Caching.Hybrid` 🟢 | `FusionCache` 🟢 | Good for layered caching with stampede protection |
| Cache Abstraction | `FusionCache` 🟢 | `CacheManager` 🟢 | Helpful if you want richer caching semantics |
| Output Cache (Redis-backed) 🆕 | Output caching + distributed backing store 🟢 | — | Useful for high-read APIs |
| Commercial Cache | `NCache` 🔴 | `Redis Enterprise` 🔴 | Choose when clustering, support, or geo features matter |

#### Messaging / Event Bus

| Concern | ✅ Must-Have | 🔄 Alternatives | Notes |
|---|---|---|---|
| Message Bus (OSS) | `MassTransit` 🟢 | `Wolverine` 🟢, `Rebus` 🟢 | MassTransit is the broad ecosystem default |
| Message Bus (Commercial) | `NServiceBus` 🔴 | `MassTransit Pro` 🟡 | Consider for enterprise messaging governance |
| RabbitMQ Client | `RabbitMQ.Client` 🟢 (often via MassTransit) | `EasyNetQ` 🟢 | Prefer using a bus abstraction unless needs are simple |
| Azure Service Bus | `Azure.Messaging.ServiceBus` 🟢 | MassTransit transport | Official Azure SDK |
| Apache Kafka | `Confluent.Kafka` 🟡 | MassTransit Kafka transport 🟢 | Strong fit for streaming/event platforms |
| Outbox Pattern | `MassTransit Outbox` 🟢 | `Wolverine` Outbox 🟢, `CAP` 🟢 | Important for reliable message publishing |
| Event Sourcing | `Marten` 🟢 | `EventStoreDB` client 🟢, `Wolverine` 🟢 | Best when event history is central to the domain |
| Cloud Events 🆕 | `CloudNative.CloudEvents` 🟢 | — | Useful when standard event envelopes matter |

#### External HTTP / gRPC

| Concern | ✅ Must-Have | 🔄 Alternatives | Notes |
|---|---|---|---|
| HTTP Client | `IHttpClientFactory` (built-in) 🟢 | — | Always use the factory in long-lived apps |
| Typed HTTP Client | `Refit` 🟢 | `RestEase` 🟢, `Flurl.Http` 🟢 | Refit is simple and interface-driven |
| gRPC Client | `Grpc.Net.Client` 🟢 | — | Native gRPC client stack |
| gRPC Client Factory 🆕 | `Grpc.Net.ClientFactory` 🟢 | — | Good for DI-driven service clients |
| GraphQL Client | `StrawberryShake` 🟢 | `GraphQL.Client` 🟢 | Strong option for typed GraphQL consumption |
| GraphQL Server 🆕 | `HotChocolate` 🟢 | — | Popular choice for GraphQL APIs |
| OAuth / OIDC Client | `IdentityModel` 🟢 | `Duende.IdentityModel` 🟡 | Good for service-to-service token handling |
| HTTP Resilience 🆕 | `Microsoft.Extensions.Http.Resilience` 🟢 | `Polly` 🟢 | Prefer standardized resilience configuration |

#### File / Blob Storage

| Concern | ✅ Must-Have | 🔄 Alternatives | Notes |
|---|---|---|---|
| Azure Blob Storage | `Azure.Storage.Blobs` 🟢 | `AWSSDK.S3` 🟢 | Official Azure SDK; managed identity is preferable |
| File System Abstraction | `System.IO.Abstractions` 🟢 | — | Great for testability |
| Cloud Storage Abstraction | `Azure.Storage.Blobs` + custom interface 🟢 | `Stowage` 🟢 | Keep cloud API details out of application code |
| Local Dev Blob Storage 🆕 | `Azurite` 🟢 | Legacy emulators | Useful for local storage workflows |

#### Secrets & Configuration

| Concern | ✅ Must-Have | 🔄 Alternatives | Notes |
|---|---|---|---|
| Configuration | `Microsoft.Extensions.Configuration` 🟢 | — | Built-in; pair with strongly typed options |
| Options Validation 🆕 | `Microsoft.Extensions.Options.DataAnnotations` 🟢 | FluentValidation options validator | Good for fail-fast startup validation |
| Secrets (local dev) | `dotnet user-secrets` 🟢 | — | Never commit secrets |
| Secrets (production) | `Azure.Extensions.AspNetCore.Configuration.Secrets` 🟢 | `HashiCorp Vault` 🟢, `AWS Secrets Manager` 🟢 | Prefer a managed secret store |
| App Configuration | `Microsoft.Azure.AppConfiguration.AspNetCore` 🟢 | — | Useful for centralized config and feature flags |
| Strongly-typed Options | `Microsoft.Extensions.Options` 🟢 | `Scrutor` 🟢 | `IOptions<T>`, `IOptionsSnapshot<T>`, `IOptionsMonitor<T>` |

---

### 6.5 Cross-Cutting Concerns

#### Logging & Observability

| Concern | ✅ Must-Have | 🔄 Alternatives | Notes |
|---|---|---|---|
| Structured Logging | `Serilog` 🟢 | `NLog` 🟢, `Microsoft.Extensions.Logging` 🟢 | Serilog usually has the best sink ecosystem |
| Log Sinks (OSS) | `Serilog.Sinks.Console`, `Serilog.Sinks.File` 🟢 | `NLog` targets 🟢 | Prefer structured JSON in cloud-hosted systems |
| Log Source Generation 🆕 | `[LoggerMessage]` (built-in) 🟢 | Serilog message templates | Good for high-throughput logging paths |
| Log Aggregation (OSS) | `Seq` 🟡 | `Grafana Loki` 🟢, `ELK Stack` 🟢 | Choose based on ops maturity and hosting model |
| Log Aggregation (Comm.) | `Datadog` 🔴 | `Splunk` 🔴, `New Relic` 🔴, `Azure Monitor` 🟡 | Enterprise observability |
| Distributed Tracing | `OpenTelemetry.Extensions.Hosting` 🟢 | — | Vendor-neutral tracing standard |
| OTEL Exporters | `OpenTelemetry.Exporter.Otlp` 🟢 | `Azure.Monitor.OpenTelemetry.AspNetCore` 🟢 | OTLP keeps tooling portable |
| Metrics | `System.Diagnostics.Metrics` + OTEL 🟢 | `prometheus-net` 🟢 | Prefer the built-in meter APIs |
| Aspire Dashboard 🆕 | Aspire dashboard 🟢 | `Jaeger` 🟢, `Zipkin` 🟢 | Useful for local distributed app diagnostics |
| APM (Commercial) | `Application Insights` 🟡 | `Datadog APM` 🔴, `Dynatrace` 🔴 | Use when managed monitoring is preferred |
| HTTP Logging | `Microsoft.AspNetCore.HttpLogging` 🟢 | `Serilog.AspNetCore` 🟢 | Always redact sensitive data |

#### Authentication & Authorization

| Concern | ✅ Must-Have | 🔄 Alternatives | Notes |
|---|---|---|---|
| ASP.NET Core Identity | `Microsoft.AspNetCore.Identity.EntityFrameworkCore` 🟢 | — | Good default when the app owns users |
| JWT Bearer | `Microsoft.AspNetCore.Authentication.JwtBearer` 🟢 | — | Standard bearer token validation |
| OpenID Connect | `Microsoft.AspNetCore.Authentication.OpenIdConnect` 🟢 | — | Standard OIDC middleware |
| Identity Provider (OSS) | `OpenIddict` 🟢 | `Keycloak` 🟢 | OpenIddict fits embedded auth servers; Keycloak fits standalone auth |
| Identity Provider (Comm.) | `Duende IdentityServer` 🔴 | `Auth0` 🔴, `Okta` 🔴, `Entra External ID` 🟡 | Choose when support and hosted capabilities matter |
| Entra ID / Azure AD 🆕 | `Microsoft.Identity.Web` 🟢 | — | Recommended for Azure and Microsoft 365 integration |
| Policy-Based Authz | `Microsoft.AspNetCore.Authorization` 🟢 | — | Built-in and flexible |
| Fine-grained Authz | `Casbin.NET` 🟢 | `OPA` (Open Policy Agent) 🟢 | Useful for ABAC/RBAC beyond simple policies |
| CORS | `Microsoft.AspNetCore.Cors` 🟢 | — | Built-in |
| Data Protection | `Microsoft.AspNetCore.DataProtection` 🟢 | — | Important for cookies, tokens, and protected payloads |
| Passkeys / WebAuthn 🆕 | `Fido2NetLib` 🟢 | `SimpleWebAuthn` (JS) 🟢 | Good for passwordless auth |

#### Resilience

| Concern | ✅ Must-Have | 🔄 Alternatives | Notes |
|---|---|---|---|
| Resilience Pipelines | `Microsoft.Extensions.Http.Resilience` 🟢 | `Polly` 🟢 | Strong default for outbound HTTP |
| Retry / Circuit Breaker | `Polly` 🟢 | Simmy (chaos) 🟢 | Standard resilience toolbox |
| Hedging 🆕 | Built-in HTTP resilience hedging 🟢 | Polly hedge strategy | Useful only for latency-sensitive idempotent calls |
| Timeout | `Polly` Timeout Strategy 🟢 | `CancellationToken` patterns 🟢 | Always propagate cancellation |
| Chaos Engineering 🆕 | `Simmy` 🟢 | Other chaos tools | Best for staging or resilience testing |

#### Validation

| Concern | ✅ Must-Have | 🔄 Alternatives | Notes |
|---|---|---|---|
| Request Validation | `FluentValidation` 🟢 | `DataAnnotations` 🟢 | FluentValidation is preferred for non-trivial rules |
| MediatR Pipeline Validation | `FluentValidation` + `MediatR` Behavior 🟢 | `Wolverine` Middleware 🟢 | Validate before handlers execute |
| Guard Clauses | `Ardalis.GuardClauses` 🟢 | `CommunityToolkit.Diagnostics` 🟢 | Domain-level invariants and argument checks |
| Minimal API Validation 🆕 | `SharpGrip.FluentValidation.AutoValidation` 🟢 | `MinimalApis.Extensions` 🟢 | Helpful when Minimal APIs need automatic validator hookup |

#### Testing

| Concern | ✅ Must-Have | 🔄 Alternatives | Notes |
|---|---|---|---|
| Unit Test Framework | `xUnit` 🟢 | `NUnit` 🟢, `TUnit` 🟢 | xUnit remains the common OSS default |
| Mocking | `NSubstitute` 🟢 | `FakeItEasy` 🟢 | NSubstitute keeps syntax readable |
| Assertions | `FluentAssertions` 🟢 | `Shouldly` 🟢, `TUnit` Assertions 🟢 | FluentAssertions is expressive and readable |
| Test Data Builder | `Bogus` 🟢 | `AutoFixture` 🟢 | Bogus is strong for realistic sample data |
| Integration Testing | `Microsoft.AspNetCore.Mvc.Testing` 🟢 | — | `WebApplicationFactory<T>` is the default for ASP.NET Core integration tests |
| Test Containers | `Testcontainers` 🟢 | — | Prefer real infrastructure over in-memory fakes when behavior matters |
| Snapshot Testing | `Verify` 🟢 | `ApprovalTests` 🟢 | Good for serialized output and UI-adjacent checks |
| Architecture Tests | `NetArchTest.Rules` 🟢 | `ArchUnitNET` 🟢 | Enforce dependency boundaries in CI |
| Mutation Testing | `Stryker.NET` 🟢 | — | Helps measure test quality |
| Commercial Mocking | `Telerik JustMock` 🔴 | `TypeMock Isolator` 🔴 | Useful only when static/sealed/private mocking is unavoidable |
| Performance Testing | `BenchmarkDotNet` 🟢 | — | Best for microbenchmarking |
| Load Testing | `NBomber` 🟢 | `k6` 🟢, `Azure Load Testing` 🟡 | Choose based on whether test authoring should stay in .NET |
| Contract Testing 🆕 | `PactNet` 🟢 | — | Useful in distributed API ecosystems |

#### Testing Strategy

Align test types to architecture layers for maximum coverage with minimal overlap:

| Test Type | Target Layer | Scope | Tools | Guidance |
|---|---|---|---|---|
| **Unit** | Domain + Application | Pure logic, no I/O | xUnit, NSubstitute, FluentAssertions | Test domain invariants, value objects, handlers in isolation |
| **Integration** | Infrastructure + API | Real DB, HTTP pipeline | `WebApplicationFactory`, Testcontainers | Validate EF queries, API contracts, middleware behavior |
| **Contract** | Service boundaries | Consumer–provider pacts | PactNet | Use when services evolve independently |
| **Architecture** | All layers | Dependency rules | NetArchTest.Rules, ArchUnitNET | Enforce "Domain must not reference Infrastructure" in CI |
| **E2E** | Full system | Critical user flows only | Playwright, Selenium (sparingly) | Keep suite small; test the happy path and key failure modes |
| **Performance** | Hot paths | Micro-benchmarks, load | BenchmarkDotNet, NBomber | Benchmark before optimizing; load-test before release |

---

### 6.6 AI Architecture Layer 🆕

Modern .NET applications increasingly integrate AI capabilities. This layer covers the libraries and patterns needed to build intelligent features — from simple LLM calls to full RAG pipelines.

#### AI Abstractions & Orchestration

| Concern | ⭐ Recommended | 🔄 Alternatives | Notes |
|---|---|---|---|
| AI Abstractions | `Microsoft.Extensions.AI` 🟢 | — | Vendor-neutral interfaces for chat, embeddings, and tool calling |
| Orchestration / RAG | `Microsoft.SemanticKernel` 🟢 | `LangChain.NET` 🟢 | Semantic Kernel is the ecosystem default for .NET; supports planners, plugins, and RAG patterns |
| Prompt Management | `Semantic Kernel` prompt templates 🟢 | `Handlebars` templates, custom | Keep prompts versioned and testable |
| Agent Framework 🆕 | `Microsoft.SemanticKernel.Agents` 🟢 | `AutoGen` 🟢 | Multi-agent orchestration for complex workflows |

#### Model Providers

| Provider | Library | Notes |
|---|---|---|
| Azure OpenAI | `Microsoft.Extensions.AI.AzureAIInference` 🟢 | Enterprise-grade; managed identity support |
| OpenAI | `Microsoft.Extensions.AI.OpenAI` 🟢 | Direct API access |
| Ollama (local) | `Microsoft.Extensions.AI.Ollama` 🟢 | Good for local development and air-gapped environments |
| Azure AI Foundry 🆕 | `Azure.AI.Projects` 🟢 | Unified project-based access to models and agents |
| Hugging Face | `Microsoft.ML.OnnxRuntime` 🟢 | Run ONNX-exported models locally |

#### Vector Databases & Search

| Concern | ⭐ Recommended | 🔄 Alternatives | Notes |
|---|---|---|---|
| Managed Vector Search | `Azure AI Search` 🟡 | `Elasticsearch` 🟢 | Best for enterprise RAG with hybrid (vector + keyword) search |
| Dedicated Vector DB | `Qdrant` 🟢 | `Weaviate` 🟢, `Milvus` 🟢, `Chroma` 🟢 | Choose based on hosting model and scale needs |
| In-Process (Dev/Test) | `Microsoft.SemanticKernel.Connectors.InMemory` 🟢 | `SQLite` vector extensions | Good for prototyping; not for production |
| SK Connectors | `Microsoft.SemanticKernel.Connectors.AzureAISearch` 🟢 | Qdrant, Weaviate, Postgres connectors 🟢 | Plug vector stores into SK memory pipelines |

#### Document Processing & Embeddings

| Concern | ⭐ Recommended | 🔄 Alternatives | Notes |
|---|---|---|---|
| Document Intelligence | `Azure.AI.FormRecognizer` 🟡 | `IronOCR` 🔴, `Tesseract` 🟢 | OCR, form extraction, layout analysis |
| PDF Extraction | `PdfPig` 🟢 | `iText` 🔴, `QuestPDF` (write-only) 🟢 | For extracting text from PDFs for RAG ingestion |
| Text Chunking | `Semantic Kernel` text chunker 🟢 | Custom chunking strategies | Chunk by token count, paragraph, or semantic boundary |
| Embeddings Generation | `Microsoft.Extensions.AI` embedding API 🟢 | Direct model SDK calls | Use the abstraction layer for provider portability |

#### RAG Pattern Reference

```
┌──────────────┐    ┌──────────────┐    ┌──────────────────┐
│  Documents   │───▶│   Chunking   │───▶│   Embeddings     │
│  (PDF, HTML) │    │  + Cleaning  │    │   Generation     │
└──────────────┘    └──────────────┘    └────────┬─────────┘
                                                  │
                                                  ▼
                                        ┌──────────────────┐
                                        │   Vector Store   │
                                        │  (Qdrant / Azure │
                                        │   AI Search)     │
                                        └────────┬─────────┘
                                                  │
  ┌──────────────┐    ┌──────────────┐           │
  │  User Query  │───▶│   Embed      │───────────┘
  └──────────────┘    │   Query      │    ┌──────────────────┐
                      └──────────────┘───▶│  Retrieve Top-K  │
                                          │  + Rerank        │
                                          └────────┬─────────┘
                                                   │
                                                   ▼
                                         ┌──────────────────┐
                                         │  Augmented Prompt │
                                         │  → LLM → Answer  │
                                         └──────────────────┘
```

#### AI Operational Controls 🆕

AI features introduce unique operational risks. These controls are **mandatory** for any service calling LLM or embedding APIs in production.

##### Rate Limiting & Cost Management

| Control | Implementation | Enforcement |
|---|---|---|
| Per-user / per-tenant rate limits | `Microsoft.AspNetCore.RateLimiting` with token bucket policy | 🔒 MUST for user-facing AI endpoints |
| Token budget per request | Limit `max_tokens` in completion requests; set hard ceiling per call | 🔒 MUST |
| Daily/monthly cost ceiling | Azure APIM policies or custom middleware tracking token consumption | 🔒 MUST — alert at 80%, hard-stop at 100% budget |
| Cost attribution | Tag requests with `userId` / `tenantId` / `featureId` for cost breakdown | 📋 SHOULD |
| Model tier routing | Route low-complexity requests to cheaper models (e.g., GPT-4o-mini) | 📋 SHOULD when cost optimization matters |

##### Prompt & Version Management

| Control | Implementation | Enforcement |
|---|---|---|
| Prompt versioning | Store prompts in versioned files or config (not inline strings) | 🔒 MUST — prompts are code artifacts |
| Prompt templates | Use Semantic Kernel prompt templates or Handlebars | 📋 SHOULD |
| A/B prompt testing | Feature flags (`Microsoft.FeatureManagement`) to route between prompt versions | 📋 SHOULD for user-facing features |
| Prompt injection defense | Input sanitization + system prompt boundary enforcement | 🔒 MUST for all user-input-to-LLM paths |
| Output validation | Validate LLM responses against expected schema before returning to caller | 🔒 MUST for structured output (JSON mode) |

##### Resilience & Fallback

| Control | Implementation | Enforcement |
|---|---|---|
| Retry with exponential backoff | `Microsoft.Extensions.Http.Resilience` for model API calls | 🔒 MUST |
| Circuit breaker | Trip after consecutive 429 / 5xx responses from model API | 🔒 MUST |
| Graceful degradation | Return cached / static response when model is unavailable | 📋 SHOULD |
| Model failover | Configure secondary model endpoint (e.g., Azure OpenAI region B) | 📋 SHOULD for production-critical features |
| Timeout ceiling | Cap LLM calls at a hard timeout (e.g., 30s) with `CancellationToken` | 🔒 MUST |

##### Observability

| Control | Implementation | Enforcement |
|---|---|---|
| Token usage metrics | Emit custom OpenTelemetry metrics: `ai.tokens.prompt`, `ai.tokens.completion` | 🔒 MUST |
| Latency tracking | Trace span per LLM call with model name, token counts, and duration | 🔒 MUST |
| Cost dashboards | Aggregate token metrics into cost estimates per service / tenant | 📋 SHOULD |
| Content safety logging | Log flagged or filtered content (without PII) for audit | 📋 SHOULD where content moderation is applied |

---

## 7. Project-Type Specific Libraries

### 7.1 Blazor Web App (Unified)

| Layer | Concern | ✅ Must-Have | 🔄 Alternatives | Notes |
|---|---|---|---|---|
| Presentation | UI Component Library (OSS) | `MudBlazor` 🟢 | `Radzen.Blazor` 🟢, `Ant Design Blazor` 🟢 | MudBlazor is a strong default OSS option |
| Presentation | UI Component Library (Comm.) | `Telerik UI for Blazor` 🔴 | `Syncfusion Blazor` 🔴, `DevExpress Blazor` 🔴 | Commercial suites shine for grids and reporting-heavy UIs |
| Presentation | State Management | `Fluxor` 🟢 | `BlazorState` 🟢 | Useful for larger interactive apps |
| Presentation | Forms | `EditForm` + `DataAnnotationsValidator` (built-in) 🟢 | `FluentValidation.Blazor` 🟢 | Keep validation strategy consistent with backend rules |
| Presentation | Render Mode Control 🆕 | `@rendermode` directive (built-in) 🟢 | — | Choose server, client, or auto per component |
| Presentation | Streaming Rendering 🆕 | Built-in streaming rendering 🟢 | — | Improves perceived page-load performance |
| Infrastructure | Auth (WASM) | `Microsoft.AspNetCore.Components.WebAssembly.Authentication` 🟢 | — | For browser-based OIDC flows |
| Infrastructure | Auth (Server) | `Microsoft.AspNetCore.Identity.UI` 🟢 | — | Useful when server-side identity pages are acceptable |
| Cross-cut | JS Interop (typed) 🆕 | `Microsoft.JSInterop` (built-in) 🟢 | `Blazor.Extensions.Storage` 🟢 | Keep JS interop behind app-specific abstractions where possible |

### 7.2 Worker Service / Background Jobs

| Layer | Concern | ✅ Must-Have | 🔄 Alternatives | Notes |
|---|---|---|---|---|
| Application | Lifecycle 🆕 | `IHostedLifecycleService` (built-in) 🟢 | `IHostedService` 🟢 | Better lifecycle control for startup/shutdown workflows |
| Application | Scheduling (OSS) | `Quartz.NET` 🟢 | `Coravel` 🟢, `NCrontab` 🟢 | Quartz is stronger for recurring jobs and calendars |
| Application | Job Queue (OSS) | `Hangfire` 🟡 | `MassTransit` consumers 🟢 | Hangfire is useful for dashboard-driven background work |
| Application | Job Queue (Comm.) | `Hangfire Pro` 🔴 | — | Consider when advanced workflow features matter |
| Infrastructure | Messaging | `MassTransit` 🟢 | `NServiceBus` 🔴 | Strong fit for asynchronous worker-driven pipelines |
| Cross-cut | Health Check | `Microsoft.Extensions.Diagnostics.HealthChecks` 🟢 | — | Needed for readiness/liveness in orchestrated environments |
| Cross-cut | `TimeProvider` 🆕 | Built-in 🟢 | — | Makes schedule logic testable |

### 7.3 gRPC Service

| Layer | Concern | ✅ Must-Have | 🔄 Alternatives | Notes |
|---|---|---|---|---|
| Presentation | gRPC Framework | `Grpc.AspNetCore` 🟢 | — | Official .NET gRPC stack |
| Presentation | Protobuf Codegen | `Google.Protobuf` + `Grpc.Tools` 🟢 | — | Standard toolchain for contracts |
| Presentation | gRPC-JSON Transcoding | `Microsoft.AspNetCore.Grpc.JsonTranscoding` 🟢 | — | Good when one service must serve REST and gRPC |
| Presentation | gRPC Web | `Grpc.AspNetCore.Web` 🟢 | — | Needed for browser-facing gRPC scenarios |
| Presentation | gRPC Reflection | `Grpc.AspNetCore.Server.Reflection` 🟢 | — | Useful for tooling and local diagnostics |
| Cross-cut | Deadline / Cancellation | `CancellationToken` pattern (built-in) 🟢 | — | Treat deadlines as part of the contract |
| Cross-cut | Interceptors 🆕 | `Grpc.AspNetCore` interceptors (built-in) 🟢 | — | Useful for logging, auth, validation |

### 7.4 WPF / WinForms Desktop

| Layer | Concern | ✅ Must-Have | 🔄 Alternatives | Notes |
|---|---|---|---|---|
| Presentation | MVVM Framework | `CommunityToolkit.Mvvm` 🟢 | `Prism.Wpf` 🟢, `ReactiveUI` 🟢 | Toolkit is the simplest default |
| Presentation | UI Controls (Comm.) | `Telerik UI for WPF` 🔴 | `DevExpress WPF` 🔴, `Syncfusion` 🔴 | Useful for advanced desktop data grids and reporting |
| Presentation | DI Container | `Microsoft.Extensions.DependencyInjection` 🟢 | `Autofac` 🟢 | Generic Host works well in desktop startup |
| Presentation | Navigation | `Prism.Regions` 🟢 | `ReactiveUI.Routing` 🟢 | Useful in composite desktop UIs |
| Infrastructure | Local DB | `Microsoft.EntityFrameworkCore.Sqlite` 🟢 | `LiteDB` 🟢 | Good for embedded storage |
| Infrastructure | File Watch | `System.IO.FileSystemWatcher` 🟢 (built-in) | — | Built-in |
| Cross-cut | Logging | `Serilog.Sinks.File` 🟢 | `NLog` 🟢 | File logging is often enough for desktop apps |

### 7.5 Azure Functions (Isolated Worker)

| Layer | Concern | ✅ Must-Have | 🔄 Alternatives | Notes |
|---|---|---|---|---|
| Presentation | Function Host | `Microsoft.Azure.Functions.Worker` 🟢 | — | Recommended model for modern Functions development |
| Presentation | ASP.NET Core Integration 🆕 | `Microsoft.Azure.Functions.Worker.Extensions.Http.AspNetCore` 🟢 | — | Best option when HTTP functions need richer middleware behavior |
| Presentation | HTTP Trigger | `Microsoft.Azure.Functions.Worker.Extensions.Http` 🟢 | — | Good for lighter HTTP scenarios |
| Application | Validation | `FluentValidation` 🟢 | `DataAnnotations` 🟢 | Keep handler code thin |
| Infrastructure | Durable Functions | `Microsoft.Azure.Functions.Worker.Extensions.DurableTask` 🟢 | — | Good for orchestrations and long-running workflows |
| Infrastructure | Service Bus Trigger | `Microsoft.Azure.Functions.Worker.Extensions.ServiceBus` 🟢 | — | Messaging trigger integration |
| Infrastructure | Cosmos DB Trigger | `Microsoft.Azure.Functions.Worker.Extensions.CosmosDB` 🟢 | — | Change feed processing |
| Infrastructure | Blob Trigger | `Microsoft.Azure.Functions.Worker.Extensions.Storage.Blobs` 🟢 | — | File and event-driven processing |
| Cross-cut | Logging | `Serilog.Extensions.Logging` 🟢 | `Microsoft.Extensions.Logging` 🟢 | Prefer structured logs in serverless too |
| Cross-cut | Configuration | `Microsoft.Extensions.Configuration` + App Settings 🟢 | App Configuration integration | Environment variables stay the baseline |

### 7.6 MAUI (Cross-Platform)

| Layer | Concern | ✅ Must-Have | 🔄 Alternatives | Notes |
|---|---|---|---|---|
| Presentation | Shell Navigation | `Shell` (built-in MAUI) 🟢 | `Prism.Maui` 🟢 | Good default navigation model |
| Presentation | MVVM | `CommunityToolkit.Mvvm` 🟢 | `ReactiveUI` 🟢 | Toolkit keeps code simple |
| Presentation | UI Controls (Comm.) | `Telerik UI for MAUI` 🔴 | `Syncfusion MAUI` 🔴, `DevExpress MAUI` 🔴 | Commercial suites help when advanced UI controls are required |
| Presentation | HybridWebView 🆕 | `HybridWebView` (built-in MAUI) 🟢 | — | Useful for sharing web UI inside device apps |
| Infrastructure | Local DB | `sqlite-net-pcl` 🟢 | `Realm` 🟢, `LiteDB` 🟢 | Pick based on sync needs and app complexity |
| Infrastructure | Secure Storage | `Microsoft.Maui.Storage` (built-in) 🟢 | — | Platform-safe secret storage |
| Infrastructure | HTTP Client | `IHttpClientFactory` + `Refit` 🟢 | `RestSharp` 🟢 | Keep API consumption testable and typed |
| Infrastructure | Push Notifications | `Plugin.Firebase.CloudMessaging` 🟢 | Azure Notification Hubs | Choose based on cloud integration strategy |
| Cross-cut | Essentials | `Microsoft.Maui.Essentials` (built-in) 🟢 | — | Sensors, camera, geolocation, clipboard, and more |

### 7.7 Aspire (Cloud-Native Orchestration) 🆕

| Layer | Concern | ✅ Must-Have | 🔄 Alternatives | Notes |
|---|---|---|---|---|
| AppHost | Orchestration | `Aspire.Hosting` 🟢 | `docker-compose` 🟢 | Great for local multi-service orchestration |
| AppHost | Service Defaults | service defaults package/template 🟢 | Manual DI wiring | Auto-wires telemetry, health checks, and resilience |
| AppHost | Resource Provisioning | `Aspire.Hosting.Azure.*` 🟢 | other provider packages | Provision local/dev resources consistently |
| Service | Health Checks | `Microsoft.Extensions.Diagnostics.HealthChecks` 🟢 | — | Typically auto-registered through service defaults |
| Service | Service Discovery 🆕 | `Microsoft.Extensions.ServiceDiscovery` 🟢 | Consul 🟢, Eureka 🟢 | Useful for service-to-service addressing |
| Service | Telemetry Wiring | OpenTelemetry via service defaults 🟢 | — | Simplifies cross-service tracing and metrics |
| Dashboard | Dev Observability | Aspire dashboard 🟢 | `Jaeger` 🟢, `Zipkin` 🟢 | Great for local diagnostics |
| Deployment | Manifest | Aspire manifest generation 🟢 | — | Helpful bridge toward deployment tooling |

#### Aspire Guidance

| Scenario | Use Aspire? | Enforcement | Notes |
|---|---|---|---|
| Local multi-service development and testing | ✅ Yes | 📋 SHOULD for multi-service repos | Spin up all dependencies with `dotnet run` |
| Rapid onboarding — new devs spin up all dependencies | ✅ Yes | 📋 SHOULD | Reduces "works on my machine" friction |
| Consistent service defaults (telemetry, health, resilience) | ✅ Yes | 🔒 MUST use service defaults package | Prevents per-service wiring drift |
| Prototyping cloud-native topologies | ✅ Yes | 💡 MAY | Quick validation before committing to infra |
| Integration test orchestration | ✅ Yes | 📋 SHOULD | Replace complex docker-compose test setups |
| **Production orchestration** | ❌ **No** | 🔒 MUST NOT | Use Kubernetes, ACA, or App Service |
| **Multi-region / multi-cloud deployments** | ❌ **No** | 🔒 MUST NOT | Aspire has no production scheduling, mesh, or failover |
| **Fine-grained pod scheduling, service mesh** | ❌ **No** | 🔒 MUST NOT | Use Kubernetes operators and Istio/Linkerd |
| **CI/CD pipeline orchestration** | ❌ **No** | 🔒 MUST NOT | Aspire is dev-time only; use pipeline YAML |

#### Aspire Anti-Patterns

| Anti-Pattern | Risk | Correct Approach |
|---|---|---|
| Deploying Aspire AppHost to production | No scaling, no health recovery, no rolling updates | Use Aspire manifest → generate deployment artifacts for ACA / K8s |
| Hardcoding connection strings in AppHost | Secrets leak, environment-specific coupling | Use Aspire resource abstractions; resolve via configuration per environment |
| Skipping service defaults package | Each service wires telemetry differently | 🔒 MUST use shared service defaults project |
| Using Aspire for non-.NET services only | Adds orchestration overhead without benefit | Use `docker-compose` for pure non-.NET stacks |

> **Key takeaway:** Aspire excels at **developer inner-loop orchestration** and **service composition**. It is *not* a replacement for Kubernetes, Azure Container Apps, or your production deployment platform. Use it to simplify local development and let your CI/CD pipeline handle production orchestration.

---

## 8. Reference Architectures

### 8.1 Web API / Microservice — Clean Architecture + CQRS

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Presentation                                 │
│  Minimal API Endpoints / Controllers                                │
│  ── FluentValidation filter ── Auth ── Rate Limiting ──             │
└────────────────────────────┬────────────────────────────────────────┘
                             │  IMediator.Send(command/query)
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Application                                  │
│  Command / Query Handlers                                           │
│  Pipeline Behaviors: Validation → Logging → Caching → Auth          │
│  ── Mapster (DTO ↔ Entity) ── Ardalis.Result ──                     │
└──────────┬─────────────────────────────────┬────────────────────────┘
           │ Domain operations               │ Infrastructure calls
           ▼                                 ▼
┌──────────────────────┐      ┌────────────────────────────────────────┐
│       Domain         │      │           Infrastructure               │
│  Entities            │      │  EF Core (write) / Dapper (read)       │
│  Aggregates          │      │  MassTransit → RabbitMQ / Azure SB     │
│  Domain Events       │      │  Redis (HybridCache)                   │
│  Value Objects       │      │  Azure Blob Storage                    │
│  Specifications      │      │  External HTTP (Refit + Resilience)    │
└──────────────────────┘      └────────────────────────────────────────┘
           ▲                                 ▲
           └────── Both wired by DI ─────────┘
           ▲
┌──────────────────────────────────────────────────────────────────────┐
│                     Cross-Cutting                                    │
│  Serilog · OpenTelemetry · Polly · HealthChecks · Aspire defaults    │
└──────────────────────────────────────────────────────────────────────┘
```

### 8.2 Microservice — Event-Driven with Outbox

```
  ┌────────────┐         ┌────────────┐
  │  Service A  │         │  Service B  │
  │  (API)      │         │  (Worker)   │
  └──────┬─────┘         └──────┬──────┘
         │                       ▲
         │ Command               │ Consume
         ▼                       │
  ┌──────────────┐        ┌──────────────┐
  │  MediatR     │        │  MassTransit │
  │  Handler     │        │  Consumer    │
  └──────┬───────┘        └──────────────┘
         │                       ▲
         │ Save aggregate        │ Publish
         │ + outbox message      │
         ▼                       │
  ┌──────────────┐        ┌──────────────┐
  │  EF Core     │──────▶ │  MassTransit │
  │  DbContext   │ outbox  │  Outbox      │
  │  (SQL)       │ sweep   │  → Broker    │
  └──────────────┘        └──────────────┘
                                 │
                          ┌──────▼──────┐
                          │  RabbitMQ / │
                          │  Azure SB   │
                          └─────────────┘
```

> **Why Outbox?** Writing to the database and publishing to the broker in a single transaction guarantees at-least-once delivery without distributed transactions.

### 8.3 Blazor Web App — Unified Render Modes

```
  ┌─────────────────────────────────────────────────────┐
  │                  Blazor Web App                      │
  │                                                     │
  │   ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
  │   │ Static   │  │ Server   │  │ WebAssembly      │ │
  │   │ SSR      │  │ (SignalR)│  │ (Browser)        │ │
  │   │ @render  │  │ @render  │  │ @rendermode      │ │
  │   │ mode     │  │ mode     │  │ InteractiveWasm  │ │
  │   │ None     │  │ Server   │  │                  │ │
  │   └────┬─────┘  └────┬─────┘  └────────┬─────────┘ │
  │        │              │                  │           │
  │        └──────────────┼──────────────────┘           │
  │                       ▼                              │
  │              Shared Services Layer                   │
  │         (DI, Auth, State, API Clients)               │
  └─────────────────────────────────────────────────────┘
```

### 8.4 AI-Augmented Service — RAG Pattern

```
  ┌──────────────────────────────────────────────────────────┐
  │                    Ingestion Pipeline                     │
  │                                                          │
  │  Documents → Azure Doc Intelligence → Chunking           │
  │                                        ↓                 │
  │                              Embedding (Azure OpenAI)    │
  │                                        ↓                 │
  │                              Vector Store (AI Search)    │
  └──────────────────────────────────────────────────────────┘

  ┌──────────────────────────────────────────────────────────┐
  │                     Query Pipeline                       │
  │                                                          │
  │  User Query → Embed Query → Vector Search (Top-K)        │
  │                                    ↓                     │
  │                           Rerank + Filter                │
  │                                    ↓                     │
  │                     Augmented Prompt → LLM → Response     │
  │                                                          │
  │  Orchestrated by: Semantic Kernel (plugins + memory)      │
  └──────────────────────────────────────────────────────────┘
```

### 8.5 Canonical Microservice Blueprint (Gold Standard)

This is the **concrete, enforceable reference** for a production microservice. Every new service MUST align to this blueprint unless an ADR justifies deviation.

#### System Topology

```
                        ┌─────────────────┐
                        │   API Gateway   │
                        │   (YARP / APIM) │
                        └────────┬────────┘
                                 │ HTTPS + JWT
        ┌────────────────────────┼────────────────────────┐
        ▼                        ▼                        ▼
  ┌───────────┐          ┌───────────┐          ┌───────────┐
  │ Order API │          │ Inventory │          │ Notification│
  │ (Minimal  │          │ Service   │          │ Worker      │
  │  API)     │          │ (Minimal  │          │ (Background)│
  └─────┬─────┘          │  API)     │          └──────┬──────┘
        │                └─────┬─────┘                 │
        │                      │                       │
        ▼                      ▼                       ▼
  ┌───────────┐          ┌───────────┐          ┌───────────┐
  │ SQL Server│          │ SQL Server│          │  SendGrid  │
  │ (own DB)  │          │ (own DB)  │          │  / SMTP    │
  └───────────┘          └───────────┘          └───────────┘
        │                      │                       ▲
        └──────────┬───────────┘                       │
                   ▼                                   │
            ┌─────────────┐                            │
            │  Azure SB / │ ──── Events ──────────────┘
            │  RabbitMQ   │
            └─────────────┘
                   │
            ┌──────▼──────┐
            │   Redis     │
            │ (Shared     │
            │  Cache)     │
            └─────────────┘
```

#### Per-Service Internal Structure

```
OrderService/
│
├── src/
│   ├── Order.Api/                     ← Presentation (host)
│   │   ├── Endpoints/                 ← Minimal API endpoint classes
│   │   ├── Filters/                   ← Endpoint filters (validation, auth)
│   │   ├── Middleware/                ← Custom middleware
│   │   ├── Program.cs                ← Composition root
│   │   └── appsettings.json
│   │
│   ├── Order.Application/            ← Application layer
│   │   ├── Commands/                  ← Command handlers (write)
│   │   ├── Queries/                   ← Query handlers (read)
│   │   ├── Behaviors/                 ← MediatR pipeline behaviors
│   │   ├── DTOs/                      ← Request/Response models
│   │   ├── Interfaces/                ← Port interfaces
│   │   └── Mappings/                  ← Mapster config
│   │
│   ├── Order.Domain/                  ← Domain layer (zero dependencies)
│   │   ├── Entities/                  ← Aggregate roots and entities
│   │   ├── ValueObjects/              ← Strongly-typed IDs, Money, etc.
│   │   ├── Events/                    ← Domain events
│   │   ├── Enums/                     ← Smart enums
│   │   ├── Specifications/           ← Query specifications
│   │   └── Exceptions/               ← Domain-specific exceptions
│   │
│   └── Order.Infrastructure/         ← Infrastructure layer
│       ├── Persistence/               ← DbContext, configurations, migrations
│       ├── Repositories/              ← Specification-based repositories
│       ├── Messaging/                 ← MassTransit consumers/publishers
│       ├── Caching/                   ← HybridCache implementations
│       ├── ExternalServices/          ← Refit clients + resilience
│       └── DependencyInjection.cs    ← Infrastructure DI registration
│
├── tests/
│   ├── Order.UnitTests/              ← Domain + Application tests
│   ├── Order.IntegrationTests/       ← API + DB tests (Testcontainers)
│   └── Order.ArchitectureTests/      ← Dependency rule enforcement
│
├── Dockerfile
├── Directory.Packages.props          ← Central Package Management
└── Order.sln
```

#### Component Wiring (What Runs Where)

| Component | Technology | Enforcement |
|---|---|---|
| HTTP host | Minimal API + `TypedResults` | 🔒 MUST |
| Request → Handler | MediatR `IMediator.Send()` | 📋 SHOULD |
| Validation | FluentValidation pipeline behavior | 🔒 MUST for all external input |
| Write path | EF Core + `ReadCommitted` transactions | 🔒 MUST |
| Read path | Dapper or EF Core projections | 📋 SHOULD use Dapper for complex reads |
| Cross-service messaging | MassTransit + Outbox | 🔒 MUST for all async integration |
| Caching | HybridCache (L1 in-memory + L2 Redis) | 📋 SHOULD for read-heavy endpoints |
| Auth | JWT Bearer + Entra ID policies | 🔒 MUST |
| Structured logging | Serilog → OTLP | 🔒 MUST |
| Distributed tracing | OpenTelemetry | 🔒 MUST |
| Health checks | `/health/live` + `/health/ready` | 🔒 MUST |
| API docs | Built-in OpenAPI + Scalar UI | 📋 SHOULD |
| Architecture tests | NetArchTest.Rules in CI | 🔒 MUST |

---

## 9. Quick OSS vs Commercial Decision Matrix

| Library Category | OSS Choice | Commercial Choice | Choose Commercial When... |
|---|---|---|---|
| ORM | EF Core, Dapper | LLBLGen Pro, DevExpress XPO | Legacy schema mapping, advanced codegen, EF Core not viable |
| Identity / SSO | OpenIddict, Keycloak | Duende IdentityServer, Auth0, Okta, Entra External ID | SLA required, managed infra, multi-tenant B2C |
| Messaging | MassTransit, Wolverine | NServiceBus | Saga management, deferred send, guaranteed delivery SLA |
| UI Components | MudBlazor, Radzen | Telerik, Syncfusion, DevExpress | Complex grids, PDF/Excel export, licensed support |
| Mocking | NSubstitute, FakeItEasy | JustMock, TypeMock | Need to mock sealed/static/private without refactoring |
| Caching | HybridCache, FusionCache | NCache, Redis Enterprise | Cluster management, geo-replication, enterprise support |
| Observability | Serilog + OpenTelemetry + dashboard tools | Datadog, Dynatrace, Splunk | Unified APM + alerting + support contract in production |
| Background Jobs | Hangfire, Quartz.NET | Hangfire Pro | Batches, continuations, distributed lock |
| Reporting | FastReport.Core, RDLC | FastReport Enterprise, Crystal Reports, SSRS | Complex pixel-perfect reports, designer tooling |
| PDF Generation | `QuestPDF` 🟢 | iText / Aspose.PDF 🔴 | Legal/medical forms, AGPL-restricted environments |
| AI / LLM Integration 🆕 | `Microsoft.Extensions.AI` 🟢, `Semantic Kernel` 🟢 | Azure OpenAI 🟡, GitHub Models | Multi-model abstraction and hosted model options |
| Cloud-Native Dev 🆕 | Aspire 🟢 | — | OSS option is usually sufficient |

---

## 10. Essential NuGet Package Groups (Copy-Paste Reference)

### 10.1 Web API — Baseline
```xml
<PropertyGroup>
  <TargetFramework>{target-framework}</TargetFramework>
  <Nullable>enable</Nullable>
  <ImplicitUsings>enable</ImplicitUsings>
</PropertyGroup>

<!-- OpenAPI + Versioning -->
<PackageReference Include="Microsoft.AspNetCore.OpenApi" />
<PackageReference Include="Scalar.AspNetCore" />
<PackageReference Include="Asp.Versioning.Http" />

<!-- CQRS + Validation -->
<PackageReference Include="MediatR" />
<PackageReference Include="FluentValidation.DependencyInjectionExtensions" />

<!-- Mapping -->
<PackageReference Include="Mapster" />
<PackageReference Include="Mapster.DependencyInjection" />

<!-- EF Core -->
<PackageReference Include="Microsoft.EntityFrameworkCore.SqlServer" />
<PackageReference Include="Microsoft.EntityFrameworkCore.Tools" />

<!-- Logging -->
<PackageReference Include="Serilog.AspNetCore" />
<PackageReference Include="Serilog.Sinks.Console" />
<PackageReference Include="Serilog.Sinks.OpenTelemetry" />

<!-- OpenTelemetry -->
<PackageReference Include="OpenTelemetry.Extensions.Hosting" />
<PackageReference Include="OpenTelemetry.Instrumentation.AspNetCore" />
<PackageReference Include="OpenTelemetry.Exporter.Otlp" />

<!-- Resilience -->
<PackageReference Include="Microsoft.Extensions.Http.Resilience" />

<!-- HybridCache -->
<PackageReference Include="Microsoft.Extensions.Caching.Hybrid" />

<!-- Health Checks -->
<PackageReference Include="AspNetCore.HealthChecks.UI.Client" />
<PackageReference Include="AspNetCore.HealthChecks.SqlServer" />

<!-- Result + Guard -->
<PackageReference Include="Ardalis.Result" />
<PackageReference Include="Ardalis.GuardClauses" />

<!-- Strongly-typed IDs -->
<PackageReference Include="StronglyTypedId" />
```

### 10.2 Aspire AppHost
```xml
<PropertyGroup>
  <TargetFramework>{target-framework}</TargetFramework>
  <IsAspireHost>true</IsAspireHost>
</PropertyGroup>

<PackageReference Include="Aspire.Hosting.AppHost" />
<!-- Add resource packages as needed -->
<PackageReference Include="Aspire.Hosting.Azure.ServiceBus" />
<PackageReference Include="Aspire.Hosting.Redis" />
<PackageReference Include="Aspire.Hosting.SqlServer" />
```

### 10.3 Service Defaults (shared across services)
```xml
<PackageReference Include="Microsoft.Extensions.Http.Resilience" />
<PackageReference Include="Microsoft.Extensions.ServiceDiscovery" />
<PackageReference Include="OpenTelemetry.Extensions.Hosting" />
<PackageReference Include="OpenTelemetry.Instrumentation.AspNetCore" />
<PackageReference Include="OpenTelemetry.Instrumentation.Http" />
<PackageReference Include="OpenTelemetry.Instrumentation.Runtime" />
```

### 10.4 Testing — Baseline
```xml
<PackageReference Include="xunit" />
<PackageReference Include="xunit.runner.visualstudio" />
<PackageReference Include="Microsoft.NET.Test.Sdk" />

<!-- Mocking + Assertions -->
<PackageReference Include="NSubstitute" />
<PackageReference Include="FluentAssertions" />
<PackageReference Include="Bogus" />

<!-- Integration + Containers -->
<PackageReference Include="Microsoft.AspNetCore.Mvc.Testing" />
<PackageReference Include="Testcontainers.MsSql" />
<PackageReference Include="Testcontainers.Redis" />

<!-- Architecture + Snapshot -->
<PackageReference Include="NetArchTest.Rules" />
<PackageReference Include="Verify.Xunit" />

<!-- Time testing -->
<PackageReference Include="Microsoft.Extensions.TimeProvider.Testing" />
```

### 10.5 AI Integration
```xml
<!-- Abstractions -->
<PackageReference Include="Microsoft.Extensions.AI" />
<PackageReference Include="Microsoft.Extensions.AI.Abstractions" />

<!-- Provider: Azure OpenAI -->
<PackageReference Include="Microsoft.Extensions.AI.AzureAIInference" />
<!-- Provider: OpenAI -->
<PackageReference Include="Microsoft.Extensions.AI.OpenAI" />
<!-- Provider: Ollama (local) -->
<PackageReference Include="Microsoft.Extensions.AI.Ollama" />

<!-- Semantic Kernel (orchestration + RAG + plugins) -->
<PackageReference Include="Microsoft.SemanticKernel" />

<!-- Vector DB Clients -->
<PackageReference Include="Microsoft.SemanticKernel.Connectors.AzureAISearch" />
<PackageReference Include="Qdrant.Client" />

<!-- Document Processing -->
<PackageReference Include="Azure.AI.FormRecognizer" />
```

---

## 11. Versioning Strategy

| Principle | Guidance |
|---|---|
| **Target Framework** | Align with the current LTS .NET release for production workloads; use STS releases only for non-critical services or to pilot new features |
| **Built-in over External** | Prefer platform features (e.g., `HybridCache`, `TypedResults`, `Microsoft.Extensions.AI`) over external packages when the built-in capability meets requirements |
| **NuGet Review Cadence** | Review and update NuGet dependencies quarterly; check for security advisories, deprecations, and breaking changes |
| **Lock Files** | Enable `RestorePackagesWithLockFile` in CI to ensure reproducible builds |
| **Dependency Governance** | Use `Directory.Packages.props` (Central Package Management) to enforce consistent versions across all projects in a solution |
| **Preview Packages** | Avoid preview packages in production; use them only in spikes or prototyping projects |

---

## 12. 🔒 Solution & Folder Structure Standard

All services **MUST** follow a consistent solution structure. This is enforced via the starter template (Section 13) and validated in architecture reviews.

### 12.1 Standard Solution Layout

```
{ServiceName}/
│
├── src/
│   ├── {ServiceName}.Api/                  ← Host / Presentation layer
│   │   ├── Endpoints/                      ← One file per feature area
│   │   ├── Filters/                        ← Endpoint filters
│   │   ├── Middleware/                      ← Custom middleware
│   │   ├── Program.cs                      ← Composition root (DI, pipeline)
│   │   ├── appsettings.json
│   │   └── Dockerfile
│   │
│   ├── {ServiceName}.Application/          ← Use cases / CQRS
│   │   ├── Commands/{Feature}/             ← Command + Handler + Validator
│   │   ├── Queries/{Feature}/              ← Query + Handler + Validator
│   │   ├── Behaviors/                      ← Pipeline behaviors (validation, logging)
│   │   ├── DTOs/                           ← Request/Response models
│   │   ├── Interfaces/                     ← Port interfaces (IRepository, IEmailService)
│   │   └── Mappings/                       ← Mapster type adapter configs
│   │
│   ├── {ServiceName}.Domain/              ← Pure domain (ZERO external references)
│   │   ├── Entities/                       ← Aggregate roots + child entities
│   │   ├── ValueObjects/                   ← Strongly-typed IDs, Money, Address
│   │   ├── Events/                         ← Domain events (INotification)
│   │   ├── Enums/                          ← SmartEnum types
│   │   ├── Specifications/                ← Ardalis.Specification queries
│   │   └── Exceptions/                    ← Domain-specific exception types
│   │
│   └── {ServiceName}.Infrastructure/      ← External concerns
│       ├── Persistence/
│       │   ├── {ServiceName}DbContext.cs
│       │   ├── Configurations/             ← EF Core entity configurations
│       │   └── Migrations/
│       ├── Repositories/                   ← Specification-based implementations
│       ├── Messaging/                      ← MassTransit consumers + publishers
│       ├── Caching/                        ← Cache implementations
│       ├── ExternalServices/               ← Typed HTTP clients (Refit)
│       └── DependencyInjection.cs         ← Single DI entry point
│
├── tests/
│   ├── {ServiceName}.UnitTests/           ← Domain + Application (no I/O)
│   ├── {ServiceName}.IntegrationTests/    ← API pipeline + real DB
│   └── {ServiceName}.ArchitectureTests/   ← Dependency rule enforcement
│
├── Directory.Build.props                   ← Shared build settings
├── Directory.Packages.props                ← Central Package Management (🔒 MUST)
├── .editorconfig                           ← Code style rules
├── {ServiceName}.sln
└── README.md
```

### 12.2 Naming Conventions

| Element | Convention | Example | Enforcement |
|---|---|---|---|
| Solution | `{ServiceName}.sln` | `OrderService.sln` | 🔒 MUST |
| Projects | `{ServiceName}.{Layer}` | `OrderService.Domain` | 🔒 MUST |
| Endpoints | `{Feature}Endpoints.cs` | `OrderEndpoints.cs` | 📋 SHOULD |
| Commands | `{Verb}{Noun}Command.cs` | `CreateOrderCommand.cs` | 📋 SHOULD |
| Queries | `Get{Noun}Query.cs` | `GetOrderByIdQuery.cs` | 📋 SHOULD |
| Handlers | `{Command/Query}Handler.cs` | `CreateOrderCommandHandler.cs` | 📋 SHOULD |
| Validators | `{Command/Query}Validator.cs` | `CreateOrderCommandValidator.cs` | 📋 SHOULD |
| EF Configurations | `{Entity}Configuration.cs` | `OrderConfiguration.cs` | 📋 SHOULD |

### 12.3 Dependency Rules (🔒 CI-Enforced)

These rules are validated by `NetArchTest.Rules` in the `ArchitectureTests` project. Build **MUST** fail if violated.

```
Domain         →  (no project references)
Application    →  Domain
Infrastructure →  Application, Domain
Api            →  Application, Infrastructure (for DI registration only)
```

| Rule | Description |
|---|---|
| Domain MUST NOT reference Application | Domain is self-contained |
| Domain MUST NOT reference Infrastructure | No ORM, no HTTP, no messaging in domain |
| Application MUST NOT reference Infrastructure | Depend on interfaces, not implementations |
| Api MUST NOT contain business logic | Endpoints delegate to MediatR handlers |
| Infrastructure MUST NOT expose EF `DbContext` to Api | Use repository interfaces |

### 12.4 Multi-Service Solution (Aspire-Orchestrated)

For systems with multiple services sharing an Aspire AppHost:

```
{SystemName}/
│
├── src/
│   ├── {SystemName}.AppHost/              ← Aspire orchestrator
│   ├── {SystemName}.ServiceDefaults/      ← Shared telemetry, health, resilience
│   │
│   ├── OrderService/                      ← Full service structure (12.1)
│   │   ├── Order.Api/
│   │   ├── Order.Application/
│   │   ├── Order.Domain/
│   │   └── Order.Infrastructure/
│   │
│   ├── InventoryService/                  ← Full service structure (12.1)
│   │   ├── Inventory.Api/
│   │   ├── Inventory.Application/
│   │   ├── Inventory.Domain/
│   │   └── Inventory.Infrastructure/
│   │
│   └── Shared/
│       ├── {SystemName}.Contracts/        ← Shared message contracts only
│       └── {SystemName}.BuildingBlocks/   ← Shared base classes (if any)
│
├── tests/
│   ├── OrderService.UnitTests/
│   ├── OrderService.IntegrationTests/
│   ├── InventoryService.UnitTests/
│   └── InventoryService.IntegrationTests/
│
├── Directory.Build.props
├── Directory.Packages.props
└── {SystemName}.sln
```

> **Rule:** Services **MUST NOT** share database schemas. The only shared project allowed is `Contracts` (message/event DTOs) and optional `BuildingBlocks` (abstract base classes, no business logic).

---

## 13. 🚀 Golden Path — Starter Template

A standards document alone is insufficient. Every team **MUST** bootstrap new services from the official starter template.

### 13.1 Template Requirements

The organization **MUST** maintain a GitHub template repository with the following pre-configured:

| Concern | What's Pre-Wired | Enforcement |
|---|---|---|
| **Solution structure** | Section 12 layout with all four layers | 🔒 MUST |
| **Logging** | Serilog → Console + OTLP sink, structured JSON | 🔒 MUST |
| **Distributed tracing** | OpenTelemetry with ASP.NET Core + HTTP + EF Core instrumentation | 🔒 MUST |
| **Health checks** | `/health/live` (liveness) + `/health/ready` (readiness + DB) | 🔒 MUST |
| **Auth** | JWT Bearer middleware with Entra ID configuration | 🔒 MUST |
| **Validation** | FluentValidation + MediatR pipeline behavior | 🔒 MUST |
| **Error handling** | Global exception handler → ProblemDetails (RFC 9457) | 🔒 MUST |
| **API docs** | Built-in OpenAPI + Scalar UI | 📋 SHOULD |
| **EF Core** | DbContext with `ReadCommitted` transaction isolation, execution strategy | 🔒 MUST |
| **Architecture tests** | NetArchTest.Rules project enforcing Section 12.3 dependency rules | 🔒 MUST |
| **Docker** | Multi-stage Dockerfile | 📋 SHOULD |
| **CI pipeline** | GitHub Actions / Azure Pipelines template (build → test → publish) | 📋 SHOULD |
| **Central packages** | `Directory.Packages.props` with approved package versions | 🔒 MUST |
| **EditorConfig** | `.editorconfig` with org coding style | 📋 SHOULD |

### 13.2 Template Usage

```bash
# Option A: GitHub template repo
# Click "Use this template" → Create new repo

# Option B: dotnet new custom template
dotnet new install CompanyName.ServiceTemplate
dotnet new company-service -n OrderService --output src/OrderService

# Option C: Aspire-based multi-service
dotnet new install CompanyName.AspireTemplate
dotnet new company-aspire -n ECommerce --output src/ECommerce
```

### 13.3 Template Governance

| Rule | Description |
|---|---|
| 🔒 All new services MUST use the template | No hand-rolled solutions |
| 📋 Template SHOULD be updated quarterly | Align with NuGet dependency reviews |
| 🔒 Template changes MUST go through architecture review | Prevents drift from standards |
| 📋 Existing services SHOULD converge toward template structure | As part of regular maintenance, not big-bang rewrites |

> **Anti-pattern:** Creating a service from `dotnet new webapi` and manually adding packages. This guarantees inconsistency across teams.

---

## 14. 📏 Non-Functional Requirements (NFRs)

Every service **MUST** meet these baseline NFRs. Teams may define stricter targets per service via their service-level objectives (SLOs), but these are the organizational floor.

### 14.1 Performance

| Metric | Target | Enforcement | Measurement |
|---|---|---|---|
| API response time (P50) | < 100ms | 📋 SHOULD | OpenTelemetry latency histograms |
| API response time (P95) | < 300ms | 🔒 MUST | OpenTelemetry latency histograms |
| API response time (P99) | < 1,000ms | 🔒 MUST | OpenTelemetry latency histograms |
| Startup time (cold) | < 10s | 📋 SHOULD | Health check readiness probe timing |
| Database query time (P95) | < 50ms | 📋 SHOULD | EF Core / Dapper instrumentation |
| AI/LLM call latency (P95) | < 5,000ms | 📋 SHOULD — varies by model | Custom OTEL span on model calls |

### 14.2 Availability & Reliability

| Metric | Target | Enforcement | Notes |
|---|---|---|---|
| Service availability (SLO) | ≥ 99.9% (8.76h downtime/year) | 🔒 MUST for Tier-1 services | Measured via health check uptime |
| Service availability (SLO) | ≥ 99.5% for Tier-2 services | 📋 SHOULD | Internal / non-revenue services |
| Error rate (5xx) | < 0.1% of total requests | 🔒 MUST | OpenTelemetry metrics + alerting |
| Graceful shutdown | Drain in-flight requests within 30s | 🔒 MUST | `IHostedLifecycleService` / `IHostApplicationLifetime` |
| Zero-downtime deployments | Rolling update or blue-green | 🔒 MUST for Tier-1 services | Container orchestration strategy |

### 14.3 Scalability

| Requirement | Target | Enforcement | Notes |
|---|---|---|---|
| Horizontal scaling | All services MUST support ≥2 replicas | 🔒 MUST | No in-memory state that prevents scale-out |
| Stateless design | No sticky sessions, no local file state | 🔒 MUST | Use Redis / external storage for state |
| Database connection pooling | Max pool configured per replica count | 🔒 MUST | Prevent connection exhaustion under scale |
| Message consumer scaling | Competing consumers with idempotent handlers | 🔒 MUST for message-driven services | MassTransit consumer concurrency |

### 14.4 Security Baselines

| Requirement | Standard | Enforcement | Notes |
|---|---|---|---|
| Transport security | TLS 1.2+ for all traffic | 🔒 MUST | No plaintext HTTP in production |
| Authentication | All endpoints authenticated (except health checks) | 🔒 MUST | JWT Bearer + Entra ID |
| Authorization | Policy-based authorization on every endpoint | 🔒 MUST | Minimum: role or scope claim check |
| Secrets management | No secrets in code, config files, or environment variables | 🔒 MUST | Azure Key Vault or equivalent managed store |
| Dependency scanning | `dotnet list package --vulnerable` in CI | 🔒 MUST | Block build on known critical CVEs |
| OWASP Top 10 | Address all applicable categories | 🔒 MUST | Input validation, output encoding, CSRF, etc. |
| Data protection | PII encrypted at rest and in transit | 🔒 MUST | `DataProtection` API for app-level encryption |
| CORS | Explicit allow-list; no wildcard origins in production | 🔒 MUST | `AllowAnyOrigin()` is forbidden |

### 14.5 Observability Baselines

| Requirement | Standard | Enforcement | Notes |
|---|---|---|---|
| Structured logging | JSON format, correlation IDs on every log entry | 🔒 MUST | Serilog + `Activity.Current.TraceId` |
| Log levels | `Information` default; `Warning`+ for production noise reduction | 📋 SHOULD | Configurable via App Configuration |
| Distributed tracing | Every inbound request creates a trace span | 🔒 MUST | OpenTelemetry auto-instrumentation |
| Custom metrics | Business metrics (orders created, payments processed) | 📋 SHOULD | `System.Diagnostics.Metrics` |
| Health endpoints | `/health/live` (liveness) + `/health/ready` (readiness) | 🔒 MUST | Kubernetes / ACA probe integration |
| Alerting | P95 latency > threshold, error rate spike, health check failure | 🔒 MUST for Tier-1 | Azure Monitor / Grafana alerting |

### 14.6 Cost Constraints

| Requirement | Guidance | Enforcement |
|---|---|---|
| Resource right-sizing | Review CPU/memory utilization quarterly; scale down idle resources | 📋 SHOULD |
| AI token budgets | Per-service monthly token ceiling with alerting at 80% | 🔒 MUST for AI-enabled services |
| Cache hit ratio | Target ≥ 85% for cached endpoints; investigate misses below 70% | 📋 SHOULD |
| Database tier | Use elastic / serverless tiers for dev/test; reserved for production | 📋 SHOULD |

### 14.7 Service Tier Classification

Not all services have equal criticality. Classify each service to determine which NFR targets apply:

| Tier | Definition | Availability Target | Performance (P95) | Examples |
|---|---|---|---|---|
| **Tier-1 (Critical)** | Revenue-impacting, customer-facing | ≥ 99.9% | < 300ms | Order API, Payment Service, Auth Gateway |
| **Tier-2 (Standard)** | Important but not revenue-blocking | ≥ 99.5% | < 500ms | Inventory Service, Notification Worker |
| **Tier-3 (Internal)** | Back-office, admin, dev tooling | ≥ 99.0% | < 1,000ms | Reporting Service, Admin Dashboard |

> **Rule:** Every service **MUST** declare its tier in the service README and ADR. Tier classification drives SLO targets, alerting thresholds, and deployment strategy.

---

*Updated: April 2026 | This document intentionally stays generic inside the main content. Resolve exact runtime, SDK, and package versions from your target solution, template, and NuGet feed.*
