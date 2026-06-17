import re

def modify_file():
    with open("c:\\Users\\rdone\\projects\\BeaVeresiye\\src\\pages\\Contacts.tsx", "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Component name and hooks
    content = content.replace("export const Customers = () =>", "export const Contacts = () =>")
    content = content.replace("useEntities(tenantId)", "useEntities(tenantId, 'all')")

    # 2. Text replacements
    content = content.replace("Müşteriler", "Cari Hesaplar")
    content = content.replace("Müşteri Ara...", "Kişi/Kurum Ara...")
    content = content.replace("Yeni Müşteri", "Yeni Kayıt Ekle")
    content = content.replace("Müşteri Sil", "Kayıt Sil")
    content = content.replace("Müşteri güncellendi.", "Kayıt güncellendi.")
    content = content.replace("Müşteri eklendi.", "Kayıt eklendi.")
    content = content.replace("Müşteri başarıyla silindi.", "Kayıt başarıyla silindi.")
    content = content.replace("Müşterinin tüm bilgileri", "Kişi/Kurumun tüm bilgileri")
    content = content.replace("Müşteri silinirken", "Kayıt silinirken")
    content = content.replace("Müşteri Adı", "Kişi/Kurum Adı")
    content = content.replace("Müşteriyi Sil", "Kaydı Sil")
    content = content.replace("Müşteri silinecek", "Kayıt silinecek")

    # 3. Add Customer initial debt handling
    old_initial_debt_logic = """      if (initialDebt > 0) {
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
      }"""
    
    new_initial_debt_logic = """      if (initialDebt !== 0) {
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
      }"""
    content = content.replace(old_initial_debt_logic, new_initial_debt_logic)

    # 4. HandleTransaction logic
    old_handle_tx_start = "const amountNum = parseFloat(txAmount);"
    
    # We need to replace the entire handleTransaction body logic up to the mutateAsync call.
    # Actually, we can just replace specific lines inside handleTransaction.
    
    content = re.sub(
        r"let dbType: 'income' \| 'expense' = 'income';\s*let balanceChange = txActionType === 'add_debt' \? amountNum : -amountNum;",
        """let dbType: 'income' | 'expense' = 'income';
    let balanceChange = 0;
    if (txActionType === 'add_debt') {
      balanceChange = amountNum;
      dbType = txPaymentMethod === 'veresiye' ? 'income' : 'expense';
    } else {
      balanceChange = -amountNum;
      dbType = txPaymentMethod === 'veresiye' ? 'expense' : 'income';
    }""",
        content
    )

    # 5. Ledger mapping logic
    old_mapping = "const isDebt = tx.payment_method === 'veresiye' || tx.description?.includes('Borç') || tx.description?.includes('Açılış');"
    new_mapping = """const isCustomerTx = tx.type === 'income';
                        const isOldDebtAdded = tx.payment_method === 'veresiye' || tx.description?.includes('Borç') || tx.description?.includes('Açılış');
                        let impact = 0;
                        if (isCustomerTx) {
                          impact = isOldDebtAdded ? tx.amount : -tx.amount;
                        } else {
                          impact = isOldDebtAdded ? -tx.amount : tx.amount;
                        }
                        const isIncrease = impact > 0;"""
    content = content.replace(old_mapping, new_mapping)

    # Replace usages of `isDebt` with `isIncrease` in the rendering
    # Example: isDebt ? 'bg-red-500' : 'bg-green-500' -> isIncrease ? ...
    content = re.sub(r"isDebt \? (.*?) : (.*?)(?=[>}])", r"isIncrease ? \1 : \2", content)
    # Also replace isDebt boolean checks
    content = content.replace("{isDebt ?", "{isIncrease ?")
    
    # Text changes in ledger mapping
    content = content.replace("Borç Eklendi", "Borçlandırıldı / Alındı")
    content = content.replace("Tahsilat Alındı", "Alacaklandırıldı / Ödendi")
    
    # Button Action Types
    content = content.replace("openTxModal('collect_payment')", "openTxModal('add_credit')")
    content = content.replace("txActionType === 'collect_payment'", "txActionType === 'add_credit'")

    content = content.replace("Tahsilat Al", "Alacaklandır (-)")
    content = content.replace("Borç Yaz", "Borçlandır (+)")
    
    content = content.replace("Manuel Borç Ekle", "Manuel Borçlandır")

    with open("c:\\Users\\rdone\\projects\\BeaVeresiye\\src\\pages\\Contacts.tsx", "w", encoding="utf-8") as f:
        f.write(content)

modify_file()
