---
name: Football provider constraints
description: External football-data.org API limits that affect current-fixture loading.
---

The football-data.org v4 matches endpoint accepts a maximum inclusive date range of 10 days, and its status filter uses `SCHEDULED`, `IN_PLAY`, `PAUSED`, and related documented values; `TIMED` is rejected.

**Why:** The provider returns HTTP 400 for an over-10-day window or an unsupported status value, which must not be mistaken for missing credentials or silently replaced with demo data.

**How to apply:** Keep rolling fixture requests within 10 calendar days and treat provider errors as explicit unavailable states. Verify the current provider documentation before expanding filters or the window.