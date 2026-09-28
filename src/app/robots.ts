import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/utils";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/properties", "/properties/"],
        disallow: ["/api/", "/dashboard", "/messages", "/favorites", "/settings", "/admin", "/onboarding", "/properties/new", "/*/edit"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
