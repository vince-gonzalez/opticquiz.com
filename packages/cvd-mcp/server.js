#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import cvd from "opticquiz-cvd";

const server = new McpServer({ name: "opticquiz-cvd", version: "1.1.0" });

server.registerTool(
  "check_palette",
  {
    title: "Check a color palette for colorblind-safety",
    description:
      "Check whether a set of colors stays distinguishable for people with color-vision deficiency (colorblindness). Simulates protanopia, deuteranopia and tritanopia and flags the pairs whose perceptual difference collapses under simulation. A screening aid, not a legal accessibility (ADA/WCAG) audit.",
    inputSchema: {
      colors: z
        .array(z.string())
        .describe('Hex colors to check together, e.g. ["#d7191c","#1a9641","#2166ac"]')
    }
  },
  async ({ colors }) => {
    const r = cvd.checkPalette(colors);
    const lines = [r.pass ? "PASS - colorblind-safe." : "FAIL - color conflicts found."];
    for (const t of ["protan", "deutan", "tritan"]) {
      const c = r.types[t].conflicts;
      if (c.length)
        lines.push(`${t}: ` + c.map((x) => `${x.a}/${x.b} (delta ${x.normal}->${x.sim}, ${x.severity})`).join("; "));
    }
    return { content: [{ type: "text", text: lines.join("\n") + "\n\n" + JSON.stringify(r) }] };
  }
);

server.registerTool(
  "simulate_color",
  {
    title: "Simulate a color under colorblindness",
    description: "Return how a single hex color appears to someone with a given type of color blindness (protan, deutan, or tritan).",
    inputSchema: {
      color: z.string().describe("Hex color, e.g. #d7191c"),
      type: z.enum(["protan", "deutan", "tritan"]).describe("Color-vision deficiency type")
    }
  },
  async ({ color, type }) => ({
    content: [{ type: "text", text: `${color} -> ${cvd.simulate(color, type)} (as seen with ${type})` }]
  })
);

server.registerTool(
  "fix_palette",
  {
    title: "Fix a palette to be colorblind-safe",
    description:
      "Take a set of colors that fails the colorblind-safety check and return an adjusted set that passes, staying as close to the originals as possible. Conflicting colors are separated in lightness (the axis color-vision deficiency preserves). Returns the new colors, how far each moved, and whether it fully passes.",
    inputSchema: {
      colors: z.array(z.string()).describe('Hex colors to fix, e.g. ["#d7191c","#1a9641"]')
    }
  },
  async ({ colors }) => {
    const r = cvd.fixPalette(colors);
    const lines = [r.pass ? "Fixed — now colorblind-safe." : `Partial fix — ${r.residual} conflict(s) remain within the drift budget.`];
    lines.push(colors.map((c, i) => `${c} -> ${r.colors[i]} (moved ${r.drift[i]})`).join("\n"));
    return { content: [{ type: "text", text: lines.join("\n") + "\n\n" + JSON.stringify(r) }] };
  }
);

server.registerTool(
  "check_contrast",
  {
    title: "Check text/background contrast against WCAG",
    description:
      "Check whether a foreground color is legible on a background color per WCAG 2.x contrast ratios. Returns the ratio (1-21) and whether it passes AA and AAA. Set large=true for text >=18pt (or 14pt bold). This is the legibility axis, separate from color-blindness.",
    inputSchema: {
      foreground: z.string().describe("Text/foreground hex color, e.g. #767676"),
      background: z.string().describe("Background hex color, e.g. #ffffff"),
      large: z.boolean().optional().describe("True if text is >=18pt or 14pt bold (default false)")
    }
  },
  async ({ foreground, background, large }) => {
    const r = cvd.checkContrast(foreground, background, { large: !!large });
    const verdict = `${r.ratio}:1 — AA ${r.AA ? "pass" : "FAIL"}, AAA ${r.AAA ? "pass" : "FAIL"}${large ? " (large text)" : ""}.`;
    return { content: [{ type: "text", text: verdict + "\n\n" + JSON.stringify(r) }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("opticquiz-cvd MCP server running on stdio");
