
import { prisma } from './prisma';

/**
 * ネクストエンジン API クライアント
 * 
 * V1.54: 認証トークンの管理とAPIリクエストの基盤を提供
 */
export class NextEngineClient {
    private clientId: string;
    private clientSecret: string;
    private redirectUri: string;

    constructor() {
        this.clientId = process.env.NEXTENGINE_CLIENT_ID || '';
        this.clientSecret = process.env.NEXTENGINE_CLIENT_SECRET || '';
        this.redirectUri = process.env.NEXTENGINE_REDIRECT_URI || '';
    }

    /**
     * ログインページURLの生成
     * OAuth 2.0 Authorization Code Grant フロー
     */
    getAuthUrl(state: string): string {
        const params = new URLSearchParams({
            response_type: 'code',
            client_id: this.clientId,
            redirect_uri: this.redirectUri,
            state: state
        });
        return `https://base.next-engine.org/users/sign_in?${params.toString()}`;
    }

    /**
     * アクセストークンの取得
     */
    async fetchTokens(uid: string, state: string) {
        const params = new URLSearchParams({
            client_id: this.clientId,
            client_secret: this.clientSecret,
            uid,
            state,
        });

        const response = await fetch('https://api.next-engine.org/api_neauth/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString(),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to fetch tokens: ${error}`);
        }

        const data = await response.json();
        console.log('[NE OAuth] Token response:', JSON.stringify(data, null, 2));

        // Next Engineのトークン有効期限:
        // - access_token: 1日
        // - refresh_token: 3日
        const now = new Date();
        const accessTokenExpiry = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 1日後
        const refreshTokenExpiry = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3日後

        // DBに保存 (ID=1に固定)
        return await prisma.nEAuth.upsert({
            where: { id: 1 },
            update: {
                accessToken: data.access_token,
                refreshToken: data.refresh_token,
                expiresAt: accessTokenExpiry,
                refreshesAt: refreshTokenExpiry,
            },
            create: {
                id: 1,
                accessToken: data.access_token,
                refreshToken: data.refresh_token,
                expiresAt: accessTokenExpiry,
                refreshesAt: refreshTokenExpiry,
            },
        });
    }

    /**
     * トークンのリフレッシュ
     */
    async refreshAccessToken() {
        const auth = await prisma.nEAuth.findFirst();
        if (!auth) throw new Error('Authentication data not found');

        const params = new URLSearchParams({
            client_id: this.clientId,
            client_secret: this.clientSecret,
            refresh_token: auth.refreshToken,
        });

        const response = await fetch('https://api.next-engine.org/main/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString(),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to refresh token: ${error}`);
        }

        const data = await response.json();

        return await prisma.nEAuth.update({
            where: { id: 1 },
            data: {
                accessToken: data.access_token,
                refreshToken: data.refresh_token,
                expiresAt: new Date(data.access_token_end_date),
                refreshesAt: new Date(data.refresh_token_end_date),
            },
        });
    }

    /**
     * 店舗情報の取得 (shop/search)
     */
    async getShops() {
        return await this.apiPost('/api_v1_master_shop/search', {
            fields: 'shop_id,shop_name',
            wait_flag: '1'
        });
    }

    /**
     * 受注明細の検索 (receiveorder_row/search)
     * @param targetYm 対象月 (YYYY-MM)
     * @param shopIds 店舗IDの配列
     */
    async searchOrderRows(targetYm: string, shopIds: number[]) {
        // 月初と月末を計算
        const [year, month] = targetYm.split('-').map(Number);
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0); // 月末日

        const formatDate = (date: Date) => {
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        };

        return await this.apiPost('/api_v1_receiveorder_row/search', {
            fields: 'receive_order_row_no,receive_order_row_goods_id,receive_order_row_quantity,receive_order_row_unit_price,receive_order_row_sub_total_price',
            'receive_order_send_date-gte': formatDate(startDate),
            'receive_order_send_date-lte': formatDate(endDate),
            'receive_order_order_status_id-eq': '50', // 出荷確定済（完了）
            'receive_order_shop_id-in': shopIds.join(','),
            wait_flag: '1'
        });
    }

    /**
     * 共通APIリクエストメソッド
     */
    private async apiPost(endpoint: string, data: any) {
        const auth = await prisma.nEAuth.findFirst();
        if (!auth) throw new Error('Authentication data not found. Please login.');

        // トークン期限切れチェック (5分前を閾値にする)
        const now = new Date();
        const threshold = new Date(now.getTime() + 5 * 60 * 1000);
        if (auth.expiresAt < threshold) {
            console.log('[NE API] Token expired or expiring soon, refreshing...');
            await this.refreshAccessToken();
        }

        // リフレッシュ後の最新情報を取得
        const currentAuth = await prisma.nEAuth.findFirst();
        if (!currentAuth) throw new Error('Auth data lost during refresh');

        const params = new URLSearchParams({
            access_token: currentAuth.accessToken,
            refresh_token: currentAuth.refreshToken,
            ...data
        });

        const response = await fetch(`https://api.next-engine.org${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString(),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`NE API error (${endpoint}): ${error}`);
        }

        const result = await response.json();

        // NE特有のエラーレスポンスチェック
        if (result.result === 'error') {
            throw new Error(`NE API error (${endpoint}): ${result.message} (code: ${result.code})`);
        }

        return result;
    }
}

export const nextEngineClient = new NextEngineClient();
