import React, { useState, useMemo } from 'react';
import healthDefaults from '../../data/health-defaults.json';
import { getMetricStatus, formatValue, getTrend, STATUS_COLORS, STATUS_LABELS } from './utils';
import styles from './HealthTracker.module.css';

const METRIC_TYPES = Object.keys(healthDefaults.metrics);

const DATE_RANGES = [
  { id: 'week', label: 'This Week', days: 7 },
  { id: 'month', label: 'This Month', days: 30 },
  { id: 'all', label: 'All Time', days: null }
];

export default function History({ metrics, updateMetric, deleteMetric }) {
  const { t } = useTranslation('healthTracker');
  const [selectedMetric, setSelectedMetric] = useState('weight');
  const [dateRange, setDateRange] = useState('week');
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');

  const filteredEntries = useMemo(() => {
    const allEntries = metrics?.[selectedMetric] || [];

    if (dateRange === 'all') return allEntries;

    const days = dateRange === 'week' ? 7 : 30;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    cutoff.setHours(0, 0, 0, 0);

    return allEntries.filter(e => {
      const entryDate = new Date(`${e.date}T${e.time || '00:00'}`);
      return entryDate >= cutoff;
    });
  }, [metrics, selectedMetric, dateRange]);

  const stats = useMemo(() => {
    if (!filteredEntries.length) return null;

    if (selectedMetric === 'blood_pressure') {
      const withBP = filteredEntries.filter(e => e.systolic != null && e.diastolic != null);
      if (!withBP.length) return null;
      const sys = withBP.map(e => Number(e.systolic));
      const dia = withBP.map(e => Number(e.diastolic));
      const avg = (arr) => Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
      return {
        avg: `${avg(sys)}/${avg(dia)}`,
        min: `${Math.min(...sys)}/${Math.min(...dia)}`,
        max: `${Math.max(...sys)}/${Math.max(...dia)}`
      };
    }
    if (selectedMetric === 'medication') return null;

    const vals = filteredEntries.map(e => Number(e.value)).filter(v => !Number.isNaN(v));
    if (!vals.length) return null;
    return {
      avg: (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1),
      min: Math.min(...vals),
      max: Math.max(...vals)
    };
  }, [filteredEntries, selectedMetric]);

  const trend = useMemo(() => getTrend(filteredEntries, selectedMetric), [filteredEntries, selectedMetric]);

  const handleSaveEdit = (id) => {
    const entry = filteredEntries.find(e => e.id === id);
    if (!entry) return;

    if (selectedMetric === 'blood_pressure') {
      const parts = editValue.split('/').map(v => parseInt(v.trim(), 10));
      const sys = parts[0];
      const dia = parts[1];
      if (Number.isNaN(sys) || Number.isNaN(dia)) {
        setEditingId(null);
        setEditValue('');
        return;
      }
      updateMetric(selectedMetric, id, { systolic: sys, diastolic: dia });
    } else {
      const val = parseFloat(editValue);
      if (!Number.isNaN(val)) {
        updateMetric(selectedMetric, id, { value: val });
      }
    }
    setEditingId(null);
    setEditValue('');
  };

  const handleToggleTaken = (id, taken) => {
    updateMetric(selectedMetric, id, { taken: !taken });
    setEditingId(null);
    setEditValue('');
  };

  const handleDelete = (id) => {
    if (window.confirm('Delete this entry?')) {
      deleteMetric(selectedMetric, id);
    }
  };

  const handleExport = () => {
    const csv = ['Date,Time,Value,Status'];
    filteredEntries.forEach(e => {
      const status = getMetricStatus(selectedMetric, e);
      csv.push(`${e.date},${e.time || '00:00'},${formatValue(selectedMetric, e)},${STATUS_LABELS[status] || status}`);
    });
    const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedMetric}_history.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const currentConfig = healthDefaults.metrics[selectedMetric];

  const startEdit = (entry) => {
    setEditingId(entry.id);
    if (selectedMetric === 'blood_pressure') {
      setEditValue(`${entry.systolic}/${entry.diastolic}`);
    } else if (selectedMetric === 'medication') {
      setEditValue('');
    } else {
      setEditValue(entry.value != null ? String(entry.value) : '');
    }
  };

  return (
    <div className={styles.history}>
      <div className={styles.historyHeader}>
        <h2 className={styles.historyTitle}>{currentConfig.icon} {currentConfig.label} History</h2>
        <button className={styles.exportBtn} onClick={handleExport}>
          📥 Export CSV
        </button>
      </div>

      <div className={styles.historyControls}>
        <div className={styles.metricSelector}>
          <label className={styles.label}>Metric</label>
          <select
            className={styles.select}
            value={selectedMetric}
            onChange={e => setSelectedMetric(e.target.value)}
          >
            {METRIC_TYPES.map(type => (
              <option key={type} value={type}>
                {healthDefaults.metrics[type].icon} {healthDefaults.metrics[type].label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.dateRange}>
          <label className={styles.label}>Time Range</label>
          <select
            className={styles.select}
            value={dateRange}
            onChange={e => setDateRange(e.target.value)}
          >
            {DATE_RANGES.map(r => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </select>
        </div>
      </div>

      {stats && (
        <div className={styles.statsBar}>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Average</span>
            <span className={styles.statValue}>{stats.avg}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Min</span>
            <span className={styles.statValue}>{stats.min}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Max</span>
            <span className={styles.statValue}>{stats.max}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Trend</span>
            <span className={styles.statValue} style={{ color: trend.direction === 'up' ? STATUS_COLORS.high : trend.direction === 'down' ? STATUS_COLORS.normal : STATUS_COLORS.alert }}>
              {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'} {trend.change.toFixed(1)}
            </span>
          </div>
        </div>
      )}

      {filteredEntries.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>📊</span>
          <h3>No Data Yet</h3>
          <p>Start tracking your {currentConfig.label.toLowerCase()} to see history here.</p>
          <button className={styles.btnPrimary} disabled>Log First Entry</button>
        </div>
      ) : (
        <div className={styles.historyList} role="list">
          {filteredEntries.map((entry, index) => {
            const status = getMetricStatus(selectedMetric, entry);
            const isEditing = editingId === entry.id;
            const entryTrend = index > 0
              ? getTrend(filteredEntries.slice(index - 1), selectedMetric).direction
              : null;

            return (
              <div key={entry.id} className={`${styles.historyItem} ${isEditing ? styles.editing : ''}`}>
                <div className={styles.itemMain}>
                  <div className={styles.itemDateTime}>
                    <span className={styles.itemDate}>{entry.date}</span>
                    <span className={styles.itemTime}>{entry.time || '—'}</span>
                  </div>
                  <div className={styles.itemValue}>
                    <span className={styles.itemReading}>{formatValue(selectedMetric, entry)}</span>
                    <span
                      className={styles.itemStatus}
                      style={{ color: STATUS_COLORS[status] || STATUS_COLORS.unknown }}
                    >
                      {STATUS_ICON_LABEL(status)}
                    </span>
                  </div>
                  {entryTrend && (
                    <div className={styles.itemTrend}>
                      {entryTrend === 'up' && '↑'}
                      {entryTrend === 'down' && '↓'}
                      {entryTrend === 'same' && '→'}
                    </div>
                  )}
                </div>
                <div className={styles.itemActions}>
                  {isEditing && selectedMetric === 'medication' ? (
                    <button
                      className={`${styles.btnPrimary} ${styles.takenBtn}`}
                      onClick={() => handleToggleTaken(entry.id, entry.taken)}
                    >
                      {entry.taken ? '↩️ Mark Pending' : '✅ Mark Taken'}
                    </button>
                  ) : isEditing ? (
                    <>
                      <input
                        type={selectedMetric === 'blood_pressure' ? 'text' : 'number'}
                        step={currentConfig.step || 1}
                        className={styles.editInput}
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        placeholder={selectedMetric === 'blood_pressure' ? '120/80' : currentConfig.placeholder}
                        autoFocus
                        onKeyDown={e => e.key === 'Enter' && handleSaveEdit(entry.id)}
                        onBlur={() => handleSaveEdit(entry.id)}
                      />
                      <button className={styles.btnIcon} onClick={() => handleSaveEdit(entry.id)} aria-label="Save">✓</button>
                    </>
                  ) : (
                    <>
                      <button className={styles.btnIcon} onClick={() => startEdit(entry)} aria-label="Edit">✏️</button>
                      <button className={styles.btnIcon} onClick={() => handleDelete(entry.id)} aria-label="Delete">🗑️</button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function STATUS_ICON_LABEL(status) {
  const labels = {
    normal: '✓ Normal',
    alert: '⚠️ Alert',
    high: '🔴 High',
    unknown: '? Unknown'
  };
  return labels[status] || status;
}