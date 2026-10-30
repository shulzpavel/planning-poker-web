# Product intake dashboard

The approved dashboard is available under authenticated CMS at
`/cms/dashboards/intake`. Its navigation item is shown only when `/cms/auth/me`
returns `intake_dashboard_access: true`, and the server independently checks
all data and AI requests. Other superusers do not bypass the owner restriction.

Snapshots and reviewed AI results come from voting-service via the standard
CMS transport. The browser polls background work, retains the last successful
snapshot on transient failures, clears it on authorization failure, and
refreshes while the page is open. Charts never wait for AI. Historical speed
statistics and chart evidence are calculated server-side; the client only
formats values and draws the charts. Unknown, incomplete and error states do
not use example metrics or model templates.

Source names, Jira issue URLs, stage name and timezone are response metadata.
There is no dependency on the development prototype route, Vite middleware,
local Jira exports, local environment files or browser-held provider keys.
Only the implemented intake stage is released. The existing design system,
collapsed AI surfaces, desktop 80vw shell and responsive layout are preserved.

Validation:
- `npm run test`
- `npm run build`
- `npm run test:e2e:intake` (authenticated owner/non-owner fixtures; desktop/mobile)
- `npm run test:e2e` (existing application smoke suite)

The API and deployment settings are documented in planning-poker-dev under
`docs/contracts/PRODUCT-INTAKE.md`. Deploy the Jira adapter and voting-service
contracts before enabling the UI capability.
