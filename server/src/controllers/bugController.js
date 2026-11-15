import mongoose from 'mongoose';
import BugLog from '../models/BugLog.js';
import AuditLog from '../models/AuditLog.js';
import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../utils/httpError.js';
import { writeAudit } from '../utils/audit.js';
import { getVisibleBugFilter } from '../utils/teamAccess.js';

const STATUSES = ['Open', 'In Progress', 'Resolved', 'Archived'];
const SEVERITIES = ['Low', 'Medium', 'High', 'Critical'];
const safePopulate = { path: 'userId', select: 'name email avatar role' };
const commentPopulate = { path: 'comments.userId', select: 'name avatar role' };
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function canEdit(req, bug) {
  return ['Admin', 'Lead'].includes(req.user.role) || bug.userId._id?.toString() === req.user._id.toString() || bug.userId.toString?.() === req.user._id.toString();
}

export const listBugs = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
  const filter = await getVisibleBugFilter(req.user);
  if (req.query.status && STATUSES.includes(req.query.status)) filter.status = req.query.status;
  if (req.query.severity && SEVERITIES.includes(req.query.severity)) filter.severity = req.query.severity;
  if (req.query.tag) filter.techTags = { $in: req.query.tag.split(',').map((tag) => tag.trim()).filter(Boolean) };
  if (req.query.userId && mongoose.isValidObjectId(req.query.userId)) {
    if (filter.userId?.$in) filter.userId = { $in: filter.userId.$in.filter((id) => String(id) === String(req.query.userId)) };
    else filter.userId = req.query.userId;
  }
  if (req.query.search?.trim()) {
    const regex = new RegExp(escapeRegex(req.query.search.trim()).slice(0, 120), 'i');
    filter.$or = [{ title: regex }, { description: regex }, { rootCause: regex }, { fix: regex }, { techTags: regex }];
  }
  const sortOptions = { newest: { createdAt: -1 }, oldest: { createdAt: 1 }, updated: { updatedAt: -1 }, severity: { severity: -1, updatedAt: -1 }, title: { title: 1 } };
  const sort = sortOptions[req.query.sort] || sortOptions.updated;
  const [items, total] = await Promise.all([
    BugLog.find(filter).populate(safePopulate).sort(sort).skip((page - 1) * limit).limit(limit),
    BugLog.countDocuments(filter),
  ]);
  res.json({ success: true, data: { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } } });
});

export const createBug = asyncHandler(async (req, res) => {
  const bug = await BugLog.create({ ...req.body, userId: req.user._id });
  await writeAudit({ bugId: bug._id, actorId: req.user._id, action: 'created', summary: `Created “${bug.title}”` });
  await bug.populate(safePopulate);
  res.status(201).json({ success: true, data: { bug } });
});

export const getBugStats = asyncHandler(async (req, res) => {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const visible = await getVisibleBugFilter(req.user);
  const matchStage = Object.keys(visible).length ? [{ $match: { userId: { $in: visible.userId.$in.map((id) => new mongoose.Types.ObjectId(id)) } } }] : [];
  const scopedCount = (extra = {}) => BugLog.countDocuments({ ...visible, ...extra });
  const [overview, statusBreakdown, severityBreakdown, tags, volume, createdPrevious, resolvedPrevious, createdRecent, resolvedCount, recentResolved] = await Promise.all([
    BugLog.aggregate([...matchStage, { $group: { _id: null, total: { $sum: 1 }, timeSpent: { $sum: '$timeSpentMinutes' }, avgTime: { $avg: '$timeSpentMinutes' }, open: { $sum: { $cond: [{ $in: ['$status', ['Open', 'In Progress']] }, 1, 0] } }, resolved: { $sum: { $cond: [{ $eq: ['$status', 'Resolved'] }, 1, 0] } } } }]),
    BugLog.aggregate([...matchStage, { $group: { _id: '$status', value: { $sum: 1 } } }]),
    BugLog.aggregate([...matchStage, { $group: { _id: '$severity', value: { $sum: 1 } } }]),
    BugLog.aggregate([...matchStage, { $unwind: '$techTags' }, { $group: { _id: '$techTags', value: { $sum: 1 } } }, { $sort: { value: -1 } }, { $limit: 5 }]),
    BugLog.aggregate([...matchStage, { $match: { createdAt: { $gte: thirtyDaysAgo } } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, created: { $sum: 1 }, resolved: { $sum: { $cond: [{ $eq: ['$status', 'Resolved'] }, 1, 0] } } } }, { $sort: { _id: 1 } }]),
    scopedCount({ createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } }),
    scopedCount({ status: 'Resolved', updatedAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } }),
    scopedCount({ createdAt: { $gte: thirtyDaysAgo } }),
    scopedCount({ status: 'Resolved' }),
    scopedCount({ status: 'Resolved', updatedAt: { $gte: thirtyDaysAgo } }),
  ]);
  const summary = overview[0] || { total: 0, timeSpent: 0, avgTime: 0, open: 0, resolved: 0 };
  res.json({ success: true, data: {
    overview: { total: summary.total, open: summary.open, resolved: summary.resolved, resolutionRate: summary.total ? Math.round((summary.resolved / summary.total) * 100) : 0, totalDebuggingHours: Number((summary.timeSpent / 60).toFixed(1)), averageDebuggingMinutes: Math.round(summary.avgTime || 0), resolvedLast30Days: recentResolved, resolvedPrevious30Days: resolvedPrevious, createdLast30Days: createdRecent, createdPrevious30Days: createdPrevious, totalResolved: resolvedCount },
    statusBreakdown: statusBreakdown.map((x) => ({ name: x._id, value: x.value })),
    severityBreakdown: severityBreakdown.map((x) => ({ name: x._id, value: x.value })),
    topTags: tags.map((x) => ({ name: x._id, value: x.value })),
    volume: volume.map((x) => ({ date: x._id, created: x.created, resolved: x.resolved })),
  } });
});

export const getBug = asyncHandler(async (req, res) => {
  const visible = await getVisibleBugFilter(req.user);
  const bug = await BugLog.findOne({ _id: req.params.id, ...visible }).populate(safePopulate).populate(commentPopulate);
  if (!bug) throw new HttpError(404, 'Bug log not found.');
  const activity = await AuditLog.find({ bugId: bug._id }).populate('actorId', 'name avatar role').sort({ createdAt: -1 }).limit(30);
  res.json({ success: true, data: { bug, activity } });
});

export const updateBug = asyncHandler(async (req, res) => {
  const visible = await getVisibleBugFilter(req.user);
  const bug = await BugLog.findOne({ _id: req.params.id, ...visible });
  if (!bug) throw new HttpError(404, 'Bug log not found.');
  const statusOnly = Object.keys(req.body).length > 0 && Object.keys(req.body).every((key) => key === 'status');
  if (!canEdit(req, bug) && !statusOnly) throw new HttpError(403, 'Only the creator, a Lead, or an Admin can edit bug details. Teammates may still change workflow status.');
  const allowed = ['title', 'description', 'rootCause', 'fix', 'status', 'severity', 'techTags', 'timeSpentMinutes', 'gitCommitRef'];
  const changes = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined && JSON.stringify(bug[key]) !== JSON.stringify(req.body[key])) {
      changes[key] = { from: bug[key], to: req.body[key] };
      bug[key] = req.body[key];
    }
  }
  if (!Object.keys(changes).length) return res.json({ success: true, data: { bug } });
  await bug.save();
  const statusChanged = Boolean(changes.status);
  await writeAudit({ bugId: bug._id, actorId: req.user._id, action: statusChanged ? 'status_changed' : 'updated', summary: statusChanged ? `Moved “${bug.title}” to ${bug.status}` : `Updated “${bug.title}”`, changes });
  await bug.populate(safePopulate);
  res.json({ success: true, data: { bug } });
});

export const deleteBug = asyncHandler(async (req, res) => {
  const visible = await getVisibleBugFilter(req.user);
  const bug = await BugLog.findOne({ _id: req.params.id, ...visible });
  if (!bug) throw new HttpError(404, 'Bug log not found.');
  if (!canEdit(req, bug)) throw new HttpError(403, 'Only the creator, a Lead, or an Admin can delete this bug log.');
  const title = bug.title;
  await BugLog.findByIdAndDelete(bug._id);
  await writeAudit({ bugId: bug._id, actorId: req.user._id, action: 'deleted', summary: `Deleted ‘${title}’` });
  res.json({ success: true, message: `Deleted “${title}”.` });
});

export const addComment = asyncHandler(async (req, res) => {
  const visible = await getVisibleBugFilter(req.user);
  const bug = await BugLog.findOne({ _id: req.params.id, ...visible });
  if (!bug) throw new HttpError(404, 'Bug log not found.');
  bug.comments.push({ userId: req.user._id, text: req.body.text });
  await bug.save();
  await writeAudit({ bugId: bug._id, actorId: req.user._id, action: 'comment_added', summary: `Added a note to “${bug.title}”` });
  await bug.populate(safePopulate);
  await bug.populate(commentPopulate);
  res.status(201).json({ success: true, data: { bug } });
});

export const exportBugs = asyncHandler(async (req, res) => {
  const format = String(req.body.format || 'json').toLowerCase();
  if (!['json', 'csv', 'markdown'].includes(format)) throw new HttpError(422, 'Choose JSON, CSV, or Markdown export.');
  const visible = await getVisibleBugFilter(req.user);
  const bugs = await BugLog.find(visible).populate(safePopulate).sort({ createdAt: -1 }).lean();
  const date = new Date().toISOString().slice(0, 10);
  if (format === 'json') {
    res.setHeader('Content-Disposition', `attachment; filename="fixlog-export-${date}.json"`);
    res.type('json').send(JSON.stringify({ exportedAt: new Date().toISOString(), count: bugs.length, bugs }, null, 2));
    return;
  }
  const quote = (value) => {
    let text = String(value ?? '').replace(/\r?\n/g, ' ');
    if (/^[=+@\-\t\r]/.test(text)) text = `'${text}`;
    return `\"${text.replace(/\"/g, '\"\"')}\"`;
  };
  if (format === 'csv') {
    const headers = ['title', 'status', 'severity', 'techTags', 'timeSpentMinutes', 'gitCommitRef', 'createdAt', 'description', 'rootCause', 'fix'];
    const rows = [headers.join(','), ...bugs.map((bug) => headers.map((key) => quote(Array.isArray(bug[key]) ? bug[key].join('; ') : bug[key])).join(','))];
    res.setHeader('Content-Disposition', `attachment; filename="fixlog-export-${date}.csv"`);
    res.type('text/csv').send(rows.join('\n'));
    return;
  }
  const report = [`# FixLog engineering journal`, ``, `Exported ${new Date().toLocaleString()}`, ``, `Total entries: ${bugs.length}`, ...bugs.map((bug) => `\n## ${bug.title}\n\n- **Status:** ${bug.status}\n- **Severity:** ${bug.severity}\n- **Tags:** ${(bug.techTags || []).join(', ')}\n- **Debugging time:** ${bug.timeSpentMinutes} minutes\n\n### Description\n\n${bug.description}\n\n### Root cause\n\n${bug.rootCause}\n\n### Fix\n\n${bug.fix}\n`)].join('\n');
  res.setHeader('Content-Disposition', `attachment; filename="fixlog-report-${date}.md"`);
  res.type('text/markdown').send(report);
});

export const getActivity = asyncHandler(async (req, res) => {
  const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
  const visible = await getVisibleBugFilter(req.user);
  const visibleBugs = await BugLog.find(visible).select('_id');
  const activity = await AuditLog.find({ bugId: { $in: visibleBugs.map((bug) => bug._id) } }).populate('actorId', 'name avatar role').populate('bugId', 'title status severity').sort({ createdAt: -1 }).limit(limit);
  res.json({ success: true, data: { activity } });
});

export const getTeam = asyncHandler(async (req, res) => {
  const visible = await getVisibleBugFilter(req.user);
  const ids = visible.userId?.$in || [req.user._id];
  const members = await User.find({ _id: { $in: ids } }).select('name email role avatar headline bio location timezone website github linkedin skills createdAt').sort({ name: 1 });
  res.json({ success: true, data: { members, connections: Math.max(0, members.length - 1) } });
});
