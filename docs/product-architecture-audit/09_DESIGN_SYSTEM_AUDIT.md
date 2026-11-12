# Design system audit

The product already has useful foundations: `packages/ui`, CSS variables in `globals.css`, Tailwind, Lucide icons, role shells, and web primitives (`PageHeader`, `DataTable`, `FilterBar`, `EmptyState`, `StatusBadge`, loading and confirmation systems). A rewrite is unnecessary.

## Confirmed inconsistencies

- Role shells use different accent identities (red admin/student, blue instructor) but individual pages also embed many direct color classes and gradients.
- Loading, errors and empty states are frequently handwritten even though shared components exist.
- Page headers, cards, filters and action placements vary across modules.
- Terms and status presentation are not governed by a single glossary/status map.
- Large pages use dense bespoke forms; team/batch/class creation should share field, section and validation patterns.
- Sidebar grouping is primarily a route list, not a consistent IA component with section labels and progressive disclosure.

## Target component contract

1. Tokens: semantic surface/text/border/action/success/warning/danger/info; role accent only where meaningful; spacing, radii, elevation, typography and focus ring scales.
2. Layout: AppShell, ContextBar, Breadcrumbs, PageHeader, DetailHeader, Tabs, SplitWorkspace.
3. Data: DataTable, FilterBar, pagination, SavedView, StatusBadge, MetricCard, Timeline.
4. Feedback: AsyncBoundary combining skeleton/error/empty/retry; toast for transient success; inline validation; destructive confirmation.
5. Forms: FormSection, Field, HelpText, ErrorSummary, sticky action bar and unsaved-change guard.
6. Accessibility: visible focus, keyboard drawers/modals/tabs, labelled controls, live regions, contrast checks, reduced motion and table alternatives on mobile.

## Governance

Document primitives with examples, forbid new hard-coded semantic colors through lint/review, add component accessibility tests, and migrate page-by-page. Begin with high-traffic shells and list/detail templates; preserve domain behavior and API contracts.
