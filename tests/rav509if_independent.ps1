# Independent review entry point. Capture makes no decision. Verify ONLY
# consumes the external reviewer's per-scope decisions. Run from this repo.
[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][ValidateSet('Capture','Verify')][string]$Action,
  [string]$Browser='C:\Program Files\Google\Chrome\Application\chrome.exe',
  [string]$Round='.work\qc\house-garage-wall-rav509if\round-2'
)
$ErrorActionPreference='Stop'
Set-Location (Split-Path $PSScriptRoot)
$py='.\.venv\Scripts\python.exe'
$h='build\house-garage-wall-rav509if.html'
$wall='build\house-garage-wall.html'
$old='build\house-lift-adjustable.html'
foreach($entry in @(
  @($h,'2fae5f30f6b995953eb694d044495b4c0cf09801e78fbc4bf202464f5b93cdff'),
  @($wall,'928ea25b589ae83d131ecb20ec8b70a587786279d57b8bfd63069dc050a55250'),
  @($old,'b720520c5452824116f4695f0fbc9ac2c2262437bcaabd01c1f55f066660b0a0'))){
  if((Get-FileHash $entry[0]).Hash -ne $entry[1]){throw "Unexpected bytes: $($entry[0])"}
}
$scopes=[ordered]@{
  aligned_interior='review-scope'; aligned_baths='refined-bath-review-scope'
  aligned_site='refined-site-review-scope'; aligned_details='aligned-detail-review-scope'
  aligned_access='aligned-access-review-scope'; vehicles='vehicle-review-scope'
  comparison='comparison-review-scope'; garage_wall='garage-wall-review-scope'
  rav509if='rav509if-review-scope'
}
function RunPy { & $py @args; if($LASTEXITCODE -ne 0){throw "Failed: $args"} }
if($Action -eq 'Verify'){
  foreach($n in $scopes.Keys){RunPy qc_gate.py $h "examples\house\$($scopes[$n]).json" "$Round\$n"}
  return
}
if((Test-Path $Round) -and (Get-ChildItem -Force $Round)){throw 'Capture requires a fresh round'}
RunPy tests\garage_wall_browser.py $Browser $h
foreach($p in @('garage_wall_world','garage_wall_standing','garage_wall_photos','rav509if_geometry',
                'rav509if_fit','rav509if_pads','rav509if_photos','rav509if_actuator','comparison_surface','comparison_store','hobby_shading_probe')){
  RunPy tests\alignment_probe.py $Browser $h "tests\$p.js" "$Round\$p"
}
RunPy tests\hobby_shading_check.py "$Round\hobby_shading_probe"
RunPy tests\rav509if_states.py $Browser $h "$Round\states"
RunPy tests\alignment_probe.py $Browser $wall tests\rav509if_photos.js "$Round\before-lift"
RunPy tests\alignment_probe.py $Browser $old tests\garage_wall_photos.js "$Round\before-wall"
foreach($trial in 'dacia original turn','dacia center turn','mercedes center turn','dacia center garage','mercedes center garage'){
  $a=$trial.Split(' ')
  RunPy tests\comparison_motion.py $Browser $h "$Round\$($a -join '-')" @a
}
RunPy tests\comparison_motion.py $Browser $h "$Round\mercedes-center-alternate" mercedes center turn --alternate
foreach($n in $scopes.Keys){
  if($n -in 'aligned_interior','aligned_baths','aligned_details'){
    RunPy tests\garage_wall_routes.py $Browser $h $n --evidence-dir "$Round\$n"
  }else{
    RunPy tests\walk_review.py $Browser $h --route "tests\house_$n.js" --evidence-dir "$Round\$n"
  }
}
