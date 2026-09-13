import os
import json
import re

sql_file = os.path.join(os.path.dirname(__file__), 'db_import.sql')
print(f"Loading {sql_file}...")

# We will extract: wp_posts, wp_postmeta, wp_terms, wp_term_taxonomy, wp_term_relationships, wp_wc_customer_lookup, wp_users, wp_usermeta, wp_wc_orders

def extract_insert_tuples(sql_path, target_table):
    print(f"Scanning for {target_table}...")
    columns = []
    records = []
    
    table_prefix = f"INSERT INTO `{target_table}`"
    table_prefix_alt = f"INSERT INTO {target_table}"
    
    with open(sql_path, 'r', encoding='utf-8', errors='ignore') as f:
        current_sql = []
        capturing = False
        
        for line in f:
            line_str = line.strip()
            if not capturing:
                if line_str.startswith(table_prefix) or line_str.startswith(table_prefix_alt):
                    capturing = True
                    current_sql = [line]
            else:
                current_sql.append(line)
                if line_str.endswith(';'):
                    capturing = False
                    full_insert = "".join(current_sql)
                    
                    # Parse column names
                    col_match = re.search(rf"INSERT INTO [`\"]?{target_table}[`\"]?\s*\(([^)]+)\)\s*VALUES", full_insert, re.IGNORECASE)
                    if col_match and not columns:
                        columns = [c.strip().strip('`" ') for c in col_match.group(1).split(',')]
                    
                    # Parse values
                    values_start = full_insert.find("VALUES")
                    if values_start != -1:
                        values_text = full_insert[values_start + 6:].rstrip(';\n\r ')
                        
                        # Use regular expression for tuple values
                        # Matches (...)
                        tuple_matches = re.finditer(r"\((?:[^()'\\]|'[^'\\]*(?:\\.[^'\\]*)*')*\)", values_text)
                        for tm in tuple_matches:
                            raw_tuple = tm.group(0)[1:-1]
                            
                            vals = []
                            for item in re.finditer(r"(?:'((?:[^'\\]|\\.)*)'|([^,]+))", raw_tuple):
                                str_val, num_val = item.groups()
                                if str_val is not None:
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
                            
                            if columns and len(vals) == len(columns):
                                records.append(dict(zip(columns, vals)))
                    current_sql = []
                    
    print(f"Extracted {len(records)} records from {target_table}")
    return records

posts = extract_insert_tuples(sql_file, 'wp_posts')
postmeta = extract_insert_tuples(sql_file, 'wp_postmeta')
terms = extract_insert_tuples(sql_file, 'wp_terms')
term_taxonomy = extract_insert_tuples(sql_file, 'wp_term_taxonomy')
term_relationships = extract_insert_tuples(sql_file, 'wp_term_relationships')
customers_lookup = extract_insert_tuples(sql_file, 'wp_wc_customer_lookup')
users = extract_insert_tuples(sql_file, 'wp_users')
usermeta = extract_insert_tuples(sql_file, 'wp_usermeta')

print("\n--- POST TYPES SUMMARY ---")
types_count = {}
statuses_count = {}
for p in posts:
    pt = p.get('post_type')
    ps = p.get('post_status')
    types_count[pt] = types_count.get(pt, 0) + 1
    statuses_count[ps] = statuses_count.get(ps, 0) + 1

print("Post types:", types_count)
print("Post statuses:", statuses_count)
