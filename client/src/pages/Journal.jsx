import { useEffect, useMemo, useState } from 'react';
import { Activity, Bug, ChevronDown, ChevronLeft, ChevronRight, Download, Filter, GripVertical, LayoutGrid, List, Plus, Search, Tags, X } from 'lucide-react';
import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import { Link, useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import { bugApi } from '../api/services.js';
import { SeverityBadge, StatusBadge } from '../components/Badges.jsx';
import { STATUSES, TECH_OPTIONS } from '../utils/constants.js';
import { downloadBlob, errorMessage, formatDuration, initials, shortDate, timeAgo } from '../utils/format.js';
import toast from 'react-hot-toast';

function KanbanCard({ bug, onStatus }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: bug._id, data: { status: bug.status } });
  return <article ref={setNodeRef} style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, opacity: isDragging ? .55 : 1 } : undefined} className={`kanban-card ${isDragging ? 'dragging' : ''}`}>
    <div className="kanban-card-top"><span className={`severity-dot severity-dot-${bug.severity?.toLowerCase()}`} /><span className="kanban-card-id">#{bug._id.slice(-6).toUpperCase()}</span><button className="drag-handle" {...listeners} {...attributes} title="Drag to change status"><GripVertical size={15} /></button></div>
    <Link to={`/bugs/${bug._id}`} className="kanban-card-title">{bug.title}</Link>
    <div className="kanban-tags">{(bug.techTags || []).slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}</div>
    <div className="kanban-card-footer"><span className="mini-avatar">{initials(bug.userId?.name)}</span><span>{timeAgo(bug.updatedAt)}</span><select aria-label="Change status" value={bug.status} onChange={(e) => onStatus(bug, e.target.value)} onClick={(e) => e.stopPropagation()}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></div>
  </article>;
}

function KanbanColumn({ status, bugs, onStatus }) {
  const { isOver, setNodeRef } = useDroppable({ id: status });
  return <section ref={setNodeRef} className={`kanban-column ${isOver ? 'is-over' : ''}`}><div className="kanban-column-header"><span className={`column-dot column-${status.toLowerCase().replace(' ', '-')}`} /><strong>{status}</strong><span className="column-count">{bugs.length}</span></div><div className="kanban-column-body">{bugs.map((bug) => <KanbanCard key={bug._id} bug={bug} onStatus={onStatus} />)}{!bugs.length && <div className="kanban-empty">Drop issues here</div>}</div></section>;
}

export default function Journal({ initialView = 'table' }) {
  const location = useLocation(); const navigate = useNavigate(); const { openNewBug } = useOutletContext();
  const [view, setView] = useState(initialView);
  const [bugs, setBugs] = useState([]); const [loading, setLoading] = useState(true); const [search, setSearch] = useState(''); const [status, setStatus] = useState('All statuses'); const [severity, setSeverity] = useState('All severities'); const [selectedTags, setSelectedTags] = useState([]); const [tagMenuOpen, setTagMenuOpen] = useState(false); const [sort, setSort] = useState('updated'); const [page, setPage] = useState(1); const [pagination, setPagination] = useState({ pages: 1, total: 0 }); const [exportFormat, setExportFormat] = useState('csv'); const [exporting, setExporting] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 7 } }));
  useEffect(() => { setView(initialView); }, [initialView, location.pathname]);
  useEffect(() => {
    let alive = true; setLoading(true);
    const timer = setTimeout(() => {
      bugApi.list({ search: search.trim() || undefined, status: status === 'All statuses' ? undefined : status, severity: severity === 'All severities' ? undefined : severity, tag: selectedTags.length ? selectedTags.join(',') : undefined, sort, page, limit: view === 'board' ? 100 : 12 })
        .then(({ data }) => { if (alive) { setBugs(data.data.items); setPagination(data.data.pagination); } })
        .catch((error) => { if (alive) toast.error(errorMessage(error)); })
        .finally(() => { if (alive) setLoading(false); });
    }, search ? 220 : 0);
    return () => { alive = false; clearTimeout(timer); };
  }, [search, status, severity, selectedTags, sort, page, view]);
  useEffect(() => { const refresh = () => bugApi.list({ search: search.trim() || undefined, status: status === 'All statuses' ? undefined : status, severity: severity === 'All severities' ? undefined : severity, tag: selectedTags.length ? selectedTags.join(',') : undefined, limit: view === 'board' ? 100 : 12, page, sort }).then(({ data }) => { setBugs(data.data.items); setPagination(data.data.pagination); }).catch(() => {}); window.addEventListener('fixlog:data-changed', refresh); return () => window.removeEventListener('fixlog:data-changed', refresh); }, [search, status, severity, selectedTags, view, page, sort]);
  const allTags = useMemo(() => [...new Set(bugs.flatMap((bug) => bug.techTags || []))].sort(), [bugs]);
  const availableTags = useMemo(() => [...new Set([...TECH_OPTIONS, ...allTags])].sort(), [allTags]);
  const setCurrentView = (next) => { setView(next); navigate(next === 'board' ? '/board' : '/bugs', { replace: true }); };
  async function changeStatus(bug, nextStatus) {
    if (bug.status === nextStatus) return;
    try { const { data } = await bugApi.update(bug._id, { status: nextStatus }); setBugs((current) => current.map((item) => item._id === bug._id ? data.data.bug : item)); toast.success(`Moved to ${nextStatus}`); window.dispatchEvent(new Event('fixlog:data-changed')); }
    catch (error) { toast.error(errorMessage(error)); }
  }
  function onDragEnd(event) { const id = event.active.id; const next = event.over?.id; const bug = bugs.find((item) => item._id === id); if (bug && STATUSES.includes(next)) changeStatus(bug, next); }
  async function handleExport() { setExporting(true); try { const { data } = await bugApi.export(exportFormat); const extension = exportFormat === 'markdown' ? 'md' : exportFormat; downloadBlob(data, `fixlog-export-${new Date().toISOString().slice(0, 10)}.${extension}`); toast.success(`${exportFormat.toUpperCase()} export downloaded`); } catch (error) { toast.error(errorMessage(error)); } finally { setExporting(false); } }
  const toggleSort = (key) => { setSort((current) => key === 'updated' ? (current === 'newest' ? 'oldest' : 'newest') : current === key ? 'updated' : key); setPage(1); };
  const clearFilters = () => { setSearch(''); setStatus('All statuses'); setSeverity('All severities'); setSelectedTags([]); setTagMenuOpen(false); setPage(1); };
  const hasFilters = search || status !== 'All statuses' || severity !== 'All severities' || selectedTags.length > 0;
  return (
    <div className="page-content animate-fade-in">
      <div className="journal-toolbar"><div className="journal-toolbar-left"><div className="view-switch"><button className={view === 'table' ? 'active' : ''} onClick={() => setCurrentView('table')}><List size={15} /> Table</button><button className={view === 'board' ? 'active' : ''} onClick={() => setCurrentView('board')}><LayoutGrid size={15} /> Board</button></div><span className="result-count">{pagination.total} issue{pagination.total === 1 ? '' : 's'}</span></div><div className="journal-actions"><div className="export-control"><select className="export-format-select" value={exportFormat} onChange={(e) => setExportFormat(e.target.value)} aria-label="Export format"><option value="csv">CSV</option><option value="json">JSON</option><option value="markdown">Markdown</option></select><button className="button-secondary export-button" onClick={handleExport} disabled={exporting}><Download size={14} />{exporting ? 'Exporting…' : 'Export'}</button></div><button className="button-primary" onClick={openNewBug}><Plus size={15} /> New bug log</button></div></div>
      <div className="filter-bar"><div className="journal-search"><Search size={16} /><input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search issue title, notes, root cause…" /><kbd>/</kbd>{search && <button onClick={() => setSearch('')}><X size={13} /></button>}</div><div className="filter-selects"><label><Filter size={14} /><select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option>All statuses</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select><ChevronDown size={13} /></label><label><select value={severity} onChange={(e) => { setSeverity(e.target.value); setPage(1); }}><option>All severities</option>{['Critical', 'High', 'Medium', 'Low'].map((s) => <option key={s}>{s}</option>)}</select><ChevronDown size={13} /></label><div className="tag-filter-wrap"><button type="button" className={`tag-filter-button ${selectedTags.length ? 'has-tags' : ''}`} onClick={() => setTagMenuOpen((value) => !value)}><Tags size={13} />{selectedTags.length ? `Tags (${selectedTags.length})` : 'Technology'}<ChevronDown size={13} /></button>{tagMenuOpen && <div className="tag-filter-menu"><div className="tag-filter-menu-head"><strong>Filter by technology</strong><button type="button" onClick={() => setTagMenuOpen(false)} aria-label="Close tag filter"><X size={13} /></button></div><div className="tag-filter-options">{availableTags.map((t) => <label key={t}><input type="checkbox" checked={selectedTags.includes(t)} onChange={() => { setSelectedTags((current) => current.includes(t) ? current.filter((item) => item !== t) : [...current, t]); setPage(1); }} /><span>{t}</span></label>)}</div><div className="tag-filter-actions"><button type="button" onClick={() => setSelectedTags([])}>Clear</button><button type="button" onClick={() => setTagMenuOpen(false)}>Done</button></div></div>}</div></div>{hasFilters && <button className="clear-filters" onClick={clearFilters}>Clear <X size={12} /></button>}</div>
      {loading ? <div className={view === 'board' ? 'board-skeleton' : 'table-skeleton'} /> : view === 'table' ? (
        <section className="panel bug-table-panel"><div className="bug-table-scroll"><table className="bug-table"><thead><tr><th className="issue-col"><button onClick={() => toggleSort('title')}>Issue <span>{sort === 'title' ? '↑' : '↕'}</span></button></th><th><button onClick={() => toggleSort('severity')}>Priority <span>{sort === 'severity' ? '↑' : '↕'}</span></button></th><th>Status</th><th>Technology</th><th>Debug time</th><th><button onClick={() => toggleSort('updated')}>Updated <span>{sort === 'newest' ? '↓' : sort === 'oldest' ? '↑' : '↕'}</span></button></th></tr></thead><tbody>{bugs.map((bug) => <tr key={bug._id} onClick={() => navigate(`/bugs/${bug._id}`)}><td><div className="issue-cell"><span className="issue-cell-icon"><Bug size={15} /></span><span><strong>{bug.title}</strong><small>#{bug._id.slice(-6).toUpperCase()} <i>·</i> opened {shortDate(bug.createdAt)}</small></span></div></td><td><SeverityBadge severity={bug.severity} /></td><td><StatusBadge status={bug.status} /></td><td><div className="table-tags">{(bug.techTags || []).slice(0, 3).map((t) => <span key={t}>{t}</span>)}{bug.techTags?.length > 3 && <span>+{bug.techTags.length - 3}</span>}</div></td><td className="time-cell">{formatDuration(bug.timeSpentMinutes)}</td><td className="updated-cell">{timeAgo(bug.updatedAt)}</td></tr>)}</tbody></table></div>{!bugs.length && <div className="empty-state table-empty"><div className="empty-icon"><Bug size={22} /></div><h3>{hasFilters ? 'No matching issues' : 'No bug logs yet'}</h3><p>{hasFilters ? 'Try adjusting the search or filters.' : 'Capture your first issue to begin building your engineering journal.'}</p><div className="flex justify-center gap-2">{hasFilters && <button className="button-secondary" onClick={clearFilters}>Clear filters</button>}<button onClick={openNewBug} className="button-primary"><Plus size={15} /> New bug log</button></div></div>}</section>
      ) : (
        <DndContext sensors={sensors} onDragEnd={onDragEnd}><div className="kanban-board">{STATUSES.map((s) => <KanbanColumn key={s} status={s} bugs={bugs.filter((bug) => bug.status === s)} onStatus={changeStatus} />)}</div></DndContext>
      )}
      {view === 'table' && pagination.pages > 1 && <div className="pagination"><span>Showing <strong>{(page - 1) * 12 + 1}–{Math.min(page * 12, pagination.total)}</strong> of <strong>{pagination.total}</strong></span><div><button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft size={15} /> Previous</button><span>{page} / {pagination.pages}</span><button disabled={page >= pagination.pages} onClick={() => setPage((p) => p + 1)}>Next <ChevronRight size={15} /></button></div></div>}
    </div>
  );
}
