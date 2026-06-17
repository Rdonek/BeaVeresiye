CREATE OR REPLACE FUNCTION sync_network_transaction(p_transaction_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tx record;
  v_link record;
  v_target_tenant_id UUID;
  v_target_customer_id UUID;
  v_source_tenant_id UUID;
  v_is_debt boolean;
  v_source_impact numeric;
  v_balance_change numeric;
  v_target_type text;
BEGIN
  -- 1. Orijinal işlemi bul
  SELECT * INTO v_tx FROM transactions WHERE id = p_transaction_id;
  IF v_tx IS NULL OR v_tx.network_link_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Transaction not found or not linked');
  END IF;

  -- Sonsuz döngüyü engelle (zaten senkronize edilmiş bir işlemse tekrar senkronize etme)
  IF v_tx.network_source_tenant_id IS NOT NULL THEN
    RETURN json_build_object('success', false, 'message', 'Already synced');
  END IF;

  -- 2. Aktif ağ bağlantısını bul
  SELECT * INTO v_link FROM network_links WHERE id = v_tx.network_link_id AND status = 'active';
  IF v_link IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'No active network link');
  END IF;

  -- 3. Hedef defteri (tenant) ve o defterdeki müşteri karşılığını belirle
  IF v_tx.tenant_id = v_link.sender_tenant_id THEN
    v_target_tenant_id := v_link.receiver_tenant_id;
    v_target_customer_id := v_link.receiver_entity_id;
    v_source_tenant_id := v_link.sender_tenant_id;
  ELSE
    v_target_tenant_id := v_link.sender_tenant_id;
    v_target_customer_id := v_link.sender_entity_id;
    v_source_tenant_id := v_link.receiver_tenant_id;
  END IF;

  -- Hedef sistemde eşleşen bir cari yoksa çık
  IF v_target_tenant_id IS NULL OR v_target_customer_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Target entity missing');
  END IF;

  -- 4. Orijinal işlemin kaynağındaki bakiye etkisini hesapla
  v_is_debt := (v_tx.payment_method = 'veresiye' OR COALESCE(v_tx.description, '') ILIKE '%Borç%' OR COALESCE(v_tx.description, '') ILIKE '%Açılış%');
  
  IF v_tx.type = 'income' THEN
    IF v_is_debt THEN v_source_impact := v_tx.amount; ELSE v_source_impact := -v_tx.amount; END IF;
  ELSE
    IF v_is_debt THEN v_source_impact := -v_tx.amount; ELSE v_source_impact := v_tx.amount; END IF;
  END IF;

  -- Hedef taraftaki bakiye etkisi, kaynak taraftakinin tam tersi olmalıdır! (Biri alacaklanıyorsa diğeri borçlanır)
  v_balance_change := -v_source_impact;

  -- Ayrıca hedef işlemde "type" değerini tam tersine çevirmeliyiz ki arayüzde doğru (Alındı/Verildi) gözüksün.
  IF v_tx.type = 'income' THEN v_target_type := 'expense'; ELSE v_target_type := 'income'; END IF;

  -- 5. İşlemi karşı tarafın defterine kopyala
  INSERT INTO transactions (
    tenant_id,
    customer_id,
    user_id,
    cashier_name,
    type,
    amount,
    description,
    payment_method,
    status,
    due_date,
    network_link_id,
    network_source_tenant_id,
    network_linked_transaction_id,
    network_read_status
  ) VALUES (
    v_target_tenant_id,
    v_target_customer_id,
    v_tx.user_id,
    COALESCE(v_tx.cashier_name, 'Sistem') || ' (Ağ Senkronizasyonu)',
    v_target_type,
    v_tx.amount,
    v_tx.description,
    v_tx.payment_method,
    v_tx.status,
    v_tx.due_date,
    v_tx.network_link_id,
    v_source_tenant_id,
    v_tx.id,
    'unread'
  );

  -- 6. Karşı tarafın müşteri (cari) bakiyesini otomatik güncelle
  UPDATE customers 
  SET balance = COALESCE(balance, 0) + v_balance_change
  WHERE id = v_target_customer_id AND tenant_id = v_target_tenant_id;

  RETURN json_build_object('success', true, 'message', 'Sync completed');
END;
$$;
