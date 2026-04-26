> [← OData](25-odata.md)  |  [NuGet Package Reference →](27-nuget-reference.md)  |  [🏠 Index](README.md)

## 27. GraphQL

GraphQL is a query language for your API. Clients request exactly the data they need — nothing more, nothing less — in a single request. In .NET, **Hot Chocolate** is the leading GraphQL server library.

```bash
dotnet add package HotChocolate.AspNetCore
dotnet add package HotChocolate.Data.EntityFramework   # EF Core integration
dotnet add package HotChocolate.AspNetCore.Voyager      # schema explorer UI
dotnet add package StrawberryShake.Transport.Http       # typed .NET client
```

---

### Setup (.NET 8+)

```csharp
builder.Services
    .AddGraphQLServer()
    .AddQueryType<QueryType>()
    .AddMutationType<MutationType>()
    .AddSubscriptionType<SubscriptionType>()
    .AddType<OrderType>()
    .AddType<CustomerType>()
    .AddFiltering()          // enable @where filtering
    .AddSorting()            // enable @orderBy sorting
    .AddProjections()        // enable field-level projection to SQL
    .AddInMemorySubscriptions()   // or .AddRedisSubscriptions(...)
    .ModifyRequestOptions(opt => opt.IncludeExceptionDetails =
        builder.Environment.IsDevelopment());

app.MapGraphQL("/graphql");        // GraphQL endpoint
app.MapBananaCakePop("/graphql/ui"); // in-browser IDE (Hot Chocolate's Banana Cake Pop)
```

---

### Schema Definition — Code First

```csharp
// Object Types
public class OrderType : ObjectType<OrderDto>
{
    protected override void Configure(IObjectTypeDescriptor<OrderDto> descriptor)
    {
        descriptor.Description("Represents a customer order.");

        descriptor.Field(o => o.Id)
                  .Description("The unique order identifier.");

        descriptor.Field(o => o.Status)
                  .Description("Current order status.");

        // Resolve navigation — loaded via DataLoader (N+1 safe)
        descriptor.Field("customer")
                  .Description("The customer who placed the order.")
                  .ResolveWith<OrderResolvers>(r => r.GetCustomerAsync(default!, default!, default!))
                  .UseDataLoader<CustomerDataLoader>();
    }
}

// Resolver class
public class OrderResolvers
{
    public async Task<CustomerDto> GetCustomerAsync(
        [Parent] OrderDto order,
        CustomerDataLoader loader,
        CancellationToken ct)
        => await loader.LoadAsync(order.CustomerId, ct);
}
```

---

### Query Type

```csharp
public class QueryType : ObjectType
{
    protected override void Configure(IObjectTypeDescriptor descriptor)
    {
        descriptor.Name(OperationTypeNames.Query);

        descriptor
            .Field("orders")
            .Description("Get a paginated, filterable list of orders.")
            .UsePaging<OrderType>(options: new PagingOptions { MaxPageSize = 100 })
            .UseProjection()
            .UseFiltering()
            .UseSorting()
            .ResolveWith<QueryResolvers>(r => r.GetOrdersAsync(default!));

        descriptor
            .Field("order")
            .Description("Get a single order by ID.")
            .Argument("id", a => a.Type<NonNullType<UuidType>>())
            .ResolveWith<QueryResolvers>(r => r.GetOrderAsync(default!, default!, default!));
    }
}

public class QueryResolvers
{
    // IQueryable — Hot Chocolate translates filters/sorts/projections to SQL
    public IQueryable<OrderDto> GetOrdersAsync([Service] AppDbContext db)
        => db.Orders.AsNoTracking()
                    .Select(o => new OrderDto
                    {
                        Id         = o.Id.Value,
                        Status     = o.Status.ToString(),
                        CreatedAt  = o.CreatedAt,
                        CustomerId = o.CustomerId.Value
                    });

    public async Task<OrderDto?> GetOrderAsync(
        Guid id,
        [Service] AppDbContext db,
        CancellationToken ct)
        => await db.Orders
                   .AsNoTracking()
                   .Where(o => o.Id == new OrderId(id))
                   .Select(o => new OrderDto { Id = o.Id.Value, Status = o.Status.ToString() })
                   .FirstOrDefaultAsync(ct);
}
```

---

### Mutation Type

```csharp
public class MutationType : ObjectType
{
    protected override void Configure(IObjectTypeDescriptor descriptor)
    {
        descriptor.Name(OperationTypeNames.Mutation);

        descriptor
            .Field("createOrder")
            .Argument("input", a => a.Type<NonNullType<InputObjectType<CreateOrderInput>>>())
            .ResolveWith<MutationResolvers>(r =>
                r.CreateOrderAsync(default!, default!, default!));

        descriptor
            .Field("cancelOrder")
            .Argument("id", a => a.Type<NonNullType<UuidType>>())
            .ResolveWith<MutationResolvers>(r =>
                r.CancelOrderAsync(default!, default!, default!));
    }
}

public record CreateOrderInput(Guid CustomerId, List<OrderLineInput> Lines);
public record OrderLineInput(Guid ProductId, int Quantity, decimal UnitPrice);

public class MutationResolvers
{
    public async Task<MutationResult<OrderDto>> CreateOrderAsync(
        CreateOrderInput input,
        [Service] IMediator mediator,
        CancellationToken ct)
    {
        var result = await mediator.Send(
            new CreateOrderCommand(input.CustomerId, input.Lines
                .Select(l => new OrderLineDto(l.ProductId, l.Quantity, l.UnitPrice))
                .ToList()), ct);

        return result.IsSuccess
            ? new MutationResult<OrderDto>(result.Value)
            : new MutationResult<OrderDto>(
                ErrorBuilder.New()
                    .SetMessage(result.Error)
                    .SetCode("ORDER_CREATE_FAILED")
                    .Build());
    }

    public async Task<MutationResult<bool>> CancelOrderAsync(
        Guid id,
        [Service] IMediator mediator,
        CancellationToken ct)
    {
        await mediator.Send(new CancelOrderCommand(id), ct);
        return new MutationResult<bool>(true);
    }
}
```

---

### Subscription Type (Real-time)

```csharp
public class SubscriptionType : ObjectType
{
    protected override void Configure(IObjectTypeDescriptor descriptor)
    {
        descriptor.Name(OperationTypeNames.Subscription);

        descriptor
            .Field("orderStatusChanged")
            .Description("Fires when an order's status changes.")
            .Argument("orderId", a => a.Type<UuidType>())
            .Type<OrderStatusEventType>()
            .ResolveWith<SubscriptionResolvers>(r => r.OnOrderStatusChangedAsync(default!, default!))
            .Subscribe<SubscriptionResolvers>(r => r.SubscribeToOrderStatusAsync(default!, default!));
    }
}

public class SubscriptionResolvers
{
    public async IAsyncEnumerable<OrderStatusEvent> SubscribeToOrderStatusAsync(
        Guid? orderId,
        [Service] ITopicEventReceiver receiver)
    {
        var topic  = orderId.HasValue ? $"order-status:{orderId}" : "order-status:*";
        var stream = await receiver.SubscribeAsync<OrderStatusEvent>(topic);

        await foreach (var evt in stream.ReadEventsAsync())
            yield return evt;
    }

    public OrderStatusEvent OnOrderStatusChangedAsync(
        [EventMessage] OrderStatusEvent evt,
        [Service] ILogger<SubscriptionResolvers> logger)
    {
        logger.LogDebug("Status change: {OrderId} → {Status}", evt.OrderId, evt.Status);
        return evt;
    }
}

// Publish from a domain event handler
public class OrderStatusChangedEventHandler(ITopicEventSender sender)
    : INotificationHandler<OrderStatusChangedEvent>
{
    public async Task Handle(OrderStatusChangedEvent notification, CancellationToken ct)
    {
        await sender.SendAsync(
            topic: $"order-status:{notification.OrderId}",
            message: new OrderStatusEvent(notification.OrderId, notification.NewStatus),
            cancellationToken: ct);
    }
}
```

---

### DataLoader — Solving the N+1 Problem

Without DataLoader, fetching 50 orders + their customers = 51 queries. DataLoader batches them into 2.

```csharp
public class CustomerDataLoader(IBatchScheduler scheduler, IServiceProvider sp)
    : BatchDataLoader<Guid, CustomerDto>(scheduler)
{
    protected override async Task<IReadOnlyDictionary<Guid, CustomerDto>> LoadBatchAsync(
        IReadOnlyList<Guid> keys,
        CancellationToken ct)
    {
        // One query for ALL requested customer IDs
        await using var scope = sp.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        return await db.Customers
            .Where(c => keys.Contains(c.Id.Value))
            .Select(c => new CustomerDto { Id = c.Id.Value, Name = c.Name })
            .ToDictionaryAsync(c => c.Id, ct);
    }
}
```

---

### Authentication & Authorisation

```csharp
// Setup
builder.Services
    .AddGraphQLServer()
    .AddAuthorization()         // integrates with ASP.NET Core policies
    .AddQueryType<QueryType>();

// On types/fields
[Authorize]                             // requires authentication
public class MutationType : ObjectType { }

[Authorize(Policy = "AdminOnly")]       // requires specific policy
public class AdminQueryType : ObjectType { }

// Field-level — only authenticated users see this field
descriptor.Field(o => o.InternalNotes)
          .Authorize("AdminOnly");

// In resolvers — access current user
public async Task<OrderDto?> GetOrderAsync(
    Guid id,
    [Service] AppDbContext db,
    ClaimsPrincipal claimsPrincipal,   // injected automatically
    CancellationToken ct)
{
    var userId = claimsPrincipal.FindFirstValue(ClaimTypes.NameIdentifier);
    // apply per-user filter ...
}
```

---

### Query Examples

```graphql
# Simple query — request exactly what you need
query GetOrders {
  orders(first: 20, order: { createdAt: DESC }) {
    nodes {
      id
      status
      createdAt
    }
    pageInfo {
      hasNextPage
      endCursor
    }
    totalCount
  }
}

# Nested expansion — single request, no N+1
query GetOrdersWithCustomer {
  orders(first: 10, where: { status: { eq: SUBMITTED } }) {
    nodes {
      id
      status
      customer {
        name
        email
      }
      lines {
        quantity
        unitPrice
        product {
          name
          sku
        }
      }
    }
  }
}

# Mutation
mutation CreateOrder($input: CreateOrderInput!) {
  createOrder(input: $input) {
    id
    status
    createdAt
  }
}

# Subscription — real-time updates
subscription WatchOrder($orderId: UUID!) {
  orderStatusChanged(orderId: $orderId) {
    orderId
    status
    updatedAt
  }
}
```

---

### Persisted Queries

Prevents arbitrary query execution in production — clients can only run pre-registered queries.

```csharp
builder.Services
    .AddGraphQLServer()
    .UsePersistedQueryPipeline()
    .AddReadOnlyFileSystemQueryStorage("./PersistedQueries")  // load from files
    // or: .AddInMemoryQueryStorage()                         // register at startup
    .ModifyRequestOptions(opt =>
        opt.OnlyAllowPersistedQueries = !builder.Environment.IsDevelopment());
```

---

### Security — Query Depth & Complexity Limits

```csharp
builder.Services
    .AddGraphQLServer()
    .AddMaxExecutionDepthRule(maxAllowedExecutionDepth: 6)
    .AddCostAnalyzer()                  // reject expensive queries
    .ModifyCostOptions(opt =>
    {
        opt.MaxFieldCost        = 1_000;
        opt.MaxTypeCost         = 1_000;
        opt.EnforceCostLimits   = true;
    });
```

---

### Strawberry Shake — Typed .NET Client

```bash
dotnet add package StrawberryShake.Transport.Http
dotnet tool install StrawberryShake.Tools --global
# Run codegen: dotnet graphql generate --url https://api/graphql
```

```graphql
# GetOrders.graphql — define operation
query GetOrders($first: Int!) {
  orders(first: $first) {
    nodes { id status createdAt }
    pageInfo { hasNextPage endCursor }
  }
}
```

```csharp
// Generated client (zero reflection, fully typed)
builder.Services
    .AddMyAppClient()   // generated extension method
    .ConfigureHttpClient(c => c.BaseAddress = new Uri("https://api/graphql"));

// Usage
public class OrderSyncService(IMyAppClient client)
{
    public async Task SyncAsync(CancellationToken ct)
    {
        var result = await client.GetOrders.ExecuteAsync(first: 50, ct);

        result.EnsureNoErrors();

        foreach (var order in result.Data!.Orders.Nodes)
            Console.WriteLine($"{order.Id}: {order.Status}");
    }
}
```

---

### GraphQL vs REST vs OData

| Feature | REST | OData | GraphQL |
|---|---|---|---|
| **Query flexibility** | ❌ Fixed per endpoint | ✅ Standard params | ✅ Fully client-driven |
| **Type system / schema** | OpenAPI (optional) | ✅ `$metadata` | ✅ Strong SDL schema |
| **Real-time** | ❌ (SSE/WS manual) | ❌ | ✅ Subscriptions built-in |
| **Mutations** | HTTP verbs | HTTP verbs | ✅ Named mutations |
| **Batching** | ❌ | ❌ | ✅ Multiple ops per request |
| **N+1 protection** | Manual | ❌ | ✅ DataLoader built-in |
| **Client tooling** | Mature | Good | ✅ Excellent (codegen) |
| **Caching** | ✅ HTTP cache | ✅ HTTP cache | ⚠️ POST-based, needs APQ |
| **Learning curve** | Low | Medium | Medium–High |
| **Best for** | Public APIs, mobile | Internal/admin, BI | Complex frontends, BFF |

---

### Hot Chocolate Packages

| Package | Purpose |
|---|---|
| `HotChocolate.AspNetCore` | Core GraphQL server |
| `HotChocolate.Data.EntityFramework` | EF Core `IQueryable` integration |
| `HotChocolate.AspNetCore.Authorization` | Policy-based auth integration |
| `HotChocolate.Subscriptions.InMemory` | In-memory pub/sub |
| `HotChocolate.Subscriptions.Redis` | Redis pub/sub for multi-instance |
| `HotChocolate.AspNetCore.Voyager` | Schema visualiser UI |
| `HotChocolate.Diagnostics` | OpenTelemetry integration |
| `StrawberryShake.Transport.Http` | Typed .NET client |

---
