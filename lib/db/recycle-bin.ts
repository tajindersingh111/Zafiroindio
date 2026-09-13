import { readCollection, writeCollection } from "@/lib/db/store";
import { createAuditLog } from "@/lib/db/audit";
import { isSuperAdmin } from "@/lib/auth/rbac";

export interface RecycleItem {
  id: string;
  originalId: string;
  module: "products" | "banners" | "categories" | "coupons" | "users" | "content";
  recordName: string;
  deletedBy: string;
  deletedByRole: string;
  deletedAt: string;
  data: any;
  reason?: string;
}

/** Move an item to Recycle Bin instead of hard deleting */
export function moveToRecycleBin(params: {
  module: "products" | "banners" | "categories" | "coupons" | "users" | "content";
  originalId: string;
  recordName: string;
  data: any;
  deletedBy: string;
  deletedByRole: string;
  reason?: string;
}): RecycleItem {
  const items = readCollection<RecycleItem>("recycle-bin");
  const newTrashItem: RecycleItem = {
    id: `trash-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
    originalId: params.originalId,
    module: params.module,
    recordName: params.recordName || params.originalId,
    deletedBy: params.deletedBy,
    deletedByRole: params.deletedByRole,
    deletedAt: new Date().toISOString(),
    data: params.data,
    reason: params.reason || "Soft deleted by user"
  };

  items.unshift(newTrashItem);
  writeCollection("recycle-bin", items.slice(0, 500));

  createAuditLog({
    userId: params.deletedBy,
    userName: params.deletedBy,
    userRole: params.deletedByRole,
    action: `SOFT_DELETE_${params.module.toUpperCase()}`,
    module: params.module as any,
    recordId: params.originalId,
    recordName: params.recordName,
    previousData: params.data,
    updatedData: { isDeleted: true, movedToRecycleBin: true },
    riskLevel: "MEDIUM"
  });

  return newTrashItem;
}

/** Super Admin restores an item from Recycle Bin */
export function restoreFromRecycleBin(trashId: string, superAdminUser: { id?: string; email?: string; role?: string }) {
  if (!isSuperAdmin(superAdminUser.role || "")) {
    return { success: false, error: "Only Super Admin can restore deleted items." };
  }

  const trashItems = readCollection<RecycleItem>("recycle-bin");
  const targetIdx = trashItems.findIndex((t) => t.id === trashId);
  if (targetIdx < 0) return { success: false, error: "Recycle bin item not found." };

  const item = trashItems[targetIdx];
  const collectionName = item.module === "content" ? "banners" : item.module;

  // Restore back to database collection
  const dbRecords = readCollection<any>(collectionName);
  const exists = dbRecords.some((r: any) => r.id === item.originalId);
  if (!exists) {
    dbRecords.push(item.data);
    writeCollection(collectionName, dbRecords);
  }

  // Remove from trash
  trashItems.splice(targetIdx, 1);
  writeCollection("recycle-bin", trashItems);

  createAuditLog({
    userId: superAdminUser.id,
    userName: superAdminUser.email,
    userRole: superAdminUser.role,
    action: `RESTORE_${item.module.toUpperCase()}`,
    module: item.module as any,
    recordId: item.originalId,
    recordName: item.recordName,
    previousData: { status: "deleted_in_recycle_bin" },
    updatedData: item.data,
    riskLevel: "HIGH"
  });

  return { success: true, message: `${item.recordName} restored successfully.` };
}

/** Super Admin permanently deletes item from Recycle Bin */
export function permanentlyDeleteFromRecycleBin(trashId: string, superAdminUser: { id?: string; email?: string; role?: string }) {
  if (!isSuperAdmin(superAdminUser.role || "")) {
    return { success: false, error: "Only Super Admin can permanently delete items." };
  }

  let trashItems = readCollection<RecycleItem>("recycle-bin");
  const target = trashItems.find((t) => t.id === trashId);
  if (!target) return { success: false, error: "Recycle bin item not found." };

  trashItems = trashItems.filter((t) => t.id !== trashId);
  writeCollection("recycle-bin", trashItems);

  createAuditLog({
    userId: superAdminUser.id,
    userName: superAdminUser.email,
    userRole: superAdminUser.role,
    action: `PERMANENT_DELETE_${target.module.toUpperCase()}`,
    module: target.module as any,
    recordId: target.originalId,
    recordName: target.recordName,
    previousData: target.data,
    updatedData: null,
    riskLevel: "CRITICAL"
  });

  return { success: true, message: `${target.recordName} permanently deleted.` };
}
