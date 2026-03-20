# ✅ The .NET Solution Architect Checklist — Production Grade (2026)

> **Reviewed & Enhanced by Senior Solution Architect**
> Original by Rahul Sahay · Augmented with production-critical gaps across real-world enterprise systems.
>
> **Priority Legend:**
> - 🔴 **Critical** — Must have before go-live
> - 🟡 **Important** — Required for scale & maintainability
> - 🟢 **Recommended** — Best practice, adopt when ready

---

## 1. .NET & C# Platform

### Language & Runtime
- [ ] 🔴 C# 14 / .NET 10 — understand what's new vs what to actually use
- [ ] 🔴 ASP.NET Core / Minimal APIs — know when to use each
- [ ] 🔴 Middleware pipeline — order matters, custom middleware correctly placed
- [ ] 🔴 Hosted Services / BackgroundService — proper cancellation token handling
- [ ] 🔴 Memory management & GC — Large Object Heap, Gen0/1/2 awareness
- [ ] 🔴 Async/await correctly — no `.Result` / `.Wait()` deadlocks, `ConfigureAwait(false)`
- [ ] 🔴 Dependency Injection lifetimes — Singleton vs Scoped vs Transient pitfalls
- [ ] 🔴 Nullable reference types — enabled globally, no NullReferenceException surprises
- [ ] 🟡 `Span<T>` / `Memory<T>` — zero-allocation patterns for hot paths
- [ ] 🟡 Source Generators — compile-time code gen instead of reflection
- [ ] 🟡 Native AOT — evaluate for startup-critical or serverless workloads
- [ ] 🟡 `IOptions<T>` pattern — configuration binding, validation on startup
- [ ] 🟡 `IAsyncEnumerable<T>` — streaming results from DB / APIs
- [ ] 🟡 BenchmarkDotNet — micro-benchmark critical paths before optimising
- [ ] 🟢 Records & immutable value objects for domain model
- [ ] 🟢 Global usings & file-scoped namespaces — project consistency
- [ ] 🟢 Analyzers (Roslyn) — enforce code quality rules in CI

---

## 2. Architecture Patterns

### Design
- [ ] 🔴 Clean Architecture layers — enforced via project references, not convention
- [ ] 🔴 SOLID — regularly reviewed in code reviews, not just known
- [ ] 🔴 Domain-Driven Design (DDD) — Aggregates, Entities, Value Objects, Domain Events
- [ ] 🔴 CQRS + MediatR — Commands vs Queries separated, no business logic in controllers
- [ ] 🔴 Outbox Pattern — guaranteed at-least-once event publishing with DB transaction
- [ ] 🔴 Saga Pattern — orchestration vs choreography decision documented
- [ ] 🟡 Vertical Slice Architecture — feature folders, reduced coupling across slices
- [ ] 🟡 Event Sourcing — when auditability / temporal queries are a requirement
- [ ] 🟡 Strangler Fig — safe migration path for legacy systems
- [ ] 🟡 Hexagonal Architecture (Ports & Adapters) — infrastructure swappable
- [ ] 🟡 API Versioning Strategy — URL, header, or media-type versioning decided upfront
- [ ] 🟡 Backend for Frontend (BFF) — per-client API aggregation layer
- [ ] 🟡 Anti-Corruption Layer (ACL) — when integrating with legacy or 3rd-party systems
- [ ] 🟢 Architecture Decision Records (ADRs) — every major decision documented with context
- [ ] 🟢 C4 Model diagrams — Context, Container, Component, Code levels maintained

---

## 3. Data & Persistence

### ORM & Query
- [ ] 🔴 EF Core 10 — query splitting, compiled queries, no N+1 problems
- [ ] 🔴 Dapper — raw SQL for read-heavy / reporting queries
- [ ] 🔴 Connection pooling — configured correctly (min/max pool size)
- [ ] 🔴 Database migrations — Flyway / EF Migrations, never manual scripts in production
- [ ] 🔴 Optimistic concurrency — `RowVersion` / `ETag` to prevent lost updates

### Data Design
- [ ] 🔴 Read replicas — write to primary, read from replica for scale
- [ ] 🔴 Soft deletes + audit columns (`CreatedAt`, `UpdatedAt`, `DeletedAt`, `CreatedBy`)
- [ ] 🔴 Multi-tenancy strategy — row-level, schema-level, or DB-per-tenant decided
- [ ] 🔴 Data encryption at rest — TDE for SQL, encryption keys in Key Vault
- [ ] 🔴 PII data handling — identified, masked in logs, encrypted in DB
- [ ] 🟡 Redis caching — cache-aside pattern, TTL strategy, cache invalidation plan
- [ ] 🟡 CosmosDB / NoSQL — partition key chosen for scale, RU budget estimated
- [ ] 🟡 Repository pattern — abstraction over EF, testable, not leaking IQueryable
- [ ] 🟡 Database seeding — deterministic, idempotent, separated per environment
- [ ] 🟡 CQRS read models — denormalized projections for query performance
- [ ] 🟢 Data archiving strategy — hot / warm / cold tiers defined
- [ ] 🟢 Database backup & restore tested — RTO/RPO defined and validated

---

## 4. API Design

> **Section added — missing from original checklist, critical for production systems**

- [ ] 🔴 RESTful resource naming — nouns not verbs, consistent pluralisation
- [ ] 🔴 HTTP status codes used correctly — 400 vs 422, 401 vs 403, 404 vs 204
- [ ] 🔴 Problem Details (RFC 7807) — standardised error response format
- [ ] 🔴 API versioning — `/v1/`, deprecation headers, sunset dates communicated
- [ ] 🔴 Pagination — cursor-based (preferred) or offset, never unbounded queries
- [ ] 🔴 Rate limiting — per client, per endpoint (ASP.NET Core built-in or API Management)
- [ ] 🔴 Request/response validation — FluentValidation with early return
- [ ] 🔴 Idempotency keys — for POST/PATCH operations that must not duplicate
- [ ] 🟡 OpenAPI / Swagger spec — contract-first or generated, kept in sync
- [ ] 🟡 API contract testing — consumer-driven contracts (Pact)
- [ ] 🟡 HATEOAS — consider for hypermedia-driven clients
- [ ] 🟡 GraphQL — evaluate for flexible client queries (HotChocolate)
- [ ] 🟡 gRPC — for internal service-to-service high-throughput communication
- [ ] 🟢 API mocking (WireMock.NET) — for integration testing without live dependencies

---

## 5. Microservices

### Design
- [ ] 🔴 API Gateway — routing, auth, rate limiting, SSL termination (YARP / APIM)
- [ ] 🔴 Circuit Breaker & Retry (Polly v8) — with jitter, avoid thundering herd
- [ ] 🔴 Health checks — `/health/live`, `/health/ready`, `/health/startup` all separate
- [ ] 🔴 Separate datastore per service — no shared DB between services
- [ ] 🔴 Stateless services — no in-memory session state, externalise all state
- [ ] 🔴 Distributed transactions — Saga preferred over 2PC, compensating transactions defined
- [ ] 🟡 Service-to-service gRPC — Protobuf contracts versioned and in shared registry
- [ ] 🟡 Service Mesh (Istio / Linkerd) — mTLS between services, traffic policies
- [ ] 🟡 Sidecar Pattern — logging, metrics, tracing injected as sidecars
- [ ] 🟡 Bulkhead Pattern — isolate thread pools / connection pools per downstream
- [ ] 🟡 Timeout policies — every external call has an explicit timeout, never infinite wait
- [ ] 🟡 Service discovery — DNS-based (Kubernetes) or registry-based
- [ ] 🟢 Graceful shutdown — drain in-flight requests on SIGTERM, respect termination grace period

---

## 6. Resilience & Reliability

> **Section added — production systems live and die here**

- [ ] 🔴 Retry with exponential backoff + jitter — Polly ResiliencePipeline
- [ ] 🔴 Circuit breaker — per downstream, not per request
- [ ] 🔴 Timeout on every I/O operation — HTTP calls, DB queries, queue reads
- [ ] 🔴 Graceful degradation — feature flags to disable non-critical paths under load
- [ ] 🔴 Dependency health checks — fail fast on startup if critical deps unreachable
- [ ] 🟡 Chaos engineering — inject failures in staging (Chaos Monkey / Azure Chaos Studio)
- [ ] 🟡 Bulkhead isolation — resource pools separated per critical vs non-critical paths
- [ ] 🟡 Queue-based load levelling — spikes absorbed by queues, not hitting DB directly
- [ ] 🟡 Compensating transactions — defined for every distributed operation
- [ ] 🟡 Idempotent operations — safe to retry without side effects
- [ ] 🟢 Game day exercises — simulate outages, validate runbooks work in practice
- [ ] 🟢 Dependency matrix — all external dependencies mapped with SLA/fallback defined

---

## 7. Testing Strategy

### Test Pyramid
- [ ] 🔴 Unit tests — domain logic, no infrastructure, fast feedback
- [ ] 🔴 Integration tests with TestContainers — real DB/Redis/queue in CI
- [ ] 🔴 Architecture tests (NetArchTest / ArchUnitNET) — enforce layer boundaries in CI
- [ ] 🔴 Contract tests (Pact) — consumer-driven, catch breaking API changes before deploy
- [ ] 🔴 Smoke tests — run post-deployment against production/staging
- [ ] 🟡 TDD for domain logic — test first, drive design from behaviour
- [ ] 🟡 Mutation testing (Stryker.NET) — validate test suite quality, not just coverage %
- [ ] 🟡 Load & stress testing (k6 / NBomber) — baselines set, run in CI on schedule
- [ ] 🟡 Mocking with NSubstitute — no Moq (licensing), consistent mock approach
- [ ] 🟡 Test data builders — avoid fragile test setup, use builder pattern for entities
- [ ] 🟡 End-to-end tests (Playwright) — critical happy paths only, not exhaustive
- [ ] 🟢 Coverage gates — minimum threshold enforced in CI (aim for >80% meaningful coverage)
- [ ] 🟢 Test naming convention — `Method_Scenario_ExpectedResult` consistently applied

---

## 8. Performance & Scalability

> **Section added — often discovered too late in production**

- [ ] 🔴 Response caching — HTTP cache headers, `ETag`, `Cache-Control` correctly set
- [ ] 🔴 Output caching (ASP.NET Core) — cache expensive endpoints at middleware level
- [ ] 🔴 Database query analysis — execution plans reviewed, no table scans in hot paths
- [ ] 🔴 Indexes — foreign keys indexed, composite indexes for common query patterns
- [ ] 🔴 Horizontal scaling — stateless design verified under multiple replicas
- [ ] 🔴 Connection pool sizing — tuned for pod count × connections per pod
- [ ] 🟡 CDN — static assets and edge-cacheable API responses behind CDN
- [ ] 🟡 Async all the way — no sync-over-async, thread pool not blocked
- [ ] 🟡 Object pooling — `ArrayPool<T>`, `MemoryPool<T>` for high-frequency allocations
- [ ] 🟡 Lazy loading vs eager loading — explicit, never default lazy loading in EF
- [ ] 🟡 Compression — Brotli/gzip enabled for API responses
- [ ] 🟡 Performance profiling — dotTrace / VS Profiler run on realistic load scenarios
- [ ] 🟢 Baseline benchmarks — p50/p95/p99 latency documented per endpoint
- [ ] 🟢 Autoscaling rules — KEDA or HPA configured with appropriate metrics

---

## 9. Cloud & DevOps

### Infrastructure
- [ ] 🔴 Azure App Service / AKS / ACA — right compute choice per workload
- [ ] 🔴 Docker multi-stage builds — minimal final image, non-root user, no secrets in layers
- [ ] 🔴 Infrastructure as Code (Bicep / Terraform) — all infra in source control, no ClickOps
- [ ] 🔴 CI/CD pipelines (GitHub Actions / Azure DevOps) — build, test, scan, deploy automated
- [ ] 🔴 Environment parity — Dev → Staging → Production as identical as possible
- [ ] 🔴 Secrets — never in source code or environment variables, always Key Vault references

### Deployment
- [ ] 🔴 Blue/Green deployments — zero-downtime releases, instant rollback capability
- [ ] 🟡 Canary releases — gradual traffic shift, metric-gated promotion
- [ ] 🟡 GitOps (ArgoCD / Flux) — cluster state driven from Git, not imperative `kubectl`
- [ ] 🟡 Kubernetes — resource requests/limits set, PodDisruptionBudgets defined
- [ ] 🟡 Helm charts — parameterised per environment, values files in source control
- [ ] 🟡 Azure Functions & Durable — orchestration timeout, replay safety verified
- [ ] 🟡 Feature flags (Azure App Config / LaunchDarkly) — decouple deploy from release
- [ ] 🟡 Disaster Recovery — runbook documented, RTO/RPO defined and tested
- [ ] 🟢 Cost management — budget alerts, right-sizing reviewed monthly
- [ ] 🟢 Multi-region — active-active or active-passive strategy documented

---

## 10. Security

### Identity & Access
- [ ] 🔴 OAuth2 / OpenID Connect — flows chosen correctly (PKCE for SPA/mobile, client_credentials for M2M)
- [ ] 🔴 JWT validation — issuer, audience, expiry, signing key all validated
- [ ] 🔴 Token rotation — refresh tokens rotated, short-lived access tokens (15 min)
- [ ] 🔴 RBAC / policy-based auth — claims-based, not role string comparisons in code
- [ ] 🔴 Secret management (Key Vault) — no plaintext secrets anywhere in config
- [ ] 🔴 Input validation & sanitisation — every external input validated, no trust by default
- [ ] 🔴 OWASP Top 10 — actively mitigated, not just known

### Infrastructure Security
- [ ] 🔴 Zero Trust — never trust network location, verify every request
- [ ] 🔴 mTLS between services — service identity verified, not just network-level trust
- [ ] 🔴 Data encryption in transit — TLS 1.2+ enforced, no HTTP internally
- [ ] 🔴 Data encryption at rest — database TDE, storage encryption enabled
- [ ] 🔴 Dependency vulnerability scanning — Dependabot / OWASP Dependency-Check in CI
- [ ] 🟡 SAST (Static Analysis) — SonarQube / Semgrep in PR pipeline
- [ ] 🟡 DAST — OWASP ZAP against staging environment on schedule
- [ ] 🟡 Penetration testing — annual third-party pentest, findings tracked to closure
- [ ] 🟡 Security headers — CSP, HSTS, X-Frame-Options, Referrer-Policy configured
- [ ] 🟡 Rate limiting & DDoS protection — Azure Front Door / WAF in front of APIs
- [ ] 🟢 Threat modelling (STRIDE) — done for each new service or major feature
- [ ] 🟢 Security training — team completes secure coding training annually

---

## 11. Messaging & Events

### Brokers & Patterns
- [ ] 🔴 RabbitMQ with MassTransit — consumer error handling, retry topology configured
- [ ] 🔴 Azure Service Bus — sessions for ordering, duplicate detection enabled
- [ ] 🔴 Kafka — partition strategy, consumer group design, retention policy set
- [ ] 🔴 Idempotent consumers — processing same message twice has no side effect
- [ ] 🔴 Dead letter queue (DLQ) — monitored, alerting on DLQ depth, replay strategy defined
- [ ] 🔴 Outbox Pattern — events published transactionally, no dual-write problem
- [ ] 🟡 Event-driven architecture — domain events published from aggregates, not services calling services
- [ ] 🟡 Event schema registry (Confluent / Azure Schema Registry) — schema versioning enforced
- [ ] 🟡 Event versioning strategy — forward/backward compatibility, consumer version tolerance
- [ ] 🟡 Message ordering guarantees — documented per topic/queue, known limitations accepted
- [ ] 🟡 Pub/Sub patterns — fan-out, routing, topic filters designed for use case
- [ ] 🟢 Event catalog — all events documented with owner, consumers, payload schema
- [ ] 🟢 Poison message handling — circuit breaker on consumer, alert on repeated failures

---

## 12. Observability

### Pillars
- [ ] 🔴 OpenTelemetry — traces, metrics, logs all instrumented with OTEL SDK
- [ ] 🔴 Structured logging (Serilog) — JSON output, correlation IDs in every log entry
- [ ] 🔴 Distributed tracing (Jaeger / Zipkin / Azure Monitor) — trace spans across service boundaries
- [ ] 🔴 Metrics (Prometheus / Grafana) — RED metrics (Rate, Errors, Duration) per service
- [ ] 🔴 Health check endpoints — `/health/live`, `/health/ready` correctly differentiated
- [ ] 🔴 Correlation IDs — propagated across all HTTP calls, queues, background jobs
- [ ] 🔴 Alerting — PagerDuty / OpsGenie on-call runbooks, not email-only alerts

### Dashboards & Practices
- [ ] 🟡 SLO dashboards — error budget tracked, burn rate alerts configured
- [ ] 🟡 APM (Application Performance Monitoring) — Azure Monitor / Datadog / Dynatrace
- [ ] 🟡 Synthetic monitoring — uptime checks from multiple regions
- [ ] 🟡 Log retention policy — legal/compliance minimum defined, cost-optimised tiering
- [ ] 🟡 Deployment markers in dashboards — correlate deploys to metric changes
- [ ] 🟡 User journey tracing — end-to-end transaction visibility across services
- [ ] 🟢 Chaos + observability — validate that dashboards catch injected failures
- [ ] 🟢 Runbooks as code — alert → runbook link automated, not manual lookup

---

## 13. Compliance & Governance

> **Section added — skipped by most engineers, critical for enterprise**

- [ ] 🔴 GDPR compliance — right to erasure, data subject requests handled, DPA signed
- [ ] 🔴 PII identification — all PII fields catalogued, masked in logs, not returned unnecessarily
- [ ] 🔴 Audit logging — who did what, when, on which resource — immutable audit trail
- [ ] 🔴 Data residency — data stored in required geographic regions, no unintended cross-border
- [ ] 🔴 Regulatory requirements — SOC2 / ISO27001 / HIPAA / PCI-DSS assessed per domain
- [ ] 🟡 Data retention policies — defined per data class, automated enforcement
- [ ] 🟡 SBOM (Software Bill of Materials) — generated per release, tracked for CVEs
- [ ] 🟡 License compliance — open-source licenses scanned (no GPL in commercial products)
- [ ] 🟢 Privacy by design — data minimisation principle applied in data model design
- [ ] 🟢 Compliance as code — policy checks automated in CI (OPA / Azure Policy)

---

## 14. AI Integration

### Infrastructure
- [ ] 🔴 Azure OpenAI / LLM APIs — per-deployment rate limits understood, fallback to backup region
- [ ] 🔴 Semantic Kernel / LangChain — abstraction layer over LLM provider, swappable
- [ ] 🔴 Prompt injection prevention — user input never interpolated directly into system prompts
- [ ] 🔴 AI guardrails — content filtering enabled, output validation before returning to user
- [ ] 🔴 RAG pipeline design — chunking strategy, embedding model chosen, retrieval quality measured

### Operations
- [ ] 🔴 LLM cost management — token usage tracked per feature, budget alerts configured
- [ ] 🔴 AI Observability — prompt/response logging (with PII redaction), latency tracked
- [ ] 🔴 Hallucination monitoring — confidence scores, fact-checking layer for critical outputs
- [ ] 🟡 Vector databases (Qdrant / Chroma / Azure AI Search) — index design, similarity threshold tuned
- [ ] 🟡 LLM response caching — semantic caching for repeated/similar queries
- [ ] 🟡 MCP (Model Context Protocol) — standard tool/server interfaces for agent systems
- [ ] 🟡 AI model versioning — pinned model versions, change communication process
- [ ] 🟡 Human-in-the-loop — defined for high-risk AI decisions, not fully automated
- [ ] 🟢 Prompt versioning — prompts in source control, A/B testable
- [ ] 🟢 AI red teaming — adversarial testing of AI features before go-live

---

## 15. Developer Experience & Inner Loop

> **Section added — productivity multiplier for team output**

- [ ] 🔴 `dotnet watch` / Hot Reload — fast local iteration cycle
- [ ] 🔴 Dev containers / devcontainer.json — consistent environment, no "works on my machine"
- [ ] 🟡 Aspire (`.NET Aspire`) — local orchestration of services, service discovery in dev
- [ ] 🟡 Docker Compose — full local stack with dependencies reproducible
- [ ] 🟡 EditorConfig + formatting rules — consistent code style, enforced in CI
- [ ] 🟡 Pre-commit hooks — lint, format, secret scan before push
- [ ] 🟡 Makefile / task runner — `make run`, `make test`, `make migrate` documented
- [ ] 🟢 Onboarding doc — new dev productive within 1 day, not 1 week
- [ ] 🟢 Architectural fitness functions — automated checks that architecture stays healthy over time

---

## Summary Scorecard

| Area | Items | Priority Focus |
|---|---|---|
| .NET & C# Platform | 17 | Runtime & memory |
| Architecture Patterns | 15 | ADRs + DDD |
| Data & Persistence | 17 | Concurrency + PII |
| API Design *(new)* | 14 | Versioning + Rate limiting |
| Microservices | 13 | Bulkhead + Timeouts |
| Resilience *(new)* | 12 | Chaos + Degradation |
| Testing Strategy | 13 | Contract + Mutation |
| Performance *(new)* | 14 | Baselines + Indexes |
| Cloud & DevOps | 14 | Blue/Green + GitOps |
| Security | 16 | SAST/DAST + mTLS |
| Messaging & Events | 13 | Schema Registry + DLQ |
| Observability | 14 | SLOs + Synthetics |
| Compliance *(new)* | 10 | GDPR + Audit logs |
| AI Integration | 14 | Guardrails + Cost |
| Dev Experience *(new)* | 9 | Aspire + Dev containers |
| **Total** | **195** | |

---

> ⚠️ **Architect's Note:** A checklist is a starting point, not a destination.
> Every item here should be backed by an ADR explaining *why* that choice was made
> for *your* system, not just *that* it was done.
>
> *"Production First Architecture. Not Slideware."*
