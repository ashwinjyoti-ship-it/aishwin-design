# Context

## Scope
- Stabilize “+ New” editor hydration in Skills and Design Systems.
- Improve BYOK save feedback and save reliability in Settings.

## Changes
- `SkillsManager.tsx`: draft `useEffect` depends on `rows` + `selectedId`.
- `DesignSystemsManager.tsx`: same dependency fix.
- `SettingsForm.tsx`:
  - Added `saveState` (`idle|saved|error`) and per-provider status labels.
  - Added success/error text near Save.
  - Added `credentials: "include"` to settings PATCH request.

## Conflict note
- Most likely conflict area: `src/components/SettingsForm.tsx` (same `save()` block and nearby UI touched by multiple branches).
- Why conflicts happen: Git cannot auto-merge when two branches edit overlapping lines/hunks in the same file region.
- Resolution rule used: keep both functional fixes together (save-state UX + authenticated PATCH request) in one final `save()` implementation.

## Validation
- `npm run -s build` passed.
