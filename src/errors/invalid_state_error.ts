/**
 * IoTセンサモジュールやWeb APIの状態が不正である場合に投げられるエラー
 */
export class InvalidStateError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'InvalidStateError';
	}
}
