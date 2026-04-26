> [← Response Compression](19-response-compression.md)  |  [Middleware Pipeline & Ordering →](21-middleware-pipeline.md)  |  [🏠 Index](README.md)

## 21. JSON Options & Output Formatting

### System.Text.Json (.NET 8+)

```csharp
builder.Services.ConfigureHttpJsonOptions(opt =>
{
    opt.SerializerOptions.PropertyNamingPolicy        = JsonNamingPolicy.CamelCase;
    opt.SerializerOptions.DefaultIgnoreCondition      = JsonIgnoreCondition.WhenWritingNull;
    opt.SerializerOptions.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.CamelCase));
    opt.SerializerOptions.WriteIndented               = false;   // compact for APIs
    opt.SerializerOptions.NumberHandling              = JsonNumberHandling.AllowReadingFromString;
    opt.SerializerOptions.ReferenceHandler            = ReferenceHandler.IgnoreCycles;
});

// For Controller-based APIs
builder.Services.AddControllers().AddJsonOptions(opt =>
{
    opt.JsonSerializerOptions.PropertyNamingPolicy   = JsonNamingPolicy.CamelCase;
    opt.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
});
```

### Source Generation (AOT-compatible, zero reflection)

```csharp
// Define context — tells the compiler which types to generate serialisers for
[JsonSerializable(typeof(OrderResponse))]
[JsonSerializable(typeof(List<OrderResponse>))]
[JsonSerializable(typeof(PagedResponse<OrderResponse>))]
[JsonSerializable(typeof(ProblemDetails))]
[JsonSourceGenerationOptions(
    PropertyNamingPolicy       = JsonKnownNamingPolicy.CamelCase,
    DefaultIgnoreCondition     = JsonIgnoreCondition.WhenWritingNull,
    WriteIndented              = false)]
public partial class AppJsonContext : JsonSerializerContext { }

// Register
builder.Services.ConfigureHttpJsonOptions(opt =>
    opt.SerializerOptions.TypeInfoResolverChain.Insert(0, AppJsonContext.Default));
```

### Custom Converters

```csharp
// Strongly-typed ID converter
public class OrderIdJsonConverter : JsonConverter<OrderId>
{
    public override OrderId Read(ref Utf8JsonReader reader, Type type, JsonSerializerOptions opt)
        => new(reader.GetGuid());

    public override void Write(Utf8JsonWriter writer, OrderId value, JsonSerializerOptions opt)
        => writer.WriteStringValue(value.Value);
}

// DateOnly converter (useful for date-only fields)
public class DateOnlyConverter : JsonConverter<DateOnly>
{
    private const string Format = "yyyy-MM-dd";

    public override DateOnly Read(ref Utf8JsonReader reader, Type type, JsonSerializerOptions opt)
        => DateOnly.ParseExact(reader.GetString()!, Format);

    public override void Write(Utf8JsonWriter writer, DateOnly value, JsonSerializerOptions opt)
        => writer.WriteStringValue(value.ToString(Format));
}

// Register globally
builder.Services.ConfigureHttpJsonOptions(opt =>
{
    opt.SerializerOptions.Converters.Add(new OrderIdJsonConverter());
    opt.SerializerOptions.Converters.Add(new DateOnlyConverter());
});
```

### Content Negotiation (Controller APIs)

```csharp
builder.Services.AddControllers(opt =>
{
    opt.RespectBrowserAcceptHeader = true;  // honour Accept header
    opt.ReturnHttpNotAcceptable    = true;  // 406 if format not supported
})
.AddXmlSerializerFormatters()  // support application/xml
.AddJsonOptions(/* ... */);
```

---
