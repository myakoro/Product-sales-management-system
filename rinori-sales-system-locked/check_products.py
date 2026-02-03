# -*- coding: utf-8 -*-
"""
商品マスタの全データを確認するスクリプト
"""

import sqlite3
import os
import sys

# Windows環境での文字コード問題を回避
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

def check_products():
    db_path = r'C:\Users\takuy\Desktop\Rinori売上管理システム\rinori-sales-system\prisma\dev.db'
    
    if not os.path.exists(db_path):
        backup_path = r'C:\Users\takuy\Desktop\Rinori売上管理システム\rinori-sales-system\prisma\dev.db.bak'
        if os.path.exists(backup_path):
            print(f"バックアップファイルを使用します: {backup_path}")
            db_path = backup_path
        else:
            print("[ERROR] データベースファイルが見つかりません")
            return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # 商品コードに "KKK" を含む商品を検索
        print('=' * 60)
        print('商品コードに "KKK" を含む商品の検索')
        print('=' * 60)
        print()
        
        cursor.execute("""
            SELECT product_code, product_name, sales_price_excl_tax, cost_excl_tax,
                   product_type, management_status, updated_at
            FROM products
            WHERE product_code LIKE '%KKK%'
            ORDER BY product_code
        """)
        
        products = cursor.fetchall()
        
        if not products:
            print("[INFO] 'KKK' を含む商品が見つかりませんでした")
            print()
            print("全商品コードを表示します:")
            print()
            
            cursor.execute("""
                SELECT product_code, product_name, cost_excl_tax
                FROM products
                ORDER BY product_code
                LIMIT 50
            """)
            
            all_products = cursor.fetchall()
            for prod in all_products:
                print(f"  {prod[0]} - {prod[1]} (原価: {prod[2]})")
        else:
            print(f"見つかった商品数: {len(products)}件\n")
            for prod in products:
                print(f"商品コード: {prod[0]}")
                print(f"  商品名: {prod[1]}")
                print(f"  販売価格（税別）: {prod[2]}")
                print(f"  原価（税別）: {prod[3]}")
                print(f"  商品タイプ: {prod[4]}")
                print(f"  管理ステータス: {prod[5]}")
                print(f"  最終更新日時: {prod[6]}")
                print()
        
        # 2026年1月の売上レコードを確認
        print('=' * 60)
        print('2026年1月の売上レコード（商品コード別）')
        print('=' * 60)
        print()
        
        cursor.execute("""
            SELECT sr.product_code, p.product_name, 
                   SUM(sr.quantity) as total_qty,
                   SUM(sr.sales_amount_excl_tax) as total_sales,
                   SUM(sr.cost_amount_excl_tax) as total_cost,
                   COUNT(*) as record_count
            FROM sales_records sr
            LEFT JOIN products p ON sr.product_code = p.product_code
            WHERE sr.period_ym = '2026-01'
            GROUP BY sr.product_code
            ORDER BY sr.product_code
        """)
        
        sales_summary = cursor.fetchall()
        
        if sales_summary:
            print(f"商品数: {len(sales_summary)}件\n")
            for row in sales_summary:
                prod_code, prod_name, qty, sales, cost, count = row
                print(f"{prod_code} - {prod_name or '(商品マスタなし)'}")
                print(f"  レコード数: {count}, 数量: {qty}, 売上: {sales}, 原価: {cost}")
                if qty > 0:
                    unit_cost = cost / qty
                    print(f"  平均単価原価: {unit_cost:.2f}")
                print()
        else:
            print("[INFO] 2026年1月の売上レコードが見つかりませんでした")
        
    except Exception as e:
        print(f"エラーが発生しました: {e}")
        import traceback
        traceback.print_exc()
    finally:
        conn.close()

if __name__ == '__main__':
    check_products()
