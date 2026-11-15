import { SEVERITY_STYLES, STATUS_STYLES } from '../utils/constants.js';
export function StatusBadge({ status }) { return <span className={`status-badge ${STATUS_STYLES[status] || 'status-open'}`}><i />{status}</span>; }
export function SeverityBadge({ severity }) { return <span className={`severity-badge ${SEVERITY_STYLES[severity] || 'severity-medium'}`}>{severity}</span>; }
