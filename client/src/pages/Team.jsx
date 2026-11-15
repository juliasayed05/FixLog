import { useCallback, useEffect, useState } from 'react';
import {
  Activity, ArrowRight, Check, Clock3, Mail, MessageCircle, Search,
  ShieldCheck, UserPlus, Users, X,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';
import { workspaceApi } from '../api/services.js';
import { errorMessage, initials, shortDate, timeAgo } from '../utils/format.js';

const descriptions = { created: 'created a bug log', updated: 'updated an issue', status_changed: 'changed issue status', comment_added: 'added a troubleshooting note', deleted: 'deleted a bug log' };

function PersonAvatar({ person, size = '' }) {
  return <div className={`team-person-avatar ${size}`}>{person?.avatar ? <img src={person.avatar} alt={`${person.name || 'Member'} avatar`} /> : initials(person?.name)}</div>;
}

function EmptyState({ icon: Icon, title, description }) {
  return <div className="team-empty"><div><Icon size={22} /></div><strong>{title}</strong><p>{description}</p></div>;
}

export default function Team() {
  const { user } = useAuth();
  const location = useLocation();
  const [tab, setTab] = useState(() => new URLSearchParams(location.search).get('tab') === 'requests' ? 'requests' : 'people');
  const [activity, setActivity] = useState([]);
  const [members, setMembers] = useState([]);
  const [requests, setRequests] = useState({ incoming: [], outgoing: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [people, setPeople] = useState([]);
  const [message, setMessage] = useState('');
  const [working, setWorking] = useState('');

  const loadWorkspace = useCallback(async () => {
    const [activityResponse, teamResponse, requestResponse] = await Promise.all([
      workspaceApi.activity({ limit: 40 }), workspaceApi.team(), workspaceApi.requests(),
    ]);
    setActivity(activityResponse.data.data.activity || []);
    setMembers(teamResponse.data.data.members || []);
    setRequests(requestResponse.data.data || { incoming: [], outgoing: [] });
  }, []);

  useEffect(() => {
    if (new URLSearchParams(location.search).get('tab') === 'requests') setTab('requests');
  }, [location.search]);

  useEffect(() => {
    let active = true;
    loadWorkspace().catch((error) => toast.error(errorMessage(error))).finally(() => { if (active) setLoading(false); });
    const refresh = () => loadWorkspace().catch(() => {});
    window.addEventListener('fixlog:data-changed', refresh);
    return () => { active = false; window.removeEventListener('fixlog:data-changed', refresh); };
  }, [loadWorkspace]);

  useEffect(() => {
    if (tab !== 'discover' || search.trim().length < 2) { setPeople([]); return undefined; }
    let active = true;
    const timer = window.setTimeout(() => workspaceApi.directory(search.trim())
      .then(({ data }) => { if (active) setPeople(data.data.people || []); })
      .catch((error) => { if (active) toast.error(errorMessage(error)); }), 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [search, tab]);

  async function sendRequest(email) {
    setWorking(email);
    try {
      await workspaceApi.sendRequest({ email, message });
      toast.success('Request sent. They need to approve before you become teammates.');
      setMessage('');
      await loadWorkspace();
      window.dispatchEvent(new Event('fixlog:requests-changed'));
      if (search.trim().length >= 2) {
        const { data } = await workspaceApi.directory(search.trim());
        setPeople(data.data.people || []);
      }
    } catch (error) { toast.error(errorMessage(error)); }
    finally { setWorking(''); }
  }

  async function respond(id, action) {
    setWorking(id);
    try {
      await workspaceApi.respond(id, action);
      toast.success(action === 'accept' ? 'Request accepted. You are now teammates.' : 'Request declined.');
      await loadWorkspace();
      window.dispatchEvent(new Event('fixlog:requests-changed'));
      if (search.trim().length >= 2) {
        const { data } = await workspaceApi.directory(search.trim()); setPeople(data.data.people || []);
      }
    } catch (error) { toast.error(errorMessage(error)); }
    finally { setWorking(''); }
  }

  async function removeConnection(person) {
    if (!window.confirm(`Remove ${person.name} from your team? Their issue history will no longer be shared with you.`)) return;
    setWorking(person._id);
    try { await workspaceApi.removeConnection(person._id); toast.success('Teammate removed.'); await loadWorkspace(); }
    catch (error) { toast.error(errorMessage(error)); }
    finally { setWorking(''); }
  }

  async function cancelRequest(id) {
    setWorking(id);
    try { await workspaceApi.cancelRequest(id); toast.success('Request cancelled.'); await loadWorkspace(); window.dispatchEvent(new Event('fixlog:requests-changed')); }
    catch (error) { toast.error(errorMessage(error)); }
    finally { setWorking(''); }
  }

  const incoming = requests.incoming || [];
  const outgoing = requests.outgoing || [];
  const connected = Math.max(0, members.length - 1);

  return <div className="page-content team-page animate-fade-in">
    <section className="team-hero panel">
      <div className="team-hero-icon"><Users size={21} /></div>
      <div className="team-hero-copy"><span className="team-eyebrow">COLLABORATE WITH CONSENT</span><h2>Your engineering circle</h2><p>Find developers, send a team request, and share your engineering journal only after they accept.</p></div>
      <div className="team-hero-stats"><div><strong>{connected}</strong><span>Connected</span></div><div><strong>{incoming.length}</strong><span>Requests received</span></div></div>
    </section>

    <div className="team-tabs team-tabs-modern">
      <button className={tab === 'people' ? 'active' : ''} onClick={() => setTab('people')}><Users size={15} /> My team <span>{connected}</span></button>
      <button className={tab === 'discover' ? 'active' : ''} onClick={() => setTab('discover')}><Search size={15} /> Find people</button>
      <button className={tab === 'requests' ? 'active' : ''} onClick={() => setTab('requests')}><Mail size={15} /> Requests <span>{incoming.length + outgoing.length}</span></button>
      <button className={tab === 'activity' ? 'active' : ''} onClick={() => setTab('activity')}><Activity size={15} /> Activity feed</button>
    </div>

    {loading ? <div className="list-skeleton" /> : tab === 'people' ? <section className="panel team-content-panel">
      <div className="team-panel-heading"><div><h3>Approved teammates</h3><p>Only accepted connections can access each other’s bug logs and activity.</p></div><span className="team-private-pill"><ShieldCheck size={13} /> Approval required</span></div>
      {members.length > 1 ? <div className="team-people-grid">{members.filter((person) => String(person._id) !== String(user?._id)).map((person) => <article className="team-person-card" key={person._id}><div className="team-person-card-top"><PersonAvatar person={person} /><span className={`role-pill role-${(person.role || 'developer').toLowerCase()}`}>{person.role || 'Developer'}</span></div><strong>{person.name}</strong><span className="team-person-headline">{person.headline || 'FixLog teammate'}</span>{person.location && <span className="team-person-email">{person.location}</span>}{person.bio && <span className="team-person-bio">{person.bio}</span>}<span className="team-person-email">{person.email}</span>{person.skills?.length > 0 && <div className="team-person-skills">{person.skills.slice(0, 3).map((skill) => <i key={skill}>{skill}</i>)}</div>}{(person.github || person.linkedin || person.website) && <div className="team-person-links">{person.github && <a href={person.github} target="_blank" rel="noreferrer">GitHub</a>}{person.linkedin && <a href={person.linkedin} target="_blank" rel="noreferrer">LinkedIn</a>}{person.website && <a href={person.website} target="_blank" rel="noreferrer">Website</a>}</div>}<small>Connected · joined {shortDate(person.createdAt)}</small><button className="team-remove-button" type="button" disabled={working === person._id} onClick={() => removeConnection(person)}>Remove teammate</button></article>)}</div> : <EmptyState icon={Users} title="Build your engineering circle" description="Your workspace is private right now. Find someone by name or email and send a request to connect." />}
      <div className="team-bottom-cta"><div><strong>Work better together</strong><span>Invite another developer to collaborate on debugging and share solutions.</span></div><button className="button-primary" onClick={() => { setTab('discover'); setSearch(''); }}><UserPlus size={15} /> Find teammates</button></div>
    </section> : tab === 'discover' ? <section className="panel team-content-panel">
      <div className="team-panel-heading"><div><h3>Find developers on FixLog</h3><p>Search by name, email, or professional headline. Requests are private until accepted.</p></div><span className="team-private-pill"><ShieldCheck size={13} /> No auto-joining</span></div>
      <div className="team-discovery-search"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name, email, or skill…" autoFocus /><kbd>2+ characters</kbd></div>
      <div className="team-request-message"><label htmlFor="request-message">Optional note to include with your request</label><input id="request-message" className="input-control" value={message} onChange={(event) => setMessage(event.target.value)} maxLength={500} placeholder="Hi! I'd like to collaborate on engineering issues…" /></div>
      {search.trim().length < 2 ? <EmptyState icon={Search} title="Search for a teammate" description="Enter at least two characters to discover people with a FixLog account." /> : people.length ? <div className="team-discovery-list">{people.map((person) => <article className="team-discovery-row" key={person._id}><PersonAvatar person={person} /><div className="team-discovery-person"><strong>{person.name}</strong><span>{person.headline || person.email}</span>{person.headline && <small>{person.email}</small>}</div>{person.relation === 'Connected' ? <span className="team-state-pill connected"><Check size={13} /> Connected</span> : person.relation === 'Sent' ? <span className="team-state-pill pending"><Clock3 size={13} /> Request sent</span> : person.relation === 'Received' ? <button className="button-secondary" onClick={() => setTab('requests')}>Review request</button> : <button className="button-primary" disabled={working === person.email} onClick={() => sendRequest(person.email)}><UserPlus size={14} /> {working === person.email ? 'Sending…' : 'Request to connect'}</button>}</article>)}</div> : <EmptyState icon={Users} title="No matching people" description="Try a different name or exact email address. They must have an active FixLog account." />}
    </section> : tab === 'requests' ? <section className="panel team-content-panel">
      <div className="team-panel-heading"><div><h3>Team requests</h3><p>You decide who can join your engineering circle. Nothing is shared before approval.</p></div><span className="team-private-pill"><ShieldCheck size={13} /> You are in control</span></div>
      <div className="team-request-columns">
        <div className="team-request-column"><div className="team-request-column-title"><h4>Received</h4><span>{incoming.length}</span></div>{incoming.length ? incoming.map((request) => <article className="team-request-card" key={request._id}><PersonAvatar person={request.person} /><div className="team-request-copy"><strong>{request.person?.name || 'FixLog member'}</strong><span>{request.person?.email}</span>{request.message && <p>“{request.message}”</p>}<small>{timeAgo(request.createdAt)}</small></div><div className="team-request-actions"><button className="button-primary" disabled={working === request._id} onClick={() => respond(request._id, 'accept')}><Check size={13} /> Accept</button><button className="button-secondary" disabled={working === request._id} onClick={() => respond(request._id, 'decline')}><X size={13} /> Decline</button></div></article>) : <div className="team-inline-empty">No pending requests have arrived.</div>}</div>
        <div className="team-request-column"><div className="team-request-column-title"><h4>Sent</h4><span>{outgoing.length}</span></div>{outgoing.length ? outgoing.map((request) => <article className="team-request-card" key={request._id}><PersonAvatar person={request.person} /><div className="team-request-copy"><strong>{request.person?.name || 'FixLog member'}</strong><span>{request.person?.email}</span><small>Sent {timeAgo(request.createdAt)}</small></div><button className="button-secondary" disabled={working === request._id} onClick={() => cancelRequest(request._id)}><X size={13} /> Cancel</button></article>) : <div className="team-inline-empty">You have not sent any pending requests.</div>}</div>
      </div>
    </section> : <section className="panel team-content-panel activity-panel">
      <div className="team-panel-heading"><div><h3>Recent team activity</h3><p>Updates from your approved teammates and your own engineering journal.</p></div><span className="team-private-pill"><Activity size={13} /> Shared feed</span></div>
      {activity.length ? <div className="activity-list">{activity.map((item) => <div className="activity-item" key={item._id}><div className="activity-avatar">{item.actorId?.avatar ? <img src={item.actorId.avatar} alt="" /> : initials(item.actorId?.name || item.actorName)}</div><div className="activity-copy"><p><strong>{item.actorId?.name || item.actorName || 'A teammate'}</strong> {item.summary || descriptions[item.action] || 'made a change'} {item.bugId && <Link to={`/bugs/${item.bugId._id}`}>Open issue <ArrowRight size={11} /></Link>}</p><span>{timeAgo(item.createdAt)} <i>·</i> {shortDate(item.createdAt)}</span></div><div className={`activity-action-icon activity-${item.action}`}><Activity size={15} /></div></div>)}</div> : <EmptyState icon={MessageCircle} title="No shared activity yet" description="When you or an approved teammate create issues, update status, or add a note, it will appear here." />}
    </section>}
  </div>;
}
