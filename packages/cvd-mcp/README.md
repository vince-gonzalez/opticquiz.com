# opticquiz-cvd-mcp

An [MCP](https://modelcontextprotocol.io) server that lets an LLM call the OpticQuiz
colorblind-safe checker as a native tool. Built on the `opticquiz-cvd` engine
(Machado 2009 + CIEDE2000). Runs locally over stdio; nothing leaves your machine.

## Tools
- **check_palette** — `{ colors: string[] }` → whether the palette stays distinguishable under protan/deutan/tritan, with the conflicting pairs.
- **simulate_color** — `{ color: string, type: "protan"|"deutan"|"tritan" }` → how that color appears under that deficiency.

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
Restart Claude Desktop. Then ask, e.g., *"Is this palette colorblind-safe: #d7191c, #1a9641, #2166ac?"* — it calls the tool. Same config shape works in Cursor and other MCP clients.

## Note
A screening aid, not a legal accessibility (ADA/WCAG) audit. Method:
Machado, Oliveira & Fernandes (2009) + CIEDE2000 — https://doi.org/10.5281/zenodo.21310578
