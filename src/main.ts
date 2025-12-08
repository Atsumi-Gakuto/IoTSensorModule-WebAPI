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
	 * コンストラクタ
	 */
	constructor() {
		super();
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
