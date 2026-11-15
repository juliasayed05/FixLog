import mongoose from 'mongoose';

const teamRequestSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  message: { type: String, trim: true, maxlength: 500, default: '' },
  status: { type: String, enum: ['Pending', 'Accepted', 'Declined', 'Cancelled'], default: 'Pending', index: true },
  respondedAt: { type: Date, default: null },
}, { timestamps: true });

teamRequestSchema.index({ senderId: 1, recipientId: 1, status: 1 }, { unique: true, partialFilterExpression: { status: 'Pending' } });
teamRequestSchema.index({ recipientId: 1, status: 1, createdAt: -1 });

export default mongoose.model('TeamRequest', teamRequestSchema);
