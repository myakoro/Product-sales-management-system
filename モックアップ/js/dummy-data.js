// ダミーデータ定義
const DUMMY_DATA = {
  products: [
    { code: 'RINO-FR010', name: 'フレアスカート', price: 9900, cost: 4000, category: '自社', status: '管理中' },
    { code: 'RINO-DO002', name: 'ワンピース', price: 12000, cost: 6000, category: '自社', status: '管理中' },
    { code: 'RINO-TO005', name: 'シフォンブラウス', price: 8500, cost: 3500, category: '仕入', status: '管理中' }
  ],
  sales: {
    '2025-01': { amount: 1200000, profit: 720000 },
    '2025-02': { amount: 1100000, profit: 650000 }
  },
  adExpenses: [
    { date: '2025-01-15', amount: 50000, category: 'Google広告', memo: 'リスティング' },
    { date: '2025-01-20', amount: 30000, category: 'SNS広告', memo: 'Instagram' }
  ]
};

// グローバルに公開
window.DUMMY_DATA = DUMMY_DATA;
