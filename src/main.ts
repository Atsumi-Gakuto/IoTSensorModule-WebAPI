import { InvalidInputError } from "./errors/invalid_input_error";
import { NotSupportedError } from "./errors/not_supported_error";
import { TriggerOverflowError } from "./errors/trigger_overflow_error";

/**
 * Web Bluetoothを用いてIoTセンサモジュールを操作できるようになるWebAPI
 */
export class IoTSensorModuleAPI extends EventTarget {
	/**
	 * IoTセンサモジュールデバイスのBLE上の表示名
	 */
	private readonly DEVICE_NAME: string = 'IoTSM';

	/**
	 * IoTセンサモジュールデバイスのManufacturer Specific DataのCompany ID
	 */
	private readonly COMPANY_ID: number = 0xFFFF;

	/**
	 * トリガーデータの数
	 */
	private readonly NUMBER_OF_TRIGGER_DATA: number = 16;

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
	 */
	constructor() {
		super();

		if(this.COMPANY_ID < 0x0000 || this.COMPANY_ID > 0xFFFF) throw new InvalidInputError('The Company ID is out of valid range (0x0000-0xFFFF).');
		else if(this.NUMBER_OF_TRIGGER_DATA > 53) throw new InvalidInputError('The number of trigger data exceeds the allowable limit of 53.');
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
		return this.NUMBER_OF_TRIGGER_DATA;
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
		if(index < 0 || index >= this.NUMBER_OF_TRIGGER_DATA) throw new InvalidInputError(`The specified index is out of valid range (0-${this.NUMBER_OF_TRIGGER_DATA - 1}).`);
		if(this.lastTriggerValue != null) {
			return ((this.lastTriggerValue >> index) & 0b1) == 1;
		}
		else {
			return false;
		}
	}

	/**
	 * アドバタイズデータを購読し、IoTセンサモジュールからのトリガーデータを受信できるようにする。
	 * @throws NotSupportedError Web Bluetoothが対応していない、またはアドバタイズの購読がサポートされていない場合に投げられる。
	 */
	public async observeTrigger(): Promise<void> {
		if(!(await this.getIsSupportedWebBluetooth())) throw new NotSupportedError('Web Bluetooth is not supported or not available in this browser.');

		const device: BluetoothDevice = await navigator.bluetooth.requestDevice({
			filters: [
				{ name: this.DEVICE_NAME },
				{ manufacturerData: [{ companyIdentifier: this.COMPANY_ID }] }
			],
			optionalManufacturerData: [ this.COMPANY_ID ]
		});

		if(device.watchAdvertisements != undefined) {
			device.addEventListener('advertisementreceived', (event: BluetoothAdvertisingEvent) => {
				const triggerArray: Uint8Array = new Uint8Array(event.manufacturerData.get(this.COMPANY_ID)!.buffer);
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
