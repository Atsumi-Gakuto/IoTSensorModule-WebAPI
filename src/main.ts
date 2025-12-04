/**
 * Web Bluetoothを用いてIoTセンサモジュールを操作できるようになるWebAPI
 */
export class IoTSensorModuleAPI {
	/**
	 * クライアントがWeb Bluetoothに対応しているかどうかを取得し返す。
	 * @returns 対応しているなら`true`、そうでないのなら`false`を返す。localhostからのアクセスやhttpsでのアクセスではない場合でも非対応扱いになるため接続は確認すること。
	 */
	public getIsSupportedWebBluetooth(): boolean {
		return navigator.bluetooth != undefined;
	}
}

// グローバル宣言用
declare global {
	const IoTSensorModuleAPI: IoTSensorModuleAPI;
}
