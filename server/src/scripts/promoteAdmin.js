import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
import { connectDB } from '../config/db.js';

const email = String(process.argv[2] || '').trim().toLowerCase();
if (!email || !email.includes('@')) {
  console.error('Usage: node src/scripts/promoteAdmin.js user@company.com');
  process.exit(1);
}
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('Set a valid JWT_SECRET in the container environment before running this script.');
  process.exit(1);
}

try {
  await connectDB();
  const user = await User.findOne({ email });
  if (!user) {
    console.error(`No FixLog account exists for ${email}. Register that account first, then run this command again.`);
    process.exitCode = 1;
  } else {
    user.role = 'Admin';
    user.isSuspended = false;
    user.suspendedAt = null;
    user.suspendedReason = '';
    user.suspendedBy = null;
    await user.save();
    await AuditLog.create({ actorName: 'System bootstrap', targetUserId: user._id, targetUserName: user.name, action: 'admin_user_role_changed', summary: `Granted the initial Admin role to ${user.name}`, changes: { role: { from: 'Developer', to: 'Admin' } } });
    console.log(`Success: ${email} now has the Admin role. Sign out and sign back in to refresh the account session.`);
  }
} catch (error) {
  console.error('Could not promote account:', error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
