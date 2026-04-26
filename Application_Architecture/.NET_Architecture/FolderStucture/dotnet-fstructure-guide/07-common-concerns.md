> [← .NET Aspire — Cloud-Native Apps](06-aspire.md)  |  [Security & Authentication →](08-security-auth.md)  |  [🏠 Index](README.md)

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


---
