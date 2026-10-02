@echo off
call "%LOCALAPPDATA%\emsdk\emsdk_env.bat"
if errorlevel 1 exit /b 1
cd /d "%~dp0.."
if not exist public\cubiomes mkdir public\cubiomes
emcc -O2 -fwrapv -I vendor\cubiomes ^
  vendor\cubiomes\noise.c ^
  vendor\cubiomes\biomes.c ^
  vendor\cubiomes\layers.c ^
  vendor\cubiomes\biomenoise.c ^
  vendor\cubiomes\generator.c ^
  vendor\cubiomes\finders.c ^
  vendor\cubiomes\util.c ^
  src\tools\seed-finder\cubiomes_api.c ^
  -s MODULARIZE=1 ^
  -s EXPORT_ES6=1 ^
  -s EXPORT_NAME=createCubiomes ^
  -s SINGLE_FILE=1 ^
  -s ALLOW_MEMORY_GROWTH=1 ^
  -s ENVIRONMENT=web ^
  -s EXPORTED_RUNTIME_METHODS=UTF8ToString,HEAP32 ^
  -s EXPORTED_FUNCTIONS=_cm_apply,_cm_biomes,_cm_biome_name,_cm_structures,_cm_strongholds,_malloc,_free ^
  -o public\cubiomes\cubiomes.js
if errorlevel 1 exit /b 1
echo wrote public\cubiomes\cubiomes.js
