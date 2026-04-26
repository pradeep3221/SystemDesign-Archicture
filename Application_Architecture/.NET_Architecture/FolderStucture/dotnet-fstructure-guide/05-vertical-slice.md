> [← Clean Architecture](04-clean-architecture.md)  |  [.NET Aspire — Cloud-Native Apps →](06-aspire.md)  |  [🏠 Index](README.md)

## 6. Feature-Based (Vertical Slice) Structure -- Vertical Slice Architecture (VSA)

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
