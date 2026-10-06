import { createAuditLog } from "@/lib/db/audit";
import { isSuperAdmin } from "@/lib/auth/rbac";
import { upsertDoc, getDoc, deleteDoc } from "@/lib/db/store";

export type RecycleModule = "products" | "banners" | "categories" | "coupons" | "users" | "content";

export interface RecycleItem {
  id: string;
  originalId: string;
  module: RecycleModule;
  recordName: string;
  deletedBy: string;
  deletedByRole: string;
  deletedAt: string;
  data: any;
  reason?: string;
}

/** Collection each recycle module is restored into. */
const MODULE_COLLECTION: Record<RecycleModule, string> = {
  products: "products",
  banners: "banners",
  categories: "categories",
  coupons: "coupons",
  users: "admin-users",
  content: "content"
};

export async function moveToRecycleBin(params: {
  module: RecycleModule;
  originalId: string;
  recordName: string;
  data: any;
  deletedBy: string;
  deletedByRole: string;
  reason?: string;
}): Promise<RecycleItem> {
  const newTrashItem: RecycleItem = {
    id: `trash-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    originalId: params.originalId,
    module: params.module,
    recordName: params.recordName || params.originalId,
    deletedBy: params.deletedBy,
    deletedByRole: params.deletedByRole,
    deletedAt: new Date().toISOString(),
    data: params.data,
    reason: params.reason || "Soft deleted by user"
  };

  await upsertDoc("recycle-bin", newTrashItem);

  await createAuditLog({
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

type Actor = { id?: string; email?: string; role?: string };

export async function restoreFromRecycleBin(trashId: string, superAdminUser: Actor) {
  if (!isSuperAdmin(superAdminUser.role || "")) {
    return { success: false as const, error: "Only Super Admin can restore deleted items." };
  }

  const item = await getDoc<RecycleItem>("recycle-bin", trashId);
  if (!item) return { success: false as const, error: "Recycle bin item not found." };

  // Actually put the record back (the old implementation only deleted the bin entry).
  const target = MODULE_COLLECTION[item.module];
  if (item.data && typeof item.data === "object" && (item.data as { id?: string }).id) {
    await upsertDoc(target, item.data as { id: string });
  }
  await deleteDoc("recycle-bin", trashId);

  await createAuditLog({
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

  return { success: true as const, message: `${item.recordName} restored successfully.` };
}

export async function permanentlyDeleteFromRecycleBin(trashId: string, superAdminUser: Actor) {
  if (!isSuperAdmin(superAdminUser.role || "")) {
    return { success: false as const, error: "Only Super Admin can permanently delete items." };
  }

  const target = await getDoc<RecycleItem>("recycle-bin", trashId);
  if (!target) return { success: false as const, error: "Recycle bin item not found." };
  await deleteDoc("recycle-bin", trashId);

  await createAuditLog({
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

  return { success: true as const, message: `${target.recordName} permanently deleted.` };
}
