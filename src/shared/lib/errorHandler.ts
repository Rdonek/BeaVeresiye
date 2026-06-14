export const getFriendlyErrorMessage = (error: any): string => {
  if (!error) return "Bilinmeyen bir hata oluştu.";

  const message = error.message || error.details || error.hint || String(error);
  const code = error.code || "";

  // Supabase & PostgreSQL Error Codes
  if (code === 'PGRST116') {
    return "Erişim reddedildi veya kayıt bulunamadı.";
  }
  if (code === '23505') {
    return "Bu kayıt zaten sistemde mevcut.";
  }
  if (code === '23503') {
    return "Bu kayıt başka bir işlemde kullanıldığı için silinemez.";
  }
  if (code === '42501') {
    return "Bu işlemi yapmak için yetkiniz bulunmuyor.";
  }
  if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
    return "İnternet bağlantınız koptu. Lütfen bağlantınızı kontrol edin.";
  }
  
  // Return generic translated error if unmapped
  if (message.includes('JWT')) return "Oturum süreniz doldu, lütfen tekrar giriş yapın.";
  
  return "Sistemde bir hata oluştu. Lütfen tekrar deneyin.";
};
