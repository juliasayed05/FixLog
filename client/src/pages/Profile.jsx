import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight, Camera, Check, Github, Globe2, Linkedin, LockKeyhole,
  MapPin, Save, ShieldCheck, Sparkles, Trash2, UserRound, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '../api/services.js';
import { useAuth } from '../context/AuthContext.jsx';
import { errorMessage, initials, shortDate } from '../utils/format.js';

const emptyProfile = {
  name: '', headline: '', bio: '', location: '', timezone: '',
  website: '', github: '', linkedin: '', skills: [],
};

function Avatar({ user, size = 'large' }) {
  return <div className={`profile-avatar profile-avatar-${size}`}>
    {user?.avatar ? <img src={user.avatar} alt={`${user.name || 'Profile'} avatar`} /> : <span>{initials(user?.name)}</span>}
  </div>;
}

function Field({ label, hint, children }) {
  return <div className="profile-field"><label>{label}</label>{children}{hint && <small>{hint}</small>}</div>;
}

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [form, setForm] = useState(emptyProfile);
  const [skillDraft, setSkillDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const fileRef = useRef(null);

  useEffect(() => {
    setForm({
      name: user?.name || '', headline: user?.headline || '', bio: user?.bio || '',
      location: user?.location || '', timezone: user?.timezone || '',
      website: user?.website || '', github: user?.github || '', linkedin: user?.linkedin || '',
      skills: user?.skills || [],
    });
  }, [user]);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const completion = useMemo(() => {
    const fields = [form.name, form.headline, form.bio, form.location, form.timezone, form.skills.length, user?.avatar];
    return Math.round((fields.filter(Boolean).length / fields.length) * 100);
  }, [form, user?.avatar]);

  function update(key, value) { setForm((current) => ({ ...current, [key]: value })); }

  function addSkill(event) {
    event.preventDefault();
    const value = skillDraft.trim().replace(/\s+/g, ' ');
    if (!value) return;
    if (form.skills.some((skill) => skill.toLowerCase() === value.toLowerCase())) {
      toast('That skill is already on your profile.');
      return;
    }
    if (form.skills.length >= 20) { toast.error('You can add up to 20 skills.'); return; }
    update('skills', [...form.skills, value]);
    setSkillDraft('');
  }

  function choosePhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      toast.error('Choose a JPG, PNG, WebP, or GIF image.'); event.target.value = ''; return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Your photo must be smaller than 2 MB.'); event.target.value = ''; return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  }

  async function uploadPhoto() {
    if (!photo) return;
    setUploading(true);
    try {
      const data = new FormData();
      data.append('avatar', photo);
      await authApi.uploadAvatar(data);
      await refreshUser();
      setPhoto(null);
      setPreview('');
      if (fileRef.current) fileRef.current.value = '';
      toast.success('Profile photo updated.');
    } catch (error) { toast.error(errorMessage(error)); }
    finally { setUploading(false); }
  }

  async function removePhoto() {
    if (!user?.avatar) return;
    try { await authApi.deleteAvatar(); await refreshUser(); setPhoto(null); setPreview(''); toast.success('Profile photo removed.'); }
    catch (error) { toast.error(errorMessage(error)); }
  }

  async function saveProfile(event) {
    event.preventDefault();
    if (newPassword && newPassword !== confirmPassword) { toast.error('The new password and confirmation do not match.'); return; }
    if (newPassword && !currentPassword) { toast.error('Enter your current password to change it.'); return; }
    setSaving(true);
    try {
      await authApi.updateProfile({ ...form, currentPassword: currentPassword || undefined, newPassword: newPassword || undefined });
      await refreshUser();
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      toast.success('Your profile has been saved.');
    } catch (error) { toast.error(errorMessage(error)); }
    finally { setSaving(false); }
  }

  return <div className="page-content profile-page animate-fade-in">
    <section className="profile-hero panel">
      <div className="profile-hero-main">
        <div className="profile-photo-wrap">
          {preview ? <div className="profile-avatar profile-avatar-large"><img src={preview} alt="Selected profile preview" /></div> : <Avatar user={user} />}
          <button className="profile-camera-button" type="button" onClick={() => fileRef.current?.click()} aria-label="Choose profile photo"><Camera size={15} /></button>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={choosePhoto} />
        </div>
        <div className="profile-hero-copy">
          <span className="profile-kicker"><Sparkles size={13} /> YOUR DEVELOPER IDENTITY</span>
          <h2>{user?.name || 'Your profile'}</h2>
          <p>{form.headline || 'Add a role or a short introduction to help teammates know what you work on.'}</p>
          <div className="profile-hero-meta"><span><ShieldCheck size={13} /> {user?.role || 'Developer'}</span>{user?.createdAt && <span>Member since {shortDate(user.createdAt)}</span>}</div>
        </div>
      </div>
      <div className="profile-completion">
        <div className="profile-completion-top"><span>Profile completeness</span><strong>{completion}%</strong></div>
        <div className="profile-progress"><span style={{ width: `${completion}%` }} /></div>
        <small>A complete profile helps teammates understand your experience.</small>
      </div>
      {photo && <div className="profile-photo-pending"><span>New photo selected · {(photo.size / 1024).toFixed(0)} KB</span><div><button className="button-secondary" type="button" onClick={() => { setPhoto(null); setPreview(''); if (fileRef.current) fileRef.current.value = ''; }}>Cancel</button><button className="button-primary" type="button" disabled={uploading} onClick={uploadPhoto}>{uploading ? 'Uploading…' : 'Upload photo'}</button></div></div>}
      {user?.avatar && !photo && <button className="profile-remove-photo" type="button" onClick={removePhoto}><Trash2 size={13} /> Remove current photo</button>}
    </section>

    <form className="profile-form-layout" onSubmit={saveProfile}>
      <div className="profile-form-main">
        <section className="panel profile-section">
          <div className="profile-section-heading"><div className="profile-section-icon"><UserRound size={16} /></div><div><h3>Personal information</h3><p>Make your profile recognizable to the people you work with.</p></div></div>
          <div className="profile-fields-grid">
            <Field label="Full name"><input className="input-control" value={form.name} onChange={(event) => update('name', event.target.value)} minLength={2} maxLength={80} required placeholder="Your name" /></Field>
            <Field label="Professional headline" hint="For example: Full-stack developer · Java & Node.js"><input className="input-control" value={form.headline} onChange={(event) => update('headline', event.target.value)} maxLength={120} placeholder="What do you do?" /></Field>
            <Field label="Email address" hint="Your sign-in email cannot be changed here"><input className="input-control input-readonly" value={user?.email || ''} readOnly /></Field>
            <Field label="Location"><div className="profile-input-icon"><MapPin size={14} /><input className="input-control" value={form.location} onChange={(event) => update('location', event.target.value)} maxLength={100} placeholder="City, country" /></div></Field>
            <Field label="Timezone"><input className="input-control" value={form.timezone} onChange={(event) => update('timezone', event.target.value)} maxLength={100} placeholder="e.g. Asia/Kolkata" /></Field>
            <Field label="Account role"><input className="input-control input-readonly" value={user?.role || 'Developer'} readOnly /></Field>
            <div className="profile-field profile-field-full"><Field label="About you" hint="A short introduction, areas you enjoy working on, or what teammates can ask you about."><textarea className="input-control profile-bio-input" value={form.bio} onChange={(event) => update('bio', event.target.value)} maxLength={1000} rows={5} placeholder="Tell your team a little about yourself…" /></Field></div>
          </div>
        </section>

        <section className="panel profile-section">
          <div className="profile-section-heading"><div className="profile-section-icon"><Sparkles size={16} /></div><div><h3>Skills & technologies</h3><p>Add the tools, languages, and areas you are comfortable working with.</p></div></div>
          <div className="profile-skill-list">{form.skills.map((skill) => <span className="profile-skill-chip" key={skill}>{skill}<button type="button" aria-label={`Remove ${skill}`} onClick={() => update('skills', form.skills.filter((item) => item !== skill))}><X size={12} /></button></span>)}{!form.skills.length && <span className="profile-skill-empty">No skills added yet.</span>}</div>
          <div className="profile-add-skill"><input className="input-control" value={skillDraft} onChange={(event) => setSkillDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') addSkill(event); }} maxLength={40} placeholder="Add a skill, e.g. React" /><button className="button-secondary" type="button" onClick={addSkill}>Add skill</button></div>
          <small className="profile-help">Up to 20 skills. Press Enter or select Add skill.</small>
        </section>

        <section className="panel profile-section">
          <div className="profile-section-heading"><div className="profile-section-icon"><Globe2 size={16} /></div><div><h3>Links & portfolio</h3><p>Share the places where teammates can find your work.</p></div></div>
          <div className="profile-fields-grid">
            <Field label="Personal website"><div className="profile-input-icon"><Globe2 size={14} /><input className="input-control" type="url" value={form.website} onChange={(event) => update('website', event.target.value)} placeholder="https://your-website.com" /></div></Field>
            <Field label="GitHub"><div className="profile-input-icon"><Github size={14} /><input className="input-control" type="url" value={form.github} onChange={(event) => update('github', event.target.value)} placeholder="https://github.com/username" /></div></Field>
            <Field label="LinkedIn"><div className="profile-input-icon"><Linkedin size={14} /><input className="input-control" type="url" value={form.linkedin} onChange={(event) => update('linkedin', event.target.value)} placeholder="https://linkedin.com/in/username" /></div></Field>
          </div>
          <div className="profile-public-links">{form.website && <a href={form.website} target="_blank" rel="noreferrer">Website <ArrowUpRight size={12} /></a>}{form.github && <a href={form.github} target="_blank" rel="noreferrer">GitHub <ArrowUpRight size={12} /></a>}{form.linkedin && <a href={form.linkedin} target="_blank" rel="noreferrer">LinkedIn <ArrowUpRight size={12} /></a>}</div>
        </section>
      </div>

      <aside className="profile-form-side">
        <section className="panel profile-section profile-security-card">
          <div className="profile-section-heading"><div className="profile-section-icon"><LockKeyhole size={16} /></div><div><h3>Security</h3><p>Update your sign-in password.</p></div></div>
          <Field label="Current password"><input className="input-control" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} placeholder="Current password" /></Field>
          <Field label="New password" hint="At least 8 characters"><input className="input-control" type="password" autoComplete="new-password" minLength={8} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="New password" /></Field>
          <Field label="Confirm new password"><input className="input-control" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Repeat new password" /></Field>
          <div className="profile-security-note"><ShieldCheck size={14} /> Leave both fields empty to keep your current password.</div>
        </section>
        <section className="panel profile-section profile-tip-card"><div className="profile-section-icon"><Check size={16} /></div><strong>Your profile is yours</strong><p>Your email and password are private. Your name, avatar, headline, bio, location, and skills are visible to approved teammates.</p></section>
        <button className="button-primary profile-save-button" type="submit" disabled={saving}><Save size={15} /> {saving ? 'Saving changes…' : 'Save profile changes'}</button>
      </aside>
    </form>
  </div>;
}
