import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function NotFound() {
  const { t } = useTranslation();
  const { patient, doctor } = useAuth();
  const homePath = doctor ? '/doctor/dashboard' : patient ? '/dashboard' : '/login';

  return (
    <div className="not-found min-h-[60vh] flex items-center justify-center">
      <div className="text-center space-y-4">
        <p className="text-6xl font-extrabold text-brand-800" aria-hidden="true">404</p>
        <h1 className="text-2xl font-bold text-secondary">{t('common.error')}</h1>
        <p className="text-secondary">{t('notFound.message')}</p>
        <Link to={homePath} className="btn btn-primary inline-flex items-center gap-2">
          <span aria-hidden="true">🏠</span>
          {t('notFound.backHome')}
        </Link>
      </div>
    </div>
  );
}