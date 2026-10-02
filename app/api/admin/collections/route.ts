import { NextResponse } from "next/server";
import { readCollection, writeCollection } from "@/lib/db/store";
import { collections as defaultCollections } from "@/lib/data";

export type CollectionItem = {
  id?: string;
  name: string;
  slug: string;
  desc?: string;
  image?: string;
  bannerImage?: string;
};

const COLLECTION_NAME = "collections";

function getCollections(): CollectionItem[] {
  let list = readCollection<CollectionItem>(COLLECTION_NAME);
  if (!list || list.length === 0) {
    list = defaultCollections.map((c, idx) => ({
      id: `col-${idx + 1}`,
      name: c.name,
      slug: c.slug,
      desc: c.desc,
      image: c.image,
    }));
    writeCollection(COLLECTION_NAME, list);
  }
  return list;
}

// GET /api/admin/collections
export async function GET() {
  try {
    const list = getCollections();
    return NextResponse.json({ success: true, collections: list });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch collections" }, { status: 500 });
  }
}

// POST /api/admin/collections (Create collection)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, desc, image, bannerImage } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Collection name is required." }, { status: 400 });
    }

    const slug = body.slug ? body.slug.toLowerCase().replace(/[^a-z0-9]+/g, "-") : name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");

    const newCol: CollectionItem = {
      id: `col-${Date.now()}`,
      name: name.trim(),
      slug,
      desc: (desc || "").trim(),
      image: image || "https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=1200&q=85",
      bannerImage: bannerImage || ""
    };

    const currentList = getCollections();
    const exists = currentList.find((c) => c.slug === slug);
    if (exists) {
      return NextResponse.json({ error: "Collection with this slug already exists." }, { status: 400 });
    }

    const updated = [newCol, ...currentList];
    writeCollection(COLLECTION_NAME, updated);

    return NextResponse.json({ success: true, message: "Collection created successfully.", collection: newCol });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create collection." }, { status: 500 });
  }
}

// PUT /api/admin/collections (Update collection)
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, name, slug, desc, image, bannerImage } = body;

    if (!id) {
      return NextResponse.json({ error: "Collection ID is required." }, { status: 400 });
    }

    const currentList = getCollections();
    const idx = currentList.findIndex((c) => c.id === id || c.slug === id);
    if (idx === -1) {
      return NextResponse.json({ error: "Collection not found." }, { status: 404 });
    }

    if (name) currentList[idx].name = name.trim();
    if (slug) currentList[idx].slug = slug.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    if (desc !== undefined) currentList[idx].desc = desc.trim();
    if (image !== undefined) currentList[idx].image = image;
    if (bannerImage !== undefined) currentList[idx].bannerImage = bannerImage;

    writeCollection(COLLECTION_NAME, currentList);

    return NextResponse.json({ success: true, message: "Collection updated.", collection: currentList[idx] });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update collection." }, { status: 500 });
  }
}

// DELETE /api/admin/collections (Delete collection)
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id") || searchParams.get("slug");

    if (!id) {
      return NextResponse.json({ error: "Collection ID or slug is required." }, { status: 400 });
    }

    const currentList = getCollections();
    const updated = currentList.filter((c) => c.id !== id && c.slug !== id);
    writeCollection(COLLECTION_NAME, updated);

    return NextResponse.json({ success: true, message: "Collection deleted." });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete collection." }, { status: 500 });
  }
}
