> [← Security & Authentication](08-security-auth.md)  |  [Messaging & Event-Driven →](10-messaging.md)  |  [🏠 Index](README.md)

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
