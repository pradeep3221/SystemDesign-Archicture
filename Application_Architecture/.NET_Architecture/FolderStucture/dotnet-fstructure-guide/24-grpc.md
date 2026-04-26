> [← SignalR — Real-Time Communication](23-signalr.md)  |  [OData →](25-odata.md)  |  [🏠 Index](README.md)

## 25. gRPC

Best for high-performance, contract-first, service-to-service communication.

```bash
dotnet add package Grpc.AspNetCore
dotnet add package Google.Protobuf
dotnet add package Grpc.Tools
```

### Proto Definition

```protobuf
// Protos/orders.proto
syntax = "proto3";
option csharp_namespace = "MyApp.Grpc";

package orders;

service OrderService {
  rpc GetOrder      (GetOrderRequest)    returns (OrderResponse);
  rpc CreateOrder   (CreateOrderRequest) returns (OrderResponse);
  rpc StreamOrders  (StreamRequest)      returns (stream OrderResponse);  // server streaming
}

message GetOrderRequest    { string order_id = 1; }
message CreateOrderRequest {
  string customer_id = 1;
  repeated OrderLine lines = 2;
}
message OrderLine {
  string product_id = 1;
  int32  quantity   = 2;
}
message OrderResponse {
  string order_id   = 1;
  string status     = 2;
  string created_at = 3;
}
message StreamRequest { string customer_id = 1; }
```

```xml
<!-- .csproj — auto-generates C# from proto -->
<ItemGroup>
  <Protobuf Include="Protos\orders.proto" GrpcServices="Server" />
</ItemGroup>
```

### Server Implementation

```csharp
builder.Services.AddGrpc(opt =>
{
    opt.EnableDetailedErrors = builder.Environment.IsDevelopment();
    opt.MaxReceiveMessageSize = 4 * 1024 * 1024;   // 4 MB
})
.AddServiceOptions<OrderGrpcService>(opt =>
{
    opt.Interceptors.Add<LoggingInterceptor>();
    opt.Interceptors.Add<ExceptionInterceptor>();
});

builder.Services.AddGrpcReflection();    // enables tools like grpcurl / Postman

app.MapGrpcService<OrderGrpcService>();
app.MapGrpcReflectionService();

// Service implementation
public class OrderGrpcService(IMediator mediator) : OrderService.OrderServiceBase
{
    public override async Task<OrderResponse> GetOrder(
        GetOrderRequest request, ServerCallContext ctx)
    {
        var query  = new GetOrderByIdQuery(Guid.Parse(request.OrderId));
        var result = await mediator.Send(query, ctx.CancellationToken);

        if (result is null)
            throw new RpcException(new Status(StatusCode.NotFound,
                $"Order {request.OrderId} not found"));

        return new OrderResponse
        {
            OrderId   = result.Id.ToString(),
            Status    = result.Status.ToString(),
            CreatedAt = result.CreatedAt.ToString("O")
        };
    }

    // Server-side streaming
    public override async Task StreamOrders(
        StreamRequest request,
        IServerStreamWriter<OrderResponse> stream,
        ServerCallContext ctx)
    {
        await foreach (var order in GetLiveOrdersAsync(request.CustomerId, ctx.CancellationToken))
        {
            await stream.WriteAsync(new OrderResponse
            {
                OrderId = order.Id.ToString(),
                Status  = order.Status.ToString()
            });
        }
    }
}
```

### Client (typed HttpClient style)

```csharp
// Register typed gRPC client
builder.Services.AddGrpcClient<OrderService.OrderServiceClient>(opt =>
{
    opt.Address = new Uri("https://order-service");
})
.AddStandardResilienceHandler()
.ConfigureChannel(opt => opt.Credentials = ChannelCredentials.SecureSsl);

// Use in a service
public class OrderGateway(OrderService.OrderServiceClient client)
{
    public async Task<OrderDto?> GetAsync(Guid id, CancellationToken ct)
    {
        try
        {
            var response = await client.GetOrderAsync(
                new GetOrderRequest { OrderId = id.ToString() },
                cancellationToken: ct);

            return new OrderDto(Guid.Parse(response.OrderId), response.Status);
        }
        catch (RpcException ex) when (ex.StatusCode == StatusCode.NotFound)
        {
            return null;
        }
    }
}
```

### gRPC-JSON Transcoding (.NET 8)

Expose a gRPC service as REST automatically — one implementation, two protocols.

```csharp
builder.Services.AddGrpc().AddJsonTranscoding();
builder.Services.AddGrpcSwagger();    // Swagger for transcoded endpoints
builder.Services.AddSwaggerGen();

// Proto annotation
// rpc GetOrder (GetOrderRequest) returns (OrderResponse) {
//   option (google.api.http) = { get: "/api/orders/{order_id}" };
// }
```

---


---
