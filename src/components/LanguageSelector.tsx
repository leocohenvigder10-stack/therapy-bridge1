'use client';

import { LANGUAGES } from '@/lib/languages';

interface Props {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

export default function LanguageSelector({ value, onChange, label }: Props) {
  return (
    <div>
      {label && (
        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-light)' }}>
          {label}
        </label>
      )}
      <select
        className="select-field"
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        <option value="">Select language...</option>
        {LANGUAGES.map(lang => (
          <option key={lang.code} value={lang.code}>
            {lang.nativeName} ({lang.name})
          </option>
        ))}
      </select>
    </div>
  );
}
