import mongoose from 'mongoose';
import path from 'node:path';
import { unlink } from 'node:fs/promises';
import User from '../models/User.js';
import BugLog from '../models/BugLog.js';
import AuditLog from '../models/AuditLog.js';
import TeamRequest from '../models/TeamRequest.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../utils/httpError.js';
import { writeAudit } from '../utils/audit.js';

const ROLES = ['Developer', 'Lead', 'Admin'];
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function protectLastAdmin(target) {
  if (target.role !== 'Admin' || target.isSuspended) return;
  const activeAdmins = await User.countDocuments({ role: 'Admin', isSuspended: false });
  if (activeAdmins <= 1) throw new HttpError(409, 'This action is blocked because the account is the last active administrator. Promote another admin first.');
}

function snapshotName(user) {
  return user.name || user.email || 'Deleted user';
}

export const getAdminOverview = asyncHandler(async (_req, res) => {
  const [totalUsers, activeUsers, suspendedUsers, admins, leads, totalBugs, openBugs, criticalBugs, totalAuditEvents, recentActivity, debugging] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ isSuspended: false }),
    User.countDocuments({ isSuspended: true }),
    User.countDocuments({ role: 'Admin', isSuspended: false }),
    User.countDocuments({ role: 'Lead', isSuspended: false }),
    BugLog.countDocuments(),
    BugLog.countDocuments({ status: { $in: ['Open', 'In Progress'] } }),
    BugLog.countDocuments({ severity: 'Critical', status: { $ne: 'Archived' } }),
    AuditLog.countDocuments(),
    AuditLog.find({}).populate('actorId', 'name avatar role').populate('bugId', 'title').sort({ createdAt: -1 }).limit(8).lean(),
    BugLog.aggregate([{ $group: { _id: null, minutes: { $sum: '$timeSpentMinutes' } } }]),
  ]);
  res.json({ success: true, data: {
    users: { total: totalUsers, active: activeUsers, suspended: suspendedUsers, admins, leads },
    issues: { total: totalBugs, active: openBugs, critical: criticalBugs },
    auditEvents: totalAuditEvents,
    debuggingHours: Number(((debugging[0]?.minutes || 0) / 60).toFixed(1)),
    recentActivity,
  } });
});

export const listAdminUsers = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
  const filter = {};
  if (ROLES.includes(req.query.role)) filter.role = req.query.role;
  if (req.query.state === 'suspended') filter.isSuspended = true;
  if (req.query.state === 'active') filter.isSuspended = false;
  if (req.query.search?.trim()) {
    const term = escapeRegex(req.query.search.trim().slice(0, 100));
    const regex = new RegExp(term, 'i');
    filter.$or = [{ name: regex }, { email: regex }];
  }
  const [users, total] = await Promise.all([
    User.find(filter).select('name email role avatar isSuspended suspendedAt suspendedReason createdAt updatedAt lastLoginAt').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    User.countDocuments(filter),
  ]);
  const userIds = users.map((user) => user._id);
  const bugCounts = userIds.length ? await BugLog.aggregate([{ $match: { userId: { $in: userIds } } }, { $group: { _id: '$userId', count: { $sum: 1 } } }]) : [];
  const countMap = new Map(bugCounts.map((item) => [String(item._id), item.count]));
  res.json({ success: true, data: { users: users.map((user) => ({ ...user, bugCount: countMap.get(String(user._id)) || 0 })), pagination: { page, limit, total, pages: Math.ceil(total / limit) } } });
});

export const changeUserRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  if (!mongoose.isValidObjectId(id)) throw new HttpError(400, 'Invalid user identifier.');
  if (!ROLES.includes(role)) throw new HttpError(422, 'Choose Developer, Lead, or Admin.');
  if (String(req.user._id) === id) throw new HttpError(400, 'You cannot change your own administrator role.');
  const target = await User.findById(id);
  if (!target) throw new HttpError(404, 'User not found.');
  if (target.role === role) return res.json({ success: true, data: { user: target } });
  if (target.role === 'Admin' && role !== 'Admin') await protectLastAdmin(target);
  const previousRole = target.role;
  target.role = role;
  await target.save();
  await writeAudit({ actorId: req.user._id, actorName: req.user.name, targetUserId: target._id, targetUserName: snapshotName(target), action: 'admin_user_role_changed', summary: `Changed ${target.name}'s role from ${previousRole} to ${role}`, changes: { role: { from: previousRole, to: role } } });
  res.json({ success: true, data: { user: target } });
});

export const suspendUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new HttpError(400, 'Invalid user identifier.');
  if (String(req.user._id) === id) throw new HttpError(400, 'You cannot suspend your own account.');
  const target = await User.findById(id);
  if (!target) throw new HttpError(404, 'User not found.');
  if (target.isSuspended) return res.json({ success: true, data: { user: target } });
  await protectLastAdmin(target);
  target.isSuspended = true;
  target.suspendedAt = new Date();
  target.suspendedReason = String(req.body.reason || 'Suspended by an administrator').trim().slice(0, 500);
  target.suspendedBy = req.user._id;
  await target.save();
  await writeAudit({ actorId: req.user._id, actorName: req.user.name, targetUserId: target._id, targetUserName: snapshotName(target), action: 'admin_user_suspended', summary: `Suspended ${target.name}'s account`, changes: { reason: target.suspendedReason } });
  res.json({ success: true, data: { user: target }, message: 'Account suspended. Existing sessions are blocked on their next API request.' });
});

export const activateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new HttpError(400, 'Invalid user identifier.');
  const target = await User.findById(id);
  if (!target) throw new HttpError(404, 'User not found.');
  if (!target.isSuspended) return res.json({ success: true, data: { user: target } });
  target.isSuspended = false;
  target.suspendedAt = null;
  target.suspendedReason = '';
  target.suspendedBy = null;
  await target.save();
  await writeAudit({ actorId: req.user._id, actorName: req.user.name, targetUserId: target._id, targetUserName: snapshotName(target), action: 'admin_user_activated', summary: `Restored ${target.name}'s account` });
  res.json({ success: true, data: { user: target }, message: 'Account restored.' });
});

export const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new HttpError(400, 'Invalid user identifier.');
  if (String(req.user._id) === id) throw new HttpError(400, 'You cannot delete your own account while signed in.');
  const target = await User.findById(id);
  if (!target) throw new HttpError(404, 'User not found.');
  await protectLastAdmin(target);
  const targetName = snapshotName(target);
  const avatarFilename = target.avatar?.startsWith('/uploads/') ? path.basename(target.avatar) : '';
  // Remove owned issue records and their comments; preserve audit history with an actor snapshot.
  await BugLog.deleteMany({ userId: target._id });
  await TeamRequest.deleteMany({ $or: [{ senderId: target._id }, { recipientId: target._id }] });
  await BugLog.updateMany({ 'comments.userId': target._id }, { $pull: { comments: { userId: target._id } } });
  await AuditLog.updateMany({ actorId: target._id }, { $set: { actorId: null, actorName: targetName } });
  await AuditLog.updateMany({ targetUserId: target._id }, { $set: { targetUserId: null, targetUserName: targetName } });
  await User.deleteOne({ _id: target._id });
  if (/^avatar-[a-f0-9-]+\.(jpg|png|webp|gif)$/i.test(avatarFilename)) {
    try { await unlink(path.resolve(process.cwd(), 'uploads', avatarFilename)); } catch (error) { if (error.code !== 'ENOENT') console.warn('Could not remove deleted user avatar:', error.message); }
  }
  await writeAudit({ actorId: req.user._id, actorName: req.user.name, targetUserName: targetName, action: 'admin_user_deleted', summary: `Permanently deleted ${targetName}'s account and owned bug logs` });
  res.json({ success: true, message: `Deleted ${targetName}'s account and owned bug logs.` });
});

export const listAdminAudit = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 30));
  const [events, total] = await Promise.all([
    AuditLog.find({}).populate('actorId', 'name email avatar role').populate('bugId', 'title status').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    AuditLog.countDocuments(),
  ]);
  res.json({ success: true, data: { events, pagination: { page, limit, total, pages: Math.ceil(total / limit) } } });
});
