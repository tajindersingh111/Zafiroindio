import re
import json
import os

sql_file = 'scratch/db_import.sql'
print("Starting WordPress WooCommerce SQL Migration to Zafiro JSON Database...")

with open(sql_file, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

def parse_inserts(table_name, sql_text):
    pattern = rf"INSERT INTO [`\"]?{table_name}[`\"]?\s*\(([^)]+)\)\s*VALUES\s*(.+?);"
    matches = re.findall(pattern, sql_text, re.DOTALL | re.IGNORECASE)
    
    rows = []
    for cols_str, values_block in matches:
        columns = [c.strip().strip('`" ') for c in cols_str.split(',')]
        
        # Parse value tuples
        tuple_pattern = r"\((.*?)\)(?:,\s*|\s*$)"
        # Use regex to find tuples carefully handling escaped quotes
        tuple_matches = re.finditer(r"\((?:[^()'\\]|'[^'\\]*(?:\\.[^'\\]*)*')*\)", values_block)
        
        for tm in tuple_matches:
            raw_tuple = tm.group(0)[1:-1] # strip leading ( and trailing )
            # Split raw_tuple by comma not inside quotes
            val_pattern = r"(?:'((?:[^'\\]|\\.)*)'|([^,]+))"
            vals = []
            for item in re.finditer(r"(?:'((?:[^'\\]|\\.)*)'|([^,]+))", raw_tuple):
                str_val, num_val = item.groups()
                if str_val is not None:
                    # Unescape
                    val = str_val.replace("\\'", "'").replace('\\"', '"').replace('\\\\', '\\').replace('\\n', '\n').replace('\\r', '\r')
                    vals.append(val)
                elif num_val is not None:
                    v = num_val.strip()
                    if v.upper() == 'NULL':
                        vals.append(None)
                    elif v.isdigit() or (v.startswith('-') and v[1:].isdigit()):
                        vals.append(int(v))
                    else:
                        try:
                            vals.append(float(v))
                        except:
                            vals.append(v.strip("'"))
                            
            if len(vals) == len(columns):
                rows.append(dict(zip(columns, vals)))
    return rows

print("Extracting wp_posts...")
posts = parse_inserts("wp_posts", content)
print(f"Total wp_posts rows: {len(posts)}")

print("Extracting wp_postmeta...")
postmeta = parse_inserts("wp_postmeta", content)
print(f"Total wp_postmeta rows: {len(postmeta)}")

print("Extracting wp_terms & taxonomy...")
terms = parse_inserts("wp_terms", content)
term_taxonomy = parse_inserts("wp_term_taxonomy", content)
term_relationships = parse_inserts("wp_term_relationships", content)
print(f"Terms: {len(terms)}, Taxonomies: {len(term_taxonomy)}, Relationships: {len(term_relationships)}")

print("Extracting wp_wc_customer_lookup & users...")
customers_raw = parse_inserts("wp_wc_customer_lookup", content)
users_raw = parse_inserts("wp_users", content)
print(f"Customers: {len(customers_raw)}, Users: {len(users_raw)}")

print("Extracting wp_wc_orders...")
orders_raw = parse_inserts("wp_wc_orders", content)
print(f"Orders: {len(orders_raw)}")

# Index postmeta by post_id
meta_by_post = {}
for m in postmeta:
    pid = m.get('post_id')
    key = m.get('meta_key')
    val = m.get('meta_value')
    if pid not in meta_by_post:
        meta_by_post[pid] = {}
    meta_by_post[pid][key] = val

# Index attachments for image URLs
attachments = {}
for p in posts:
    if p.get('post_type') == 'attachment':
        attachments[p.get('ID')] = p.get('guid')

# Index Categories
categories_map = {}
term_id_to_tax = {tt.get('term_id'): tt for tt in term_taxonomy}
for t in terms:
    tid = t.get('term_id')
    tt = term_id_to_tax.get(tid, {})
    if tt.get('taxonomy') == 'product_cat':
        categories_map[tid] = {
            "id": f"cat-{tid}",
            "name": t.get('name'),
            "slug": t.get('slug'),
            "description": tt.get('description', ''),
            "createdAt": "2026-01-01T08:00:00.000Z"
        }

# Index Product-Category relationships
post_to_cats = {}
for tr in term_relationships:
    object_id = tr.get('object_id')
    term_taxonomy_id = tr.get('term_taxonomy_id')
    for tt in term_taxonomy:
        if tt.get('term_taxonomy_id') == term_taxonomy_id and tt.get('taxonomy') == 'product_cat':
            tid = tt.get('term_id')
            if object_id not in post_to_cats:
                post_to_cats[object_id] = []
            if tid in categories_map:
                post_to_cats[object_id].append(categories_map[tid]['id'])

# Process Products
products_list = []
default_img = "https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=1200&q=85"

for p in posts:
    if p.get('post_type') == 'product' and p.get('post_status') == 'publish':
        pid = p.get('ID')
        meta = meta_by_post.get(pid, {})
        
        name = p.get('post_title', '').strip()
        slug = p.get('post_name', '').strip() or f"prod-{pid}"
        desc = p.get('post_content', '').strip() or p.get('post_excerpt', '').strip() or name
        short_desc = p.get('post_excerpt', '').strip() or desc[:120]
        
        sku = meta.get('_sku') or f"ZI-{pid}"
        
        price = 1499
        try:
            price = float(meta.get('_price') or meta.get('_regular_price') or 1499)
        except:
            pass

        sale_price = None
        try:
            if meta.get('_sale_price'):
                sp = float(meta.get('_sale_price'))
                if sp < price:
                    sale_price = sp
        except:
            pass

        stock = 50
        try:
            stock = int(float(meta.get('_stock') or 50))
        except:
            pass

        # Image resolution
        images = []
        thumb_id = meta.get('_thumbnail_id')
        if thumb_id and int(thumb_id) in attachments:
            images.append(attachments[int(thumb_id)])
            
        gallery_ids = meta.get('_product_image_gallery', '')
        if gallery_ids:
            for gid in gallery_ids.split(','):
                gid = gid.strip()
                if gid.isdigit() and int(gid) in attachments:
                    img_url = attachments[int(gid)]
                    if img_url not in images:
                        images.append(img_url)
                        
        if not images:
            images = [default_img]

        cat_ids = post_to_cats.get(pid, [])
        cat_id = cat_ids[0] if cat_ids else "cat-1"

        product_obj = {
            "id": f"prod-{pid}",
            "name": name,
            "slug": slug,
            "type": "simple",
            "status": "active",
            "description": desc,
            "shortDescription": short_desc,
            "sku": sku,
            "price": price,
            "salePrice": sale_price,
            "mrp": round(price * 1.4) if not sale_price else price,
            "costPrice": round(price * 0.4),
            "categoryId": cat_id,
            "tags": ["bedsheet", "cotton"],
            "images": images,
            "taxClass": "standard",
            "stock": stock,
            "stockStatus": "in_stock" if stock > 0 else "out_of_stock",
            "lowStockThreshold": 10,
            "manageStock": True,
            "backordersAllowed": False,
            "attributes": { "Size": ["Single", "Double", "Queen", "King"] },
            "variations": [],
            "createdAt": str(p.get('post_date', '2026-01-01 08:00:00')).replace(' ', 'T') + 'Z',
            "updatedAt": str(p.get('post_modified', '2026-08-20 10:00:00')).replace(' ', 'T') + 'Z'
        }
        products_list.append(product_obj)

print(f"Transformed {len(products_list)} active products!")
print(f"Transformed {len(categories_map)} categories!")

# Write output files
os.makedirs("data", exist_ok=True)

with open("data/products.json", "w", encoding="utf-8") as f:
    json.dump(products_list, f, indent=2)

if categories_map:
    with open("data/categories.json", "w", encoding="utf-8") as f:
        json.dump(list(categories_map.values()), f, indent=2)

print("Migration script executed successfully!")
