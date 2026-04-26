> [← Platform Overview — .NET 8 / 9 / 10](00-platform-overview.md)  |  [API n-Layered Architecture →](02-n-layered-architecture.md)  |  [🏠 Index](README.md)

## 2. Tiered Structure - Minimal/Basic API (Single Project) 

```
Browser / Client
      ↓
Web Server  (Blazor / React / Angular / MVC)
      ↓
API Server  (ASP.NET Core — REST / gRPC / GraphQL / Minimal API)
      ↓
Database Server  (SQL Server / PostgreSQL / MongoDB / Redis)
```

> In **cloud-native** / microservices scenarios, the API layer is orchestrated via
> **Kubernetes** + an API Gateway (YARP, Azure API Management, Nginx) and observed
> via **OpenTelemetry** + a telemetry backend (Seq, Grafana, Azure Monitor).

---
