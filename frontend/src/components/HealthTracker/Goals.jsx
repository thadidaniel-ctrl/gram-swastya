import React, { useState } from 'react';
import healthDefaults from '../../data/health-defaults.json';
import GoalCard from './GoalCard';
import { clampProgress, todayKey } from './utils';
import styles from './HealthTracker.module.css';

const GOAL_TYPES = Object.keys(healthDefaults.goals);

export default function Goals({ goals, metrics, addGoal, updateGoal, deleteGoal }) {
  const { t } = useTranslation();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [formData, setFormData] = useState({
    type: 'weight',
    target: '',
    deadline: '',
    unit: ''
  });

  const getCurrentValue = (type) => {
    const entries = (metrics && metrics[type]) || [];
    if (!entries.length) return 0;
    const latest = entries[0];
    if (type === 'blood_pressure') {
      if (latest.systolic == null) return 0;
      return { systolic: Number(latest.systolic), diastolic: Number(latest.diastolic) };
    }
    return Number(latest.value);
  };

  const getGoalProgress = (goal) => {
    const current = getCurrentValue(goal.type);
    const target = Number(goal.target);
    if (Number.isNaN(target) || target <= 0) return 0;

    if (goal.type === 'medication') {
      const entries = (metrics && metrics.medication) || [];
      const today = entries.filter(e => e.date === todayKey());
      if (!today.length) return 0;
      const taken = today.filter(m => m.taken).length;
      return Math.round((taken / today.length) * 100);
    }

    if (goal.type === 'blood_pressure') {
      if (typeof current !== 'object' || current.systolic == null) return 0;
      return clampProgress((target / current.systolic) * 100);
    }

    if (goal.type === 'weight') {
      if (!current) return 0;
      return clampProgress((target / current) * 100);
    }

    if (!current) return 0;
    return clampProgress((current / target) * 100);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const target = parseFloat(formData.target);
    if (Number.isNaN(target) || target <= 0) return;

    if (editingGoal) {
      updateGoal(editingGoal.id, { target, deadline: formData.deadline || '' });
    } else {
      addGoal({
        type: formData.type,
        target,
        deadline: formData.deadline || '',
        unit: formData.unit,
        current: getCurrentValue(formData.type)
      });
    }

    setEditingGoal(null);
    setShowAddForm(false);
    setFormData({ type: 'weight', target: '', deadline: '', unit: '' });
  };

  const handleEdit = (goal) => {
    setEditingGoal(goal);
    setFormData({
      type: goal.type,
      target: String(goal.target || ''),
      deadline: goal.deadline || '',
      unit: healthDefaults.goals[goal.type].unit
    });
    setShowAddForm(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Delete this goal?')) {
      deleteGoal(id);
    }
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingGoal(null);
    setFormData({ type: 'weight', target: '', deadline: '', unit: '' });
  };

  const handleTypeChange = (e) => {
    const type = e.target.value;
    setFormData(prev => ({
      ...prev,
      type,
      target: '',
      unit: healthDefaults.goals[type].unit
    }));
  };

  return (
    <div className={styles.goals}>
      <div className={styles.goalsHeader}>
        <h2 className={styles.title}>🎯 Health Goals</h2>
        <button className={styles.fab} onClick={() => { setEditingGoal(null); setShowAddForm(true); }}>
          + Add Goal
        </button>
      </div>

      {showAddForm && (
        <div className={styles.modalOverlay} onClick={handleCancel}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <header className={styles.modalHeader}>
              <h3>{editingGoal ? 'Edit Goal' : 'Set New Goal'}</h3>
              <button className={styles.modalClose} onClick={handleCancel}>✕</button>
            </header>
            <form onSubmit={handleFormSubmit} className={styles.goalForm}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Goal Type</label>
                <select value={formData.type} onChange={handleTypeChange} className={styles.select}>
                  {GOAL_TYPES.map(type => (
                    <option key={type} value={type}>
                      {healthDefaults.goals[type].icon} {healthDefaults.goals[type].label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Target Value ({formData.unit || healthDefaults.goals[formData.type].unit})</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  className={styles.input}
                  value={formData.target}
                  onChange={e => setFormData(prev => ({ ...prev, target: e.target.value }))}
                  required
                  placeholder={String(healthDefaults.goals[formData.type].defaultTarget)}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Deadline (Optional)</label>
                <input
                  type="date"
                  className={styles.input}
                  value={formData.deadline}
                  onChange={e => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
                  min={todayKey()}
                />
              </div>

              <div className={styles.formActions}>
                <button type="button" className={styles.btnSecondary} onClick={handleCancel}>
                  Cancel
                </button>
                <button type="submit" className={styles.btnPrimary}>
                  {editingGoal ? 'Update Goal' : 'Create Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {(goals || []).length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>🎯</span>
          <h3>No Goals Yet</h3>
          <p>Set a health goal to track your progress and stay motivated.</p>
          <button className={styles.fab} onClick={() => { setEditingGoal(null); setShowAddForm(true); }}>
            + Set First Goal
          </button>
        </div>
      ) : (
        <div className={styles.goalsGrid}>
          {goals.map(goal => (
            <GoalCard
              key={goal.id}
              goal={goal}
              config={healthDefaults.goals[goal.type]}
              current={getCurrentValue(goal.type)}
              progress={getGoalProgress(goal)}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}