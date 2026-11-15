import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HttpError } from '../utils/httpError.js';

const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.COOKIE_SECURE === 'true' || (process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'false'),
  sameSite: process.env.COOKIE_SAME_SITE || 'lax',
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000,
});

function issueSession(user, res) {
  const token = jwt.sign({ sub: user._id.toString(), role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
  res.cookie('fixlog_token', token, cookieOptions());
}

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const exists = await User.exists({ email: email.toLowerCase() });
  if (exists) throw new HttpError(409, 'An account with this email already exists.');
  const rounds = Math.max(10, Math.min(14, Number(process.env.BCRYPT_ROUNDS) || 12));
  const hashed = await bcrypt.hash(password, rounds);
  const user = await User.create({ name, email, password: hashed });
  issueSession(user, res);
  res.status(201).json({ success: true, data: { user } });
});

export const login = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email.toLowerCase() }).select('+password');
  const valid = user && await bcrypt.compare(req.body.password, user.password);
  if (!valid) throw new HttpError(401, 'Email or password is incorrect.');
  if (user.isSuspended) throw new HttpError(403, 'This account is suspended. Contact a FixLog administrator to restore access.');
  user.lastLoginAt = new Date();
  await user.save();
  issueSession(user, res);
  res.json({ success: true, data: { user } });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { user: req.user } });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const { name, headline, bio, location, timezone, website, github, linkedin, skills, currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');
  if (newPassword) {
    if (!currentPassword || !(await bcrypt.compare(currentPassword, user.password))) throw new HttpError(400, 'Your current password is incorrect.');
    if (newPassword.length < 8) throw new HttpError(422, 'New password must contain at least 8 characters.');
    user.password = await bcrypt.hash(newPassword, Math.max(10, Math.min(14, Number(process.env.BCRYPT_ROUNDS) || 12)));
  }
  if (name !== undefined) user.name = name;
  for (const [key, value] of Object.entries({ headline, bio, location, timezone, website, github, linkedin })) {
    if (value !== undefined) user[key] = String(value).trim();
  }
  if (skills !== undefined) {
    if (!Array.isArray(skills)) throw new HttpError(422, 'Skills must be provided as a list.');
    user.skills = [...new Set(skills.map((skill) => String(skill).trim()).filter(Boolean))].slice(0, 20);
  }
  await user.save();
  res.json({ success: true, data: { user } });
});



function detectImage(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpg';
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'png';
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  if (buffer.length >= 6 && ['GIF87a', 'GIF89a'].includes(buffer.toString('ascii', 0, 6))) return 'gif';
  return null;
}

async function removeStoredAvatar(avatar) {
  if (!avatar || !avatar.startsWith('/uploads/')) return;
  const filename = path.basename(avatar);
  if (!/^avatar-[a-f0-9-]+\.(jpg|png|webp|gif)$/i.test(filename)) return;
  try { await unlink(path.resolve(process.cwd(), 'uploads', filename)); } catch (error) { if (error.code !== 'ENOENT') throw error; }
}

export const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) throw new HttpError(400, 'Choose a profile photo to upload.');
  const extension = detectImage(req.file.buffer);
  if (!extension) throw new HttpError(422, 'The selected file is not a supported image. Please choose a JPG, PNG, WebP, or GIF.');
  const uploadsPath = path.resolve(process.cwd(), 'uploads');
  await mkdir(uploadsPath, { recursive: true });
  const filename = `avatar-${randomUUID()}.${extension}`;
  await writeFile(path.join(uploadsPath, filename), req.file.buffer, { flag: 'wx', mode: 0o644 });
  const user = await User.findById(req.user._id);
  const previousAvatar = user.avatar;
  user.avatar = `/uploads/${filename}`;
  await user.save();
  await removeStoredAvatar(previousAvatar);
  res.json({ success: true, data: { user } });
});

export const deleteAvatar = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const previousAvatar = user.avatar;
  user.avatar = '';
  await user.save();
  await removeStoredAvatar(previousAvatar);
  res.json({ success: true, data: { user } });
});

export const logout = asyncHandler(async (_req, res) => {
  res.clearCookie('fixlog_token', { ...cookieOptions(), maxAge: undefined });
  res.json({ success: true, message: 'You have been signed out.' });
});
