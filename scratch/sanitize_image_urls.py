import json
import urllib.parse

print("Sanitizing product image URLs in data/products.json...")

with open('data/products.json', 'r', encoding='utf-8') as f:
    products = json.load(f)

fallback_img = "https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=1200&q=85"

fixed_count = 0
for p in products:
    images = p.get('images', [])
    new_images = []
    
    for img in images:
        if not img or not isinstance(img, str):
            continue
        
        # Clean & URL encode special characters like unicode double quotes (″)
        cleaned = img.strip()
        # Ensure URL is properly encoded for browser <img> tags
        encoded = urllib.parse.quote(cleaned, safe=':/?&=%-._~')
        new_images.append(encoded)

    if not new_images:
        new_images = [fallback_img]

    p['images'] = new_images
    fixed_count += 1

with open('data/products.json', 'w', encoding='utf-8') as f:
    json.dump(products, f, indent=2)

print(f"Sanitized image URLs for {fixed_count} products!")
