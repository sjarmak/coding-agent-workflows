# Durable research adapter

This bundle provides the operating contract, not a Temporal Worker, service, credentials, or private research backend. Use a deployment's installed client and request schema. If absent, use `deep-research` synchronously and state that the work is not durable.

## Preflight and start

1. Locate the deployment's documentation, client, request schema, and health command. Verify the service, namespace/task queue, Worker, evidence providers, and artifact destination. Do not start a development service implicitly.
2. Validate the request against that schema: research question, corpus/providers, evidence criteria, budgets, output location, and idempotency/run identity. Keep secrets out of requests and reports.
3. Start via the documented client. Capture workflow ID, run ID, status URL when supplied, request digest, and artifact location. A process launch alone does not establish that the workflow was accepted.

## Inspect and resume

Use the deployment's status/query interface with the recorded IDs. Prefer notifications or bounded status checks over a foreground loop. Distinguish queued, running, retrying, blocked on dependencies, failed, canceled, and complete. Reattach to the same execution after caller failure; do not start duplicates to recover a lost terminal.

The durable engine owns state transitions and retries. Network calls, model requests, clocks, and artifact writes belong in Activities or the backend's equivalent, not nondeterministic workflow code. Provider failures must remain observable; retries need bounded policies and idempotent side effects.

## Retrieve and verify

Fetch the report and provenance manifest only after the backend reports completion. Check request/run identity, artifact completeness, citation resolvability, full-text coverage, and documented failures. State partial results explicitly. Cancellation, restart, publication, and changing budgets are separate actions governed by the user's request; a disconnected client does not cancel the run.
