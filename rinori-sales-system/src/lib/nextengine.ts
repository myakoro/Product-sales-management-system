
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

        const response = await fetch('https://api.next-engine.org/main/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString(),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to fetch tokens: ${error}`);
        }

        const data = await response.json();
        // data: { access_token, refresh_token, access_token_end_date, refresh_token_end_date, ... }

        // DBに保存 (ID=1に固定)
        return await prisma.nEAuth.upsert({
            where: { id: 1 },
            update: {
                accessToken: data.access_token,
                refreshToken: data.refresh_token,
                expiresAt: new Date(data.access_token_end_date),
                refreshesAt: new Date(data.refresh_token_end_date),
            },
            create: {
                id: 1,
                accessToken: data.access_token,
                refreshToken: data.refresh_token,
                expiresAt: new Date(data.access_token_end_date),
                refreshesAt: new Date(data.refresh_token_end_date),
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
            wait_flag: '1'
        });
    }

    /**
     * 受注明細情報の検索 (receiveorder_row/search)
     */
    async searchOrderRows(params: {
        receive_order_date_from: string;
        receive_order_date_to: string;
        shop_ids?: number[];
    }) {
        const body: any = {
            wait_flag: '1',
            receive_order_date_from: params.receive_order_date_from,
            receive_order_date_to: params.receive_order_date_to,
        };

        if (params.shop_ids && params.shop_ids.length > 0) {
            body['receive_order_shop_id-in'] = params.shop_ids.join(',');
        }

        return await this.apiPost('/api_v1_receiveorder_row/search', body);
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
