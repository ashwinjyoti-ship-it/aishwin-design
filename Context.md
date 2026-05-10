# Context

## Scope
- Stabilize “+ New” editor hydration in Skills and Design Systems.
- Improve BYOK save feedback and save reliability in Settings.

## Changes
- `SkillsManager.tsx`: draft `useEffect` now depends on `rows` + `selectedId`.
- `DesignSystemsManager.tsx`: same dependency fix.
- `SettingsForm.tsx`:
  - Added `saveState` (`idle|saved|error`) and per-provider status labels.
  - Added success/error text near Save.
  - Added `credentials: "include"` to settings PATCH request (fixes auth-cookie save failures).

## Validation
- `npm run -s build` passed.
