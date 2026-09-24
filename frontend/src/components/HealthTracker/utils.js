import healthDefaults from '../../data/health-defaults.json';

export const STATUS_COLORS = {
  normal: '#4CAF50',
  alert: '#FF9800',
  high: '#F44336',
  unknown: '#9E9E9E'
};

export const STATUS_ICONS = {
  normal: '✓',
  alert: '⚠️',
  high: '🔴',
  unknown: '?'
};

export const STATUS_LABELS = {
  normal: 'Normal',
  alert: 'Alert',
  high: 'High',
  unknown: 'Unknown'
};

export function todayKey() {
  return new Date().toISOString().split('T')[0];
}

function isNil(value) {
  return value === null || value === undefined;
}

export function clampProgress(progress) {
  return Math.min(100, Math.max(0, progress));
}

export function getMetricStatus(metricType, entry) {
  if (!entry) return 'unknown';

  if (metricType === 'blood_pressure') {
    const sys = Number(entry.systolic);
    const dia = Number(entry.diastolic);
    if (Number.isNaN(sys) || Number.isNaN(dia)) return 'unknown';
    if (sys >= 140 || dia >= 90) return 'high';
    if (sys >= 120 || dia >= 80) return 'alert';
    return 'normal';
  }

  if (metricType === 'glucose') {
    const val = Number(entry.value);
    if (Number.isNaN(val)) return 'unknown';
    if (val >= 126) return 'high';
    if (val >= 100) return 'alert';
    if (val >= 70) return 'normal';
    return 'alert';
  }

  if (metricType === 'heart_rate') {
    const val = Number(entry.value);
    if (Number.isNaN(val)) return 'unknown';
    if (val >= 121) return 'high';
    if (val >= 101 || val <= 59) return 'alert';
    return 'normal';
  }

  if (metricType === 'weight') {
    return Number.isNaN(Number(entry.value)) ? 'unknown' : 'normal';
  }

  if (metricType === 'water') {
    const val = Number(entry.value);
    if (Number.isNaN(val)) return 'unknown';
    if (val >= 8) return 'normal';
    if (val >= 4) return 'alert';
    return 'high';
  }

  if (metricType === 'sleep') {
    const val = Number(entry.value);
    if (Number.isNaN(val)) return 'unknown';
    if (val >= 7) return 'normal';
    if (val >= 5) return 'alert';
    return 'high';
  }

  if (metricType === 'medication') return 'normal';

  return 'normal';
}

export function formatValue(metricType, entry) {
  if (!entry) return '—';

  if (metricType === 'blood_pressure') {
    if (isNil(entry.systolic) || isNil(entry.diastolic)) return '—';
    return `${entry.systolic}/${entry.diastolic} mmHg`;
  }

  if (metricType === 'medication') {
    if (entry.name) {
      return entry.dose ? `${entry.dose} ${entry.name}` : entry.name;
    }
    if (!isNil(entry.total)) return `${entry.taken || 0}/${entry.total} taken`;
    if (!isNil(entry.taken)) return entry.taken ? 'Taken' : 'Pending';
    return '—';
  }

  if (isNil(entry.value)) return '—';
  const unit = healthDefaults.metrics[metricType]?.unit || '';
  return `${entry.value} ${unit}`.trim();
}

export function formatTime(dateStr, timeStr) {
  if (!dateStr && !timeStr) return '—';
  const date = new Date(`${dateStr || '1970-01-01'}T${timeStr || '00:00'}`);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

export function formatDateTime(dateStr, timeStr) {
  if (!dateStr) return '—';
  const date = new Date(`${dateStr}T${timeStr || '00:00'}`);
  if (Number.isNaN(date.getTime())) return '—';
  const d = date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const t = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  return `${d} ${t}`;
}

export function getTrend(entries, metricType) {
  if (!entries || entries.length < 2) return { direction: 'same', change: 0 };

  const latest = entries[0];
  const previous = entries[1];

  let latestVal;
  let prevVal;

  if (metricType === 'blood_pressure') {
    latestVal = (Number(latest.systolic) + Number(latest.diastolic)) / 2;
    prevVal = (Number(previous.systolic) + Number(previous.diastolic)) / 2;
  } else if (metricType === 'medication') {
    if (isNil(latest.total) || isNil(previous.total)) return { direction: 'same', change: 0 };
    latestVal = Number(latest.taken) / Number(latest.total);
    prevVal = Number(previous.taken) / Number(previous.total);
  } else {
    latestVal = Number(latest.value);
    prevVal = Number(previous.value);
  }

  if (Number.isNaN(latestVal) || Number.isNaN(prevVal)) return { direction: 'same', change: 0 };

  const change = latestVal - prevVal;
  if (Math.abs(change) < 0.1) return { direction: 'same', change };
  return { direction: change > 0 ? 'up' : 'down', change: Math.abs(change) };
}