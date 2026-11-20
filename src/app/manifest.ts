import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Call Intelligence",
    short_name: "Calls",
    start_url: "/",
    display: "standalone",
    background_color: "#f3f6fd",
    theme_color: "#0075ff",
    icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }, { src: "/icon-512.png", sizes: "512x512", type: "image/png" }],
  };
}
