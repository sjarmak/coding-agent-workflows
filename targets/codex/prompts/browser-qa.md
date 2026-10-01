# Browser QA — Automated Visual Testing & Interaction

## When to Use

- After deploying a feature to staging/preview
- When you need to verify UI behavior across pages
- Before shipping — confirm layouts, forms, interactions actually work
- When reviewing PRs that touch frontend code
- Accessibility audits and responsive testing

## How It Works

Use an available browser automation tool and record the browser, viewport,
revision, data state, and environment. Choose critical journeys by risk.
Use semantic locators and condition-based waits; apply `e2e-testing` when
adding durable regression coverage.

### Phase 1: Smoke Test
```
1. Navigate to target URL
2. Inspect console errors and classify product, environment, and third-party failures
3. Inspect failed requests and distinguish expected error scenarios from defects
4. Screenshot above-the-fold on desktop + mobile viewport
5. Measure available performance signals against the project budgets; state lab-measurement limits
```

### Phase 2: Interaction Test
```
1. Click every nav link — verify no dead links
2. Submit forms with valid data — verify success state
3. Submit forms with invalid data — verify error state
4. Test auth flow: login → protected page → logout
5. Test critical user journeys (checkout, onboarding, search)
```

### Phase 3: Visual Regression
```
1. Screenshot key pages at representative narrow, medium, and wide viewports
2. Compare against baseline screenshots (if stored)
3. Investigate layout shifts, missing elements, and overflow against intended behavior
4. Check dark mode if applicable
```

### Phase 4: Accessibility
```
1. Run axe-core or equivalent on each page
2. Flag WCAG AA violations (contrast, labels, focus order)
3. Verify keyboard navigation works end-to-end
4. Check screen reader landmarks
```

## Output Format

```markdown
## QA Report — [URL] — [timestamp]

### Smoke Test
- Console errors: 0 critical, 2 warnings (analytics noise)
- Network: all 200/304, no failures
- Core Web Vitals: LCP 1.2s ✓, CLS 0.02 ✓, INP 89ms ✓

### Interactions
- [✓] Nav links: 12/12 working
- [✗] Contact form: missing error state for invalid email
- [✓] Auth flow: login/logout working

### Visual
- [✗] Hero section overflows on 375px viewport
- [✓] Dark mode: all pages consistent

### Accessibility
- 2 AA violations: missing alt text on hero image, low contrast on footer links

### Verdict: SHIP WITH FIXES (2 issues, 0 blockers)
```

## Evidence and boundaries

Capture screenshots and, when available, traces and logs for failed journeys.
Distinguish product failures from unavailable environments. A screenshot match
alone does not verify interaction behavior, and an automated accessibility scan
does not replace keyboard and focus checks. Test mutations only within the
user-authorized environment and data scope.
