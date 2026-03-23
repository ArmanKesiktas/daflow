# DataFlow Platform — Algoritma Matematiksel Referansı

Projede kullanılan tüm analiz algoritmalarının matematiksel tanımları, formülleri ve uygulama detayları.

---

## 1. Tanımlayıcı İstatistikler (Statistics Node)

### 1.1 Ortalama (Mean)

$$\bar{x} = \frac{1}{n} \sum_{i=1}^{n} x_i$$

**Uygulama:** `series.mean()`
**Açıklama:** Tüm değerlerin toplamının gözlem sayısına bölümü.

---

### 1.2 Medyan (Median)

$$\tilde{x} = \begin{cases} x_{\frac{n+1}{2}} & \text{n tek} \\ \dfrac{x_{\frac{n}{2}} + x_{\frac{n}{2}+1}}{2} & \text{n çift} \end{cases}$$

**Uygulama:** `series.median()`
**Açıklama:** Sıralanmış veri kümesinin orta değeri. Aykırı değerlere dayanıklıdır.

---

### 1.3 Standart Sapma (Standard Deviation)

$$s = \sqrt{\frac{1}{n-1} \sum_{i=1}^{n} (x_i - \bar{x})^2}$$

**Uygulama:** `series.std()` — Bessel düzeltmesi ile örneklem std (n-1).
**Açıklama:** Verilerin ortalama etrafındaki yayılımını ölçer.

---

### 1.4 Varyans (Variance)

$$s^2 = \frac{1}{n-1} \sum_{i=1}^{n} (x_i - \bar{x})^2$$

**Uygulama:** `series.var()`

---

### 1.5 Aralık (Range)

$$R = x_{\max} - x_{\min}$$

---

### 1.6 Çeyrekler Arası Aralık (IQR)

$$\text{IQR} = Q_3 - Q_1$$

Burada:
- $Q_1 = x_{0.25}$ → 1. çeyrek (25. yüzdelik)
- $Q_3 = x_{0.75}$ → 3. çeyrek (75. yüzdelik)

---

### 1.7 Çarpıklık (Skewness) — Fisher-Pearson

$$\gamma_1 = \frac{n}{(n-1)(n-2)} \sum_{i=1}^{n} \left(\frac{x_i - \bar{x}}{s}\right)^3$$

**Uygulama:** `series.skew()`

| Değer | Yorum |
|---|---|
| $|\gamma_1| < 0.5$ | Simetrik |
| $0.5 \le \gamma_1 < 1.0$ | Hafif sağa çarpık |
| $\gamma_1 \ge 1.0$ | Yüksek sağa çarpık |
| $\gamma_1 \le -1.0$ | Yüksek sola çarpık |

---

### 1.8 Basıklık (Kurtosis) — Fisher Excess Kurtosis

$$\gamma_2 = \frac{n(n+1)}{(n-1)(n-2)(n-3)} \sum_{i=1}^{n} \left(\frac{x_i - \bar{x}}{s}\right)^4 - \frac{3(n-1)^2}{(n-2)(n-3)}$$

**Uygulama:** `series.kurtosis()` — Normal dağılım için $\gamma_2 = 0$ (excess kurtosis).

| Değer | Tür | Yorum |
|---|---|---|
| $\gamma_2 \approx 0$ | Mezokurtik | Normal dağılıma benzer kuyruk |
| $\gamma_2 > 0$ | Leptokurtik | Ağır kuyruklar, sivri tepe |
| $\gamma_2 < 0$ | Platykurtik | Hafif kuyruklar, yassı tepe |

---

### 1.9 Varyasyon Katsayısı (Coefficient of Variation)

$$CV = \frac{s}{\bar{x}} \times 100\%$$

**Koşul:** $\bar{x} \neq 0$
**Açıklama:** Birimden bağımsız göreli yayılım ölçüsü.

---

### 1.10 Shapiro-Wilk Normallik Testi

$$W = \frac{\left(\sum_{i=1}^{n} a_i x_{(i)}\right)^2}{\sum_{i=1}^{n} (x_i - \bar{x})^2}$$

Burada $a_i$ sabit katsayılar, $x_{(i)}$ sıralı değerler.
**Uygulama:** `scipy.stats.shapiro(series)` — $n \le 5000$ için.
**Karar:** $p > 0.05$ → Normal dağılım kabul edilir.

---

## 2. Anomali Tespiti (Anomaly Detection Node)

### 2.1 IQR Yöntemi (Interquartile Range)

**Çit sınırları:**

$$L = Q_1 - k \cdot \text{IQR}, \qquad U = Q_3 + k \cdot \text{IQR}$$

**Varsayılan:** $k = 1.5$ (Tukey iç çiti), $k = 3.0$ (Tukey dış çiti)

**Anomali koşulu:**

$$x_i \notin [L, U] \iff x_i < L \;\text{ veya }\; x_i > U$$

**Anomali skoru** (IQR'ye normalize edilmiş mesafe):

$$s_i = \frac{\max(L - x_i,\; x_i - U,\; 0)}{\text{IQR}}$$

---

### 2.2 Z-Skoru (Z-Score)

$$z_i = \frac{x_i - \bar{x}}{s}$$

**Anomali koşulu:** $|z_i| > \theta$ (varsayılan $\theta = 3.0$)

**Açıklama:** Normal dağılım varsayımı altında $|z| > 3$ olan gözlemler ~%0.3'lük bölgede yer alır.

---

### 2.3 Değiştirilmiş Z-Skoru (Modified Z-Score — MAD tabanlı)

**Medyan Mutlak Sapma:**

$$\text{MAD} = \text{median}(|x_i - \tilde{x}|)$$

**Değiştirilmiş Z-Skoru:**

$$M_i = \frac{0.6745 \cdot |x_i - \tilde{x}|}{\text{MAD}}$$

**Sabit:** $0.6745 = \Phi^{-1}(0.75)$ — normal dağılımın 75. yüzdeliği.

**Anomali koşulu:** $M_i > \theta$ (varsayılan $\theta = 3.5$)

**Avantaj:** Aykırı değerlerin ortalama ve std'yi bozmasına karşı dayanıklıdır.

---

### 2.4 Isolation Forest

**Temel fikir:** Anomaliler normal gözlemlerden daha kısa yollarda izole edilir.

**Bir örnek için beklenen yol uzunluğu:**

$$E[h(x)] = \frac{1}{T} \sum_{t=1}^{T} h_t(x)$$

Burada $h_t(x)$ örneğin $t$-inci ağaçtaki kök-yaprak derinliği.

**Normalize edilmiş skor:**

$$s(x, n) = 2^{-\dfrac{E[h(x)]}{c(n)}}$$

Burada $c(n)$ beklenen yol uzunluğu normalleştiricisi:

$$c(n) = 2H(n-1) - \frac{2(n-1)}{n}, \qquad H(k) = \ln(k) + 0.5772\ldots \text{ (Euler sabiti)}$$

**Yorum:**
- $s \to 1$: kısa yol → anomali
- $s \to 0$: uzun yol → normal
- $s \approx 0.5$: belirsiz

**Parametreler:**
- $T$ (n_estimators): ağaç sayısı (varsayılan 100)
- contamination: beklenen aykırı değer oranı (varsayılan 0.05)

---

## 3. Korelasyon Analizi (Correlation Node)

### 3.1 Pearson Korelasyonu

$$r_{xy} = \frac{\sum_{i=1}^{n}(x_i - \bar{x})(y_i - \bar{y})}{\sqrt{\sum_{i=1}^{n}(x_i-\bar{x})^2} \cdot \sqrt{\sum_{i=1}^{n}(y_i-\bar{y})^2}}$$

**Aralık:** $r \in [-1, 1]$
**Varsayım:** Doğrusal ilişki, sürekli değişkenler, normality.

---

### 3.2 Spearman Sıra Korelasyonu

$$r_s = 1 - \frac{6 \sum_{i=1}^{n} d_i^2}{n(n^2-1)}$$

Burada $d_i = \text{rank}(x_i) - \text{rank}(y_i)$ sıra farkı.

**Uygulama:** `scipy.stats.spearmanr`
**Açıklama:** Doğrusal olmayan monotonik ilişkileri de yakalar; aykırı değerlere dayanıklı.

---

### 3.3 Kendall Tau Korelasyonu

$$\tau = \frac{C - D}{\binom{n}{2}}$$

Burada $C$ = uyumlu çift sayısı, $D$ = uyumsuz çift sayısı, $\binom{n}{2} = \frac{n(n-1)}{2}$.

**Uygulama:** `scipy.stats.kendalltau`
**Açıklama:** Küçük örneklemlerde Spearman'dan daha güvenilir.

---

### 3.4 Korelasyon Gücü Sınırlandırması

| $|r|$ Aralığı | Sınıflandırma |
|---|---|
| $|r| \ge 0.9$ | Çok güçlü |
| $0.7 \le |r| < 0.9$ | Güçlü |
| $0.5 \le |r| < 0.7$ | Orta |
| $|r| < 0.5$ | Zayıf |

Varsayılan eşik: $|r| \ge 0.7$ → "güçlü çift" olarak raporlanır.

---

### 3.5 P-değeri Hesabı

Pearson için:

$$t = r\sqrt{\frac{n-2}{1-r^2}}, \qquad t \sim t(n-2)$$

---

## 4. Dağılım Analizi (Distribution Node)

### 4.1 Histogram

Veri aralığı $[x_{\min}, x_{\max}]$ eşit genişlikte $B$ bölmeye ayrılır:

$$\text{bin genişliği} = \frac{x_{\max} - x_{\min}}{B}$$

Her bölmedeki frekans $f_b$ sayılır.

---

### 4.2 Kernel Yoğunluk Tahmini (KDE — Gaussian)

$$\hat{f}(x) = \frac{1}{n h} \sum_{i=1}^{n} K\!\left(\frac{x - x_i}{h}\right)$$

**Gaussian kernel:**

$$K(u) = \frac{1}{\sqrt{2\pi}} e^{-u^2/2}$$

**Bant genişliği** (Scott kuralı):

$$h = 1.06 \cdot \hat{\sigma} \cdot n^{-1/5}$$

**Uygulama:** `scipy.stats.gaussian_kde`

---

### 4.3 D'Agostino-Pearson Normallik Testi

İki bileşeni birleştirir:

$$K^2 = Z_1(\gamma_1)^2 + Z_2(\gamma_2)^2 \sim \chi^2(2)$$

Burada $Z_1$ çarpıklık istatistiği, $Z_2$ basıklık istatistiği.
**Uygulama:** `scipy.stats.normaltest` — $n \ge 8$ için.
**Karar:** $p > 0.05$ → Normal dağılım kabul edilir.

---

### 4.4 Yüzdelikler

$$P_k = x_{\lceil n \cdot k/100 \rceil}$$

Hesaplanan yüzdelikler: P5, P10, P25, P50, P75, P90, P95.

---

## 5. CADA — Contextual Adaptive Distribution Anomaly Detection *(Özgün Algoritma)*

> **Önerilen algoritma.** Mevcut dört yöntemden (IQR, Z-Score, Modified Z-Score, Isolation Forest) farklı olarak; her özniteliğin istatistiksel dağılımını otomatik teşhis eder, dağılıma uygun yöntemi seçer, entropiye dayalı ağırlıklandırma ile birleştirir ve çok değişkenli Mahalanobis mesafesiyle bütünleştirir.

---

### 5.1 Adım 1 — Dağılım Teşhisi

Her $j$. öznitelik için normallik testi uygulanır:

**Shapiro-Wilk** ($n < 50$):

$$W_j = \frac{\left(\sum_{i=1}^{n} a_i x_{(i)}\right)^2}{\sum_{i=1}^{n}(x_i - \bar{x})^2}$$

**D'Agostino K²** ($n \ge 50$):

$$K^2_j = Z_1(\gamma_1)^2 + Z_2(\gamma_2)^2$$

**Sınıflandırma kuralları:**

$$\text{tip}_j = \begin{cases} \texttt{normal} & p_j > 0.05 \;\wedge\; |\gamma_{1,j}| < 0.5 \\ \texttt{skewed} & |\gamma_{1,j}| \ge 1.0 \\ \texttt{heavy\_tailed} & \gamma_{2,j} > 2.0 \\ \texttt{other} & \text{aksi hâl} \end{cases}$$

---

### 5.2 Adım 2 — Dağılıma Uyarlanmış Tek Değişkenli Puanlama

Her öznitelik için, dağılım tipine göre en uygun yöntem seçilir:

| $\text{tip}_j$ | Yöntem | Formül |
|---|---|---|
| `normal` | Modified Z-Score (MAD) | $M_i = \frac{0.6745|x_i - \tilde{x}_j|}{\text{MAD}_j}$ |
| `skewed` | Çarpıklık-Düzeltmeli IQR | $k_j = 1.5 + \|\gamma_{1,j}\| / 4$; anomali: $x_i \notin [Q_{1,j} - k_j \cdot \text{IQR}_j,\; Q_{3,j} + k_j \cdot \text{IQR}_j]$ |
| `heavy_tailed` | Tukey Dış Çiti | $x_i \notin [Q_{1,j} - 3 \cdot \text{IQR}_j,\; Q_{3,j} + 3 \cdot \text{IQR}_j]$ |
| `other` | Standart Z-Score | $z_i = \|x_i - \bar{x}_j\| / s_j$ |

**Normalizasyon** — her öznitelik skoru $[0, 1]$'e min-max ile dönüştürülür:

$$\tilde{s}_{i,j} = \frac{s_{i,j} - \min_j}{\max_j - \min_j + \varepsilon}$$

---

### 5.3 Adım 3 — Entropi Tabanlı Adaptif Ağırlıklandırma *(Ana Katkı)*

Her özniteliğin skor dağılımının **Shannon entropisi** hesaplanır:

$$H_j = -\sum_{b=1}^{B} p_{j,b} \log(p_{j,b})$$

Burada $p_{j,b}$ = $j$. özniteliğin skorlarının $b$. historgam çubuğuna düşen olasılığı; $B = 10$ bölme.

**Normalize ağırlık:**

$$w_j = \frac{H_j}{\sum_{k=1}^{d} H_k}, \qquad \sum_{j=1}^{d} w_j = 1$$

**Ağırlıklı tek değişkenli bileşik skor:**

$$S_{\text{uni},i} = \sum_{j=1}^{d} w_j \cdot \tilde{s}_{i,j}$$

**Fikir:** Yüksek entropili öznitelikler (daha ayrıştırıcı) daha yüksek ağırlık alır; düşük entropili (homojen skor dağılımı) öznitelikler ağırlıktan düşer.

---

### 5.4 Adım 4 — Çok Değişkenli Mahalanobis Skoru

**Robust kovaryans tahmini** — MinCovDet (MCD):

Aykırı değerlerden etkilenmemek için, veri noktalarının en konsantre $h = \lfloor (n + d + 1) / 2 \rfloor$ tanesini seçerek kovaryansı tahmin eder.

**Mahalanobis mesafesi:**

$$D_M(x_i) = \sqrt{(x_i - \hat{\mu})^T \hat{\Sigma}^{-1} (x_i - \hat{\mu})}$$

Burada $\hat{\mu}$ robust ortalama, $\hat{\Sigma}$ robust kovaryans matrisi.

**Chi-kare CDF ile normalizasyon** (serbestlik derecesi $d$ = öznitelik sayısı):

$$S_{\text{mv},i} = F_{\chi^2(d)}(D_M(x_i)^2) \in [0, 1]$$

**Fikir:** $D_M^2 \sim \chi^2(d)$ yaklaşımı altında, CDF skoru her gözlemin çok değişkenli dağılımdan ne kadar uzak olduğunu olasılıksal olarak ifade eder.

---

### 5.5 Adım 5 — Bileşik Skor ve Dinamik Eşik

**Bileşik anomali skoru:**

$$S_i = \alpha \cdot S_{\text{mv},i} + (1 - \alpha) \cdot S_{\text{uni},i}$$

Varsayılan: $\alpha = 0.4$ → çok değişkenli %40, tek değişkenli %60 ağırlık.

**Dinamik eşik** (k-sigma kuralı):

$$\theta = \mu_S + k \cdot \sigma_S$$

Burada $\mu_S = \frac{1}{n}\sum S_i$, $\sigma_S$ = skor std'si, $k = 2.5$ varsayılan.

**Anomali kararı:**

$$y_i = \begin{cases} 1 \;\text{(anomali)} & S_i > \theta \\ 0 \;\text{(normal)} & S_i \le \theta \end{cases}$$

---

### 5.6 Algoritmanın Akademik Özgünlüğü

| Özellik | Mevcut Yöntemler | CADA |
|---|---|---|
| Yöntem seçimi | Sabit (tek yöntem) | Dağılıma uyarlanmış (4 farklı yöntem) |
| Öznitelik ağırlığı | Eşit | Shannon entropisi ile bilgi-teorik |
| Kapsam | Tek değişkenli | Tek + çok değişkenli bütünleşik |
| Kovaryans | Standart | Robust (MCD, maskeleme etkisine karşı) |
| Eşik | Sabit | Veriye bağlı dinamik (k-sigma) |

**Teorik temeller:**
- Shannon, C.E. (1948). *A Mathematical Theory of Communication.*
- Tukey, J.W. (1977). *Exploratory Data Analysis.* — IQR çitleri
- Mahalanobis, P.C. (1936). *On the generalized distance in statistics.*
- Rousseeuw, P.J. (1984). *Least median of squares regression.* — MCD
- Liu, F.T. et al. (2008). *Isolation Forest.* — karşılaştırma için

---

## 6. Özet Karşılaştırma Tablosu

| Algoritma | Tür | Dağılım Varsayımı | Çok Değişkenli | Dayanıklılık | Karmaşıklık |
|---|---|---|---|---|---|
| IQR | Tek değişkenli | Yok | Hayır | Orta | $O(n \log n)$ |
| Z-Score | Tek değişkenli | Normal | Hayır | Düşük | $O(n)$ |
| Modified Z-Score | Tek değişkenli | Yok (MAD) | Hayır | Yüksek | $O(n \log n)$ |
| Isolation Forest | Çok değişkenli | Yok | Evet | Orta | $O(T \cdot n \log n)$ |
| **CADA** | **Hibrit** | **Otomatik teşhis** | **Evet** | **Yüksek (MCD)** | **$O(d \cdot n \log n + n \cdot d^3)$** |

> $n$ = gözlem sayısı, $d$ = öznitelik sayısı, $T$ = ağaç sayısı
