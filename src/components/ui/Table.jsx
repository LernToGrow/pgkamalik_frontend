import { useTranslation } from 'react-i18next';

export default function Table({ columns, data, actions }) {
  const { t } = useTranslation();
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            {columns.map((col) => (
              <th key={col.key} className="px-4 py-3 text-left font-medium text-slate-600">
                {col.label}
              </th>
            ))}
            {actions && <th className="px-4 py-3 text-left font-medium text-slate-600">{t('table.actions')}</th>}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (actions ? 1 : 0)} className="px-4 py-8 text-center text-slate-400">
                {t('table.noRecords')}
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr key={row._id || i} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-slate-700">
                    {col.render ? col.render(row) : row[col.key] ?? '—'}
                  </td>
                ))}
                {actions && <td className="px-4 py-3">{actions(row)}</td>}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
