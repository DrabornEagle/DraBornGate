# DraBornGate — Data Safety Beyan Taslağı

Bu dosya Play Console formuna veri girmek için taslaktır. Üretim Supabase/Firebase yapılandırmasıyla son kez karşılaştırılmalıdır.

## Toplanan veri türleri

### Kişisel bilgiler
- Ad soyad
- E-posta adresi
- Telefon numarası (kullanıcı girerse)
- Profil fotoğrafı (kullanıcı seçerse)
- Kullanıcı rolü ve kurye plakası/platform bilgisi

Amaç: hesap yönetimi, kimlik/profil, site rolü, güvenlik ve destek.

### Konum
- Yaklaşık ve hassas konum, yalnızca uygulama kullanımdayken

Amaç: site pini seçimi ve Akıllı Geçiş mesafe doğrulaması. Arka plan konumu yoktur.

### Fotoğraflar
- Kullanıcının sistem seçicisinden özellikle seçtiği profil veya teslimat görseli

Amaç: profil fotoğrafı, kurye sipariş ekran görüntüsü ve OCR. Galerinin tamamına geniş erişim istenmez.

### Uygulama etkinliği ve kayıtlar
- Kurye/ziyaretçi geçiş talepleri
- Kapıya varış, kod doğrulama, giriş, ret ve iptal zamanları
- Site yönetimi rapor kayıtları
- Abonelik ürün ve doğrulama kayıtları

Amaç: temel uygulama işlevi, güvenlik, dolandırıcılığı önleme, raporlama ve destek.

### Cihaz veya diğer kimlikler
- Bildirim gönderimi için FCM cihaz anahtarı

Amaç: uygulama bildirimleri. Reklam profillemesi için kullanılmaz.

## Paylaşım

- Supabase: kimlik doğrulama, veritabanı, özel dosya depolama ve Edge Functions.
- Firebase Cloud Messaging: bildirim teslimi.
- Google Play: dijital paket aboneliği, sipariş ve satın alma doğrulaması.
- OpenStreetMap döşeme sağlayıcısı: harita görüntülenirken standart ağ isteği ve IP bilgisi sağlayıcı tarafından görülebilir.

Kişisel veriler reklam amacıyla satılmaz veya üçüncü taraf reklam ağıyla paylaşılmaz.

## Güvenlik ve kullanıcı denetimi

- Aktarım sırasında HTTPS/TLS.
- Özel görseller herkese açık URL ile sunulmaz.
- Uygulama içinden ve web yolundan hesap silme talebi.
- Yasal/güvenlik yükümlülükleri dışında ilişkili veriler silinir veya anonimleştirilir.
- Veri toplama uygulama işlevi için gereklidir; isteğe bağlı fotoğraf/telefon alanları kullanıcı kontrolündedir.
