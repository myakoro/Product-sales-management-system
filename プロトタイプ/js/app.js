document.addEventListener('DOMContentLoaded', function () {
  // ==========================================
  // 共通: ナビゲーションのアクティブ化
  // ==========================================
  const pageTitleElement = document.querySelector('.page-title');
  const pageTitle = pageTitleElement ? pageTitleElement.textContent.trim() : '';
  const navItems = document.querySelectorAll('.nav-item');
  
  let activeKeyword = '';
  
  if (pageTitle.includes('売上') || pageTitle.includes('CSV取込履歴')) {
    activeKeyword = '売上管理';
  } else if (pageTitle.includes('商品') || pageTitle.includes('新商品')) {
    if (pageTitle.includes('商品別PL')) {
        activeKeyword = 'PL・分析'; // 商品別PLはPL・分析メニュー
    } else {
        activeKeyword = '商品管理';
    }
  } else if (pageTitle.includes('予算')) {
    if (pageTitle.includes('実績')) {
        activeKeyword = '予算管理'; // 予算vs実績
    } else {
        activeKeyword = '予算管理';
    }
  } else if (pageTitle.includes('PL') || pageTitle.includes('分析')) {
    activeKeyword = 'PL・分析';
  } else if (pageTitle.includes('広告')) {
    activeKeyword = '広告費管理';
  } else if (pageTitle.includes('税率') || pageTitle.includes('設定')) {
    activeKeyword = '設定';
  } else if (document.title.includes('トップ') || document.querySelector('.section-title')?.textContent.includes('サマリ')) {
    // トップページなど
    // トップページはナビゲーションにないが、ロゴクリックで遷移想定
  }

  if (activeKeyword) {
    navItems.forEach(item => {
      if (item.textContent.includes(activeKeyword)) {
        item.classList.add('active');
      }
    });
  }

  // ==========================================
  // SC-14: 広告費管理 - タブ切り替え
  // ==========================================
  const tabButtons = document.querySelectorAll('.tab-btn');
  if (tabButtons.length > 0) {
    tabButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        const target = btn.getAttribute('data-tab');
        const container = btn.closest('.section'); // タブが含まれるセクション内のみで完結させる
        
        if (container) {
          container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
          container.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
          
          btn.classList.add('active');
          const content = container.querySelector(`#${target}-tab`);
          if (content) {
            content.classList.add('active');
          }
        }
      });
    });
  }

  // ==========================================
  // SC-12: PL画面 - 期間選択制御
  // ==========================================
  const presetRadio = document.getElementById('preset');
  const customRadio = document.getElementById('custom');
  const customInputs = document.querySelectorAll('#custom-section input[type="month"]');
  
  if (presetRadio && customRadio) {
    function updatePeriodInputs() {
      const useCustom = customRadio.checked;
      customInputs.forEach(function (el) {
        el.disabled = !useCustom;
      });
    }
    presetRadio.addEventListener('change', updatePeriodInputs);
    customRadio.addEventListener('change', updatePeriodInputs);
    updatePeriodInputs(); // 初期実行
  }

  // ==========================================
  // SC-09: 予算設定 - 計算・検索・ソート
  // ==========================================
  const budgetTable = document.querySelector('.excel-table');
  if (budgetTable) {
    // 1. 双方向計算
    budgetTable.addEventListener('input', function (e) {
      const target = e.target;
      const row = target.closest('tr');
      if (!row) return;

      const price = parseFloat(row.dataset.price) || 0;
      const cost = parseFloat(row.dataset.cost) || 0;
      const profitUnit = price - cost;

      if (target.classList.contains('total-qty')) {
        // 合計が変更された -> 月別等分（簡易ロジック: 単純割り算、端数は最初の月に）
        const totalVal = parseInt(target.value) || 0;
        const monthInputs = row.querySelectorAll('.month-qty');
        const count = monthInputs.length;
        if (count > 0) {
          const base = Math.floor(totalVal / count);
          const remainder = totalVal % count;
          monthInputs.forEach((input, index) => {
            input.value = base + (index < remainder ? 1 : 0);
          });
        }
      } else if (target.classList.contains('month-qty')) {
        // 月別が変更された -> 合計を再計算
        const monthInputs = row.querySelectorAll('.month-qty');
        let sum = 0;
        monthInputs.forEach(input => sum += (parseInt(input.value) || 0));
        const totalInput = row.querySelector('.total-qty');
        if (totalInput) totalInput.value = sum;
      }

      // 売上・粗利の再計算
      const totalQtyInput = row.querySelector('.total-qty');
      const currentTotal = parseInt(totalQtyInput.value) || 0;
      
      const salesCell = row.querySelector('.total-sales');
      const profitCell = row.querySelector('.total-profit');
      
      if (salesCell) salesCell.textContent = (currentTotal * price).toLocaleString() + '円';
      if (profitCell) profitCell.textContent = (currentTotal * profitUnit).toLocaleString() + '円';
    });

    // 2. 商品検索（部分一致）
    const searchInput = document.querySelector('input[placeholder*="商品検索"]');
    if (searchInput) {
      searchInput.addEventListener('input', function (e) {
        const term = e.target.value.toLowerCase();
        const rows = budgetTable.querySelectorAll('tbody tr');
        rows.forEach(row => {
          const code = row.cells[0].textContent.toLowerCase();
          const name = row.cells[1].textContent.toLowerCase();
          if (code.includes(term) || name.includes(term)) {
            row.style.display = '';
          } else {
            row.style.display = 'none';
          }
        });
      });
    }

    // 3. ソート機能（商品コード）
    const sortHeader = budgetTable.querySelector('th:first-child');
    if (sortHeader && sortHeader.textContent.includes('▲▼')) {
      sortHeader.style.cursor = 'pointer';
      let isAsc = true;
      sortHeader.addEventListener('click', function () {
        const tbody = budgetTable.querySelector('tbody');
        const rows = Array.from(tbody.querySelectorAll('tr'));
        
        rows.sort((a, b) => {
          const codeA = a.cells[0].textContent.trim();
          const codeB = b.cells[0].textContent.trim();
          return isAsc ? codeA.localeCompare(codeB) : codeB.localeCompare(codeA);
        });
        
        rows.forEach(row => tbody.appendChild(row));
        isAsc = !isAsc;
      });
    }
  }
  
  // ==========================================
  // SC-13: 商品別PL - 検索・ソート
  // ==========================================
  const plTable = document.getElementById('pl-table');
  // ページタイトル判定も一応残すが、IDがあれば確実
  if (plTable) {
     // 検索
     const searchInput = document.querySelector('input[placeholder*="商品検索"]') || document.getElementById('pl-search');
     if (searchInput) {
       searchInput.addEventListener('input', function (e) {
         const term = e.target.value.toLowerCase();
         const rows = plTable.querySelectorAll('tbody tr');
         rows.forEach(row => {
           const code = row.cells[0].textContent.toLowerCase();
           const name = row.cells[1].textContent.toLowerCase();
           if (code.includes(term) || name.includes(term)) {
             row.style.display = '';
           } else {
             row.style.display = 'none';
           }
         });
       });
     }
     // ソート
     const sortHeader = plTable.querySelector('th:first-child');
     if (sortHeader && sortHeader.textContent.includes('▲▼')) {
        sortHeader.style.cursor = 'pointer';
        let isAsc = true;
        sortHeader.addEventListener('click', function () {
        const tbody = plTable.querySelector('tbody');
        const rows = Array.from(tbody.querySelectorAll('tr'));
        
        rows.sort((a, b) => {
            const codeA = a.cells[0].textContent.trim();
            const codeB = b.cells[0].textContent.trim();
            return isAsc ? codeA.localeCompare(codeB) : codeB.localeCompare(codeA);
        });
        
        rows.forEach(row => tbody.appendChild(row));
        isAsc = !isAsc;
        });
     }
  }

  // ==========================================
  // SC-02: 売上CSV取込 - 上書き確認
  // ==========================================
  // HTML側で name="import-mode" value="overwrite" を探す
  const overwriteRadio = document.querySelector('input[name="import-mode"][value="overwrite"]');
  if (overwriteRadio) {
    overwriteRadio.addEventListener('change', function() {
      // ラジオボタンが選択された瞬間
      if (this.checked) {
        // ユーザーに確認（簡易実装）
        // 実際は「上書き」を選ぼうとした瞬間に警告を出すか、実行時に出すかだが、
        // 要件は「上書きモード選択時の確認ダイアログ」なのでchangeイベントでOK
        const result = confirm('注意: 「上書きモード」が選択されました。\n\nこのモードで取り込むと、対象年月の既存データが全て消去され、新しいデータで上書きされます。\n\nよろしいですか？');
        if (!result) {
           // キャンセルの場合、追加モードに戻す
           const addRadio = document.querySelector('input[name="' + this.name + '"][value="add"], input[name="' + this.name + '"][value="insert"]'); // insertは念のため
           if (addRadio) addRadio.checked = true;
           // 追加モードのラジオボタンが "checked" 属性を持っている場合のフォールバック（DOM上のcheckedプロパティ変更で十分だが）
           const otherRadios = document.querySelectorAll('input[name="' + this.name + '"]:not([value="overwrite"])');
           if(otherRadios.length > 0) otherRadios[0].checked = true;
        }
      }
    });
  }

  // ==========================================
  // SC-03: 商品一覧CSV取込 - 一括選択
  // ==========================================
  // HTML側のボタンIDを想定（もしくはテキスト内容で取得）
  const selectAllBtn = document.getElementById('btn-select-all') || 
                       Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('全て選択'));
  const deselectAllBtn = document.getElementById('btn-deselect-all') || 
                         Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('全て解除'));
  
  if (selectAllBtn && deselectAllBtn) {
    selectAllBtn.addEventListener('click', function() {
        // tbody内のチェックボックスを対象にする
        const inputs = document.querySelectorAll('tbody input[type="checkbox"]');
        inputs.forEach(cb => cb.checked = true);
    });
    
    deselectAllBtn.addEventListener('click', function() {
        const inputs = document.querySelectorAll('tbody input[type="checkbox"]');
        inputs.forEach(cb => cb.checked = false);
    });
  }
});
