# opticquiz-cvd-mcp

[![npm version](https://img.shields.io/npm/v/opticquiz-cvd-mcp)](https://www.npmjs.com/package/opticquiz-cvd-mcp)
[![npm downloads](https://img.shields.io/npm/dm/opticquiz-cvd-mcp)](https://www.npmjs.com/package/opticquiz-cvd-mcp)

An [MCP](https://modelcontextprotocol.io) server that lets an LLM call the OpticQuiz **color-accessibility engine** as native tools. Built on `opticquiz-cvd` (Machado 2009 + CIEDE2000). Runs locally over stdio; nothing leaves your machine.

## Tools
- **checkPalette** — `{ colors: string[] }` → whether the palette stays distinguishable under protan/deutan/tritan, with the conflicting pairs.
- **checkImage** — `{ path?, dataUri?, maxColors?, returnSimulated? }` → extracts an image's dominant colors and flags the pairs that collapse under colorblindness, each weighted by how much of the image's area they cover. Reads PNG and JPEG. With `returnSimulated: true` it also hands back the image recolored as a deuteranope sees it.
- **fixPalette** — `{ colors: string[] }` → an adjusted, colorblind-safe palette that stays near the originals, with how far each color moved.
- **checkContrast** — `{ foreground, background, large? }` → the WCAG contrast ratio and whether it passes AA/AAA.
- **simulateColor** — `{ color, type }` → how a color appears under a given deficiency.

## Add it to Claude Desktop
Edit `claude_desktop_config.json` (Settings → Developer → Edit Config) and add:
```json
{
  "mcpServers": {
    "opticquiz-cvd": {
      "command": "npx",
      "args": ["-y", "opticquiz-cvd-mcp"]
    }
  }
}
```
Restart Claude Desktop. Then ask, e.g., *"Is this palette colorblind-safe: #d7191c, #1a9641, #2166ac? If not, fix it."* — or *"Is the chart at ./dashboard.png readable for colorblind users?"* — and it calls the tools. Same config shape works in Cursor and other MCP clients.

## Upgrading from 1.x
2.0.0 renames the tools to camelCase to match the underlying `opticquiz-cvd` engine: `check_palette → checkPalette`, `simulate_color → simulateColor`, `fix_palette → fixPalette`, `check_contrast → checkContrast`. No config change is needed — the config names the server, not the tools — but any saved prompt that referred to a tool by its old name should use the new one. `checkImage` is new in 2.0.0.

## Note
A screening aid, not a legal accessibility (ADA/WCAG) audit. Methods: Machado, Oliveira & Fernandes (2009); Brettel, Viénot & Mollon (1997); CIEDE2000 — https://doi.org/10.5281/zenodo.21310578
