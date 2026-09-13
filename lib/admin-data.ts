export type OrderStatus = "Pending" | "Processing" | "Shipped" | "Delivered" | "Returned";

export type Order = {
  id: string;
  customer: string;
  city: string;
  items: number;
  total: number;
  status: OrderStatus;
  date: string;
  type: "Retail" | "B2B";
};

export const orders: Order[] = [
  { id: "ZI10482", customer: "Anjali Sharma", city: "Jaipur", items: 2, total: 4398, status: "Delivered", date: "2026-08-18", type: "Retail" },
  { id: "ZI10483", customer: "Rohit Mehta", city: "Mumbai", items: 1, total: 1499, status: "Shipped", date: "2026-08-18", type: "Retail" },
  { id: "ZI10484", customer: "Coastal Homestays Pvt Ltd", city: "Goa", items: 120, total: 179880, status: "Processing", date: "2026-08-19", type: "B2B" },
  { id: "ZI10485", customer: "Priya Nair", city: "Bengaluru", items: 3, total: 3597, status: "Pending", date: "2026-08-19", type: "Retail" },
  { id: "ZI10486", customer: "Karan Vohra", city: "Delhi", items: 1, total: 1799, status: "Returned", date: "2026-08-17", type: "Retail" },
  { id: "ZI10487", customer: "The Fern Residency", city: "Udaipur", items: 60, total: 89400, status: "Shipped", date: "2026-08-16", type: "B2B" },
  { id: "ZI10488", customer: "Simran Kaur", city: "Chandigarh", items: 2, total: 2998, status: "Delivered", date: "2026-08-15", type: "Retail" },
  { id: "ZI10489", customer: "Aditya Rao", city: "Hyderabad", items: 1, total: 1199, status: "Processing", date: "2026-08-19", type: "Retail" },
];

export type InventoryItem = {
  sku: string;
  name: string;
  category: string;
  stock: number;
  threshold: number;
  price: number;
};

export const inventory: InventoryItem[] = [
  { sku: "ZI-BS-001", name: "Cleopatra Golden Bloom Bedsheet", category: "Bedsheets", stock: 42, threshold: 20, price: 2199 },
  { sku: "ZI-RG-002", name: "Begonia Hand Block Cotton Rug", category: "Rugs", stock: 8, threshold: 15, price: 1499 },
  { sku: "ZI-RN-003", name: "Alpha Handblock Table Runner Set", category: "Runners & Placemats", stock: 27, threshold: 15, price: 1199 },
  { sku: "ZI-TH-004", name: "Meadow Sofa Throw", category: "Sofa Throws", stock: 4, threshold: 10, price: 1799 },
  { sku: "ZI-RG-005", name: "Bloom Hand Block Cotton Rug", category: "Rugs", stock: 33, threshold: 15, price: 1499 },
  { sku: "ZI-RN-006", name: "Petal Handblock Table Runner Set", category: "Runners & Placemats", stock: 19, threshold: 15, price: 1199 },
];

export type Customer = {
  name: string;
  email: string;
  city: string;
  orders: number;
  lifetimeValue: number;
  type: "Retail" | "B2B";
};

export const customers: Customer[] = [
  { name: "Anjali Sharma", email: "anjali.sharma@example.com", city: "Jaipur", orders: 4, lifetimeValue: 9821, type: "Retail" },
  { name: "Rohit Mehta", email: "rohit.mehta@example.com", city: "Mumbai", orders: 1, lifetimeValue: 1499, type: "Retail" },
  { name: "Coastal Homestays Pvt Ltd", email: "procurement@coastalhomestays.in", city: "Goa", orders: 3, lifetimeValue: 412300, type: "B2B" },
  { name: "Priya Nair", email: "priya.nair@example.com", city: "Bengaluru", orders: 2, lifetimeValue: 5992, type: "Retail" },
  { name: "The Fern Residency", email: "purchase@fernresidency.com", city: "Udaipur", orders: 2, lifetimeValue: 156400, type: "B2B" },
  { name: "Simran Kaur", email: "simran.kaur@example.com", city: "Chandigarh", orders: 5, lifetimeValue: 12440, type: "Retail" },
];

export type B2BLead = {
  company: string;
  contact: string;
  city: string;
  interest: string;
  estValue: number;
  stage: "New" | "Quoted" | "Negotiating" | "Won" | "Lost";
};

export const b2bLeads: B2BLead[] = [
  { company: "Coastal Homestays Pvt Ltd", contact: "Meera Iyer", city: "Goa", interest: "Bedsheets, custom colourway", estValue: 250000, stage: "Negotiating" },
  { company: "The Fern Residency", contact: "Vikram Bhatt", city: "Udaipur", interest: "Sofa throws, bulk 500 units", estValue: 90000, stage: "Won" },
  { company: "Urban Nest Retail", contact: "Sana Sheikh", city: "Delhi", interest: "Rugs for 12 store locations", estValue: 380000, stage: "New" },
  { company: "Marigold Exports LLC", contact: "James Okoro", city: "Lagos (export)", interest: "Full catalog, export order", estValue: 620000, stage: "Quoted" },
];

export const revenueByMonth = [
  { month: "Mar", retail: 182000, b2b: 90000 },
  { month: "Apr", retail: 205000, b2b: 145000 },
  { month: "May", retail: 198000, b2b: 60000 },
  { month: "Jun", retail: 231000, b2b: 210000 },
  { month: "Jul", retail: 264000, b2b: 178000 },
  { month: "Aug", retail: 289000, b2b: 269000 },
];

export const salesByCategory = [
  { category: "Bedsheets", value: 412000 },
  { category: "Rugs", value: 268000 },
  { category: "Runners & Placemats", value: 154000 },
  { category: "Sofa Throws", value: 121000 },
];

export const teamUsers = [
  { name: "Prabhjas Singh", email: "prabhjas@zafiroindio.com", role: "Super Admin" as const },
  { name: "Devika Rathore", email: "devika@zafiroindio.com", role: "Inventory Manager" as const },
  { name: "Arjun Sethi", email: "arjun@zafiroindio.com", role: "Order Manager" as const },
  { name: "Neha Kapoor", email: "neha@zafiroindio.com", role: "Marketing" as const },
  { name: "Farhan Ali", email: "farhan@zafiroindio.com", role: "B2B Sales" as const },
];
