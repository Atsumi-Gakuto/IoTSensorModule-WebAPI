/**
 * IoTセンサモジュール操作の応答コード
 */
export const OPERATION_RESULT = {
	/** 操作が正常完了 */
	OPERATION_SUCCEEDED: 0,
	/** 操作に失敗 */
	OPERATION_FAILED: 1,
	/** 設定値などが無効 */
	INVALID_INPUT: 2,
	/** 操作が許可されていない */
	NOT_PERMITTED: 3,
	/** メモリの確保に失敗 */
	MALLOC_FAILED: 4,
	/** 処理が未実装 */
	NOT_IMPLEMENTED: 5
} as const;
export type OperationResult = typeof OPERATION_RESULT[keyof typeof OPERATION_RESULT];
