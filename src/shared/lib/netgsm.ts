import { toast } from 'react-hot-toast';
// NetGSM SMS Entegrasyonu (Gerçek API)
// DİKKAT: Güvenlik gereği bu işlemin normalde Backend üzerinden (örn: Supabase Edge Functions) yapılması önerilir.
// İstemci tarafında (Tarayıcıda) çalıştırıldığında API şifreleri ağ isteklerinde görünebilir ve CORS hatası alınabilir.
// Uygulama gereksinimleri doğrultusunda frontend üzerinden doğrudan istek atacak şekilde kodlanmıştır.

interface NetGsmPayload {
  usercode: string;
  password: string;
  msgheader: string;
  messages: Array<{
    msg: string;
    dest: string;
  }>;
}

export const sendSMS = async (phone: string, message: string) => {
  console.log('Sending SMS via NetGSM to:', phone);
  
  // Clean phone number (keep only digits, remove leading 0 if 11 digits)
  let cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.length === 11 && cleanPhone.startsWith('0')) {
    cleanPhone = cleanPhone.substring(1);
  }
  
  // Format should be 5XXXXXXXXX (10 digits)
  if (cleanPhone.length !== 10) {
    console.error('NetGSM: Geçersiz telefon numarası formatı. Sadece 5 ile başlayan 10 haneli numara giriniz.');
    return { success: false, error: 'Geçersiz Numara' };
  }

  const url = 'https://api.netgsm.com.tr/sms/rest/v2/send';

  const payload: NetGsmPayload = {
    usercode: import.meta.env.VITE_NETGSM_USERCODE || '',
    password: import.meta.env.VITE_NETGSM_PASSWORD || '',
    msgheader: import.meta.env.VITE_NETGSM_HEADER || '',
    messages: [
      {
        msg: message,
        dest: cleanPhone,
      },
    ],
  };

  if (!payload.usercode || !payload.password || !payload.msgheader) {
    console.warn('NetGSM: .env dosyasında VITE_NETGSM_USERCODE, VITE_NETGSM_PASSWORD veya VITE_NETGSM_HEADER bulunamadı!');
    toast.error('SMS gönderilemedi. NetGSM bilgileri eksik (.env kontrol edin).');
    return { success: false, error: 'Missing Credentials' };
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    console.log('NetGSM Response:', result);
    return { success: true, result };
  } catch (error) {
    console.error('NetGSM API Hatası:', error);
    // Note: Due to CORS, direct browser fetch might fail.
    return { success: false, error };
  }
};
