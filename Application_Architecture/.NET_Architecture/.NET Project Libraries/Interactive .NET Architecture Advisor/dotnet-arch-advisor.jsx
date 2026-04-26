import { useState, useMemo } from "react";

// ─── DATA ────────────────────────────────────────────────────────────────────

const PROJECT_TYPES = [
  { id: "webapi", label: "Web API", icon: "⚡", cli: "dotnet new webapi", runtime: "ASP.NET Core", use: "REST/HTTP microservices, backend APIs", primaryArch: "Clean Architecture", altArch: "Vertical Slice, Layered", archNotes: "CQRS works well for complex APIs", tier: "backend" },
  { id: "minimalapi", label: "Minimal API", icon: "🔹", cli: "dotnet new webapi --use-minimal-apis", runtime: "ASP.NET Core", use: "Lightweight HTTP endpoints, low-overhead APIs", primaryArch: "Vertical Slice", altArch: "Clean Architecture", archNotes: "TypedResults, Route Groups, Endpoint Filters", tier: "backend" },
  { id: "mvc", label: "MVC Web App", icon: "🌐", cli: "dotnet new mvc", runtime: "ASP.NET Core", use: "Server-rendered web applications", primaryArch: "MVC + Clean Architecture", altArch: "Layered (N-Tier)", archNotes: "ViewModels map to Application DTOs", tier: "frontend" },
  { id: "blazorweb", label: "Blazor Web App (Unified)", icon: "🔥", cli: "dotnet new blazor", runtime: "ASP.NET Core", use: "Unified Blazor with per-component render mode", primaryArch: "Clean Architecture + MVVM", altArch: "Vertical Slice", archNotes: "Per-component render mode selection and streaming rendering", tier: "frontend", isNew: true },
  { id: "blazorwasm", label: "Blazor WASM", icon: "🕸️", cli: "dotnet new blazorwasm", runtime: "WebAssembly", use: "Client-side SPA in .NET/C#", primaryArch: "MVVM / Flux", altArch: "Clean Architecture", archNotes: "State management becomes important as UI grows", tier: "frontend" },
  { id: "blazorhybrid", label: "Blazor Hybrid (MAUI)", icon: "📱", cli: "dotnet new maui-blazor", runtime: ".NET MAUI", use: "Cross-platform desktop/mobile with Blazor UI", primaryArch: "MVVM", altArch: "Clean Architecture", archNotes: "Shared UI core with platform-specific host shell", tier: "mobile" },
  { id: "worker", label: "Worker Service", icon: "⚙️", cli: "dotnet new worker", runtime: ".NET Generic Host", use: "Background processing, daemons", primaryArch: "Layered / Domain Services", altArch: "Clean Architecture (light)", archNotes: "Focus on idempotency, retries, and observability", tier: "backend" },
  { id: "console", label: "Console App", icon: "💻", cli: "dotnet new console", runtime: ".NET", use: "CLI tools, batch jobs, scripts", primaryArch: "Layered", altArch: "Vertical Slice", archNotes: "Pair with Generic Host for configuration and DI", tier: "tooling" },
  { id: "grpc", label: "gRPC Service", icon: "🔗", cli: "dotnet new grpc", runtime: "ASP.NET Core", use: "High-performance binary RPC services", primaryArch: "Clean Architecture", altArch: "Layered", archNotes: "Proto contracts stay close to application boundaries", tier: "backend" },
  { id: "signalr", label: "SignalR Hub", icon: "📡", cli: "dotnet new webapi + SignalR", runtime: "ASP.NET Core", use: "Real-time push / bidirectional communication", primaryArch: "Clean Architecture", altArch: "Layered", archNotes: "Keep business logic outside hubs", tier: "backend" },
  { id: "microservice", label: "Microservice", icon: "🏗️", cli: "dotnet new webapi + Dockerized", runtime: "ASP.NET Core", use: "Independently deployable bounded contexts", primaryArch: "DDD + Clean Architecture", altArch: "CQRS + Event Sourcing", archNotes: "Bounded contexts and aggregate roots matter most", tier: "backend" },
  { id: "aspire", label: "Aspire AppHost", icon: "☁️", cli: "dotnet new aspire-apphost", runtime: ".NET + Aspire", use: "Cloud-native orchestration & service composition", primaryArch: "Cloud-Native Composition", altArch: "N/A", archNotes: "Resource model, service discovery, telemetry wiring. DEV-TIME ONLY.", tier: "infra", isNew: true },
  { id: "wpf", label: "WPF Desktop", icon: "🪟", cli: "dotnet new wpf", runtime: ".NET", use: "Windows GUI applications", primaryArch: "MVVM", altArch: "MVP", archNotes: "Prefer Toolkit- or Prism-style composition", tier: "desktop" },
  { id: "winforms", label: "WinForms Desktop", icon: "📋", cli: "dotnet new winforms", runtime: ".NET", use: "Windows Forms GUI applications", primaryArch: "MVVM", altArch: "MVP", archNotes: "Simple Windows desktop line-of-business apps", tier: "desktop" },
  { id: "maui", label: "MAUI App", icon: "📲", cli: "dotnet new maui", runtime: ".NET MAUI", use: "Cross-platform mobile & desktop", primaryArch: "MVVM + Shell", altArch: "Clean Architecture", archNotes: "Shell navigation with thin views and rich view models", tier: "mobile" },
  { id: "classlib", label: "Class Library / SDK", icon: "📦", cli: "dotnet new classlib", runtime: ".NET / .NET Standard", use: "Shared logic, reusable components, NuGet packages", primaryArch: "Domain-Centric", altArch: "N/A", archNotes: "Keep framework coupling low", tier: "tooling" },
  { id: "azfunc", label: "Azure Function", icon: "⚡", cli: "func (Azure Functions Core Tools)", runtime: "Isolated Worker", use: "Event-driven serverless compute", primaryArch: "Vertical Slice", altArch: "Clean Architecture (light)", archNotes: "Function handler should stay thin; push logic into services", tier: "serverless" },
  { id: "blazorserver", label: "Blazor Server", icon: "🖥️", cli: "dotnet new blazorserver", runtime: "ASP.NET Core", use: "Interactive server-side UI with SignalR", primaryArch: "Clean Architecture + MVVM", altArch: "Layered", archNotes: "Still relevant where server-side rendering is preferred", tier: "frontend" },
  { id: "testproject", label: "Test Project", icon: "🧪", cli: "dotnet new xunit / nunit / mstest", runtime: ".NET", use: "Unit / integration / E2E tests", primaryArch: "N/A", altArch: "N/A", archNotes: "Keep test type aligned with project boundary", tier: "tooling" },
];

const ENFORCEMENT = {
  MUST: { label: "🔒 MUST", color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  SHOULD: { label: "📋 SHOULD", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  MAY: { label: "💡 MAY", color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
};

const LAYERS = {
  presentation: { label: "Presentation", color: "#00d4ff" },
  application: { label: "Application", color: "#a78bfa" },
  domain: { label: "Domain", color: "#f59e0b" },
  infrastructure: { label: "Infrastructure", color: "#fb923c" },
  crosscut: { label: "Cross-Cutting", color: "#22c55e" },
};

const LIBRARIES = [
  // PRESENTATION
  { id: "aspnetcore", layer: "presentation", concern: "API Framework", name: "Microsoft.AspNetCore", oss: true, alt: "Minimal APIs (built-in)", notes: "Core web framework; controllers and Minimal APIs both work", enforcement: "MUST" },
  { id: "apivers", layer: "presentation", concern: "API Versioning", name: "Asp.Versioning.Http", oss: true, alt: "Asp.Versioning.Mvc", notes: "URL/header/query versioning", enforcement: "SHOULD" },
  { id: "scalar", layer: "presentation", concern: "API Docs UI", name: "Scalar.AspNetCore", oss: true, alt: "Swashbuckle.AspNetCore, NSwag", notes: "Scalar is a strong default UI choice", enforcement: "SHOULD" },
  { id: "openapi", layer: "presentation", concern: "OpenAPI Spec", name: "Microsoft.AspNetCore.OpenApi", oss: true, alt: "NSwag.AspNetCore", notes: "Prefer built-in spec generation where possible", enforcement: "SHOULD" },
  { id: "typedresults", layer: "presentation", concern: "Typed Results", name: "TypedResults (built-in)", oss: true, alt: "IResult implementations", notes: "Better endpoint clarity and response typing", enforcement: "SHOULD" },
  { id: "fluentval-pres", layer: "presentation", concern: "Request Validation", name: "FluentValidation.AspNetCore", oss: true, alt: "DataAnnotations (built-in)", notes: "FluentValidation is better for complex rules", enforcement: "MUST" },
  { id: "outputcache", layer: "presentation", concern: "Output Caching", name: "Microsoft.AspNetCore.OutputCaching", oss: true, alt: "ResponseCaching (built-in)", notes: "Better than plain response caching for modern APIs", enforcement: "SHOULD" },
  { id: "ratelimiting", layer: "presentation", concern: "Rate Limiting", name: "Microsoft.AspNetCore.RateLimiting", oss: true, alt: "AspNetCoreRateLimit", notes: "Built-in rate-limiting primitives are usually enough", enforcement: "SHOULD" },
  { id: "yarp", layer: "presentation", concern: "API Gateway", name: "YARP", oss: true, alt: "Ocelot, Kong (Commercial)", notes: "YARP is a strong reverse-proxy choice", enforcement: "MAY" },
  { id: "healthchecks", layer: "presentation", concern: "Health Checks", name: "AspNetCore.HealthChecks.*", oss: true, alt: "Microsoft.Extensions.Diagnostics.HealthChecks", notes: "Use built-in checks plus ecosystem packages", enforcement: "MUST" },
  // APPLICATION
  { id: "mediatr", layer: "application", concern: "CQRS / Mediator", name: "MediatR", oss: true, alt: "Wolverine, Brighter, Kommand", notes: "MediatR is the familiar default; Wolverine is strong for performance", enforcement: "SHOULD" },
  { id: "mapster", layer: "application", concern: "Object Mapping", name: "Mapster", oss: true, alt: "AutoMapper", notes: "Mapster is leaner; AutoMapper is widely recognized", enforcement: "SHOULD" },
  { id: "fluentval", layer: "application", concern: "Validation", name: "FluentValidation", oss: true, alt: "GuardClauses", notes: "Combine request validation with guard clauses in domain logic", enforcement: "MUST" },
  { id: "ardalisresult", layer: "application", concern: "Result Pattern", name: "Ardalis.Result", oss: true, alt: "ErrorOr, OneOf, LanguageExt", notes: "Avoid exceptions for normal control flow", enforcement: "SHOULD" },
  { id: "ardalisspec", layer: "application", concern: "Specification Pattern", name: "Ardalis.Specification", oss: true, alt: "Custom", notes: "Useful when queries need reuse and consistency", enforcement: "MAY" },
  { id: "featuremgmt", layer: "application", concern: "Feature Flags", name: "Microsoft.FeatureManagement", oss: true, alt: "LaunchDarkly (Commercial), Unleash", notes: "Works well with configuration-driven rollout", enforcement: "MAY" },
  { id: "meai", layer: "application", concern: "AI Abstractions", name: "Microsoft.Extensions.AI", oss: true, alt: "Semantic Kernel", notes: "Useful for model-agnostic chat and embedding scenarios", enforcement: "SHOULD", isNew: true },
  { id: "wolverinesaga", layer: "application", concern: "Workflow / Saga", name: "Wolverine Saga", oss: true, alt: "MassTransit Saga, Dapr", notes: "Use when business flow spans services or time", enforcement: "MAY", isNew: true },
  // DOMAIN
  { id: "smartenum", layer: "domain", concern: "Enumeration Pattern", name: "Ardalis.SmartEnum", oss: true, alt: "NetEscapades.EnumGenerators", notes: "Good for richer enum-like behavior", enforcement: "MAY" },
  { id: "guardclauses", layer: "domain", concern: "Guard Clauses", name: "Ardalis.GuardClauses", oss: true, alt: "CommunityToolkit.Diagnostics", notes: "Lightweight and readable input validation", enforcement: "SHOULD" },
  { id: "nmoneys", layer: "domain", concern: "Money / Currency", name: "NMoneys", oss: true, alt: "Money.Net, Custom Value Object", notes: "Useful for finance and pricing domains", enforcement: "MAY" },
  { id: "timeprovider", layer: "domain", concern: "Time Abstraction", name: "TimeProvider (built-in)", oss: true, alt: "NodaTime", notes: "Prefer TimeProvider broadly; NodaTime for richer time-zone modeling", enforcement: "MUST" },
  { id: "stronglytyped", layer: "domain", concern: "Strongly Typed IDs", name: "StronglyTypedId", oss: true, alt: "Vogen", notes: "Great for domain-safe identifiers", enforcement: "SHOULD", isNew: true },
  // INFRASTRUCTURE
  { id: "efcore", layer: "infrastructure", concern: "ORM (Full)", name: "Microsoft.EntityFrameworkCore", oss: true, alt: "NHibernate", notes: "Default choice for most .NET applications. Use for writes.", enforcement: "MUST" },
  { id: "dapper", layer: "infrastructure", concern: "Micro ORM", name: "Dapper", oss: true, alt: "RepoDB, SqlKata", notes: "Best when query control matters more than abstraction. Use for reads.", enforcement: "SHOULD" },
  { id: "redis", layer: "infrastructure", concern: "Distributed Cache", name: "StackExchange.Redis", oss: true, alt: "Microsoft.Extensions.Caching.StackExchangeRedis", notes: "Strong default Redis client", enforcement: "SHOULD" },
  { id: "hybridcache", layer: "infrastructure", concern: "Hybrid Cache", name: "Microsoft.Extensions.Caching.Hybrid", oss: true, alt: "FusionCache", notes: "Layered caching with stampede protection", enforcement: "SHOULD", isNew: true },
  { id: "masstransit", layer: "infrastructure", concern: "Message Bus", name: "MassTransit", oss: true, alt: "NServiceBus (Commercial), Wolverine, Rebus", notes: "Transport-agnostic bus with outbox, saga, and retry support", enforcement: "MUST" },
  { id: "outbox", layer: "infrastructure", concern: "Outbox Pattern", name: "MassTransit Outbox", oss: true, alt: "Wolverine Outbox, CAP", notes: "Important for reliable message publishing", enforcement: "MUST" },
  { id: "marten", layer: "infrastructure", concern: "Event Sourcing", name: "Marten", oss: true, alt: "EventStoreDB client, Wolverine", notes: "Best when event history is central to the domain", enforcement: "MAY" },
  { id: "refit", layer: "infrastructure", concern: "Typed HTTP Client", name: "Refit", oss: true, alt: "RestEase, Flurl.Http", notes: "Refit is simple and interface-driven", enforcement: "SHOULD" },
  { id: "resilience", layer: "infrastructure", concern: "HTTP Resilience", name: "Microsoft.Extensions.Http.Resilience", oss: true, alt: "Polly", notes: "Prefer standardized resilience configuration", enforcement: "MUST", isNew: true },
  { id: "azblob", layer: "infrastructure", concern: "Azure Blob Storage", name: "Azure.Storage.Blobs", oss: true, alt: "AWSSDK.S3", notes: "Official Azure SDK; managed identity is preferable", enforcement: "MAY" },
  { id: "keyvault", layer: "infrastructure", concern: "Secrets Management", name: "Azure.Extensions.AspNetCore.Configuration.Secrets", oss: true, alt: "HashiCorp Vault, AWS Secrets Manager", notes: "MUST NOT store secrets in code or config files", enforcement: "MUST" },
  // CROSS-CUTTING
  { id: "serilog", layer: "crosscut", concern: "Structured Logging", name: "Serilog", oss: true, alt: "Microsoft.Extensions.Logging, NLog", notes: "Rich structured logging; use OTLP + Console sinks", enforcement: "MUST" },
  { id: "otel", layer: "crosscut", concern: "Distributed Tracing", name: "OpenTelemetry", oss: true, alt: "App Insights SDK (direct)", notes: "Vendor-neutral tracing and metrics. Every inbound request needs a trace span.", enforcement: "MUST" },
  { id: "entra", layer: "crosscut", concern: "Authentication", name: "JWT Bearer + Entra ID", oss: true, alt: "OpenIddict, Duende IdentityServer", notes: "Entra ID for corporate; OpenIddict when the app owns identity", enforcement: "MUST" },
  { id: "dataprotection", layer: "crosscut", concern: "Data Protection", name: "Microsoft.AspNetCore.DataProtection", oss: true, alt: "Custom encryption", notes: "PII encrypted at rest and in transit", enforcement: "MUST" },
  // TESTING
  { id: "xunit", layer: "crosscut", concern: "Unit Testing", name: "xUnit", oss: true, alt: "NUnit, MSTest", notes: "De facto standard for .NET unit testing", enforcement: "MUST" },
  { id: "nsubstitute", layer: "crosscut", concern: "Mocking", name: "NSubstitute", oss: true, alt: "Moq, FakeItEasy", notes: "Clean substitute-based mocking", enforcement: "SHOULD" },
  { id: "fluentassert", layer: "crosscut", concern: "Assertions", name: "FluentAssertions", oss: true, alt: "Shouldly", notes: "Readable, expressive assertions", enforcement: "SHOULD" },
  { id: "testcontainers", layer: "crosscut", concern: "Integration Testing", name: "Testcontainers", oss: true, alt: "WebApplicationFactory + InMemory", notes: "Real infrastructure for integration tests", enforcement: "SHOULD" },
  { id: "netarchtest", layer: "crosscut", concern: "Architecture Testing", name: "NetArchTest.Rules", oss: true, alt: "ArchUnitNET", notes: "CI-enforced dependency rule validation", enforcement: "MUST" },
];

const ANTIPATTERNS = [
  { tech: "MediatR / CQRS", avoid: "Simple CRUD app with <5 entities and minimal business logic — adds indirection without payoff", use: "Domain has distinct read/write models, complex validation pipelines, or cross-cutting behaviors", risk: "high" },
  { tech: "DDD (Full)", avoid: "Domain is mostly data-in/data-out with few business rules; DDD tactical patterns add ceremony for no gain", use: "Rich business rules, complex invariants, multiple bounded contexts", risk: "high" },
  { tech: "Event Sourcing", avoid: "Standard CRUD with no audit/history requirement — ES adds storage and replay complexity", use: "Audit trail is a core requirement, or temporal queries (\"what was the state at time X?\") are needed", risk: "high" },
  { tech: "Microservices", avoid: "Small team (<5 devs), single deployment unit, no independent scaling needs — distributed systems tax is too high", use: "Independent deployment, separate scaling profiles, distinct bounded contexts owned by different teams", risk: "high" },
  { tech: "Generic Repository Pattern", avoid: "Generic IRepository<T> that wraps EF Core 1:1 — hides useful ORM features (Include, projection, split queries)", use: "Specification-based repositories (Ardalis.Specification) that add real query reuse", risk: "medium" },
  { tech: "AutoMapper", avoid: "Only a few simple mappings — manual mapping or Mapster code-gen is clearer and faster", use: "Large codebase with many mapping profiles and an established AutoMapper convention", risk: "low" },
  { tech: "Blazor Server", avoid: "App requires offline support, low-latency UI on slow networks, or massive concurrent user counts — SignalR circuit overhead adds up", use: "Internal LOB apps with small/medium user bases where server-side rendering simplifies the stack", risk: "medium" },
  { tech: "Vertical Slice (pure)", avoid: "Large team that needs strong layered governance and shared domain model — slices can diverge without discipline", use: "Small team, Minimal API, feature-focused development with low cross-cutting concern overlap", risk: "medium" },
  { tech: "Hangfire", avoid: "Only need a simple IHostedService timer — Hangfire's dashboard and persistence are overhead", use: "Dashboard visibility, delayed/recurring jobs, and retry semantics are genuinely needed", risk: "low" },
  { tech: "Full Aspire Orchestration in Production", avoid: "Production multi-region deployment — Aspire is a dev-time tool, not a production orchestrator", use: "Local development, multi-service inner loop, consistent service defaults", risk: "high" },
];

const NFRS = {
  performance: [
    { metric: "API Response Time (P50)", target: "< 100ms", enforcement: "SHOULD", measurement: "OpenTelemetry latency histograms" },
    { metric: "API Response Time (P95)", target: "< 300ms", enforcement: "MUST", measurement: "OpenTelemetry latency histograms" },
    { metric: "API Response Time (P99)", target: "< 1,000ms", enforcement: "MUST", measurement: "OpenTelemetry latency histograms" },
    { metric: "Cold Startup Time", target: "< 10s", enforcement: "SHOULD", measurement: "Health check readiness probe timing" },
    { metric: "Database Query Time (P95)", target: "< 50ms", enforcement: "SHOULD", measurement: "EF Core / Dapper instrumentation" },
    { metric: "AI/LLM Call Latency (P95)", target: "< 5,000ms", enforcement: "SHOULD", measurement: "Custom OTEL span on model calls" },
  ],
  availability: [
    { metric: "Tier-1 Service Availability", target: "≥ 99.9%", enforcement: "MUST", measurement: "Health check uptime" },
    { metric: "Tier-2 Service Availability", target: "≥ 99.5%", enforcement: "SHOULD", measurement: "Health check uptime" },
    { metric: "Error Rate (5xx)", target: "< 0.1%", enforcement: "MUST", measurement: "OpenTelemetry metrics + alerting" },
    { metric: "Graceful Shutdown", target: "Drain in-flight within 30s", enforcement: "MUST", measurement: "IHostedLifecycleService" },
    { metric: "Zero-Downtime Deployments", target: "Rolling update or blue-green", enforcement: "MUST", measurement: "Container orchestration" },
  ],
  security: [
    { metric: "Transport Security", target: "TLS 1.2+ all traffic", enforcement: "MUST", measurement: "No plaintext HTTP in production" },
    { metric: "Authentication", target: "All endpoints authenticated", enforcement: "MUST", measurement: "JWT Bearer + Entra ID" },
    { metric: "Authorization", target: "Policy-based on every endpoint", enforcement: "MUST", measurement: "Minimum: role or scope claim check" },
    { metric: "Secrets Management", target: "No secrets in code/config/env", enforcement: "MUST", measurement: "Azure Key Vault or equivalent" },
    { metric: "Dependency Scanning", target: "Block on known critical CVEs", enforcement: "MUST", measurement: "dotnet list package --vulnerable in CI" },
    { metric: "CORS", target: "Explicit allow-list; no wildcards", enforcement: "MUST", measurement: "AllowAnyOrigin() is forbidden" },
    { metric: "Data Protection (PII)", target: "Encrypted at rest and in transit", enforcement: "MUST", measurement: "DataProtection API" },
  ],
  scalability: [
    { metric: "Horizontal Scaling", target: "≥ 2 replicas", enforcement: "MUST", measurement: "No in-memory state preventing scale-out" },
    { metric: "Stateless Design", target: "No sticky sessions / local file state", enforcement: "MUST", measurement: "Use Redis / external storage for state" },
    { metric: "DB Connection Pooling", target: "Max pool configured per replica", enforcement: "MUST", measurement: "Prevent connection exhaustion under scale" },
    { metric: "Message Consumer Scaling", target: "Competing consumers + idempotent handlers", enforcement: "MUST", measurement: "MassTransit consumer concurrency" },
  ],
};

const SERVICE_TIERS = [
  { tier: "Tier-1 (Critical)", definition: "Revenue-impacting, customer-facing", availability: "≥ 99.9%", perf: "< 300ms P95", examples: "Order API, Payment Service, Auth Gateway" },
  { tier: "Tier-2 (Standard)", definition: "Important but not revenue-blocking", availability: "≥ 99.5%", perf: "< 500ms P95", examples: "Inventory Service, Notification Worker" },
  { tier: "Tier-3 (Internal)", definition: "Back-office, admin, dev tooling", availability: "≥ 99.0%", perf: "< 1,000ms P95", examples: "Reporting Service, Admin Dashboard" },
];

// ─── COMPONENTS ──────────────────────────────────────────────────────────────

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=Syne:wght@400;600;700;800&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body { background: #080c14; }

  .advisor {
    font-family: 'JetBrains Mono', monospace;
    background: #080c14;
    color: #c9d1e8;
    min-height: 100vh;
    padding: 0;
  }

  .header {
    background: linear-gradient(135deg, #0d1322 0%, #111827 100%);
    border-bottom: 1px solid #1e2a3a;
    padding: 20px 28px 16px;
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .header-title {
    font-family: 'Syne', sans-serif;
    font-size: 20px;
    font-weight: 800;
    color: #fff;
    letter-spacing: -0.3px;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .header-title .dot {
    width: 8px; height: 8px;
    background: #00d4ff;
    border-radius: 50%;
    box-shadow: 0 0 8px #00d4ff;
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }

  .header-sub {
    font-size: 11px;
    color: #4a5a7a;
    margin-top: 3px;
    letter-spacing: 0.5px;
  }

  .tabs {
    display: flex;
    gap: 0;
    margin-top: 14px;
    border-bottom: 1px solid #1e2a3a;
    overflow-x: auto;
  }

  .tab {
    padding: 8px 16px;
    font-size: 11px;
    font-weight: 600;
    color: #4a5a7a;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: all 0.2s;
    white-space: nowrap;
    letter-spacing: 0.3px;
    background: none;
    border-top: none;
    border-left: none;
    border-right: none;
    font-family: 'JetBrains Mono', monospace;
  }

  .tab:hover { color: #8899bb; }
  .tab.active { color: #00d4ff; border-bottom-color: #00d4ff; }

  .content {
    padding: 24px 28px;
    max-width: 1200px;
  }

  .section-title {
    font-family: 'Syne', sans-serif;
    font-size: 15px;
    font-weight: 700;
    color: #e2e8f0;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .section-title::after {
    content: '';
    flex: 1;
    height: 1px;
    background: linear-gradient(to right, #1e2a3a, transparent);
  }

  /* PROJECT ADVISOR */
  .tier-filters {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 16px;
  }

  .tier-btn {
    padding: 4px 12px;
    font-size: 10px;
    font-weight: 600;
    border-radius: 2px;
    cursor: pointer;
    border: 1px solid #1e2a3a;
    background: #0d1322;
    color: #4a5a7a;
    letter-spacing: 0.5px;
    transition: all 0.15s;
    font-family: 'JetBrains Mono', monospace;
  }

  .tier-btn:hover, .tier-btn.active {
    border-color: #00d4ff;
    color: #00d4ff;
    background: rgba(0, 212, 255, 0.06);
  }

  .project-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 8px;
    margin-bottom: 24px;
  }

  .project-card {
    background: #0d1322;
    border: 1px solid #1e2a3a;
    border-radius: 4px;
    padding: 12px 14px;
    cursor: pointer;
    transition: all 0.15s;
    position: relative;
  }

  .project-card:hover {
    border-color: #2a3a5a;
    background: #111827;
  }

  .project-card.selected {
    border-color: #00d4ff;
    background: rgba(0, 212, 255, 0.06);
  }

  .project-card-icon { font-size: 20px; margin-bottom: 6px; }

  .project-card-name {
    font-size: 11px;
    font-weight: 600;
    color: #e2e8f0;
    line-height: 1.3;
  }

  .project-card-tier {
    font-size: 9px;
    color: #4a5a7a;
    margin-top: 3px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .new-badge {
    position: absolute;
    top: 6px;
    right: 6px;
    font-size: 8px;
    background: rgba(0,212,255,0.15);
    color: #00d4ff;
    padding: 1px 5px;
    border-radius: 2px;
    font-weight: 700;
    letter-spacing: 0.5px;
  }

  .detail-panel {
    background: #0d1322;
    border: 1px solid #1e2a3a;
    border-radius: 4px;
    padding: 20px 24px;
    margin-top: 0;
  }

  .detail-panel-title {
    font-family: 'Syne', sans-serif;
    font-size: 18px;
    font-weight: 700;
    color: #fff;
    margin-bottom: 4px;
  }

  .detail-cli {
    font-size: 11px;
    color: #00d4ff;
    margin-bottom: 16px;
    opacity: 0.8;
  }

  .detail-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 16px;
  }

  .detail-item label {
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: #4a5a7a;
    display: block;
    margin-bottom: 4px;
  }

  .detail-item .value {
    font-size: 12px;
    color: #e2e8f0;
  }

  .arch-badge {
    display: inline-block;
    background: rgba(0,212,255,0.1);
    color: #00d4ff;
    border: 1px solid rgba(0,212,255,0.25);
    padding: 3px 10px;
    border-radius: 2px;
    font-size: 11px;
    font-weight: 600;
  }

  .alt-badge {
    display: inline-block;
    background: rgba(245,158,11,0.08);
    color: #f59e0b;
    border: 1px solid rgba(245,158,11,0.2);
    padding: 3px 10px;
    border-radius: 2px;
    font-size: 11px;
    margin-left: 6px;
  }

  .notes-box {
    background: rgba(255,255,255,0.03);
    border-left: 2px solid #f59e0b;
    padding: 10px 14px;
    font-size: 11px;
    color: #8899bb;
    border-radius: 0 4px 4px 0;
    margin-top: 12px;
  }

  .enterprise-box {
    margin-top: 16px;
    background: rgba(34,197,94,0.04);
    border: 1px solid rgba(34,197,94,0.15);
    border-radius: 4px;
    padding: 14px 16px;
  }

  .enterprise-title {
    font-size: 10px;
    font-weight: 700;
    color: #22c55e;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    margin-bottom: 10px;
  }

  .stack-item {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 5px 0;
    border-bottom: 1px solid rgba(255,255,255,0.04);
    font-size: 11px;
  }

  .stack-item:last-child { border-bottom: none; }

  .stack-concern {
    color: #4a5a7a;
    width: 130px;
    flex-shrink: 0;
  }

  .stack-lib {
    color: #00d4ff;
    font-weight: 600;
  }

  /* LIBRARY EXPLORER */
  .lib-controls {
    display: flex;
    gap: 10px;
    margin-bottom: 16px;
    flex-wrap: wrap;
    align-items: center;
  }

  .search-input {
    background: #0d1322;
    border: 1px solid #1e2a3a;
    border-radius: 3px;
    padding: 7px 12px;
    font-size: 11px;
    color: #c9d1e8;
    font-family: 'JetBrains Mono', monospace;
    flex: 1;
    min-width: 200px;
    outline: none;
    transition: border-color 0.2s;
  }

  .search-input:focus { border-color: #00d4ff; }
  .search-input::placeholder { color: #2a3a5a; }

  .layer-filter-bar {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .layer-btn {
    padding: 4px 10px;
    font-size: 10px;
    font-weight: 600;
    border-radius: 2px;
    cursor: pointer;
    border: 1px solid transparent;
    background: #0d1322;
    color: #4a5a7a;
    letter-spacing: 0.3px;
    transition: all 0.15s;
    font-family: 'JetBrains Mono', monospace;
  }

  .lib-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11px;
  }

  .lib-table th {
    text-align: left;
    padding: 8px 12px;
    font-size: 9px;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    color: #4a5a7a;
    border-bottom: 1px solid #1e2a3a;
    font-weight: 600;
    background: #080c14;
    position: sticky;
    top: 0;
  }

  .lib-table td {
    padding: 9px 12px;
    border-bottom: 1px solid rgba(30,42,58,0.6);
    vertical-align: top;
  }

  .lib-table tr:hover td { background: rgba(255,255,255,0.02); }

  .layer-dot {
    display: inline-block;
    width: 6px; height: 6px;
    border-radius: 50%;
    margin-right: 6px;
    flex-shrink: 0;
  }

  .lib-name { color: #00d4ff; font-weight: 600; }
  .lib-alt { color: #4a5a7a; font-size: 10px; }
  .lib-notes { color: #8899bb; }

  .enf-badge {
    display: inline-block;
    padding: 2px 7px;
    border-radius: 2px;
    font-size: 9px;
    font-weight: 700;
    white-space: nowrap;
  }

  .oss-tag {
    font-size: 9px;
    padding: 1px 5px;
    border-radius: 2px;
    background: rgba(34,197,94,0.1);
    color: #22c55e;
    border: 1px solid rgba(34,197,94,0.2);
    margin-left: 4px;
  }

  .new-tag {
    font-size: 9px;
    padding: 1px 5px;
    border-radius: 2px;
    background: rgba(0,212,255,0.1);
    color: #00d4ff;
    border: 1px solid rgba(0,212,255,0.2);
    margin-left: 4px;
  }

  /* ANTI-PATTERN */
  .ap-card {
    background: #0d1322;
    border: 1px solid #1e2a3a;
    border-radius: 4px;
    padding: 16px 18px;
    margin-bottom: 10px;
    transition: all 0.15s;
  }

  .ap-card:hover { border-color: #2a3a5a; }

  .ap-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
  }

  .ap-tech {
    font-family: 'Syne', sans-serif;
    font-weight: 700;
    color: #e2e8f0;
    font-size: 13px;
  }

  .risk-badge {
    font-size: 9px;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 2px;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }

  .risk-high { background: rgba(239,68,68,0.12); color: #ef4444; border: 1px solid rgba(239,68,68,0.2); }
  .risk-medium { background: rgba(245,158,11,0.12); color: #f59e0b; border: 1px solid rgba(245,158,11,0.2); }
  .risk-low { background: rgba(34,197,94,0.1); color: #22c55e; border: 1px solid rgba(34,197,94,0.2); }

  .ap-body {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .ap-col label {
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    display: block;
    margin-bottom: 5px;
  }

  .ap-avoid label { color: #ef4444; }
  .ap-use label { color: #22c55e; }

  .ap-col p {
    font-size: 11px;
    color: #8899bb;
    line-height: 1.5;
  }

  /* NFR */
  .nfr-tabs {
    display: flex;
    gap: 6px;
    margin-bottom: 16px;
    flex-wrap: wrap;
  }

  .nfr-tab {
    padding: 5px 14px;
    font-size: 10px;
    font-weight: 600;
    border-radius: 2px;
    cursor: pointer;
    border: 1px solid #1e2a3a;
    background: #0d1322;
    color: #4a5a7a;
    letter-spacing: 0.5px;
    transition: all 0.15s;
    font-family: 'JetBrains Mono', monospace;
  }

  .nfr-tab:hover { color: #8899bb; }
  .nfr-tab.active { border-color: #a78bfa; color: #a78bfa; background: rgba(167,139,250,0.06); }

  .nfr-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11px;
    margin-bottom: 24px;
  }

  .nfr-table th {
    text-align: left;
    padding: 8px 12px;
    font-size: 9px;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    color: #4a5a7a;
    border-bottom: 1px solid #1e2a3a;
    font-weight: 600;
  }

  .nfr-table td {
    padding: 10px 12px;
    border-bottom: 1px solid rgba(30,42,58,0.6);
    vertical-align: top;
  }

  .nfr-table tr:hover td { background: rgba(255,255,255,0.02); }

  .nfr-metric { color: #c9d1e8; font-weight: 500; }
  .nfr-target { color: #00d4ff; font-weight: 700; font-family: 'JetBrains Mono', monospace; }
  .nfr-measure { color: #4a5a7a; font-size: 10px; }

  .tier-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin-top: 20px;
  }

  .tier-card {
    padding: 14px 16px;
    border-radius: 4px;
    border: 1px solid;
  }

  .tier-1 { background: rgba(239,68,68,0.05); border-color: rgba(239,68,68,0.2); }
  .tier-2 { background: rgba(245,158,11,0.05); border-color: rgba(245,158,11,0.2); }
  .tier-3 { background: rgba(34,197,94,0.04); border-color: rgba(34,197,94,0.15); }

  .tier-name {
    font-family: 'Syne', sans-serif;
    font-weight: 700;
    font-size: 12px;
    margin-bottom: 8px;
  }

  .tier-1 .tier-name { color: #ef4444; }
  .tier-2 .tier-name { color: #f59e0b; }
  .tier-3 .tier-name { color: #22c55e; }

  .tier-row {
    font-size: 10px;
    color: #4a5a7a;
    margin-bottom: 3px;
    display: flex;
    gap: 5px;
  }

  .tier-row span { color: #c9d1e8; }

  /* SOLUTION STRUCTURE */
  .struct-input-row {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
    align-items: center;
    flex-wrap: wrap;
  }

  .struct-input {
    background: #0d1322;
    border: 1px solid #1e2a3a;
    border-radius: 3px;
    padding: 8px 14px;
    font-size: 13px;
    color: #00d4ff;
    font-family: 'JetBrains Mono', monospace;
    outline: none;
    transition: border-color 0.2s;
    min-width: 220px;
  }

  .struct-input:focus { border-color: #00d4ff; }

  .struct-type-select {
    background: #0d1322;
    border: 1px solid #1e2a3a;
    border-radius: 3px;
    padding: 8px 12px;
    font-size: 11px;
    color: #c9d1e8;
    font-family: 'JetBrains Mono', monospace;
    outline: none;
    cursor: pointer;
  }

  .tree-container {
    background: #050810;
    border: 1px solid #1e2a3a;
    border-radius: 4px;
    padding: 20px 24px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11.5px;
    line-height: 1.8;
    overflow-x: auto;
  }

  .tree-line { white-space: pre; }
  .tree-dir { color: #00d4ff; font-weight: 600; }
  .tree-file { color: #8899bb; }
  .tree-comment { color: #2a4a2a; }
  .tree-must { color: #ef4444; font-size: 10px; }
  .tree-should { color: #f59e0b; font-size: 10px; }

  .dep-rules {
    margin-top: 16px;
    background: #050810;
    border: 1px solid #1e2a3a;
    border-radius: 4px;
    padding: 16px 20px;
  }

  .dep-rule {
    font-size: 11px;
    padding: 5px 0;
    border-bottom: 1px solid rgba(30,42,58,0.5);
    display: flex;
    gap: 8px;
    align-items: flex-start;
  }

  .dep-rule:last-child { border-bottom: none; }
  .dep-rule-arrow { color: #4a5a7a; flex-shrink: 0; }
  .dep-rule-text { color: #8899bb; }
  .dep-rule-text strong { color: #c9d1e8; }

  .empty-state {
    text-align: center;
    padding: 48px 20px;
    color: #2a3a5a;
    font-size: 13px;
  }

  .empty-state .emoji { font-size: 32px; margin-bottom: 10px; }
`;

const ENTERPRISE_STACK = [
  { concern: "Architecture", lib: "Clean Architecture + CQRS", enf: "MUST" },
  { concern: "API Style", lib: "Minimal API", enf: "SHOULD" },
  { concern: "ORM", lib: "EF Core (write) + Dapper (read)", enf: "MUST" },
  { concern: "Mediator", lib: "MediatR", enf: "SHOULD" },
  { concern: "Messaging", lib: "MassTransit + Outbox", enf: "MUST" },
  { concern: "Caching", lib: "HybridCache + Redis", enf: "SHOULD" },
  { concern: "Observability", lib: "OpenTelemetry + Serilog", enf: "MUST" },
  { concern: "Auth", lib: "JWT Bearer + Entra ID", enf: "MUST" },
  { concern: "Validation", lib: "FluentValidation", enf: "MUST" },
  { concern: "Mapping", lib: "Mapster", enf: "SHOULD" },
  { concern: "Resilience", lib: "MS.Extensions.Http.Resilience", enf: "MUST" },
  { concern: "Result Pattern", lib: "Ardalis.Result", enf: "SHOULD" },
  { concern: "Testing", lib: "xUnit + NSubstitute + Testcontainers", enf: "MUST" },
  { concern: "AI Layer", lib: "Microsoft.Extensions.AI + Semantic Kernel", enf: "SHOULD" },
];

// ─── TABS ─────────────────────────────────────────────────────────────────────

function AdvisorTab() {
  const [selectedTier, setSelectedTier] = useState("all");
  const [selectedProject, setSelectedProject] = useState(null);

  const tiers = ["all", "backend", "frontend", "mobile", "desktop", "serverless", "infra", "tooling"];

  const filtered = selectedTier === "all"
    ? PROJECT_TYPES
    : PROJECT_TYPES.filter(p => p.tier === selectedTier);

  const project = PROJECT_TYPES.find(p => p.id === selectedProject);

  return (
    <div>
      <style>{styles}</style>
      <div className="section-title">Project Type Selector</div>
      <div className="tier-filters">
        {tiers.map(t => (
          <button key={t} className={`tier-btn ${selectedTier === t ? "active" : ""}`} onClick={() => setSelectedTier(t)}>
            {t.toUpperCase()}
          </button>
        ))}
      </div>
      <div className="project-grid">
        {filtered.map(p => (
          <div key={p.id} className={`project-card ${selectedProject === p.id ? "selected" : ""}`} onClick={() => setSelectedProject(p.id === selectedProject ? null : p.id)}>
            {p.isNew && <span className="new-badge">NEW</span>}
            <div className="project-card-icon">{p.icon}</div>
            <div className="project-card-name">{p.label}</div>
            <div className="project-card-tier">{p.tier} · {p.runtime}</div>
          </div>
        ))}
      </div>

      {project ? (
        <div className="detail-panel">
          <div className="detail-panel-title">{project.icon} {project.label}</div>
          <div className="detail-cli">$ {project.cli}</div>
          <div className="detail-grid">
            <div className="detail-item">
              <label>Runtime</label>
              <div className="value">{project.runtime}</div>
            </div>
            <div className="detail-item">
              <label>Typical Use Case</label>
              <div className="value">{project.use}</div>
            </div>
            <div className="detail-item">
              <label>Primary Architecture</label>
              <div>
                <span className="arch-badge">{project.primaryArch}</span>
                {project.altArch !== "N/A" && <span className="alt-badge">{project.altArch}</span>}
              </div>
            </div>
          </div>
          <div className="notes-box">💡 {project.archNotes}</div>
          {(project.tier === "backend" || project.tier === "serverless") && (
            <div className="enterprise-box">
              <div className="enterprise-title">⭐ Enterprise Baseline Stack</div>
              {ENTERPRISE_STACK.slice(0, 8).map((s, i) => (
                <div key={i} className="stack-item">
                  <span className="stack-concern">{s.concern}</span>
                  <span className="stack-lib">{s.lib}</span>
                  <span style={{ marginLeft: "auto" }}>
                    <span className="enf-badge" style={{ background: ENFORCEMENT[s.enf].bg, color: ENFORCEMENT[s.enf].color }}>
                      {ENFORCEMENT[s.enf].label}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="empty-state">
          <div className="emoji">↑</div>
          Select a project type above to see architecture recommendations
        </div>
      )}
    </div>
  );
}

function LibraryTab() {
  const [search, setSearch] = useState("");
  const [activeLayer, setActiveLayer] = useState("all");
  const [enfFilter, setEnfFilter] = useState("all");

  const filtered = useMemo(() => {
    return LIBRARIES.filter(lib => {
      const matchLayer = activeLayer === "all" || lib.layer === activeLayer;
      const matchEnf = enfFilter === "all" || lib.enforcement === enfFilter;
      const q = search.toLowerCase();
      const matchSearch = !q || lib.name.toLowerCase().includes(q) || lib.concern.toLowerCase().includes(q) || lib.notes.toLowerCase().includes(q);
      return matchLayer && matchEnf && matchSearch;
    });
  }, [search, activeLayer, enfFilter]);

  return (
    <div>
      <div className="section-title">Library Explorer</div>
      <div className="lib-controls">
        <input className="search-input" placeholder="Search libraries, concerns..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="struct-type-select" value={enfFilter} onChange={e => setEnfFilter(e.target.value)}>
          <option value="all">All Enforcement</option>
          <option value="MUST">🔒 MUST</option>
          <option value="SHOULD">📋 SHOULD</option>
          <option value="MAY">💡 MAY</option>
        </select>
      </div>
      <div className="layer-filter-bar" style={{ marginBottom: 16 }}>
        <button className={`layer-btn ${activeLayer === "all" ? "active" : ""}`} style={activeLayer === "all" ? { borderColor: "#c9d1e8", color: "#c9d1e8" } : {}} onClick={() => setActiveLayer("all")}>ALL</button>
        {Object.entries(LAYERS).map(([key, val]) => (
          <button key={key} className={`layer-btn ${activeLayer === key ? "active" : ""}`}
            style={activeLayer === key ? { borderColor: val.color, color: val.color, background: `${val.color}10` } : {}}
            onClick={() => setActiveLayer(activeLayer === key ? "all" : key)}>
            {val.label}
          </button>
        ))}
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className="lib-table">
          <thead>
            <tr>
              <th>Layer</th>
              <th>Concern</th>
              <th>Library</th>
              <th>Alternatives</th>
              <th>Enforcement</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(lib => {
              const layer = LAYERS[lib.layer];
              const enf = ENFORCEMENT[lib.enforcement];
              return (
                <tr key={lib.id}>
                  <td>
                    <span className="layer-dot" style={{ background: layer.color }} />
                    <span style={{ fontSize: 10, color: layer.color }}>{layer.label}</span>
                  </td>
                  <td style={{ color: "#8899bb", fontSize: 10, fontWeight: 600 }}>{lib.concern}</td>
                  <td>
                    <span className="lib-name">{lib.name}</span>
                    {lib.oss && <span className="oss-tag">OSS</span>}
                    {lib.isNew && <span className="new-tag">NEW</span>}
                  </td>
                  <td><span className="lib-alt">{lib.alt}</span></td>
                  <td>
                    <span className="enf-badge" style={{ background: enf.bg, color: enf.color }}>
                      {enf.label}
                    </span>
                  </td>
                  <td><span className="lib-notes">{lib.notes}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="empty-state"><div className="emoji">🔍</div>No libraries match your filters</div>}
      </div>
      <div style={{ marginTop: 10, fontSize: 10, color: "#2a3a5a" }}>{filtered.length} of {LIBRARIES.length} libraries shown</div>
    </div>
  );
}

function AntiPatternTab() {
  const [riskFilter, setRiskFilter] = useState("all");
  const risks = ["all", "high", "medium", "low"];

  const filtered = riskFilter === "all" ? ANTIPATTERNS : ANTIPATTERNS.filter(a => a.risk === riskFilter);

  return (
    <div>
      <div className="section-title">Anti-Pattern Guide</div>
      <div className="tier-filters" style={{ marginBottom: 16 }}>
        {risks.map(r => (
          <button key={r} className={`tier-btn ${riskFilter === r ? "active" : ""}`} onClick={() => setRiskFilter(r)}
            style={riskFilter === r && r !== "all" ? {
              borderColor: r === "high" ? "#ef4444" : r === "medium" ? "#f59e0b" : "#22c55e",
              color: r === "high" ? "#ef4444" : r === "medium" ? "#f59e0b" : "#22c55e",
            } : {}}>
            {r.toUpperCase()}
          </button>
        ))}
      </div>
      {filtered.map((ap, i) => (
        <div key={i} className="ap-card">
          <div className="ap-header">
            <span className="ap-tech">{ap.tech}</span>
            <span className={`risk-badge risk-${ap.risk}`}>{ap.risk} risk</span>
          </div>
          <div className="ap-body">
            <div className="ap-col ap-avoid">
              <label>🚫 Avoid When</label>
              <p>{ap.avoid}</p>
            </div>
            <div className="ap-col ap-use">
              <label>✅ Use When</label>
              <p>{ap.use}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function NFRTab() {
  const [activeNFR, setActiveNFR] = useState("performance");
  const nfrKeys = ["performance", "availability", "security", "scalability"];

  const rows = NFRS[activeNFR] || [];

  return (
    <div>
      <div className="section-title">Non-Functional Requirements</div>
      <div className="nfr-tabs">
        {nfrKeys.map(k => (
          <button key={k} className={`nfr-tab ${activeNFR === k ? "active" : ""}`} onClick={() => setActiveNFR(k)}>
            {k.toUpperCase()}
          </button>
        ))}
      </div>

      <table className="nfr-table">
        <thead>
          <tr>
            <th>Metric</th>
            <th>Target</th>
            <th>Enforcement</th>
            <th>Measurement</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const enf = ENFORCEMENT[r.enforcement];
            return (
              <tr key={i}>
                <td className="nfr-metric">{r.metric}</td>
                <td className="nfr-target">{r.target}</td>
                <td>
                  <span className="enf-badge" style={{ background: enf.bg, color: enf.color }}>
                    {enf.label}
                  </span>
                </td>
                <td className="nfr-measure">{r.measurement}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="section-title" style={{ marginTop: 4 }}>Service Tier Classification</div>
      <div className="tier-grid">
        {SERVICE_TIERS.map((t, i) => (
          <div key={i} className={`tier-card tier-${i + 1}`}>
            <div className="tier-name">{t.tier}</div>
            <div className="tier-row">Definition: <span>{t.definition}</span></div>
            <div className="tier-row">Availability: <span>{t.availability}</span></div>
            <div className="tier-row">Performance: <span>{t.perf}</span></div>
            <div className="tier-row" style={{ marginTop: 6, flexWrap: "wrap" }}>Examples: <span style={{ color: "#4a5a7a" }}>{t.examples}</span></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StructureTab() {
  const [serviceName, setServiceName] = useState("Order");
  const [mode, setMode] = useState("single");

  const sn = serviceName || "Service";

  const singleTree = [
    { t: "dir", text: `${sn}Service/` },
    { t: "dir", text: `├── src/` },
    { t: "dir", text: `│   ├── ${sn}.Api/`, comment: "← Presentation (host)" },
    { t: "file", text: `│   │   ├── Endpoints/`, comment: "← One file per feature area" },
    { t: "file", text: `│   │   ├── Filters/`, comment: "← Endpoint filters" },
    { t: "file", text: `│   │   ├── Middleware/` },
    { t: "file", text: `│   │   ├── Program.cs`, comment: "← Composition root (DI, pipeline)" },
    { t: "file", text: `│   │   ├── appsettings.json` },
    { t: "file", text: `│   │   └── Dockerfile`, enf: "SHOULD" },
    { t: "dir", text: `│   ├── ${sn}.Application/`, comment: "← Use cases / CQRS" },
    { t: "file", text: `│   │   ├── Commands/{Feature}/`, comment: "← Command + Handler + Validator" },
    { t: "file", text: `│   │   ├── Queries/{Feature}/`, comment: "← Query + Handler + Validator" },
    { t: "file", text: `│   │   ├── Behaviors/`, comment: "← Pipeline behaviors" },
    { t: "file", text: `│   │   ├── DTOs/`, comment: "← Request/Response models" },
    { t: "file", text: `│   │   ├── Interfaces/`, comment: "← Port interfaces" },
    { t: "file", text: `│   │   └── Mappings/`, comment: "← Mapster type adapter configs" },
    { t: "dir", text: `│   ├── ${sn}.Domain/`, comment: "← ZERO external references" },
    { t: "file", text: `│   │   ├── Entities/`, comment: "← Aggregate roots + child entities" },
    { t: "file", text: `│   │   ├── ValueObjects/`, comment: "← Strongly-typed IDs, Money, etc." },
    { t: "file", text: `│   │   ├── Events/`, comment: "← Domain events (INotification)" },
    { t: "file", text: `│   │   ├── Enums/`, comment: "← SmartEnum types" },
    { t: "file", text: `│   │   ├── Specifications/`, comment: "← Ardalis.Specification queries" },
    { t: "file", text: `│   │   └── Exceptions/`, comment: "← Domain-specific exceptions" },
    { t: "dir", text: `│   └── ${sn}.Infrastructure/`, comment: "← External concerns" },
    { t: "file", text: `│       ├── Persistence/${sn}DbContext.cs` },
    { t: "file", text: `│       ├── Persistence/Configurations/`, comment: "← EF Core entity configs" },
    { t: "file", text: `│       ├── Persistence/Migrations/` },
    { t: "file", text: `│       ├── Repositories/`, comment: "← Specification-based" },
    { t: "file", text: `│       ├── Messaging/`, comment: "← MassTransit consumers + publishers" },
    { t: "file", text: `│       ├── Caching/` },
    { t: "file", text: `│       ├── ExternalServices/`, comment: "← Typed HTTP clients (Refit)" },
    { t: "file", text: `│       └── DependencyInjection.cs`, comment: "← Single DI entry point" },
    { t: "dir", text: `├── tests/` },
    { t: "file", text: `│   ├── ${sn}.UnitTests/`, comment: "← Domain + Application (no I/O)" },
    { t: "file", text: `│   ├── ${sn}.IntegrationTests/`, comment: "← API pipeline + real DB" },
    { t: "file", text: `│   └── ${sn}.ArchitectureTests/`, comment: "← Dependency rule enforcement", enf: "MUST" },
    { t: "file", text: `├── Directory.Build.props`, comment: "← Shared build settings" },
    { t: "file", text: `├── Directory.Packages.props`, comment: "← Central Package Management", enf: "MUST" },
    { t: "file", text: `├── .editorconfig` },
    { t: "file", text: `├── ${sn}Service.sln` },
    { t: "file", text: `└── README.md`, enf: "MUST" },
  ];

  const multiTree = [
    { t: "dir", text: `${sn}System/` },
    { t: "dir", text: `├── src/` },
    { t: "dir", text: `│   ├── ${sn}System.AppHost/`, comment: "← Aspire orchestrator (DEV ONLY)" },
    { t: "dir", text: `│   ├── ${sn}System.ServiceDefaults/`, comment: "← Telemetry, health, resilience", enf: "MUST" },
    { t: "dir", text: `│   ├── ${sn}Service/`, comment: "← Full service structure" },
    { t: "file", text: `│   │   ├── ${sn}.Api/` },
    { t: "file", text: `│   │   ├── ${sn}.Application/` },
    { t: "file", text: `│   │   ├── ${sn}.Domain/` },
    { t: "file", text: `│   │   └── ${sn}.Infrastructure/` },
    { t: "dir", text: `│   ├── InventoryService/`, comment: "← Each service is fully isolated" },
    { t: "file", text: `│   │   ├── Inventory.Api/` },
    { t: "file", text: `│   │   ├── Inventory.Application/` },
    { t: "file", text: `│   │   ├── Inventory.Domain/` },
    { t: "file", text: `│   │   └── Inventory.Infrastructure/` },
    { t: "dir", text: `│   └── Shared/` },
    { t: "file", text: `│       ├── ${sn}System.Contracts/`, comment: "← Shared message/event DTOs ONLY" },
    { t: "file", text: `│       └── ${sn}System.BuildingBlocks/`, comment: "← Abstract base classes, no business logic" },
    { t: "dir", text: `├── tests/` },
    { t: "file", text: `│   ├── ${sn}Service.UnitTests/` },
    { t: "file", text: `│   ├── ${sn}Service.IntegrationTests/` },
    { t: "file", text: `│   ├── InventoryService.UnitTests/` },
    { t: "file", text: `│   └── InventoryService.IntegrationTests/` },
    { t: "file", text: `├── Directory.Build.props` },
    { t: "file", text: `├── Directory.Packages.props`, enf: "MUST" },
    { t: "file", text: `└── ${sn}System.sln` },
  ];

  const tree = mode === "single" ? singleTree : multiTree;

  const depRules = [
    { from: "Domain", to: "(no project references)", note: "Domain is self-contained. ZERO external refs." },
    { from: "Application", to: "Domain", note: "Application depends on Domain only" },
    { from: "Infrastructure", to: "Application, Domain", note: "Infrastructure implements interfaces from Application" },
    { from: "Api", to: "Application, Infrastructure (DI registration only)", note: "Endpoints delegate to MediatR handlers. No business logic." },
  ];

  return (
    <div>
      <div className="section-title">Solution Structure Generator</div>
      <div className="struct-input-row">
        <input
          className="struct-input"
          value={serviceName}
          onChange={e => setServiceName(e.target.value.replace(/[^a-zA-Z0-9]/g, ""))}
          placeholder="ServiceName"
          maxLength={30}
        />
        <select className="struct-type-select" value={mode} onChange={e => setMode(e.target.value)}>
          <option value="single">Single Service</option>
          <option value="multi">Multi-Service (Aspire)</option>
        </select>
      </div>

      <div className="tree-container">
        {tree.map((line, i) => (
          <div key={i} className="tree-line">
            <span className={line.t === "dir" ? "tree-dir" : "tree-file"}>{line.text}</span>
            {line.comment && <span className="tree-comment">   {line.comment}</span>}
            {line.enf && (
              <span className={line.enf === "MUST" ? "tree-must" : "tree-should"}>
                {" "}{"  "}[{line.enf}]
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="section-title" style={{ marginTop: 20 }}>Dependency Rules (CI-Enforced)</div>
      <div className="dep-rules">
        {depRules.map((r, i) => (
          <div key={i} className="dep-rule">
            <span className="dep-rule-arrow">→</span>
            <span className="dep-rule-text">
              <strong>{r.from}</strong> references <strong>{r.to}</strong> — {r.note}
            </span>
          </div>
        ))}
        <div style={{ marginTop: 10, fontSize: 10, color: "#2a4a2a", padding: "6px 0" }}>
          Enforced by NetArchTest.Rules in {sn}.ArchitectureTests. Build MUST fail if violated.
        </div>
      </div>
    </div>
  );
}

// ─── APP ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: "advisor", label: "🎯 Project Advisor" },
  { id: "libraries", label: "📚 Library Explorer" },
  { id: "antipatterns", label: "🚫 Anti-Patterns" },
  { id: "nfr", label: "📏 NFR Dashboard" },
  { id: "structure", label: "📁 Solution Structure" },
];

export default function App() {
  const [activeTab, setActiveTab] = useState("advisor");

  return (
    <div className="advisor">
      <style>{styles}</style>
      <div className="header">
        <div className="header-title">
          <span className="dot" />
          .NET Architecture Advisor
        </div>
        <div className="header-sub">Enterprise baseline · April 2026 · v1.0</div>
        <div className="tabs">
          {TABS.map(t => (
            <button key={t.id} className={`tab ${activeTab === t.id ? "active" : ""}`} onClick={() => setActiveTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="content">
        {activeTab === "advisor" && <AdvisorTab />}
        {activeTab === "libraries" && <LibraryTab />}
        {activeTab === "antipatterns" && <AntiPatternTab />}
        {activeTab === "nfr" && <NFRTab />}
        {activeTab === "structure" && <StructureTab />}
      </div>
    </div>
  );
}
