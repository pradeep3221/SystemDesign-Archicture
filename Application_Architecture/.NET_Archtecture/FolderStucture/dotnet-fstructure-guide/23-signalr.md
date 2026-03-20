> [← Native AOT](22-native-aot.md)  |  [gRPC →](24-grpc.md)  |  [🏠 Index](README.md)

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
