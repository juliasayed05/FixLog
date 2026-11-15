import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['Developer', 'Lead', 'Admin'], default: 'Developer', index: true },
  avatar: { type: String, trim: true, default: '' },
  headline: { type: String, trim: true, maxlength: 120, default: '' },
  bio: { type: String, trim: true, maxlength: 1000, default: '' },
  location: { type: String, trim: true, maxlength: 100, default: '' },
  timezone: { type: String, trim: true, maxlength: 100, default: '' },
  website: { type: String, trim: true, maxlength: 300, default: '' },
  github: { type: String, trim: true, maxlength: 300, default: '' },
  linkedin: { type: String, trim: true, maxlength: 300, default: '' },
  skills: { type: [{ type: String, trim: true, maxlength: 40 }], default: [] },
  isSuspended: { type: Boolean, default: false, index: true },
  suspendedAt: { type: Date, default: null },
  suspendedReason: { type: String, trim: true, maxlength: 500, default: '' },
  suspendedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  lastLoginAt: { type: Date, default: null },
}, { timestamps: true });

userSchema.set('toJSON', {
  transform(_doc, ret) {
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model('User', userSchema);
