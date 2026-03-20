> [← Background Jobs & Scheduling](14-background-jobs.md)  |  [Pagination →](16-pagination.md)  |  [🏠 Index](README.md)

## 16. Feature Flags

### Microsoft.FeatureManagement

```bash
dotnet add package Microsoft.FeatureManagement.AspNetCore
```

```csharp
// Registration
builder.Services.AddFeatureManagement();

// appsettings.json
{
  "FeatureManagement": {
    "NewCheckoutFlow":     true,
    "BetaPricingEngine":   false,
    "DarkMode":            true
  }
}

// Usage in a service
public class CheckoutService(IFeatureManager features)
{
    public async Task<CheckoutResult> CheckoutAsync(Cart cart, CancellationToken ct)
    {
        if (await features.IsEnabledAsync("NewCheckoutFlow"))
            return await NewCheckoutAsync(cart, ct);

        return await LegacyCheckoutAsync(cart, ct);
    }
}

// Usage on a Minimal API endpoint
app.MapPost("/checkout", CheckoutHandler)
   .WithFeatureGate("NewCheckoutFlow");   // returns 404 if flag is off

// Usage on a Controller action
[FeatureGate("BetaPricingEngine")]
[HttpGet("pricing/beta")]
public IActionResult GetBetaPricing() => Ok();
```

### Percentage Rollout Filter

```json
{
  "FeatureManagement": {
    "GradualRollout": {
      "EnabledFor": [{
        "Name": "Microsoft.Percentage",
        "Parameters": { "Value": 20 }
      }]
    }
  }
}
```

### Targeting Filter (per user / group)

```json
{
  "FeatureManagement": {
    "EarlyAccess": {
      "EnabledFor": [{
        "Name": "Microsoft.Targeting",
        "Parameters": {
          "Audience": {
            "Users":  ["alice@example.com", "bob@example.com"],
            "Groups": [{ "Name": "beta-testers", "RolloutPercentage": 100 }],
            "DefaultRolloutPercentage": 0
          }
        }
      }]
    }
  }
}
```

```csharp
// Set targeting context (who the current user is)
builder.Services.AddSingleton<ITargetingContextAccessor, HttpContextTargetingContextAccessor>();

public class HttpContextTargetingContextAccessor(IHttpContextAccessor http)
    : ITargetingContextAccessor
{
    public ValueTask<TargetingContext> GetContextAsync() =>
        ValueTask.FromResult(new TargetingContext
        {
            UserId = http.HttpContext?.User.FindFirstValue(ClaimTypes.Email) ?? "anonymous",
            Groups = http.HttpContext?.User.FindAll("groups").Select(c => c.Value).ToList()
                     ?? []
        });
}
```

### Azure App Configuration (centralised flags)

```csharp
builder.Configuration.AddAzureAppConfiguration(opt =>
{
    opt.Connect(builder.Configuration["AppConfig:ConnectionString"])
       .UseFeatureFlags(ff => ff.SetRefreshInterval(TimeSpan.FromSeconds(30)));
});

builder.Services.AddAzureAppConfiguration();
builder.Services.AddFeatureManagement();

app.UseAzureAppConfiguration(); // enables periodic refresh
```

---
