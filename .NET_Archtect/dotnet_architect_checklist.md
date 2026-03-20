# The .NET Solution Architect Checklist (2026)
*Based on 18+ years of production .NET architecture*

---

## .NET & C#
- [ ] C# 14 / .NET 10 latest features
- [ ] ASP.NET Core / Minimal APIs
- [ ] Middleware pipeline internals
- [ ] Background Services / Hosted
- [ ] Memory management & GC
- [ ] Async/await & ThreadPool
- [ ] Dependency Injection lifetimes
- [ ] Nullable reference types

## Architecture Patterns
- [ ] Clean Architecture layers
- [ ] SOLID principles enforced
- [ ] Domain-Driven Design (DDD)
- [ ] CQRS + MediatR
- [ ] Vertical Slice Architecture
- [ ] Outbox Pattern
- [ ] Saga Pattern (Orchestration)
- [ ] Strangler Fig migration

## Data & Persistence
- [ ] EF Core 10 query optimisation
- [ ] Dapper for raw performance
- [ ] Repository pattern correctly
- [ ] SQL Server / PostgreSQL
- [ ] Redis caching strategy
- [ ] CosmosDB / NoSQL trade-offs
- [ ] Database migrations & seeding

## Microservices
- [ ] API Gateway design
- [ ] Service-to-service gRPC
- [ ] Circuit Breaker & Retry (Polly)
- [ ] Health checks & readiness
- [ ] Separate datastore per service
- [ ] Stateless service design
- [ ] Distributed transactions

## Testing
- [ ] xUnit — exclusive to .NET
- [ ] Integration tests with TestContainers
- [ ] Architecture tests (NetArchTest)
- [ ] TDD for domain logic
- [ ] Mocking with NSubstitute
- [ ] Load testing (k6 / NBomber)

---

## Cloud & DevOps
- [ ] Azure App Service / AKS / ACA
- [ ] Azure Functions & Durable
- [ ] Docker & multi-stage builds
- [ ] Kubernetes / Helm charts
- [ ] CI/CD pipelines (GitHub Actions)
- [ ] Infrastructure as Code (Bicep)
- [ ] Feature flags (Azure App Config)
- [ ] Cloud cost optimisation

## Security
- [ ] OAuth2 / OpenID Connect
- [ ] JWT validation & rotation
- [ ] RBAC / policy-based auth
- [ ] OWASP Top 10 awareness
- [ ] Secret management (Key Vault)
- [ ] Zero Trust architecture
- [ ] Input validation & sanitisation

## Messaging & Events
- [ ] RabbitMQ with MassTransit
- [ ] Azure Service Bus
- [ ] Kafka for streaming
- [ ] Event-driven architecture
- [ ] Pub/Sub patterns
- [ ] Idempotent consumers
- [ ] Dead letter queue handling

## Observability
- [ ] OpenTelemetry setup
- [ ] Structured logging (Serilog)
- [ ] Distributed tracing (Jaeger)
- [ ] Metrics (Prometheus / Grafana)
- [ ] Health check endpoints
- [ ] Alerting & on-call runbooks

## AI Integration
- [ ] Semantic Kernel / LangChain
- [ ] RAG pipeline design
- [ ] Azure OpenAI / LLM APIs
- [ ] Vector databases (Qdrant/Chroma)
- [ ] MCP (Model Context Protocol)
- [ ] Prompt engineering & guardrails
- [ ] AI Observability & hallucination monitoring

---

*Production First Architecture. Not Slideware.* — **Rahul Sahay**, Principal Architect · 47K+ Students
