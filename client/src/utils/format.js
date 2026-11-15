import { formatDistanceToNow, format } from 'date-fns';
export const timeAgo = (date) => date ? formatDistanceToNow(new Date(date), { addSuffix: true }) : '—';
export const shortDate = (date) => date ? format(new Date(date), 'MMM d, yyyy') : '—';
export const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'U';
export const formatDuration = (minutes = 0) => minutes >= 60 ? `${(minutes / 60).toFixed(1)}h` : `${minutes}m`;
export const errorMessage = (error) => error.userMessage || error.response?.data?.message || error.message || 'Something went wrong.';
export const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename; document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
};
