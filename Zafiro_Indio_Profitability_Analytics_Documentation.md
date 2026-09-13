# ZAFIRO INDIO – PRODUCT COST, GROSS MARGIN & NET PROFIT ANALYTICS DOCUMENTATION

---

## 1. EXECUTIVE SUMMARY & SYSTEM OVERVIEW

The **Zafiro Indio Profitability Analytics System** upgrades the existing product management, order processing, and analytics architecture. Instead of relying on naive pricing formulas (\( \text{Selling Price} - \text{Product Cost} = \text{Profit} \)), this system implements true management cost accounting. 

It tracks unit manufacturing costs, historical cost evolution, item-level order snapshots, direct fulfillment overheads, gateway fees, ad spend, and allocated operating expenses to calculate realized **Gross Profit**, **Gross Margin %**, **Net Profit**, and **Net Margin %** across every product, order, and global catalog metric.

---

## 2. MATHEMATICAL FORMULAS & CALCULATION ENGINE

All calculations are executed centrally within `@/lib/analytics/profitability.ts` to enforce single-source-of-truth mathematical consistency.

### 2.1 Net Realized Revenue
Discounts (item-level discounts and pro-rated cart/coupon discounts) are subtracted from realized selling price rather than MRP:
\[
\text{Net Realized Revenue} = \text{Gross Sales} - \text{Discounts} - \text{Refunds}
\]

### 2.2 Cost of Goods Sold (COGS)
\[
\text{COGS} = \sum (\text{Unit Cost Price Snapshot at Purchase} \times \text{Quantity Sold})
\]

### 2.3 Gross Profit & Gross Margin %
\[
\text{Gross Profit} = \text{Net Realized Revenue} - \text{COGS}
\]
\[
\text{Gross Margin \%} = \left( \frac{\text{Gross Profit}}{\text{Net Realized Revenue}} \right) \times 100
\]

### 2.4 Order & Product Direct Overheads
Direct costs include:
- **Shipping & Courier Logistics Cost** (\( \text{Shipping} \))
- **Payment Gateway / COD Fees** (\( \text{Payment Fee} \))
- **Packaging Cost** (\( \text{Packaging} \))
- **Marketing / Ad Attribution** (\( \text{Marketing} \))
- **Reverse Logistics & Returns** (\( \text{Return Cost} \))
- **Product-Specific Direct Expenses** (\( \text{Product Expenses} \))

### 2.5 Net Profit & Net Margin %
\[
\text{Net Profit} = \text{Gross Profit} - \text{Direct Costs} - \text{Allocated Operating Expenses}
\]
\[
\text{Net Margin \%} = \left( \frac{\text{Net Profit}}{\text{Net Realized Revenue}} \right) \times 100
\]

### 2.6 Break-Even Price Formula
\[
\text{Minimum Break-Even Selling Price} = \text{Unit COGS} + \sum \text{Direct Unit Expenses}
\]

---

## 3. PRODUCT COSTING & COST HISTORY

### 3.1 Cost Input Modes
When adding or updating products (`/admin/products/new` and `/admin/products/[id]`), administrators can choose:
1. **Simple Mode**: Enter a single unit product cost (e.g., ₹850).
2. **Detailed Cost Mode**: Itemize manufacturing costs:
   - Fabric Cost (₹)
   - Printing / Dyeing Cost (₹)
   - Stitching / Labour Cost (₹)
   - Packaging Cost (₹)
   - Other / Miscellaneous Cost (₹)

The system automatically sums detailed components to set `costPrice`. Live previews display initial Gross Profit and Gross Margin % before saving.

### 3.2 Historical Cost Tracking & Order Snapshots
- **Cost History (`data/cost-history.json`)**: When a product's manufacturing cost changes (e.g., ₹850 → ₹920), the system logs an audit entry with `previousCost`, `newCost`, `changedBy`, timestamp, and `reason`.
- **Order Cost Snapshot**: When an order is placed (`/api/admin/orders`), every `OrderItem` records `costPrice` at that exact timestamp, and the `Order` object records an `OrderCostSnapshot`.
- **Accounting Guarantee**: Future updates to a product's manufacturing cost never corrupt past order profitability reports.

---

## 4. EXPENSE MANAGEMENT SYSTEM (`/admin/expenses`)

A dedicated module allows authorized users to manage operational, marketing, and fulfillment overheads.

### 4.1 Expense Classifications
- **Product-Level Expense**: Directly linked to a specific product (e.g., special embroidery or custom dye setup).
- **Order-Level Expense**: Directly linked to an individual order (e.g., courier surge fee).
- **Marketing Expense**: Customer acquisition spend (e.g., Meta Ads ₹50,000).
- **Operating Expense**: General business overhead (e.g., warehouse rent ₹80,000, employee salaries).

### 4.2 Expense Categories
- **Business Expenses**: Rent, Salaries, Electricity, Internet, Software, Office Expenses, Professional Services.
- **Sales & Marketing**: Meta Ads, Google Ads, Influencer Marketing, Agency Fees, Campaign Costs.
- **Fulfillment**: Courier Charges, Packaging Materials, Return Logistics, Exchange Freight.
- **Payment**: Payment Gateway Fees, COD Charges, Bank Transaction Fees.

---

## 5. PROFITABILITY DASHBOARD (`/admin/analytics/profitability`)

The upgraded analytics dashboard features:
1. **Executive Financial Cards**: Net Realized Revenue, Total COGS, Gross Profit & Margin %, Net Profit & Net Margin %.
2. **Overhead Accounting Summary**: Categorized breakdown of operating expenses, marketing spend, courier logistics, gateway fees, return costs, and refunds.
3. **Inventory Cost Valuation**: Displays Total Inventory Units, Inventory Cost Value (COGS), Potential Retail Value, and Potential Gross Profit.
4. **Sortable Product Profitability Table**: Allows sorting by Highest Net Profit, Least Profitable, Highest Gross Profit, Highest Gross Margin, Highest Net Revenue, and Most Sold.
5. **Loss & Margin Alerts**:
   - ⚠️ **Loss-Making Product Alert**: Displayed when Net Profit < ₹0.
   - ⚠️ **Low Margin Warning**: Displayed when Gross Margin < 30%.
6. **Price Simulator & Break-Even Calculator**: Interactive modal for entering selling price, discounts, manufacturing costs, shipping, gateway fees, and ad spend to simulate gross/net margins and compute the minimum break-even selling price.

---

## 6. ORDER PROFITABILITY DETAIL (`/admin/orders/[id]`)

Inside the order detail page, an **Order Profitability Detail** widget displays:
- Gross Order Total, Discounts Applied, Net Realized Revenue.
- Unit COGS at purchase time.
- Gross Profit and Gross Margin %.
- Direct Shipping, Payment Gateway, Packaging, Marketing Attribution, and Other Costs.
- Final Net Profit and Net Margin %.
- Expandable step-by-step mathematical breakdown.
- Loss-Making Order alert (⚠️) if Net Profit is negative.

---

## 7. RBAC PERMISSIONS & AUDIT LOGGING

### 7.1 Permission Matrix
| Action | Super Admin | Admin | Manager | Staff |
| :--- | :---: | :---: | :---: | :---: |
| View Profitability Analytics | ✅ Yes | ✅ Yes | ✅ Yes | ❌ No |
| View Expenses | ✅ Yes | ✅ Yes | 🟡 Limited | ❌ No |
| Record / Edit Expense | ✅ Yes | ✅ Yes | 🟡 Limited | ❌ No |
| Permanent Delete Expense | ✅ **Exclusive** | ❌ Blocked | ❌ Blocked | ❌ Blocked |
| Launch Price Simulator | ✅ Yes | ✅ Yes | ✅ Yes | ❌ No |

### 7.2 Audit Trail Events
All financial operations log structured records into `data/activity-log.json`:
- `CREATE_EXPENSE`: Logged when an expense is recorded.
- `UPDATE_EXPENSE`: Logged when an expense amount or category is modified.
- `PERMANENT_DELETE_EXPENSE`: Logged when Super Admin permanently deletes an expense record (`riskLevel: CRITICAL`).
- `UNAUTHORIZED_DELETE_EXPENSE_ATTEMPT`: Logged when non-Super Admin attempts deletion (`riskLevel: CRITICAL`).

---

## 8. REST APIs REFERENCE

- `GET /api/admin/analytics/profitability`: Returns global financial metrics, catalog product summaries, and itemized order breakdowns.
- `GET /api/admin/expenses`: Returns expense list with optional `category`, `classification`, and `search` query filters.
- `POST /api/admin/expenses`: Creates a new expense record with input validation and audit logging.
- `PUT /api/admin/expenses/[id]`: Updates an existing expense record.
- `DELETE /api/admin/expenses/[id]?role=super_admin`: Permanently deletes an expense (restricted to Super Admin).

---

## 9. VERIFICATION & EMPIRICAL TEST RESULTS

1. **Product Costing Test**: Created King Size Cotton Bedsheet with Price ₹2,499 and Cost ₹850. Verified initial Gross Profit ₹1,649 and Gross Margin 66.0%.
2. **Discount Accounting Test**: Applied ₹500 discount. Verified Net Revenue ₹1,999, Gross Profit ₹1,149, and Gross Margin 57.5%.
3. **Expense Integration Test**: Added Shipping ₹120, Gateway Fee ₹50, Marketing ₹200. Verified Net Profit ₹779 and Net Margin 39.0%.
4. **Historical Cost Protection Test**: Updated product cost from ₹850 to ₹950. Verified previous order retained ₹850 cost snapshot while new orders used ₹950.
5. **RBAC & Delete Safeguard Test**: Attempted expense deletion with `admin` role (blocked 403), then executed with `super_admin` role (success 200 with CRITICAL audit log entry).
6. **TypeScript Build Verification**: Executed `npx tsc --noEmit` with 0 type errors across the entire codebase.

---
*Documentation compiled for Zafiro Indio E-Commerce Platform & Admin Dashboard.*
