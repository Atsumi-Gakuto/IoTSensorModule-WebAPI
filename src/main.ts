import { IoTSensorModuleConnectionConfig } from "./interfaces/iot_sensor_module_connection_config";
import { InvalidInputError } from "./errors/invalid_input_error";
import { NotSupportedError } from "./errors/not_supported_error";
import { TriggerOverflowError } from "./errors/trigger_overflow_error";

/**
 * Web Bluetoothを用いてIoTセンサモジュールを操作できるようになるWebAPI
 */
export class IoTSensorModuleAPI extends EventTarget {
	/**
	 * 接続相手のIoTセンサモジュールの接続情報
	 */
	private readonly connectionConfig: IoTSensorModuleConnectionConfig;

	/**
	 * 最後に受信したトリガーデータの値
	 */
	private lastTriggerValue: number | null = null;

	/**
	 * 最後に受信したトリガーデータのタイムスタンプ
	 */
	private lastTriggerTimestamp: number | null = null;

	/**
	 * コンストラクタ
	 * @param connectionConfig 接続相手となるIoTセンサモジュールの接続情報
	 * @throws InvalidInputError `connectionConfig`の内容に誤りがある場合に投げられる。
	 */
	constructor(connectionConfig: IoTSensorModuleConnectionConfig) {
		super();
		this.connectionConfig = connectionConfig;

		// 設定項目の整合性チェック
		if(typeof this.connectionConfig.deviceName != 'string') throw new InvalidInputError('The field "deviceName" must be provided as a string.');
		else if(typeof this.connectionConfig.companyId != 'number') throw new InvalidInputError('The field "companyId" must be provided as a number.');
		else if(this.connectionConfig.companyId < 0x0000 || this.connectionConfig.companyId > 0xFFFF) throw new InvalidInputError('The field "companyId" is out of valid range (0x0000-0xFFFF).');
		else if(typeof this.connectionConfig.numberOfTriggerData != 'number') throw new InvalidInputError('The field "numberOfTriggerData" must be provided as a number.');
		else if(this.connectionConfig.numberOfTriggerData < 1 || this.connectionConfig.numberOfTriggerData > 53) throw new InvalidInputError('The field "numberOfTriggerData" is out of valid range (1-53).');
		else if(typeof this.connectionConfig.services != 'object') throw new InvalidInputError('The field "services" must be provided as a dictionary object.');

		//TODO: サービス内のデータ整合性チェック & キャラクタリスティック内のデータ整合性チェック
	}

	/**
	 * クライアントがWeb Bluetoothに対応しているかどうかを取得し返す。
	 * @returns 対応しているなら`true`、そうでないのなら`false`を返す。localhostからのアクセスやhttpsでのアクセスではない場合でも非対応扱いになるため接続は確認すること。
	 */
	public async getIsSupportedWebBluetooth(): Promise<boolean> {
		if(navigator.bluetooth != undefined) return await navigator.bluetooth.getAvailability();
		return false;
	}

	/**
	 * IoTセンサモジュールが持つトリガーデータの数を返す。
	 * @returns トリガーデータの数
	 */
	public getNumberOfTriggerData(): number {
		return this.connectionConfig.numberOfTriggerData;
	}

	/**
	 * 最後に取得したトリガーデータを返す。
	 * @returns 最後に取得したトリガーデータの値。まだデータを受信していない場合は`null`を返す。
	 */
	public getLastTriggerData(): number | null {
		return this.lastTriggerValue;
	}

	/**
	 * 最後にトリガーデータを取得した時間を返す。
	 * @returns 最後にトリガーデータを取得した時間のタイムスタンプ。まだデータを受信していない場合は`null`を返す。
	 */
	public getLastTriggerTimestamp(): number | null {
		return this.lastTriggerTimestamp;
	}

	/**
	 * トリガーデータの指定したインデックスが立っているかどうかを返す。
	 * @param index 確認したトリガーデータのインデックス（0〜52）
	 * @throws InvalidInputError 指定したインデックスが0〜52の範囲外である場合に投げられる。
	 * @returns 指定したインデックスが立っているかどうか。
	 */
	public isTriggered(index: number): boolean {
		if(index < 0 || index >= this.connectionConfig.numberOfTriggerData) throw new InvalidInputError(`The specified index is out of valid range (0-${this.connectionConfig.numberOfTriggerData - 1}).`);
		if(this.lastTriggerValue != null) {
			return ((this.lastTriggerValue >> index) & 0b1) == 1;
		}
		else {
			return false;
		}
	}

	/**
	 * ブラウザにBluetoothデバイス選択のダイアログを表示させ、ユーザーが選択したBluetoothデバイス（IoTセンサモジュール）のオブジェクトを返す。
	 * @throws NotSupportedError Web Bluetoothが対応していない場合に投げられる。
	 * @throws SecurityError セキュリティ上の懸念点によりWeb Bluetoothの利用が許可されていない場合に投げられる。localhostやhttps以外でのアクセス時などで発生する。
	 * @returns ユーザーが選択したBluetoothデバイス（IoTセンサモジュール）のオブジェクト。キャンセルボタンを押すなどして選択されずに終わった場合は`null`を返す。
	 */
	private async getDevice(): Promise<BluetoothDevice|null> {
		if(!(await this.getIsSupportedWebBluetooth())) throw new NotSupportedError('Web Bluetooth is not supported or not available in this browser.');
		let device: BluetoothDevice | null = null;
		try {
			device = await navigator.bluetooth.requestDevice({
			filters: [
					{ name: this.connectionConfig.deviceName },
					{ manufacturerData: [{ companyIdentifier: this.connectionConfig.companyId }] }
			],
				optionalManufacturerData: [ this.connectionConfig.companyId ]
		});
		}
		catch(error: any) {
			if(error.name == 'NotFoundError') console.warn('No device selected. It may be caused by user cancelling the device selection.');
			else throw error;
		}
		return device;
	}

	/**
	 * アドバタイズデータを購読し、IoTセンサモジュールからのトリガーデータを受信できるようにする。
	 * @throws InvalidInputError 適切なBluetoothデバイス（IoTセンサモジュール）が選択されていない場合に投げられる。
	 * @throws NotSupportedError Web Bluetoothが対応していない場合に投げられる。
	 * @throws SecurityError セキュリティ上の懸念点によりWeb Bluetoothの利用が許可されていない場合に投げられる。localhostやhttps以外でのアクセス時などで発生する。
	 */
	public async observeTrigger(): Promise<void> {
		const device: BluetoothDevice | null = await this.getDevice();
		if(device == null) throw new InvalidInputError('No Bluetooth device selected.');
		if(device.watchAdvertisements != undefined) {
			device.addEventListener('advertisementreceived', (event: BluetoothAdvertisingEvent) => {
				const triggerArray: Uint8Array = new Uint8Array(event.manufacturerData.get(this.connectionConfig.companyId)!.buffer);
				if(triggerArray.length >= 8 || (triggerArray.length == 7 && triggerArray[6] > 0b00011111)) throw new TriggerOverflowError('Too big trigger data received.');
				let triggerValue: number = 0;
				triggerArray.forEach((value: number, index: number) => triggerValue += value << ((triggerArray.length - index - 1) * 8));
				const customEvent: CustomEvent = new CustomEvent('trigger-data-received', { detail: {triggerValue: triggerValue} });
				this.lastTriggerValue = triggerValue;
				this.lastTriggerTimestamp = Date.now();
				this.dispatchEvent(customEvent);
			});
			await device.watchAdvertisements();
		}
		else {
			throw new NotSupportedError('Watching advertisements is not supported in this browser.');
		}
	}
}

// グローバル宣言用
declare global {
	const IoTSensorModuleAPI: IoTSensorModuleAPI;
}
