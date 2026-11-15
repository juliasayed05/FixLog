import { useEffect, useState } from 'react';
import { Activity, ArrowLeft, ArrowUpRight, CalendarDays, Check, Clock3, Code2, ExternalLink, FileText, MessageSquare, Pencil, Send, ShieldAlert, Trash2, UserRound } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { bugApi } from '../api/services.js';
import { useAuth } from '../context/AuthContext.jsx';
import BugModal from '../components/BugModal.jsx';
import Markdown from '../components/Markdown.jsx';
import { SeverityBadge, StatusBadge } from '../components/Badges.jsx';
import { STATUSES } from '../utils/constants.js';
import { errorMessage, formatDuration, initials, shortDate, timeAgo } from '../utils/format.js';
import toast from 'react-hot-toast';

export default function BugDetail() {
  const { id } = useParams(); const navigate = useNavigate(); const { user } = useAuth();
  const [bug, setBug] = useState(null); const [activity, setActivity] = useState([]); const [loading, setLoading] = useState(true); const [comment, setComment] = useState(''); const [sending, setSending] = useState(false); const [editOpen, setEditOpen] = useState(false);
  async function load() { try { const { data } = await bugApi.get(id); setBug(data.data.bug); setActivity(data.data.activity); } catch (error) { toast.error(errorMessage(error)); navigate('/bugs'); } finally { setLoading(false); } }
  useEffect(() => { setLoading(true); load(); }, [id]);
  const canManage = bug && (['Admin', 'Lead'].includes(user?.role) || bug.userId?._id === user?._id);
  async function update(payload) { try { const { data } = await bugApi.update(id, payload); setBug(data.data.bug); toast.success('Bug log updated'); window.dispatchEvent(new Event('fixlog:data-changed')); setEditOpen(false); await load(); } catch (error) { toast.error(errorMessage(error)); throw error; } }
  async function changeStatus(next) { try { const { data } = await bugApi.update(id, { status: next }); setBug(data.data.bug); toast.success(`Status changed to ${next}`); window.dispatchEvent(new Event('fixlog:data-changed')); await load(); } catch (error) { toast.error(errorMessage(error)); } }
  async function submitComment(event) { event.preventDefault(); if (!comment.trim()) return; setSending(true); try { const { data } = await bugApi.comment(id, comment.trim()); setBug(data.data.bug); setComment(''); await load(); toast.success('Note added'); window.dispatchEvent(new Event('fixlog:data-changed')); } catch (error) { toast.error(errorMessage(error)); } finally { setSending(false); } }
  async function remove() { if (!window.confirm('Delete this bug log permanently? This action cannot be undone.')) return; try { await bugApi.remove(id); toast.success('Bug log deleted'); window.dispatchEvent(new Event('fixlog:data-changed')); navigate('/bugs'); } catch (error) { toast.error(errorMessage(error)); } }
  if (loading) return <div className="page-content"><div className="detail-skeleton" /></div>;
  if (!bug) return null;
  return <div className="page-content animate-fade-in">
    <div className="detail-back-row"><Link to="/bugs" className="back-link"><ArrowLeft size={15} /> Back to journal</Link><div className="detail-actions">{canManage && <><button className="button-secondary" onClick={() => setEditOpen(true)}><Pencil size={14} /> Edit log</button><button className="icon-button danger-icon" title="Delete bug log" onClick={remove}><Trash2 size={16} /></button></>}</div></div>
    <div className="detail-heading"><div className="detail-id">BUG-{bug._id.slice(-6).toUpperCase()} <span>·</span> Created {shortDate(bug.createdAt)}</div><h2>{bug.title}</h2><div className="detail-meta"><StatusBadge status={bug.status} /><SeverityBadge severity={bug.severity} /><span className="detail-author"><span className="mini-avatar">{initials(bug.userId?.name)}</span>{bug.userId?.name || 'Unknown contributor'}</span><span><Clock3 size={13} /> {formatDuration(bug.timeSpentMinutes)} debugging</span><span><CalendarDays size={13} /> Updated {timeAgo(bug.updatedAt)}</span></div></div>
    <div className="detail-layout"><div className="detail-main-column">
      <section className="panel detail-section"><div className="detail-section-heading"><FileText size={16} /><h3>Issue description</h3></div><Markdown>{bug.description}</Markdown></section>
      <section className="panel detail-section"><div className="detail-section-heading"><ShieldAlert size={16} /><h3>Root cause analysis</h3></div><Markdown>{bug.rootCause}</Markdown></section>
      <section className="panel detail-section"><div className="detail-section-heading"><Code2 size={16} /><h3>Fix / solution</h3></div><Markdown>{bug.fix}</Markdown></section>
      <section className="panel comments-section"><div className="panel-header"><div><h3>Discussion & notes</h3><p>{bug.comments?.length || 0} comments on this issue</p></div><MessageSquare size={17} className="panel-header-icon" /></div><form className="comment-compose" onSubmit={submitComment}><div className="comment-avatar">{initials(user?.name)}</div><div className="comment-input-wrap"><textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a troubleshooting note or share what you learned…" rows={3} maxLength={5000} /><div className="comment-compose-bottom"><span>Markdown supported · {comment.length}/5000</span><button className="button-primary button-small" disabled={sending || !comment.trim()}><Send size={13} /> {sending ? 'Posting…' : 'Post note'}</button></div></div></form>
        {bug.comments?.length ? <div className="comments-list">{[...bug.comments].reverse().map((entry) => <article className="comment-item" key={entry._id}><div className="comment-avatar">{initials(entry.userId?.name)}</div><div><div className="comment-head"><strong>{entry.userId?.name || 'Teammate'}</strong><span>{timeAgo(entry.createdAt)}</span></div><Markdown>{entry.text}</Markdown></div></article>)}</div> : <p className="no-comments">No notes yet. Start the conversation with what you discovered.</p>}
      </section>
    </div><aside className="detail-side-column">
      <section className="panel side-panel"><div className="side-panel-heading"><h3>Workflow</h3><Activity size={15} /></div><label className="side-label">Status</label><select className="input-control" value={bug.status} onChange={(e) => changeStatus(e.target.value)}>{STATUSES.map((status) => <option key={status}>{status}</option>)}</select><label className="side-label mt-4">Severity</label><div className="side-severity"><SeverityBadge severity={bug.severity} /></div><div className="side-divider" /><div className="side-metadata"><div><span>Created by</span><strong><UserRound size={13} /> {bug.userId?.name || 'Unknown'}</strong></div><div><span>Created on</span><strong><CalendarDays size={13} /> {shortDate(bug.createdAt)}</strong></div><div><span>Time spent</span><strong><Clock3 size={13} /> {formatDuration(bug.timeSpentMinutes)}</strong></div></div>{bug.gitCommitRef && <a className="commit-link" href={bug.gitCommitRef.startsWith('http') ? bug.gitCommitRef : `https://github.com/${bug.gitCommitRef}`} target="_blank" rel="noreferrer"><Code2 size={14} /> View related commit <ExternalLink size={12} /></a>}</section>
      <section className="panel side-panel"><div className="side-panel-heading"><h3>Technology stack</h3><Code2 size={15} /></div><div className="detail-tag-list">{bug.techTags?.length ? bug.techTags.map((tag) => <span key={tag}>{tag}</span>) : <small>No tags added</small>}</div></section>
      <section className="panel side-panel"><div className="side-panel-heading"><h3>Issue timeline</h3><Activity size={15} /></div><div className="detail-timeline">{activity.map((item) => <div className="timeline-item" key={item._id}><i /><div><strong>{item.summary}</strong><span>{item.actorId?.name || item.actorName || 'Teammate'} · {timeAgo(item.createdAt)}</span></div></div>)}</div></section>
    </aside></div>
    <BugModal open={editOpen} onClose={() => setEditOpen(false)} onSave={update} initialValue={bug} />
  </div>;
}
