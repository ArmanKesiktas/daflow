import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { filesApi } from '../api/executions'
import type { DatasetDetail } from '../types/workflow'
import { useI18n } from '../i18n'
import { PageHeader } from '../components/ui'

export default function DatasetDetailPage() {
  const { fileId } = useParams()
  const { lang } = useI18n()
  const [dataset, setDataset] = useState<DatasetDetail | null>(null)
  const [loading, setLoading] = useState(true)

  const columns = useMemo(() => dataset?.columns?.map((col) => col.name) ?? [], [dataset])

  useEffect(() => {
    if (!fileId) return
    setLoading(true)
    filesApi.detail(fileId)
      .then(setDataset)
      .catch((err) => toast.error(err?.response?.data?.detail || 'Dataset could not be loaded'))
      .finally(() => setLoading(false))
  }, [fileId])

  return (
    <div className="min-h-screen bg-page-bg text-[var(--color-text-primary)]">
      <main className="max-w-6xl mx-auto px-6 pt-6 pb-8">
        <PageHeader
          title={dataset?.filename || (lang === 'tr' ? 'Veri Kümesi' : 'Dataset')}
          subtitle={
            dataset
              ? `${dataset.row_count.toLocaleString()} ${lang === 'tr' ? 'satır' : 'rows'} · ${dataset.column_count} ${lang === 'tr' ? 'sütun' : 'columns'}`
              : undefined
          }
          backTo="/datasets"
          actions={
            fileId ? (
              <a
                href={filesApi.downloadUrl(fileId)}
                className="h-8 px-3 rounded-lg bg-primary text-white text-[12px] font-medium flex items-center transition-all duration-150 hover:opacity-90 active:scale-[0.97]"
              >
                {lang === 'tr' ? 'İndir' : 'Download'}
              </a>
            ) : undefined
          }
        />

        {loading && (
          <div className="h-64 flex items-center justify-center">
            <span className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
          </div>
        )}

        {!loading && dataset && (
          <>
            <section className="grid md:grid-cols-4 gap-3 mb-6">
              <Status label={lang === 'tr' ? 'Dosya' : 'File'} value={dataset.filename} />
              <Status label={lang === 'tr' ? 'Satır' : 'Rows'} value={dataset.row_count.toLocaleString()} />
              <Status label={lang === 'tr' ? 'Sütun' : 'Columns'} value={dataset.column_count.toLocaleString()} />
              <Status label={lang === 'tr' ? 'Boyut' : 'Size'} value={`${dataset.size_bytes.toLocaleString()} bytes`} />
            </section>

            <section className="rounded-lg border border-[var(--color-border-default)] bg-surface shadow-sm overflow-hidden">
              <div className="px-4 py-4 border-b border-[var(--color-border-subtle)]">
                <h2 className="text-[15px] font-semibold leading-[22px] text-[var(--color-text-primary)]">
                  {lang === 'tr' ? 'Veri Kümesi Önizleme' : 'Dataset Preview'}
                </h2>
                <p className="text-[12px] text-[var(--color-text-secondary)] mt-0.5">
                  {lang === 'tr' ? 'Yüklenen tablonun ilk satırları.' : 'First rows from the uploaded table.'}
                </p>
              </div>
              <div className="overflow-auto max-h-[560px]">
                <table className="w-full text-left text-[12px]">
                  <thead className="sticky top-0 bg-page-bg">
                    <tr>
                      {columns.map((col) => (
                        <th key={col} className="px-3 py-2 font-medium whitespace-nowrap text-[var(--color-text-primary)]">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dataset.preview.map((row, index) => (
                      <tr key={index} className="border-t border-[var(--color-border-subtle)]">
                        {columns.map((col) => (
                          <td key={col} className="px-3 py-2 text-[var(--color-text-secondary)] whitespace-nowrap">
                            {String(row[col] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {dataset.preview.length === 0 && (
                  <div className="p-8 text-center text-[13px] text-[var(--color-text-muted)]">
                    No preview available.
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  )
}

function Status({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--color-border-default)] bg-surface shadow-sm p-4 min-w-0">
      <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)]">{label}</p>
      <p className="text-[13px] font-medium truncate mt-1 text-[var(--color-text-primary)]">{value}</p>
    </div>
  )
}
