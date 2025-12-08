/**
 * 必須の機能がブラウザが対応していない場合のエラー
 */
export class NotSupportedError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'NotSupportedError';
	}
}
