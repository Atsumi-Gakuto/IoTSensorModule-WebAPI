/**
 * 無効な入力があった場合のエラー
 */
export class InvalidInputError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'InvalidInputError';
	}
}
