---
name: Fixed gameplay keyboard layout
description: Why keyboard adjustment must not be mounted globally for the timed challenge screen.
---

Keep keyboard avoidance scoped to screens that need it. The timed challenge screen is intentionally fixed and compact, with its controls positioned above the iPhone number keyboard.

**Why:** A global keyboard controller shifted the entire gameplay area whenever the number pad opened, even after scrolling and local keyboard-avoidance behavior were removed.

**How to apply:** Do not wrap the application root in a keyboard-adjusting provider. If another screen needs keyboard avoidance, add it only within that screen and confirm the challenge screen remains stationary.