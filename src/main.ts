/**
 * Web Bluetoothを用いてIoTセンサモジュールを操作できるようになるWebAPI
 */
export class IoTSensorModuleAPI {
	/**
	 * クライアントがWeb Bluetoothに対応しているかどうかを取得し返す。
	 * @returns 対応しているなら`true`、そうでないのなら`false`を返す。localhostからのアクセスやhttpsでのアクセスではない場合でも非対応扱いになるため接続は確認すること。
	 */
	public async getIsSupportedWebBluetooth(): Promise<boolean> {
		if(navigator.bluetooth != undefined) {
			if(await navigator.bluetooth.getAvailability()) {
				console.info(`Web Bluetooth is supported and available in this browser.`);
				return true;
			}
			else {
				console.warn('Web Bluetooth is supported but not available in this browser.');
				return false;
			}
		}
		else {
			console.warn('Web Bluetooth is not supported in this browser.');
			return false;
		}
	}
}

// グローバル宣言用
declare global {
	const IoTSensorModuleAPI: IoTSensorModuleAPI;
}
