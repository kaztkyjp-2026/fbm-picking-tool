# fbm-picking-tool

EC出荷オペレーション基盤 — FBMピッキングリスト生成ツール

## 概要

Amazon・楽天・メルカリShopsの受注CSVを読み込み、現場向けピッキングリスト（トータル／シングル）をブラウザ上で生成するクライアントサイド静的HTMLツール。

## アーキテクチャ（3層構造）

```
[入力層]    各モール注文CSV → モール別パーサ（文字コード自動判別）
[正規化層]  商品マスタ突合 → レシピ展開 → 共通フォーマット
[出力層]    トータル／シングルピッキングリスト（印刷用HTML）
```

## 対応モール

| モール | 文字コード | 抽出条件 |
|---|---|---|
| Amazon（健プラ／萬福堂） | CP932 | fulfillment-channel=Merchant AND item-status=Unshipped AND order-status NOT IN (Pending, Cancelled) |
| 楽天 | CP932 | status=300（発送待ち）のみ |
| メルカリShops | UTF-8 | original_product_id でAmazonSKU横断照合 |

## ファイル構成

```
index.html
src/
  parsers/
    base.js       # 文字コード分岐・CSV解析・警告収集
    amazon.js     # Amazonパーサ
    rakuten.js    # 楽天パーサ（SKU大文字正規化）
    mercari.js    # メルカリパーサ（AmazonSKU横断照合）
    index.js      # モール自動判別
  normalize.js    # マスタ突合・出荷区分R列・レシピ展開
  output.js       # トータル/シングル・閾値判定・印刷HTML
```

## 運用

- Kazが仙台から各モールCSVをダウンロード → ブラウザで読込 → PDF生成 → 現場（古川）へ送付
- 現場は印刷のみ（ツール操作不要）
- GitHub Pages でホスティング推奨

## 設計詳細

[EC出荷オペレーション基盤 設計メモv6](https://drive.google.com/open?id=1fkWeZG4Kl0CLq6okndkcSvy_Ge4rpIGr) 参照
