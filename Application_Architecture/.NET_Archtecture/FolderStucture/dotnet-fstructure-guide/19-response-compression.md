> [← File Upload & Download](18-file-upload-download.md)  |  [JSON Options & Output Formatting →](20-json-output-formatting.md)  |  [🏠 Index](README.md)

## 20. Response Compression

Built-in `Microsoft.AspNetCore.ResponseCompression` — no extra package needed.

```csharp
builder.Services.AddResponseCompression(opt =>
{
    opt.EnableForHttps = true;    // compress HTTPS responses (safe for APIs not serving HTML)
    opt.Providers.Add<BrotliCompressionProvider>();
    opt.Providers.Add<GzipCompressionProvider>();
    opt.MimeTypes = ResponseCompressionDefaults.MimeTypes.Concat(
    [
        "application/json",
        "application/problem+json",
        "text/csv",
        "application/octet-stream"
    ]);
});

builder.Services.Configure<BrotliCompressionProviderOptions>(opt =>
    opt.Level = CompressionLevel.Fastest);  // Fastest = good balance; Optimal = max compression

builder.Services.Configure<GzipCompressionProviderOptions>(opt =>
    opt.Level = CompressionLevel.SmartButNotTooSmart);  // .NET 9

app.UseResponseCompression();  // must be early in pipeline — before UseStaticFiles, UseRouting
```

> **Order matters:** `UseResponseCompression` must come **before** any middleware that writes the response body.

### When to Use

| Scenario | Compress? |
|---|---|
| Large JSON API responses | ✅ Yes |
| Small responses (< 1 KB) | ❌ Overhead exceeds gain |
| Already-compressed files (JPEG, PNG, zip) | ❌ Will grow, not shrink |
| HTTPS + HTML with user data (BREACH attack) | ⚠️ Disable for sensitive HTML — fine for JSON APIs |
| Static files | ✅ Use pre-compressed files with `UseStaticFiles` instead |

---
