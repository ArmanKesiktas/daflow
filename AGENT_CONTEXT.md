# Daflow Agent Context

Bu dosya, projeyi yeni bir agent/dev açtığında hızlıca anlaması için hazırlanmıştır. Gizli anahtar veya kişisel token içermez.

## Proje Özeti

Daflow, CSV/Excel ve veritabanı kaynaklarından gelen verileri node tabanlı workflow editor ile analiz eden, grafik/dashboard/rapor üreten bir veri analiz platformudur.

Ana yetenekler:
- Kullanıcı auth sistemi: Supabase Auth.
- Kullanıcı/workspace/project bazlı veri ayrımı.
- Dataset library, file preview, workflow oluşturma ve çalıştırma.
- React Flow tabanlı node editor.
- Analysis, preparation, chart, ML, big data ve output node kategorileri.
- Dashboard ve report üretimi.
- Workflow paylaşımı, workspace/team collaboration, üyeler/roller, activity log, comments.
- In-app notifications, onboarding/page tour, profile settings.
- AI yardımcı özellikleri için Gemini/OpenAI destekli backend entegrasyonu ve rule-based fallback mantığı.
- Remotion ile Daflow tanıtım videosu composition/render akışı.

## Teknik Stack

Frontend:
- React + Vite + TypeScript
- Tailwind CSS
- `@xyflow/react` ile workflow canvas
- Zustand store
- Chart.js / react-chartjs-2
- Remotion: tanıtım videosu için

Backend:
- FastAPI
- pandas/numpy/scipy/sklearn/openpyxl/pyarrow
- Supabase Python client
- ReportLab/Pillow
- Google Gemini / OpenAI SDK paketleri

DB/Auth/Storage:
- Supabase Auth
- Supabase/Postgres migration dosyaları `supabase/migrations/` altında

## Çalıştırma

Backend:

```bash
cd /Users/arman/Desktop/mezuniyet/backend
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Frontend:

```bash
cd /Users/arman/Desktop/mezuniyet/frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

Build:

```bash
cd /Users/arman/Desktop/mezuniyet/frontend
npm run build
```

Remotion video:

```bash
cd /Users/arman/Desktop/mezuniyet/frontend
npm run video:preview
npm run video:render
```

Render edilen video:

```text
frontend/public/daflow-promo.mp4
```

## Ortam Değişkenleri

Backend ve frontend Supabase/Gemini ayarları mevcut local env dosyalarında veya deployment ortamında beklenir. Yeni agent gizli değerleri koda yazmamalıdır.

Tipik değişkenler:

```text
SUPABASE_URL
SUPABASE_ANON_KEY veya publishable key
SUPABASE_SERVICE_ROLE_KEY / secret key
SUPABASE_JWT_SECRET
GEMINI_API_KEY
OPENAI_API_KEY
```

Not:
- Service role/secret key frontend tarafına koyulmamalı.
- Supabase CLI migration çalıştırırken duplicate policy hataları daha önce görüldü. Migration'lar idempotent değilse `DROP POLICY IF EXISTS` veya policy varlık kontrolü gerekebilir.

## Önemli Klasörler

```text
backend/app/api/routes/        FastAPI route dosyaları
backend/app/core/              execution engine ve node registry
backend/app/nodes/             kaynak, analiz, big data, output node implementasyonları
backend/app/services/          workspace, notification, scheduler, secure/share vb servisler
backend/app/schemas/           Pydantic schema dosyaları

frontend/src/api/              frontend API clientları
frontend/src/auth/             auth provider/protected route
frontend/src/components/       ortak UI, navbar, flow, panels, nodes
frontend/src/features/         workspace feature modülleri
frontend/src/hooks/            custom hooks
frontend/src/pages/            route page componentleri
frontend/src/store/            flow/execution zustand store
frontend/src/utils/            templates, chart catalog, validation, export helpers
frontend/src/remotion/         Daflow promo video composition
frontend/public/brand/         logo/brand assetleri
supabase/migrations/           DB migration dosyaları
```

## Mevcut Routing Mantığı

Genel app sayfaları global `Layout` + `Navbar` kullanır:

```text
/workflows
/datasets
/dashboards
/reports
/shared-with-me
/settings
/help
```

Workspace sayfaları global navbar yerine `WorkspaceShell` kullanır:

```text
/workspaces/:workspaceId
/workspaces/:workspaceId/members
/workspaces/:workspaceId/projects
/workspaces/:workspaceId/files
/workspaces/:workspaceId/workflows
/workspaces/:workspaceId/dashboards
/workspaces/:workspaceId/reports
/workspaces/:workspaceId/projects/:projectId
/workspaces/:workspaceId/projects/:projectId/files
/workspaces/:workspaceId/projects/:projectId/workflows
/workspaces/:workspaceId/projects/:projectId/dashboards
/workspaces/:workspaceId/projects/:projectId/reports
```

Workflow editor özel tam ekran layout kullanır:

```text
/workflows/:workflowId/edit
```

Önemli:
- Workspace/project içindeyken sidebar'lı route korunmalı.
- `/workflows` gibi global route'lara yanlış düşülürse aktif workspace/project varsa workspace route'una yönlendirme mantığı vardır.

## Workspace Shell Notları

Dosya:

```text
frontend/src/features/workspaces/components/WorkspaceShell.tsx
```

Amaç:
- Supabase benzeri üst bar + sol sidebar yapısı.
- Workspace switcher, project switcher, command/search palette, notifications, profile.
- Sidebar açık/kapalı mod destekler. Kapalı modda ikonlar görünür.
- Collapse kontrolü hover ile sağ kenarda görünür.
- Search/command palette `rep`, `workflow`, `data`, `dashboard`, `settings` gibi kısmi aramalarda öneri gösterir.

## UI Tasarım Dili

Kullanıcı özellikle sade, clear Apple-style görünüm istiyor.

Kurallar:
- Gereksiz renk patlaması yapma.
- Ana CTA mavi olabilir; destructive kırmızı; bilgi rozetleri düşük kontrast olmalı.
- Border radius çoğunlukla 8-16px arası.
- Dropdown/popover açılışları animasyonlu: `dropdown-popover` class'ı `index.css` içinde tanımlı.
- Light/dark geçişi fade efektli: `useTheme.ts` root'a `theme-transition` ekler.
- Landing page ve app içi theme toggle aynı `ThemeToggle` componentini kullanmalı.

## Workflow Editor Notları

Ana dosyalar:

```text
frontend/src/pages/WorkflowEditorPage.tsx
frontend/src/components/flow/FlowCanvas.tsx
frontend/src/components/flow/Toolbar.tsx
frontend/src/components/panels/NodePanel.tsx
frontend/src/components/panels/ConfigPanel.tsx
frontend/src/components/panels/ResultsPanel.tsx
frontend/src/store/flowStore.ts
```

Önemli davranışlar:
- Node hover preview var.
- Node eklemeden önce preview modalı/önizleme davranışları eklendi.
- Ctrl/Cmd+Z ve redo destekleniyor.
- Çalışan node'lar yeşil/aktif durumla anlaşılır olmalı.
- Route node basit kare ara düğüm olarak kullanılıyor.
- Workflow editor geri butonu aktif workspace/project varsa sidebar'lı workflow listesine dönmeli.

## Node Kategorileri

Öne çıkan kategoriler:
- Source: File Upload, Database Query
- Preparation: Column Types, Missing Values, Duplicates, Filter Rows
- Analysis: Statistics, Distribution, Correlation, Time Series, CCSG-SG anomaly
- Charts: çok sayıda chart tipi, KPI card dahil
- Big Data: Chunk Processing, MapReduce Aggregation, Spark-like GroupBy, Large Dataset Profiler
- ML: Train/Test Split, ML Model
- Utility: Route Node
- Output: Dashboard, Report

CCSG-SG anomaly node sıralaması özellikle korunmalı:
1. Sayısal sütunlardan normalize `U_t`
2. Copula yoğunluğu yaklaşımı ile `alpha_t = -log(c(U_t))`
3. Sliding window conformal p-value
4. Surprise `S_t = -log(p_t)`
5. Stability variance
6. Gate
7. Final anomaly score

Z-score/IQR fallback olarak bu node yerine geçirilmemeli.

## Dashboard / Report Notları

Dashboard tarafında hedefler:
- Filtrelenebilir dashboardlar.
- Dil desteği: TR/EN.
- Chart title/axis/tooltip metinleri aktif dile göre.
- KPI Card chart tipi.
- Dashboard chart ayarları dashboard sağ panelinden değil, bağlanan chart node'larından yapılmalı.
- Dashboard canvas 16:9 sunum mantığını korur.
- Report print A4 portrait olmalı.
- Report printte Daflow logosu / made by Daflow bilgisi görünmeli.

Ana dosyalar:

```text
frontend/src/pages/DashboardPage.tsx
frontend/src/pages/ReportsPage.tsx
frontend/src/pages/ReportDetailPage.tsx
frontend/src/components/charts/DashboardPanelChart.tsx
frontend/src/utils/dashboardEnhancements.ts
frontend/src/utils/chartCatalog.ts
```

## Auth / Supabase Notları

Kullanıcı auth akışı bozulmamalı.

Beklenenler:
- Üye olmadan workflow oluşturulamamalı.
- Giriş yapınca app/workspace tarafına erişilmeli.
- Daflow logosuna tıklayınca login olsa bile landing page görüntülenebilmeli.
- Şifre sıfırlama mail linki `/reset-password` akışına yönlenmeli.
- Kayıt formunda ad, email tekrar, şifre tekrar, policy kabul, onboarding gibi alanlar var.

## Workspace / Collaboration Notları

Workspace yapısı:

```text
Workspace
  Projects
    Files
    Workflows
    Dashboards
    Reports
    Comments
  Members
  Roles
  Invitations
  Activity Logs
```

Roller:
- owner
- admin
- analyst
- viewer
- guest

Önemli:
- Proje bazlı ayrı permission modeli yok; v1'de project/member map workspace üyeleri üzerinden gösterilir.
- Workspace invite email bazlı çalışmalı.
- Notification eventleri: invite, join, comment, role change vb.
- Workspace delete sadece owner tarafında görünmeli/çalışmalı.

## SecureShare / AES Durumu

Kullanıcı daha sonra AES/SecureShare dataset security ekranlarının kaldırılmasını istedi.

Önemli:
- Gereksiz AES/security UI geri eklenmemeli.
- Workflow paylaşma ve workspace paylaşma özellikleri geliştirilebilir.
- Eğer backend'de eski `secure_share.py` gibi dosyalar duruyorsa, UI'a geri bağlamadan önce kullanıcı niyetini doğrula.

## Remotion Video

Tanıtım videosu:

```text
frontend/src/remotion/DaflowPromo.tsx
frontend/public/daflow-promo.mp4
```

Komutlar:

```bash
cd frontend
npm run video:preview
npm run video:render
```

Video 1920x1080, 30fps, 900 frame yaklaşık 30 saniyedir.

## Sık Karşılaşılan Sorunlar

1. Beyaz ekran
   - Genellikle frontend import/export hatası veya Vite cache.
   - Console'da missing export gibi hata varsa ilgili node/component exportlarını kontrol et.

2. Workspace route global navbar'a düşüyor
   - `App.tsx` route'u `WorkspaceShell` ile sarılmış mı kontrol et.
   - Linkler `/workspaces/:workspaceId/...` veya `/workspaces/:workspaceId/projects/:projectId/...` olmalı.

3. Supabase migration duplicate policy
   - Existing policy hatası için migration idempotent hale getir.
   - `DROP POLICY IF EXISTS ...` veya `DO $$` kontrolü kullan.

4. Upload/run 401 veya 500
   - Auth token backend'e gidiyor mu, Supabase env doğru mu, backend route permission check mantığı bozuldu mu kontrol et.

5. Onboarding sürekli çıkıyor
   - `user_onboarding` / `completed_steps` kaydı ve local fallback kontrol edilmeli.

## Kodlama Beklentileri

- Mevcut çalışan özellikleri bozma.
- User'ın önceki hassas isteği: auth/login akışını bozma.
- Büyük refactor yerine küçük, test edilebilir değişiklik yap.
- Frontend değişimlerinde `npm run build` çalıştır.
- Backend değişimlerinde en azından import/compile kontrolü yap.
- Gizli anahtarları commit etme.
- Kullanıcı Türkçe konuşuyor; final cevapları kısa ve Türkçe ver.

## Son Bilinen Doğrulama

Yakın zamanda `frontend` için `npm run build` birçok kez başarılı geçti. Bundle size warning var ama build'i bozmuyor.

```text
(!) Some chunks are larger than 500 kB after minification.
```

Bu uyarı şimdilik kabul edilebilir.
