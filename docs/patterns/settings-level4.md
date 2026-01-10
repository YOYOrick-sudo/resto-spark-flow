# Settings Level 4 Pattern

## When to Use (Recommended)

Apply TitleHelp + SettingsInsightPanel when:
- Calculable operational impact exists
- Risk of misconfiguration
- Dependencies between settings

Otherwise: TitleHelp only, no aside.

## Hard Caps

| Section | Max | Content |
|---------|-----|---------|
| Operationeel | 4 | Metrics (label + value + unit) |
| Signalen | 1 OK + 1 warning/error | Status checks |
| Context | 2 | Factual observations only |

Panel is read-only.

## TitleHelp Reference Rule

Only reference "panel rechts" if aside is provided.

## Check Logic Pattern

```typescript
// OK: only when base config is healthy
const okCheck: HealthCheck | null = condition
  ? { status: "ok", message: "..." }
  : null;

// Risk: single highest priority issue
let riskCheck: HealthCheck | null = null;
if (errorCondition) {
  riskCheck = { status: "error", message: "..." };
} else if (warningCondition) {
  riskCheck = { status: "warning", message: "..." };
}

const checks = [okCheck, riskCheck].filter(Boolean);
```
