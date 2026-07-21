# EVA Atölye — Sipariş & Stok Takip

Firebase Firestore ile gerçek zamanlı senkronize çalışan, ücretsiz barındırılabilir
sipariş yönetim uygulaması.

## Yayına almak (Vercel + GitHub, tamamen ücretsiz, kod yazmadan)

1. **GitHub'a yükle**
   - github.com adresinde ücretsiz bir hesap aç (yoksa).
   - Yeni bir repo oluştur (örn. `eva-atolye-web`), **public** veya **private** olabilir.
   - "Add file → Upload files" ile bu klasördeki TÜM dosya ve klasörleri
     (src/, package.json, vite.config.js, tailwind.config.js, postcss.config.js,
     index.html, README.md) sürükleyip bırak, commit et.

2. **Vercel'e bağla**
   - vercel.com adresine git, GitHub hesabınla giriş yap.
   - "Add New → Project" de, az önce yüklediğin repoyu seç.
   - Vercel otomatik olarak "Vite" projesini tanır, ayar değiştirmene gerek yok.
   - "Deploy" butonuna bas. 1-2 dakika içinde siten yayına girer, sana
     `eva-atolye-web.vercel.app` gibi ücretsiz bir adres verir.

3. Artık bu linki tablette, telefonda, bilgisayarda — hangi cihazdan olursa olsun
   açabilirsin. Firebase Firestore sayesinde tüm cihazlar aynı veriyi görür ve
   bir cihazda yapılan değişiklik anında diğerlerinde de görünür.

## AI Fotoğraf Önizleme (Gemini API) — opsiyonel, ücretli

Yeni Sipariş ekranındaki "Fotoğraf Önizleme Oluştur (AI)" butonu, seçtiğin renklere göre
gerçekçi bir görsel üretir (Google'ın Gemini 2.5 Flash Image / "Nano Banana" modeliyle).
Marka ismi doğrudan görsele yazdırılmıyor, "o markaya benzer sınıfta bir araç" olarak
tarif ediliyor — logo/marka sorunu yaşamamak için.

**Maliyet:** Google'ın güncel fiyatlandırmasına göre görsel başına yaklaşık $0.02–$0.04
arası (ayrıntı için ai.google.dev/gemini-api/docs/pricing sayfasına bak, fiyatlar
zamanla değişebilir). Buton her tıklandığında bir görsel üretilir, otomatik/arka planda
çalışmaz — yani maliyeti sen kontrol edersin.

**Kurulum:**

1. **aistudio.google.com** adresine git, Google hesabınla giriş yap.
2. Sol menüden veya ana sayfadan **"Get API key"** / **"API anahtarı al"** butonuna tıkla.
3. **"Create API key"** de, yeni bir proje oluşturmasına izin ver.
4. Ücretsiz kotanın ötesinde (günlük birkaç yüz istek) kullanmak için, açılan projede
   **billing (faturalandırma)** hesabı bağlaman gerekebilir: console.cloud.google.com →
   ilgili proje → "Billing" → kredi kartı ekle. Küçük bir atölye için aylık maliyet
   genelde birkaç dolar seviyesindedir (kaç görsel ürettiğine bağlı).
5. Oluşan API anahtarını kopyala.
6. **Vercel Dashboard**'da projene git → **Settings → Environment Variables**.
7. Key: `GEMINI_API_KEY`, Value: (kopyaladığın anahtar) — **"Add"** de.
8. Sağ üstten **"Redeploy"** yap (env değişkeni eklemek otomatik yeniden deploy tetiklemez,
   elle bir kez redeploy etmen gerekir).

Bu adımları atlarsan sorun değil — buton "GEMINI_API_KEY tanımlı değil" hatası verir,
uygulamanın geri kalanı (stilize SVG önizleme dahil) etkilenmeden çalışmaya devam eder.

## Firestore güvenlik kuralları (önemli)

Firestore'u "test mode" ile açtıysan, bu mod **30 gün sonra otomatik olarak
kilitlenir** (kimse okuyup yazamaz hale gelir). 30 gün dolmadan önce Firebase
Console → Firestore Database → Rules kısmına gidip aşağıdaki kuralı
yapıştırman gerekir (bu, sadece bu uygulamanın kullandığı "shopData"
koleksiyonuna herkesin okuma/yazma yapmasına izin verir — küçük bir atölye
için yeterlidir, ama linki sadece güvendiğin kişilerle paylaş):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /shopData/{docId} {
      allow read, write: if true;
    }
  }
}
```

## Yerel geliştirme (opsiyonel)

Node.js kuruluysa:

```
npm install
npm run dev
```
