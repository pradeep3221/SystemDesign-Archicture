> [← Observability — OpenTelemetry, Serilog, Seq & Grafana](11-observability.md)  |  [Configuration & Options Pattern →](13-configuration-options.md)  |  [🏠 Index](README.md)

## 13. API Versioning

### Why Version?
API versioning lets you evolve your API without breaking existing clients. In .NET 8+, `Asp.Versioning.Http` is the standard package (replaces the old `Microsoft.AspNetCore.Mvc.Versioning`).

```bash
dotnet add package Asp.Versioning.Http
dotnet add package Asp.Versioning.Mvc          # for Controller APIs
dotnet add package Asp.Versioning.Http.Client  # for typed HttpClient consumers
```

### Setup

```csharp
builder.Services.AddApiVersioning(opt =>
{
    opt.DefaultApiVersion                = new ApiVersion(1, 0);
    opt.AssumeDefaultVersionWhenUnspecified = true;
    opt.ReportApiVersions               = true;   // adds api-supported-versions header

    // Strategy: URL segment, query string, header, or media type
    opt.ApiVersionReader = ApiVersionReader.Combine(
        new UrlSegmentApiVersionReader(),                           // /api/v1/orders
        new HeaderApiVersionReader("X-Api-Version"),               // X-Api-Version: 1.0
        new QueryStringApiVersionReader("api-version"));           // ?api-version=1.0
})
.AddApiExplorer(opt =>
{
    opt.GroupNameFormat           = "'v'VVV";    // v1, v2
    opt.SubstituteApiVersionInUrl = true;
});
```

### URL Segment Versioning (Minimal APIs)

```csharp
var v1 = app.NewVersionedApi("Orders");

// V1 group
var ordersV1 = v1.MapGroup("/api/v{version:apiVersion}/orders")
                 .HasApiVersion(1, 0);

ordersV1.MapGet("/",    GetOrdersV1);
ordersV1.MapGet("/{id}", GetOrderByIdV1);

// V2 group — adds extra fields, changes shape
var ordersV2 = v1.MapGroup("/api/v{version:apiVersion}/orders")
                 .HasApiVersion(2, 0);

ordersV2.MapGet("/",    GetOrdersV2);
ordersV2.MapGet("/{id}", GetOrderByIdV2);
ordersV2.MapPost("/",   CreateOrderV2);   // new in V2
```

### Controller-Based Versioning

```csharp
[ApiController]
[Route("api/v{version:apiVersion}/orders")]
[ApiVersion("1.0")]
[ApiVersion("1.1")]
public class OrdersV1Controller : ControllerBase
{
    [HttpGet]
    public IActionResult GetAll() => Ok("V1 orders");

    [HttpGet, MapToApiVersion("1.1")]
    public IActionResult GetAllV1_1() => Ok("V1.1 orders — extra fields");
}

[ApiController]
[Route("api/v{version:apiVersion}/orders")]
[ApiVersion("2.0")]
public class OrdersV2Controller : ControllerBase
{
    [HttpGet]
    public IActionResult GetAll() => Ok("V2 orders — new shape");
}
```

### Deprecating a Version

```csharp
[ApiVersion("1.0", Deprecated = true)]
[ApiVersion("2.0")]
public class OrdersController : ControllerBase { }
// Response headers will include:
// api-supported-versions: 2.0
// api-deprecated-versions: 1.0
```

### Versioning Strategy Comparison

| Strategy | URL Example | Pros | Cons |
|---|---|---|---|
| **URL Segment** | `/api/v1/orders` | Visible, cacheable, easy to test | Pollutes URL structure |
| **Query String** | `/orders?api-version=1.0` | Non-breaking, clean URLs | Less visible |
| **Header** | `X-Api-Version: 1.0` | Clean URLs | Hard to test in browser |
| **Media Type** | `Accept: application/json;v=1.0` | REST-pure | Complex clients |

> Recommended: **URL segment** for public APIs, **header** for internal service-to-service.

---
