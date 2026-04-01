# Static Human Muscle Map (Blender) - Designer Brief

Need a semi-realistic standing human model for app display only (no animation). This is for gym users, not medical anatomy.

## 1) Character Scope
- Build two variants: male and female.
- Neutral A-pose (relaxed), symmetrical and front-oriented.
- Must look clean and readable in full 360 rotation.

## 2) Muscle Group Mapping (Locked List)
Please separate these 14 major groups clearly:
1. Chest (Pecs)
2. Shoulders (Delts)
3. Biceps
4. Triceps
5. Forearms
6. Abs/Core
7. Obliques
8. Lats
9. Upper Back/Traps
10. Lower Back
11. Glutes
12. Quads
13. Hamstrings
14. Calves

## 3) Color System (Important)
- Do NOT bake final display colors into beauty textures.
- Deliver a stable ID mask system so colors are programmable in app.
- Preferred setup: one ID map texture where each muscle group has a unique flat ID color.
- IDs must remain consistent across both male and female variants.

## 4) Visual Treatment
- Keep definition gym-friendly and general, not medical textbook detail.
- High-contrast bold default look so groups are easy to distinguish quickly.
- Clean boundaries between groups; avoid tiny micro-partitions.

## 5) Technical Targets
- Real-time optimized for mobile.
- Triangle budget per variant: 15k-30k.
- Clean topology, normals, and UVs suitable for GLB export.

## 6) Deliverables
- Source: `.blend`
- Runtime: `.glb`
- Documentation: PNG numbered legend matching the 14 locked groups and ID colors

## 7) Validation Before Handoff
- Verify every muscle group is uniquely selectable by ID.
- Verify GLB export/re-import preserves IDs and group boundaries.
- Verify appearance readability on dark background.
