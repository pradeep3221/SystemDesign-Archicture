> [← Tiered Structure](01-tiered-structure.md)  |  [DDD Architecture →](03-ddd-architecture.md)  |  [🏠 Index](README.md)

## 3. Traditional Layered (N-Tier) Structure (API n-Layered Architecture)

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
