export type Product = {
  slug:string; name:string; price:number; oldPrice:number; discount:number; rating:number; reviews:number;
  badge?:string; fabric:string; description:string; category:string; colors:string[]; sizes:string[]; images:string[];
};

const I = (id:string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=85`;

export const products: Product[] = [
 {slug:"botanical-bloom",name:"Zafiro Botanical Bloom",price:1499,oldPrice:2199,discount:32,rating:4.8,reviews:126,badge:"BESTSELLER",fabric:"100% Cotton",category:"Floral",colors:["Sage Green","Indigo Blue","Terracotta","Ivory"],sizes:["Single","Double","Queen","King"],description:"Bring the freshness of nature into your bedroom with a soft, breathable floral bedsheet designed for everyday luxury.",images:[I("photo-1618220179428-22790b461013"),I("photo-1616486338812-3dadae4b4ace"),I("photo-1586023492125-27b2c045efd7"),I("photo-1615874694520-474822394e73")]},
 {slug:"sage-serenity",name:"Zafiro Sage Serenity",price:1299,oldPrice:1999,discount:35,rating:4.7,reviews:98,badge:"NEW",fabric:"100% Cotton",category:"Minimal",colors:["Sage Green","Ivory"],sizes:["Single","Double","Queen","King"],description:"Calm, understated and effortlessly beautiful. A soft neutral palette for modern bedrooms.",images:[I("photo-1598928506311-c55ded91a20c"),I("photo-1618221195710-dd6b41faaea6"),I("photo-1600607687920-4e2a09cf159d")]},
 {slug:"indigo-haven",name:"Zafiro Indigo Haven",price:1299,oldPrice:1999,discount:35,rating:4.8,reviews:100,fabric:"100% Cotton",category:"Printed",colors:["Indigo Blue","Ivory"],sizes:["Double","Queen","King"],description:"Deep indigo motifs and soft cotton create a bedroom that feels rich, restful and timeless.",images:[I("photo-1617104678098-de229db51175"),I("photo-1618220179428-22790b461013"),I("photo-1616486338812-3dadae4b4ace")]},
 {slug:"ivory-garden",name:"Zafiro Ivory Garden",price:1199,oldPrice:1899,discount:37,rating:4.6,reviews:76,fabric:"Cotton Percale",category:"Floral",colors:["Ivory","Beige"],sizes:["Single","Double","Queen","King"],description:"An airy floral print in warm ivory tones, made for bright and welcoming bedrooms.",images:[I("photo-1600210492486-724fe5c67fb0"),I("photo-1600566753190-17f0baa2a6c3")]},
 {slug:"terracotta-bloom",name:"Zafiro Terracotta Bloom",price:1399,oldPrice:2199,discount:36,rating:4.7,reviews:112,badge:"SALE",fabric:"100% Cotton",category:"Printed",colors:["Terracotta","Cream"],sizes:["Double","Queen","King"],description:"Warm terracotta florals add a cozy, expressive touch to your space.",images:[I("photo-1600566753086-00f18fb6b3ea"),I("photo-1600585154340-be6161a56a0c")]},
 {slug:"blush-petals",name:"Zafiro Blush Petals",price:1199,oldPrice:1899,discount:37,rating:4.6,reviews:84,fabric:"100% Cotton",category:"Floral",colors:["Blush","Ivory"],sizes:["Single","Double","Queen"],description:"Soft blush petals and breathable cotton for a gentle, romantic bedroom look.",images:[I("photo-1615874959474-d609969a20ed"),I("photo-1615529162924-f8605388461d")]},
 {slug:"minimal-sand",name:"Zafiro Minimal Sand",price:999,oldPrice:1499,discount:33,rating:4.5,reviews:64,fabric:"Cotton Blend",category:"Minimal",colors:["Sand","Ivory"],sizes:["Single","Double","Queen","King"],description:"Quiet, warm neutrals that pair effortlessly with any bedroom.",images:[I("photo-1595526114035-0d45ed16cfbf"),I("photo-1600607687939-ce8a6c25118c")]},
 {slug:"olive-whisper",name:"Zafiro Olive Whisper",price:1299,oldPrice:1999,discount:35,rating:4.7,reviews:90,fabric:"100% Cotton",category:"Printed",colors:["Olive","Cream"],sizes:["Double","Queen","King"],description:"A nature-inspired olive print for relaxed, grounded interiors.",images:[I("photo-1616486338812-3dadae4b4ace"),I("photo-1600210492486-724fe5c67fb0")]},
 {slug:"blue-mist",name:"Zafiro Blue Mist",price:1299,oldPrice:1999,discount:35,rating:4.6,reviews:58,fabric:"100% Cotton",category:"Printed",colors:["Blue","Ivory"],sizes:["Double","Queen","King"],description:"Cool blue botanical details bring a fresh, serene mood to your bedroom.",images:[I("photo-1618220179428-22790b461013"),I("photo-1616486338812-3dadae4b4ace")]},
 {slug:"midnight-floral",name:"Zafiro Midnight Floral",price:1499,oldPrice:2199,discount:32,rating:4.8,reviews:73,fabric:"Premium Cotton",category:"Luxury",colors:["Midnight Blue","Cream"],sizes:["Double","Queen","King"],description:"A deeper floral palette for a more dramatic, sophisticated bedroom.",images:[I("photo-1617104678098-de229db51175"),I("photo-1618221195710-dd6b41faaea6")]},
 {slug:"peach-retreat",name:"Zafiro Peach Retreat",price:1199,oldPrice:1899,discount:37,rating:4.6,reviews:49,fabric:"100% Cotton",category:"New Arrivals",colors:["Peach","Cream"],sizes:["Double","Queen"],description:"A soft peach palette designed to make your bedroom feel warm and inviting.",images:[I("photo-1600566753086-00f18fb6b3ea"),I("photo-1615874694520-474822394e73")]},
 {slug:"luxe-beige",name:"Zafiro Luxe Beige",price:1699,oldPrice:2499,discount:32,rating:4.8,reviews:38,badge:"PREMIUM",fabric:"Premium Cotton",category:"Luxury",colors:["Beige","Ivory"],sizes:["Queen","King"],description:"Premium texture and timeless beige tones for understated everyday luxury.",images:[I("photo-1600607687920-4e2a09cf159d"),I("photo-1600210492486-724fe5c67fb0")]}
];

export const collections = [
 {name:"Floral Collection",slug:"floral",desc:"Bring nature's beauty into your bedroom with our stunning floral designs.",image:I("photo-1618220179428-22790b461013")},
 {name:"Minimal Collection",slug:"minimal",desc:"Clean. Simple. Timeless. Perfect for modern living.",image:I("photo-1598928506311-c55ded91a20c")},
 {name:"Printed Collection",slug:"printed",desc:"Beautiful prints that add character and charm to your space.",image:I("photo-1616486338812-3dadae4b4ace")},
 {name:"Luxury Collection",slug:"luxury",desc:"Indulge in premium fabrics and exquisite craftsmanship.",image:I("photo-1600607687939-ce8a6c25118c")},
 {name:"Everyday Comfort Collection",slug:"everyday",desc:"Soft, durable and perfect for everyday use.",image:I("photo-1595526114035-0d45ed16cfbf")},
 {name:"New Arrivals",slug:"new",desc:"Explore the latest designs and freshest additions to our collection.",image:I("photo-1600566753086-00f18fb6b3ea")}
];

export function getStorefrontProducts(): Product[] {
  return products;
}

export function getStorefrontBanners() {
  return [
    {
      id: "b1",
      title: "Handcrafted Luxury Bedsheets",
      subtitle: "Experience pure cotton comfort with traditional Indian block prints",
      ctaText: "Shop Collection",
      ctaLink: "/shop",
      image: "https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=1200&q=85",
      isActive: true
    }
  ];
}


