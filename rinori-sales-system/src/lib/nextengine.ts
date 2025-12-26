
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
     */
    getAuthUrl(state: string): string {
        return `https://base.next-engine.org/main/oauth/authorize?client_id=${this.clientId}&redirect_uri=${encodeURIComponent(this.redirectUri)}&state=${state}`;
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
     * 受注明細情報の検索 (receiveorder_row/search)
     */
    async searchOrderRows(params: {
        receive_order_date_from: string;
        receive_order_date_to: string;
        shop_ids: number[];
    }) {
        // TODO: APIリクエストの実装
        // ページネーション (100件ずつ) の対応
    }

    /**
     * 店舗情報の取得 (shop/search)
     */
    async getShops() {
        // TODO: APIリクエストの実装
    }
}

export const nextEngineClient = new NextEngineClient();
