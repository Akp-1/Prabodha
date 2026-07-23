Copyright (c) 2026 Ayush Kumar Prem. All rights reserved.

This source code is proprietary. No part of it may be copied, modified,
distributed, or used to build a competing product without explicit written
permission from the owner.

---

**A note for contributors:** this is currently a placeholder license, not a
final decision. Since Prabodha is intended as a commercial SaaS product,
plain MIT/Apache (which would let anyone relaunch it as a competing product)
probably isn't the right fit — but a fully closed repo makes external
contribution awkward too.

Worth deciding before the repo gets many outside contributors:

- **Stay closed / private repo** — simplest, but limits outside contributors
  to people you invite directly.
- **BUSL (Business Source License)** — source is visible and contributors
  can submit PRs, but competitors can't run it as a commercial service
  until a set future date, after which it converts to a fully open license
  (e.g. Apache 2.0). This is what companies like Sentry, CockroachDB, and
  HashiCorp use for exactly this situation.
- **Open core** — the core platform (this repo) is open source (MIT), and a
  separate private repo holds paid-only features (e.g. advanced analytics,
  multi-campus support from the "Future Scope" list in the README).

Update this file once you've picked one — happy to help draft the actual
license text for whichever direction you go.
