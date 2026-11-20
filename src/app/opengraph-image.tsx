import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "Call Intelligence";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Static brand card: no customer data, only the mark and the product line.
export default async function OG() {
  const mark = `data:image/svg+xml;base64,${(await readFile(join(process.cwd(), "brand/mark.svg"))).toString("base64")}`;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 96, background: "radial-gradient(circle at 90% 0%, #3b2a9e 0%, transparent 50%), radial-gradient(circle at 0% 100%, #0a4fb8 0%, transparent 55%), #060b26", fontFamily: "sans-serif" }}>
        <img src={mark} width={112} height={112} alt="" />
        <div style={{ marginTop: 40, fontSize: 72, fontWeight: 700, color: "#ffffff", letterSpacing: -2 }}>Call Intelligence</div>
        <div style={{ marginTop: 16, fontSize: 32, color: "#a0aec0", maxWidth: 900 }}>Every call scored against your framework and turned into coaching.</div>
      </div>
    ),
    size,
  );
}
