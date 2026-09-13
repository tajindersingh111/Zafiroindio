export type Product = {
  slug: string;
  name: string;
  category: "Bedsheets" | "Rugs" | "Runners & Placemats" | "Sofa Throws";
  price: number;
  compareAt?: number;
  motif: "paisley" | "bloom" | "trellis" | "leaf";
  colorway: [string, string, string]; // ground, motif, accent
  description: string;
  details: string[];
  fabric: string;
  sizes: string[];
};

export const products: Product[] = [
  {
    slug: "cleopatra-golden-bloom-bedsheet",
    name: "Cleopatra Golden Bloom Bedsheet",
    category: "Bedsheets",
    price: 2199,
    compareAt: 2799,
    motif: "bloom",
    colorway: ["#f4ecd8", "#a83a26", "#cf9a2e"],
    description:
      "A 300TC percale bedsheet hand block printed with a golden bloom motif in madder red and turmeric on unbleached cotton.",
    details: ["300 thread count percale cotton", "Fits mattress up to 10\" depth", "1 bedsheet + 2 pillow covers"],
    fabric: "100% Cotton Percale",
    sizes: ["Queen (90x108 in)", "King (108x108 in)"],
  },
  {
    slug: "begonia-cotton-rug",
    name: "Begonia Hand Block Cotton Rug",
    category: "Rugs",
    price: 1499,
    motif: "leaf",
    colorway: ["#ece0c4", "#212f52", "#a83a26"],
    description:
      "A durable cotton dhurrie rug in indigo and madder, block printed by hand and finished with a whip-stitched edge.",
    details: ["Reversible flatweave cotton", "Whip-stitched edge finish", "Machine washable, cold cycle"],
    fabric: "100% Cotton Dhurrie",
    sizes: ["2x3 ft", "3x5 ft"],
  },
  {
    slug: "alpha-table-runner-set",
    name: "Alpha Handblock Table Runner with Placemats",
    category: "Runners & Placemats",
    price: 1199,
    motif: "trellis",
    colorway: ["#fbf6ea", "#cf9a2e", "#212f52"],
    description:
      "A trellis motif runner and 6-piece placemat set, hand block printed in turmeric and indigo for the everyday table.",
    details: ["1 runner (13x72 in) + 6 placemats (13x19 in)", "Stone-washed for softness", "Pre-shrunk cotton"],
    fabric: "100% Cotton",
    sizes: ["Set of 7"],
  },
  {
    slug: "meadow-sofa-throw",
    name: "Meadow Sofa Throw",
    category: "Sofa Throws",
    price: 1799,
    motif: "paisley",
    colorway: ["#f4ecd8", "#862c1b", "#212f52"],
    description:
      "A generously sized paisley throw in a deep madder colourway, block printed on soft brushed cotton for cool evenings.",
    details: ["Brushed cotton, mid-weight", "Fringed edge on both ends", "50x80 in"], 
    fabric: "100% Brushed Cotton",
    sizes: ["50x80 in"],
  },
  {
    slug: "bloom-cotton-rug-teal",
    name: "Bloom Hand Block Cotton Rug",
    category: "Rugs",
    price: 1499,
    compareAt: 1899,
    motif: "bloom",
    colorway: ["#ece0c4", "#cf9a2e", "#a83a26"],
    description:
      "Our signature bloom motif reworked in a warm turmeric and madder colourway on a hand-loomed cotton base.",
    details: ["Reversible flatweave cotton", "Whip-stitched edge finish", "Machine washable, cold cycle"],
    fabric: "100% Cotton Dhurrie",
    sizes: ["2x3 ft", "3x5 ft", "4x6 ft"],
  },
  {
    slug: "petal-table-runner-set",
    name: "Petal Handblock Table Runner with Placemats",
    category: "Runners & Placemats",
    price: 1199,
    motif: "leaf",
    colorway: ["#fbf6ea", "#a83a26", "#cf9a2e"],
    description:
      "A petite floral sprig, hand block printed row by row across a runner and matching placemat set.",
    details: ["1 runner (13x72 in) + 6 placemats (13x19 in)", "Stone-washed for softness", "Pre-shrunk cotton"],
    fabric: "100% Cotton",
    sizes: ["Set of 7"],
  },
];

export const getProduct = (slug: string) => products.find((p) => p.slug === slug);
export const categories = Array.from(new Set(products.map((p) => p.category)));
