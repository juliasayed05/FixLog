import { useEffect, useState } from 'react';
import { Code2, Eye, FileText, Plus, Save, X } from 'lucide-react';
import Modal from './Modal.jsx';
import Markdown from './Markdown.jsx';
import { SEVERITIES, STATUSES, TECH_OPTIONS } from '../utils/constants.js';

const emptyBug = { title: '', description: '', rootCause: '', fix: '', status: 'Open', severity: 'Medium', techTags: [], timeSpentMinutes: 0, gitCommitRef: '' };

function EditorField({ label, value, onChange, rows = 4, hint }) {
  const [preview, setPreview] = useState(false);
  return (
    <div className="field-block">
      <div className="field-label-row"><label>{label}</label><button type="button" className="subtle-action" onClick={() => setPreview((current) => !current)}>{preview ? <FileText size={13} /> : <Eye size={13} />}{preview ? 'Edit' : 'Preview'}</button></div>
      {preview ? <div className="preview-pane"><Markdown>{value || '*Nothing here yet.*'}</Markdown></div> : <textarea className="input-control editor-input" rows={rows} value={value} onChange={(event) => onChange(event.target.value)} placeholder={`${label}… Use Markdown for formatting and fenced code blocks.`} required />}
      {hint && <p className="field-hint">{hint}</p>}
    </div>
  );
}

export default function BugModal({ open, onClose, onSave, initialValue }) {
  const [form, setForm] = useState(emptyBug);
  const [customTag, setCustomTag] = useState('');
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(initialValue?._id);
  useEffect(() => {
    if (open) setForm(initialValue ? { ...emptyBug, ...initialValue, techTags: initialValue.techTags || [] } : emptyBug);
  }, [open, initialValue]);
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const toggleTag = (tag) => update('techTags', form.techTags.includes(tag) ? form.techTags.filter((item) => item !== tag) : [...form.techTags, tag]);
  const addCustomTag = () => {
    const tag = customTag.trim();
    if (tag && !form.techTags.some((item) => item.toLowerCase() === tag.toLowerCase()) && form.techTags.length < 20) update('techTags', [...form.techTags, tag]);
    setCustomTag('');
  };
  async function submit(event) {
    event.preventDefault(); setSaving(true);
    try { await onSave({ ...form, timeSpentMinutes: Number(form.timeSpentMinutes) || 0, techTags: form.techTags }); onClose(); }
    catch { /* The calling view displays the API error toast. */ }
    finally { setSaving(false); }
  }
  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit bug log' : 'Capture a bug'} subtitle="Document the issue, understand the root cause, and preserve the fix." width="max-w-4xl">
      <form onSubmit={submit} className="bug-form">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_180px_180px]">
          <div className="field-block md:col-span-1"><label htmlFor="bug-title">Issue title</label><input id="bug-title" className="input-control" maxLength={150} minLength={3} required value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="e.g. Refresh token race condition on concurrent requests" /></div>
          <div className="field-block"><label htmlFor="bug-status">Status</label><select id="bug-status" className="input-control" value={form.status} onChange={(e) => update('status', e.target.value)}>{STATUSES.map((status) => <option key={status}>{status}</option>)}</select></div>
          <div className="field-block"><label htmlFor="bug-severity">Severity</label><select id="bug-severity" className="input-control" value={form.severity} onChange={(e) => update('severity', e.target.value)}>{SEVERITIES.map((severity) => <option key={severity}>{severity}</option>)}</select></div>
        </div>
        <EditorField label="Description" value={form.description} onChange={(v) => update('description', v)} rows={4} hint="Include reproduction steps, expected behavior, actual behavior, and stack traces." />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <EditorField label="Root cause analysis" value={form.rootCause} onChange={(v) => update('rootCause', v)} rows={5} />
          <EditorField label="Fix / solution" value={form.fix} onChange={(v) => update('fix', v)} rows={5} hint="Use fenced code blocks for syntax-highlighted snippets." />
        </div>
        <div className="field-block"><label>Technology tags</label><div className="tag-picker">{TECH_OPTIONS.map((tag) => <button type="button" key={tag} onClick={() => toggleTag(tag)} className={`tag-choice ${form.techTags.includes(tag) ? 'selected' : ''}`}>{form.techTags.includes(tag) ? <X size={11} /> : <Plus size={11} />}{tag}</button>)}</div><div className="custom-tag-row"><input className="input-control" value={customTag} onChange={(e) => setCustomTag(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomTag(); } }} placeholder="Add a custom tag" maxLength={40} /><button className="button-secondary button-small" type="button" onClick={addCustomTag}>Add tag</button></div>{form.techTags.filter((tag) => !TECH_OPTIONS.includes(tag)).map((tag) => <button type="button" className="tag-chip removable" key={tag} onClick={() => toggleTag(tag)}>{tag}<X size={11} /></button>)}</div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="field-block"><label htmlFor="time-spent">Debugging time (minutes)</label><input id="time-spent" className="input-control" type="number" min="0" max="100000" value={form.timeSpentMinutes} onChange={(e) => update('timeSpentMinutes', e.target.value)} /></div>
          <div className="field-block"><label htmlFor="commit-ref">Git commit reference</label><input id="commit-ref" className="input-control" value={form.gitCommitRef || ''} onChange={(e) => update('gitCommitRef', e.target.value)} placeholder="https://github.com/org/repo/commit/…" maxLength={500} /></div>
        </div>
        <div className="modal-footer"><span className="footer-note"><Code2 size={14} /> Markdown supported throughout</span><div className="flex gap-2"><button type="button" className="button-secondary" onClick={onClose}>Cancel</button><button type="submit" disabled={saving} className="button-primary"><Save size={15} />{saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create bug log'}</button></div></div>
      </form>
    </Modal>
  );
}
