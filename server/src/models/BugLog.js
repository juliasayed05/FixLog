import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true, trim: true, maxlength: 5000 },
  createdAt: { type: Date, default: Date.now },
}, { _id: true });

const bugLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 150 },
  description: { type: String, required: true, trim: true, maxlength: 30000 },
  rootCause: { type: String, required: true, trim: true, maxlength: 30000 },
  fix: { type: String, required: true, trim: true, maxlength: 30000 },
  status: { type: String, enum: ['Open', 'In Progress', 'Resolved', 'Archived'], default: 'Open', index: true },
  severity: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Medium', index: true },
  techTags: { type: [{ type: String, trim: true, maxlength: 40 }], default: [] },
  timeSpentMinutes: { type: Number, min: 0, max: 100000, default: 0 },
  gitCommitRef: { type: String, trim: true, maxlength: 500, default: '' },
  comments: { type: [commentSchema], default: [] },
}, { timestamps: true });

bugLogSchema.index({ title: 'text', description: 'text', rootCause: 'text', fix: 'text', techTags: 'text' });
bugLogSchema.index({ status: 1, severity: 1, updatedAt: -1 });
bugLogSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('BugLog', bugLogSchema);
