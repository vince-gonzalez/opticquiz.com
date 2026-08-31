# daltoscope-mcp

An [MCP](https://modelcontextprotocol.io) server that lets an LLM **see a color or an image the way
a colorblind person does** — it recolors PNG/JPEG for protanopia, deuteranopia, and tritanopia, and
hands the recolored image back. The *showing* counterpart to
[`hueristic-mcp`](https://www.npmjs.com/package/hueristic-mcp), which *judges* whether colors are
safe. Built on `opticquiz-cvd` (Machado, Oliveira & Fernandes 2009). Runs locally over stdio;
nothing leaves your machine.

## Tools
- **simulateColor** — `{ color, type, severity? }` → how one hex color appears under a deficiency.
- **compareVision** — `{ color, severity? }` → that color under protan, deutan, and tritan at once.
- **simulateImage** — `{ path?, dataUri?, type?, severity? }` → the image recolored the way the
  chosen deficiency renders it, returned as an image. Reads PNG and JPEG.

## Add it to Claude Desktop
Edit `claude_desktop_config.json` (Settings → Developer → Edit Config) and add:
```json
{
  "mcpServers": {
    "daltoscope": {
      "command": "npx",
      "args": ["-y", "daltoscope-mcp"]
    }
  }
}
```
Restart Claude Desktop. Then ask, e.g., *"Show me ./dashboard.png the way a deuteranope sees it,"*
or *"What does #d7191c look like to someone with each kind of colorblindness?"* — and it calls the
tools. Same config shape works in Cursor and other MCP clients.

## Note
A simulation for design and communication, not a clinical diagnosis, and no on-screen rendering is
exact for a given individual. Method: Machado, Oliveira & Fernandes (2009) —
https://doi.org/10.5281/zenodo.21310578
