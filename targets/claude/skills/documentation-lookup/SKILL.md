---
name: documentation-lookup
description: Resolve version-specific library, framework, and API behavior from installed dependencies and primary documentation, using Context7 or provider docs tools when available.
---

# Documentation lookup

1. Identify the actual dependency and version from lockfiles, manifests, installed types, or runtime output. Distinguish the version in use from the latest release.
2. Discover available documentation tools. For Context7, resolve the library ID before querying its docs; select the relevant version when supported. Use a provider's official documentation tool for that provider where available.
3. Ask a narrow API or behavior question. Send public package names and a minimal sanitized example, not private source, credentials, or the user's entire request.
4. If tools are unavailable or their coverage is unclear, open official versioned docs, upstream source, release notes, or specifications. Search snippets alone do not establish an API contract.
5. Record the source URL, version, and the behavior it supports. Check deprecations and migration differences. Verify the proposed call against local types or a small meaningful test.

Do not fabricate a Context7 ID or assume tool names are identical across runtimes. If only newer docs exist, state the mismatch and verify against installed code. Use this for decisions that depend on current behavior, not every incidental framework mention.
