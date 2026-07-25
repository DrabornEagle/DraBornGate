# DraBornGate v0.3.7 — Google Play Yayın Hazırlık Kontrolü

## Uygulama kimliği

- Paket: `com.draborneagle.draborngate`
- Uygulama sürümü: `0.3.7`
- Android versionCode: `1`
- Expo SDK: `57`
- Hedef Android API: Expo SDK 57 varsayılanı olan API 36

## Kod tarafında tamamlananlar

- Hesap silme talebi uygulama içindeki Gizlilik ve Veri Merkezi’nde bulunur.
- Harici hesap silme, gizlilik, kullanım koşulları, veri güvenliği ve destek URL’leri yapılandırılmıştır.
- Dijital site/kurye paketleri yalnızca Google Play Billing üzerinden sunulur.
- Uygulama içinde banka transferi veya dış ödeme bağlantısı bulunmaz.
- Kart bilgileri uygulama veya Supabase tarafından saklanmaz.
- Tek seferlik profil/teslimat görseli seçimi için sistem medya seçicisi kullanılır; geniş fotoğraf/video ve tüm dosya izinleri engellenmiştir.
- Konum yalnızca uygulama açıkken site pini ve Akıllı Geçiş mesafe kontrolü için kullanılır; arka plan konumu istenmez.
- Bildirim, kamera ve konum izinleri işlev anında ve açıklamalı şekilde istenir.
- Bildirim zil sesleri cihazda seçilebilir; sessiz seçenek vardır.
- Site haritası OpenStreetMap üzerinde çalışır ve atıf gösterir.
- Kullanıcı verileri aktarım sırasında HTTPS/TLS üzerinden taşınır.

## Play Console’da yayın öncesi zorunlu kontroller

1. Aşağıdaki URL’lerin telefondan ve gizli sekmeden hatasız açıldığını doğrula:
   - Gizlilik: `https://www.draborneagle.com/DraBornGate/privacy/`
   - Hesap silme: `https://www.draborneagle.com/DraBornGate/account-deletion/`
   - Kullanım koşulları: `https://www.draborneagle.com/DraBornGate/terms/`
   - Veri güvenliği: `https://www.draborneagle.com/DraBornGate/data-safety/`
   - Destek: `https://www.draborneagle.com/DraBornGate/support/`
2. Data Safety formunu `DATA_SAFETY_DECLARATION_TR.md` ile eşleştir.
3. App Access bölümüne inceleme hesabı ve rol değiştirme adımlarını gir.
4. Abonelik ürünlerini ve temel plan kimliklerini Admin panelindeki değerlerle birebir eşleştir.
5. Store listing ekran görüntülerinin gerçek uygulama arayüzünü göstermesini sağla.
6. İçerik derecelendirme, hedef kitle, reklam beyanı ve finansal özellik beyanlarını Play Console’da doldur.
7. Kapalı test cihazında hesap açma, hesap silme, satın alma, abonelik iptali, bildirim, fotoğraf seçici ve konum akışlarını test et.

## Yayın engelleyiciler

Kod tarafı büyük ölçüde hazırdır; ancak dış politika URL’lerinin gerçekten yayınlanmış ve erişilebilir olması ile Play Console beyanlarının doldurulması koddan doğrulanamaz. Bu iki adım tamamlanmadan “tamamen yayın hazır” kabul edilmemelidir.
