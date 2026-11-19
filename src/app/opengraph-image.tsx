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
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 96, background: "linear-gradient(135deg, #f6f7fb 0%, #eef0ff 100%)", fontFamily: "sans-serif" }}>
        <img src={mark} width={112} height={112} alt="" />
        <div style={{ marginTop: 40, fontSize: 72, fontWeight: 700, color: "#0f1424", letterSpacing: -2 }}>Call Intelligence</div>
        <div style={{ marginTop: 16, fontSize: 32, color: "#4a5266", maxWidth: 900 }}>Every call scored against your framework and turned into coaching. Portfolio demo with fictional calls.</div>
      </div>
    ),
    size,
  );
}
