# ネクストエンジン API 連携 関連資料集

V1.54の実装にあたり、技術的な調査やトラブルシューティング、制限事項の確認に必要となるすべての公式リソースを網羅しています。

## 1. SDK・サンプルコード関連
- **SDK 一覧 (PHP / Java / Node / Ruby 等)**
  https://developer.next-engine.com/api/sdk
- **Node.js SDK (GitHub)**
  https://github.com/hamee-dev/sdk-node
- **PHP SDK (GitHub)**
  https://github.com/hamee-dev/sdk-php
- **Java サンプルコード (Spring Boot)**
  https://github.com/hamee-dev/java-sample-code

## 2. APIドキュメント・仕様
- **エンドポイント一覧 (APIリファレンス)**
  https://developer.next-engine.com/api
- **受注検索 API (受注データの取得 - 本機能の核)**
  https://developer.next-engine.com/api/api_v1_receiveorder_base/search
- **商品検索 API (マスタデータの照合・補完用)**
  https://developer.next-engine.com/api/api_v1_master_product/search
- **APIメッセージ（エラー）コード一覧**
  https://developer.next-engine.com/api/param/message

## 3. 認証・認可 (OAuth 2.0)
- **はじめに (開発フロー・アプリ登録の基本)**
  https://developer.next-engine.com/api/start
- **認証・認可 (OAuth 2.0) フロー解説**
  https://developer.next-engine.com/api/auth

## 4. 規約・制限事項・サポート
- **開発時の注意事項 (セキュリティ・禁止事項・スロットリング)**
  https://developer.next-engine.com/api/secure
- **APIリクエスト回数制限について (FAQ)**
  https://developer.next-engine.com/faq
- **システム稼働状況・障害・メンテナンス情報**
  https://next-engine.net/ne-news/
- **Developer Network FAQ**
  https://developer.next-engine.com/faq
- **ネクストエンジン サポートポータル**
  https://support.next-engine.com/

## 5. 補助・応用リファレンス
- **アプリ通知機能 (Webhook) 設定マニュアル**
  https://manual.next-engine.net/pf/pf033/
- **ネクストエンジンAPI解説記事 (全体像の把握用)**
  https://logikura.jp/columns/thorough-explanation-of-next-engine-api/
- **利用規約 (Developer Network / パートナー制度)**
  https://developer.next-engine.com/legal

---
※ V1.54実装担当者は、上記リソースを随時参照し、特に「受注ステータスの運用ルール」についてはユーザーのNE管理画面の設定と照らし合わせて実装すること。