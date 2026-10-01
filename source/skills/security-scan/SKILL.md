---
name: security-scan
description: Audit agent configuration, hooks, tool permissions, and MCP integrations for credential exposure, unsafe execution, and instruction-boundary failures.
---

# Agent configuration security scan

Inspect the current runtime's instruction files, settings, hooks, agent roles, tool definitions, and MCP configuration. Read only the needed configuration and avoid printing secret values. The `security-review` skill covers application code; this skill covers the agent's execution surface.

Trace actual paths from untrusted content to tool execution:

- Shell interpolation and repository-controlled hook arguments.
- Instructions loaded from downloaded pages, transcripts, generated files, and tool output.
- Broad allowlists, unsandboxed execution, writable trusted configuration, and auto-run installers.
- Hardcoded credentials, secret-bearing URLs, logged environment variables, and outbound content destinations.
- Unpinned tool packages, unexpected executable paths, and missing failure propagation.

If a vetted AgentShield installation is available, inspect its version/help and run its read-only scan against the intended configuration directory. Do not use `npx` as a claim that no software is being installed or auto-approve its fixes. Other runtimes may require a manual review or a different scanner.

Verify findings against reachable behavior; distinguish an executable issue from a sample or inactive config. Report file, trigger, impact, severity, and concrete remediation. Test the changed boundary with a harmless adversarial fixture where practical. Keep secret values out of findings and use the repository's incident process for actual exposure. Missing scanner access does not prevent a manual audit and must not be reported as a passing scan.
