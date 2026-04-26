> [← Configuration & Options Pattern](13-configuration-options.md)  |  [Feature Flags →](15-feature-flags.md)  |  [🏠 Index](README.md)

## 15. Background Jobs & Scheduling

### BackgroundService — Built-in

Use for **continuous** or **triggered** long-running work without a scheduler.

```csharp
public class OutboxProcessorWorker(
    IServiceScopeFactory scopeFactory,
    ILogger<OutboxProcessorWorker> logger,
    TimeProvider time) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("Outbox processor started");

        await using var timer = new PeriodicTimer(TimeSpan.FromSeconds(10));

        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                await using var scope = scopeFactory.CreateAsyncScope();
                var processor = scope.ServiceProvider
                    .GetRequiredService<IOutboxProcessor>();

                await processor.ProcessPendingAsync(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogError(ex, "Error processing outbox");
            }
        }
    }
}

builder.Services.AddHostedService<OutboxProcessorWorker>();
```

> Use `PeriodicTimer` (.NET 6+) instead of `Task.Delay` in loops — it skips missed ticks rather than drifting.

---

### Hangfire — Persistent Background Jobs

Best for: **reliable**, **retryable**, **schedulable** jobs with a management UI.

```bash
dotnet add package Hangfire.AspNetCore
dotnet add package Hangfire.SqlServer    # or .PostgreSql / .InMemory
```

```csharp
// Registration
builder.Services.AddHangfire(cfg => cfg
    .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
    .UseSimpleAssemblyNameTypeSerializer()
    .UseRecommendedSerializerSettings()
    .UseSqlServerStorage(builder.Configuration.GetConnectionString("HangfireDb")));

builder.Services.AddHangfireServer(opt =>
{
    opt.WorkerCount  = Environment.ProcessorCount * 2;
    opt.Queues       = ["critical", "default", "low"];
});

app.MapHangfireDashboard("/hangfire", new DashboardOptions
{
    Authorization = [new HangfireAuthFilter()]   // always protect in production
});

// Job types
public class ReportService
{
    // Fire-and-forget
    public void EnqueueWelcomeEmail(Guid userId)
        => BackgroundJob.Enqueue<IEmailService>(s => s.SendWelcomeAsync(userId));

    // Delayed
    public void ScheduleFollowUp(Guid userId)
        => BackgroundJob.Schedule<IEmailService>(
            s => s.SendFollowUpAsync(userId),
            TimeSpan.FromDays(3));

    // Recurring (cron)
    public void RegisterRecurringJobs()
    {
        RecurringJob.AddOrUpdate<IReportGenerator>(
            recurringJobId: "daily-sales-report",
            methodCall:     gen => gen.GenerateAsync(CancellationToken.None),
            cronExpression: Cron.Daily(hour: 6),
            options:        new RecurringJobOptions { TimeZone = TimeZoneInfo.Utc });
    }

    // Continuations — chain jobs
    public void EnqueueOrderPipeline(Guid orderId)
    {
        var jobId = BackgroundJob.Enqueue<IOrderProcessor>(
            p => p.ValidateAsync(orderId));

        BackgroundJob.ContinueJobWith<IOrderProcessor>(
            jobId, p => p.FulfillAsync(orderId));
    }
}
```

---

### Quartz.NET — Advanced Scheduling

Best for: **complex cron triggers**, **job clustering**, **misfire handling**.

```bash
dotnet add package Quartz.AspNetCore
dotnet add package Quartz.Extensions.Hosting
```

```csharp
builder.Services.AddQuartz(q =>
{
    q.UseMicrosoftDependencyInjectionJobFactory();

    // Define job
    var jobKey = new JobKey("InvoiceJob", "billing");

    q.AddJob<GenerateInvoicesJob>(opts => opts
        .WithIdentity(jobKey)
        .DisallowConcurrentExecution()
        .StoreDurably());

    // Trigger: every day at 02:00 UTC
    q.AddTrigger(opts => opts
        .ForJob(jobKey)
        .WithIdentity("InvoiceJob-trigger")
        .WithCronSchedule("0 0 2 * * ?",
            x => x.InTimeZone(TimeZoneInfo.Utc)
                   .WithMisfireHandlingInstructionFireAndProceed()));
});

builder.Services.AddQuartzHostedService(opt => opt.WaitForJobsToComplete = true);

// Job implementation
[DisallowConcurrentExecution]
public class GenerateInvoicesJob(IInvoiceService invoiceService, ILogger<GenerateInvoicesJob> logger)
    : IJob
{
    public async Task Execute(IJobExecutionContext context)
    {
        logger.LogInformation("Generating invoices, triggered at {FireTime}", context.FireTimeUtc);
        await invoiceService.GenerateMonthlyAsync(context.CancellationToken);
    }
}
```

### Comparison

| | `BackgroundService` | Hangfire | Quartz.NET |
|---|---|---|---|
| **Persistent jobs** | ❌ | ✅ SQL / Redis | ✅ SQL / RAM |
| **Retry on failure** | Manual | ✅ Automatic | Manual |
| **Dashboard UI** | ❌ | ✅ Built-in | ❌ (3rd party) |
| **Cron scheduling** | ❌ | ✅ | ✅ Advanced |
| **Job chaining** | ❌ | ✅ Continuations | ✅ Job chains |
| **Clustering** | ❌ | ✅ | ✅ |
| **Best for** | Simple loops | Reliable job queues | Complex schedules |

---
