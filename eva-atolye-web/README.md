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
