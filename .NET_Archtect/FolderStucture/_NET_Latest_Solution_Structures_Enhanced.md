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

## 2. Traditional Layered (N-Tier) Structure

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

## 3. API n-Layered Architecture

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
| `<ProjectName>.Mapper` | [Mapperly](https://github.com/riok/mapperly) (source-gen) or AutoMapper Or [Mapster](https://github.com/MapsterMapper/Mapster) | Mapperly preferred — zero reflection |
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

## 6.  Feature-Based (Vertical Slice) Structure -- VSA

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

*Stack: .NET 8 / 9 / 10 — ASP.NET Core — C# 12 / 13 — EF Core 8 / 9*
*Last reviewed: March 2026*