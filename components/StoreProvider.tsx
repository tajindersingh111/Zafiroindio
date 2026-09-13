"use client";
import {createContext,useContext,useEffect,useMemo,useState} from "react";
import {Product} from "@/lib/data";

type CartItem={product:Product;qty:number;size:string;color:string};
type Store={cart:CartItem[];wishlist:string[];add:(p:Product,size:string,color:string)=>void;remove:(slug:string)=>void;setQty:(slug:string,qty:number)=>void;clearCart:()=>void;toggleWish:(slug:string)=>void;cartCount:number;subtotal:number};

const C=createContext<Store|null>(null);
export function StoreProvider({children}:{children:React.ReactNode}){
 const [cart,setCart]=useState<CartItem[]>([]);
 const [wishlist,setWishlist]=useState<string[]>([]);
 useEffect(()=>{try{setCart(JSON.parse(localStorage.getItem("zafiro-cart")||"[]"));setWishlist(JSON.parse(localStorage.getItem("zafiro-wishlist")||"[]"))}catch{}},[]);
 useEffect(()=>localStorage.setItem("zafiro-cart",JSON.stringify(cart)),[cart]);
 useEffect(()=>localStorage.setItem("zafiro-wishlist",JSON.stringify(wishlist)),[wishlist]);
 const add=(product:Product,size:string,color:string)=>setCart(c=>{const i=c.findIndex(x=>x.product.slug===product.slug&&x.size===size&&x.color===color);if(i>=0){const n=[...c];n[i]={...n[i],qty:n[i].qty+1};return n}return [...c,{product,qty:1,size,color}]});
 const remove=(slug:string)=>setCart(c=>c.filter(x=>x.product.slug!==slug));
 const setQty=(slug:string,qty:number)=>setCart(c=>qty<1?c.filter(x=>x.product.slug!==slug):c.map(x=>x.product.slug===slug?{...x,qty}:x));
 const clearCart=()=>setCart([]);
 const toggleWish=(slug:string)=>setWishlist(w=>w.includes(slug)?w.filter(x=>x!==slug):[...w,slug]);
 const value=useMemo(()=>({cart,wishlist,add,remove,setQty,clearCart,toggleWish,cartCount:cart.reduce((a,x)=>a+x.qty,0),subtotal:cart.reduce((a,x)=>a+x.product.price*x.qty,0)}),[cart,wishlist]);
 return <C.Provider value={value}>{children}</C.Provider>
}
export const useStore=()=>{const c=useContext(C);if(!c)throw new Error("useStore must be inside StoreProvider");return c};
