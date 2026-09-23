"use client";
import {createContext,useContext,useEffect,useMemo,useState} from "react";
import {Product} from "@/lib/data";

export type CouponInfo = { code: string; label: string; pct: number };

export const AVAILABLE_COUPONS: CouponInfo[] = [
  { code: "WELCOME10", label: "10% OFF First Order", pct: 10 },
  { code: "ZAFIRO10", label: "10% OFF Sitewide", pct: 10 },
  { code: "SUMMER15", label: "15% OFF Summer Special", pct: 15 },
  { code: "FESTIVE20", label: "20% OFF Festive Deal", pct: 20 },
  { code: "ZAFIROVIP", label: "20% OFF VIP Exclusive", pct: 20 }
];

type CartItem={product:Product;qty:number;size:string;color:string};
type CouponResult = { success: boolean; message: string; discountPercent?: number };

type Store={
  cart:CartItem[];
  wishlist:string[];
  add:(p:Product,size:string,color:string)=>void;
  remove: (slug: string, size?: string, color?: string) => void;
  setQty: (slug: string, qty: number, size?: string, color?: string) => void;
  clearCart: () => void;
  toggleWish: (slug: string) => void;
  cartCount: number;
  subtotal: number;
  appliedCoupon: string;
  discountPercent: number;
  applyCoupon: (code: string) => CouponResult;
  removeCoupon: () => void;
};

const C = createContext<Store | null>(null);
export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [appliedCoupon, setAppliedCoupon] = useState<string>("");
  const [discountPercent, setDiscountPercent] = useState<number>(0);

  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      setCart(JSON.parse(localStorage.getItem("zafiro-cart") || "[]"));
      setWishlist(JSON.parse(localStorage.getItem("zafiro-wishlist") || "[]"));
      const savedCoupon = localStorage.getItem("zafiro-coupon") || "";
      const savedPercent = Number(localStorage.getItem("zafiro-coupon-pct") || "0");
      if (savedCoupon && savedPercent > 0) {
        setAppliedCoupon(savedCoupon);
        setDiscountPercent(savedPercent);
      }
    } catch {}
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem("zafiro-cart", JSON.stringify(cart));
    } catch {}
  }, [cart, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem("zafiro-wishlist", JSON.stringify(wishlist));
    } catch {}
  }, [wishlist, isLoaded]);

  const applyCoupon = (code: string): CouponResult => {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      return { success: false, message: "Please enter a coupon code." };
    }

    const match = AVAILABLE_COUPONS.find(c => c.code === cleanCode);
    if (match) {
      const pct = match.pct;
      setAppliedCoupon(cleanCode);
      setDiscountPercent(pct);
      try {
        localStorage.setItem("zafiro-coupon", cleanCode);
        localStorage.setItem("zafiro-coupon-pct", String(pct));
      } catch {}
      return { success: true, message: `Coupon ${cleanCode} applied successfully! (${pct}% OFF)`, discountPercent: pct };
    }

    return { success: false, message: "Invalid coupon code. Try WELCOME10, ZAFIRO10 or FESTIVE20." };
  };

  const removeCoupon = () => {
    setAppliedCoupon("");
    setDiscountPercent(0);
    try {
      localStorage.removeItem("zafiro-coupon");
      localStorage.removeItem("zafiro-coupon-pct");
    } catch {}
  };

  const add = (product: Product, size: string, color: string) =>
    setCart(c => {
      const i = c.findIndex(x => x.product.slug === product.slug && x.size === size && x.color === color);
      if (i >= 0) {
        const n = [...c];
        n[i] = { ...n[i], qty: n[i].qty + 1 };
        return n;
      }
      return [...c, { product, qty: 1, size, color }];
    });

  const remove = (slug: string, size?: string, color?: string) =>
    setCart(c =>
      c.filter(
        x =>
          !(
            x.product.slug === slug &&
            (!size || x.size === size) &&
            (!color || x.color === color)
          )
      )
    );

  const setQty = (slug: string, qty: number, size?: string, color?: string) =>
    setCart(c =>
      qty < 1
        ? c.filter(
            x =>
              !(
                x.product.slug === slug &&
                (!size || x.size === size) &&
                (!color || x.color === color)
              )
          )
        : c.map(x =>
            x.product.slug === slug &&
            (!size || x.size === size) &&
            (!color || x.color === color)
              ? { ...x, qty }
              : x
          )
    );
 const clearCart=()=>{ setCart([]); removeCoupon(); };
 const toggleWish=(slug:string)=>setWishlist(w=>w.includes(slug)?w.filter(x=>x!==slug):[...w,slug]);

 const value=useMemo(()=>({
   cart,
   wishlist,
   add,
   remove,
   setQty,
   clearCart,
   toggleWish,
   cartCount:cart.reduce((a,x)=>a+x.qty,0),
   subtotal:cart.reduce((a,x)=>a+x.product.price*x.qty,0),
   appliedCoupon,
   discountPercent,
   applyCoupon,
   removeCoupon
 }),[cart,wishlist,appliedCoupon,discountPercent]);

 return <C.Provider value={value}>{children}</C.Provider>
}
export const useStore=()=>{const c=useContext(C);if(!c)throw new Error("useStore must be inside StoreProvider");return c};

