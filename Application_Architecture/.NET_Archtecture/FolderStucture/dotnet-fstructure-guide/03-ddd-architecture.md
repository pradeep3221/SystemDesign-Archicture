> [← API n-Layered Architecture](02-n-layered-architecture.md)  |  [Clean Architecture →](04-clean-architecture.md)  |  [🏠 Index](README.md)

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
