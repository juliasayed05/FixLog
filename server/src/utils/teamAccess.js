import TeamRequest from '../models/TeamRequest.js';

// Collaboration is opt-in: a teammate can see shared engineering records only
// after the other person accepts their team request. Admins retain workspace-wide access.
export async function getCollaboratorIds(userId) {
  const accepted = await TeamRequest.find({
    status: 'Accepted',
    $or: [{ senderId: userId }, { recipientId: userId }],
  }).select('senderId recipientId').lean();
  const ids = new Set([String(userId)]);
  for (const relation of accepted) {
    ids.add(String(relation.senderId));
    ids.add(String(relation.recipientId));
  }
  return [...ids];
}

export async function getVisibleBugFilter(user) {
  if (user.role === 'Admin') return {};
  return { userId: { $in: await getCollaboratorIds(user._id) } };
}
