# Sürüm yükseltme prosedürü

1. Mevcut `main` commitinden `backup/draborngate-vX-before-vY` dalı oluşturulur.
2. Termux kaynak klasörü Download içine ZIP yedeklenir.
3. `package.json`, `app.json` ve `src/config/version.ts` birlikte artırılır.
4. Android `versionCode` her Google Play sürümünde artırılır; DraBornGate v0.3.8 için değer `2`dir.
5. Demo RPC ve `DEMO_DATA_VERSION` yeni sürüm içeriğine göre güncellenir.
6. Supabase migration otomatik uygulanır ve advisor kontrolleri yapılır.
7. Yerel kaynak ağacı doğrulanır, GitHub `main` aynı commit ağacına taşınır.
8. GitHub Actions TypeScript, Android export ve debug APK kontrolünü çalıştırır.
