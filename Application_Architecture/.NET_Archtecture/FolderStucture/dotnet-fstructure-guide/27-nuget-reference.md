> [← GraphQL](26-graphql.md)  |  [🏠 Index](README.md)

## Updated Quick Reference — Full NuGet Package List

| Concern | Package | Notes |
|---|---|---|
| CQRS / Mediator | `MediatR` | v12+ for .NET 8 |
| Validation | `FluentValidation.AspNetCore` | |
| Mapping | `Mapperly` | Source-generated — preferred |
| ORM | `Microsoft.EntityFrameworkCore` | EF 8 / 9 |
| Micro-ORM | `Dapper` | Read side / CQRS |
| Caching | Built-in `HybridCache` (.NET 9) | |
| Rate Limiting | Built-in `System.Threading.RateLimiting` | |
| Resilience | `Microsoft.Extensions.Http.Resilience` | Polly v8 |
| Messaging | `MassTransit.RabbitMQ` / `.AzureServiceBus` / `.Kafka` | |
| Logging | `Serilog.AspNetCore` | |
| Log Sinks | `Serilog.Sinks.Seq`, `Serilog.Sinks.OpenTelemetry` | |
| Observability | `OpenTelemetry.Extensions.Hosting` | |
| Traces | `OpenTelemetry.Instrumentation.AspNetCore` | |
| Metrics | `OpenTelemetry.Exporter.Prometheus.AspNetCore` | |
| API Gateway | `Yarp.ReverseProxy` | |
| Auth | `Microsoft.Identity.Web` | |
| API Versioning | `Asp.Versioning.Http` / `Asp.Versioning.Mvc` | |
| Feature Flags | `Microsoft.FeatureManagement.AspNetCore` | |
| Background Jobs | `Hangfire.AspNetCore` or `Quartz.AspNetCore` | |
| Real-time | `Microsoft.AspNetCore.SignalR` (built-in) | |
| gRPC | `Grpc.AspNetCore` | |
| gRPC Transcoding | `Microsoft.AspNetCore.Grpc.JsonTranscoding` | |
| gRPC Swagger | `Microsoft.AspNetCore.Grpc.Swagger` | |
| OData | `Microsoft.AspNetCore.OData` | |
| OData Model Builder | `Microsoft.OData.ModelBuilder` | |
| OData Client | `Simple.OData.Client` | Typed .NET OData client |
| GraphQL Server | `HotChocolate.AspNetCore` | |
| GraphQL + EF Core | `HotChocolate.Data.EntityFramework` | |
| GraphQL Auth | `HotChocolate.AspNetCore.Authorization` | |
| GraphQL Subscriptions | `HotChocolate.Subscriptions.Redis` | |
| GraphQL Client | `StrawberryShake.Transport.Http` | |
| Blob Storage | `Azure.Storage.Blobs` | |
| Key Vault | `Azure.Extensions.AspNetCore.Configuration.Secrets` | |
| App Config | `Microsoft.Azure.AppConfiguration.AspNetCore` | |
| Result Pattern | `ardalis.Result` or `FluentResults` | |
| Guard Clauses | `ardalis.GuardClauses` | |
| Specification | `ardalis.Specification` | |
| Saga | `MassTransit` (built-in state machine) | |
| Endpoint Library | `FastEndpoints` | Minimal API alternative |
| Architecture Tests | `NetArchTest.Rules` | |
| API Testing | `Microsoft.AspNetCore.Mvc.Testing` | |
| Mocking | `NSubstitute` (preferred) or `Moq` | |
| OpenAPI (.NET 9) | `Microsoft.AspNetCore.OpenApi` | Built-in |
| OpenAPI (.NET 8) | `Swashbuckle.AspNetCore` | |
| Dapr | `Dapr.AspNetCore` | Optional service mesh |
| Response Compression | Built-in `Microsoft.AspNetCore.ResponseCompression` | |

---

*Stack: .NET 8 / 9 / 10 — ASP.NET Core — C# 12 / 13 — EF Core 8 / 9*
*Last reviewed: March 2026*
