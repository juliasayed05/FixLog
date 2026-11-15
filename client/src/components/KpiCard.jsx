import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { motion } from 'framer-motion';

export default function KpiCard({ label, value, detail, change, icon: Icon, tone = 'indigo' }) {
  const positive = typeof change === 'number' && change > 0;
  const negative = typeof change === 'number' && change < 0;
  return (
    <motion.div className="kpi-card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -2 }} transition={{ duration: 0.24 }}><div className="kpi-top"><span>{label}</span><div className={`kpi-icon kpi-${tone}`}><Icon size={17} /></div></div><div className="kpi-value-row"><strong>{value}</strong>{change !== undefined && <span className={`kpi-change ${positive ? 'positive' : negative ? 'negative' : ''}`}>{positive ? <ArrowUpRight size={13} /> : negative ? <ArrowDownRight size={13} /> : <Minus size={13} />}{Math.abs(change)}%</span>}</div><p>{detail}</p></motion.div>
  );
}
