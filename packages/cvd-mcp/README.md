# opticquiz-cvd-mcp

[![npm version](https://img.shields.io/npm/v/opticquiz-cvd-mcp)](https://www.npmjs.com/package/opticquiz-cvd-mcp)
[![npm downloads](https://img.shields.io/npm/dm/opticquiz-cvd-mcp)](https://www.npmjs.com/package/opticquiz-cvd-mcp)

An [MCP](https://modelcontextprotocol.io) server that lets an LLM call the OpticQuiz **color-accessibility engine** as native tools. Built on `opticquiz-cvd` (Machado 2009 + CIEDE2000). Runs locally over stdio; nothing leaves your machine.

## Tools
- **check_palette** — `{ colors: string[] }` → whether the palette stays distinguishable under protan/deutan/tritan, with the conflicting pairs.
- **fix_palette** — `{ colors: string[] }` → an adjusted, colorblind-safe palette that stays near the originals, with how far each color moved.
- **check_contrast** — `{ foreground, background, large? }` → the WCAG contrast ratio and whether it passes AA/AAA.
- **simulate_color** — `{ color, type }` → how a color appears under a given deficiency.

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
Restart Claude Desktop. Then ask, e.g., *"Is this palette colorblind-safe: #d7191c, #1a9641, #2166ac? If not, fix it."* — it calls the tools. Same config shape works in Cursor and other MCP clients.

## Note
A screening aid, not a legal accessibility (ADA/WCAG) audit. Methods: Machado, Oliveira & Fernandes (2009); Brettel, Viénot & Mollon (1997); CIEDE2000 — https://doi.org/10.5281/zenodo.21310578
