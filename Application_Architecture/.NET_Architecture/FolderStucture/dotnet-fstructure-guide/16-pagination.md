> [← Feature Flags](15-feature-flags.md)  |  [Multi-Tenancy →](17-multi-tenancy.md)  |  [🏠 Index](README.md)

## 17. Pagination

### Offset-Based Pagination

Simple but has performance issues on large datasets (DB must scan all previous rows).

```csharp
// Request
public record PagedRequest(int Page = 1, int PageSize = 20)
{
    public int Skip => (Page - 1) * PageSize;
    public int Take => Math.Min(PageSize, 100);   // cap max page size
}

// Response envelope
public record PagedResponse<T>
{
    public IReadOnlyList<T> Items      { get; init; } = [];
    public int              Page       { get; init; }
    public int              PageSize   { get; init; }
    public int              TotalCount { get; init; }
    public int              TotalPages => (int)Math.Ceiling(TotalCount / (double)PageSize);
    public bool             HasNext    => Page < TotalPages;
    public bool             HasPrevious => Page > 1;
}

// EF Core query
public async Task<PagedResponse<OrderDto>> GetOrdersAsync(PagedRequest req, CancellationToken ct)
{
    var query = _context.Orders
        .Where(o => o.Status == OrderStatus.Active)
        .OrderByDescending(o => o.CreatedAt);

    var total = await query.CountAsync(ct);

    var items = await query
        .Skip(req.Skip)
        .Take(req.Take)
        .Select(o => new OrderDto(o.Id, o.Status, o.CreatedAt))
        .ToListAsync(ct);

    return new PagedResponse<OrderDto>
    {
        Items      = items,
        Page       = req.Page,
        PageSize   = req.Take,
        TotalCount = total
    };
}

// Minimal API endpoint
app.MapGet("/orders", async (
    [AsParameters] PagedRequest req,
    IOrderService service,
    CancellationToken ct) =>
{
    var result = await service.GetOrdersAsync(req, ct);
    return Results.Ok(result);
});
```

### Cursor-Based Pagination (Keyset)

Performant at any dataset size — no OFFSET scan. Ideal for large tables and infinite scroll.

```csharp
// Request
public record CursorRequest(string? Cursor = null, int PageSize = 20);

// Cursor is a base64-encoded opaque value (hides implementation details)
public static class CursorHelper
{
    public static string Encode(DateTimeOffset createdAt, Guid id) =>
        Convert.ToBase64String(
            Encoding.UTF8.GetBytes($"{createdAt:O}|{id}"));

    public static (DateTimeOffset CreatedAt, Guid Id) Decode(string cursor)
    {
        var raw   = Encoding.UTF8.GetString(Convert.FromBase64String(cursor));
        var parts = raw.Split('|');
        return (DateTimeOffset.Parse(parts[0]), Guid.Parse(parts[1]));
    }
}

// EF Core keyset query
public async Task<CursorPagedResponse<OrderDto>> GetOrdersAsync(
    CursorRequest req, CancellationToken ct)
{
    var take = Math.Min(req.PageSize, 100) + 1;  // fetch one extra to detect HasNext

    IQueryable<Order> query = _context.Orders.OrderByDescending(o => o.CreatedAt)
                                             .ThenByDescending(o => o.Id);

    if (req.Cursor is not null)
    {
        var (after, afterId) = CursorHelper.Decode(req.Cursor);
        query = query.Where(o =>
            o.CreatedAt < after ||
            (o.CreatedAt == after && o.Id.Value.CompareTo(afterId) < 0));
    }

    var items = await query
        .Take(take)
        .Select(o => new OrderDto(o.Id, o.Status, o.CreatedAt))
        .ToListAsync(ct);

    var hasNext   = items.Count == take;
    var pageItems = hasNext ? items[..^1] : items;

    var nextCursor = hasNext
        ? CursorHelper.Encode(pageItems[^1].CreatedAt, pageItems[^1].Id.Value)
        : null;

    return new CursorPagedResponse<OrderDto>
    {
        Items      = pageItems,
        NextCursor = nextCursor,
        HasNext    = hasNext
    };
}
```

### Comparison

| | Offset Pagination | Cursor (Keyset) Pagination |
|---|---|---|
| **Performance** | ❌ Degrades on large pages | ✅ Constant regardless of depth |
| **Random access** | ✅ Jump to any page | ❌ Forward only |
| **Total count** | ✅ Easy | ❌ Expensive / omitted |
| **Stable results** | ❌ Items shift on insert | ✅ Stable |
| **Best for** | Admin UIs, small tables | Feeds, large tables, mobile |

---
