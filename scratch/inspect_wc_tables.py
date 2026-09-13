import os
import json
from parse_sql_fast import extract_insert_tuples, sql_file

product_meta_lookup = extract_insert_tuples(sql_file, 'wp_wc_product_meta_lookup')
print(f"Product Meta Lookup count: {len(product_meta_lookup)}")
if product_meta_lookup:
    print("Sample Product Meta Lookup:", product_meta_lookup[0])

wc_orders = extract_insert_tuples(sql_file, 'wp_wc_orders')
print(f"WC Orders count: {len(wc_orders)}")
if wc_orders:
    print("Sample WC Order:", wc_orders[0])

wc_items = extract_insert_tuples(sql_file, 'wp_woocommerce_order_items')
print(f"WC Order Items count: {len(wc_items)}")
