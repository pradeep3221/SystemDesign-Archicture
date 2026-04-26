> [← Vertical Slice Architecture](05-vertical-slice.md)  |  [Common Concerns →](07-common-concerns.md)  |  [🏠 Index](README.md)

## 7. .NET Aspire — Cloud-Native Apps

**[.NET Aspire](https://learn.microsoft.com/en-us/dotnet/aspire/get-started/aspire-overview)** is an opinionated, cloud-ready stack for building observable, distributed applications. Introduced with .NET 8.

### What Aspire Provides

| Concern | How Aspire Handles It |
|---|---|
| **Service discovery** | Automatic — services find each other by name |
| **Health checks** | Built-in dashboard + per-resource health |
| **Telemetry** | OpenTelemetry pre-wired (traces, metrics, logs) |
| **Local dev orchestration** | `AppHost` project launches all services + dependencies |
| **Integrations** | Redis, PostgreSQL, SQL Server, RabbitMQ, Kafka, Azure Service Bus, etc. |

### Solution Structure with Aspire

```
MyApp.AppHost/          # Aspire orchestrator — defines the distributed app
MyApp.ServiceDefaults/  # Shared defaults: OTel, health checks, resiliency
MyApp.API/              # Your API service
MyApp.Worker/           # Background worker service
MyApp.Web/              # Blazor / frontend
```

### AppHost Example

```csharp
var builder = DistributedApplication.CreateBuilder(args);

var postgres = builder.AddPostgres("postgres")
                      .AddDatabase("orderdb");

var redis = builder.AddRedis("cache");

var api = builder.AddProject<Projects.MyApp_API>("api")
                 .WithReference(postgres)
                 .WithReference(redis);

builder.AddProject<Projects.MyApp_Web>("web")
       .WithReference(api);

builder.Build().Run();
```

### ServiceDefaults (shared across all services)

```csharp
// Program.cs in each service
builder.AddServiceDefaults(); // Adds OTel, health checks, service discovery, resiliency

// What AddServiceDefaults() wires up automatically:
// - OpenTelemetry (traces + metrics via OTLP)
// - Health check endpoints (/health, /alive)
// - Service discovery (for HttpClient)
// - Keyed HttpClient resiliency via Microsoft.Extensions.Http.Resilience
```

---
