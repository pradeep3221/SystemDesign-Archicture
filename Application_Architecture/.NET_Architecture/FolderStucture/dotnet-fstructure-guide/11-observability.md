> [← Messaging & Event-Driven](10-messaging.md)  |  [API Versioning →](12-api-versioning.md)  |  [🏠 Index](README.md)

## 12. Observability — OpenTelemetry, Serilog, Seq & Grafana

### The Three Pillars of Observability

```
┌────────────┐   ┌────────────┐   ┌────────────┐
│   Logs     │   │  Metrics   │   │  Traces    │
│            │   │            │   │            │
│ What       │   │ How much / │   │ Where did  │
│ happened   │   │ how often  │   │ time go?   │
│            │   │            │   │            │
│ Serilog    │   │ OpenTel    │   │ OpenTel    │
│ + Seq      │   │ + Prometheus│  │ + Jaeger / │
│            │   │ + Grafana  │   │ Tempo      │
└────────────┘   └────────────┘   └────────────┘
```

---

### OpenTelemetry Setup (.NET 8+)

```csharp
// Install packages:
// OpenTelemetry.Extensions.Hosting
// OpenTelemetry.Instrumentation.AspNetCore
// OpenTelemetry.Instrumentation.Http
// OpenTelemetry.Instrumentation.EntityFrameworkCore
// OpenTelemetry.Exporter.OpenTelemetryProtocol (OTLP)

builder.Services.AddOpenTelemetry()
    .ConfigureResource(r => r
        .AddService(
            serviceName:    builder.Environment.ApplicationName,
            serviceVersion: "1.0.0",
            serviceInstanceId: Environment.MachineName))

    // Distributed Tracing
    .WithTracing(tracing => tracing
        .AddAspNetCoreInstrumentation(opt =>
        {
            opt.RecordException = true;
            opt.Filter = ctx => !ctx.Request.Path.StartsWithSegments("/health");
        })
        .AddHttpClientInstrumentation()
        .AddEntityFrameworkCoreInstrumentation(opt => opt.SetDbStatementForText = true)
        .AddSource("MyApp.*")           // custom ActivitySource
        .AddOtlpExporter(opt =>         // send to Seq / Grafana Tempo / Jaeger
            opt.Endpoint = new Uri(builder.Configuration["Otlp:Endpoint"]!)))

    // Metrics
    .WithMetrics(metrics => metrics
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
        .AddRuntimeInstrumentation()    // GC, thread pool, allocations
        .AddMeter("MyApp.*")            // custom meters
        .AddOtlpExporter()
        .AddPrometheusExporter());      // /metrics endpoint for Prometheus scraping

// Expose Prometheus scrape endpoint
app.MapPrometheusScrapingEndpoint("/metrics");
```

---

### Custom Activity (Trace Span)

```csharp
// Define ActivitySource once — register as singleton
public static class Telemetry
{
    public static readonly ActivitySource Source = new("MyApp.Orders", "1.0.0");
}

builder.Services.AddSingleton(Telemetry.Source);

// Instrument your code
public class OrderService(ActivitySource activitySource)
{
    public async Task<Order> CreateAsync(CreateOrderRequest req, CancellationToken ct)
    {
        using var activity = activitySource.StartActivity("CreateOrder");
        activity?.SetTag("order.customerId", req.CustomerId);
        activity?.SetTag("order.itemCount",  req.Lines.Count);

        try
        {
            var order = Order.Create(new CustomerId(req.CustomerId));
            // ...
            activity?.SetStatus(ActivityStatusCode.Ok);
            activity?.SetTag("order.id", order.Id.Value);
            return order;
        }
        catch (Exception ex)
        {
            activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
            activity?.RecordException(ex);
            throw;
        }
    }
}
```

---

### Custom Metrics

```csharp
// Define metrics — register as singleton
public class OrderMetrics
{
    private readonly Counter<long>   _ordersCreated;
    private readonly Histogram<double> _orderProcessingTime;
    private readonly UpDownCounter<int> _pendingOrders;

    public OrderMetrics(IMeterFactory meterFactory)
    {
        var meter = meterFactory.Create("MyApp.Orders");

        _ordersCreated = meter.CreateCounter<long>(
            "orders.created",
            unit: "{orders}",
            description: "Total number of orders created");

        _orderProcessingTime = meter.CreateHistogram<double>(
            "orders.processing_duration",
            unit: "ms",
            description: "Time to process an order");

        _pendingOrders = meter.CreateUpDownCounter<int>(
            "orders.pending",
            unit: "{orders}",
            description: "Current number of pending orders");
    }

    public void OrderCreated(string region) =>
        _ordersCreated.Add(1, new TagList { { "region", region } });

    public void RecordProcessingTime(double ms, string status) =>
        _orderProcessingTime.Record(ms, new TagList { { "status", status } });

    public void OrderPending(int delta) => _pendingOrders.Add(delta);
}

builder.Services.AddSingleton<OrderMetrics>();
```

---

### Serilog — Structured Logging

```csharp
// Program.cs — bootstrap logger first (catches startup errors)
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateBootstrapLogger();

builder.Host.UseSerilog((ctx, services, config) => config
    .ReadFrom.Configuration(ctx.Configuration)      // from appsettings.json
    .ReadFrom.Services(services)                    // inject ILogger enrichers
    .Enrich.FromLogContext()
    .Enrich.WithMachineName()
    .Enrich.WithEnvironmentName()
    .Enrich.WithProperty("Application", ctx.HostingEnvironment.ApplicationName)
    .WriteTo.Console(new CompactJsonFormatter())
    .WriteTo.Seq(ctx.Configuration["Seq:Url"]!)
    .WriteTo.OpenTelemetry(opt =>                   // send logs via OTLP
    {
        opt.Endpoint = ctx.Configuration["Otlp:Endpoint"];
        opt.ResourceAttributes.Add("service.name", ctx.HostingEnvironment.ApplicationName);
    }));

app.UseSerilogRequestLogging(opt =>
{
    opt.EnrichDiagnosticContext = (diag, http) =>
    {
        diag.Set("RequestHost",   http.Request.Host.Value);
        diag.Set("RequestScheme", http.Request.Scheme);
        diag.Set("UserAgent",     http.Request.Headers.UserAgent);
    };
    opt.GetLevel = (http, elapsed, ex) => ex is not null || http.Response.StatusCode >= 500
        ? LogEventLevel.Error
        : http.Response.StatusCode >= 400
            ? LogEventLevel.Warning
            : LogEventLevel.Information;
});
```

#### appsettings.json Serilog configuration

```json
{
  "Serilog": {
    "MinimumLevel": {
      "Default": "Information",
      "Override": {
        "Microsoft":                         "Warning",
        "Microsoft.EntityFrameworkCore":     "Warning",
        "System":                            "Warning"
      }
    }
  },
  "Seq": { "Url": "http://localhost:5341" },
  "Otlp": { "Endpoint": "http://localhost:4317" }
}
```

---

### Log Levels — When to Use

| Level | When |
|---|---|
| `Verbose` | Extremely detailed — dev only, never prod |
| `Debug` | Diagnostic info useful in dev/staging |
| `Information` | Normal application flow milestones |
| `Warning` | Unexpected but handled — degraded mode |
| `Error` | Failure requiring investigation, request failed |
| `Fatal` | App cannot continue — imminent crash |

```csharp
// Structured logging — always use message templates, never string interpolation
logger.LogInformation("Order {OrderId} placed by {CustomerId}", order.Id, order.CustomerId);

// ❌ Never do this — loses structure, may leak data
logger.LogInformation($"Order {order.Id} placed by {order.CustomerId}");

// Scoped properties — attach context for the duration of a request
using (LogContext.PushProperty("CorrelationId", correlationId))
using (LogContext.PushProperty("TenantId",      tenantId))
{
    logger.LogInformation("Processing started");
    // all log entries in this scope carry CorrelationId + TenantId
}
```

---

### Seq — Local & Centralised Log Server

Seq ingests structured logs and provides full-text + property search.

```bash
# Run Seq locally via Docker
docker run -d --name seq \
  -e ACCEPT_EULA=Y \
  -p 5341:80 \
  datalust/seq:latest
# UI: http://localhost:5341
```

**Useful Seq queries:**
```
# All errors in the last hour
@Level = 'Error' and @Timestamp > Now() - 1h

# Slow requests (over 1s)
Elapsed > 1000

# Orders for a specific customer
CustomerId = '3fa85f64-5717-4562-b3fc-2c963f66afa6'

# All logs for a correlation ID
CorrelationId = 'abc-123'
```

---

### Grafana Stack — Metrics & Traces

```yaml
# docker-compose.yml — full observability stack locally
services:
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports: ["9090:9090"]

  grafana:
    image: grafana/grafana:latest
    ports: ["3000:3000"]
    environment:
      GF_SECURITY_ADMIN_PASSWORD: admin
    volumes:
      - grafana-data:/var/lib/grafana

  tempo:                              # distributed trace backend
    image: grafana/tempo:latest
    ports: ["4317:4317", "3200:3200"]

  otel-collector:                     # receive OTLP, fan out to backends
    image: otel/opentelemetry-collector-contrib:latest
    volumes:
      - ./otel-config.yml:/etc/otel/config.yaml
    ports: ["4317:4317", "4318:4318"]
```

```yaml
# prometheus.yml — scrape .NET /metrics endpoint
scrape_configs:
  - job_name: "myapp"
    static_configs:
      - targets: ["host.docker.internal:5000"]
    metrics_path: /metrics
    scrape_interval: 15s
```

---

### .NET Aspire Dashboard (Built-in, .NET 8+)

When using Aspire, the dev dashboard is available at `https://localhost:15888` and provides:
- **Structured logs** — all services, searchable, filterable
- **Distributed traces** — waterfall view across service calls
- **Metrics** — resource utilisation, request rates
- **Resources** — health status of each service + container

No extra config needed — `AddServiceDefaults()` wires everything up automatically.

---

### Health Check → Alerting Pipeline

```
/health/ready endpoint
       │
       ▼
  Prometheus scrapes
       │
       ▼
  AlertManager rule:
    "health check failing > 2min → fire alert"
       │
       ▼
  PagerDuty / Slack / OpsGenie notification
```

```yaml
# Prometheus alert rule
groups:
  - name: myapp
    rules:
      - alert: HealthCheckFailing
        expr: |
          aspnetcore_healthcheck_status{job="myapp", status="Unhealthy"} == 1
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Health check {{ $labels.name }} is failing"
```

---

### Observability Checklist

| Item | Done? |
|---|---|
| Structured logging (no string interpolation) | ☐ |
| Correlation ID propagated across services | ☐ |
| Request logging middleware (Serilog) | ☐ |
| OpenTelemetry traces for all HTTP + DB calls | ☐ |
| Custom spans for critical business operations | ☐ |
| Metrics for business KPIs (orders/min, error rate) | ☐ |
| Prometheus `/metrics` endpoint exposed | ☐ |
| Health check endpoints (`/health/live`, `/health/ready`) | ☐ |
| Secrets never logged | ☐ |
| Log levels tuned per environment | ☐ |
| Alerts configured for error rate + latency SLOs | ☐ |

---


---
