# Courtyard House

A self-contained, interactive 3D house and garage study. Walk between two floors, open the doors and gates, change the terrace shade, or compare the clearances of two cars on a recessed scissor lift. Vehicle geometry and lift supports are illustrative, not an installation or safety assessment.

## View the site

Open `docs/index.html` directly in a modern WebGL-capable browser. All rendering code and assets are embedded; no installation, backend, API key or external CDN is needed. Use **Walk through**, WASD or the on-screen arrows, drag to look, and press Esc to return to orbit.

For **GitHub Pages**, use **Settings → Pages → Deploy from a branch → `main` / `docs`**. Only the single-file walkthrough and `.nojekyll` belong in `docs/`. Future commits to that folder update the same site.

## Rebuild

Requires Python 3.11 or newer. From the repository root in PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe render.py bootstrap
.\.venv\Scripts\python.exe build_site.py
.\.venv\Scripts\python.exe -m unittest discover -s tests
```

On macOS/Linux use `.venv/bin/python`. Bootstrap fetches the pinned Three.js package and verifies its SHA-512. The build is then offline. Intermediate pages go into the ignored `build/` directory; only the final `docs/index.html` is published. Later layers check the hashes of their input stages to prevent accidental mixing of model revisions. If you change a bound input, review the new output before updating its corresponding digest.

## Sources

- `examples/house/`: geometry, finishes, furniture, landscape, equipment, and visual-review scopes. `demo-brief.json` is a generic configuration for the bundled example, not a private user brief.
- `web/`: browser templates, materials, walking controls and interactive equipment simulations.
- Root Python modules: deterministic geometry, furnishing, site and vehicle compilation. `render.py --help` lists the independent build and local drawing-intake commands.
- `.github/skills/` and `.github/agents/`: the builder and independent visual-review workflow.
- `tests/`: geometry and export checks and optional browser-based walking and fit inspections.

The Pages build uses only the included model data. Private documents, drawing scans, reference photographs, local paths and personal project metadata are not needed. Keep any new drawing intake and local review evidence outside the publication folder and out of Git.

**Third-party assets:** the viewer contains Three.js under MIT (notice embedded). The two bundled Poly Haven texture files are CC0; their source links and checksums are recorded in `examples/house/materials.json`. Product reference links describe dimensions of schematic, original models and are not redistributed product assets.
