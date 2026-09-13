---
name: Expo launch-asset cache
description: How to avoid stale app icon and splash artwork during Expo Go testing.
---

When replacing app icon or splash artwork, save the replacement under a new filename and update every Expo configuration reference rather than overwriting an image at the same path.

**Why:** Expo Go can continue serving cached launch artwork when the image contents change but its filename stays the same.

**How to apply:** Use a distinct asset filename for each replacement, update icon, splash, splash plugin, and favicon references together, then restart the Expo workflow and reopen the project in Expo Go.