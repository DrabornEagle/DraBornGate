# DraBornGate WhatsApp Yönetim Merkezi

Bu klasör, DraBornGate mobil uygulamasından bağımsız çalışan statik web sistemidir.

## Hedef adres

`https://www.draborneagle.com/DraBornGate/WhatsApp/`

## Özellikler

- Android rehberinden dışa aktarılan `.vcf` dosyasını tarayıcıda okur.
- Türkiye telefon numaralarını `+90` biçimine getirir ve yinelenen numaraları birleştirir.
- Kişileri seçerek DraBornGate tanıtım mesajını WhatsApp sohbetinde hazırlar.
- WhatsApp API kullanmaz; her sohbet kullanıcı onayıyla açılır ve gönderilir.
- Site Yönetimi ekranında ad soyad, blok, daire veya telefon numarasıyla arama yapılır.
- Site sakini kaydı eklenebilir, düzenlenebilir ve silinebilir.
- Aynı hazır mesaj veya değiştirilen tekil mesaj WhatsApp üzerinden gönderilebilir.
- Rehber, mesaj ve gönderim durumu yalnızca kullanılan tarayıcının `localStorage` alanında saklanır.
- JSON yedek alma ve geri yükleme desteği vardır.

## Yayınlama

Bu klasördeki dosyaları web sunucusunda aşağıdaki dizine yerleştir:

```text
public_html/DraBornGate/WhatsApp/
  index.html
  styles.css
  app.js
```

Sunucu tarafı uygulama, veritabanı veya npm kurulumu gerekmez.

## Kullanım

1. Güvenlik telefonundaki rehberi VCF olarak dışa aktar.
2. `Toplu Gönderim` ekranından VCF dosyasını yükle.
3. Google Play bağlantısını ve mesajı kaydet.
4. Gönderilecek kişileri seçip `Gönderime Başla` düğmesine bas.
5. WhatsApp'ta mesajı gönder, web paneline dön ve `Gönderildi, Sıradaki` düğmesine bas.
6. `Site Yönetimi` bölümünde eksik blok/daire bilgilerini düzenle ve arama yap.

## Teknik not

Tarayıcı ve WhatsApp güvenlik kuralları nedeniyle API olmadan yüzlerce mesaj arka planda tek tıkla otomatik gönderilemez. Bu sistem kişi listesini hazırlar, sırayı takip eder ve her kişi için WhatsApp sohbetini hazır mesajla açar.
