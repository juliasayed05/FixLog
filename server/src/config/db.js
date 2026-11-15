import mongoose from 'mongoose';
import User from '../models/User.js';
import BugLog from '../models/BugLog.js';
import AuditLog from '../models/AuditLog.js';

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required. Add it to server/.env.');
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, {
    autoIndex: process.env.NODE_ENV !== 'production',
    serverSelectionTimeoutMS: 10000,
  });
  // Backfill suspension defaults for accounts created before the admin controls existed.
  await User.updateMany({ isSuspended: { $exists: false } }, { $set: { isSuspended: false, suspendedAt: null, suspendedReason: '', suspendedBy: null } });
  await Promise.all([User.createIndexes(), BugLog.createIndexes(), AuditLog.createIndexes()]);
  console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
}
