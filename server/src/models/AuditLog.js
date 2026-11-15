import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  // Bug references are optional because administrative events can target users or the workspace.
  bugId: { type: mongoose.Schema.Types.ObjectId, ref: 'BugLog', default: null, index: true },
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  actorName: { type: String, trim: true, maxlength: 100, default: '' },
  targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  targetUserName: { type: String, trim: true, maxlength: 100, default: '' },
  action: {
    type: String,
    enum: [
      'created', 'updated', 'status_changed', 'comment_added', 'deleted',
      'admin_user_role_changed', 'admin_user_suspended', 'admin_user_activated',
      'admin_user_deleted', 'admin_bug_deleted',
      'team_request_sent', 'team_request_accepted', 'team_request_declined', 'team_connection_removed',
    ],
    required: true,
  },
  summary: { type: String, required: true, trim: true, maxlength: 300 },
  changes: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: { createdAt: true, updatedAt: false } });

auditLogSchema.index({ createdAt: -1 });
export default mongoose.model('AuditLog', auditLogSchema);
