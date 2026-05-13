export function friendlyError(error: unknown, lang: 'tr' | 'en' = 'en'): string {
  const raw = responseMessage(error).toLowerCase()
  const tr = lang === 'tr'
  if (raw.includes('permission') || raw.includes('unauthorized') || raw.includes('403')) {
    return tr ? 'Bu işlem için yetkiniz yok. Paylaşım iznini kontrol edin.' : 'You do not have permission for this action. Check sharing permissions.'
  }
  if (raw.includes('unsupported file') || raw.includes('parse') || raw.includes('could not read')) {
    return tr ? 'Dosya okunamadı. CSV/Excel formatını ve başlık satırını kontrol edin.' : 'The file could not be read. Check the CSV/Excel format and header row.'
  }
  if (raw.includes('column') || raw.includes('not found')) {
    return tr ? 'Beklenen sütun bulunamadı. Node ayarındaki kolon adını veri setinizle eşleştirin.' : 'An expected column was not found. Match the node setting to your dataset column.'
  }
  if (raw.includes('network') || raw.includes('failed to fetch')) {
    return tr ? 'Sunucuya ulaşılamıyor. Backend ve internet bağlantısını kontrol edin.' : 'The server cannot be reached. Check the backend and connection.'
  }
  return tr ? 'İşlem tamamlanamadı. Veri yükleme node’unun çalıştığını ve bağlantıların doğru olduğunu kontrol edin.' : 'The action could not be completed. Confirm the upload node ran and connections are valid.'
}

function responseMessage(error: unknown): string {
  if (typeof error === 'string') return error
  if (error && typeof error === 'object') {
    const anyError = error as { message?: string; response?: { data?: { detail?: string } } }
    return anyError.response?.data?.detail || anyError.message || ''
  }
  return ''
}
