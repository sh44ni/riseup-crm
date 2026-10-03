# Architecture: Relational Data Model & Migration Conventions

## 1. Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    USERS ||--o{ ADMIN_SESSIONS : "authenticates"
    USERS ||--o{ USER_ROLES : "assigned"
    ROLES ||--o{ USER_ROLES : "assigned"
    ROLES ||--o{ ROLE_PERMISSIONS : "authorizes"
    PERMISSIONS ||--o{ ROLE_PERMISSIONS : "grants"
    
    USERS ||--o{ LEADS : "creates / assigned"
    CLIENTS ||--o{ LEADS : "associated"
    LEADS ||--o{ ESTIMATES : "generated"
    LEADS ||--o{ CONTRACTS : "binds"
    
    USERS ||--o{ AUDIT_LOGS : "performed"
    
    USERS {
        int id PK
        string name
        string email UK
        string role
        string status
        string password_hash
        string salt
        timestamp last_login_at
        timestamp created_at
    }

    ADMIN_SESSIONS {
        int id PK
        string token UK
        int user_id FK
        string ip_address
        string user_agent
        timestamp last_seen_at
        timestamp expires_at
    }

    ROLES {
        int id PK
        string name UK
        string description
        boolean is_protected
    }

    PERMISSIONS {
        int id PK
        string key UK
        string resource
        string action
        string description
    }

    LEADS {
        int id PK
        string full_name
        string phone
        string email
        string address
        string pipeline_stage
        string status
        decimal estimated_value
        int assigned_to_user_id FK
        int client_id FK
        timestamp created_at
    }

    ESTIMATES {
        int id PK
        int lead_id FK
        decimal total_price
        decimal profit_margin
        string status
        jsonb line_items
        timestamp created_at
    }

    CONTRACTS {
        int id PK
        int lead_id FK
        string status
        string signing_token UK
        decimal contract_amount
        timestamp signed_at
        text customer_signature
    }

    AUDIT_LOGS {
        int id PK
        string action
        string resource_type
        int resource_id
        string actor_type
        string actor_id
        int user_id FK
        string ip_address
        jsonb meta
        timestamp created_at
    }
```

---

## 2. Zero-Downtime Migration Conventions (Expand / Contract)

Database schema alterations must follow the **Expand / Contract** pattern to allow zero-downtime rolling deployments:

### Phase 1: Expand (Safe Addition)
1. Add new columns as **nullable** or with a safe database default.
2. Create indexes concurrently (`CONCURRENTLY` in PostgreSQL).
3. Do not drop old columns or rename active columns in the same release.

### Phase 2: Migrate & Dual-Write
1. Update application code to read from new columns and write to both old and new columns.
2. Deploy backend and frontend application servers.

### Phase 3: Contract (Safe Deprecation)
1. Once old code is no longer running in any cluster, run a final migration to drop deprecated columns or enforce `NOT NULL` constraints.
2. Remove fallback code branches.

---

## 3. Migration Guidelines
1. **Never run migrations during application container startup:**
   - Migrations are executed as an isolated release phase command (`alembic upgrade head`) before shifting traffic.
2. **Deterministic Version Ordering:**
   - Every Alembic migration must have a clear descriptive revision ID and message.
3. **Rollback Safety:**
   - Always implement both `upgrade()` and `downgrade()` methods in Alembic version files.
