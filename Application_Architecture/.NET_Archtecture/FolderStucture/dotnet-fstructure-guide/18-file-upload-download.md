> [← Multi-Tenancy](17-multi-tenancy.md)  |  [Response Compression →](19-response-compression.md)  |  [🏠 Index](README.md)

## 19. File Upload & Download

### Small File Upload (IFormFile)

```csharp
app.MapPost("/files/upload", async (
    IFormFile file,
    IBlobStorage storage,
    CancellationToken ct) =>
{
    // Validate
    const long maxSize = 10 * 1024 * 1024; // 10 MB
    var allowed = new[] { ".pdf", ".jpg", ".png", ".xlsx" };

    if (file.Length == 0)
        return Results.BadRequest("Empty file");
    if (file.Length > maxSize)
        return Results.BadRequest($"File exceeds {maxSize / 1024 / 1024} MB limit");
    if (!allowed.Contains(Path.GetExtension(file.FileName).ToLowerInvariant()))
        return Results.BadRequest("File type not allowed");

    // Store
    await using var stream = file.OpenReadStream();
    var blobName = $"{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";
    var uri = await storage.UploadAsync(blobName, stream, file.ContentType, ct);

    return Results.Created(uri.ToString(), new { FileName = blobName, Uri = uri });
})
.DisableAntiforgery()
.Accepts<IFormFile>("multipart/form-data")
.Produces<FileUploadResponse>(201)
.WithSummary("Upload a file");
```

### Large File Streaming Upload (no buffering)

```csharp
// Disable request body size limit for this endpoint
app.MapPost("/files/upload/large", async (HttpContext ctx, IBlobStorage storage) =>
{
    if (!ctx.Request.ContentType?.Contains("multipart/form-data") ?? true)
        return Results.BadRequest("Must be multipart/form-data");

    var reader = new MultipartReader(
        MediaTypeHeaderValue.Parse(ctx.Request.ContentType).Parameters
            .First(p => p.Name == "boundary").Value!,
        ctx.Request.Body);

    MultipartSection? section;
    while ((section = await reader.ReadNextSectionAsync()) is not null)
    {
        if (!ContentDispositionHeaderValue.TryParse(
                section.ContentDisposition, out var cd) || !cd.IsFileDisposition())
            continue;

        var fileName = cd.FileName.Value ?? "upload";
        var blobName = $"{Guid.NewGuid()}{Path.GetExtension(fileName)}";

        // Stream directly to blob storage — never touches disk
        await storage.UploadStreamAsync(blobName, section.Body,
            section.ContentType ?? "application/octet-stream");

        return Results.Ok(new { FileName = blobName });
    }

    return Results.BadRequest("No file section found");
})
.WithRequestTimeout(TimeSpan.FromMinutes(10));
```

### File Download (Streaming Response)

```csharp
app.MapGet("/files/{blobName}", async (
    string blobName,
    IBlobStorage storage,
    CancellationToken ct) =>
{
    var (stream, contentType) = await storage.DownloadAsync(blobName, ct);

    if (stream is null) return Results.NotFound();

    // Stream directly to response — no intermediate buffering
    return Results.Stream(
        stream,
        contentType:       contentType,
        fileDownloadName:  blobName,          // triggers Content-Disposition: attachment
        enableRangeProcessing: true);         // supports Range header / resumable downloads
});
```

### Azure Blob Storage Abstraction

```csharp
public interface IBlobStorage
{
    Task<Uri> UploadAsync(string name, Stream stream, string contentType, CancellationToken ct);
    Task<(Stream? Stream, string ContentType)> DownloadAsync(string name, CancellationToken ct);
    Task DeleteAsync(string name, CancellationToken ct);
    Task<string> GetSasUrlAsync(string name, TimeSpan expiry);  // presigned URL
}

// Implementation using Azure SDK
public class AzureBlobStorage(BlobServiceClient client, IOptions<BlobSettings> settings)
    : IBlobStorage
{
    private BlobContainerClient Container =>
        client.GetBlobContainerClient(settings.Value.ContainerName);

    public async Task<Uri> UploadAsync(
        string name, Stream stream, string contentType, CancellationToken ct)
    {
        var blob = Container.GetBlobClient(name);
        await blob.UploadAsync(stream,
            new BlobUploadOptions { HttpHeaders = new BlobHttpHeaders { ContentType = contentType } },
            ct);
        return blob.Uri;
    }

    public async Task<string> GetSasUrlAsync(string name, TimeSpan expiry)
    {
        var blob = Container.GetBlobClient(name);
        var sas  = blob.GenerateSasUri(BlobSasPermissions.Read, DateTimeOffset.UtcNow.Add(expiry));
        return sas.ToString();
    }
}
```

---
