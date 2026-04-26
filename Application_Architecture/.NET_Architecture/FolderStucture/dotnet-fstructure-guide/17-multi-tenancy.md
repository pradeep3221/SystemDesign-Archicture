> [← Pagination](16-pagination.md)  |  [File Upload & Download →](18-file-upload-download.md)  |  [🏠 Index](README.md)

## 18. Multi-Tenancy

### Tenant Resolution Strategies

```csharp
// Resolve tenant from different sources
public interface ITenantResolver
{
    Task<string?> ResolveAsync(HttpContext ctx);
}

// 1. Subdomain: tenant1.myapp.com
public class SubdomainTenantResolver : ITenantResolver
{
    public Task<string?> ResolveAsync(HttpContext ctx)
    {
        var host   = ctx.Request.Host.Host;          // "tenant1.myapp.com"
        var parts  = host.Split('.');
        var tenant = parts.Length >= 3 ? parts[0] : null;
        return Task.FromResult(tenant);
    }
}

// 2. Route: /api/{tenant}/orders
public class RouteTenantResolver : ITenantResolver
{
    public Task<string?> ResolveAsync(HttpContext ctx)
    {
        ctx.Request.RouteValues.TryGetValue("tenant", out var tenant);
        return Task.FromResult(tenant?.ToString());
    }
}

// 3. JWT claim
public class ClaimTenantResolver : ITenantResolver
{
    public Task<string?> ResolveAsync(HttpContext ctx)
    {
        var tenant = ctx.User.FindFirstValue("tenant_id");
        return Task.FromResult(tenant);
    }
}

// 4. Header: X-Tenant-Id
public class HeaderTenantResolver : ITenantResolver
{
    public Task<string?> ResolveAsync(HttpContext ctx)
    {
        ctx.Request.Headers.TryGetValue("X-Tenant-Id", out var tenant);
        return Task.FromResult(tenant.FirstOrDefault());
    }
}
```

### Tenant Context

```csharp
public class TenantContext
{
    public string TenantId { get; set; } = null!;
    public string? ConnectionString { get; set; }
}

public interface ITenantContext
{
    string TenantId { get; }
}

// Middleware — resolve and store tenant per request
public class TenantMiddleware(ITenantResolver resolver) : IMiddleware
{
    public async Task InvokeAsync(HttpContext ctx, RequestDelegate next)
    {
        var tenantId = await resolver.ResolveAsync(ctx);

        if (string.IsNullOrEmpty(tenantId))
        {
            ctx.Response.StatusCode = 400;
            await ctx.Response.WriteAsJsonAsync(new { error = "Tenant could not be resolved" });
            return;
        }

        ctx.Items["TenantId"] = tenantId;
        await next(ctx);
    }
}
```

### Data Isolation Strategies

| Strategy | Description | Best For |
|---|---|---|
| **Shared DB, shared schema** | `TenantId` column on every table + global EF query filter | SaaS, many small tenants |
| **Shared DB, separate schema** | Each tenant has its own schema | Medium isolation needs |
| **Separate DB per tenant** | Connection string resolved per request | High isolation, compliance |

```csharp
// Strategy 1: EF Core global query filter (shared DB + shared schema)
public class AppDbContext(DbContextOptions options, ITenantContext tenant)
    : DbContext(options)
{
    public DbSet<Order> Orders => Set<Order>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Automatically filter all queries by TenantId
        modelBuilder.Entity<Order>()
            .HasQueryFilter(o => o.TenantId == tenant.TenantId);

        // Always set TenantId on insert
        modelBuilder.Entity<Order>()
            .Property(o => o.TenantId)
            .HasDefaultValueSql("''");
    }

    public override Task<int> SaveChangesAsync(CancellationToken ct = default)
    {
        // Stamp TenantId on all new entities
        foreach (var entry in ChangeTracker.Entries<ITenantEntity>()
                     .Where(e => e.State == EntityState.Added))
        {
            entry.Entity.TenantId = tenant.TenantId;
        }
        return base.SaveChangesAsync(ct);
    }
}

// Strategy 3: Separate DB per tenant
public class TenantDbContextFactory(ITenantContext tenant, IConfiguration config)
{
    public AppDbContext Create()
    {
        var connStr = config[$"TenantConnections:{tenant.TenantId}"]
                      ?? throw new InvalidOperationException($"No DB for tenant {tenant.TenantId}");

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(connStr)
            .Options;

        return new AppDbContext(options, tenant);
    }
}
```

---
