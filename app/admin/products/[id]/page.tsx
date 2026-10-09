"use client";
import ProductFormPage from "@/app/admin/products/new/page";

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  return <ProductFormPage params={params} />;
}
