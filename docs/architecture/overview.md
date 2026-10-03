# Architecture: System Overview & C4 Model

## 1. System Context Diagram (Level 1)
Describes how users and external systems interact with the Rise Up Roofing platform.

```mermaid
graph TD
    Staff["Staff & Field Technicians<br/>(Estimators, Project Managers, Admins)"]
    Customer["Homeowners & Property Owners<br/>(Customers)"]
    
    subgraph Rise Up Digital Platform
        CRM["Rise Up CRM Portal<br/>(React 19 SPA)"]
        Web["Rise Up Public Website<br/>(Next.js 16)"]
        API["Core API & Domain Engine<br/>(FastAPI Backend)"]
    end
    
    EmailGateway["Resend Transactional Email"]
    S3Storage["MinIO / AWS S3 Storage"]
    GoogleAPI["Google Calendar & Reviews"]
    YelpAPI["Yelp Business API"]
    Turnstile["Cloudflare Turnstile"]

    Staff -->|Authenticates via HttpOnly Cookie| CRM
    Customer -->|Browses, Requests Quotes| Web
    Customer -->|Signs Contracts, Approves Proposals| CRM
    
    CRM -->|REST API + CSRF| API
    Web -->|Public REST + API Key| API
    Web -->|Bot Verification| Turnstile
    
    API -->|Sends Proposals & Contracts| EmailGateway
    API -->|Stores Uploads & PDFs| S3Storage
    API -->|Syncs Appointments| GoogleAPI
    API -->|Pulls Customer Reviews| YelpAPI
```

---

## 2. Container Diagram (Level 2)
Describes the high-level technical building blocks that make up the platform.

```mermaid
graph TD
    subgraph Client Tier
        CRMApp["CRM Web App<br/>(React 19, TypeScript, Vite)"]
        WebPortal["Public Web Portal<br/>(Next.js 16, SSR/SSG)"]
    end

    subgraph Service Tier
        APIContainer["FastAPI Application Server<br/>(Python 3.12, Uvicorn, Non-root)"]
        WorkerContainer["ARQ Background Worker<br/>(Python 3.12, Chromium Sandbox)"]
    end

    subgraph Data Tier
        PostgresDB[("PostgreSQL 16 Database<br/>(Relational schema, JSONB, Audit Logs)")]
        RedisStore[("Redis 7 In-Memory Store<br/>(Session Cache, Rate Limits, Job Queue)")]
        MinIOStore[("Object Storage Bucket<br/>(Private Document & Media Buckets)")]
    end

    CRMApp -->|HTTPS /api| APIContainer
    WebPortal -->|HTTPS /api| APIContainer
    
    APIContainer -->|AsyncPG Connection Pool| PostgresDB
    APIContainer -->|Redis Commands| RedisStore
    APIContainer -->|Boto3 / AioBoto3| MinIOStore
    
    APIContainer -.->|Enqueues Jobs| RedisStore
    RedisStore -.->|Pulls Tasks| WorkerContainer
    WorkerContainer -->|Updates State| PostgresDB
    WorkerContainer -->|Uploads Rendered PDFs| MinIOStore
```

---

## 3. Security Boundaries & Trust Zones
1. **Public Zone (Untrusted):** Internet traffic originating from browsers or external webhooks. All input is strictly validated via Pydantic schemas; Cloudflare Turnstile blocks automated submission attacks.
2. **DMZ (Reverse Proxy):** Cloudflare / Nginx terminates TLS, verifies SSL certificates, applies DDoS protection, and forwards clean requests with `X-Forwarded-For` and `X-Request-Id`.
3. **Internal Application Zone:** FastAPI application and ARQ workers operate in isolated container runtimes. API keys are authenticated via constant-time hashes; staff sessions are verified via Redis and PostgreSQL.
4. **Data Isolation Zone:** PostgreSQL and Redis containers do not publish ports to the public internet. Access is restricted to the internal Docker bridge network.
