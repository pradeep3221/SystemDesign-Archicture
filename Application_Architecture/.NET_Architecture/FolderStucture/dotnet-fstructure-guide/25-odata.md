> [← gRPC](24-grpc.md)  |  [GraphQL →](26-graphql.md)  |  [🏠 Index](README.md)

## 26. OData

OData (Open Data Protocol) is a REST-based protocol for building and consuming queryable APIs. It lets clients drive filtering, sorting, paging, field selection, and expansion — without custom query parameters or extra endpoints.

```bash
dotnet add package Microsoft.AspNetCore.OData          # .NET 8+
dotnet add package Microsoft.EntityFrameworkCore        # EF Core for IQueryable backing
```

---

### Setup (.NET 8+)

```csharp
using Microsoft.AspNetCore.OData;
using Microsoft.OData.ModelBuilder;

// Build the EDM (Entity Data Model)
static IEdmModel BuildEdmModel()
{
    var builder = new ODataConventionModelBuilder();

    builder.EntitySet<OrderDto>("Orders")
           .EntityType
           .HasKey(o => o.Id)
           .Filter()      // allow $filter
           .OrderBy()     // allow $orderby
           .Select()      // allow $select
           .Expand()      // allow $expand
           .Count()       // allow $count
           .Page(maxTopValue: 100, pageSizeValue: 20); // enforce max page size

    builder.EntitySet<CustomerDto>("Customers")
           .EntityType.HasKey(c => c.Id);

    builder.EntitySet<ProductDto>("Products")
           .EntityType.HasKey(p => p.Id);

    return builder.GetEdmModel();
}

// Register
builder.Services
    .AddControllers()
    .AddOData(opt => opt
        .AddRouteComponents("odata", BuildEdmModel())
        .Select()
        .Filter()
        .OrderBy()
        .Expand()
        .Count()
        .SetMaxTop(100));
```

---

### Controller

```csharp
[ApiController]
[Route("odata/[controller]")]
public class OrdersController(AppDbContext db) : ODataController
{
    // GET /odata/Orders
    // GET /odata/Orders?$filter=status eq 'Submitted'&$orderby=createdAt desc&$top=20&$skip=0
    // GET /odata/Orders?$select=id,status&$expand=Customer&$count=true
    [HttpGet]
    [EnableQuery(MaxExpansionDepth = 3, MaxNodeCount = 20)]
    public IQueryable<OrderDto> Get()
    {
        return db.Orders
                 .AsNoTracking()
                 .Select(o => new OrderDto
                 {
                     Id         = o.Id.Value,
                     Status     = o.Status.ToString(),
                     CreatedAt  = o.CreatedAt,
                     CustomerId = o.CustomerId.Value
                 });
        // EF Core translates OData clauses → SQL automatically
    }

    // GET /odata/Orders({id})
    [HttpGet("{id}")]
    [EnableQuery]
    public SingleResult<OrderDto> Get(Guid id)
    {
        var result = db.Orders
                       .AsNoTracking()
                       .Where(o => o.Id == new OrderId(id))
                       .Select(o => new OrderDto { Id = o.Id.Value, Status = o.Status.ToString() });

        return SingleResult.Create(result);
    }

    // POST /odata/Orders
    [HttpPost]
    public async Task<IActionResult> Post([FromBody] CreateOrderRequest request, CancellationToken ct)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var order = Order.Create(new CustomerId(request.CustomerId));
        db.Orders.Add(order);
        await db.SaveChangesAsync(ct);

        return Created(order);
    }

    // PATCH /odata/Orders({id})
    [HttpPatch("{id}")]
    public async Task<IActionResult> Patch(Guid id, [FromBody] Delta<OrderDto> delta, CancellationToken ct)
    {
        var order = await db.Orders.FindAsync([new OrderId(id)], ct);
        if (order is null) return NotFound();

        // Delta applies only the changed fields
        delta.Patch(order);
        await db.SaveChangesAsync(ct);
        return Updated(order);
    }

    // DELETE /odata/Orders({id})
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var order = await db.Orders.FindAsync([new OrderId(id)], ct);
        if (order is null) return NotFound();

        db.Orders.Remove(order);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
```

---

### OData Query Examples

```http
# Filter
GET /odata/Orders?$filter=status eq 'Submitted'
GET /odata/Orders?$filter=createdAt gt 2024-01-01T00:00:00Z
GET /odata/Orders?$filter=contains(customerName, 'Acme')
GET /odata/Orders?$filter=totalAmount gt 100 and status ne 'Cancelled'

# Sort
GET /odata/Orders?$orderby=createdAt desc,status asc

# Pagination (server-side)
GET /odata/Orders?$top=20&$skip=40

# Select specific fields
GET /odata/Orders?$select=id,status,createdAt

# Expand navigation properties
GET /odata/Orders?$expand=Customer($select=name,email)
GET /odata/Orders?$expand=Lines($expand=Product)

# Count
GET /odata/Orders?$count=true
GET /odata/Orders/$count

# Combine everything
GET /odata/Orders
  ?$filter=status eq 'Active'
  &$orderby=createdAt desc
  &$top=20
  &$skip=0
  &$select=id,status,createdAt
  &$expand=Customer($select=name)
  &$count=true
```

---

### OData Response Shape

```json
{
  "@odata.context": "https://api.example.com/odata/$metadata#Orders",
  "@odata.count": 142,
  "value": [
    {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "status": "Submitted",
      "createdAt": "2024-03-15T10:30:00Z",
      "customer": {
        "name": "Acme Corp",
        "email": "orders@acme.com"
      }
    }
  ],
  "@odata.nextLink": "https://api.example.com/odata/Orders?$skip=20&$top=20"
}
```

---

### Securing OData Queries

Always restrict what clients can query — unbounded OData is a performance and security risk.

```csharp
// Per-action restrictions
[EnableQuery(
    MaxTop              = 100,       // max $top value
    MaxExpansionDepth   = 2,         // max nested $expand
    MaxNodeCount        = 15,        // max nodes in $filter expression
    MaxAnyAllExpressionDepth = 2,    // max any/all nesting
    PageSize            = 20,        // default page size if $top not provided
    AllowedQueryOptions = AllowedQueryOptions.Filter
                        | AllowedQueryOptions.OrderBy
                        | AllowedQueryOptions.Select
                        | AllowedQueryOptions.Top
                        | AllowedQueryOptions.Skip
                        | AllowedQueryOptions.Count)]
public IQueryable<OrderDto> Get() => /* ... */;

// Model-level property restrictions
builder.EntityType<OrderDto>()
    .Property(o => o.InternalNotes)
    .IsNotFilterable()
    .IsNotSortable();
```

---

### OData with Minimal APIs (Microsoft.AspNetCore.OData 9+)

```csharp
// Minimal API style — available in newer versions
app.MapODataRoute("odata", "odata", BuildEdmModel());

app.MapGet("odata/Orders", (
    ODataQueryOptions<OrderDto> queryOptions,
    AppDbContext db) =>
{
    var query = db.Orders.AsNoTracking()
                  .Select(o => new OrderDto { Id = o.Id.Value, Status = o.Status.ToString() });

    return queryOptions.ApplyTo(query);
});
```

---

### OData vs REST Comparison

| Feature | Plain REST | OData |
|---|---|---|
| **Client-driven filtering** | ❌ Custom params per endpoint | ✅ Standard `$filter` |
| **Field selection** | ❌ Always full object | ✅ `$select` |
| **Relationship expansion** | ❌ Multiple requests | ✅ `$expand` |
| **Sorting** | ❌ Custom per endpoint | ✅ `$orderby` |
| **Paging** | ❌ Custom per endpoint | ✅ `$top` / `$skip` + `nextLink` |
| **Schema discovery** | ❌ | ✅ `$metadata` endpoint |
| **Client complexity** | Low | Medium |
| **Server control** | High | ⚠️ Must restrict carefully |
| **Best for** | Public APIs, mobile | Internal tools, admin UIs, BI |

---

### OData Packages

| Package | Purpose |
|---|---|
| `Microsoft.AspNetCore.OData` | Core OData middleware for ASP.NET Core |
| `Microsoft.OData.ModelBuilder` | EDM model builder |
| `Microsoft.AspNetCore.OData.NewtonsoftJson` | Newtonsoft.Json support (if needed) |
| `Simple.OData.Client` | Typed .NET OData client |

---
