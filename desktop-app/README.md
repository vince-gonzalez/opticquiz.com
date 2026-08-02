# OpticQuiz Colorblind Corrector — Windows desktop app

A system-tray toggle that applies a real-time color **correction to the entire screen** —
every app, game, image, and the desktop itself — for a chosen type of color-vision
deficiency. It uses the Windows **Magnification API** (`MagSetFullscreenColorEffect`) fed
the OpticQuiz daltonization matrices. This is the OS-level companion to the browser
extension and the widget. Method: https://doi.org/10.5281/zenodo.21310578 · MIT.

## Build & run (Windows)
1. Install the **.NET 8 SDK** (one-time): https://dotnet.microsoft.com/download/dotnet/8.0 → ".NET 8.0 SDK", x64.
2. In a terminal, from this folder:
   ```
   dotnet run
   ```
   First run builds (a minute), then the app starts and a tray icon appears (bottom-right,
   possibly under the ^ overflow arrow).
3. **Left-click or right-click the tray icon** → pick a mode (Recommended, Deuteranopia,
   Protanopia, Tritanopia) → the whole screen corrects. **Off** restores normal colors,
   **Exit** quits.

## Make a shareable .exe
```
dotnet publish -c Release -r win-x64 --self-contained true
```
The standalone `.exe` lands in `bin\Release\net8.0-windows\win-x64\publish\` — it runs on
any Windows 10/11 machine with no .NET install needed (larger file). Drop `--self-contained true`
for a small exe that needs the .NET runtime present.

## Notes & honest limits
- **Windows 8+ only** (the Magnification full-screen color effect).
- **Turn off Windows' own Color filters** first (Settings → Accessibility → Color filters)
  so they don't conflict with this one.
- The correction is applied in the screen's sRGB space, so it's a close **approximation**
  of the linear-light browser version — visibly effective, slightly less colorimetrically
  exact. An aid, not a cure.
- It does not recolor the mouse cursor or DRM-protected video overlays.
- The tray icon is the generic app icon for now; swap in a custom eye `.ico` before shipping.
