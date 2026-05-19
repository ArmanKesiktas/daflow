import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

export type Lang = 'en' | 'tr'

// ── Translation strings ───────────────────────────────────────────────────────

const translations = {
  en: {
    // App / Nav
    appName: 'Daflow',
    workflows: 'Workflows',
    reports: 'Reports',
    newWorkflow: 'New Workflow',
    creating: 'Creating…',
    switchToLight: 'Switch to Light Mode',
    switchToDark: 'Switch to Dark Mode',
    language: 'Language',

    // WorkflowsListPage
    workflowsSubtitle: 'Build and run your data analysis pipelines.',
    loading: 'Loading…',
    noWorkflowsYet: 'No workflows yet',
    noWorkflowsDesc: 'Create your first data analysis pipeline.',
    nodes: 'nodes',
    deleteWorkflow: 'Delete workflow',

    // WorkflowEditor / Toolbar
    save: 'Save',
    saved: 'Saved',
    run: 'Run',
    stop: 'Stop',
    running: 'Running',
    workflowStarted: 'Workflow started',
    workflowStopped: 'Workflow stopped',
    failedToStart: 'Failed to start workflow',
    failedToStop: 'Failed to stop workflow',
    failedToSave: 'Save your workflow first',
    backToWorkflows: 'Back to workflows',

    // NodePanel
    components: 'Components',
    bigData: 'Big Data',
    utility: 'Utility',
    charts: 'Charts',
    ml: 'Machine Learning',

    // ConfigPanel
    selectNode: 'Select a node',
    noConfigNeeded: 'No configuration needed.',
    viewGuide: 'View guide →',

    // ResultsPanel
    nodeOutput: 'Node Output',
    loadResult: 'Load Result',
    loadingResult: 'Loading…',
    selectNodeToInspect: 'Select a node to inspect',
    failedToLoadResults: 'Failed to load results',

    // ReportsPage
    reportsSubtitle: 'Generated from workflow executions',
    noReportsYet: 'No reports yet',
    noReportsDesc: 'Add a Report node to a workflow and run it',
    generatedAt: 'Generated',
    backToWorkflowsList: 'Workflows',
    sections: 'sections',

    // Status
    idle: 'idle',
    success: 'success',
    error: 'error',

    // Node category labels
    source: 'Source',
    preparation: 'Preparation',
    analysis: 'Analysis',
    output: 'Output',

    // Node labels
    fileUpload: 'File Upload',
    columnTypes: 'Column Types',
    missingValues: 'Missing Values',
    duplicates: 'Duplicates',
    filterRows: 'Filter Rows',
    statistics: 'Statistics',
    anomalyDetection: 'Anomaly Detection',
    correlation: 'Correlation',
    distribution: 'Distribution',
    dashboard: 'Dashboard',
    report: 'Report',
    aiInsights: 'AI Insights',
    aiInsightsSubtitle: 'Automated analysis summary',
    close: 'Close',

    // Node descriptions (in sidebar)
    descFileUpload: 'Load CSV or Excel dataset',
    descColumnTypes: 'Detect semantic column types',
    descMissingValues: 'Analyse and impute missing data',
    descDuplicates: 'Find and remove duplicate rows',
    descFilterRows: 'Filter rows by condition',
    descStatistics: 'Mean, std, skewness, kurtosis',
    descAnomalyDetection: 'IQR, Z-Score or Isolation Forest',
    descCorrelation: 'Correlation matrix and strong pairs',
    descDistribution: 'Histogram, KDE & normality tests',
    descDashboard: 'Visual analysis dashboard',
    descReport: 'Generate structured PDF report',
    descAiInsights: 'Natural language interpretation',
    chunkProcessing: 'Chunk Processing',
    mapReduceAggregation: 'MapReduce Aggregation',
    sparkGroupBy: 'Spark-like GroupBy',
    largeDatasetProfiler: 'Large Dataset Profiler',
    routeNode: 'Route Node',
    descChunkProcessing: 'Process large tables in row chunks',
    descMapReduceAggregation: 'Map and reduce grouped aggregates',
    descSparkGroupBy: 'Partitioned Spark-style groupBy',
    descLargeDatasetProfiler: 'Profile scale, memory, missingness',
    descRouteNode: 'Collect branches and pass results onward',

    // ConfigPanel field labels
    method: 'Method',
    iqrMultiplier: 'IQR Multiplier',
    zscoreThreshold: 'Z-Score Threshold',
    contamination: 'Contamination (0-0.5)',
    strategy: 'Strategy',
    strongCorrelationThreshold: 'Strong Correlation Threshold',
    columnName: 'Column Name',
    operator: 'Operator',
    value: 'Value',
    reportTitle: 'Report Title',
    dashboardTitle: 'Dashboard Title',
    histogramBins: 'Histogram Bins',
    aiProvider: 'AI Provider',
    reportLanguage: 'Report Language',
    uploadDataset: 'Upload Dataset',

    // Guide / Help panel
    options: 'Options',

    // Landing page – Navbar
    landing_features: 'Features',
    landing_howItWorks: 'How It Works',
    landing_pricing: 'Pricing',
    landing_login: 'Login',
    landing_signUp: 'Sign Up',

    // Landing page – Hero
    landing_hero_headline: 'Turn Raw Data Into Insights',
    landing_hero_subheadline: 'Build visual data pipelines with drag-and-drop. Analyze CSV, Excel, and database sources. Generate dashboards and reports — no code required.',
    landing_hero_cta_primary: 'Get Started Free',
    landing_hero_cta_secondary: 'Watch Demo',

    // Landing page – Features
    landing_features_title: 'Everything you need for data analysis',
    landing_features_subtitle: 'From raw data to actionable insights in minutes, not days.',
    landing_feature_workflow_title: 'Visual Workflow Editor',
    landing_feature_workflow_desc: 'Build complex data pipelines by connecting nodes on an intuitive drag-and-drop canvas.',
    landing_feature_ai_title: 'AI-Powered Insights',
    landing_feature_ai_desc: 'Get intelligent analysis summaries and anomaly detection powered by advanced AI models.',
    landing_feature_dashboard_title: 'Dashboards & Reports',
    landing_feature_dashboard_desc: 'Generate interactive dashboards and exportable PDF reports from your analysis results.',
    landing_feature_collab_title: 'Workspace Collaboration',
    landing_feature_collab_desc: 'Work together with role-based access, comments, activity feeds, and shared workspaces.',
    landing_feature_bigdata_title: 'Big Data Ready',
    landing_feature_bigdata_desc: 'Process large datasets with chunk processing, MapReduce aggregation, and streaming pipelines.',

    // Landing page – Showcase
    landing_showcase_title: 'See Daflow in action',
    landing_showcase_subtitle: 'From pipeline to polished report — a quick tour of what you get out of the box.',
    landing_showcase_tab_workflow: 'Workflow Editor',
    landing_showcase_tab_dashboard: 'Dashboard',
    landing_showcase_tab_report: 'Report',

    // Landing page – How It Works
    landing_howItWorks_title: 'How It Works',
    landing_step1_title: 'Upload Your Data',
    landing_step1_desc: 'Import CSV, Excel files or connect to databases and APIs. Your data stays secure.',
    landing_step2_title: 'Build Your Workflow',
    landing_step2_desc: 'Drag analysis nodes onto the canvas and connect them to create your data pipeline.',
    landing_step3_title: 'Get Results',
    landing_step3_desc: 'Run your workflow and instantly get dashboards, reports, and AI-powered insights.',

    // Landing page – Trust
    landing_trust_title: 'Trusted by data professionals',
    landing_stat_users: 'Active Users',
    landing_stat_workflows: 'Workflows Run',
    landing_stat_datasources: 'Data Sources',

    // Landing page – Pricing
    landing_pricing_title: 'Simple, transparent pricing',
    landing_pricing_subtitle: 'Start free. Upgrade when you need more.',
    landing_pricing_free: 'Free',
    landing_pricing_pro: 'Pro',
    landing_pricing_enterprise: 'Enterprise',
    landing_pricing_cta_free: 'Start Free',
    landing_pricing_cta_pro: 'Start Pro Trial',
    landing_pricing_cta_enterprise: 'Contact Sales',
    landing_pricing_custom: 'Custom',
    landing_pricing_free_f1: '3 workflows',
    landing_pricing_free_f2: '100MB storage',
    landing_pricing_free_f3: 'Basic analysis nodes',
    landing_pricing_free_f4: 'Community support',
    landing_pricing_pro_f1: 'Unlimited workflows',
    landing_pricing_pro_f2: '10GB storage',
    landing_pricing_pro_f3: 'AI insights & ML nodes',
    landing_pricing_pro_f4: 'Workspace collaboration',
    landing_pricing_pro_f5: 'Priority support',
    landing_pricing_pro_f6: 'Custom dashboards',
    landing_pricing_ent_f1: 'Everything in Pro',
    landing_pricing_ent_f2: 'Unlimited storage',
    landing_pricing_ent_f3: 'SSO & advanced security',
    landing_pricing_ent_f4: 'Dedicated support',
    landing_pricing_ent_f5: 'Custom integrations',

    // Landing page – Footer
    landing_footer_desc: 'The modern data analysis platform for workspaces.',
    landing_footer_product: 'Product',
    landing_footer_company: 'Company',
    landing_footer_legal: 'Legal',
    landing_footer_newsletter_placeholder: 'Enter your email',
    landing_footer_newsletter_submit: 'Subscribe',
    landing_footer_newsletter_success: 'Thanks for subscribing!',
    landing_footer_newsletter_error: 'Please enter a valid email address.',
    landing_footer_privacy: 'Privacy Policy',
    landing_footer_terms: 'Terms of Service',
  },

  tr: {
    // App / Nav
    appName: 'Daflow',
    workflows: 'İş Akışları',
    reports: 'Raporlar',
    newWorkflow: 'Yeni İş Akışı',
    creating: 'Oluşturuluyor…',
    switchToLight: 'Açık Temaya Geç',
    switchToDark: 'Koyu Temaya Geç',
    language: 'Dil',

    // WorkflowsListPage
    workflowsSubtitle: 'Veri analizi iş akışlarınızı oluşturun ve çalıştırın.',
    loading: 'Yükleniyor…',
    noWorkflowsYet: 'Henüz iş akışı yok',
    noWorkflowsDesc: 'İlk veri analizi hattınızı oluşturun.',
    nodes: 'düğüm',
    deleteWorkflow: 'İş akışını sil',

    // WorkflowEditor / Toolbar
    save: 'Kaydet',
    saved: 'Kaydedildi',
    run: 'Çalıştır',
    stop: 'Durdur',
    running: 'Çalışıyor',
    workflowStarted: 'İş akışı başlatıldı',
    workflowStopped: 'İş akışı durduruldu',
    failedToStart: 'İş akışı başlatılamadı',
    failedToStop: 'İş akışı durdurulamadı',
    failedToSave: 'Önce iş akışını kaydedin',
    backToWorkflows: 'İş akışlarına dön',

    // NodePanel
    components: 'Bileşenler',
    bigData: 'Büyük Veri',
    utility: 'Araçlar',
    charts: 'Grafikler',
    ml: 'Makine Öğrenmesi',

    // ConfigPanel
    selectNode: 'Bir düğüm seçin',
    noConfigNeeded: 'Yapılandırma gerekmez.',
    viewGuide: 'Kılavuzu görüntüle →',

    // ResultsPanel
    nodeOutput: 'Düğüm Çıktısı',
    loadResult: 'Sonucu Yükle',
    loadingResult: 'Yükleniyor…',
    selectNodeToInspect: 'İncelemek için bir düğüm seçin',
    failedToLoadResults: 'Sonuçlar yüklenemedi',

    // ReportsPage
    reportsSubtitle: 'İş akışı çalıştırmalarından oluşturuldu',
    noReportsYet: 'Henüz rapor yok',
    noReportsDesc: 'Bir iş akışına Rapor düğümü ekleyin ve çalıştırın',
    generatedAt: 'Oluşturuldu',
    backToWorkflowsList: 'İş Akışları',
    sections: 'bölüm',

    // Status
    idle: 'beklemede',
    success: 'başarılı',
    error: 'hata',

    // Node category labels
    source: 'Kaynak',
    preparation: 'Hazırlık',
    analysis: 'Analiz',
    output: 'Çıktı',

    // Node labels
    fileUpload: 'Dosya Yükle',
    columnTypes: 'Sütun Tipleri',
    missingValues: 'Eksik Değerler',
    duplicates: 'Tekrarlar',
    filterRows: 'Satır Filtrele',
    statistics: 'İstatistikler',
    anomalyDetection: 'Anomali Tespiti',
    correlation: 'Korelasyon',
    distribution: 'Dağılım',
    dashboard: 'Gösterge Paneli',
    report: 'Rapor',
    aiInsights: 'YZ Analizi',
    aiInsightsSubtitle: 'Otomatik analiz özeti',
    close: 'Kapat',

    // Node descriptions (in sidebar)
    descFileUpload: 'CSV veya Excel veri seti yükle',
    descColumnTypes: 'Semantik sütun tiplerini algıla',
    descMissingValues: 'Eksik verileri analiz et ve doldur',
    descDuplicates: 'Tekrar eden satırları bul ve kaldır',
    descFilterRows: 'Koşula göre satır filtrele',
    descStatistics: 'Ortalama, std, çarpıklık, basıklık',
    descAnomalyDetection: 'IQR, Z-Skoru veya Isolation Forest',
    descCorrelation: 'Korelasyon matrisi ve güçlü çiftler',
    descDistribution: 'Histogram, KDE ve normallik testleri',
    descDashboard: 'Görsel analiz gösterge paneli',
    descReport: 'Yapılandırılmış PDF raporu oluştur',
    descAiInsights: 'Doğal dil yorumu',
    chunkProcessing: 'Parça İşleme',
    mapReduceAggregation: 'MapReduce Toplama',
    sparkGroupBy: 'Spark Benzeri GroupBy',
    largeDatasetProfiler: 'Büyük Veri Profili',
    routeNode: 'Ara Düğüm',
    descChunkProcessing: 'Büyük tabloları satır parçaları halinde işler',
    descMapReduceAggregation: 'Gruplu metrikleri map ve reduce adımlarıyla hesaplar',
    descSparkGroupBy: 'Partition tabanlı Spark benzeri groupBy',
    descLargeDatasetProfiler: 'Ölçek, bellek ve eksik veri profilini çıkarır',
    descRouteNode: 'Dalları toplar ve sonucu sonraki düğümlere aktarır',

    // ConfigPanel field labels
    method: 'Yöntem',
    iqrMultiplier: 'IQR Çarpanı',
    zscoreThreshold: 'Z-Skoru Eşiği',
    contamination: 'Kirlilik Oranı (0-0.5)',
    strategy: 'Strateji',
    strongCorrelationThreshold: 'Güçlü Korelasyon Eşiği',
    columnName: 'Sütun Adı',
    operator: 'Operatör',
    value: 'Değer',
    reportTitle: 'Rapor Başlığı',
    dashboardTitle: 'Panel Başlığı',
    histogramBins: 'Histogram Aralıkları',
    aiProvider: 'YZ Sağlayıcı',
    reportLanguage: 'Rapor Dili',
    uploadDataset: 'Veri Seti Yükle',

    // Guide / Help panel
    options: 'Seçenekler',

    // Landing page – Navbar
    landing_features: 'Özellikler',
    landing_howItWorks: 'Nasıl Çalışır',
    landing_pricing: 'Fiyatlandırma',
    landing_login: 'Giriş Yap',
    landing_signUp: 'Kayıt Ol',

    // Landing page – Hero
    landing_hero_headline: 'Ham Veriyi İçgörüye Dönüştür',
    landing_hero_subheadline: 'Sürükle-bırak ile görsel veri hatları oluşturun. CSV, Excel ve veritabanı kaynaklarını analiz edin. Dashboard ve raporlar üretin — kod yazmadan.',
    landing_hero_cta_primary: 'Ücretsiz Başla',
    landing_hero_cta_secondary: 'Demo İzle',

    // Landing page – Features
    landing_features_title: 'Veri analizi için ihtiyacınız olan her şey',
    landing_features_subtitle: 'Ham veriden eyleme dönüştürülebilir içgörülere dakikalar içinde ulaşın.',
    landing_feature_workflow_title: 'Görsel Workflow Editörü',
    landing_feature_workflow_desc: 'Sezgisel sürükle-bırak canvas üzerinde node bağlayarak karmaşık veri hatları oluşturun.',
    landing_feature_ai_title: 'Yapay Zeka Destekli Analiz',
    landing_feature_ai_desc: 'Gelişmiş AI modelleri ile akıllı analiz özetleri ve anomali tespiti alın.',
    landing_feature_dashboard_title: 'Dashboard ve Raporlar',
    landing_feature_dashboard_desc: 'Analiz sonuçlarınızdan interaktif dashboardlar ve dışa aktarılabilir PDF raporlar üretin.',
    landing_feature_collab_title: 'Workspace İşbirliği',
    landing_feature_collab_desc: 'Rol tabanlı erişim, yorumlar, aktivite akışı ve paylaşılan workspace ile birlikte çalışın.',
    landing_feature_bigdata_title: 'Büyük Veri Desteği',
    landing_feature_bigdata_desc: 'Chunk processing, MapReduce ve streaming pipeline ile büyük veri setlerini işleyin.',

    // Landing page – Showcase
    landing_showcase_title: 'Daflow\u2019u iş başında görün',
    landing_showcase_subtitle: 'Pipeline\u2019dan cilalı rapora — kutudan çıkar çıkmaz elde ettiklerinize kısa bir bakış.',
    landing_showcase_tab_workflow: 'Workflow Editörü',
    landing_showcase_tab_dashboard: 'Dashboard',
    landing_showcase_tab_report: 'Rapor',

    // Landing page – How It Works
    landing_howItWorks_title: 'Nasıl Çalışır',
    landing_step1_title: 'Verinizi Yükleyin',
    landing_step1_desc: 'CSV, Excel dosyalarını içe aktarın veya veritabanı ve API bağlantısı kurun. Verileriniz güvende.',
    landing_step2_title: 'Workflow Oluşturun',
    landing_step2_desc: 'Analiz node larını canvas üzerine sürükleyin ve bağlayarak veri hattınızı oluşturun.',
    landing_step3_title: 'Sonuçları Alın',
    landing_step3_desc: 'Workflow u çalıştırın ve anında dashboard, rapor ve AI destekli içgörüler elde edin.',

    // Landing page – Trust
    landing_trust_title: 'Veri profesyonelleri tarafından tercih ediliyor',
    landing_stat_users: 'Aktif Kullanıcı',
    landing_stat_workflows: 'Çalıştırılan Workflow',
    landing_stat_datasources: 'Veri Kaynağı',

    // Landing page – Pricing
    landing_pricing_title: 'Basit, şeffaf fiyatlandırma',
    landing_pricing_subtitle: 'Ücretsiz başlayın. İhtiyacınız olduğunda yükseltin.',
    landing_pricing_free: 'Ücretsiz',
    landing_pricing_pro: 'Pro',
    landing_pricing_enterprise: 'Kurumsal',
    landing_pricing_cta_free: 'Ücretsiz Başla',
    landing_pricing_cta_pro: 'Pro Denemeyi Başlat',
    landing_pricing_cta_enterprise: 'Satışla İletişime Geç',
    landing_pricing_custom: 'Özel',
    landing_pricing_free_f1: '3 workflow',
    landing_pricing_free_f2: '100MB depolama',
    landing_pricing_free_f3: 'Temel analiz node ları',
    landing_pricing_free_f4: 'Topluluk desteği',
    landing_pricing_pro_f1: 'Sınırsız workflow',
    landing_pricing_pro_f2: '10GB depolama',
    landing_pricing_pro_f3: 'AI içgörüler ve ML node ları',
    landing_pricing_pro_f4: 'Workspace işbirliği',
    landing_pricing_pro_f5: 'Öncelikli destek',
    landing_pricing_pro_f6: 'Özel dashboardlar',
    landing_pricing_ent_f1: 'Pro daki her şey',
    landing_pricing_ent_f2: 'Sınırsız depolama',
    landing_pricing_ent_f3: 'SSO ve gelişmiş güvenlik',
    landing_pricing_ent_f4: 'Özel destek',
    landing_pricing_ent_f5: 'Özel entegrasyonlar',

    // Landing page – Footer
    landing_footer_desc: 'Workspace tabanlı modern veri analizi platformu.',
    landing_footer_product: 'Ürün',
    landing_footer_company: 'Şirket',
    landing_footer_legal: 'Yasal',
    landing_footer_newsletter_placeholder: 'E-posta adresinizi girin',
    landing_footer_newsletter_submit: 'Abone Ol',
    landing_footer_newsletter_success: 'Abone olduğunuz için teşekkürler!',
    landing_footer_newsletter_error: 'Lütfen geçerli bir e-posta adresi girin.',
    landing_footer_privacy: 'Gizlilik Politikası',
    landing_footer_terms: 'Kullanım Koşulları',
  },
} as const

export type TranslationKey = keyof typeof translations.en

// ── Context ───────────────────────────────────────────────────────────────────

interface I18nContextValue {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: TranslationKey) => string
}

const I18nContext = createContext<I18nContextValue>({
  lang: 'en',
  setLang: () => {},
  t: (key) => key,
})

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = localStorage.getItem('daflow_lang')
    return stored === 'tr' ? 'tr' : 'en'
  })

  const setLang = (l: Lang) => {
    setLangState(l)
    localStorage.setItem('daflow_lang', l)
  }

  const t = (key: TranslationKey): string => translations[lang][key] as string

  // Sync document <title>
  useEffect(() => {
    document.title = 'Daflow'
  }, [])

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  return useContext(I18nContext)
}
