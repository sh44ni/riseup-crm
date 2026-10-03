# Architecture: Frontend Engineering & Design System Specification

## 1. Feature-Sliced Architecture
The CRM frontend (`crm/`) is structured with clean domain boundaries:

```
crm/src/
├── app/                  # Application root, routing tables, and global layout
├── context/              # Context providers (AuthContext, CompanyContext)
├── entities/             # Read-only domain models (Client, Lead, Contract)
├── features/             # User interaction workflows (CreateLead, SignContract)
├── components/           # Composite UI views partitioned by domain
│   ├── pipeline/         # Kanban board, deal inspector, stage mover
│   ├── contracts/        # Contract wizard, signature pad, PDF preview
│   ├── profile/          # Staff profile settings and security management
│   └── rbac/             # Role studio and permissions matrix
├── shared/               # Reusable primitives, API client, design tokens
│   ├── api/              # openapiClient, publicRoutes, typed HTTP abstraction
│   └── ui/               # Core UI kit (Modal, Field, Button, StatusBadge)
└── lib/                  # State stores, queryClient, queryKeys, logger
```

---

## 2. Data Fetching & Server State Rules

1. **All Server State via TanStack Query:**
   - No raw React `useEffect` for data fetching.
   - Every query uses a centralized key from `crm/src/lib/queryKeys.ts`.
2. **Centralized Query Keys Factory:**
   ```typescript
   export const queryKeys = {
     leads: {
       all: ['leads'] as const,
       list: (filters: Record<string, unknown>) => ['leads', 'list', filters] as const,
       detail: (id: number) => ['leads', 'detail', id] as const,
     },
   };
   ```
3. **Mutations & Optimistic Invalidation:**
   - After a mutating API call (`POST`, `PUT`, `DELETE`), use `queryClient.invalidateQueries({ queryKey: ... })` to guarantee freshness.
4. **Unified API Client:**
   - All network traffic flows through `src/lib/api.ts` or `src/shared/api/client.ts`.
   - Never call `fetch()` directly in UI components.
   - The HTTP client automatically includes `credentials: "include"` and attaches `X-CSRF-Token` headers.

---

## 3. Client State & Form Validation Rules

1. **Server State vs. Client State:**
   - Do not store server data in Zustand / Context unless it is active ephemeral UI state (e.g. active modal open state, dragged deal ID).
2. **Form Management with React Hook Form & Zod:**
   - All forms must define a strict Zod schema for runtime validation:
     ```typescript
     export const leadFormSchema = z.object({
       fullName: z.string().min(2, "Full name is required"),
       phone: z.string().regex(/^\d{10}$/, "Valid 10-digit phone required"),
       email: z.string().email("Valid email required").optional().or(z.literal("")),
     });
     ```
3. **No Untyped `any`:**
   - Every prop, state variable, and callback must have explicit TypeScript types.
   - `quality_ratchet.py` enforces a strict descending ceiling on `: any` and `<any>`.

---

## 4. UI Kit & Design Tokens

1. **Design Tokens (`crm/src/index.css`):**
   - Palette: Brand Navy (`#112D49`), Interactive Blue (`#2F9FE3`), Trust Gold (`#EAA636`), Slate Neutral surfaces.
   - All components consume semantic tokens (`bg-slate-900/60`, `text-slate-100`, `border-slate-700/60`) for visual consistency.
2. **Modal Architecture:**
   - Standard modals use `crm/src/shared/ui/Modal.tsx` or `crm/src/components/common/CrmModal.tsx`.
   - Modals support accessible keyboard escape (`Escape` key), focus trapping, and backdrop dismiss.
3. **Accessibility (a11y) Standards:**
   - Form inputs have associated `<label>` tags with matching `htmlFor` or are wrapped by `Field`.
   - Interactive icons include `aria-label` or visually hidden screen reader text.
   - CI runs automated `@axe-core/playwright` accessibility assertions with 0 serious/critical violations allowed.
