const fs = require('fs');

function modifyFile() {
    const filePath = "c:\\\\Users\\\\rdone\\\\projects\\\\BeaVeresiye\\\\src\\\\pages\\\\Contacts.tsx";
    let content = fs.readFileSync(filePath, 'utf8');

    // 1. Component name and hooks
    content = content.replace("export const Customers = () =>", "export const Contacts = () =>");
    content = content.replace("useEntities(tenantId)", "useEntities(tenantId, 'all')");

    // 2. Text replacements
    content = content.replace(/Müşteriler/g, "Cari Hesaplar");
    content = content.replace(/Müşteri Ara\.\.\./g, "Kişi/Kurum Ara...");
    content = content.replace(/Yeni Müşteri/g, "Yeni Kayıt Ekle");
    content = content.replace(/Müşteri Sil/g, "Kayıt Sil");
    content = content.replace(/Müşteri güncellendi\./g, "Kayıt güncellendi.");
    content = content.replace(/Müşteri eklendi\./g, "Kayıt eklendi.");
    content = content.replace(/Müşteri başarıyla silindi\./g, "Kayıt başarıyla silindi.");
    content = content.replace(/Müşterinin tüm bilgileri/g, "Kişi/Kurumun tüm bilgileri");
    content = content.replace(/Müşteri silinirken/g, "Kayıt silinirken");
    content = content.replace(/Müşteri Adı/g, "Kişi/Kurum Adı");
    content = content.replace(/Müşteriyi Sil/g, "Kaydı Sil");
    content = content.replace(/Müşteri silinecek/g, "Kayıt silinecek");

    // 3. Add Customer initial debt handling
    const oldInitialDebtLogic = `      if (initialDebt > 0) {
        await addTransactionMutation.mutateAsync({
          tenant_id: tenantId,
          customer_id: newCustomer.id,
          user_id: user.id,
          cashier_name: user.name || user.email?.split('@')[0] || 'Patron',
          type: 'income',
          amount: initialDebt,
          description: 'Açılış / Devir Bakiyesi',
          payment_method: 'veresiye',
          status: 'completed',
          due_date: null
        });
      }`;
    
    const newInitialDebtLogic = `      if (initialDebt !== 0) {
        await addTransactionMutation.mutateAsync({
          tenant_id: tenantId,
          customer_id: newCustomer.id,
          user_id: user.id,
          cashier_name: user.name || user.email?.split('@')[0] || 'Patron',
          type: initialDebt > 0 ? 'income' : 'expense',
          amount: Math.abs(initialDebt),
          description: 'Açılış / Devir Bakiyesi',
          payment_method: 'veresiye',
          status: 'completed',
          due_date: null
        });
      }`;
    content = content.replace(oldInitialDebtLogic, newInitialDebtLogic);

    // 4. HandleTransaction logic
    content = content.replace(
        /let dbType: 'income' \| 'expense' = 'income';\s*let balanceChange = txActionType === 'add_debt' \? amountNum : -amountNum;/g,
        `let dbType: 'income' | 'expense' = 'income';
    let balanceChange = 0;
    if (txActionType === 'add_debt') {
      balanceChange = amountNum;
      dbType = txPaymentMethod === 'veresiye' ? 'income' : 'expense';
    } else {
      balanceChange = -amountNum;
      dbType = txPaymentMethod === 'veresiye' ? 'expense' : 'income';
    }`
    );

    // 5. Ledger mapping logic
    const oldMapping = "const isDebt = tx.payment_method === 'veresiye' || tx.description?.includes('Borç') || tx.description?.includes('Açılış');";
    const newMapping = `const isCustomerTx = tx.type === 'income';
                        const isOldDebtAdded = tx.payment_method === 'veresiye' || tx.description?.includes('Borç') || tx.description?.includes('Açılış');
                        let impact = 0;
                        if (isCustomerTx) {
                          impact = isOldDebtAdded ? tx.amount : -tx.amount;
                        } else {
                          impact = isOldDebtAdded ? -tx.amount : tx.amount;
                        }
                        const isIncrease = impact > 0;`;
    content = content.replace(oldMapping, newMapping);

    // Replace usages of \`isDebt\` with \`isIncrease\` in the rendering
    content = content.replace(/isDebt \? (.*?) : (.*?)(?=[>}])/g, "isIncrease ? $1 : $2");
    content = content.replace(/\{isDebt \?/g, "{isIncrease ?");
    
    // Text changes in ledger mapping
    content = content.replace(/Borç Eklendi/g, "Borçlandırıldı / Alındı");
    content = content.replace(/Tahsilat Alındı/g, "Alacaklandırıldı / Ödendi");
    
    // Button Action Types
    content = content.replace(/openTxModal\('collect_payment'\)/g, "openTxModal('add_credit')");
    content = content.replace(/txActionType === 'collect_payment'/g, "txActionType === 'add_credit'");

    content = content.replace(/Tahsilat Al/g, "Alacaklandır (-)");
    content = content.replace(/Borç Yaz/g, "Borçlandır (+)");
    
    content = content.replace(/Manuel Borç Ekle/g, "Manuel Borçlandır");

    fs.writeFileSync(filePath, content, 'utf8');
}

modifyFile();
