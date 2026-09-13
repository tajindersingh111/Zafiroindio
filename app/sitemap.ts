import type {MetadataRoute} from "next";
import {products} from "@/lib/data";
export default function sitemap():MetadataRoute.Sitemap{const base="https://zafiro.example";return[{url:base,changeFrequency:"weekly",priority:1},{url:`${base}/shop`,changeFrequency:"daily",priority:.9},{url:`${base}/collections`,changeFrequency:"weekly",priority:.8},{url:`${base}/about`,changeFrequency:"monthly",priority:.6},...products.map(p=>({url:`${base}/products/${p.slug}`,changeFrequency:"weekly" as const,priority:.8}))]}
