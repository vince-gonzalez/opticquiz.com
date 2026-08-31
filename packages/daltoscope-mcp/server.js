#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import cvd from "opticquiz-cvd";
import { simulateImage } from "./imageSim.js";

const server = new McpServer({ name: "daltoscope", version: "0.1.0" });

server.registerTool(
  "simulateColor",
  {
    title: "Simulate a color under colorblindness",
    description:
      "Return how a single hex color appears to someone with a given type of color-vision deficiency (protan, deutan, or tritan). Set severity 0..1 for a partial deficiency (anomalous trichromacy); 1 is the full dichromat case.",
    inputSchema: {
      color: z.string().describe("Hex color, e.g. #d7191c"),
      type: z.enum(["protan", "deutan", "tritan"]).describe("Color-vision deficiency type"),
      severity: z.number().min(0).max(1).optional().describe("Deficiency strength 0..1 (default 1)")
    }
  },
  async ({ color, type, severity }) => ({
    content: [{ type: "text", text: `${color} -> ${cvd.simulate(color, type, severity ?? 1)} (as seen with ${type})` }]
  })
);

server.registerTool(
  "compareVision",
  {
    title: "Show a color under all three deficiencies",
    description:
      "Return how a single hex color appears under protanopia, deuteranopia and tritanopia at once, for a side-by-side comparison.",
    inputSchema: {
      color: z.string().describe("Hex color, e.g. #1a9641"),
      severity: z.number().min(0).max(1).optional().describe("Deficiency strength 0..1 (default 1)")
    }
  },
  async ({ color, severity }) => {
    const out = {};
    for (const t of cvd.TYPES) out[t] = cvd.simulate(color, t, severity ?? 1);
    const line = cvd.TYPES.map((t) => `${t}: ${out[t]}`).join(", ");
    return { content: [{ type: "text", text: `${color} -> ${line}\n\n` + JSON.stringify(out) }] };
  }
);

server.registerTool(
  "simulateImage",
  {
    title: "Recolor an image as a colorblind person sees it",
    description:
      "Recolor an image, chart, screenshot or mockup the way someone with color-vision deficiency sees it, and return the recolored image. Use this to SHOW what a design looks like through colorblindness (to check whether it stays readable, pair it with hueristic's checkImage). Reads PNG and JPEG — pass `path` for a local file, or a base64 `dataUri`. `type` picks the deficiency (default deutan); `severity` 0..1 sets strength.",
    inputSchema: {
      path: z.string().optional().describe("Path to a local PNG or JPEG file, e.g. ./chart.png"),
      dataUri: z.string().optional().describe("Base64 data URI of the image, if you don't have a file path"),
      type: z.enum(["protan", "deutan", "tritan"]).optional().describe("Which deficiency to render (default deutan)"),
      severity: z.number().min(0).max(1).optional().describe("Deficiency strength 0..1 (default 1)")
    }
  },
  async ({ path, dataUri, type, severity }) => {
    const r = simulateImage({ path, dataUri, type: type ?? "deutan", severity: severity ?? 1 });
    return {
      content: [
        { type: "text", text: `Recolored as ${r.type} sees it (${r.width}x${r.height}).` },
        { type: "image", data: r.base64, mimeType: "image/png" }
      ]
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("daltoscope MCP server running on stdio");
