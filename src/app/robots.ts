import type { MetadataRoute } from "next";
import { site } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  return site.index
    ? { rules: { userAgent: "*", allow: "/" }, sitemap: new URL("/sitemap.xml", site.url).href }
    : { rules: { userAgent: "*", disallow: "/" } };
}
