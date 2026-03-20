> [← JSON Options & Output Formatting](20-json-output-formatting.md)  |  [Native AOT →](22-native-aot.md)  |  [🏠 Index](README.md)

## 22. Middleware Pipeline & Ordering

The order of `app.Use*()` calls in `Program.cs` is critical. Middleware runs top-to-bottom on the request and bottom-to-top on the response.

### Correct Ordering (.NET 8+)

```csharp
// ── Security ─────────────────────────────────────────────────────────
app.UseExceptionHandler();        // 1. Catch all unhandled exceptions FIRST
app.UseHsts();                    // 2. Add Strict-Transport-Security header
app.UseHttpsRedirection();        // 3. Redirect HTTP → HTTPS

// ── Infrastructure ───────────────────────────────────────────────────
app.UseResponseCompression();     // 4. Compress responses (before anything writes body)
app.UseStaticFiles();             // 5. Serve static files (bypass remaining pipeline)

// ── Routing ──────────────────────────────────────────────────────────
app.UseRouting();                 // 6. Match endpoints (required before auth)

// ── Cross-Origin ─────────────────────────────────────────────────────
app.UseCors("AllowFrontend");     // 7. After routing, before auth

// ── Auth ─────────────────────────────────────────────────────────────
app.UseAuthentication();          // 8. Who are you?
app.UseAuthorization();           // 9. Are you allowed?

// ── Rate Limiting ────────────────────────────────────────────────────
app.UseRateLimiter();             // 10. After auth (so you can rate-limit per user)

// ── App Specifics ────────────────────────────────────────────────────
app.UseOutputCache();             // 11. Cache responses after auth check
app.UseSerilogRequestLogging();   // 12. Log requests (after routing for route data)

// ── Endpoints ────────────────────────────────────────────────────────
app.MapControllers();             // 13. Map controller routes
app.MapHealthChecks("/health");   // 14. Health check endpoints
app.Run();
```

### Common Ordering Mistakes

| Mistake | Symptom |
|---|---|
| `UseAuthorization()` before `UseAuthentication()` | 401 on all requests — user never identified |
| `UseCors()` after `UseAuthorization()` | CORS preflight (OPTIONS) fails — blocked before auth |
| `UseResponseCompression()` after `UseStaticFiles()` | Static files not compressed |
| `UseExceptionHandler()` not first | Exceptions thrown by middleware before it leak stack traces |
| `UseRateLimiter()` before `UseAuthentication()` | Can't rate-limit per user — only per IP |
| `UseOutputCache()` before `UseAuthorization()` | Cached responses served without auth check |

### Custom Middleware

```csharp
// Convention-based (preferred for simple cases)
public class CorrelationIdMiddleware(RequestDelegate next)
{
    private const string Header = "X-Correlation-Id";

    public async Task InvokeAsync(HttpContext ctx)
    {
        var correlationId = ctx.Request.Headers[Header].FirstOrDefault()
                            ?? Guid.NewGuid().ToString();

        ctx.Items["CorrelationId"] = correlationId;
        ctx.Response.Headers.TryAdd(Header, correlationId);

        using (LogContext.PushProperty("CorrelationId", correlationId))
        {
            await next(ctx);
        }
    }
}

// IMiddleware (DI-friendly — scoped dependencies work correctly)
public class TenantMiddleware(ITenantResolver resolver) : IMiddleware
{
    public async Task InvokeAsync(HttpContext ctx, RequestDelegate next)
    {
        // Scoped services injected here are request-scoped
        var tenantId = await resolver.ResolveAsync(ctx);
        ctx.Items["TenantId"] = tenantId;
        await next(ctx);
    }
}

// Register IMiddleware implementations
builder.Services.AddScoped<TenantMiddleware>();

// Add to pipeline
app.UseMiddleware<CorrelationIdMiddleware>();
app.UseMiddleware<TenantMiddleware>();
```

### Endpoint Filters (Minimal APIs — replaces Action Filters)

```csharp
// Reusable endpoint filter
public class ValidationFilter<T> : IEndpointFilter where T : class
{
    public async ValueTask<object?> InvokeAsync(
        EndpointFilterInvocationContext ctx, EndpointFilterDelegate next)
    {
        var arg = ctx.Arguments.OfType<T>().FirstOrDefault();
        if (arg is null) return Results.BadRequest("Invalid request body");

        var validator = ctx.HttpContext.RequestServices.GetService<IValidator<T>>();
        if (validator is not null)
        {
            var result = await validator.ValidateAsync(arg);
            if (!result.IsValid)
                return Results.ValidationProblem(result.ToDictionary());
        }

        return await next(ctx);
    }
}

// Apply per endpoint or per group
app.MapPost("/orders", CreateOrder)
   .AddEndpointFilter<ValidationFilter<CreateOrderRequest>>();

// Apply to entire group
app.MapGroup("/api/v1")
   .AddEndpointFilter<ValidationFilter<object>>()
   .RequireAuthorization();
```

---
