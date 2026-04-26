> [← DDD Architecture](03-ddd-architecture.md)  |  [Vertical Slice Architecture →](05-vertical-slice.md)  |  [🏠 Index](README.md)

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
