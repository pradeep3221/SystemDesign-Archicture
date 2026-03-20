# .NET Solution Structures — .NET 8 / 9 / 10

> A reference guide for architecting modern .NET APIs targeting **.NET 8, 9, and 10** —
> covering layered architecture, DDD, Clean Architecture, Vertical Slice, and cross-cutting concerns.
> Updated for C# 12/13 features, Minimal APIs, .NET Aspire, Native AOT, and modern tooling.

---

## Table of Contents

1. [Platform Overview — .NET 8 / 9 / 10](#1-platform-overview--net-8--9--10)
2. [Tiered Structure](#2-tiered-structure)
3. [API n-Layered Architecture](#3-api-n-layered-architecture)
   - [Domain Logic Patterns](#domain-logic-patterns)
   - [Presentation / Services Layer](#presentationservices-layer)
   - [Business Layer](#business-layer)
   - [Data / Persistence Layer](#datapersistence-layer)
   - [Tests](#tests)
   - [Cross-Cutting Concerns](#cross-cutting-concerns)
4. [DDD Architecture](#4-ddd-architecture)
5. [Clean Architecture](#5-clean-architecture)
6. [Vertical Slice Architecture](#6-vertical-slice-architecture)
7. [.NET Aspire — Cloud-Native Apps](#7-net-aspire--cloud-native-apps)
8. [Common Concerns](#8-common-concerns)
   - [API Technology](#api-technology)
   - [Minimal APIs vs Controller APIs](#minimal-apis-vs-controller-apis)
   - [DB Access and ORM](#db-access-and-orm)
   - [Dependency Injection](#dependency-injection)
   - [Caching](#caching)
   - [Rate Limiting](#rate-limiting)
   - [Resilience](#resilience)
   - [Localization](#localization)
   - [Exception Handling](#exception-handling)
   - [Validations](#validations)
   - [Constants](#constants)
   - [Health Checks](#health-checks)
   - [OpenAPI / Swagger](#openapi--swagger)
   - [Async Methods](#async-methods)
9. [Security & Authentication](#9-security--authentication)
10. [Microservices Patterns](#10-microservices-patterns)
11. [Messaging & Event-Driven](#11-messaging--event-driven)
12. [Observability — OpenTelemetry, Serilog, Seq & Grafana](#12-observability--opentelemetry-serilog-seq--grafana)
13. [API Versioning](#13-api-versioning)
14. [Configuration & Options Pattern](#14-configuration--options-pattern)
15. [Background Jobs & Scheduling](#15-background-jobs--scheduling)
16. [Feature Flags](#16-feature-flags)
17. [Pagination](#17-pagination)
18. [Multi-Tenancy](#18-multi-tenancy)
19. [File Upload & Download](#19-file-upload--download)
20. [Response Compression](#20-response-compression)
21. [JSON Options & Output Formatting](#21-json-options--output-formatting)
22. [Middleware Pipeline & Ordering](#22-middleware-pipeline--ordering)
23. [Native AOT](#23-native-aot)
24. [SignalR — Real-Time Communication](#24-signalr--real-time-communication)
25. [gRPC](#25-grpc)

---

## 1. Platform Overview — .NET 8 / 9 / 10

| Version | Status | C# Version | Key Theme |
|---|---|---|---|
| **.NET 8** | LTS (supported until Nov 2026) | C# 12 | Performance, Native AOT, Aspire preview |
| **.NET 9** | STS (supported until May 2026) | C# 13 | Cloud-native, HybridCache, OpenAPI built-in |
| **.NET 10** | LTS (Preview / Nov 2025) | C# 14 | Continued perf + tooling improvements |

### Key C# 12 Features (.NET 8)
- **Primary constructors** on classes and structs
- **Collection expressions** `[1, 2, 3]`
- **Inline arrays**
- `ref readonly` parameters
- Default lambda parameters

### Key C# 13 Features (.NET 9)
- `params` with any collection type (not just arrays)
- New `Lock` type for thread synchronisation
- Partial properties and indexers
- `allows ref struct` generic constraint

---

## 2. Tiered Structure

```
Browser / Client
      ↓
Web Server  (Blazor / React / Angular / MVC)
      ↓
API Server  (ASP.NET Core — REST / gRPC / GraphQL / Minimal API)
      ↓
Database Server  (SQL Server / PostgreSQL / MongoDB / Redis)
```

> In **cloud-native** / microservices scenarios, the API layer is orchestrated via
> **Kubernetes** + an API Gateway (YARP, Azure API Management, Nginx) and observed
> via **OpenTelemetry** + a telemetry backend (Seq, Grafana, Azure Monitor).

---

## 3. Traditional Layered (N-Tier) Structure (API n-Layered Architecture
)
> Always include a Unit Test project and a DB project in the solution.

---

### Domain Logic Patterns

| Pattern | Description | When to Use |
|---|---|---|
| **Transaction Script** | All logic in a single procedure, calls DB directly | Simple CRUD, low business complexity |
| **Table Module** | One class per DB table handles data + logic | Medium complexity, tabular data |
| **Domain Model (DDD)** | Objects encapsulate behaviour + data | Complex, rules-heavy domains |
| **Service Layer** | Sits over Domain Model / Table Module | Defining application boundaries |
| **CQRS** | Separate read and write models | High-scale, performance-sensitive |
| **Logic in SQL** | Stored procedures via Row/Table Data Gateway | Legacy systems, DBA-owned logic |

#### Domain Model Sub-Types
- **Anaemic Domain Model** — entities hold only data (POCO). Simple but not fully OO.
- **Rich Domain Model** — entities contain data + behaviour. Preferred for DDD.

---

### Presentation/Services Layer

**Key Responsibilities:**
- Async/Await endpoints with cancellation token support
- Long-running tasks → `202 Accepted` + background processing (`IHostedService` / Worker Services)
- Global Exception Handling via `IExceptionHandler` (.NET 8+)
- **Problem Details** (`IProblemDetailsService`) for standardised error responses
- Built-in **OpenAPI** support (.NET 9+) — no Swashbuckle dependency required
- Health Checks, Rate Limiting, Output Caching

#### Projects

| Project | Purpose |
|---|---|
| `<ProjectName>.API` | Minimal API endpoints or Controller-based REST / gRPC / GraphQL |
| `<ProjectName>.APIModels` | Request / Response DTOs (ViewModels) |
| `<ProjectName>.Contracts` | Shared contracts (for inter-service or SDK scenarios) |

#### APIModels Detail
- **DTOs** for all requests and responses — never expose DB models directly
  - [FluentValidation](https://docs.fluentvalidation.net/en/latest/) for request validation
  - AutoMapper or **Mapperly** (source-generated, zero-reflection, preferred in .NET 8+)
    - ⚠️ [Anti-Pattern: Exposing your database model as your API](https://shekhargulati.com/2021/10/15/web-api-design-anti-pattern-exposing-your-database-model/)
- **Problem Details** (`RFC 9457`) as the standard error response shape
- **Response and Error abstraction** via `Results<T1, T2>` in Minimal APIs

#### Minimal API Endpoint Example (.NET 8+)

```csharp
// Endpoint group using IEndpointRouteBuilder extension
app.MapGroup("/orders")
   .WithTags("Orders")
   .RequireAuthorization()
   .MapOrderEndpoints();

// Endpoint definition
public static class OrderEndpoints
{
    public static RouteGroupBuilder MapOrderEndpoints(this RouteGroupBuilder group)
    {
        group.MapPost("/", CreateOrder)
             .WithSummary("Create a new order")
             .WithOpenApi()
             .Produces<OrderResponse>(201)
             .ProducesValidationProblem();

        return group;
    }

    private static async Task<Results<Created<OrderResponse>, ValidationProblem>>
        CreateOrder(
            CreateOrderRequest request,
            IOrderService orderService,
            CancellationToken ct)
    {
        var result = await orderService.CreateAsync(request, ct);
        return TypedResults.Created($"/orders/{result.Id}", result);
    }
}
```

---

### Business Layer

> Business logic must always live server-side. Multiple front ends (web, mobile, IoT) must not duplicate it.

#### Primary Constructor Pattern (C# 12 / .NET 8)

```csharp
// Before .NET 8 — verbose constructor
public class OrderService : IOrderService
{
    private readonly IOrderRepository _repo;
    private readonly ILogger<OrderService> _logger;

    public OrderService(IOrderRepository repo, ILogger<OrderService> logger)
    {
        _repo = repo;
        _logger = logger;
    }
}

// .NET 8+ — primary constructor (preferred)
public class OrderService(IOrderRepository repo, ILogger<OrderService> logger) : IOrderService
{
    public async Task<OrderResponse> CreateAsync(CreateOrderRequest request, CancellationToken ct)
    {
        logger.LogInformation("Creating order for {CustomerId}", request.CustomerId);
        // ...
    }
}
```

#### Projects

| Project | Purpose |
|---|---|
| `<ProjectName>.Application` | Use cases, application services, CQRS handlers |
| `<ProjectName>.Domain` | Entities, value objects, domain events, interfaces |
| `<ProjectName>.BusinessRules` | Isolated, testable business rules |

---

### Data/Persistence Layer

#### Projects

| Project | Purpose |
|---|---|
| `<ProjectName>.Infrastructure` | EF Core, Dapper, external services, repositories |
| `<ProjectName>.DataModel` | Entity classes, value converters, strongly-typed IDs |
| `<ProjectName>.Migrations` | EF Core migrations (separate project recommended) |

#### Strongly-Typed Entity IDs (still essential in .NET 8+)

```csharp
// Define typed IDs using readonly record struct (zero overhead)
public readonly record struct OrderId(Guid Value)
{
    public static OrderId New() => new(Guid.NewGuid());
    public static OrderId Empty => new(Guid.Empty);
    public override string ToString() => Value.ToString();
}

public readonly record struct CustomerId(Guid Value)
{
    public static CustomerId New() => new(Guid.NewGuid());
}

public class Order
{
    public OrderId Id { get; private set; } = OrderId.New();
    public CustomerId CustomerId { get; private set; }
}

// EF Core — register value converter
protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
{
    configurationBuilder
        .Properties<OrderId>()
        .HaveConversion<OrderIdConverter>();
}
```

#### EF Core 8 / 9 Key Features

```csharp
// Complex types (EF Core 8) — owned types without a key
[ComplexType]
public class Address
{
    public string Street { get; set; } = null!;
    public string City { get; set; } = null!;
    public string PostCode { get; set; } = null!;
}

// JSON columns (EF Core 8) — store object graph as JSON
public class Order
{
    public int Id { get; set; }
    public List<OrderTag> Tags { get; set; } = [];      // stored as JSON column
}

modelBuilder.Entity<Order>().OwnsMany(o => o.Tags, b => b.ToJson());

// Raw SQL with parameters — safe interpolation (EF Core 8)
var orders = await context.Orders
    .FromSql($"SELECT * FROM Orders WHERE CustomerId = {customerId}")
    .ToListAsync();

// ExecuteUpdate / ExecuteDelete — skip change tracker for bulk ops (EF Core 7+)
await context.Orders
    .Where(o => o.Status == OrderStatus.Pending)
    .ExecuteUpdateAsync(s => s.SetProperty(o => o.Status, OrderStatus.Cancelled));
```

#### Repository Pattern

```csharp
// Generic repository interface
public interface IRepository<TEntity, TId>
    where TEntity : Entity<TId>
{
    Task<TEntity?> GetByIdAsync(TId id, CancellationToken ct = default);
    Task<IReadOnlyList<TEntity>> GetAllAsync(CancellationToken ct = default);
    Task AddAsync(TEntity entity, CancellationToken ct = default);
    Task UpdateAsync(TEntity entity, CancellationToken ct = default);
    Task DeleteAsync(TEntity entity, CancellationToken ct = default);
}

// Unit of Work
public interface IUnitOfWork
{
    Task<int> SaveChangesAsync(CancellationToken ct = default);
}
```

---

### Tests

| Project | Framework | Scope |
|---|---|---|
| `<ProjectName>.API.Tests` | xUnit + `WebApplicationFactory<T>` | Integration / contract tests |
| `<ProjectName>.Application.Tests` | xUnit + NSubstitute / Moq | Unit tests for use cases |
| `<ProjectName>.Domain.Tests` | xUnit | Pure domain logic tests |
| `<ProjectName>.Architecture.Tests` | ArchUnitNET / NetArchTest | Enforce architectural rules |

#### Integration Test with WebApplicationFactory (.NET 8)

```csharp
public class OrderApiTests(WebApplicationFactory<Program> factory)
    : IClassFixture<WebApplicationFactory<Program>>
{
    [Fact]
    public async Task CreateOrder_Returns201_WhenValid()
    {
        var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync("/orders", new
        {
            CustomerId = Guid.NewGuid(),
            Items = new[] { new { ProductId = 1, Quantity = 2 } }
        });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
    }
}
```

#### Architecture Tests

```csharp
// Enforce that Domain has no dependency on Infrastructure
[Fact]
public void Domain_Should_Not_Reference_Infrastructure()
{
    var result = Types.InAssembly(DomainAssembly)
        .ShouldNot()
        .HaveDependencyOn("MyApp.Infrastructure")
        .GetResult();

    result.IsSuccessful.Should().BeTrue();
}
```

---

### Cross-Cutting Concerns

| Project | Package(s) | Notes |
|---|---|---|
| `<ProjectName>.Caching` | `HybridCache` (.NET 9 built-in) | Replaces IMemoryCache + IDistributedCache combo |
| `<ProjectName>.Logging` | `Serilog.AspNetCore`, `Serilog.Sinks.OpenTelemetry` | Structured logging |
| `<ProjectName>.Observability` | `OpenTelemetry.Extensions.Hosting` | Traces, metrics, logs |
| `<ProjectName>.Mapper` | [Mapperly](https://github.com/riok/mapperly) (source-gen) or AutoMapper | Mapperly preferred — zero reflection |
| `<ProjectName>.Validation` | `FluentValidation.AspNetCore`, [ardalis/GuardClauses](https://github.com/ardalis/GuardClauses) | |
| `<ProjectName>.Security` | `Microsoft.Identity.Web`, built-in Data Protection | |
| `<ProjectName>.RateLimiting` | Built-in `System.Threading.RateLimiting` (.NET 7+) | No extra package needed |

#### Other Aspects
- WebHooks
- Background workers via `IHostedService` / `BackgroundService`
- Output Caching (built-in .NET 7+)
- OpenTelemetry for distributed tracing

---

### Dependency Between Layers

```
Presentation / API Layer
        ↓
Application Layer  (use cases, CQRS, DTOs)
        ↓
Domain Layer  (entities, value objects, domain events, interfaces)
        ↑
Infrastructure Layer  (implements domain interfaces: repos, EF, external services)
```

> The **Infrastructure layer** depends on the **Domain layer** (implements its interfaces),
> but the **Domain layer** knows nothing about Infrastructure — Dependency Inversion in action.

---

## 4. DDD Architecture

DDD underpins **Onion**, **Clean**, and **Hexagonal** architectures.

**References:**
- [Design a DDD-oriented microservice — Microsoft](https://docs.microsoft.com/en-us/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/ddd-oriented-microservice)
- [ABP Framework DDD solution structure](https://docs.abp.io/en/abp/latest/Startup-Templates/Application)
- [A Template for Clean DDD Architecture](https://blog.jacobsdata.com/2020/03/02/a-clean-domain-driven-design-architectural-template)

### Layers in DDD

#### 1. Domain Model Layer

Follows [Persistence Ignorance](https://deviq.com/persistence-ignorance/) — the domain has zero knowledge of how it is stored.

| Building Block | .NET 8/9/10 Implementation |
|---|---|
| **Entities** | POCO with primary constructors; enforce invariants in constructors |
| **Aggregate Root** | Base class with `IReadOnlyList<IDomainEvent> DomainEvents` |
| **Value Objects** | `readonly record struct` or `record` — immutable by design |
| **Domain Events** | `INotification` (MediatR) raised inside aggregate methods |
| **Repository Interfaces** | Defined in Domain, implemented in Infrastructure |
| **Specifications** | [ardalis/Specification](https://github.com/ardalis/Specification) |

```csharp
// Value Object using record struct (C# 10+, ideal in .NET 8)
public readonly record struct Money(decimal Amount, string Currency)
{
    public static Money Zero(string currency) => new(0, currency);
    public Money Add(Money other)
    {
        if (Currency != other.Currency)
            throw new InvalidOperationException("Currency mismatch");
        return new(Amount + other.Amount, Currency);
    }
}

// Aggregate Root with Domain Events
public abstract class AggregateRoot<TId>
{
    private readonly List<IDomainEvent> _domainEvents = [];
    public IReadOnlyList<IDomainEvent> DomainEvents => _domainEvents.AsReadOnly();

    protected void RaiseDomainEvent(IDomainEvent domainEvent) =>
        _domainEvents.Add(domainEvent);

    public void ClearDomainEvents() => _domainEvents.Clear();
}

public class Order : AggregateRoot<OrderId>
{
    private readonly List<OrderLine> _lines = [];
    public IReadOnlyList<OrderLine> Lines => _lines.AsReadOnly();
    public OrderStatus Status { get; private set; } = OrderStatus.Draft;

    public void AddLine(ProductId productId, int quantity, Money unitPrice)
    {
        Guard.Against.NegativeOrZero(quantity, nameof(quantity));
        _lines.Add(new OrderLine(productId, quantity, unitPrice));
        RaiseDomainEvent(new OrderLineAddedEvent(Id, productId));
    }

    public void Submit()
    {
        if (!_lines.Any()) throw new DomainException("Cannot submit an empty order.");
        Status = OrderStatus.Submitted;
        RaiseDomainEvent(new OrderSubmittedEvent(Id));
    }
}
```

#### 2. Application Layer (CQRS with MediatR)

```csharp
// Command
public record CreateOrderCommand(Guid CustomerId, List<OrderLineDto> Lines)
    : IRequest<Result<OrderId>>;

// Command Handler
public class CreateOrderCommandHandler(
    IOrderRepository orderRepository,
    IUnitOfWork unitOfWork)
    : IRequestHandler<CreateOrderCommand, Result<OrderId>>
{
    public async Task<Result<OrderId>> Handle(
        CreateOrderCommand command, CancellationToken ct)
    {
        var order = Order.Create(new CustomerId(command.CustomerId));

        foreach (var line in command.Lines)
            order.AddLine(new ProductId(line.ProductId), line.Quantity,
                          new Money(line.UnitPrice, "USD"));

        await orderRepository.AddAsync(order, ct);
        await unitOfWork.SaveChangesAsync(ct);

        return Result.Success(order.Id);
    }
}

// Query — use Dapper for reads (no EF overhead)
public record GetOrderByIdQuery(Guid OrderId) : IRequest<OrderDto?>;

public class GetOrderByIdQueryHandler(IDbConnection db)
    : IRequestHandler<GetOrderByIdQuery, OrderDto?>
{
    public async Task<OrderDto?> Handle(GetOrderByIdQuery query, CancellationToken ct)
    {
        const string sql = """
            SELECT o.Id, o.Status, c.Name AS CustomerName
            FROM Orders o
            JOIN Customers c ON c.Id = o.CustomerId
            WHERE o.Id = @OrderId
            """;

        return await db.QueryFirstOrDefaultAsync<OrderDto>(
            sql, new { query.OrderId });
    }
}
```

#### 3. Infrastructure / Persistence Layer

```csharp
// EF Core DbContext (.NET 8 — automatically publishes Domain Events)
public class AppDbContext(DbContextOptions<AppDbContext> options, IPublisher publisher)
    : DbContext(options)
{
    public DbSet<Order> Orders => Set<Order>();

    public override async Task<int> SaveChangesAsync(CancellationToken ct = default)
    {
        var result = await base.SaveChangesAsync(ct);

        // Dispatch domain events after saving
        var domainEvents = ChangeTracker.Entries<AggregateRoot<OrderId>>()
            .SelectMany(e => e.Entity.DomainEvents)
            .ToList();

        foreach (var de in domainEvents)
            await publisher.Publish(de, ct);

        return result;
    }
}
```

### Other DDD Concepts

| Concept | Library / Approach |
|---|---|
| **CQRS** | [MediatR v12](https://github.com/jbogard/MediatR) |
| **Event Sourcing** | [Marten](https://martendb.io/) (PostgreSQL-backed) or [EventStoreDB](https://github.com/EventStore/EventStore) |
| **CQRS + ES** | [EventFlow](https://github.com/eventflow/EventFlow) |
| **Result Pattern** | [ardalis/Result](https://github.com/ardalis/Result) or [FluentResults](https://github.com/altmann/FluentResults) |
| **Specification** | [ardalis/Specification](https://github.com/ardalis/Specification) |

#### Sample Projects
- [eShopOnContainers](https://github.com/dotnet-architecture/eShopOnContainers)
- [clean-architecture-dotnet](https://github.com/thangchung/clean-architecture-dotnet)
- [jasontaylordev/CleanArchitecture](https://github.com/jasontaylordev/CleanArchitecture) ⭐ (actively maintained for .NET 8/9)
- [ardalis/CleanArchitecture](https://github.com/ardalis/CleanArchitecture)

---

## 5. Clean Architecture (Onion) Structure

Also known as **Onion Architecture** or **Hexagonal Architecture** (Ports & Adapters).

**Key Principle:** Domain at the centre. All dependencies point **inward**. Infrastructure and UI are plugins.

```
┌──────────────────────────────────────────┐
│              Infrastructure               │  EF Core, HTTP clients, Email, etc.
│  ┌────────────────────────────────────┐  │
│  │            Application             │  │  Use cases, CQRS, DTOs, Interfaces
│  │  ┌──────────────────────────────┐  │  │
│  │  │           Domain             │  │  │  Entities, Value Objects, Events
│  │  └──────────────────────────────┘  │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
              ↑
         Presentation
    (API, Minimal API, Blazor)
```

### Recommended Clean Architecture Solution Layout

```
src/
  MyApp.Domain/            # Entities, Value Objects, Domain Events, Interfaces
  MyApp.Application/       # Use Cases, CQRS, DTOs, Validators, Behaviours
  MyApp.Infrastructure/    # EF Core, Repos, External Services, Email, Storage
  MyApp.API/               # Minimal API endpoints, Middleware, Program.cs

tests/
  MyApp.Domain.Tests/
  MyApp.Application.Tests/
  MyApp.API.IntegrationTests/
  MyApp.Architecture.Tests/
```

### MediatR Pipeline Behaviours (.NET 8)

```csharp
// Register behaviours — run in order for every command/query
builder.Services.AddMediatR(cfg =>
{
    cfg.RegisterServicesFromAssembly(ApplicationAssembly);
    cfg.AddOpenBehavior(typeof(LoggingBehaviour<,>));
    cfg.AddOpenBehavior(typeof(ValidationBehaviour<,>));
    cfg.AddOpenBehavior(typeof(TransactionBehaviour<,>));
});

// Validation behaviour — runs FluentValidation before the handler
public class ValidationBehaviour<TRequest, TResponse>(
    IEnumerable<IValidator<TRequest>> validators)
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : IRequest<TResponse>
{
    public async Task<TResponse> Handle(
        TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken ct)
    {
        if (!validators.Any()) return await next();

        var context = new ValidationContext<TRequest>(request);
        var failures = validators
            .Select(v => v.Validate(context))
            .SelectMany(r => r.Errors)
            .Where(f => f != null)
            .ToList();

        if (failures.Count != 0)
            throw new ValidationException(failures);

        return await next();
    }
}
```

---

## 6.  Feature-Based (Vertical Slice) Structure -- Vertical Slice Architecture (VSA)

Organise code around **features** rather than horizontal layers. Each slice is fully self-contained end-to-end.

### Core Concepts

| Concept | Description |
|---|---|
| **Slice** | One complete feature — e.g., `CreateOrder`, `GetCustomerDetails` |
| **Independent Units** | Each slice owns its handler, validation, domain logic, and DB call |
| **CQRS Friendly** | Natural fit for Command/Query separation |
| **Minimal Coupling** | No shared service/repository layers unless genuinely needed |

### Common Tools

| Tool | Purpose |
|---|---|
| [MediatR v12](https://github.com/jbogard/MediatR) | In-process request / handler messaging |
| [FastEndpoints](https://fast-endpoints.com/) | High-performance endpoint library, alternative to Minimal APIs |
| [Carter](https://github.com/CarterCommunity/Carter) | Module-based routing for Minimal APIs |
| [FluentValidation](https://docs.fluentvalidation.net) | Per-slice input validation |
| Entity Framework Core / Dapper | Per-slice data access |
| ASP.NET Core Minimal APIs | Natural fit for slice-per-file design |

### Solution Structure

```
src/
  MyApp.API/
    Features/
      Orders/
        CreateOrder/
          CreateOrderCommand.cs
          CreateOrderHandler.cs
          CreateOrderValidator.cs
          CreateOrderEndpoint.cs
        GetOrder/
          GetOrderQuery.cs
          GetOrderHandler.cs
          GetOrderEndpoint.cs
      Customers/
        GetCustomerDetails/
          GetCustomerDetailsQuery.cs
          GetCustomerDetailsHandler.cs
          GetCustomerDetailsEndpoint.cs
    Program.cs
```

### Slice Example (FastEndpoints, .NET 8)

```csharp
public class CreateOrderEndpoint : Endpoint<CreateOrderRequest, CreateOrderResponse>
{
    public override void Configure()
    {
        Post("/orders");
        Roles("Customer");
        Description(b => b.WithSummary("Create a new order").WithTags("Orders"));
    }

    public override async Task HandleAsync(CreateOrderRequest req, CancellationToken ct)
    {
        var order = Order.Create(new CustomerId(req.CustomerId));
        // ...
        await SendCreatedAtAsync<GetOrderEndpoint>(
            new { Id = order.Id.Value },
            new CreateOrderResponse(order.Id.Value),
            cancellation: ct);
    }
}
```

### When to Use
- **Modular**, feature-rich systems
- **Microservices**, event-driven, or CQRS architectures
- Greenfield projects or incremental monolith refactors
- When you want feature folders to scale without cross-cutting abstractions

---

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

## 8. Common Concerns

### API Technology

| Protocol | Best For | .NET Support |
|---|---|---|
| **REST (HTTP/1.1 & HTTP/2)** | General-purpose, browser-facing | `Microsoft.AspNetCore` |
| **gRPC** | Microservice-to-microservice, high throughput | `Grpc.AspNetCore` |
| **GraphQL** | Flexible front-end queries | `Hot Chocolate` / `Strawberry Shake` |
| **SignalR** | Real-time push (WebSockets / SSE) | Built-in |
| **gRPC-Web** | gRPC from browser clients | `Grpc.AspNetCore.Web` |

---

### Minimal APIs vs Controller APIs

| | Minimal APIs | Controller APIs |
|---|---|---|
| **Performance** | ✅ Faster startup, Native AOT friendly | Slower (reflection-heavy) |
| **Verbosity** | ✅ Less boilerplate | More ceremony |
| **Organising endpoints** | Route groups, `IEndpointRouteBuilder` extensions | Controllers / Actions |
| **Model binding** | ✅ `[AsParameters]`, `[FromBody]`, etc. | `[FromBody]`, `[FromQuery]` |
| **Filters** | Endpoint filters | Action / resource filters |
| **Best for** | New projects, microservices, .NET 8+ | Legacy codebases, complex filter pipelines |

```csharp
// Organising Minimal APIs with route groups (.NET 7+)
var v1 = app.MapGroup("/api/v1").RequireAuthorization();

v1.MapGroup("/orders").MapOrderEndpoints();
v1.MapGroup("/customers").MapCustomerEndpoints();

// Typed Results — compile-time safe return types
private static async Task<Results<Ok<OrderDto>, NotFound>>
    GetOrder(OrderId id, IOrderRepository repo, CancellationToken ct)
{
    var order = await repo.GetByIdAsync(id, ct);
    return order is null ? TypedResults.NotFound() : TypedResults.Ok(order.ToDto());
}
```

---

### DB Access and ORM

#### Entity Framework Core 8 / 9

| Feature | Version |
|---|---|
| Complex types (owned, no key) | EF 8 |
| JSON columns (ToJson) | EF 7 / 8 |
| Raw SQL with safe interpolation | EF 8 |
| `ExecuteUpdate` / `ExecuteDelete` (bulk) | EF 7 |
| `HierarchyId` support (SQL Server) | EF 8 |
| Unmapped queries (`SqlQuery<T>`) | EF 8 |
| Sentinel values for optional properties | EF 8 |
| `TimeProvider` support in seeding | EF 9 |

#### Dapper (read side in CQRS)

```csharp
// Dapper with strongly-typed IDs — register type handler
public class OrderIdTypeHandler : SqlMapper.TypeHandler<OrderId>
{
    public override OrderId Parse(object value) => new((Guid)value);
    public override void SetValue(IDbDataParameter param, OrderId value)
        => param.Value = value.Value;
}

SqlMapper.AddTypeHandler(new OrderIdTypeHandler());
```

#### CQRS Data Access Split

```
Write Side → Entity Framework Core (change tracking, domain events, transactions)
Read Side  → Dapper (raw SQL, high performance, projections)
```

---

### Dependency Injection

**Constructor Injection is the only recommended approach** in .NET 8+. Leverage **primary constructors** to reduce boilerplate.

direct service-injection Vs MediatR for your request handling

#### Service Lifetimes

| Lifetime | Created | Best For |
|---|---|---|
| **Transient** | Every container request | Lightweight, stateless (e.g., validators) |
| **Scoped** | Once per HTTP request | DB contexts, unit-of-work, per-request state |
| **Singleton** | Once per app lifetime | Config, caching, logging, `TimeProvider` |

> ⚠️ **Never inject Scoped/Transient into Singleton** — this "captive dependency" bug is now detected at startup in .NET 8 when scope validation is enabled.

#### Keyed Services (.NET 8 — new)

```csharp
// Register multiple implementations of the same interface
builder.Services.AddKeyedSingleton<IMessageSender, EmailSender>("email");
builder.Services.AddKeyedSingleton<IMessageSender, SmsSender>("sms");

// Resolve by key
public class NotificationService(
    [FromKeyedServices("email")] IMessageSender emailSender,
    [FromKeyedServices("sms")]   IMessageSender smsSender)
{ }
```

#### Extension Method Registration (Recommended)

```csharp
// Each layer registers its own services
// Application layer
public static class ApplicationServiceRegistration
{
    public static IServiceCollection AddApplicationServices(
        this IServiceCollection services)
    {
        services.AddMediatR(cfg =>
            cfg.RegisterServicesFromAssembly(typeof(ApplicationServiceRegistration).Assembly));
        services.AddValidatorsFromAssembly(typeof(ApplicationServiceRegistration).Assembly);
        return services;
    }
}

// Infrastructure layer
public static class InfrastructureServiceRegistration
{
    public static IServiceCollection AddInfrastructureServices(
        this IServiceCollection services, IConfiguration config)
    {
        services.AddDbContext<AppDbContext>(opt =>
            opt.UseNpgsql(config.GetConnectionString("DefaultConnection")));
        services.AddScoped<IOrderRepository, OrderRepository>();
        return services;
    }
}

// Program.cs
builder.Services
    .AddApplicationServices()
    .AddInfrastructureServices(builder.Configuration);
```

#### Useful Libraries
- [Scrutor](https://github.com/khellang/Scrutor) — assembly scanning & decorator pattern
- [Serviced](https://github.com/Stoyanov8/Serviced) — attribute-based auto-registration

---

### Caching

#### HybridCache (.NET 9 — Replaces IMemoryCache + IDistributedCache)

```csharp
// Registration
builder.Services.AddHybridCache();   // in-memory L1 + distributed L2 (optional)

// Optionally add Redis as L2 distributed backing store
builder.Services.AddStackExchangeRedisCache(opt =>
    opt.Configuration = builder.Configuration.GetConnectionString("Redis"));

// Usage — stampede protection built in (only one thread fetches on cache miss)
public class ProductService(HybridCache cache, IProductRepository repo)
{
    public async Task<ProductDto?> GetByIdAsync(int id, CancellationToken ct)
    {
        return await cache.GetOrCreateAsync(
            key: $"product:{id}",
            factory: async token => await repo.GetByIdAsync(id, token),
            options: new HybridCacheEntryOptions
            {
                Expiration = TimeSpan.FromMinutes(10),
                LocalCacheExpiration = TimeSpan.FromMinutes(1)
            },
            cancellationToken: ct);
    }
}
```

#### Output Caching (built-in, .NET 7+)

```csharp
builder.Services.AddOutputCache(opt =>
{
    opt.AddPolicy("Products", b => b.Expire(TimeSpan.FromMinutes(5)).Tag("products"));
});

app.UseOutputCache();

app.MapGet("/products", async (IProductService svc) => await svc.GetAllAsync())
   .CacheOutput("Products");

// Invalidate by tag when data changes
await cache.EvictByTagAsync("products");
```

---

### Rate Limiting

Built-in since .NET 7 — `System.Threading.RateLimiting`, no extra package needed.

```csharp
builder.Services.AddRateLimiter(opt =>
{
    opt.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    // Fixed window — e.g., 100 requests per minute per IP
    opt.AddPolicy("fixed", ctx =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: ctx.Connection.RemoteIpAddress?.ToString() ?? "anon",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 100,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }));

    // Sliding window — smoother than fixed
    opt.AddPolicy("sliding", ctx =>
        RateLimitPartition.GetSlidingWindowLimiter(
            partitionKey: ctx.User.Identity?.Name ?? ctx.Request.Headers.Host.ToString(),
            factory: _ => new SlidingWindowRateLimiterOptions
            {
                PermitLimit = 60,
                Window = TimeSpan.FromMinutes(1),
                SegmentsPerWindow = 6
            }));
});

app.UseRateLimiter();

app.MapPost("/orders", CreateOrder).RequireRateLimiting("fixed");
```

---

### Resilience

Use `Microsoft.Extensions.Http.Resilience` (built on Polly v8, ships with .NET Aspire ServiceDefaults).

```csharp
// Add resilience to named HttpClient
builder.Services.AddHttpClient<IPaymentClient, PaymentClient>()
    .AddStandardResilienceHandler(); // retry + circuit breaker + timeout + bulkhead

// Custom pipeline
builder.Services.AddHttpClient<IInventoryClient, InventoryClient>()
    .AddResilienceHandler("inventory", pipeline =>
    {
        pipeline.AddRetry(new HttpRetryStrategyOptions
        {
            MaxRetryAttempts = 3,
            Delay = TimeSpan.FromSeconds(1),
            BackoffType = DelayBackoffType.Exponential,
            ShouldHandle = args => ValueTask.FromResult(
                args.Outcome.Result?.StatusCode == HttpStatusCode.ServiceUnavailable)
        });

        pipeline.AddCircuitBreaker(new HttpCircuitBreakerStrategyOptions
        {
            SamplingDuration = TimeSpan.FromSeconds(10),
            MinimumThroughput = 5,
            FailureRatio = 0.3,
            BreakDuration = TimeSpan.FromSeconds(30)
        });

        pipeline.AddTimeout(TimeSpan.FromSeconds(5));
    });
```

---

### Localization

```csharp
builder.Services.AddLocalization(opt => opt.ResourcesPath = "Resources");

app.UseRequestLocalization(new RequestLocalizationOptions
{
    SupportedCultures = ["en-US", "fr-FR", "de-DE"],
    SupportedUICultures = ["en-US", "fr-FR", "de-DE"],
    DefaultRequestCulture = new RequestCulture("en-US")
});
```

> Localise all exception messages. See [Localization in external class libraries](https://stackoverflow.com/questions/45167350/localization-in-external-class-libraries-in-asp-net-core)

---

### Exception Handling

#### `IExceptionHandler` (.NET 8 — Replaces Custom Middleware)

```csharp
// Register
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddProblemDetails();

app.UseExceptionHandler();

// Handler
public class GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger)
    : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext ctx, Exception exception, CancellationToken ct)
    {
        logger.LogError(exception, "Unhandled exception: {Message}", exception.Message);

        var (statusCode, title) = exception switch
        {
            ValidationException  => (400, "Validation Error"),
            NotFoundException    => (404, "Not Found"),
            DomainException      => (422, "Business Rule Violation"),
            UnauthorizedAccessException => (401, "Unauthorised"),
            _                    => (500, "An unexpected error occurred")
        };

        ctx.Response.StatusCode = statusCode;

        await ctx.Response.WriteAsJsonAsync(new ProblemDetails
        {
            Status = statusCode,
            Title = title,
            Detail = exception.Message,
            Instance = ctx.Request.Path
        }, ct);

        return true; // exception handled — do not rethrow
    }
}
```

#### `throw` vs `throw ex`

| | `throw` | `throw ex` |
|---|---|---|
| Stack trace | ✅ Preserved | ❌ Reset to current location |
| Recommendation | ✅ Always use | ❌ Avoid |

#### Exception Layers

| Layer | Responsibility |
|---|---|
| **API** | `IExceptionHandler` catches all — returns Problem Details |
| **Application** | Throw domain-specific exceptions (`NotFoundException`, `DomainException`) |
| **Domain** | Throw `DomainException` to protect invariants |
| **Infrastructure** | Catch & wrap `SqlException`, `DbUpdateException` → domain exceptions |

---

### Validations

> **Rule:** Always validate server-side. Client-side validation improves UX but provides zero security.

#### HTTP Response Codes

| Code | Meaning |
|---|---|
| `400 Bad Request` | Malformed request / input validation failure |
| `401 Unauthorized` | Authentication missing |
| `403 Forbidden` | Authenticated but not authorised |
| `404 Not Found` | Resource does not exist |
| `409 Conflict` | Duplicate / optimistic concurrency conflict |
| `422 Unprocessable Entity` | Syntactically valid, but semantically invalid (business rule) |
| `429 Too Many Requests` | Rate limit exceeded |

#### FluentValidation + MediatR Pipeline

```csharp
// Validator
public class CreateOrderCommandValidator : AbstractValidator<CreateOrderCommand>
{
    public CreateOrderCommandValidator()
    {
        RuleFor(x => x.CustomerId).NotEmpty();
        RuleFor(x => x.Lines).NotEmpty().WithMessage("At least one line is required.");
        RuleForEach(x => x.Lines).ChildRules(line =>
        {
            line.RuleFor(l => l.Quantity).GreaterThan(0);
            line.RuleFor(l => l.UnitPrice).GreaterThan(0);
        });
    }
}

// Auto-register all validators in the Application assembly
builder.Services.AddValidatorsFromAssembly(ApplicationAssembly);
```

#### Security Validation

> ⚠️ Input validation is **not** a substitute for output encoding, parameterised queries, or CSRF protection.

- [OWASP C5: Validate All Inputs](https://owasp.org/www-project-proactive-controls/v3/en/c5-validate-inputs)
- [Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
- Protect against: **XSS**, **SQL Injection**, **XXE**, **SSRF**, **HTML Injection**
- Use [Microsoft.Security.Application](https://docs.microsoft.com/en-us/aspnet/core/security/cross-site-scripting) for HTML encoding

---

### Constants

| Approach | Behaviour | Use When |
|---|---|---|
| `const` | Compile-time, inlined into calling assembly | Truly fixed values (magic strings) |
| `static readonly` | Runtime, set once | Config values, environment-dependent |
| `static` property (no setter) | Runtime, computed | Platform or feature-flag conditional |
| `[Flags] enum` | Bitwise combinable | Multiple simultaneous states |

```csharp
public static class ApiConstants
{
    // Compile-time
    public const string Version = "1.0";
    public const int DefaultPageSize = 20;

    // Runtime (from config at startup)
    public static readonly string BaseUrl =
        Environment.GetEnvironmentVariable("BASE_URL") ?? "https://localhost:5001";
}

// Prefer options pattern over static constants for configurable values
public record AppSettings
{
    public int MaxPageSize { get; init; } = 100;
    public string SupportEmail { get; init; } = "support@example.com";
}

builder.Services.Configure<AppSettings>(builder.Configuration.GetSection("AppSettings"));
```

---

### Health Checks

#### Setup (.NET 8+)

```csharp
builder.Services.AddHealthChecks()
    .AddDbContextCheck<AppDbContext>("database")
    .AddRedis(builder.Configuration.GetConnectionString("Redis")!, "redis")
    .AddRabbitMQ(rabbitConnectionString: "amqp://localhost", name: "rabbitmq")
    .AddUrlGroup(new Uri("https://api.external.com/health"), "external-api");

// Health Checks UI
builder.Services.AddHealthChecksUI().AddInMemoryStorage();

app.MapHealthChecks("/health", new HealthCheckOptions
{
    ResponseWriter = UIResponseWriter.WriteHealthCheckUIResponse
});
app.MapHealthChecks("/health/live",  new HealthCheckOptions { Predicate = _ => false }); // liveness
app.MapHealthChecks("/health/ready", new HealthCheckOptions { });                         // readiness
app.MapHealthChecksUI();
```

> With .NET Aspire, health checks and their dashboards are configured automatically via `AddServiceDefaults()`.

#### Packages

| Package | Checks |
|---|---|
| `Microsoft.Extensions.Diagnostics.HealthChecks.EntityFrameworkCore` | EF Core / SQL |
| `AspNetCore.HealthChecks.Redis` | Redis |
| `AspNetCore.HealthChecks.RabbitMQ` | RabbitMQ |
| `AspNetCore.HealthChecks.Kafka` | Kafka |
| `AspNetCore.HealthChecks.AzureServiceBus` | Azure Service Bus |
| `AspNetCore.HealthChecks.Uris` | External URLs |
| `AspNetCore.HealthChecks.UI` | Dashboard UI |

---

### OpenAPI / Swagger

In **.NET 9**, `Microsoft.AspNetCore.OpenApi` is built-in — no Swashbuckle required.

```csharp
// .NET 9 — built-in OpenAPI
builder.Services.AddOpenApi();

app.MapOpenApi();        // /openapi/v1.json
app.UseSwaggerUI(opt => opt.SwaggerEndpoint("/openapi/v1.json", "My API v1"));

// Annotate endpoints
app.MapPost("/orders", CreateOrder)
   .WithName("CreateOrder")
   .WithSummary("Create a new order")
   .WithDescription("Creates a new order for the authenticated customer.")
   .WithOpenApi()
   .Produces<OrderResponse>(201)
   .ProducesValidationProblem()
   .ProducesProblem(500);
```

> For **.NET 8**, continue using `Swashbuckle.AspNetCore` or `NSwag`.

---

### Async Methods

#### Best Practices (.NET 8+)

```csharp
// Always pass CancellationToken through the call chain
app.MapGet("/orders/{id}", async (
    OrderId id,
    IOrderService service,
    CancellationToken ct) =>           // ← bound automatically from HttpContext.RequestAborted
{
    var order = await service.GetByIdAsync(id, ct);
    return order is null ? Results.NotFound() : Results.Ok(order);
});

// ConfigureAwait(false) in library/infrastructure code
public async Task<Order?> GetByIdAsync(OrderId id, CancellationToken ct)
{
    return await _context.Orders
        .FirstOrDefaultAsync(o => o.Id == id, ct)
        .ConfigureAwait(false);
}

// Use TimeProvider (.NET 8) for testable time — avoid DateTime.Now
public class OrderExpiryService(TimeProvider time)
{
    public bool IsExpired(Order order) =>
        order.CreatedAt.Add(order.ExpiryDuration) < time.GetUtcNow();
}

builder.Services.AddSingleton(TimeProvider.System);
// In tests: new FakeTimeProvider()
```

#### Background Processing

```csharp
// BackgroundService for long-running work
public class OrderProcessingWorker(
    IServiceScopeFactory scopeFactory,
    ILogger<OrderProcessingWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            await using var scope = scopeFactory.CreateAsyncScope();
            var processor = scope.ServiceProvider.GetRequiredService<IOrderProcessor>();
            await processor.ProcessPendingOrdersAsync(stoppingToken);
            await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
        }
    }
}

builder.Services.AddHostedService<OrderProcessingWorker>();
```

---

## Quick Reference — NuGet Packages

| Concern | Package | Notes |
|---|---|---|
| CQRS / Mediator | `MediatR` | v12+ for .NET 8 |
| Validation | `FluentValidation.AspNetCore` | |
| Mapping | `Mapperly` | Source-generated, preferred |
| ORM | `Microsoft.EntityFrameworkCore` | EF 8 / 9 |
| Micro-ORM | `Dapper` | Read side |
| Caching | Built-in `HybridCache` (.NET 9) | |
| Rate Limiting | Built-in `System.Threading.RateLimiting` | |
| Resilience | `Microsoft.Extensions.Http.Resilience` | Polly v8 |
| Logging | `Serilog.AspNetCore` | |
| Observability | `OpenTelemetry.Extensions.Hosting` | |
| Result Pattern | `ardalis.Result` or `FluentResults` | |
| Guard Clauses | `ardalis.GuardClauses` | |
| Specification | `ardalis.Specification` | |
| Endpoint Library | `FastEndpoints` | Minimal API alternative |
| Architecture Tests | `NetArchTest.Rules` | |
| API Testing | `Microsoft.AspNetCore.Mvc.Testing` | |
| Mocking | `NSubstitute` (preferred) or `Moq` | |
| OpenAPI (.NET 9) | `Microsoft.AspNetCore.OpenApi` | Built-in |
| OpenAPI (.NET 8) | `Swashbuckle.AspNetCore` | |

---


---

## 9. Security & Authentication

### Overview

| Concern | Recommended Approach (.NET 8+) |
|---|---|
| **Authentication** | JWT Bearer + `Microsoft.Identity.Web` |
| **Authorisation** | Policy-based + Resource-based |
| **Identity Provider** | Duende IdentityServer, Azure AD B2C, Auth0, Keycloak |
| **Token storage** | HttpOnly cookies (web) / secure storage (mobile) |
| **Secrets** | `dotnet user-secrets` (dev), Azure Key Vault / AWS Secrets Manager (prod) |
| **HTTPS** | Always enforce — `UseHttpsRedirection()` + HSTS |
| **CORS** | Explicitly configured — never `AllowAnyOrigin` in production |

---

### JWT Bearer Authentication (.NET 8)

```csharp
// Program.cs
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opt =>
    {
        opt.Authority = builder.Configuration["Auth:Authority"]; // e.g. https://login.microsoftonline.com/{tenant}
        opt.Audience  = builder.Configuration["Auth:Audience"];

        opt.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer           = true,
            ValidateAudience         = true,
            ValidateLifetime         = true,
            ValidateIssuerSigningKey = true,
            ClockSkew                = TimeSpan.FromSeconds(30)  // tighten default 5-min skew
        };

        // Support SignalR / EventSource — token from query string
        opt.Events = new JwtBearerEvents
        {
            OnMessageReceived = ctx =>
            {
                var token = ctx.Request.Query["access_token"];
                if (!string.IsNullOrEmpty(token) &&
                    ctx.HttpContext.Request.Path.StartsWithSegments("/hubs"))
                    ctx.Token = token;
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization();

app.UseAuthentication();
app.UseAuthorization();
```

---

### Microsoft.Identity.Web (Azure AD / Entra ID)

```csharp
// Minimal setup for Azure AD protected API
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddMicrosoftIdentityWebApi(builder.Configuration.GetSection("AzureAd"));

// appsettings.json
{
  "AzureAd": {
    "Instance": "https://login.microsoftonline.com/",
    "TenantId": "your-tenant-id",
    "ClientId": "your-client-id",
    "Scopes": "access_as_user"
  }
}
```

---

### Policy-Based Authorisation

```csharp
builder.Services.AddAuthorization(opt =>
{
    // Require authenticated user everywhere by default
    opt.FallbackPolicy = new AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build();

    opt.AddPolicy("AdminOnly", policy =>
        policy.RequireRole("Admin"));

    opt.AddPolicy("CanManageOrders", policy =>
        policy.RequireAuthenticatedUser()
              .RequireClaim("department", "Sales", "Operations")
              .RequireAssertion(ctx =>
                  ctx.User.HasClaim("subscription", "premium") ||
                  ctx.User.IsInRole("Admin")));
});

// Apply on Minimal API endpoint
app.MapDelete("/orders/{id}", DeleteOrder)
   .RequireAuthorization("AdminOnly");
```

---

### Resource-Based Authorisation

```csharp
// Requirement
public class OrderOwnerRequirement : IAuthorizationRequirement { }

// Handler
public class OrderOwnerHandler(IOrderRepository repo)
    : AuthorizationHandler<OrderOwnerRequirement, Order>
{
    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext ctx,
        OrderOwnerRequirement requirement,
        Order order)
    {
        var userId = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (order.OwnerId.ToString() == userId)
            ctx.Succeed(requirement);
    }
}

// Usage in endpoint
app.MapPut("/orders/{id}", async (
    Guid id,
    UpdateOrderRequest req,
    IOrderRepository repo,
    IAuthorizationService authz,
    ClaimsPrincipal user) =>
{
    var order = await repo.GetByIdAsync(new OrderId(id));
    if (order is null) return Results.NotFound();

    var result = await authz.AuthorizeAsync(user, order, new OrderOwnerRequirement());
    if (!result.Succeeded) return Results.Forbid();

    // proceed with update ...
});
```

---

### OAuth2 / OIDC — Token Flow Summary

```
┌──────────┐   1. Login redirect    ┌──────────────────┐
│  Browser │ ──────────────────────▶│ Identity Provider│
│  (SPA /  │                        │ (Entra, Auth0,   │
│  Blazor) │ ◀────────────────────── │ Keycloak, etc.)  │
└──────────┘   2. Auth code          └──────────────────┘
     │                                        │
     │  3. Exchange code for tokens           │
     ▼                                        │
┌──────────┐   4. API call + Bearer token     │
│  Client  │ ──────────────────────▶ ┌────────┴───────┐
│          │                         │   Your API     │
│          │ ◀────────────────────── │ (validates JWT)│
└──────────┘   5. Protected resource └────────────────┘
```

**Flow types:**
| Flow | Use When |
|---|---|
| **Authorization Code + PKCE** | SPAs, mobile apps — always prefer this |
| **Client Credentials** | Service-to-service (no user involved) |
| **Device Code** | CLI tools, IoT |
| ~~Implicit~~ | Deprecated — never use |
| ~~Resource Owner Password~~ | Deprecated — never use |

---

### Data Protection API

```csharp
// Protect sensitive data (tokens, cookies, anti-forgery)
builder.Services.AddDataProtection()
    .PersistKeysToAzureBlobStorage(/* blob connection */)   // prod: persist keys externally
    .ProtectKeysWithAzureKeyVault(/* key vault uri */)      // prod: encrypt at rest
    .SetApplicationName("MyApp")
    .SetDefaultKeyLifetime(TimeSpan.FromDays(90));

// Usage
public class TokenService(IDataProtectionProvider provider)
{
    private readonly IDataProtector _protector =
        provider.CreateProtector("MyApp.Tokens.v1");

    public string Protect(string plaintext)   => _protector.Protect(plaintext);
    public string Unprotect(string ciphertext) => _protector.Unprotect(ciphertext);
}
```

---

### Security Headers

```csharp
// Add via middleware or NWebSec / custom middleware
app.Use(async (ctx, next) =>
{
    ctx.Response.Headers.Append("X-Content-Type-Options",    "nosniff");
    ctx.Response.Headers.Append("X-Frame-Options",           "DENY");
    ctx.Response.Headers.Append("X-XSS-Protection",         "1; mode=block");
    ctx.Response.Headers.Append("Referrer-Policy",           "strict-origin-when-cross-origin");
    ctx.Response.Headers.Append("Permissions-Policy",        "camera=(), microphone=(), geolocation=()");
    ctx.Response.Headers.Append("Content-Security-Policy",
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'");
    await next();
});

app.UseHsts();            // Strict-Transport-Security
app.UseHttpsRedirection();
```

---

### CORS

```csharp
builder.Services.AddCors(opt =>
{
    opt.AddPolicy("AllowFrontend", policy =>
        policy.WithOrigins("https://app.example.com", "https://staging.example.com")
              .WithMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
              .WithHeaders("Authorization", "Content-Type")
              .AllowCredentials()
              .SetPreflightMaxAge(TimeSpan.FromMinutes(10)));
});

app.UseCors("AllowFrontend");

// ⚠️ Never use in production:
// policy.AllowAnyOrigin().AllowCredentials() — browsers block this combination
```

---

### OWASP Top 10 — .NET Mitigations

| OWASP Risk | .NET Mitigation |
|---|---|
| **A01 Broken Access Control** | Policy-based authz, resource-based checks |
| **A02 Cryptographic Failures** | Data Protection API, TLS 1.2+, no MD5/SHA1 |
| **A03 Injection** | EF Core parameterised queries, `FromSql($"...")` safe interpolation |
| **A04 Insecure Design** | Threat modelling, DDD invariants, domain exceptions |
| **A05 Security Misconfiguration** | Security headers, strict CORS, HSTS |
| **A06 Vulnerable Components** | `dotnet list package --vulnerable`, Dependabot |
| **A07 Auth Failures** | JWT validation, short token lifetimes, refresh token rotation |
| **A08 Software Integrity** | NuGet signature verification, SBOM |
| **A09 Logging Failures** | Structured logging (Serilog), never log secrets |
| **A10 SSRF** | `HttpClient` base address allow-list, validate redirect URLs |

---

## 10. Microservices Patterns

### When to Use Microservices

```
Monolith first → identify bounded contexts → extract services when:
  - Teams need independent deployments
  - Services have different scaling requirements
  - Technology diversity is genuinely needed
  - Domain boundaries are well understood
```

> ⚠️ Microservices add significant operational complexity. Start with a well-structured modular monolith and extract only when the pain of coupling outweighs the pain of distribution.

---

### Bounded Context & Service Decomposition

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Order       │  │  Inventory   │  │  Payment     │  │  Notification│
│  Service     │  │  Service     │  │  Service     │  │  Service     │
│              │  │              │  │              │  │              │
│ Orders       │  │ Products     │  │ Payments     │  │ Emails       │
│ OrderLines   │  │ Stock levels │  │ Refunds      │  │ SMS          │
│ Shipping     │  │ Warehouses   │  │ Invoices     │  │ Push notifs  │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │                 │
       └─────────────────┴────── Message Bus ────────────────┘
```

---

### API Gateway

The API Gateway is the single entry point for all clients — it handles routing, auth, rate limiting, and aggregation.

```csharp
// YARP (Yet Another Reverse Proxy) — Microsoft's recommended gateway for .NET
// Add to a dedicated MyApp.Gateway project

builder.Services.AddReverseProxy()
    .LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"));

app.MapReverseProxy();

// appsettings.json
{
  "ReverseProxy": {
    "Routes": {
      "orders-route": {
        "ClusterId": "orders-cluster",
        "Match": { "Path": "/api/orders/{**catch-all}" },
        "Transforms": [{ "PathPattern": "/{**catch-all}" }]
      },
      "inventory-route": {
        "ClusterId": "inventory-cluster",
        "Match": { "Path": "/api/inventory/{**catch-all}" }
      }
    },
    "Clusters": {
      "orders-cluster": {
        "Destinations": {
          "primary": { "Address": "https://orders-service/" }
        }
      },
      "inventory-cluster": {
        "Destinations": {
          "primary": { "Address": "https://inventory-service/" }
        }
      }
    }
  }
}
```

**Gateway responsibilities:**
| Concern | How |
|---|---|
| **Routing** | YARP route config |
| **Authentication** | Validate JWT at gateway, forward claims |
| **Rate Limiting** | Per-client, per-route limiting |
| **Load Balancing** | Round-robin, least requests, power-of-two |
| **Request Aggregation** | BFF pattern (Backend for Frontend) |
| **SSL Termination** | TLS at gateway, plain HTTP inside cluster |

---

### Service-to-Service Communication

#### Synchronous (HTTP/gRPC)
```csharp
// Typed HttpClient with service discovery (Aspire / Kubernetes)
builder.Services.AddHttpClient<IInventoryClient, InventoryClient>(client =>
{
    client.BaseAddress = new Uri("https+http://inventory-service"); // Aspire service name
})
.AddStandardResilienceHandler();

public class InventoryClient(HttpClient http)
{
    public async Task<StockLevel?> GetStockAsync(ProductId id, CancellationToken ct)
        => await http.GetFromJsonAsync<StockLevel>($"/stock/{id.Value}", ct);
}
```

#### Asynchronous (Messages) — preferred for cross-service operations
See [Section 11: Messaging & Event-Driven](#11-messaging--event-driven).

---

### Saga Pattern — Distributed Transactions

Sagas coordinate multi-service operations without distributed transactions (no 2PC).

#### Choreography Saga (event-driven, decentralised)
```
Order Service          Inventory Service       Payment Service
     │                       │                       │
     │── OrderPlaced ────────▶│                       │
     │                       │── StockReserved ──────▶│
     │                       │                       │── PaymentProcessed ──▶ Done
     │                       │                       │
     │◀─ OrderFailed ─────────│ (if stock fails)      │
     │                       │── StockReleased ──────▶│ (compensate)
```

#### Orchestration Saga (centralised, easier to reason about)
```csharp
// Using MassTransit Saga State Machine
public class OrderSaga : MassTransitStateMachine<OrderSagaState>
{
    public State AwaitingStock   { get; private set; } = null!;
    public State AwaitingPayment { get; private set; } = null!;
    public State Completed       { get; private set; } = null!;
    public State Failed          { get; private set; } = null!;

    public Event<OrderPlaced>         OrderPlaced         { get; private set; } = null!;
    public Event<StockReserved>       StockReserved       { get; private set; } = null!;
    public Event<StockReserveFailed>  StockReserveFailed  { get; private set; } = null!;
    public Event<PaymentProcessed>    PaymentProcessed    { get; private set; } = null!;
    public Event<PaymentFailed>       PaymentFailed       { get; private set; } = null!;

    public OrderSaga()
    {
        InstanceState(x => x.CurrentState);

        Event(() => OrderPlaced,        x => x.CorrelateById(m => m.Message.OrderId));
        Event(() => StockReserved,      x => x.CorrelateById(m => m.Message.OrderId));
        Event(() => StockReserveFailed, x => x.CorrelateById(m => m.Message.OrderId));
        Event(() => PaymentProcessed,   x => x.CorrelateById(m => m.Message.OrderId));
        Event(() => PaymentFailed,      x => x.CorrelateById(m => m.Message.OrderId));

        Initially(
            When(OrderPlaced)
                .Then(ctx => ctx.Saga.OrderId = ctx.Message.OrderId)
                .Publish(ctx => new ReserveStock(ctx.Message.OrderId, ctx.Message.Lines))
                .TransitionTo(AwaitingStock));

        During(AwaitingStock,
            When(StockReserved)
                .Publish(ctx => new ProcessPayment(ctx.Message.OrderId, ctx.Message.Amount))
                .TransitionTo(AwaitingPayment),
            When(StockReserveFailed)
                .Publish(ctx => new CancelOrder(ctx.Message.OrderId, "Stock unavailable"))
                .TransitionTo(Failed));

        During(AwaitingPayment,
            When(PaymentProcessed)
                .TransitionTo(Completed)
                .Finalize(),
            When(PaymentFailed)
                .Publish(ctx => new ReleaseStock(ctx.Message.OrderId))
                .Publish(ctx => new CancelOrder(ctx.Message.OrderId, "Payment failed"))
                .TransitionTo(Failed));
    }
}
```

---

### Outbox Pattern — Guaranteed Message Delivery

Ensures messages are never lost even if the broker is down at commit time.

```csharp
// MassTransit Transactional Outbox (works with EF Core)
builder.Services.AddMassTransit(x =>
{
    x.AddEntityFrameworkOutbox<AppDbContext>(o =>
    {
        o.UsePostgres();          // or UseSqlServer()
        o.UseBusOutbox();         // publish via outbox
    });

    x.UsingRabbitMq((ctx, cfg) =>
    {
        cfg.Host("rabbitmq://localhost");
        cfg.ConfigureEndpoints(ctx);
    });
});

// In command handler — publish inside the same DB transaction
public async Task<Result> Handle(PlaceOrderCommand cmd, CancellationToken ct)
{
    var order = Order.Create(cmd.CustomerId);
    await _repo.AddAsync(order, ct);

    // This goes to the Outbox table — same transaction as SaveChanges
    await _publishEndpoint.Publish(new OrderPlaced(order.Id), ct);

    await _unitOfWork.SaveChangesAsync(ct); // atomic: order row + outbox row
    return Result.Success();
}
```

---

### Service Mesh (Dapr / Istio)

For advanced scenarios — observability, mTLS, traffic management at the infrastructure level.

```yaml
# Dapr sidecar — annotate Kubernetes pod
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "order-service"
  dapr.io/app-port: "8080"
```

```csharp
// Dapr client — service invocation
var client = new DaprClientBuilder().Build();

// Call another service by Dapr app-id (no hardcoded URLs)
var stock = await client.InvokeMethodAsync<StockLevel>(
    HttpMethod.Get, "inventory-service", $"stock/{productId}");

// Publish to pub/sub
await client.PublishEventAsync("pubsub", "order-placed", new OrderPlaced(orderId));

// State management
await client.SaveStateAsync("statestore", $"order-{orderId}", orderState);
```

---

### Pattern Summary

| Pattern | Problem Solved | Tools |
|---|---|---|
| **API Gateway** | Single entry point, routing, auth | YARP, Azure APIM, Nginx |
| **BFF** | Tailored APIs per client type | YARP + custom aggregation |
| **Saga (Choreography)** | Distributed transactions without 2PC | MassTransit, NServiceBus |
| **Saga (Orchestration)** | Centralised workflow coordination | MassTransit State Machine |
| **Outbox** | At-least-once message delivery | MassTransit Outbox + EF Core |
| **Circuit Breaker** | Stop cascading failures | Polly v8 / Http.Resilience |
| **Sidecar / Service Mesh** | mTLS, traffic mgmt, observability | Dapr, Istio, Linkerd |
| **Event Sourcing** | Full audit trail, temporal queries | Marten, EventStoreDB |

---

## 11. Messaging & Event-Driven

### Why Messaging?

```
Synchronous (HTTP)                Asynchronous (Messaging)
──────────────────                ────────────────────────
✅ Simple, immediate response     ✅ Decoupled services
❌ Tight temporal coupling        ✅ Resilient to downstream failures
❌ Cascading failures             ✅ Natural load levelling
❌ Hard to scale independently    ✅ Event replay / audit trail
```

---

### MassTransit — Unified Messaging Abstraction

MassTransit is the recommended messaging library for .NET — it abstracts RabbitMQ, Kafka, Azure Service Bus, Amazon SQS, and in-memory transports behind a single API.

```csharp
// Program.cs
builder.Services.AddMassTransit(x =>
{
    // Auto-discover consumers in the assembly
    x.AddConsumers(typeof(Program).Assembly);

    // Choose transport:
    x.UsingRabbitMq((ctx, cfg) =>         // or .UsingAzureServiceBus / .UsingKafka
    {
        cfg.Host("rabbitmq://localhost", h =>
        {
            h.Username("guest");
            h.Password("guest");
        });
        cfg.ConfigureEndpoints(ctx);       // auto-name queues from consumer type
        cfg.UseMessageRetry(r => r.Exponential(5, TimeSpan.FromSeconds(1),
                                                  TimeSpan.FromSeconds(30),
                                                  TimeSpan.FromSeconds(1)));
    });
});
```

---

### RabbitMQ

Best for: **general-purpose messaging**, low-latency, complex routing.

```csharp
// Producer — publish an event
public class OrderService(IPublishEndpoint publish)
{
    public async Task PlaceOrderAsync(PlaceOrderCommand cmd, CancellationToken ct)
    {
        // ... domain logic ...
        await publish.Publish(new OrderPlaced
        {
            OrderId    = order.Id.Value,
            CustomerId = order.CustomerId.Value,
            PlacedAt   = DateTimeOffset.UtcNow
        }, ct);
    }
}

// Consumer — handle the event
public class OrderPlacedConsumer(IInventoryService inventory, ILogger<OrderPlacedConsumer> logger)
    : IConsumer<OrderPlaced>
{
    public async Task Consume(ConsumeContext<OrderPlaced> ctx)
    {
        logger.LogInformation("Reserving stock for order {OrderId}", ctx.Message.OrderId);
        await inventory.ReserveStockAsync(ctx.Message.OrderId, ctx.Message.Lines);
    }
}

// Message contract — keep in a shared Contracts project
public record OrderPlaced
{
    public Guid   OrderId    { get; init; }
    public Guid   CustomerId { get; init; }
    public DateTimeOffset PlacedAt { get; init; }
}
```

**Exchange / Queue topology (auto-configured by MassTransit):**
```
Publisher
   │
   ▼
[Exchange: order-placed]  (fanout)
   │
   ├──▶ [Queue: inventory-service_order-placed]  → Inventory Consumer
   └──▶ [Queue: notification-service_order-placed] → Notification Consumer
```

---

### Kafka

Best for: **high-throughput event streaming**, event log / replay, analytics pipelines.

```csharp
// MassTransit + Confluent Kafka
builder.Services.AddMassTransit(x =>
{
    x.UsingInMemory();   // for non-Kafka transports

    x.AddRider(rider =>
    {
        rider.AddConsumer<OrderPlacedConsumer>();
        rider.AddProducer<OrderPlaced>("order-placed");   // topic name

        rider.UsingKafka((ctx, k) =>
        {
            k.Host("localhost:9092");

            k.TopicEndpoint<OrderPlaced>("order-placed", "inventory-group", e =>
            {
                e.ConfigureConsumer<OrderPlacedConsumer>(ctx);
                e.AutoOffsetReset = AutoOffsetReset.Earliest;
                e.CreateIfMissing(t =>
                {
                    t.NumPartitions     = 6;
                    t.ReplicationFactor = 3;
                });
            });
        });
    });
});

// Produce to Kafka
public class OrderService(ITopicProducer<OrderPlaced> producer)
{
    public async Task PlaceOrderAsync(Order order, CancellationToken ct)
    {
        await producer.Produce(new OrderPlaced
        {
            OrderId = order.Id.Value
        }, ct);
    }
}
```

**Kafka concepts in .NET context:**
| Concept | .NET Mapping |
|---|---|
| **Topic** | Message channel (like an exchange + queue combined) |
| **Partition** | Parallelism unit — more partitions = more consumers |
| **Consumer Group** | All consumers in a group share the load |
| **Offset** | Cursor — enables replay from any point |
| **Retention** | Messages kept N days — re-process on demand |

---

### Azure Service Bus

Best for: **Azure-hosted workloads**, enterprise messaging, dead-letter queues, sessions.

```csharp
// MassTransit + Azure Service Bus
builder.Services.AddMassTransit(x =>
{
    x.AddConsumers(typeof(Program).Assembly);
    x.AddSagaStateMachine<OrderSaga, OrderSagaState>()
     .EntityFrameworkRepository(r =>
     {
         r.ExistingDbContext<AppDbContext>();
         r.UsePostgres();
     });

    x.UsingAzureServiceBus((ctx, cfg) =>
    {
        cfg.Host(builder.Configuration.GetConnectionString("ServiceBus"));

        cfg.Message<OrderPlaced>(m => m.SetEntityName("order-placed")); // topic name
        cfg.ConfigureEndpoints(ctx);

        // Dead-letter after 5 failed attempts
        cfg.ReceiveEndpoint("inventory-order-placed", e =>
        {
            e.MaxDeliveryCount = 5;
            e.DeadLetterOnMessageExpiration = true;
            e.ConfigureConsumer<OrderPlacedConsumer>(ctx);
        });
    });
});
```

**Service Bus features:**
| Feature | Use Case |
|---|---|
| **Queues** | Point-to-point, guaranteed delivery |
| **Topics + Subscriptions** | Pub/sub fan-out |
| **Sessions** | Ordered processing (FIFO per session key) |
| **Dead-letter Queue** | Failed messages — inspect + replay |
| **Scheduled Messages** | Delay delivery |
| **Message Lock** | At-least-once with idempotency on consumer side |

---

### Request-Response over Messaging

```csharp
// MassTransit RequestClient — async RPC over the bus
public class CheckoutService(IRequestClient<CheckInventory> client)
{
    public async Task<InventoryResult> CheckAsync(Guid productId, int qty, CancellationToken ct)
    {
        var response = await client.GetResponse<InventoryAvailable, InventoryInsufficient>(
            new CheckInventory { ProductId = productId, Quantity = qty },
            ct,
            timeout: RequestTimeout.After(s: 10));

        return response.Is(out Response<InventoryAvailable>? available)
            ? new InventoryResult(true,  available!.Message.ReservedUntil)
            : new InventoryResult(false, null);
    }
}
```

---

### Idempotent Consumers

Always design consumers to be idempotent — messages can be redelivered.

```csharp
public class OrderPlacedConsumer(AppDbContext db) : IConsumer<OrderPlaced>
{
    public async Task Consume(ConsumeContext<OrderPlaced> ctx)
    {
        // Guard: skip if already processed
        var exists = await db.ProcessedMessages
            .AnyAsync(m => m.MessageId == ctx.MessageId);

        if (exists)
        {
            ctx.LogSkipped();   // MassTransit logging
            return;
        }

        // ... process ...

        db.ProcessedMessages.Add(new ProcessedMessage
        {
            MessageId   = ctx.MessageId!.Value,
            ProcessedAt = DateTimeOffset.UtcNow
        });

        await db.SaveChangesAsync();
    }
}
```

---

### Messaging Pattern Summary

| Pattern | When to Use |
|---|---|
| **Publish / Subscribe** | Broadcast events to multiple consumers |
| **Work Queue** | Distribute jobs across competing consumers |
| **Request / Response** | Async RPC — when you need a reply |
| **Outbox** | Guarantee publish even if broker is temporarily down |
| **Saga** | Coordinate multi-step, multi-service workflows |
| **Idempotent Consumer** | Safe message redelivery — always implement |
| **Dead-letter Queue** | Poison message handling + alerting |
| **Event Sourcing** | Store all events as the source of truth |

---

## 12. Observability — OpenTelemetry, Serilog, Seq & Grafana

### The Three Pillars of Observability

```
┌────────────┐   ┌────────────┐   ┌────────────┐
│   Logs     │   │  Metrics   │   │  Traces    │
│            │   │            │   │            │
│ What       │   │ How much / │   │ Where did  │
│ happened   │   │ how often  │   │ time go?   │
│            │   │            │   │            │
│ Serilog    │   │ OpenTel    │   │ OpenTel    │
│ + Seq      │   │ + Prometheus│  │ + Jaeger / │
│            │   │ + Grafana  │   │ Tempo      │
└────────────┘   └────────────┘   └────────────┘
```

---

### OpenTelemetry Setup (.NET 8+)

```csharp
// Install packages:
// OpenTelemetry.Extensions.Hosting
// OpenTelemetry.Instrumentation.AspNetCore
// OpenTelemetry.Instrumentation.Http
// OpenTelemetry.Instrumentation.EntityFrameworkCore
// OpenTelemetry.Exporter.OpenTelemetryProtocol (OTLP)

builder.Services.AddOpenTelemetry()
    .ConfigureResource(r => r
        .AddService(
            serviceName:    builder.Environment.ApplicationName,
            serviceVersion: "1.0.0",
            serviceInstanceId: Environment.MachineName))

    // Distributed Tracing
    .WithTracing(tracing => tracing
        .AddAspNetCoreInstrumentation(opt =>
        {
            opt.RecordException = true;
            opt.Filter = ctx => !ctx.Request.Path.StartsWithSegments("/health");
        })
        .AddHttpClientInstrumentation()
        .AddEntityFrameworkCoreInstrumentation(opt => opt.SetDbStatementForText = true)
        .AddSource("MyApp.*")           // custom ActivitySource
        .AddOtlpExporter(opt =>         // send to Seq / Grafana Tempo / Jaeger
            opt.Endpoint = new Uri(builder.Configuration["Otlp:Endpoint"]!)))

    // Metrics
    .WithMetrics(metrics => metrics
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
        .AddRuntimeInstrumentation()    // GC, thread pool, allocations
        .AddMeter("MyApp.*")            // custom meters
        .AddOtlpExporter()
        .AddPrometheusExporter());      // /metrics endpoint for Prometheus scraping

// Expose Prometheus scrape endpoint
app.MapPrometheusScrapingEndpoint("/metrics");
```

---

### Custom Activity (Trace Span)

```csharp
// Define ActivitySource once — register as singleton
public static class Telemetry
{
    public static readonly ActivitySource Source = new("MyApp.Orders", "1.0.0");
}

builder.Services.AddSingleton(Telemetry.Source);

// Instrument your code
public class OrderService(ActivitySource activitySource)
{
    public async Task<Order> CreateAsync(CreateOrderRequest req, CancellationToken ct)
    {
        using var activity = activitySource.StartActivity("CreateOrder");
        activity?.SetTag("order.customerId", req.CustomerId);
        activity?.SetTag("order.itemCount",  req.Lines.Count);

        try
        {
            var order = Order.Create(new CustomerId(req.CustomerId));
            // ...
            activity?.SetStatus(ActivityStatusCode.Ok);
            activity?.SetTag("order.id", order.Id.Value);
            return order;
        }
        catch (Exception ex)
        {
            activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
            activity?.RecordException(ex);
            throw;
        }
    }
}
```

---

### Custom Metrics

```csharp
// Define metrics — register as singleton
public class OrderMetrics
{
    private readonly Counter<long>   _ordersCreated;
    private readonly Histogram<double> _orderProcessingTime;
    private readonly UpDownCounter<int> _pendingOrders;

    public OrderMetrics(IMeterFactory meterFactory)
    {
        var meter = meterFactory.Create("MyApp.Orders");

        _ordersCreated = meter.CreateCounter<long>(
            "orders.created",
            unit: "{orders}",
            description: "Total number of orders created");

        _orderProcessingTime = meter.CreateHistogram<double>(
            "orders.processing_duration",
            unit: "ms",
            description: "Time to process an order");

        _pendingOrders = meter.CreateUpDownCounter<int>(
            "orders.pending",
            unit: "{orders}",
            description: "Current number of pending orders");
    }

    public void OrderCreated(string region) =>
        _ordersCreated.Add(1, new TagList { { "region", region } });

    public void RecordProcessingTime(double ms, string status) =>
        _orderProcessingTime.Record(ms, new TagList { { "status", status } });

    public void OrderPending(int delta) => _pendingOrders.Add(delta);
}

builder.Services.AddSingleton<OrderMetrics>();
```

---

### Serilog — Structured Logging

```csharp
// Program.cs — bootstrap logger first (catches startup errors)
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateBootstrapLogger();

builder.Host.UseSerilog((ctx, services, config) => config
    .ReadFrom.Configuration(ctx.Configuration)      // from appsettings.json
    .ReadFrom.Services(services)                    // inject ILogger enrichers
    .Enrich.FromLogContext()
    .Enrich.WithMachineName()
    .Enrich.WithEnvironmentName()
    .Enrich.WithProperty("Application", ctx.HostingEnvironment.ApplicationName)
    .WriteTo.Console(new CompactJsonFormatter())
    .WriteTo.Seq(ctx.Configuration["Seq:Url"]!)
    .WriteTo.OpenTelemetry(opt =>                   // send logs via OTLP
    {
        opt.Endpoint = ctx.Configuration["Otlp:Endpoint"];
        opt.ResourceAttributes.Add("service.name", ctx.HostingEnvironment.ApplicationName);
    }));

app.UseSerilogRequestLogging(opt =>
{
    opt.EnrichDiagnosticContext = (diag, http) =>
    {
        diag.Set("RequestHost",   http.Request.Host.Value);
        diag.Set("RequestScheme", http.Request.Scheme);
        diag.Set("UserAgent",     http.Request.Headers.UserAgent);
    };
    opt.GetLevel = (http, elapsed, ex) => ex is not null || http.Response.StatusCode >= 500
        ? LogEventLevel.Error
        : http.Response.StatusCode >= 400
            ? LogEventLevel.Warning
            : LogEventLevel.Information;
});
```

#### appsettings.json Serilog configuration

```json
{
  "Serilog": {
    "MinimumLevel": {
      "Default": "Information",
      "Override": {
        "Microsoft":                         "Warning",
        "Microsoft.EntityFrameworkCore":     "Warning",
        "System":                            "Warning"
      }
    }
  },
  "Seq": { "Url": "http://localhost:5341" },
  "Otlp": { "Endpoint": "http://localhost:4317" }
}
```

---

### Log Levels — When to Use

| Level | When |
|---|---|
| `Verbose` | Extremely detailed — dev only, never prod |
| `Debug` | Diagnostic info useful in dev/staging |
| `Information` | Normal application flow milestones |
| `Warning` | Unexpected but handled — degraded mode |
| `Error` | Failure requiring investigation, request failed |
| `Fatal` | App cannot continue — imminent crash |

```csharp
// Structured logging — always use message templates, never string interpolation
logger.LogInformation("Order {OrderId} placed by {CustomerId}", order.Id, order.CustomerId);

// ❌ Never do this — loses structure, may leak data
logger.LogInformation($"Order {order.Id} placed by {order.CustomerId}");

// Scoped properties — attach context for the duration of a request
using (LogContext.PushProperty("CorrelationId", correlationId))
using (LogContext.PushProperty("TenantId",      tenantId))
{
    logger.LogInformation("Processing started");
    // all log entries in this scope carry CorrelationId + TenantId
}
```

---

### Seq — Local & Centralised Log Server

Seq ingests structured logs and provides full-text + property search.

```bash
# Run Seq locally via Docker
docker run -d --name seq \
  -e ACCEPT_EULA=Y \
  -p 5341:80 \
  datalust/seq:latest
# UI: http://localhost:5341
```

**Useful Seq queries:**
```
# All errors in the last hour
@Level = 'Error' and @Timestamp > Now() - 1h

# Slow requests (over 1s)
Elapsed > 1000

# Orders for a specific customer
CustomerId = '3fa85f64-5717-4562-b3fc-2c963f66afa6'

# All logs for a correlation ID
CorrelationId = 'abc-123'
```

---

### Grafana Stack — Metrics & Traces

```yaml
# docker-compose.yml — full observability stack locally
services:
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports: ["9090:9090"]

  grafana:
    image: grafana/grafana:latest
    ports: ["3000:3000"]
    environment:
      GF_SECURITY_ADMIN_PASSWORD: admin
    volumes:
      - grafana-data:/var/lib/grafana

  tempo:                              # distributed trace backend
    image: grafana/tempo:latest
    ports: ["4317:4317", "3200:3200"]

  otel-collector:                     # receive OTLP, fan out to backends
    image: otel/opentelemetry-collector-contrib:latest
    volumes:
      - ./otel-config.yml:/etc/otel/config.yaml
    ports: ["4317:4317", "4318:4318"]
```

```yaml
# prometheus.yml — scrape .NET /metrics endpoint
scrape_configs:
  - job_name: "myapp"
    static_configs:
      - targets: ["host.docker.internal:5000"]
    metrics_path: /metrics
    scrape_interval: 15s
```

---

### .NET Aspire Dashboard (Built-in, .NET 8+)

When using Aspire, the dev dashboard is available at `https://localhost:15888` and provides:
- **Structured logs** — all services, searchable, filterable
- **Distributed traces** — waterfall view across service calls
- **Metrics** — resource utilisation, request rates
- **Resources** — health status of each service + container

No extra config needed — `AddServiceDefaults()` wires everything up automatically.

---

### Health Check → Alerting Pipeline

```
/health/ready endpoint
       │
       ▼
  Prometheus scrapes
       │
       ▼
  AlertManager rule:
    "health check failing > 2min → fire alert"
       │
       ▼
  PagerDuty / Slack / OpsGenie notification
```

```yaml
# Prometheus alert rule
groups:
  - name: myapp
    rules:
      - alert: HealthCheckFailing
        expr: |
          aspnetcore_healthcheck_status{job="myapp", status="Unhealthy"} == 1
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Health check {{ $labels.name }} is failing"
```

---

### Observability Checklist

| Item | Done? |
|---|---|
| Structured logging (no string interpolation) | ☐ |
| Correlation ID propagated across services | ☐ |
| Request logging middleware (Serilog) | ☐ |
| OpenTelemetry traces for all HTTP + DB calls | ☐ |
| Custom spans for critical business operations | ☐ |
| Metrics for business KPIs (orders/min, error rate) | ☐ |
| Prometheus `/metrics` endpoint exposed | ☐ |
| Health check endpoints (`/health/live`, `/health/ready`) | ☐ |
| Secrets never logged | ☐ |
| Log levels tuned per environment | ☐ |
| Alerts configured for error rate + latency SLOs | ☐ |

---


---

## 13. API Versioning

### Why Version?
API versioning lets you evolve your API without breaking existing clients. In .NET 8+, `Asp.Versioning.Http` is the standard package (replaces the old `Microsoft.AspNetCore.Mvc.Versioning`).

```bash
dotnet add package Asp.Versioning.Http
dotnet add package Asp.Versioning.Mvc          # for Controller APIs
dotnet add package Asp.Versioning.Http.Client  # for typed HttpClient consumers
```

### Setup

```csharp
builder.Services.AddApiVersioning(opt =>
{
    opt.DefaultApiVersion                = new ApiVersion(1, 0);
    opt.AssumeDefaultVersionWhenUnspecified = true;
    opt.ReportApiVersions               = true;   // adds api-supported-versions header

    // Strategy: URL segment, query string, header, or media type
    opt.ApiVersionReader = ApiVersionReader.Combine(
        new UrlSegmentApiVersionReader(),                           // /api/v1/orders
        new HeaderApiVersionReader("X-Api-Version"),               // X-Api-Version: 1.0
        new QueryStringApiVersionReader("api-version"));           // ?api-version=1.0
})
.AddApiExplorer(opt =>
{
    opt.GroupNameFormat           = "'v'VVV";    // v1, v2
    opt.SubstituteApiVersionInUrl = true;
});
```

### URL Segment Versioning (Minimal APIs)

```csharp
var v1 = app.NewVersionedApi("Orders");

// V1 group
var ordersV1 = v1.MapGroup("/api/v{version:apiVersion}/orders")
                 .HasApiVersion(1, 0);

ordersV1.MapGet("/",    GetOrdersV1);
ordersV1.MapGet("/{id}", GetOrderByIdV1);

// V2 group — adds extra fields, changes shape
var ordersV2 = v1.MapGroup("/api/v{version:apiVersion}/orders")
                 .HasApiVersion(2, 0);

ordersV2.MapGet("/",    GetOrdersV2);
ordersV2.MapGet("/{id}", GetOrderByIdV2);
ordersV2.MapPost("/",   CreateOrderV2);   // new in V2
```

### Controller-Based Versioning

```csharp
[ApiController]
[Route("api/v{version:apiVersion}/orders")]
[ApiVersion("1.0")]
[ApiVersion("1.1")]
public class OrdersV1Controller : ControllerBase
{
    [HttpGet]
    public IActionResult GetAll() => Ok("V1 orders");

    [HttpGet, MapToApiVersion("1.1")]
    public IActionResult GetAllV1_1() => Ok("V1.1 orders — extra fields");
}

[ApiController]
[Route("api/v{version:apiVersion}/orders")]
[ApiVersion("2.0")]
public class OrdersV2Controller : ControllerBase
{
    [HttpGet]
    public IActionResult GetAll() => Ok("V2 orders — new shape");
}
```

### Deprecating a Version

```csharp
[ApiVersion("1.0", Deprecated = true)]
[ApiVersion("2.0")]
public class OrdersController : ControllerBase { }
// Response headers will include:
// api-supported-versions: 2.0
// api-deprecated-versions: 1.0
```

### Versioning Strategy Comparison

| Strategy | URL Example | Pros | Cons |
|---|---|---|---|
| **URL Segment** | `/api/v1/orders` | Visible, cacheable, easy to test | Pollutes URL structure |
| **Query String** | `/orders?api-version=1.0` | Non-breaking, clean URLs | Less visible |
| **Header** | `X-Api-Version: 1.0` | Clean URLs | Hard to test in browser |
| **Media Type** | `Accept: application/json;v=1.0` | REST-pure | Complex clients |

> Recommended: **URL segment** for public APIs, **header** for internal service-to-service.

---

## 14. Configuration & Options Pattern

### Configuration Sources (in priority order)

```csharp
// .NET 8 default host builder layers these in order (last wins):
builder.Configuration
    .AddJsonFile("appsettings.json",                     optional: false, reloadOnChange: true)
    .AddJsonFile($"appsettings.{env.EnvironmentName}.json", optional: true,  reloadOnChange: true)
    .AddEnvironmentVariables()     // override with env vars in containers/k8s
    .AddCommandLine(args)          // override at runtime
    .AddUserSecrets<Program>(optional: true);  // dev only — never commit
```

### Options Pattern — Three Variants

```csharp
// Register
builder.Services.Configure<OrderSettings>(
    builder.Configuration.GetSection("OrderSettings"));

// appsettings.json
{
  "OrderSettings": {
    "MaxItemsPerOrder": 50,
    "DefaultCurrency":  "USD",
    "ExpiryMinutes":    30
  }
}

public record OrderSettings
{
    public int    MaxItemsPerOrder { get; init; } = 10;
    public string DefaultCurrency  { get; init; } = "USD";
    public int    ExpiryMinutes    { get; init; } = 60;
}
```

| Interface | Lifetime | Reloads? | Use When |
|---|---|---|---|
| `IOptions<T>` | Singleton | ❌ Never | Config fixed at startup |
| `IOptionsSnapshot<T>` | Scoped | ✅ Per request | Config may change between requests |
| `IOptionsMonitor<T>` | Singleton | ✅ On file change | Long-running services, background workers |

```csharp
// IOptions<T> — injected as singleton, never reflects live changes
public class OrderService(IOptions<OrderSettings> options)
{
    private readonly OrderSettings _settings = options.Value;
}

// IOptionsSnapshot<T> — fresh value each HTTP request
public class PricingService(IOptionsSnapshot<PricingSettings> snapshot)
{
    private readonly PricingSettings _settings = snapshot.Value;
}

// IOptionsMonitor<T> — reacts to changes without restart
public class FeatureFlagService(IOptionsMonitor<FeatureFlags> monitor)
{
    public bool IsEnabled(string flag) =>
        monitor.CurrentValue.EnabledFlags.Contains(flag);

    // Subscribe to changes
    public FeatureFlagService(IOptionsMonitor<FeatureFlags> monitor)
    {
        monitor.OnChange(updated =>
            Console.WriteLine($"Flags updated: {string.Join(", ", updated.EnabledFlags)}"));
    }
}
```

### Options Validation

```csharp
// Validate on startup — fail fast if config is wrong
builder.Services
    .AddOptions<OrderSettings>()
    .BindConfiguration("OrderSettings")
    .ValidateDataAnnotations()      // uses [Required], [Range] etc.
    .ValidateOnStart();             // crash at startup rather than runtime

public record OrderSettings
{
    [Required]
    public string DefaultCurrency { get; init; } = null!;

    [Range(1, 1000)]
    public int MaxItemsPerOrder { get; init; }
}

// Or custom FluentValidation-style validation
builder.Services
    .AddOptions<SmtpSettings>()
    .BindConfiguration("Smtp")
    .Validate(s => Uri.IsWellFormedUriString(s.Host, UriKind.Absolute),
              "Smtp:Host must be a valid URI")
    .ValidateOnStart();
```

### Named Options

```csharp
// Register multiple named instances
builder.Services.Configure<SmtpSettings>("Primary",  config.GetSection("Smtp:Primary"));
builder.Services.Configure<SmtpSettings>("Backup",   config.GetSection("Smtp:Backup"));

// Resolve by name
public class EmailService(IOptionsMonitor<SmtpSettings> monitor)
{
    private SmtpSettings Primary => monitor.Get("Primary");
    private SmtpSettings Backup  => monitor.Get("Backup");
}
```

### Azure Key Vault Integration

```bash
dotnet add package Azure.Extensions.AspNetCore.Configuration.Secrets
dotnet add package Azure.Identity
```

```csharp
// Program.cs
if (!builder.Environment.IsDevelopment())
{
    var keyVaultUri = new Uri(builder.Configuration["KeyVault:Uri"]!);
    builder.Configuration.AddAzureKeyVault(keyVaultUri, new DefaultAzureCredential());
}

// Secret naming: Key Vault uses '--' as the section separator
// "ConnectionStrings--DefaultConnection" → ConnectionStrings:DefaultConnection
```

### AWS Secrets Manager

```csharp
// dotnet add package Amazon.Extensions.Configuration.SystemsManager
builder.Configuration.AddSystemsManager("/myapp/production/");
```

### HashiCorp Vault

```csharp
// dotnet add package VaultSharp
var vaultClient = new VaultClient(new VaultClientSettings(
    "https://vault.example.com",
    new TokenAuthMethodInfo(token)));

var secret = await vaultClient.V1.Secrets.KeyValue.V2
    .ReadSecretAsync(path: "myapp/db", mountPoint: "secret");
```

### Environment Variable Naming

```bash
# Nested config → double underscore in env vars (works in all OS)
# OrderSettings:MaxItemsPerOrder
export OrderSettings__MaxItemsPerOrder=100

# Connection strings
export ConnectionStrings__DefaultConnection="Server=...;Database=...;"
```

---

## 15. Background Jobs & Scheduling

### BackgroundService — Built-in

Use for **continuous** or **triggered** long-running work without a scheduler.

```csharp
public class OutboxProcessorWorker(
    IServiceScopeFactory scopeFactory,
    ILogger<OutboxProcessorWorker> logger,
    TimeProvider time) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("Outbox processor started");

        await using var timer = new PeriodicTimer(TimeSpan.FromSeconds(10));

        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                await using var scope = scopeFactory.CreateAsyncScope();
                var processor = scope.ServiceProvider
                    .GetRequiredService<IOutboxProcessor>();

                await processor.ProcessPendingAsync(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogError(ex, "Error processing outbox");
            }
        }
    }
}

builder.Services.AddHostedService<OutboxProcessorWorker>();
```

> Use `PeriodicTimer` (.NET 6+) instead of `Task.Delay` in loops — it skips missed ticks rather than drifting.

---

### Hangfire — Persistent Background Jobs

Best for: **reliable**, **retryable**, **schedulable** jobs with a management UI.

```bash
dotnet add package Hangfire.AspNetCore
dotnet add package Hangfire.SqlServer    # or .PostgreSql / .InMemory
```

```csharp
// Registration
builder.Services.AddHangfire(cfg => cfg
    .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
    .UseSimpleAssemblyNameTypeSerializer()
    .UseRecommendedSerializerSettings()
    .UseSqlServerStorage(builder.Configuration.GetConnectionString("HangfireDb")));

builder.Services.AddHangfireServer(opt =>
{
    opt.WorkerCount  = Environment.ProcessorCount * 2;
    opt.Queues       = ["critical", "default", "low"];
});

app.MapHangfireDashboard("/hangfire", new DashboardOptions
{
    Authorization = [new HangfireAuthFilter()]   // always protect in production
});

// Job types
public class ReportService
{
    // Fire-and-forget
    public void EnqueueWelcomeEmail(Guid userId)
        => BackgroundJob.Enqueue<IEmailService>(s => s.SendWelcomeAsync(userId));

    // Delayed
    public void ScheduleFollowUp(Guid userId)
        => BackgroundJob.Schedule<IEmailService>(
            s => s.SendFollowUpAsync(userId),
            TimeSpan.FromDays(3));

    // Recurring (cron)
    public void RegisterRecurringJobs()
    {
        RecurringJob.AddOrUpdate<IReportGenerator>(
            recurringJobId: "daily-sales-report",
            methodCall:     gen => gen.GenerateAsync(CancellationToken.None),
            cronExpression: Cron.Daily(hour: 6),
            options:        new RecurringJobOptions { TimeZone = TimeZoneInfo.Utc });
    }

    // Continuations — chain jobs
    public void EnqueueOrderPipeline(Guid orderId)
    {
        var jobId = BackgroundJob.Enqueue<IOrderProcessor>(
            p => p.ValidateAsync(orderId));

        BackgroundJob.ContinueJobWith<IOrderProcessor>(
            jobId, p => p.FulfillAsync(orderId));
    }
}
```

---

### Quartz.NET — Advanced Scheduling

Best for: **complex cron triggers**, **job clustering**, **misfire handling**.

```bash
dotnet add package Quartz.AspNetCore
dotnet add package Quartz.Extensions.Hosting
```

```csharp
builder.Services.AddQuartz(q =>
{
    q.UseMicrosoftDependencyInjectionJobFactory();

    // Define job
    var jobKey = new JobKey("InvoiceJob", "billing");

    q.AddJob<GenerateInvoicesJob>(opts => opts
        .WithIdentity(jobKey)
        .DisallowConcurrentExecution()
        .StoreDurably());

    // Trigger: every day at 02:00 UTC
    q.AddTrigger(opts => opts
        .ForJob(jobKey)
        .WithIdentity("InvoiceJob-trigger")
        .WithCronSchedule("0 0 2 * * ?",
            x => x.InTimeZone(TimeZoneInfo.Utc)
                   .WithMisfireHandlingInstructionFireAndProceed()));
});

builder.Services.AddQuartzHostedService(opt => opt.WaitForJobsToComplete = true);

// Job implementation
[DisallowConcurrentExecution]
public class GenerateInvoicesJob(IInvoiceService invoiceService, ILogger<GenerateInvoicesJob> logger)
    : IJob
{
    public async Task Execute(IJobExecutionContext context)
    {
        logger.LogInformation("Generating invoices, triggered at {FireTime}", context.FireTimeUtc);
        await invoiceService.GenerateMonthlyAsync(context.CancellationToken);
    }
}
```

### Comparison

| | `BackgroundService` | Hangfire | Quartz.NET |
|---|---|---|---|
| **Persistent jobs** | ❌ | ✅ SQL / Redis | ✅ SQL / RAM |
| **Retry on failure** | Manual | ✅ Automatic | Manual |
| **Dashboard UI** | ❌ | ✅ Built-in | ❌ (3rd party) |
| **Cron scheduling** | ❌ | ✅ | ✅ Advanced |
| **Job chaining** | ❌ | ✅ Continuations | ✅ Job chains |
| **Clustering** | ❌ | ✅ | ✅ |
| **Best for** | Simple loops | Reliable job queues | Complex schedules |

---

## 16. Feature Flags

### Microsoft.FeatureManagement

```bash
dotnet add package Microsoft.FeatureManagement.AspNetCore
```

```csharp
// Registration
builder.Services.AddFeatureManagement();

// appsettings.json
{
  "FeatureManagement": {
    "NewCheckoutFlow":     true,
    "BetaPricingEngine":   false,
    "DarkMode":            true
  }
}

// Usage in a service
public class CheckoutService(IFeatureManager features)
{
    public async Task<CheckoutResult> CheckoutAsync(Cart cart, CancellationToken ct)
    {
        if (await features.IsEnabledAsync("NewCheckoutFlow"))
            return await NewCheckoutAsync(cart, ct);

        return await LegacyCheckoutAsync(cart, ct);
    }
}

// Usage on a Minimal API endpoint
app.MapPost("/checkout", CheckoutHandler)
   .WithFeatureGate("NewCheckoutFlow");   // returns 404 if flag is off

// Usage on a Controller action
[FeatureGate("BetaPricingEngine")]
[HttpGet("pricing/beta")]
public IActionResult GetBetaPricing() => Ok();
```

### Percentage Rollout Filter

```json
{
  "FeatureManagement": {
    "GradualRollout": {
      "EnabledFor": [{
        "Name": "Microsoft.Percentage",
        "Parameters": { "Value": 20 }
      }]
    }
  }
}
```

### Targeting Filter (per user / group)

```json
{
  "FeatureManagement": {
    "EarlyAccess": {
      "EnabledFor": [{
        "Name": "Microsoft.Targeting",
        "Parameters": {
          "Audience": {
            "Users":  ["alice@example.com", "bob@example.com"],
            "Groups": [{ "Name": "beta-testers", "RolloutPercentage": 100 }],
            "DefaultRolloutPercentage": 0
          }
        }
      }]
    }
  }
}
```

```csharp
// Set targeting context (who the current user is)
builder.Services.AddSingleton<ITargetingContextAccessor, HttpContextTargetingContextAccessor>();

public class HttpContextTargetingContextAccessor(IHttpContextAccessor http)
    : ITargetingContextAccessor
{
    public ValueTask<TargetingContext> GetContextAsync() =>
        ValueTask.FromResult(new TargetingContext
        {
            UserId = http.HttpContext?.User.FindFirstValue(ClaimTypes.Email) ?? "anonymous",
            Groups = http.HttpContext?.User.FindAll("groups").Select(c => c.Value).ToList()
                     ?? []
        });
}
```

### Azure App Configuration (centralised flags)

```csharp
builder.Configuration.AddAzureAppConfiguration(opt =>
{
    opt.Connect(builder.Configuration["AppConfig:ConnectionString"])
       .UseFeatureFlags(ff => ff.SetRefreshInterval(TimeSpan.FromSeconds(30)));
});

builder.Services.AddAzureAppConfiguration();
builder.Services.AddFeatureManagement();

app.UseAzureAppConfiguration(); // enables periodic refresh
```

---

## 17. Pagination

### Offset-Based Pagination

Simple but has performance issues on large datasets (DB must scan all previous rows).

```csharp
// Request
public record PagedRequest(int Page = 1, int PageSize = 20)
{
    public int Skip => (Page - 1) * PageSize;
    public int Take => Math.Min(PageSize, 100);   // cap max page size
}

// Response envelope
public record PagedResponse<T>
{
    public IReadOnlyList<T> Items      { get; init; } = [];
    public int              Page       { get; init; }
    public int              PageSize   { get; init; }
    public int              TotalCount { get; init; }
    public int              TotalPages => (int)Math.Ceiling(TotalCount / (double)PageSize);
    public bool             HasNext    => Page < TotalPages;
    public bool             HasPrevious => Page > 1;
}

// EF Core query
public async Task<PagedResponse<OrderDto>> GetOrdersAsync(PagedRequest req, CancellationToken ct)
{
    var query = _context.Orders
        .Where(o => o.Status == OrderStatus.Active)
        .OrderByDescending(o => o.CreatedAt);

    var total = await query.CountAsync(ct);

    var items = await query
        .Skip(req.Skip)
        .Take(req.Take)
        .Select(o => new OrderDto(o.Id, o.Status, o.CreatedAt))
        .ToListAsync(ct);

    return new PagedResponse<OrderDto>
    {
        Items      = items,
        Page       = req.Page,
        PageSize   = req.Take,
        TotalCount = total
    };
}

// Minimal API endpoint
app.MapGet("/orders", async (
    [AsParameters] PagedRequest req,
    IOrderService service,
    CancellationToken ct) =>
{
    var result = await service.GetOrdersAsync(req, ct);
    return Results.Ok(result);
});
```

### Cursor-Based Pagination (Keyset)

Performant at any dataset size — no OFFSET scan. Ideal for large tables and infinite scroll.

```csharp
// Request
public record CursorRequest(string? Cursor = null, int PageSize = 20);

// Cursor is a base64-encoded opaque value (hides implementation details)
public static class CursorHelper
{
    public static string Encode(DateTimeOffset createdAt, Guid id) =>
        Convert.ToBase64String(
            Encoding.UTF8.GetBytes($"{createdAt:O}|{id}"));

    public static (DateTimeOffset CreatedAt, Guid Id) Decode(string cursor)
    {
        var raw   = Encoding.UTF8.GetString(Convert.FromBase64String(cursor));
        var parts = raw.Split('|');
        return (DateTimeOffset.Parse(parts[0]), Guid.Parse(parts[1]));
    }
}

// EF Core keyset query
public async Task<CursorPagedResponse<OrderDto>> GetOrdersAsync(
    CursorRequest req, CancellationToken ct)
{
    var take = Math.Min(req.PageSize, 100) + 1;  // fetch one extra to detect HasNext

    IQueryable<Order> query = _context.Orders.OrderByDescending(o => o.CreatedAt)
                                             .ThenByDescending(o => o.Id);

    if (req.Cursor is not null)
    {
        var (after, afterId) = CursorHelper.Decode(req.Cursor);
        query = query.Where(o =>
            o.CreatedAt < after ||
            (o.CreatedAt == after && o.Id.Value.CompareTo(afterId) < 0));
    }

    var items = await query
        .Take(take)
        .Select(o => new OrderDto(o.Id, o.Status, o.CreatedAt))
        .ToListAsync(ct);

    var hasNext   = items.Count == take;
    var pageItems = hasNext ? items[..^1] : items;

    var nextCursor = hasNext
        ? CursorHelper.Encode(pageItems[^1].CreatedAt, pageItems[^1].Id.Value)
        : null;

    return new CursorPagedResponse<OrderDto>
    {
        Items      = pageItems,
        NextCursor = nextCursor,
        HasNext    = hasNext
    };
}
```

### Comparison

| | Offset Pagination | Cursor (Keyset) Pagination |
|---|---|---|
| **Performance** | ❌ Degrades on large pages | ✅ Constant regardless of depth |
| **Random access** | ✅ Jump to any page | ❌ Forward only |
| **Total count** | ✅ Easy | ❌ Expensive / omitted |
| **Stable results** | ❌ Items shift on insert | ✅ Stable |
| **Best for** | Admin UIs, small tables | Feeds, large tables, mobile |

---

## 18. Multi-Tenancy

### Tenant Resolution Strategies

```csharp
// Resolve tenant from different sources
public interface ITenantResolver
{
    Task<string?> ResolveAsync(HttpContext ctx);
}

// 1. Subdomain: tenant1.myapp.com
public class SubdomainTenantResolver : ITenantResolver
{
    public Task<string?> ResolveAsync(HttpContext ctx)
    {
        var host   = ctx.Request.Host.Host;          // "tenant1.myapp.com"
        var parts  = host.Split('.');
        var tenant = parts.Length >= 3 ? parts[0] : null;
        return Task.FromResult(tenant);
    }
}

// 2. Route: /api/{tenant}/orders
public class RouteTenantResolver : ITenantResolver
{
    public Task<string?> ResolveAsync(HttpContext ctx)
    {
        ctx.Request.RouteValues.TryGetValue("tenant", out var tenant);
        return Task.FromResult(tenant?.ToString());
    }
}

// 3. JWT claim
public class ClaimTenantResolver : ITenantResolver
{
    public Task<string?> ResolveAsync(HttpContext ctx)
    {
        var tenant = ctx.User.FindFirstValue("tenant_id");
        return Task.FromResult(tenant);
    }
}

// 4. Header: X-Tenant-Id
public class HeaderTenantResolver : ITenantResolver
{
    public Task<string?> ResolveAsync(HttpContext ctx)
    {
        ctx.Request.Headers.TryGetValue("X-Tenant-Id", out var tenant);
        return Task.FromResult(tenant.FirstOrDefault());
    }
}
```

### Tenant Context

```csharp
public class TenantContext
{
    public string TenantId { get; set; } = null!;
    public string? ConnectionString { get; set; }
}

public interface ITenantContext
{
    string TenantId { get; }
}

// Middleware — resolve and store tenant per request
public class TenantMiddleware(ITenantResolver resolver) : IMiddleware
{
    public async Task InvokeAsync(HttpContext ctx, RequestDelegate next)
    {
        var tenantId = await resolver.ResolveAsync(ctx);

        if (string.IsNullOrEmpty(tenantId))
        {
            ctx.Response.StatusCode = 400;
            await ctx.Response.WriteAsJsonAsync(new { error = "Tenant could not be resolved" });
            return;
        }

        ctx.Items["TenantId"] = tenantId;
        await next(ctx);
    }
}
```

### Data Isolation Strategies

| Strategy | Description | Best For |
|---|---|---|
| **Shared DB, shared schema** | `TenantId` column on every table + global EF query filter | SaaS, many small tenants |
| **Shared DB, separate schema** | Each tenant has its own schema | Medium isolation needs |
| **Separate DB per tenant** | Connection string resolved per request | High isolation, compliance |

```csharp
// Strategy 1: EF Core global query filter (shared DB + shared schema)
public class AppDbContext(DbContextOptions options, ITenantContext tenant)
    : DbContext(options)
{
    public DbSet<Order> Orders => Set<Order>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Automatically filter all queries by TenantId
        modelBuilder.Entity<Order>()
            .HasQueryFilter(o => o.TenantId == tenant.TenantId);

        // Always set TenantId on insert
        modelBuilder.Entity<Order>()
            .Property(o => o.TenantId)
            .HasDefaultValueSql("''");
    }

    public override Task<int> SaveChangesAsync(CancellationToken ct = default)
    {
        // Stamp TenantId on all new entities
        foreach (var entry in ChangeTracker.Entries<ITenantEntity>()
                     .Where(e => e.State == EntityState.Added))
        {
            entry.Entity.TenantId = tenant.TenantId;
        }
        return base.SaveChangesAsync(ct);
    }
}

// Strategy 3: Separate DB per tenant
public class TenantDbContextFactory(ITenantContext tenant, IConfiguration config)
{
    public AppDbContext Create()
    {
        var connStr = config[$"TenantConnections:{tenant.TenantId}"]
                      ?? throw new InvalidOperationException($"No DB for tenant {tenant.TenantId}");

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(connStr)
            .Options;

        return new AppDbContext(options, tenant);
    }
}
```

---

## 19. File Upload & Download

### Small File Upload (IFormFile)

```csharp
app.MapPost("/files/upload", async (
    IFormFile file,
    IBlobStorage storage,
    CancellationToken ct) =>
{
    // Validate
    const long maxSize = 10 * 1024 * 1024; // 10 MB
    var allowed = new[] { ".pdf", ".jpg", ".png", ".xlsx" };

    if (file.Length == 0)
        return Results.BadRequest("Empty file");
    if (file.Length > maxSize)
        return Results.BadRequest($"File exceeds {maxSize / 1024 / 1024} MB limit");
    if (!allowed.Contains(Path.GetExtension(file.FileName).ToLowerInvariant()))
        return Results.BadRequest("File type not allowed");

    // Store
    await using var stream = file.OpenReadStream();
    var blobName = $"{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";
    var uri = await storage.UploadAsync(blobName, stream, file.ContentType, ct);

    return Results.Created(uri.ToString(), new { FileName = blobName, Uri = uri });
})
.DisableAntiforgery()
.Accepts<IFormFile>("multipart/form-data")
.Produces<FileUploadResponse>(201)
.WithSummary("Upload a file");
```

### Large File Streaming Upload (no buffering)

```csharp
// Disable request body size limit for this endpoint
app.MapPost("/files/upload/large", async (HttpContext ctx, IBlobStorage storage) =>
{
    if (!ctx.Request.ContentType?.Contains("multipart/form-data") ?? true)
        return Results.BadRequest("Must be multipart/form-data");

    var reader = new MultipartReader(
        MediaTypeHeaderValue.Parse(ctx.Request.ContentType).Parameters
            .First(p => p.Name == "boundary").Value!,
        ctx.Request.Body);

    MultipartSection? section;
    while ((section = await reader.ReadNextSectionAsync()) is not null)
    {
        if (!ContentDispositionHeaderValue.TryParse(
                section.ContentDisposition, out var cd) || !cd.IsFileDisposition())
            continue;

        var fileName = cd.FileName.Value ?? "upload";
        var blobName = $"{Guid.NewGuid()}{Path.GetExtension(fileName)}";

        // Stream directly to blob storage — never touches disk
        await storage.UploadStreamAsync(blobName, section.Body,
            section.ContentType ?? "application/octet-stream");

        return Results.Ok(new { FileName = blobName });
    }

    return Results.BadRequest("No file section found");
})
.WithRequestTimeout(TimeSpan.FromMinutes(10));
```

### File Download (Streaming Response)

```csharp
app.MapGet("/files/{blobName}", async (
    string blobName,
    IBlobStorage storage,
    CancellationToken ct) =>
{
    var (stream, contentType) = await storage.DownloadAsync(blobName, ct);

    if (stream is null) return Results.NotFound();

    // Stream directly to response — no intermediate buffering
    return Results.Stream(
        stream,
        contentType:       contentType,
        fileDownloadName:  blobName,          // triggers Content-Disposition: attachment
        enableRangeProcessing: true);         // supports Range header / resumable downloads
});
```

### Azure Blob Storage Abstraction

```csharp
public interface IBlobStorage
{
    Task<Uri> UploadAsync(string name, Stream stream, string contentType, CancellationToken ct);
    Task<(Stream? Stream, string ContentType)> DownloadAsync(string name, CancellationToken ct);
    Task DeleteAsync(string name, CancellationToken ct);
    Task<string> GetSasUrlAsync(string name, TimeSpan expiry);  // presigned URL
}

// Implementation using Azure SDK
public class AzureBlobStorage(BlobServiceClient client, IOptions<BlobSettings> settings)
    : IBlobStorage
{
    private BlobContainerClient Container =>
        client.GetBlobContainerClient(settings.Value.ContainerName);

    public async Task<Uri> UploadAsync(
        string name, Stream stream, string contentType, CancellationToken ct)
    {
        var blob = Container.GetBlobClient(name);
        await blob.UploadAsync(stream,
            new BlobUploadOptions { HttpHeaders = new BlobHttpHeaders { ContentType = contentType } },
            ct);
        return blob.Uri;
    }

    public async Task<string> GetSasUrlAsync(string name, TimeSpan expiry)
    {
        var blob = Container.GetBlobClient(name);
        var sas  = blob.GenerateSasUri(BlobSasPermissions.Read, DateTimeOffset.UtcNow.Add(expiry));
        return sas.ToString();
    }
}
```

---

## 20. Response Compression

Built-in `Microsoft.AspNetCore.ResponseCompression` — no extra package needed.

```csharp
builder.Services.AddResponseCompression(opt =>
{
    opt.EnableForHttps = true;    // compress HTTPS responses (safe for APIs not serving HTML)
    opt.Providers.Add<BrotliCompressionProvider>();
    opt.Providers.Add<GzipCompressionProvider>();
    opt.MimeTypes = ResponseCompressionDefaults.MimeTypes.Concat(
    [
        "application/json",
        "application/problem+json",
        "text/csv",
        "application/octet-stream"
    ]);
});

builder.Services.Configure<BrotliCompressionProviderOptions>(opt =>
    opt.Level = CompressionLevel.Fastest);  // Fastest = good balance; Optimal = max compression

builder.Services.Configure<GzipCompressionProviderOptions>(opt =>
    opt.Level = CompressionLevel.SmartButNotTooSmart);  // .NET 9

app.UseResponseCompression();  // must be early in pipeline — before UseStaticFiles, UseRouting
```

> **Order matters:** `UseResponseCompression` must come **before** any middleware that writes the response body.

### When to Use

| Scenario | Compress? |
|---|---|
| Large JSON API responses | ✅ Yes |
| Small responses (< 1 KB) | ❌ Overhead exceeds gain |
| Already-compressed files (JPEG, PNG, zip) | ❌ Will grow, not shrink |
| HTTPS + HTML with user data (BREACH attack) | ⚠️ Disable for sensitive HTML — fine for JSON APIs |
| Static files | ✅ Use pre-compressed files with `UseStaticFiles` instead |

---

## 21. JSON Options & Output Formatting

### System.Text.Json (.NET 8+)

```csharp
builder.Services.ConfigureHttpJsonOptions(opt =>
{
    opt.SerializerOptions.PropertyNamingPolicy        = JsonNamingPolicy.CamelCase;
    opt.SerializerOptions.DefaultIgnoreCondition      = JsonIgnoreCondition.WhenWritingNull;
    opt.SerializerOptions.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.CamelCase));
    opt.SerializerOptions.WriteIndented               = false;   // compact for APIs
    opt.SerializerOptions.NumberHandling              = JsonNumberHandling.AllowReadingFromString;
    opt.SerializerOptions.ReferenceHandler            = ReferenceHandler.IgnoreCycles;
});

// For Controller-based APIs
builder.Services.AddControllers().AddJsonOptions(opt =>
{
    opt.JsonSerializerOptions.PropertyNamingPolicy   = JsonNamingPolicy.CamelCase;
    opt.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
});
```

### Source Generation (AOT-compatible, zero reflection)

```csharp
// Define context — tells the compiler which types to generate serialisers for
[JsonSerializable(typeof(OrderResponse))]
[JsonSerializable(typeof(List<OrderResponse>))]
[JsonSerializable(typeof(PagedResponse<OrderResponse>))]
[JsonSerializable(typeof(ProblemDetails))]
[JsonSourceGenerationOptions(
    PropertyNamingPolicy       = JsonKnownNamingPolicy.CamelCase,
    DefaultIgnoreCondition     = JsonIgnoreCondition.WhenWritingNull,
    WriteIndented              = false)]
public partial class AppJsonContext : JsonSerializerContext { }

// Register
builder.Services.ConfigureHttpJsonOptions(opt =>
    opt.SerializerOptions.TypeInfoResolverChain.Insert(0, AppJsonContext.Default));
```

### Custom Converters

```csharp
// Strongly-typed ID converter
public class OrderIdJsonConverter : JsonConverter<OrderId>
{
    public override OrderId Read(ref Utf8JsonReader reader, Type type, JsonSerializerOptions opt)
        => new(reader.GetGuid());

    public override void Write(Utf8JsonWriter writer, OrderId value, JsonSerializerOptions opt)
        => writer.WriteStringValue(value.Value);
}

// DateOnly converter (useful for date-only fields)
public class DateOnlyConverter : JsonConverter<DateOnly>
{
    private const string Format = "yyyy-MM-dd";

    public override DateOnly Read(ref Utf8JsonReader reader, Type type, JsonSerializerOptions opt)
        => DateOnly.ParseExact(reader.GetString()!, Format);

    public override void Write(Utf8JsonWriter writer, DateOnly value, JsonSerializerOptions opt)
        => writer.WriteStringValue(value.ToString(Format));
}

// Register globally
builder.Services.ConfigureHttpJsonOptions(opt =>
{
    opt.SerializerOptions.Converters.Add(new OrderIdJsonConverter());
    opt.SerializerOptions.Converters.Add(new DateOnlyConverter());
});
```

### Content Negotiation (Controller APIs)

```csharp
builder.Services.AddControllers(opt =>
{
    opt.RespectBrowserAcceptHeader = true;  // honour Accept header
    opt.ReturnHttpNotAcceptable    = true;  // 406 if format not supported
})
.AddXmlSerializerFormatters()  // support application/xml
.AddJsonOptions(/* ... */);
```

---

## 22. Middleware Pipeline & Ordering

The order of `app.Use*()` calls in `Program.cs` is critical. Middleware runs top-to-bottom on the request and bottom-to-top on the response.

### Correct Ordering (.NET 8+)

```csharp
// ── Security ─────────────────────────────────────────────────────────
app.UseExceptionHandler();        // 1. Catch all unhandled exceptions FIRST
app.UseHsts();                    // 2. Add Strict-Transport-Security header
app.UseHttpsRedirection();        // 3. Redirect HTTP → HTTPS

// ── Infrastructure ───────────────────────────────────────────────────
app.UseResponseCompression();     // 4. Compress responses (before anything writes body)
app.UseStaticFiles();             // 5. Serve static files (bypass remaining pipeline)

// ── Routing ──────────────────────────────────────────────────────────
app.UseRouting();                 // 6. Match endpoints (required before auth)

// ── Cross-Origin ─────────────────────────────────────────────────────
app.UseCors("AllowFrontend");     // 7. After routing, before auth

// ── Auth ─────────────────────────────────────────────────────────────
app.UseAuthentication();          // 8. Who are you?
app.UseAuthorization();           // 9. Are you allowed?

// ── Rate Limiting ────────────────────────────────────────────────────
app.UseRateLimiter();             // 10. After auth (so you can rate-limit per user)

// ── App Specifics ────────────────────────────────────────────────────
app.UseOutputCache();             // 11. Cache responses after auth check
app.UseSerilogRequestLogging();   // 12. Log requests (after routing for route data)

// ── Endpoints ────────────────────────────────────────────────────────
app.MapControllers();             // 13. Map controller routes
app.MapHealthChecks("/health");   // 14. Health check endpoints
app.Run();
```

### Common Ordering Mistakes

| Mistake | Symptom |
|---|---|
| `UseAuthorization()` before `UseAuthentication()` | 401 on all requests — user never identified |
| `UseCors()` after `UseAuthorization()` | CORS preflight (OPTIONS) fails — blocked before auth |
| `UseResponseCompression()` after `UseStaticFiles()` | Static files not compressed |
| `UseExceptionHandler()` not first | Exceptions thrown by middleware before it leak stack traces |
| `UseRateLimiter()` before `UseAuthentication()` | Can't rate-limit per user — only per IP |
| `UseOutputCache()` before `UseAuthorization()` | Cached responses served without auth check |

### Custom Middleware

```csharp
// Convention-based (preferred for simple cases)
public class CorrelationIdMiddleware(RequestDelegate next)
{
    private const string Header = "X-Correlation-Id";

    public async Task InvokeAsync(HttpContext ctx)
    {
        var correlationId = ctx.Request.Headers[Header].FirstOrDefault()
                            ?? Guid.NewGuid().ToString();

        ctx.Items["CorrelationId"] = correlationId;
        ctx.Response.Headers.TryAdd(Header, correlationId);

        using (LogContext.PushProperty("CorrelationId", correlationId))
        {
            await next(ctx);
        }
    }
}

// IMiddleware (DI-friendly — scoped dependencies work correctly)
public class TenantMiddleware(ITenantResolver resolver) : IMiddleware
{
    public async Task InvokeAsync(HttpContext ctx, RequestDelegate next)
    {
        // Scoped services injected here are request-scoped
        var tenantId = await resolver.ResolveAsync(ctx);
        ctx.Items["TenantId"] = tenantId;
        await next(ctx);
    }
}

// Register IMiddleware implementations
builder.Services.AddScoped<TenantMiddleware>();

// Add to pipeline
app.UseMiddleware<CorrelationIdMiddleware>();
app.UseMiddleware<TenantMiddleware>();
```

### Endpoint Filters (Minimal APIs — replaces Action Filters)

```csharp
// Reusable endpoint filter
public class ValidationFilter<T> : IEndpointFilter where T : class
{
    public async ValueTask<object?> InvokeAsync(
        EndpointFilterInvocationContext ctx, EndpointFilterDelegate next)
    {
        var arg = ctx.Arguments.OfType<T>().FirstOrDefault();
        if (arg is null) return Results.BadRequest("Invalid request body");

        var validator = ctx.HttpContext.RequestServices.GetService<IValidator<T>>();
        if (validator is not null)
        {
            var result = await validator.ValidateAsync(arg);
            if (!result.IsValid)
                return Results.ValidationProblem(result.ToDictionary());
        }

        return await next(ctx);
    }
}

// Apply per endpoint or per group
app.MapPost("/orders", CreateOrder)
   .AddEndpointFilter<ValidationFilter<CreateOrderRequest>>();

// Apply to entire group
app.MapGroup("/api/v1")
   .AddEndpointFilter<ValidationFilter<object>>()
   .RequireAuthorization();
```

---

## 23. Native AOT

Native AOT compiles your app to a standalone native binary — no JIT, no .NET runtime required on the host.

### Benefits & Trade-offs

| | Native AOT | JIT (.NET runtime) |
|---|---|---|
| **Startup time** | ✅ Milliseconds | Seconds |
| **Memory** | ✅ Lower RSS | Higher |
| **Cold start (serverless)** | ✅ Ideal | Slow |
| **Reflection** | ❌ Restricted | ✅ Full |
| **Dynamic code** | ❌ Not supported | ✅ |
| **Publish size** | ❌ Larger binary | Smaller |
| **Trimming** | Required | Optional |
| **Best for** | Lambdas, CLIs, containers | Long-running APIs |

### Enable Native AOT (.NET 8+)

```xml
<!-- MyApp.API.csproj -->
<PropertyGroup>
  <PublishAot>true</PublishAot>
  <InvariantGlobalization>true</InvariantGlobalization>   <!-- reduces size -->
  <StripSymbols>true</StripSymbols>
</PropertyGroup>
```

```bash
# Publish for Linux x64
dotnet publish -r linux-x64 -c Release

# Output: single native binary ~15-30 MB
```

### AOT-Compatible Patterns

```csharp
// ✅ Use source-generated JSON (no reflection)
builder.Services.ConfigureHttpJsonOptions(opt =>
    opt.SerializerOptions.TypeInfoResolverChain.Insert(0, AppJsonContext.Default));

// ✅ Avoid IServiceProvider.GetService<T>() at runtime — use constructor injection
// ✅ Avoid Type.GetType(string) — use typeof(T)
// ✅ No dynamic proxies — use primary constructors, not Castle.DynamicProxy
// ✅ Avoid MediatR in AOT — use direct handler injection or source-generated alternatives

// Minimal API — fully AOT compatible
app.MapGet("/orders/{id:guid}", async (
    Guid id,
    IOrderRepository repo,
    CancellationToken ct) =>
{
    var order = await repo.GetByIdAsync(new OrderId(id), ct);
    return order is null ? Results.NotFound() : Results.Ok(order);
})
.WithName("GetOrder");
```

### AOT Incompatible Libraries (as of .NET 9)

| Library | AOT Status |
|---|---|
| **Minimal APIs** | ✅ Fully supported |
| **EF Core** | ⚠️ Partial (queries compiled, migrations not) |
| **Dapper** | ⚠️ Partial (use with source-generated handlers) |
| **MediatR** | ❌ Reflection-based |
| **AutoMapper** | ❌ Reflection-based — use Mapperly instead |
| **FluentValidation** | ⚠️ Works with limitations |
| **Serilog** | ✅ Mostly supported |
| **OpenTelemetry** | ✅ Supported |
| **gRPC** | ✅ Supported |
| **SignalR** | ❌ Not AOT compatible |

---

## 24. SignalR — Real-Time Communication

```bash
dotnet add package Microsoft.AspNetCore.SignalR.Client   # client SDK
# Server is built into ASP.NET Core — no extra package
```

### Server Setup

```csharp
builder.Services.AddSignalR(opt =>
{
    opt.EnableDetailedErrors      = builder.Environment.IsDevelopment();
    opt.MaximumReceiveMessageSize = 32 * 1024;    // 32 KB
    opt.ClientTimeoutInterval     = TimeSpan.FromSeconds(60);
    opt.KeepAliveInterval         = TimeSpan.FromSeconds(15);
});

// Scale-out with Redis backplane (multiple server instances)
builder.Services.AddSignalR().AddStackExchangeRedis(
    builder.Configuration.GetConnectionString("Redis")!,
    opt => opt.Configuration.ChannelPrefix = RedisChannel.Literal("myapp"));

app.MapHub<OrderHub>("/hubs/orders");
```

### Hub Implementation

```csharp
[Authorize]
public class OrderHub(IOrderRepository repo) : Hub
{
    // Called by client
    public async Task JoinOrderGroup(string orderId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"order-{orderId}");
        await Clients.Caller.SendAsync("Joined", orderId);
    }

    public async Task LeaveOrderGroup(string orderId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"order-{orderId}");
    }

    // Called when client disconnects
    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        // cleanup ...
        await base.OnDisconnectedAsync(exception);
    }
}

// Push from server (background service or event handler)
public class OrderStatusNotifier(IHubContext<OrderHub> hub)
{
    public async Task NotifyStatusChangedAsync(Guid orderId, string newStatus, CancellationToken ct)
    {
        // Push to all clients watching this order
        await hub.Clients
            .Group($"order-{orderId}")
            .SendAsync("OrderStatusChanged", new { OrderId = orderId, Status = newStatus }, ct);
    }
}
```

### TypeScript Client

```typescript
import * as signalR from "@microsoft/signalr";

const connection = new signalR.HubConnectionBuilder()
    .withUrl("/hubs/orders", {
        accessTokenFactory: () => getJwtToken()     // attach JWT
    })
    .withAutomaticReconnect([0, 2000, 5000, 10000]) // retry intervals ms
    .configureLogging(signalR.LogLevel.Information)
    .build();

connection.on("OrderStatusChanged", (data) => {
    console.log(`Order ${data.orderId} → ${data.status}`);
});

await connection.start();
await connection.invoke("JoinOrderGroup", orderId);
```

### SignalR vs Other Real-Time Options

| | SignalR | SSE | WebSockets (raw) | Polling |
|---|---|---|---|---|
| **Direction** | Bi-directional | Server → Client only | Bi-directional | Client pull |
| **Complexity** | Medium | ✅ Low | High | ✅ Low |
| **Browser support** | ✅ All | ✅ All | ✅ All | ✅ All |
| **AOT** | ❌ | ✅ | ✅ | ✅ |
| **Best for** | Chat, live dashboards | Notifications, feeds | Custom protocol | Simple polling |

---

## 25. gRPC

Best for high-performance, contract-first, service-to-service communication.

```bash
dotnet add package Grpc.AspNetCore
dotnet add package Google.Protobuf
dotnet add package Grpc.Tools
```

### Proto Definition

```protobuf
// Protos/orders.proto
syntax = "proto3";
option csharp_namespace = "MyApp.Grpc";

package orders;

service OrderService {
  rpc GetOrder      (GetOrderRequest)    returns (OrderResponse);
  rpc CreateOrder   (CreateOrderRequest) returns (OrderResponse);
  rpc StreamOrders  (StreamRequest)      returns (stream OrderResponse);  // server streaming
}

message GetOrderRequest    { string order_id = 1; }
message CreateOrderRequest {
  string customer_id = 1;
  repeated OrderLine lines = 2;
}
message OrderLine {
  string product_id = 1;
  int32  quantity   = 2;
}
message OrderResponse {
  string order_id   = 1;
  string status     = 2;
  string created_at = 3;
}
message StreamRequest { string customer_id = 1; }
```

```xml
<!-- .csproj — auto-generates C# from proto -->
<ItemGroup>
  <Protobuf Include="Protos\orders.proto" GrpcServices="Server" />
</ItemGroup>
```

### Server Implementation

```csharp
builder.Services.AddGrpc(opt =>
{
    opt.EnableDetailedErrors = builder.Environment.IsDevelopment();
    opt.MaxReceiveMessageSize = 4 * 1024 * 1024;   // 4 MB
})
.AddServiceOptions<OrderGrpcService>(opt =>
{
    opt.Interceptors.Add<LoggingInterceptor>();
    opt.Interceptors.Add<ExceptionInterceptor>();
});

builder.Services.AddGrpcReflection();    // enables tools like grpcurl / Postman

app.MapGrpcService<OrderGrpcService>();
app.MapGrpcReflectionService();

// Service implementation
public class OrderGrpcService(IMediator mediator) : OrderService.OrderServiceBase
{
    public override async Task<OrderResponse> GetOrder(
        GetOrderRequest request, ServerCallContext ctx)
    {
        var query  = new GetOrderByIdQuery(Guid.Parse(request.OrderId));
        var result = await mediator.Send(query, ctx.CancellationToken);

        if (result is null)
            throw new RpcException(new Status(StatusCode.NotFound,
                $"Order {request.OrderId} not found"));

        return new OrderResponse
        {
            OrderId   = result.Id.ToString(),
            Status    = result.Status.ToString(),
            CreatedAt = result.CreatedAt.ToString("O")
        };
    }

    // Server-side streaming
    public override async Task StreamOrders(
        StreamRequest request,
        IServerStreamWriter<OrderResponse> stream,
        ServerCallContext ctx)
    {
        await foreach (var order in GetLiveOrdersAsync(request.CustomerId, ctx.CancellationToken))
        {
            await stream.WriteAsync(new OrderResponse
            {
                OrderId = order.Id.ToString(),
                Status  = order.Status.ToString()
            });
        }
    }
}
```

### Client (typed HttpClient style)

```csharp
// Register typed gRPC client
builder.Services.AddGrpcClient<OrderService.OrderServiceClient>(opt =>
{
    opt.Address = new Uri("https://order-service");
})
.AddStandardResilienceHandler()
.ConfigureChannel(opt => opt.Credentials = ChannelCredentials.SecureSsl);

// Use in a service
public class OrderGateway(OrderService.OrderServiceClient client)
{
    public async Task<OrderDto?> GetAsync(Guid id, CancellationToken ct)
    {
        try
        {
            var response = await client.GetOrderAsync(
                new GetOrderRequest { OrderId = id.ToString() },
                cancellationToken: ct);

            return new OrderDto(Guid.Parse(response.OrderId), response.Status);
        }
        catch (RpcException ex) when (ex.StatusCode == StatusCode.NotFound)
        {
            return null;
        }
    }
}
```

### gRPC-JSON Transcoding (.NET 8)

Expose a gRPC service as REST automatically — one implementation, two protocols.

```csharp
builder.Services.AddGrpc().AddJsonTranscoding();
builder.Services.AddGrpcSwagger();    // Swagger for transcoded endpoints
builder.Services.AddSwaggerGen();

// Proto annotation
// rpc GetOrder (GetOrderRequest) returns (OrderResponse) {
//   option (google.api.http) = { get: "/api/orders/{order_id}" };
// }
```

---

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

## Comparison Table
| Structure | Best For | Pros | Cons |
|---|---|---|---|
| Layered (MVC) | Small apps/POCs | Fast to build; minimal boilerplate. | Logic often leaks into controllers. |
| Clean Architecture | Enterprise/Microservices | Highly testable; framework independent. | High learning curve; more boilerplate. |
| Feature-Based | Large, evolving teams | Isolation; easier to work on specific features. | Can lead to code duplication across slices. |

Are you building a Web API?
For a .NET Core Web API, your folder structure should reflect the complexity of your business logic and how you intend to scale.
1. Minimal/Basic API (Single Project) [1, 2] 
Best for small services or internal tools where adding multiple projects adds unnecessary overhead. [3, 4] 

* Controllers/: Endpoints for handling HTTP requests.
* Models/: [DTOs (Data Transfer Objects)](https://code-maze.com/aspnetcore-webapi-best-practices/) for request and response payloads.
* Services/: Business logic and application services.
* Data/: Entity Framework DbContext, migrations, and entity models.
* Middleware/: Custom request/response handling logic.
* Extensions/: Static classes for cleaner dependency injection (e.g., ServiceExtensions.cs). [5, 6, 7, 8] 

2. Clean Architecture (Multi-Project)
The industry standard for enterprise APIs. It uses separate Class Library projects to enforce strict dependency rules. [7, 9, 10, 11, 12] 

* src/Presentation (API): Only handles the Web API entry point, controllers, and configuration.
* src/Application: Contains "Use Cases," Interfaces, [MediatR commands/queries](https://www.milanjovanovic.tech/blog/vertical-slice-architecture), and mapping logic.
* src/Domain: The "heart" of the app. Includes core entities, enums, and domain-specific exceptions.
* src/Infrastructure: External implementations like database repositories, file systems, or 3rd-party API clients.
* tests/: Mirroring the src/ folder for unit and integration testing. [7, 13, 14] 

3. Vertical Slice Architecture
Instead of horizontal layers, you organize code by "features." Each feature is self-contained. [3, 15] 

* Features/
* Orders/: Contains CreateOrder.cs (handling the request, logic, and database work for that one feature), OrderController.cs, and OrderDto.cs.
   * Products/: All logic related specifically to products.
* Common/: Shared utilities like logging or error handling. [7, 15, 16, 17] 

Key Implementation Best Practices

* Environment Settings: Keep appsettings.json, appsettings.Development.json, and appsettings.Production.json in the API project root for environment-based configurations.
* Abstraction: Use a Repositories/ folder inside Infrastructure to [abstract data access logic](https://medium.com/write-a-catalyst/folder-structures-in-net-projects-a-comprehensive-guide-16012a5b55a9) from your business services.
* Project Separation: For larger teams, use separate assemblies (projects) to ensure the Domain layer remains [independent of any framework](https://medium.com/@jeslurrahman/clean-architecture-fundamentals-net-core-web-api-microservices-architecture-59ab4130419a). [3, 6, 7, 18] 

Are you planning to use MediatR for your request handling, or would you prefer a more direct service-injection approach?

[1] [https://roshancloudarchitect.me](https://roshancloudarchitect.me/mastering-minimal-apis-in-net-8-building-lightweight-high-performance-microservices-with-ease-378899be490d#:~:text=Step%201:%20Set%20up%20a%20Minimal%20API,%2C%20where%20your%20Minimal%20API%20logic%20resides.)
[2] [https://pasinduprabhashitha.medium.com](https://pasinduprabhashitha.medium.com/structuring-net-minimal-apis-in-a-cleaned-and-well-maintainable-way-f6aac5dbe9b2)
[3] [https://medium.com](https://medium.com/write-a-catalyst/folder-structures-in-net-projects-a-comprehensive-guide-16012a5b55a9)
[4] [https://medium.com](https://medium.com/net-newsletter-by-waseem/ep-52-best-practice-for-net-projects-efa5282b265f)
[5] [https://medium.com](https://medium.com/@speedcodelabs/structuring-your-net-core-api-best-practices-and-common-folder-structure-3c05ee298e5a)
[6] [https://code-maze.com](https://code-maze.com/aspnetcore-webapi-best-practices/)
[7] [https://www.c-sharpcorner.com](https://www.c-sharpcorner.com/article/best-practices-for-structuring-large-asp-net-projects-a-simple-guide/)
[8] [https://jasonwatmore.com](https://jasonwatmore.com/post/2018/06/26/aspnet-core-21-simple-api-for-authentication-registration-and-user-management#:~:text=Services%20%2D%20contain%20business%20logic%2C%20validation%20and,from%20HTTP%20requests%20to%20controller%20action%20methods.)
[9] [https://www.youtube.com](https://www.youtube.com/watch?v=0J_T5qRynSI&t=7)
[10] [https://medium.com](https://medium.com/lets-code-future/best-net-api-project-structure-that-worked-for-me-as-a-senior-developer-6d2da0438f73)
[11] [https://vinova.sg](https://vinova.sg/architecting-resilient-apis-a-definitive-guide-to-error-and-exception-handling-in-laravel/)
[12] [https://blog.axway.com](https://blog.axway.com/learning-center/apis/api-management/api-standards-enterprise-strategy#:~:text=Defining%20API%20standards%20%0A%20%20%20%0A,FDX%20for%20financial%20data%20and%20open%20banking%E2%80%A6%29.&text=%2D%20Technical%20API%20standards%20for%20consistency%20and,AsyncAPI%2C%20Arazzo%20%E2%80%93%20more%20on%20this%20below%29)
[13] [https://medium.com](https://medium.com/@mohanedzekry/clean-architecture-in-asp-net-core-web-api-d44e33893e1d)
[14] [https://medium.com](https://medium.com/@developerstory/how-should-the-folder-structure-look-when-implementing-clean-architecture-for-a-project-d2dc88de6c47)
[15] [https://www.milanjovanovic.tech](https://www.milanjovanovic.tech/blog/vertical-slice-architecture)
[16] [https://medium.com](https://medium.com/charot/azure-api-management-introduction-english-version-c73cfbe5090#:~:text=API%20Management%20has%20a%20functionnality%20called%20Products.,the%20APIs%20that%20are%20inside%20the%20product.)
[17] [https://techtetrad.medium.com](https://techtetrad.medium.com/rest-api-development-best-practices-0c8e3b4c3bf0#:~:text=Instead%20of%20using%20ambiguous%20terms%20like%20/items%2C,retrieves%20a%20list%20of%20all%20available%20products.)
[18] [https://medium.com](https://medium.com/@jeslurrahman/clean-architecture-fundamentals-net-core-web-api-microservices-architecture-59ab4130419a#:~:text=Clean%20Architecture%20provides%20a%20robust%20foundation%20for,can%20create%20scalable%2C%20maintainable%2C%20and%20testable%20applications.)




*Stack: .NET 8 / 9 / 10 — ASP.NET Core — C# 12 / 13 — EF Core 8 / 9*
*Last reviewed: March 2026*