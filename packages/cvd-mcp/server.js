#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import cvd from "opticquiz-cvd";

const server = new McpServer({ name: "opticquiz-cvd", version: "1.0.0" });

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

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("opticquiz-cvd MCP server running on stdio");
