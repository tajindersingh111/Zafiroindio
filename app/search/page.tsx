"use client";
import {useSearchParams} from "next/navigation";
import ProductCard from "@/components/ProductCard";
import {products} from "@/lib/data";
import {Suspense} from "react";
function SearchInner(){const params=useSearchParams();const q=(params.get("q")||"").toLowerCase();const found=products.filter(p=>`${p.name} ${p.category} ${p.colors.join(" ")}`.toLowerCase().includes(q));return <main><div className="container section"><div className="breadcrumb">Home / Search</div><h1 className="serif" style={{textAlign:"center"}}>Search Zafiro</h1><form className="searchBox"><input name="q" defaultValue={q} placeholder="Search bedsheets, colors, collections..." autoFocus/><button className="btn dark">Search</button></form>{q&&<p style={{color:"var(--muted)"}}>Showing results for “{q}”</p>}{found.length?<div className="productGrid" style={{marginTop:25}}>{found.map(p=><ProductCard key={p.slug} p={p}/>)}</div>:q?<div className="empty"><h2 className="serif">No exact matches.</h2><p>Try “floral”, “blue”, “minimal” or “cotton”.</p></div>:null}</div></main>}
export default function Search(){return <Suspense fallback={<div className="empty">Loading search…</div>}><SearchInner/></Suspense>}
