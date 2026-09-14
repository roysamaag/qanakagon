---
name: Expo query decoding compatibility
description: Compatibility constraint for remediating decode-uri-component under Expo Router's query-string dependency.
---

While Expo Router resolves `query-string` 7, a secure `decode-uri-component` replacement must preserve the CommonJS callable export expected by that consumer.

**Why:** The secure upstream release is ESM-only. Forcing it directly through a dependency override makes `query-string.parse()` fail at runtime even though dependency audits and Expo bundle builds pass.

**How to apply:** After changing URI-decoding or Expo Router dependencies, test encoded query parsing through the actual `query-string` instance resolved from Expo Router, not only through a direct package import.