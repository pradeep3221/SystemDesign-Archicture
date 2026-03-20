# SAGA Pattern Visualizer — Prompt Reference

> Use this prompt in any Claude conversation to regenerate the interactive SAGA Pattern widget.

---

## Prompt

Build an interactive **SAGA Pattern** visualizer as a dark-themed HTML widget with the following specs:
OR
Explain Saga pattern, I am a visual learner, make me understand visually and interactively, Architected interactive visualization with tabbed interface and animations
Or
Learn something topic on AI assitanse 
  Give topic and say "make me understand this interactively"
    I am a visual learner, make me understand visually and interactively

     Reference: https://www.facebook.com/reel/903412645347431 --> SAGA pattern #hungrycoders  


---

### Design

- Dark background `#1a1a2e`, card panels `#0f0f1a`, service boxes `#16213e`
- Orange accent `#e07b25` for the orchestrator border and Play button
- Amber `#f39c12` for compensation states, green `#27ae60` for success, blue `#3498db` for running, red `#e74c3c` for failed
- `.NET` purple badge `#512bd4` next to the title

---

### Tabs & Controls

- Two mode tabs: **Orchestration** / **Choreography**
- **Legend** row showing colored dots for: Success, Running, Failed, Compensating
- **Inject failure at:** dropdown with options:
  - No failure (happy path)
  - Order Service
  - Payment Service
  - Inventory Service
  - Shipping Service
- **Play** and **Reset** buttons
- Progress bar showing `Step X / 8`
- Scrollable transaction log with color-coded entries:
  - 🔵 Blue = info
  - 🟢 Green = success
  - 🔴 Red = error
  - 🟡 Amber = warn
- **Show .NET Code** toggle that reveals C# syntax-highlighted code (VS Code dark theme colors)

---

### 4 Services

Displayed as cards with: icon, name, status line, event line.

| Icon | Service | Action | Event | Compensate | Compensation Event |
|------|---------|--------|-------|------------|--------------------|
| 🛒 | Order | Create order | `ORDER_CREATED` | Cancel order | `ORDER_CANCELLED` |
| 💳 | Payment | Charge card | `PAYMENT_DONE` | Refund card | `PAYMENT_REFUNDED` |
| 📦 | Inventory | Reserve stock | `STOCK_RESERVED` | Release stock | `STOCK_RELEASED` |
| 🚚 | Shipping | Schedule delivery | `SHIP_SCHEDULED` | Cancel delivery | `DELIVERY_CANCELLED` |

---

### Animation Behavior

- **Forward flow:** each service box pulses blue (running) → turns green on success, showing action + event name
- **Failure:** the failing box turns red and shows the fail event (e.g. `↑ STOCK_FAIL`)
- **Compensation:** rolls back in reverse — each box pulses amber showing `↩ Refund card…` then settles showing:
  - Top line: `Refund card` (the compensating action)
  - Bottom line: `✓ PAYMENT_REFUNDED` in amber (the compensation event)
- **Orchestration mode:** shows a central `Order Orchestrator` node connected by a vertical line, with `done` / `compensating` state
- **Choreography mode:** shows a `📡 MassTransit / RabbitMQ` event bus with animated event pills

---

### C# Code Panels

Switch per tab:

#### Orchestration
- `OrderSagaOrchestrator` class with constructor-injected interfaces
- `async Task PlaceOrderAsync` method
- `try/catch` with compensating calls in reverse order
- Inline comments showing emitted events (e.g. `// → ORDER_CREATED`)

#### Choreography
- `IConsumer<T>` MassTransit consumers per service
- Each consumer publishes typed event objects on success
- `StockFailedConsumer` showing refund + cancel compensation
- Published compensation events (e.g. `new PaymentRefunded(...)`, `new OrderCancelled(...)`)

---

### CSS Spacing (Service Cards)

```css
.svc-row  { gap: 20px; flex-wrap: nowrap; }
.svc-box  { padding: 14px 10px 12px; max-width: 110px; border-radius: 10px; }
.svc-icon { font-size: 22px; margin-bottom: 6px; }
.svc-name { font-size: 12px; font-weight: 600; }
.svc-st   { font-size: 10px; margin-top: 4px; }
.svc-comp { font-size: 9.5px; font-weight: 600; color: #f39c12; margin-top: 3px; }
```

---

### Syntax Highlighting Colors (VS Code Dark Theme)

```
Keywords  → #569cd6  (blue)
Types     → #4ec9b0  (teal)
Strings   → #ce9178  (orange)
Comments  → #6a9955  (green, italic)
Methods   → #dcdcaa  (yellow)
Variables → #9cdcfe  (light blue)
```

---

*Generated from Claude — SAGA Pattern interactive widget conversation.*