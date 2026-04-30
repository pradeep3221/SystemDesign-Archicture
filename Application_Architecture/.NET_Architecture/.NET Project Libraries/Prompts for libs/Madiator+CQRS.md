https://www.gitreverse.com/Atherio-Ltd/Kommand

Here’s your **refined master prompt** 👇

---

# 🧠 MASTER PROMPT: Build a Modern .NET Mediator + CQRS Library

## 🎯 Objective

Design and implement a **high-performance, production-ready in-process mediator library for .NET** that:

* Implements the mediator pattern (similar to MediatR but not a clone)
* Supports both:

  * Generic request/response messaging
  * Explicit CQRS (Commands, Queries, Notifications)  (similar to Kommand but not a clone)
* Has **zero external runtime dependencies** beyond Microsoft.Extensions abstractions
* Is optimized for:

  * Performance (low allocations, minimal reflection)
  * Observability (tracing + metrics built-in)
  * Extensibility (pipelines/interceptors)

---

# 🧱 Solution Structure

Create a multi-project solution:

```id="qkz9a2"
/src
  /Core.Contracts
  /Core.Mediator
/samples
  /SampleApi
/tests
  /Core.Tests
/benchmarks
  /Core.Benchmarks
```

---

# 📦 1. Core.Contracts (Zero Dependency Package)

### Requirements

* Target: `netstandard2.0`
* No external dependencies

---

## 🧩 Messaging Contracts

```csharp
IRequest
IRequest<TResponse>
INotification
IStreamRequest<TResponse>
```

---

## 🧩 CQRS Contracts

```csharp
ICommand
ICommand<TResponse>
IQuery<TResponse>
```

---

## 🧩 Shared Types

```csharp
readonly struct Unit
```

---

# ⚙️ 2. Core.Mediator (Main Implementation)

### Dependencies

* Microsoft.Extensions.DependencyInjection.Abstractions
* Microsoft.Extensions.Logging.Abstractions
* System.Diagnostics.DiagnosticSource

---

# 🧩 Core Interfaces

```csharp
IMediator
ISender
IPublisher
```

---

## 🎯 Methods

```csharp
Task<TResponse> Send<TResponse>(IRequest<TResponse>, CancellationToken)
Task Send(IRequest, CancellationToken)
Task Publish(INotification, CancellationToken)
IAsyncEnumerable<TResponse> CreateStream<TResponse>(IStreamRequest<TResponse>, CancellationToken)
```

Also support dynamic dispatch:

```csharp
Task<object?> Send(object request)
```

---

# ⚡ Performance Design (Critical)

### MUST IMPLEMENT

* Cache handler delegates using:

```csharp
ConcurrentDictionary<Type, object>
```

* Use:

  * Expression trees OR compiled delegates
  * Avoid reflection in hot path

* First call may use reflection, all subsequent calls must be fast

---

# 🔄 Pipeline / Interceptor Model

### Interfaces

```csharp
IPipelineBehavior<TRequest, TResponse>
IStreamPipelineBehavior<TRequest, TResponse>
```

---

## Rules

* First registered = outermost
* Compose using functional chaining
* Behaviors can:

  * modify request/response
  * short-circuit execution

---

# 🔌 Built-in Pipeline Behaviors

---

## Pre/Post Processing

```csharp
IRequestPreProcessor<TRequest>
IRequestPostProcessor<TRequest, TResponse>
```

---

## Exception Handling

```csharp
IRequestExceptionHandler<TRequest, TResponse, TException>
IRequestExceptionAction<TRequest, TException>
```

---

## Requirements

* Use `ExceptionDispatchInfo` for rethrow
* Support:

  * handled exceptions → return response
  * unhandled → preserve stack trace

---

# 📣 Notification Publishing

---

## Strategies

### 1. Sequential (default)

* Execute handlers one-by-one
* Stop on first exception

### 2. Parallel

* Use `Task.WhenAll`
* Aggregate exceptions

---

## Requirements

* Strategy must be configurable via DI

---

# 🔍 Handler Resolution

---

## Rules

* Exactly ONE handler for:

  * requests
  * streams

* ZERO or more handlers for:

  * notifications

---

## Behavior

* If no request handler:

  ```csharp
  throw new InvalidOperationException(...)
  ```

* If no notification handlers:

  * succeed silently

---

# 🧠 Notification Handler Deduplication

* Deduplicate by **concrete type only**
* Do NOT attempt inheritance override detection

---

# 📦 Dependency Injection

---

## Extension Method

```csharp
IServiceCollection AddMediator(Action<Options>)
```

---

## Features

* Scan assemblies
* Register:

  * handlers
  * behaviors
  * processors

---

## Rules

* Only public, non-abstract classes
* Cache scan results per assembly
* Configurable:

  * handler lifetime (default: Transient)

---

# 🔐 Licensing (Lightweight, Non-blocking)

---

## Requirements

* Validate license **once at startup**
* Store result in static state

---

## Behavior

* If invalid license:

  * log warning using category:

```
LuckyPennySoftware.Mediator.License
```

---

## Notes

* JWT parsing allowed
* Signature validation can be stubbed
* MUST NOT run validation in hot path

---

# 📊 Observability (First-Class)

---

## Tracing (ActivitySource)

* Operation name:

  ```
  {RequestType}.{RequestName}
  ```

---

## Tags

* request.type (Command / Query / Notification)
* request.name
* response.type
* handler.type

---

## On Exception

* Record:

  * exception type
  * message
  * stack trace

---

## Metrics (Meter API)

Create:

* Counter → total requests
* Counter → failed requests
* Histogram → duration (ms)

---

# 🧭 CQRS Layer (Built into Mediator)

---

## Interfaces

```csharp
ICommand
ICommand<TResponse>
IQuery<TResponse>
INotification
```

---

## Mediator Methods

```csharp
Task<TResponse> SendAsync(ICommand<TResponse>)
Task SendAsync(ICommand)
Task<TResponse> QueryAsync(IQuery<TResponse>)
Task PublishAsync(INotification)
```

---

# 🔌 Interceptor Model (CQRS-specific)

---

## Interfaces

```csharp
IInterceptor
ICommandInterceptor
IQueryInterceptor
```

---

## Rules

* First registered = outermost
* Interceptors receive:

```csharp
Task<TResponse> Handle(TRequest request, RequestHandlerDelegate next)
```

* Can short-circuit

---

# 🔧 Built-in Interceptors

---

## 1. ActivityInterceptor (Singleton)

* Creates tracing spans
* Adds tags

---

## 2. MetricsInterceptor (Singleton)

* Records:

  * total requests
  * failures
  * duration

---

## 3. ValidationInterceptor (Optional)

Enable via:

```csharp
options.WithValidation()
```

---

## Validators

```csharp
IValidator<T>
```

---

## Behavior

* Execute ALL validators
* Run in parallel where safe
* Collect ALL errors
* Throw:

```csharp
ValidationException
```

---

## Validation Error

```csharp
record ValidationError(string PropertyName, string ErrorMessage, string? ErrorCode)
```

---

# ❗ Exceptions

---

```csharp
KommandException (rename to: MediatorException)
HandlerNotFoundException
ValidationException
```

---

# 📦 DI Setup (CQRS)

---

```csharp
services.AddMediator(config => { ... })
```

---

## Features

* RegisterHandlersFromAssembly
* Cache scan results
* Default lifetimes:

  * handlers → Scoped (for CQRS safety)
  * validators → Scoped
  * interceptors → Scoped

---

# 📣 Notification Behavior

* Execute handlers sequentially
* If one fails:

  * log error
  * continue execution

---

# 🌐 Sample Application

---

## Build

ASP.NET Core Minimal API

---

## Include

* Commands
* Queries
* Notifications
* Validation examples
* Custom interceptor
* Caching interceptor (IDistributedCache)
* OpenAPI via Scalar
* Exception middleware

---

# 🧪 Testing

---

## Tools

* xUnit
* Shouldly

---

## Cover

* Request/response dispatch
* Query dispatch
* Notification behavior
* Pipeline ordering
* Interceptor ordering
* Validation aggregation
* Exception handling
* Missing handler scenario
* Unit (void) command handling
* Concurrency scenarios

---

# ⚡ Benchmarks

---

## Tool

* BenchmarkDotNet

---

## Targets

| Scenario        | Target  |
| --------------- | ------- |
| Warm request    | < 10 µs |
| Cached delegate | < 5 µs  |

---

# ⚙️ Technical Constraints

* Target:

  * netstandard2.0
  * net462
  * net8.0+
* Enable nullable reference types
* Minimize allocations
* Avoid reflection in hot path

---

# 🧠 Non-Goals

* No message broker
* No distributed messaging
* No UI
* No heavy frameworks

---

# 🏁 Output Expectations

Generate:

* Full source code
* Project files (.csproj)
* DI extensions
* Unit tests
* Benchmarks
* Sample API

---

# 💡 Optional Enhancements

* Source generators for handler registration
* Roslyn analyzer for missing handlers
* Transaction pipeline behavior
* Retry policies

---

If you want next step, I can:

* Convert this into a **phased implementation plan (Day 1 → Day 5 build)**
* Or generate a **working minimal core (Mediator + pipeline + DI) you can extend**
