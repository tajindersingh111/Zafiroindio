import { readCollection, writeCollection } from "../lib/db/store.ts";
import { normalizeRole, isSuperAdmin, canUserDelete } from "../lib/auth/rbac.ts";

async function runSecurityAudit() {
  console.log("==================================================");
  console.log("       ZAFIRO INDIO SECURITY & RBAC AUDIT        ");
  console.log("==================================================");

  let passed = 0;
  let failed = 0;

  // Test 1: Role Normalization
  console.log("\n[TEST 1] Testing Role Normalization & Hierarchy...");
  if (
    normalizeRole("super_admin") === "super_admin" &&
    normalizeRole("Super Admin") === "super_admin" &&
    normalizeRole("Admin") === "admin" &&
    normalizeRole("order_manager") === "manager"
  ) {
    console.log("  ✓ PASS: Role normalization accurate across casings.");
    passed++;
  } else {
    console.log("  ✗ FAIL: Role normalization mismatch.");
    failed++;
  }

  // Test 2: Exclusive Super Admin Delete Permission
  console.log("\n[TEST 2] Testing Delete Permission Enforcement...");
  const saCanDelete = canUserDelete("super_admin");
  const adminCanDelete = canUserDelete("admin");
  const mgrCanDelete = canUserDelete("manager");
  const staffCanDelete = canUserDelete("staff");

  if (saCanDelete === true && adminCanDelete === false && mgrCanDelete === false && staffCanDelete === false) {
    console.log("  ✓ PASS: DELETE permission is strictly restricted to Super Admin ONLY!");
    passed++;
  } else {
    console.log("  ✗ FAIL: Non-Super Admin role returned delete permission.");
    failed++;
  }

  // Test 3: Verify Admin Users DB Structure
  console.log("\n[TEST 3] Verifying Admin Users in Database...");
  const users = readCollection("admin-users");
  const superAdmins = users.filter((u) => isSuperAdmin(u.role));
  console.log(`  Total Users: ${users.length} | Super Admins: ${superAdmins.length}`);

  if (superAdmins.length > 0) {
    console.log(`  ✓ PASS: Found primary Super Admin account (${superAdmins[0].email}).`);
    passed++;
  } else {
    console.log("  ✗ FAIL: No Super Admin account found in database.");
    failed++;
  }

  // Test 4: Verify Security Audit Trail Log
  console.log("\n[TEST 4] Verifying Security Audit Log System...");
  const logs = readCollection("activity-log");
  console.log(`  Total Audit Log Entries: ${logs.length}`);
  if (Array.isArray(logs)) {
    console.log("  ✓ PASS: Activity log file initialized and accessible.");
    passed++;
  } else {
    console.log("  ✗ FAIL: Activity log store corrupted.");
    failed++;
  }

  console.log("\n==================================================");
  console.log(`AUDIT RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log("==================================================");
}

runSecurityAudit().catch(console.error);
