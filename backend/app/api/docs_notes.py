"""
Developer Documentation Notes and OpenAPI Schema Enhancements.
Provides easy-to-understand guides, frontend SDK snippets, scope catalogs, and roofing domain logic.
"""

DOCS_DESCRIPTION = r"""
# 🚀 Rise Up Roofing Developer Platform & API Documentation

Welcome to the Rise Up Roofing backend developer hub. This platform allows **any frontend** (Next.js web apps, mobile apps, field crew tablets, and external partner systems) to seamlessly integrate with our high-performance roofing engine.

---

## ⚡ 1. Quickstart: Authenticating Any Frontend

Every frontend connects dynamically using an **API Key** created in the [Developer Dashboard](/developer).

### How to send your API Key:
Include your key in the `X-API-Key` header with every HTTP request:
```http
GET /api/estimator/config HTTP/1.1
Host: backend.riseuprac.com
X-API-Key: rup_live_abcdef123456...
```
*(You can also use standard `Authorization: Bearer rup_live_...`)*

---

## 💻 2. Frontend Code Examples

### Next.js 14 / 15 / 16 (App Router Server Component)
```typescript
// app/lib/api.ts
export async function fetchEstimatorConfig() {
  const res = await fetch('https://backend.riseuprac.com/api/estimator/config', {
    headers: {
      'X-API-Key': process.env.RISEUP_API_KEY!,
      'Content-Type': 'application/json',
    },
    next: { revalidate: 3600 }, // Cache for 1 hour
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}
```

### React Native / Axios
```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://backend.riseuprac.com',
  headers: {
    'X-API-Key': 'rup_live_your_api_key_here',
  },
  timeout: 10000,
});

export const calculateEstimate = (specs) => api.post('/api/estimator/calculate', specs);
```

### Python (httpx async)
```python
import httpx

async def get_pipeline_leads():
    async with httpx.AsyncClient(base_url="https://backend.riseuprac.com") as client:
        resp = await client.get("/api/admin/pipeline", headers={"X-API-Key": "rup_live_..."})
        return resp.json()
```

### cURL
```bash
curl -X POST https://backend.riseuprac.com/api/contact \\
  -H "X-API-Key: rup_live_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "Jane Doe", "phone": "7605550199", "service": "Roof Inspection"}'
```

---

## 🔑 3. API Scopes & Access Control

When creating an API key in the [Developer Dashboard](/developer), assign one or more of the following scopes:

| Scope | Description | Allowed Endpoints |
| :--- | :--- | :--- |
| `*` | **Full Master Admin** | Complete unrestricted access across all 67 public and admin APIs |
| `public:*` | **Public Frontends** | `/api/contact`, `/api/estimate`, `/api/estimator/*`, `/api/financing/*`, `/api/proposal/*`, `/api/track` |
| `crm:read` | **Read Leads & Clients**| `GET /api/admin/leads`, `GET /api/admin/clients`, `GET /api/admin/pipeline` |
| `crm:write` | **Manage CRM** | `POST/PATCH /api/admin/leads`, `POST/PATCH /api/admin/clients`, stage transitions |
| `estimates:calculate`| **Pricing Engine** | Public & Admin roofing cost calculations and proposal generators |
| `field:*` | **Field Ops & Crew** | `/api/admin/jobs`, `/api/admin/photos`, `/api/admin/inspections`, `/api/admin/warranties` |
| `finances:read` | **Financial Reports**| `/api/admin/finances`, `/api/admin/invoices`, `/api/admin/expenses` |

---

## 📐 4. Core Roofing Domain Rules

### Instant Estimator Calculation Logic
The calculation engine (`POST /api/estimator/calculate`) computes:
1. **Base Squares**: Total roof sqft divided by 100 (`sqft / 100`).
2. **Pitch Multiplier**:
   - Flat / Low Slope (≤ 3/12): `1.05x`
   - Moderate Pitch (4/12 – 6/12): `1.15x`
   - Steep Pitch (7/12 – 9/12): `1.30x`
   - Very Steep (≥ 10/12): `1.50x`
3. **Story Multiplier**: 1 Story = `1.0x`, 2 Stories = `1.10x`, 3+ Stories = `1.25x`.
4. **Tear-Off Cost**: Adds removal & disposal per square for replacement jobs.
5. **Add-Ons**: Skylights (\$450 ea), Ridge Vents (\$18/linear ft), Gutter Guards (\$12/linear ft).
6. **Margin & Financing**: Calculates cash price vs. 0% APR 12-month promotional financing.

---

## 🛡️ 5. Standard Error Envelope & Rate Limiting

All error responses return a predictable, typed JSON format:
```json
{
  "ok": false,
  "error": "Error summary message",
  "detail": "Detailed technical explanation or validation field breakdown"
}
```

### Rate Limiting Headers
Every request includes real-time rate limit telemetry:
- `X-Process-Time`: Server response duration in milliseconds (e.g. `8.42ms`).
- `X-Request-Id`: Unique UUID4 for tracing this exact call in the [Live Debugger](/developer).
- `Retry-After`: Seconds to wait when HTTP 429 (Too Many Requests) is returned.

---

*For live system vitals, request debugging, and key management, access the [Developer Dashboard](/developer).*
"""
