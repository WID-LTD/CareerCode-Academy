import { query } from '../config/db';

export interface AuditEntry {
  adminId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
}

export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    await query(
      `INSERT INTO audit_logs (admin_id, action, resource_type, resource_id, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [entry.adminId, entry.action, entry.resourceType, entry.resourceId, entry.details || null, entry.ipAddress || null, entry.userAgent || null]
    );
  } catch (error) {
    console.error('Failed to log audit:', error);
  }
}
