"use client";
import Link from "next/link";
import {Heart} from "lucide-react";
import {products} from "@/lib/data";
import ProductCard from "@/components/ProductCard";
import {useStore} from "@/components/StoreProvider";
export default function Wishlist(){const {wishlist}=useStore();const items=products.filter(p=>wishlist.includes(p.slug));return <main><div className="container section"><div className="breadcrumb">Home / Wishlist</div><h1 className="serif">Your Wishlist</h1>{!items.length?<div className="empty"><Heart size={35}/><h2 className="serif">Save pieces you love.</h2><p>Tap the heart on any product to keep it here.</p><Link className="btn gold" href="/shop">Explore Bedsheets</Link></div>:<div className="productGrid">{items.map(p=><ProductCard key={p.slug} p={p}/>)}</div>}</div></main>}
