#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import cvd from "opticquiz-cvd";
import { analyzeImage } from "./imageCheck.js";

const server = new McpServer({ name: "hueristic", version: "0.1.0" });

server.registerTool(
  "checkPalette",
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
  "simulateColor",
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
  "fixPalette",
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
  "checkContrast",
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

server.registerTool(
  "checkImage",
  {
    title: "Check an image for colorblind-safety",
    description:
      "Check whether the colors in an image, chart, screenshot or mockup stay distinguishable for people with color-vision deficiency. Extracts the image's dominant colors, simulates protanopia, deuteranopia and tritanopia, and flags the color pairs that collapse into each other — each with how much of the image's area those colors cover, so a conflict between two large regions ranks above one between two specks. Reads PNG and JPEG. Pass `path` for a local file, or a base64 `dataUri`. Set returnSimulated=true to also get back the image as a deuteranope sees it. A screening aid, not a legal (ADA/WCAG) audit.",
    inputSchema: {
      path: z.string().optional().describe("Path to a local PNG or JPEG file, e.g. ./dashboard.png"),
      dataUri: z.string().optional().describe("Base64 data URI of the image, if you don't have a file path"),
      maxColors: z.number().int().min(2).max(32).optional().describe("How many dominant colors to extract and test (default 12)"),
      returnSimulated: z.boolean().optional().describe("Also return the image recolored as a deuteranope sees it (default false)"),
      simulateType: z.enum(["protan", "deutan", "tritan"]).optional().describe("Which deficiency to render when returnSimulated is set (default deutan)")
    }
  },
  async (args) => {
    const r = await analyzeImage(args);
    const pct = (s) => (s * 100).toFixed(1) + "%";
    const lines = [
      r.report.pass
        ? "PASS — the image's dominant colors stay distinguishable under colorblindness."
        : "FAIL — some dominant colors collapse into each other under colorblindness.",
      `Extracted ${r.palette.length} dominant colors from a ${r.width}x${r.height} image.`
    ];
    for (const t of cvd.TYPES) {
      const cs = r.report.types[t].conflicts;
      if (!cs.length) continue;
      lines.push(
        `${t}: ` +
          cs
            .map((c) => `${c.a}/${c.b} collapse (deltaE ${c.normal}->${c.sim}, ${pct(c.areaShare)} of image, ${c.severity})`)
            .join("; ")
      );
    }
    lines.push("palette: " + r.palette.map((p) => `${p.hex} ${pct(p.share)}`).join(", "));

    const content = [{ type: "text", text: lines.join("\n") + "\n\n" + JSON.stringify(r.report) }];
    if (r.simulated) {
      content.push({ type: "image", data: r.simulated, mimeType: "image/png" });
    }
    return { content };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("hueristic MCP server running on stdio");
