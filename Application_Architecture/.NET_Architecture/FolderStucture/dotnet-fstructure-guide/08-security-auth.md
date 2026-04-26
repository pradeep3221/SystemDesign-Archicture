> [← Common Concerns](07-common-concerns.md)  |  [Microservices Patterns →](09-microservices.md)  |  [🏠 Index](README.md)

## 9. Security & Authentication

### Overview

| Concern | Recommended Approach (.NET 8+) |
|---|---|
| **Authentication** | JWT Bearer + `Microsoft.Identity.Web` |
| **Authorisation** | Policy-based + Resource-based |
| **Identity Provider** | Duende IdentityServer, Azure AD B2C, Auth0, Keycloak |
| **Token storage** | HttpOnly cookies (web) / secure storage (mobile) |
| **Secrets** | `dotnet user-secrets` (dev), Azure Key Vault / AWS Secrets Manager (prod) |
| **HTTPS** | Always enforce — `UseHttpsRedirection()` + HSTS |
| **CORS** | Explicitly configured — never `AllowAnyOrigin` in production |

---

### JWT Bearer Authentication (.NET 8)

```csharp
// Program.cs
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opt =>
    {
        opt.Authority = builder.Configuration["Auth:Authority"]; // e.g. https://login.microsoftonline.com/{tenant}
        opt.Audience  = builder.Configuration["Auth:Audience"];

        opt.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer           = true,
            ValidateAudience         = true,
            ValidateLifetime         = true,
            ValidateIssuerSigningKey = true,
            ClockSkew                = TimeSpan.FromSeconds(30)  // tighten default 5-min skew
        };

        // Support SignalR / EventSource — token from query string
        opt.Events = new JwtBearerEvents
        {
            OnMessageReceived = ctx =>
            {
                var token = ctx.Request.Query["access_token"];
                if (!string.IsNullOrEmpty(token) &&
                    ctx.HttpContext.Request.Path.StartsWithSegments("/hubs"))
                    ctx.Token = token;
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization();

app.UseAuthentication();
app.UseAuthorization();
```

---

### Microsoft.Identity.Web (Azure AD / Entra ID)

```csharp
// Minimal setup for Azure AD protected API
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddMicrosoftIdentityWebApi(builder.Configuration.GetSection("AzureAd"));

// appsettings.json
{
  "AzureAd": {
    "Instance": "https://login.microsoftonline.com/",
    "TenantId": "your-tenant-id",
    "ClientId": "your-client-id",
    "Scopes": "access_as_user"
  }
}
```

---

### Policy-Based Authorisation

```csharp
builder.Services.AddAuthorization(opt =>
{
    // Require authenticated user everywhere by default
    opt.FallbackPolicy = new AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build();

    opt.AddPolicy("AdminOnly", policy =>
        policy.RequireRole("Admin"));

    opt.AddPolicy("CanManageOrders", policy =>
        policy.RequireAuthenticatedUser()
              .RequireClaim("department", "Sales", "Operations")
              .RequireAssertion(ctx =>
                  ctx.User.HasClaim("subscription", "premium") ||
                  ctx.User.IsInRole("Admin")));
});

// Apply on Minimal API endpoint
app.MapDelete("/orders/{id}", DeleteOrder)
   .RequireAuthorization("AdminOnly");
```

---

### Resource-Based Authorisation

```csharp
// Requirement
public class OrderOwnerRequirement : IAuthorizationRequirement { }

// Handler
public class OrderOwnerHandler(IOrderRepository repo)
    : AuthorizationHandler<OrderOwnerRequirement, Order>
{
    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext ctx,
        OrderOwnerRequirement requirement,
        Order order)
    {
        var userId = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (order.OwnerId.ToString() == userId)
            ctx.Succeed(requirement);
    }
}

// Usage in endpoint
app.MapPut("/orders/{id}", async (
    Guid id,
    UpdateOrderRequest req,
    IOrderRepository repo,
    IAuthorizationService authz,
    ClaimsPrincipal user) =>
{
    var order = await repo.GetByIdAsync(new OrderId(id));
    if (order is null) return Results.NotFound();

    var result = await authz.AuthorizeAsync(user, order, new OrderOwnerRequirement());
    if (!result.Succeeded) return Results.Forbid();

    // proceed with update ...
});
```

---

### OAuth2 / OIDC — Token Flow Summary

```
┌──────────┐   1. Login redirect    ┌──────────────────┐
│  Browser │ ──────────────────────▶│ Identity Provider│
│  (SPA /  │                        │ (Entra, Auth0,   │
│  Blazor) │ ◀────────────────────── │ Keycloak, etc.)  │
└──────────┘   2. Auth code          └──────────────────┘
     │                                        │
     │  3. Exchange code for tokens           │
     ▼                                        │
┌──────────┐   4. API call + Bearer token     │
│  Client  │ ──────────────────────▶ ┌────────┴───────┐
│          │                         │   Your API     │
│          │ ◀────────────────────── │ (validates JWT)│
└──────────┘   5. Protected resource └────────────────┘
```

**Flow types:**
| Flow | Use When |
|---|---|
| **Authorization Code + PKCE** | SPAs, mobile apps — always prefer this |
| **Client Credentials** | Service-to-service (no user involved) |
| **Device Code** | CLI tools, IoT |
| ~~Implicit~~ | Deprecated — never use |
| ~~Resource Owner Password~~ | Deprecated — never use |

---

### Data Protection API

```csharp
// Protect sensitive data (tokens, cookies, anti-forgery)
builder.Services.AddDataProtection()
    .PersistKeysToAzureBlobStorage(/* blob connection */)   // prod: persist keys externally
    .ProtectKeysWithAzureKeyVault(/* key vault uri */)      // prod: encrypt at rest
    .SetApplicationName("MyApp")
    .SetDefaultKeyLifetime(TimeSpan.FromDays(90));

// Usage
public class TokenService(IDataProtectionProvider provider)
{
    private readonly IDataProtector _protector =
        provider.CreateProtector("MyApp.Tokens.v1");

    public string Protect(string plaintext)   => _protector.Protect(plaintext);
    public string Unprotect(string ciphertext) => _protector.Unprotect(ciphertext);
}
```

---

### Security Headers

```csharp
// Add via middleware or NWebSec / custom middleware
app.Use(async (ctx, next) =>
{
    ctx.Response.Headers.Append("X-Content-Type-Options",    "nosniff");
    ctx.Response.Headers.Append("X-Frame-Options",           "DENY");
    ctx.Response.Headers.Append("X-XSS-Protection",         "1; mode=block");
    ctx.Response.Headers.Append("Referrer-Policy",           "strict-origin-when-cross-origin");
    ctx.Response.Headers.Append("Permissions-Policy",        "camera=(), microphone=(), geolocation=()");
    ctx.Response.Headers.Append("Content-Security-Policy",
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'");
    await next();
});

app.UseHsts();            // Strict-Transport-Security
app.UseHttpsRedirection();
```

---

### CORS

```csharp
builder.Services.AddCors(opt =>
{
    opt.AddPolicy("AllowFrontend", policy =>
        policy.WithOrigins("https://app.example.com", "https://staging.example.com")
              .WithMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
              .WithHeaders("Authorization", "Content-Type")
              .AllowCredentials()
              .SetPreflightMaxAge(TimeSpan.FromMinutes(10)));
});

app.UseCors("AllowFrontend");

// ⚠️ Never use in production:
// policy.AllowAnyOrigin().AllowCredentials() — browsers block this combination
```

---

### OWASP Top 10 — .NET Mitigations

| OWASP Risk | .NET Mitigation |
|---|---|
| **A01 Broken Access Control** | Policy-based authz, resource-based checks |
| **A02 Cryptographic Failures** | Data Protection API, TLS 1.2+, no MD5/SHA1 |
| **A03 Injection** | EF Core parameterised queries, `FromSql($"...")` safe interpolation |
| **A04 Insecure Design** | Threat modelling, DDD invariants, domain exceptions |
| **A05 Security Misconfiguration** | Security headers, strict CORS, HSTS |
| **A06 Vulnerable Components** | `dotnet list package --vulnerable`, Dependabot |
| **A07 Auth Failures** | JWT validation, short token lifetimes, refresh token rotation |
| **A08 Software Integrity** | NuGet signature verification, SBOM |
| **A09 Logging Failures** | Structured logging (Serilog), never log secrets |
| **A10 SSRF** | `HttpClient` base address allow-list, validate redirect URLs |

---
