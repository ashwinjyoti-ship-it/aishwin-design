# Context

## Scope
- Stabilize “+ New” editor hydration in Skills and Design Systems.
- Improve BYOK save feedback in Settings.

## Changes
- `SkillsManager.tsx`: draft `useEffect` now depends on `rows` + `selectedId`.
- `DesignSystemsManager.tsx`: same dependency fix.
- `SettingsForm.tsx`:
  - Added `saveState` (`idle|saved|error`).
  - Added per-provider status (`Pending save` / `Saved`).
  - Added success/error text near Save.
  - Save response parsing is resilient to non-JSON failures.

## Why it matters
- New rows now reliably populate the right editor after refresh.
- Key saves now have explicit user feedback and clearer failure handling.

## Validation
- `npm run -s build` passed.
