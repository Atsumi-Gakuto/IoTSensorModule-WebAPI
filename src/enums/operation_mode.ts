/**
 * IoTセンサモジュールの動作モード
 */
export const OPERATION_MODE = {
	/** ユーザーモード */
	USER_MODE: 0,
	/** コンフィグレーションモード */
	CONFIGURATION_MODE: 1
} as const;
export type OperationMode = typeof OPERATION_MODE[keyof typeof OPERATION_MODE];
