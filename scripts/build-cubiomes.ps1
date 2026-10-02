$emsdk = Join-Path $env:TEMP 'emsdk'
$env:EMSDK = $emsdk
$env:EMSDK_NODE = Join-Path $emsdk 'node\24.19.0_64bit\node.exe'
$env:EMSDK_PYTHON = Join-Path $emsdk 'python\3.13.3_64bit\python.exe'
$env:PATH = "$(Join-Path $emsdk 'upstream\emscripten');$emsdk;$env:PATH"
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root
New-Item -ItemType Directory -Force -Path (Join-Path $root 'public\cubiomes') | Out-Null
& (Join-Path $emsdk 'upstream\emscripten\emcc.exe') `
  'src\tools\seed-finder\cubiomes_api.c' `
  'vendor\cubiomes\noise.c' `
  'vendor\cubiomes\biomes.c' `
  'vendor\cubiomes\layers.c' `
  'vendor\cubiomes\biomenoise.c' `
  'vendor\cubiomes\generator.c' `
  'vendor\cubiomes\finders.c' `
  'vendor\cubiomes\util.c' `
  'vendor\cubiomes\quadbase.c' `
  '-I' 'vendor\cubiomes' `
  '-O2' '-fwrapv' `
  '-s' 'MODULARIZE=1' `
  '-s' 'EXPORT_ES6=1' `
  '-s' 'EXPORT_NAME=createCubiomes' `
  '-s' 'ENVIRONMENT=web' `
  '-s' 'ALLOW_MEMORY_GROWTH=1' `
  '-s' 'SINGLE_FILE=0' `
  '-s' 'EXPORTED_FUNCTIONS=_cm_apply,_cm_biomes,_cm_biome_name,_cm_structures,_cm_strongholds,_malloc,_free' `
  '-s' 'EXPORTED_RUNTIME_METHODS=HEAP32,UTF8ToString' `
  '-o' 'public\cubiomes\cubiomes.js'
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
