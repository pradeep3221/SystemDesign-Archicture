> [← API Versioning](12-api-versioning.md)  |  [Background Jobs & Scheduling →](14-background-jobs.md)  |  [🏠 Index](README.md)

## 14. Configuration & Options Pattern

### Configuration Sources (in priority order)

```csharp
// .NET 8 default host builder layers these in order (last wins):
builder.Configuration
    .AddJsonFile("appsettings.json",                     optional: false, reloadOnChange: true)
    .AddJsonFile($"appsettings.{env.EnvironmentName}.json", optional: true,  reloadOnChange: true)
    .AddEnvironmentVariables()     // override with env vars in containers/k8s
    .AddCommandLine(args)          // override at runtime
    .AddUserSecrets<Program>(optional: true);  // dev only — never commit
```

### Options Pattern — Three Variants

```csharp
// Register
builder.Services.Configure<OrderSettings>(
    builder.Configuration.GetSection("OrderSettings"));

// appsettings.json
{
  "OrderSettings": {
    "MaxItemsPerOrder": 50,
    "DefaultCurrency":  "USD",
    "ExpiryMinutes":    30
  }
}

public record OrderSettings
{
    public int    MaxItemsPerOrder { get; init; } = 10;
    public string DefaultCurrency  { get; init; } = "USD";
    public int    ExpiryMinutes    { get; init; } = 60;
}
```

| Interface | Lifetime | Reloads? | Use When |
|---|---|---|---|
| `IOptions<T>` | Singleton | ❌ Never | Config fixed at startup |
| `IOptionsSnapshot<T>` | Scoped | ✅ Per request | Config may change between requests |
| `IOptionsMonitor<T>` | Singleton | ✅ On file change | Long-running services, background workers |

```csharp
// IOptions<T> — injected as singleton, never reflects live changes
public class OrderService(IOptions<OrderSettings> options)
{
    private readonly OrderSettings _settings = options.Value;
}

// IOptionsSnapshot<T> — fresh value each HTTP request
public class PricingService(IOptionsSnapshot<PricingSettings> snapshot)
{
    private readonly PricingSettings _settings = snapshot.Value;
}

// IOptionsMonitor<T> — reacts to changes without restart
public class FeatureFlagService(IOptionsMonitor<FeatureFlags> monitor)
{
    public bool IsEnabled(string flag) =>
        monitor.CurrentValue.EnabledFlags.Contains(flag);

    // Subscribe to changes
    public FeatureFlagService(IOptionsMonitor<FeatureFlags> monitor)
    {
        monitor.OnChange(updated =>
            Console.WriteLine($"Flags updated: {string.Join(", ", updated.EnabledFlags)}"));
    }
}
```

### Options Validation

```csharp
// Validate on startup — fail fast if config is wrong
builder.Services
    .AddOptions<OrderSettings>()
    .BindConfiguration("OrderSettings")
    .ValidateDataAnnotations()      // uses [Required], [Range] etc.
    .ValidateOnStart();             // crash at startup rather than runtime

public record OrderSettings
{
    [Required]
    public string DefaultCurrency { get; init; } = null!;

    [Range(1, 1000)]
    public int MaxItemsPerOrder { get; init; }
}

// Or custom FluentValidation-style validation
builder.Services
    .AddOptions<SmtpSettings>()
    .BindConfiguration("Smtp")
    .Validate(s => Uri.IsWellFormedUriString(s.Host, UriKind.Absolute),
              "Smtp:Host must be a valid URI")
    .ValidateOnStart();
```

### Named Options

```csharp
// Register multiple named instances
builder.Services.Configure<SmtpSettings>("Primary",  config.GetSection("Smtp:Primary"));
builder.Services.Configure<SmtpSettings>("Backup",   config.GetSection("Smtp:Backup"));

// Resolve by name
public class EmailService(IOptionsMonitor<SmtpSettings> monitor)
{
    private SmtpSettings Primary => monitor.Get("Primary");
    private SmtpSettings Backup  => monitor.Get("Backup");
}
```

### Azure Key Vault Integration

```bash
dotnet add package Azure.Extensions.AspNetCore.Configuration.Secrets
dotnet add package Azure.Identity
```

```csharp
// Program.cs
if (!builder.Environment.IsDevelopment())
{
    var keyVaultUri = new Uri(builder.Configuration["KeyVault:Uri"]!);
    builder.Configuration.AddAzureKeyVault(keyVaultUri, new DefaultAzureCredential());
}

// Secret naming: Key Vault uses '--' as the section separator
// "ConnectionStrings--DefaultConnection" → ConnectionStrings:DefaultConnection
```

### AWS Secrets Manager

```csharp
// dotnet add package Amazon.Extensions.Configuration.SystemsManager
builder.Configuration.AddSystemsManager("/myapp/production/");
```

### HashiCorp Vault

```csharp
// dotnet add package VaultSharp
var vaultClient = new VaultClient(new VaultClientSettings(
    "https://vault.example.com",
    new TokenAuthMethodInfo(token)));

var secret = await vaultClient.V1.Secrets.KeyValue.V2
    .ReadSecretAsync(path: "myapp/db", mountPoint: "secret");
```

### Environment Variable Naming

```bash
# Nested config → double underscore in env vars (works in all OS)
# OrderSettings:MaxItemsPerOrder
export OrderSettings__MaxItemsPerOrder=100

# Connection strings
export ConnectionStrings__DefaultConnection="Server=...;Database=...;"
```

---
