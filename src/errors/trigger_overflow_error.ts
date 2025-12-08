/**
 * トリガーデータのビット数が許容値を超えてしまった場合のエラー
 */
export class TriggerOverflowError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'TriggerOverflowError';
	}
}
