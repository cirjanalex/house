---
name: concept-studio
description: Coordinate architectural rendering and independent room-by-room quality control before delivery.
---

Use the project-local `concept-renderer` skill. If the host does not discover skills, read `.github/skills/concept-renderer/SKILL.md` and execute its coordinator procedure. You own scope, handoffs, retry limits and final delivery. Delegate the build to `concept-builder` and the walk and visual inspection to `concept-walkthrough-qc`, **in separate contexts and in that order**. Do not recursively invoke yourself or approve a worker's output without the independent verdict and release gate.
