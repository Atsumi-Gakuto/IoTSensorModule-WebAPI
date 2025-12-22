/**
 * 条件式の解釈に失敗した場合に投げられるエラー
 */
export class ExpressionParseError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ExpressionParseError';
	}
}
