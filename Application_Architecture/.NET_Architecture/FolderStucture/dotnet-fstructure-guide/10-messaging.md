> [← Microservices Patterns](09-microservices.md)  |  [Observability — OpenTelemetry, Serilog, Seq & Grafana →](11-observability.md)  |  [🏠 Index](README.md)

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
