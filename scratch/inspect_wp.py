from migrate_wordpress import parse_inserts, sql_file

with open(sql_file, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

posts = parse_inserts("wp_posts", content)
types = {}
statuses = {}
for p in posts:
    t = p.get('post_type')
    s = p.get('post_status')
    types[t] = types.get(t, 0) + 1
    statuses[s] = statuses.get(s, 0) + 1

print("Post Types:", types)
print("Post Statuses:", statuses)

print("\nSample Post:", posts[0] if posts else "None")
