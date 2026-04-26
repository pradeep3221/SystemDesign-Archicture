> [← Middleware Pipeline & Ordering](21-middleware-pipeline.md)  |  [SignalR — Real-Time Communication →](23-signalr.md)  |  [🏠 Index](README.md)

## 23. Native AOT

Native AOT compiles your app to a standalone native binary — no JIT, no .NET runtime required on the host.

### Benefits & Trade-offs

| | Native AOT | JIT (.NET runtime) |
|---|---|---|
| **Startup time** | ✅ Milliseconds | Seconds |
| **Memory** | ✅ Lower RSS | Higher |
| **Cold start (serverless)** | ✅ Ideal | Slow |
| **Reflection** | ❌ Restricted | ✅ Full |
| **Dynamic code** | ❌ Not supported | ✅ |
| **Publish size** | ❌ Larger binary | Smaller |
| **Trimming** | Required | Optional |
| **Best for** | Lambdas, CLIs, containers | Long-running APIs |

### Enable Native AOT (.NET 8+)

```xml
<!-- MyApp.API.csproj -->
<PropertyGroup>
  <PublishAot>true</PublishAot>
  <InvariantGlobalization>true</InvariantGlobalization>   <!-- reduces size -->
  <StripSymbols>true</StripSymbols>
</PropertyGroup>
```

```bash
# Publish for Linux x64
dotnet publish -r linux-x64 -c Release

# Output: single native binary ~15-30 MB
```

### AOT-Compatible Patterns

```csharp
// ✅ Use source-generated JSON (no reflection)
builder.Services.ConfigureHttpJsonOptions(opt =>
    opt.SerializerOptions.TypeInfoResolverChain.Insert(0, AppJsonContext.Default));

// ✅ Avoid IServiceProvider.GetService<T>() at runtime — use constructor injection
// ✅ Avoid Type.GetType(string) — use typeof(T)
// ✅ No dynamic proxies — use primary constructors, not Castle.DynamicProxy
// ✅ Avoid MediatR in AOT — use direct handler injection or source-generated alternatives

// Minimal API — fully AOT compatible
app.MapGet("/orders/{id:guid}", async (
    Guid id,
    IOrderRepository repo,
    CancellationToken ct) =>
{
    var order = await repo.GetByIdAsync(new OrderId(id), ct);
    return order is null ? Results.NotFound() : Results.Ok(order);
})
.WithName("GetOrder");
```

### AOT Incompatible Libraries (as of .NET 9)

| Library | AOT Status |
|---|---|
| **Minimal APIs** | ✅ Fully supported |
| **EF Core** | ⚠️ Partial (queries compiled, migrations not) |
| **Dapper** | ⚠️ Partial (use with source-generated handlers) |
| **MediatR** | ❌ Reflection-based |
| **AutoMapper** | ❌ Reflection-based — use Mapperly instead |
| **FluentValidation** | ⚠️ Works with limitations |
| **Serilog** | ✅ Mostly supported |
| **OpenTelemetry** | ✅ Supported |
| **gRPC** | ✅ Supported |
| **SignalR** | ❌ Not AOT compatible |

---
