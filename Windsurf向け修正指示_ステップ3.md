# Windsurf向け修正指示プロンプト - HTMLモックアップ作成（ステップ3）

## 指示内容

現在作成されているテキストベースのモックアップを、**HTMLで実装したビジュアルなモックアップ**に変更してください。

**重要**: 画像ファイルではなく、HTMLで直接モックアップを作成してください。

---

## 作成・修正の方針

**重要**: 既に `G:/マイドライブ/社内開発/売上管理システム/モックアップ/` に存在するHTMLファイルを確認し、**V1.3仕様との差分を適用**してください。

### 1. 既存ファイルの修正
以下のファイルは既存の内容をベースに、V1.3の変更点（画面統合、機能追加）を反映してください。
- **SC-03_商品一覧CSV取込.html**: 一括選択ボタンを追加
- **SC-09_予算設定.html**: 旧SC-09をベースに、SC-10の機能（Excel UI、期間設定）を統合
- **SC-14_広告費管理.html**: 旧SC-14をベースに、SC-15の機能（一覧表示、削除）を統合
- **index.html**: リンク集を最新化

### 2. ファイルの削除（統合による廃止）
以下のファイルは不要になるため、**`_archive` フォルダを作成して移動**してください（完全削除はしない）。
- **SC-10_期間予算編集.html**（SC-09に統合）
- **SC-15_広告費一覧.html**（SC-14に統合）

**手順**:
```
G:/マイドライブ/社内開発/売上管理システム/モックアップ/_archive/ フォルダを作成
SC-10_期間予算編集.html と SC-15_広告費一覧.html を _archive/ に移動
```

### 3. リンクの更新
全HTMLファイルのヘッダーナビゲーションおよびショートカットリンクから、削除された画面（SC-10, SC-15）へのリンクを削除・修正してください。

**具体的な修正内容**:
- `SC-10_期間予算編集.html` へのリンク → `SC-09_予算設定.html` に変更
- リンク文言: 「期間予算編集」→「予算設定」
- `SC-15_広告費一覧.html` へのリンク → `SC-14_広告費管理.html` に変更
- リンク文言: 「広告費一覧」→「広告費管理」

**修正対象ファイル**:
- `index.html` のリンク集
- 各画面のヘッダーナビゲーション
- SC-01のショートカットリンク

---

## ファイル構成（V1.3 最終形）

```
G:/マイドライブ/社内開発/売上管理システム/モックアップ/
├── index.html (全画面へのリンク集)
├── css/
│   └── style.css (共通スタイル)
├── SC-01_トップページ.html
├── SC-02_売上CSV取込.html
├── SC-03_商品一覧CSV取込.html
├── SC-04_CSV取込履歴.html
├── SC-05_商品マスタ一覧.html
├── SC-06_商品マスタ編集.html
├── SC-07_新商品候補一覧.html
├── SC-09_予算設定.html
├── SC-11_予算vs実績一覧.html
├── SC-12_PL画面.html
├── SC-13_商品別PL.html
├── SC-14_広告費管理.html
└── SC-18_税率設定.html
```

---

## デザイン要件

### 必ず適用すること

以下のデザインシステムを必ず適用してください（`UI設計/デザインシステム.md` 参照）：

#### カラーパレット

```css
:root {
  /* ベースカラー */
  --primary-color: #2563EB;
  --secondary-color: #4B5563;
  --accent-color: #E11D48;
  --bg-page: #F9FAFB;
  --bg-card: #FFFFFF;
  --border-color: #E5E7EB;
  
  /* 状態カラー */
  --success-color: #16A34A;
  --warning-color: #F97316;
  --error-color: #DC2626;
  --info-color: #0EA5E9;
  
  /* テキストカラー */
  --text-main: #111827;
  --text-sub: #4B5563;
  --text-disabled: #9CA3AF;
}
```

#### タイポグラフィ

```css
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-main);
}

h1 { font-size: 24px; font-weight: 600; }
h2 { font-size: 18px; font-weight: 600; }
h3 { font-size: 16px; font-weight: 500; }
```

#### スペーシング

```css
.page-container {
  padding: 24px;
}

.section {
  margin-bottom: 24px;
}

.card {
  padding: 16px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 4px;
}
```

---

## 共通レイアウト

全画面で共通のヘッダー・フッターを使用してください。

### ヘッダー

```html
<header class="header">
  <div class="header-left">
    <h1 class="system-name">Rinori 販売管理システム</h1>
  </div>
  <nav class="header-nav">
    <div class="nav-item">売上管理 ▼</div>
    <div class="nav-item">商品管理 ▼</div>
    <div class="nav-item">予算管理 ▼</div>
    <div class="nav-item">PL・分析 ▼</div>
    <div class="nav-item">広告費管理 ▼</div>
    <div class="nav-item">設定 ▼</div>
  </nav>
  <div class="header-right">
    <span class="user-info">admin (マスター)</span>
    <button class="btn-logout">ログアウト</button>
  </div>
</header>
```

### フッター

```html
<footer class="footer">
  <div class="footer-left">© 2025 Rinori</div>
  <div class="footer-right">Version 1.3</div>
</footer>
```

---

## 優先順位

以下の順番で作成してください（重要度順）：

### 優先度: 高（最初に作成）

1. **共通CSS** (`css/style.css`) - 全画面で使用
2. **index.html** - 全画面へのリンク集
3. **SC-01: トップページ** - 最重要画面
4. **SC-09: 予算設定画面** - Excel型UIの実装が複雑（SC-10統合）
5. **SC-12: PL画面** - 権限による表示制御
6. **SC-02: 売上CSV取込画面** - 主要機能

### 優先度: 中（次に作成）

7. SC-05: 商品マスタ一覧
8. SC-14: 広告費管理（SC-15統合）
9. SC-11: 予算vs実績一覧
10. SC-13: 商品別PL

### 優先度: 低（最後に作成）

11. SC-03: 商品一覧CSV取込（一括選択追加）
12. SC-04: CSV取込履歴
13. SC-06: 商品マスタ編集
14. SC-07: 新商品候補一覧
15. SC-18: 税率設定

---

## HTML実装例

### SC-01: トップページ

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>トップページ - Rinori 販売管理システム</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <!-- ヘッダー -->
  <header class="header">
    <!-- 共通ヘッダー -->
  </header>

  <!-- メインコンテンツ -->
  <main class="page-container">
    <h1 class="page-title">トップページ / ダッシュボード</h1>

    <!-- 今月のサマリ（マスター権限のみ） -->
    <section class="section">
      <h2 class="section-title">今月のサマリ（2025-12）</h2>
      <div class="summary-cards">
        <div class="card summary-card">
          <div class="card-label">売上（税別）</div>
          <div class="card-value">1,000,000円</div>
        </div>
        <div class="card summary-card">
          <div class="card-label">粗利</div>
          <div class="card-value">600,000円</div>
          <div class="card-rate">60.0%</div>
        </div>
        <div class="card summary-card">
          <div class="card-label">営業利益</div>
          <div class="card-value">400,000円</div>
          <div class="card-rate">40.0%</div>
        </div>
        <div class="card summary-card">
          <div class="card-label">原価率・粗利率</div>
          <div class="card-rate">40.0% / 60.0%</div>
        </div>
        <div class="card summary-card">
          <div class="card-label">広告率・利益率</div>
          <div class="card-rate">20.0% / 40.0%</div>
        </div>
      </div>
    </section>

    <!-- 今月の主要商品 予算 vs 実績 -->
    <section class="section">
      <h2 class="section-title">今月の主要商品 予算 vs 実績</h2>
      <table class="data-table">
        <thead>
          <tr>
            <th>商品コード</th>
            <th>商品名</th>
            <th>予算数量</th>
            <th>実績数量</th>
            <th>達成率</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>RINO-FR010</td>
            <td>フレアスカート</td>
            <td>100</td>
            <td>120</td>
            <td class="achievement-high">120%</td>
          </tr>
          <tr>
            <td>RINO-DO002</td>
            <td>ワンピース</td>
            <td>80</td>
            <td>75</td>
            <td class="achievement-mid">94%</td>
          </tr>
          <tr>
            <td>RINO-PA005</td>
            <td>パンツ</td>
            <td>60</td>
            <td>40</td>
            <td class="achievement-low">67%</td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- 警告・通知エリア -->
    <section class="section">
      <div class="alert alert-warning">
        ⚠ 不完全マスタ: 3件 <a href="SC-05_商品マスタ一覧.html">詳細を見る</a>
      </div>
      <div class="alert alert-info">
        📦 新商品候補: 2件 <a href="SC-07_新商品候補一覧.html">一覧を見る</a>
      </div>
    </section>

    <!-- ショートカットリンク -->
    <section class="section">
      <h2 class="section-title">ショートカット</h2>
      <div class="shortcut-grid">
        <a href="SC-02_売上CSV取込.html" class="btn btn-secondary">売上CSV取込</a>
        <a href="SC-05_商品マスタ一覧.html" class="btn btn-secondary">商品マスタ一覧</a>
        <a href="SC-09_予算設定.html" class="btn btn-secondary">予算設定</a>
        <a href="SC-11_予算vs実績一覧.html" class="btn btn-secondary">予算 vs 実績</a>
        <a href="SC-12_PL画面.html" class="btn btn-secondary">PL画面</a>
        <a href="SC-13_商品別PL.html" class="btn btn-secondary">商品別PL</a>
        <a href="SC-14_広告費管理.html" class="btn btn-secondary">広告費管理</a>
        <a href="SC-18_税率設定.html" class="btn btn-secondary">税率設定</a>
      </div>
    </section>
  </main>

  <!-- フッター -->
  <footer class="footer">
    <!-- 共通フッター -->
  </footer>
</body>
</html>
```

### SC-09: 予算設定画面（統合・Excel型UI）

```html
<!-- 予算設定画面の重要部分 -->
<section class="section">
  <h2 class="section-title">予算設定（2025-01 〜 2025-06）</h2>
  
  <!-- 検索・フィルタエリア -->
  <div class="filter-area" style="margin-bottom: 16px; display: flex; gap: 12px; align-items: center;">
    <input type="text" placeholder="商品コード・商品名で検索" class="form-input" style="width: 300px;">
    <button class="btn btn-secondary">検索</button>
  </div>

  <!-- 期間合計サマリ -->
  <div class="budget-summary">
    <div>期間売上: <strong>6,000,000円</strong></div>
    <div>期間粗利: <strong>3,600,000円</strong></div>
    <div>粗利率: <strong>60.0%</strong></div>
  </div>

  <!-- Excel型テーブル -->
  <div class="excel-table-container">
    <table class="excel-table">
      <thead>
        <tr>
          <th class="fixed-col sortable">商品コード ▼</th> <!-- ソート可能 -->
          <th class="fixed-col">商品名</th>
          <th class="fixed-col">期間合計数量</th>
          <th class="fixed-col">期間売上</th>
          <th class="fixed-col">期間粗利</th>
          <th>01月</th>
          <th>02月</th>
          <th>03月</th>
          <th>04月</th>
          <th>05月</th>
          <th>06月</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="fixed-col">RINO-001</td>
          <td class="fixed-col">Tシャツ</td>
          <td class="fixed-col"><input type="number" value="600" class="editable-cell period-total"></td>
          <td class="fixed-col calculated-cell">600,000</td>
          <td class="fixed-col calculated-cell">360,000</td>
          <td><input type="number" value="100" class="editable-cell month-qty"></td>
          <td><input type="number" value="100" class="editable-cell month-qty"></td>
          <td><input type="number" value="100" class="editable-cell month-qty"></td>
          <td><input type="number" value="100" class="editable-cell month-qty"></td>
          <td><input type="number" value="100" class="editable-cell month-qty"></td>
          <td><input type="number" value="100" class="editable-cell month-qty"></td>
        </tr>
      </tbody>
    </table>
  </div>
  
  <!-- 操作ボタン -->
  <div class="button-group">
    <button class="btn btn-secondary">履歴を見る</button>
    <button class="btn btn-primary">保存</button>
  </div>
</section>
```

**CSS追加**:
```css
.sortable {
  cursor: pointer;
}
.sortable:hover {
  background-color: #f3f4f6;
}
```

### SC-14: 広告費管理画面（統合）

```html
<section class="section">
  <h2 class="section-title">広告費管理</h2>
  <table class="data-table">
    <thead>
      <tr>
        <th>日付</th>
        <th>金額</th>
        <th>カテゴリ</th>
        <th>メモ</th>
        <th>操作</th>
      </tr>
    </thead>
    <tbody>
      <!-- 既存行（インライン編集） -->
      <tr>
        <td><input type="date" value="2025-01-15" class="inline-input"></td>
        <td><input type="number" value="50000" class="inline-input"></td>
        <td>
          <select class="inline-input">
            <option selected>Google広告</option>
            <option>SNS広告</option>
          </select>
        </td>
        <td><input type="text" value="リスティング" class="inline-input"></td>
        <td><button class="btn-delete">削除</button></td>
      </tr>
      <!-- 新規追加行 -->
      <tr class="new-row">
        <td><input type="date" class="inline-input"></td>
        <td><input type="number" placeholder="金額" class="inline-input"></td>
        <td>
          <select class="inline-input">
            <option value="">カテゴリ選択</option>
            <option>Google広告</option>
          </select>
        </td>
        <td><input type="text" placeholder="メモ" class="inline-input"></td>
        <td><button class="btn btn-primary">保存</button></td>
      </tr>
    </tbody>
  </table>
</section>
```

### SC-03: 商品一覧CSV取込画面（一括選択）

```html
<section class="section">
  <h2 class="section-title">差分確認</h2>
  <div class="bulk-actions" style="margin-bottom: 12px;">
    <button class="btn btn-secondary">全て選択</button>
    <button class="btn btn-secondary">全て解除</button>
  </div>

  <table class="data-table">
    <thead>
      <tr>
        <th><input type="checkbox" id="select-all"></th>
        <th>商品コード</th>
        <th>商品名</th>
        <th>変更内容</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><input type="checkbox" class="row-checkbox"></td>
        <td>RINO-001</td>
        <td>Tシャツ</td>
        <td><span class="badge-new">新規</span></td>
      </tr>
    </tbody>
  </table>
</section>
```

### SC-12: PL画面（期間選択UI改善）

```html
<section class="section">
  <h2 class="section-title">期間選択</h2>
  
  <!-- ラジオボタン方式 -->
  <div class="period-selection">
    <div class="radio-group">
      <input type="radio" id="preset" name="period-mode" value="preset" checked>
      <label for="preset">プリセット期間</label>
      
      <div class="preset-options" id="preset-section">
        <select class="period-type">
          <option value="single">単月</option>
          <option value="3months">3ヶ月</option>
          <option value="6months">6ヶ月</option>
          <option value="ytd">期首〜現在</option>
        </select>
      </div>
    </div>
    
    <div class="radio-group">
      <input type="radio" id="custom" name="period-mode" value="custom">
      <label for="custom">任意の期間</label>
      
      <div class="custom-options" id="custom-section" disabled>
        <label>開始年月: <input type="month" value="2025-01" disabled></label>
        <label>終了年月: <input type="month" value="2025-03" disabled></label>
      </div>
    </div>
    
  <!-- タブナビゲーション -->
  <div class="tabs">
    <button class="tab-btn active" data-tab="expenses">広告費一覧</button>
    <button class="tab-btn" data-tab="categories">カテゴリ管理</button>
  </div>
  
  <!-- タブ1: 広告費一覧 -->
  <div class="tab-content active" id="expenses-tab">
    <table class="data-table">
      <thead>
        <tr>
          <th>日付</th>
          <th>金額</th>
          <th>カテゴリ</th>
          <th>メモ</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <!-- 既存行（インライン編集） -->
        <tr>
          <td><input type="date" value="2025-01-15" class="inline-input"></td>
          <td><input type="number" value="50000" class="inline-input"></td>
          <td>
            <select class="inline-input">
              <option selected>Google広告</option>
              <option>SNS広告</option>
            </select>
          </td>
          <td><input type="text" value="リスティング" class="inline-input"></td>
          <td><button class="btn-delete">削除</button></td>
        </tr>
        <!-- 新規追加行 -->
        <tr class="new-row">
          <td><input type="date" class="inline-input"></td>
          <td><input type="number" placeholder="金額" class="inline-input"></td>
          <td>
            <select class="inline-input">
              <option value="">カテゴリ選択</option>
              <option>Google広告</option>
            </select>
          </td>
          <td><input type="text" placeholder="メモ" class="inline-input"></td>
          <td><button class="btn btn-primary">保存</button></td>
        </tr>
      </tbody>
    </table>
  </div>
  
  <!-- タブ2: カテゴリ管理 -->
  <div class="tab-content" id="categories-tab" style="display:none;">
    <table class="data-table">
      <thead>
        <tr>
          <th>カテゴリ名</th>
          <th>作成日</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><input type="text" value="Google広告" class="inline-input"></td>
          <td>2025-01-01</td>
          <td><button class="btn-delete">削除</button></td>
:root {
  --primary-color: #2563EB;
  --secondary-color: #4B5563;
  --bg-page: #F9FAFB;
  --bg-card: #FFFFFF;
  --border-color: #E5E7EB;
  --success-color: #16A34A;
  --warning-color: #F97316;
  --error-color: #DC2626;
  --text-main: #111827;
  --text-sub: #4B5563;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-main);
  background: var(--bg-page);
}

/* ヘッダー */
.header {
  background: var(--bg-card);
  border-bottom: 1px solid var(--border-color);
  padding: 12px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.system-name {
  font-size: 18px;
  font-weight: 600;
}

.header-nav {
  display: flex;
  gap: 16px;
}

.nav-item {
  cursor: pointer;
  padding: 8px 12px;
}

.nav-item:hover {
  background: var(--bg-page);
  border-radius: 4px;
}

/* ページコンテナ */
.page-container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 24px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 24px;
}

.section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 12px;
}

/* カード */
.card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 16px;
}

/* サマリカード */
.summary-cards {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
}

.summary-card {
  text-align: center;
}

.card-label {
  font-size: 12px;
  color: var(--text-sub);
  margin-bottom: 8px;
}

.card-value {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 4px;
}

.card-rate {
  font-size: 14px;
  color: var(--text-sub);
}

/* テーブル */
.data-table {
  width: 100%;
  border-collapse: collapse;
  background: var(--bg-card);
}

.data-table th,
.data-table td {
  padding: 12px;
  text-align: left;
  border: 1px solid var(--border-color);
}

.data-table th {
  background: #F3F4F6;
  font-weight: 600;
}

.data-table tr:hover {
  background: var(--bg-page);
}

/* 達成率の色分け */
.achievement-high {
  color: var(--success-color);
  font-weight: 600;
}

.achievement-mid {
  color: var(--warning-color);
  font-weight: 600;
}

.achievement-low {
  color: var(--error-color);
  font-weight: 600;
}

/* ボタン */
.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  text-decoration: none;
  display: inline-block;
}

.btn-primary {
  background: var(--primary-color);
  color: white;
}

.btn-secondary {
  background: white;
  color: var(--primary-color);
  border: 1px solid var(--primary-color);
}

.btn:hover {
  opacity: 0.9;
}

/* アラート */
.alert {
  padding: 12px 16px;
  border-radius: 4px;
  margin-bottom: 12px;
}

.alert-warning {
  background: #FEF3C7;
  border-left: 4px solid var(--warning-color);
}

.alert-info {
  background: #DBEAFE;
  border-left: 4px solid var(--info-color);
}

/* Excel型テーブル */
.excel-table-container {
  overflow-x: auto;
}

.excel-table {
  width: 100%;
  border-collapse: collapse;
}

.excel-table th,
.excel-table td {
  border: 1px solid var(--border-color);
  padding: 8px;
  text-align: center;
}

.row-header {
  background: #F3F4F6;
  font-weight: 600;
  text-align: left !important;
}

.editable-cell {
  width: 100%;
  border: none;
  text-align: center;
  padding: 4px;
}

.calculated-cell {
  background: #F9FAFB;
  color: var(--text-sub);
}

/* フッター */
.footer {
  background: var(--bg-card);
  border-top: 1px solid var(--border-color);
  padding: 16px 24px;
  display: flex;
  justify-content: space-between;
  margin-top: 48px;
}
```

---

## 実装上の注意点

1. **ダミーデータを使用**
   - 実際のデータベース接続は不要
   - HTMLに直接ダミーデータを記載

2. **インタラクションは最小限**
   - ボタンのホバー効果のみ
   - JavaScriptは使用しない（または最小限）

3. **レスポンシブ対応は不要**
   - PC版Chrome専用（1280px以上）
   - モバイル対応は不要

4. **既存のテキストファイルは残す**
   - `SC-XX_XXX_モックアップ.md` は削除しない
   - HTMLファイルを追加する形で作成

---

## 作成完了後の確認事項

- [ ] 全15画面のHTMLファイルが作成された
- [ ] 共通CSS (`css/style.css`) が作成された
- [ ] index.html（全画面へのリンク集）が作成された
- [ ] デザインシステムの色・フォント・スペーシングが適用されている
- [ ] 各画面のレイアウトが設計書通りである
- [ ] ブラウザで表示して見た目を確認した

---

## 作成完了後の報告

全15画面のHTMLモックアップの作成が完了したら、以下のメッセージを送信してください：

「HTMLモックアップ（全15画面）の作成が完了しました。再度確認をお願いします。」

---

それでは、HTMLモックアップの作成を開始してください！
