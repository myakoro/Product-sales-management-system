# -*- coding: utf-8 -*-
"""
KKKBG002BLK の原価問題調査スクリプト

調査内容:
1. 商品マスタの原価
2. 2026年1月の売上レコードの原価
3. 原価の不一致を検出
"""

import sqlite3
import os
import sys
from datetime import datetime

# Windows環境での文字コード問題を回避
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

def investigate():
    # 本番環境のバックアップファイルを使用
    db_path = r'C:\Users\takuy\Desktop\Rinori売上管理システム\rinori-sales-backup-2026-01-27.db'
    
    if not os.path.exists(db_path):
        print(f"[ERROR] データベースファイルが見つかりません: {db_path}")
        return
    
    print('=' * 60)
    print('KKKBG002BLK 原価調査')
    print('=' * 60)
    print()
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    product_code = 'KKKBG002BLK'
    target_ym = '2026-01'
    
    try:
        # 1. 商品マスタの確認
        print('【1. 商品マスタ】')
        cursor.execute("""
            SELECT product_code, product_name, sales_price_excl_tax, cost_excl_tax,
                   product_type, management_status, updated_at
            FROM products
            WHERE product_code = ?
        """, (product_code,))
        
        product = cursor.fetchone()
        
        if not product:
            print(f"[ERROR] 商品コード {product_code} が商品マスタに存在しません")
            return
        
        print(f"商品コード: {product[0]}")
        print(f"商品名: {product[1]}")
        print(f"販売価格（税別）: {product[2]}")
        print(f"原価（税別）: {product[3]} <-- マスタの原価")
        print(f"商品タイプ: {product[4]}")
        print(f"管理ステータス: {product[5]}")
        print(f"最終更新日時: {product[6]}")
        print()
        
        master_cost = product[3]
        
        # 2. 2026年1月の売上レコード確認
        print('【2. 2026年1月の売上レコード】')
        cursor.execute("""
            SELECT sr.id, sr.product_code, sr.period_ym, sr.sales_date,
                   sr.quantity, sr.sales_amount_excl_tax, sr.cost_amount_excl_tax,
                   sr.gross_profit, sr.sales_channel_id, sr.external_order_id,
                   sr.import_history_id, sr.created_at,
                   sc.name as channel_name,
                   ih.data_source, ih.comment
            FROM sales_records sr
            LEFT JOIN sales_channels sc ON sr.sales_channel_id = sc.id
            LEFT JOIN import_histories ih ON sr.import_history_id = ih.id
            WHERE sr.product_code = ? AND sr.period_ym = ?
            ORDER BY sr.created_at DESC
        """, (product_code, target_ym))
        
        sales_records = cursor.fetchall()
        
        if not sales_records:
            print(f"[ERROR] {target_ym} の売上レコードが見つかりません")
            return
        
        print(f"売上レコード数: {len(sales_records)}件\n")
        
        for index, record in enumerate(sales_records, 1):
            (record_id, prod_code, period_ym, sales_date, quantity,
             sales_amount, cost_amount, gross_profit, channel_id,
             external_order_id, import_history_id, created_at,
             channel_name, data_source, comment) = record
            
            print(f"--- レコード {index} ---")
            print(f"ID: {record_id}")
            print(f"販路: {channel_name or 'N/A'} (ID: {channel_id})")
            print(f"売上日: {sales_date}")
            print(f"数量: {quantity}")
            print(f"売上金額（税別）: {sales_amount}")
            print(f"原価金額（税別）: {cost_amount} <-- レコードの原価")
            print(f"粗利: {gross_profit}")
            print(f"外部受注ID: {external_order_id or 'N/A'}")
            print(f"取込履歴ID: {import_history_id}")
            print(f"取込方法: {data_source or 'N/A'}")
            print(f"取込コメント: {comment or 'N/A'}")
            print(f"作成日時: {created_at}")
            print()
            
            # 原価の検証
            expected_cost_amount = master_cost * quantity
            actual_cost_amount = cost_amount
            cost_difference = actual_cost_amount - expected_cost_amount
            
            print('【原価検証】')
            print(f"マスタの単価原価: {master_cost}")
            print(f"数量: {quantity}")
            print(f"期待される原価金額: {expected_cost_amount:.2f} (= {master_cost} × {quantity})")
            print(f"実際の原価金額: {actual_cost_amount}")
            print(f"差分: {cost_difference:.2f}")
            
            if abs(cost_difference) > 0.01:
                unit_cost_at_sync = actual_cost_amount / quantity if quantity > 0 else 0
                print(f"[WARNING] 原価が一致しません！ 差分: {cost_difference:.2f}")
                print(f"推測される同期時の単価原価: {unit_cost_at_sync:.2f}")
            else:
                print(f"[OK] 原価は正しいです")
            print()
        
        # 3. 全期間の売上レコード原価サマリー
        print('【3. 全期間の売上レコード原価サマリー】')
        cursor.execute("""
            SELECT period_ym, quantity, cost_amount_excl_tax, sales_channel_id
            FROM sales_records
            WHERE product_code = ?
            ORDER BY period_ym ASC
        """, (product_code,))
        
        all_records = cursor.fetchall()
        
        if all_records:
            print('期間別の原価単価:')
            current_period = None
            record_count = 0
            
            for period_ym, quantity, cost_amount, channel_id in all_records:
                if period_ym != current_period:
                    if current_period is not None:
                        print()
                    print(f"\n{period_ym}:")
                    current_period = period_ym
                    record_count = 0
                
                record_count += 1
                unit_cost = cost_amount / quantity if quantity > 0 else 0
                print(f"  レコード{record_count}: 単価原価={unit_cost:.2f}, 数量={quantity}, 原価合計={cost_amount:.2f}, 販路ID={channel_id}")
        
        print()
        print('=' * 60)
        print('調査完了')
        print('=' * 60)
        
    except Exception as e:
        print(f"エラーが発生しました: {e}")
        import traceback
        traceback.print_exc()
    finally:
        conn.close()

if __name__ == '__main__':
    investigate()
