-- Bu script, Toptancı (supplier) bakiyelerini "Bizim Borcumuz" mantığıyla eksi (-) bakiyeye dönüştürür.
-- Böylece sistemdeki tüm bakiyeler tek bir Ortak Defter (Cari Hesap) mantığında birleşir.
-- Artı (+) Bakiye = Kişinin Bize Borcu Var (Alacağımız)
-- Eksi (-) Bakiye = Bizim Kişiye Borcumuz Var (Vereceğimiz)

-- 1. Tüm mevcut Toptancıların (supplier) bakiyelerini eksiye çevir
UPDATE customers 
SET balance = -balance 
WHERE type = 'supplier' AND balance > 0;

-- 2. (İsteğe Bağlı) Type kolonunu tamamen devreden çıkarmak için herkesi tek tipe çekebiliriz. 
-- Ancak frontend kodunu filtreleri kaldırarak güncellediğimiz için bunu çalıştırmanıza gerek yoktur.
-- UPDATE customers SET type = 'contact' WHERE type IN ('customer', 'supplier');
