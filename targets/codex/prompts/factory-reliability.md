# Factory Reliability

A software factory is a distributed system whose workers are nondeterministic.
That is allowed. The factory still has to be deterministic about exactly three
things: **which work exists**, **who may write**, and **which effects
happened**. Every boundary below is a place one of those three quietly stops
being true.

Apply the boundaries below to the repository's own contracts, drills, simulator, or equivalent verification tools. If those artifacts do not exist, state the missing evidence and instantiate only the checks the system can support.

## Two properties that move in opposite directions

Conflating them is behind most duplicate-effect incidents in the evidence base.

- **Work identity survives executors.** A logical work item needs an identity
  that outlives any process, so a retry converges on the same work instead of
  forking it.
- **Authority dies with its generation.** An executor's right to write must
  expire when it is replaced, so a late writer cannot land an effect after
  someone else already did.

A design that gives the retry a fresh identity duplicates work. A design that
lets identity carry authority lets a zombie publish.

## The failure boundaries

Each row is a drill in `drills/<name>/DRILL.md`, stated as a question with a
pass condition and a required **unsafe negative control**. Use the drill names
as the vocabulary — a parallel local taxonomy fragments something that already
exists and is executable.

| Boundary | The question it asks | Holds it |
| --- | --- | --- |
| `effect-commits-ack-is-lost` | Destination commits, worker dies before recording completion, retry begins. One physical effect, or two? | `effect-identity`, `explicit-unknown-state`, `durable-intent` |
| `stale-writer-completes` | Gen 7 loses its lease, gen 8 publishes, gen 7 returns late and writes. Rejected at the destination, naming gen 7 as stale? | `fenced-authority` |
| `worker-dies-agent-survives` | Worker dies before any checkpoint; the agent session it started is still running. Does retry attach, or launch a second one? | `stable-work-identity`, `start-or-attach` |
| `event-is-lost` | The notification is dropped in transit. Does a level-triggered pass observe current state and finish the transition anyway? | `reconciliation` |
| `artifact-changes-after-verification` | A passes verification; the mutable ref moves to B; publication reads the ref. Can B ride A's verdict? | `verify-before-publish` |
| `repository-base-moves` | Work is produced against R1, R2 lands, the worker publishes from R1. Detected and given a disposition, or silent? | `verify-before-publish`, `cross-repo-campaigns` |
| `campaign-coverage-drifts` | A target appears after discovery ran. Does completion re-run discovery, or does all-children-finished close a coverage hole? | `cross-repo-campaigns`, `reconciliation` |
| `retry-storm` | A shared dependency recovers at reduced capacity and everything retries at once. Bounded and dispersed? | `topology-aware-scheduling` |

`effect-commits-ack-is-lost`, `event-is-lost`, `stale-writer-completes`, and
`worker-dies-agent-survives` run against the in-memory simulator today. The
other four are specifications you instantiate against your own factory.

Two invariants worth stating outright because they get argued back into
existence: the interval between a destination committing and the caller
recording that commit **cannot be closed by any delivery mechanism** — safety
comes from an effect identity that crosses into the destination, not from a
better queue. And a worker's completion report is **testimony, not evidence**;
it comes from the same context that may already be wrong, so it cannot verify
itself (`verify-before-publish`).

## The evidence ladder

Every guarantee carries exactly one state. Say which one, always.

- **declared** — the contract names the promise and the boundary it holds at.
  Nothing checks it. Still worth having: a named promise can be falsified.
- **enforced** — a mechanism *at the named boundary* rejects violations, and
  you can point at it. Enforcement at the wrong layer does not count; a
  caller-side check does not enforce a destination-side promise.
- **fault-tested** — a drill injected the specific fault, **the unsafe control
  violated the oracle**, the protected run passed, and both runs' evidence is
  retained. An unsafe arm that passes means the harness is suppressing the
  effect or misplacing the fault; that is a broken drill, not a safe system.

**Do not compute an aggregate.** Nine fault-tested guarantees and one
declared-only guarantee on the merge path is not ninety percent safe; it is
unsafe at the merge path, and the mean hides the only number that matters.
Safety is set by the weakest external-mutation boundary. Aggregates also
redirect effort toward raising the count while hiding whether the critical
mutation paths were actually exercised.

## Working the skill

1. **Name the boundary** from the table before proposing a mechanism. If the
   concern does not map to a row, say so explicitly rather than stretching one.
2. **Locate the enforcement point.** Name the component that rejects the
   violation and the layer it sits at. "We retry" and "we log it" are not
   enforcement.
3. **State the evidence state** of each guarantee under discussion, using the
   three words above. An unlabelled guarantee is `declared`.
4. **Check the contract** when one exists using the repository's documented
   validation and review commands. Cite stable rule IDs when the checker
   provides them. **Read the output, not only the exit code**: some review
   tools print failures while returning success.
5. **Run the drill in both modes** when raising a guarantee to fault-tested:
   the repository's drill runner in both unsafe and protected modes, recording the expected failure and success outcomes. The unsafe run is not optional when claiming fault-tested evidence.

Done when: every guarantee raised in the discussion has a named boundary, a
named enforcement point, and one of the three evidence words; and every claim
of `fault-tested` cites a retained unsafe-arm result.

## Boundaries with other skills

- Output quality of an agent or model, benchmark validity → `agent-eval-design`.
- One repository's structure and dependency graph → `repo-architecture-review`.
- Bounded procedures for checking a coding-agent system (minimum reliability
  pass, authority-boundary test, recovery fault injection) → `reliability-pass`.
  That skill is the *procedure*; this one is the *vocabulary and the model*.
