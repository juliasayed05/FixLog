import mongoose from 'mongoose';
import User from '../models/User.js';
import TeamRequest from '../models/TeamRequest.js';
import AuditLog from '../models/AuditLog.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../utils/httpError.js';
import { getCollaboratorIds } from '../utils/teamAccess.js';

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const personFields = 'name email role avatar headline skills createdAt';
const connectedPersonFields = `${personFields} bio location timezone website github linkedin`;
const populatePeople = [
  { path: 'senderId', select: personFields },
  { path: 'recipientId', select: personFields },
];

function personFromRequest(request, userId, side) {
  const other = String(request.senderId?._id) === String(userId) ? request.recipientId : request.senderId;
  return { ...request.toObject(), person: other, side };
}

export const getTeamDirectory = asyncHandler(async (req, res) => {
  const search = String(req.query.search || '').trim().slice(0, 80);
  if (search.length < 2) return res.json({ success: true, data: { people: [] } });
  const regex = new RegExp(escapeRegex(search), 'i');
  const people = await User.find({
    _id: { $ne: req.user._id },
    isSuspended: false,
    $or: [{ name: regex }, { email: regex }, { headline: regex }, { skills: regex }],
  }).select(personFields).sort({ name: 1 }).limit(12).lean();

  const ids = people.map((person) => person._id);
  const relations = ids.length ? await TeamRequest.find({
    status: { $in: ['Pending', 'Accepted'] },
    $or: [
      { senderId: req.user._id, recipientId: { $in: ids } },
      { recipientId: req.user._id, senderId: { $in: ids } },
    ],
  }).select('senderId recipientId status').lean() : [];
  const relationByPerson = new Map();
  for (const relation of relations) {
    const otherId = String(relation.senderId) === String(req.user._id) ? String(relation.recipientId) : String(relation.senderId);
    relationByPerson.set(otherId, relation.status === 'Accepted' ? 'Connected' : (String(relation.senderId) === String(req.user._id) ? 'Sent' : 'Received'));
  }
  res.json({ success: true, data: { people: people.map((person) => ({ ...person, relation: relationByPerson.get(String(person._id)) || 'None' })) } });
});

export const getTeamRequests = asyncHandler(async (req, res) => {
  const [incomingDocs, outgoingDocs] = await Promise.all([
    TeamRequest.find({ recipientId: req.user._id, status: 'Pending' }).populate(populatePeople).sort({ createdAt: -1 }),
    TeamRequest.find({ senderId: req.user._id, status: 'Pending' }).populate(populatePeople).sort({ createdAt: -1 }),
  ]);
  const incoming = incomingDocs.map((item) => personFromRequest(item, req.user._id, 'incoming'));
  const outgoing = outgoingDocs.map((item) => personFromRequest(item, req.user._id, 'outgoing'));
  res.json({ success: true, data: { incoming, outgoing } });
});

export const sendTeamRequest = asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (email === req.user.email.toLowerCase()) throw new HttpError(400, 'You cannot send a team request to yourself.');
  const recipient = await User.findOne({ email, isSuspended: false }).select('_id name email');
  if (!recipient) throw new HttpError(404, 'No active FixLog account was found for that email. Ask them to create an account first.');
  const existing = await TeamRequest.findOne({
    status: { $in: ['Pending', 'Accepted'] },
    $or: [
      { senderId: req.user._id, recipientId: recipient._id },
      { senderId: recipient._id, recipientId: req.user._id },
    ],
  });
  if (existing?.status === 'Accepted') throw new HttpError(409, 'You are already connected.');
  if (existing?.status === 'Pending') throw new HttpError(409, 'A team request between these accounts is already waiting for a response.');
  const request = await TeamRequest.create({ senderId: req.user._id, recipientId: recipient._id, message: req.body.message || '' });
  await request.populate(populatePeople);
  await AuditLog.create({ actorId: req.user._id, actorName: req.user.name, targetUserId: recipient._id, targetUserName: recipient.name, action: 'team_request_sent', summary: `${req.user.name} invited ${recipient.name} to connect on FixLog` });
  res.status(201).json({ success: true, data: { request }, message: 'Request sent. They will only join your team if they accept it.' });
});

export const respondToTeamRequest = asyncHandler(async (req, res) => {
  if (!['accept', 'decline'].includes(req.params.action)) throw new HttpError(404, 'Unknown request action.');
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, 'Invalid request identifier.');
  const request = await TeamRequest.findOne({ _id: req.params.id, recipientId: req.user._id, status: 'Pending' }).populate(populatePeople);
  if (!request) throw new HttpError(404, 'This request is no longer pending or does not belong to you.');
  request.status = req.params.action === 'accept' ? 'Accepted' : 'Declined';
  request.respondedAt = new Date();
  await request.save();
  const sender = request.senderId;
  await AuditLog.create({ actorId: req.user._id, actorName: req.user.name, targetUserId: sender._id, targetUserName: sender.name, action: req.params.action === 'accept' ? 'team_request_accepted' : 'team_request_declined', summary: `${req.user.name} ${req.params.action}ed ${sender.name}'s team request` });
  res.json({ success: true, data: { request }, message: req.params.action === 'accept' ? 'You are now connected. Shared engineering records are available.' : 'Request declined.' });
});

export const cancelTeamRequest = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, 'Invalid request identifier.');
  const request = await TeamRequest.findOne({ _id: req.params.id, senderId: req.user._id, status: 'Pending' });
  if (!request) throw new HttpError(404, 'Pending request not found.');
  request.status = 'Cancelled';
  request.respondedAt = new Date();
  await request.save();
  res.json({ success: true, message: 'Team request cancelled.' });
});

export const getConnections = asyncHandler(async (req, res) => {
  const ids = await getCollaboratorIds(req.user._id);
  const members = await User.find({ _id: { $in: ids } }).select(connectedPersonFields).sort({ name: 1 }).lean();
  res.json({ success: true, data: { members, connections: Math.max(0, members.length - 1) } });
});


export const removeConnection = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.userId)) throw new HttpError(400, 'Invalid teammate identifier.');
  const teammate = await User.findById(req.params.userId).select('_id name');
  if (!teammate) throw new HttpError(404, 'Teammate not found.');
  const relation = await TeamRequest.findOne({
    status: 'Accepted',
    $or: [
      { senderId: req.user._id, recipientId: teammate._id },
      { senderId: teammate._id, recipientId: req.user._id },
    ],
  });
  if (!relation) throw new HttpError(404, 'This person is not currently connected to you.');
  relation.status = 'Cancelled';
  relation.respondedAt = new Date();
  await relation.save();
  await AuditLog.create({ actorId: req.user._id, actorName: req.user.name, targetUserId: teammate._id, targetUserName: teammate.name, action: 'team_connection_removed', summary: `${req.user.name} removed ${teammate.name} from their team connections` });
  res.json({ success: true, message: `You are no longer connected to ${teammate.name}. Their private issue history is no longer shared with you.` });
});
