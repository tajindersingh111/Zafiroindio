import re
import json
import os

sql_file = 'scratch/db_import.sql'
print("Reading SQL dump file...")

with open(sql_file, 'r', encoding='utf-8', errors='ignore') as f:
    sql_text = f.read()

print("File loaded. Searching tables...")

table_matches = re.findall(r'CREATE TABLE [`"]([^`"]+)[`"]', sql_text)
print(f"Total tables found: {len(table_matches)}")
for t in table_matches:
    print(" -", t)
