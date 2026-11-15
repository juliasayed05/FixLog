import AuditLog from '../models/AuditLog.js';

export async function writeAudit({ bugId = null, actorId = null, actorName = '', targetUserId = null, targetUserName = '', action, summary, changes = {} }) {
  return AuditLog.create({ bugId, actorId, actorName, targetUserId, targetUserName, action, summary, changes });
}
