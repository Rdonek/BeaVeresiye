const fs = require('fs');
let content = fs.readFileSync('c:/Users/rdone/projects/BeaVeresiye/src/pages/Contacts.tsx', 'utf8');

// 1. Fix colors for balances
content = content.replace(/\(customer\.balance \?\? 0\) > 0 \? 'text-danger' : 'text-text-primary'/g, "(customer.balance ?? 0) > 0 ? 'text-success' : (customer.balance ?? 0) < 0 ? 'text-danger' : 'text-text-primary'");

// 2. Fix specific occurrences for "Borçlandır" and "Alacaklandır"
content = content.replace(/Borçlandır \(\+\)/g, 'VERDİM (+)');
content = content.replace(/Alacaklandır \(\-\)/g, 'ALDIM (-)');

// 3. Fix transaction display colors (Verdim = Positive = Green, Aldım = Negative = Red)
content = content.replace(/isIncrease \? 'text-danger' : 'text-success'/g, "isIncrease ? 'text-success' : 'text-danger'");
content = content.replace(/isIncrease \? 'bg-danger\/10 text-danger' : 'bg-success\/10 text-success'/g, "isIncrease ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'");

// Fix text description of history transactions
content = content.replace(/Borçlandırıldı \/ Alındı/g, 'VERİLDİ (+)');
content = content.replace(/Alacaklandırıldı \/ Ödendi/g, 'ALINDI (-)');

// 4. Also fix the modal selects if possible. We can replace entire chunks using a regex.
content = content.replace(/<option value="veresiye">Veresiye<\/option>\s*<option value="cash">Nakit<\/option>\s*<option value="transfer">Havale\/EFT<\/option>\s*<option value="credit_card">Kredi Kartı<\/option>/g, 
"{txActionType === 'add_debt' ? (\n" +
"  <>\n" +
"    <option value=\"veresiye\">Mal/Hizmet Verdim (Veresiye Satış)</option>\n" +
"    <option value=\"cash\">Nakit Para Verdim (Ödeme Yaptım)</option>\n" +
"    <option value=\"transfer\">Havale/EFT Yaptım (Ödeme Yaptım)</option>\n" +
"    <option value=\"credit_card\">Kredi Kartıyla Ödedim</option>\n" +
"  </>\n" +
") : (\n" +
"  <>\n" +
"    <option value=\"veresiye\">Mal/Hizmet Aldım (Veresiye Alım)</option>\n" +
"    <option value=\"cash\">Nakit Para Aldım (Tahsilat)</option>\n" +
"    <option value=\"transfer\">Havale/EFT Aldım (Tahsilat)</option>\n" +
"    <option value=\"credit_card\">Kredi Kartından Çektim (Tahsilat)</option>\n" +
"  </>\n" +
")}");

fs.writeFileSync('c:/Users/rdone/projects/BeaVeresiye/src/pages/Contacts.tsx', content, 'utf8');
