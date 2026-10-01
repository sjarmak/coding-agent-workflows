# Performance Audit

Measure a user-visible journey before optimizing it. Reuse a deterministic
benchmark where possible, validate that it predicts the real journey, and
preserve behavior while removing repeated or hidden work.

For a combined hygiene and performance audit, use the
[shared ledger](../code-hygiene/LEDGER.md) with kind `perf`.

## The loop (one journey per thread)

1. **Name the journey** a person or scheduler actually waits on: a CLI
   command, an order run, a page load, a query, a test suite. Record its
   current wall-clock at a stated percentile (p50/p75) and where the number
   came from. Rank journeys by frequency x delay; start with the largest.
2. **Build or find a benchmark** that reproduces it. Prefer deterministic
   counts over timings: instruction counts (`valgrind --tool=callgrind`,
   `perf stat -e instructions`), function call counts (profiler or coverage),
   query counts and rows scanned (`EXPLAIN`, slow-query log), subprocess and
   network call counts, bytes read/written. Timings on a loaded shared machine
   are noise.
3. **Validate the benchmark** against wall-clock: a change that cuts the count
   must cut the real time too. Discard a metric that does not predict the journey, however easy it is to move.
4. **Trace, then fix the biggest bottleneck.** Propose several small,
   independently revertible changes rather than one large one. Each keeps
   its unit tests green, and those tests exist before the optimization.
5. **Confirm in the field** (logs, events, traces) after it lands. If the
   journey did not improve, revert or disable and try the next hypothesis.
6. **Ratchet the win:** commit the benchmark with a threshold or a recorded
   baseline that CI or a scheduled job checks, so a regression fails loudly.
   Wins decay in a fast-moving codebase without one.

## What to hunt (patterns that paid off)

- **The same work repeated:** one ID resolved three times, a lookup inside a
  loop, an unwindowed aggregate recomputed on every run when its answer only
  changes rarely (cache it, or compute it when the input changes).
- **Expensive checks without a cheap prefilter:** run a first-character or
  substring test before a regex; check a size or timestamp before hashing.
- **Hidden work that no load metric sees:** a leftover reload, retry, or
  poll loop firing thousands of times a day. Count calls, not just latency.
- **Encoding and representation traps:** one non-ASCII character pushing a
  whole string or buffer onto a slow path; accidental copies between types.
- **Redoing setup on every invocation:** recompiling, re-parsing config,
  re-opening connections, cold caches a warm or precomputed artifact would
  avoid.
- **Work before the user can act:** render or return the useful part first;
  prefetch on a strong intent signal (hover, the previous step finishing).
- **Re-rendering or re-processing unchanged items:** touch only what
  changed; memoize finished pieces; move heavy work off the latency path.
- **Timeouts as symptoms:** a query or call that sits near a server-side
  limit fails under load. Fix the work, then decide whether the limit is right.

## Guardrails

- **Complexity budget:** reject a speed-up whose maintenance cost outweighs
  the win. Compare the measured gain with the long-term maintenance burden.
- **Behavior first:** tests pin behavior before the change; user-visible
  changes get a before/after recording or output diff.
- **Reversible:** a flag, a config switch, or a single revertible commit per
  change. Retire flags once the win is locked.
- **Narrow threads:** one benchmark or journey per worker; the orchestrator
  sequences them and stops at diminishing returns.
- **Do not trust headless-only proof** for anything the real environment can
  change (load, concurrency, real data volume, a real terminal or browser).

## Audit mode output

A ranked list of journeys, each with: current number and its source, the
benchmark (or why none exists yet), top suspected bottleneck with evidence
(profile excerpt, call count, query plan), proposed fixes sized by risk, the
ratchet you would add, and the command that re-measures it. Do not edit code
in audit mode. Record product defects (timeouts, failures under load) as
follow-ups.
