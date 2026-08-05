@echo off
REM Build the shippable Windows binary and put it in ONE predictable place.
REM
REM Without this you get three OpticQuizCorrector.exe files across four folders -
REM bin\Debug, bin\Release\win-x64, and bin\Release\win-x64\publish - and only the
REM last one is the self-contained build that runs on a machine without .NET.
REM Picking the wrong one ships something that fails to start for most people.
REM
REM Output:  desktop-app\dist\OpticQuizCorrector.exe   (~65 MB, no prerequisites)

setlocal
cd /d "%~dp0"

echo Building self-contained, single-file, compressed...
dotnet publish -c Release -r win-x64 --self-contained true ^
  -p:PublishSingleFile=true -p:EnableCompressionInSingleFile=true
if errorlevel 1 goto :fail

if not exist dist mkdir dist
copy /Y "bin\Release\net8.0-windows\win-x64\publish\OpticQuizCorrector.exe" "dist\OpticQuizCorrector.exe" >nul
if errorlevel 1 goto :fail

for %%A in ("dist\OpticQuizCorrector.exe") do set SZ=%%~zA
set /a MB=%SZ%/1048576
echo.
echo   Ready:  %CD%\dist\OpticQuizCorrector.exe   (%MB% MB)
echo.
echo   Release it with:
echo     gh release create v1.1.0-desktop "%CD%\dist\OpticQuizCorrector.exe" ^
--repo zengineco/opticquiz.com --title "OpticQuiz Corrector 1.1.0 (Windows)"
echo.
goto :eof

:fail
echo.
echo   BUILD FAILED - nothing copied to dist\, so nothing stale can be released by mistake.
exit /b 1
