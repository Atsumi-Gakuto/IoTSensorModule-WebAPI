import { IoTSensorModuleConnectionConfig } from "./interfaces/iot_sensor_module_connection_config";
import { IoTSensorModuleService } from "./interfaces/iot_sensor_module_service";
import { IoTSensorModuleCharacteristic } from "./interfaces/iot_sensor_module_characteristics";
import { IOT_SENSOR_MODULE_CHARACTERISTIC_DATA_TYPE } from "./types/iot_sensor_module_characteristic_data_type";
import { InvalidInputError } from "./errors/invalid_input_error";
import { NotSupportedError } from "./errors/not_supported_error";
import { TriggerOverflowError } from "./errors/trigger_overflow_error";
import { InvalidStateError } from "./errors/invalid_state_error";
import { Vector3 } from "./interfaces/vector3";

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
	 * 接続確立中のBLEデバイスのオブジェクト。切断時は`null`にする。
	 */
	private connectedDevice: BluetoothDevice | null = null;

	private readonly notificationEventListeners: (((event: Event) => void)|null)[] = [];

	/**
	 * コンストラクタ
	 * @param connectionConfig 接続相手となるIoTセンサモジュールの接続情報
	 * @throws InvalidInputError `connectionConfig`の内容に誤りがある場合に投げられる。
	 */
	constructor(connectionConfig: IoTSensorModuleConnectionConfig) {
		super();
		this.connectionConfig = connectionConfig;

		// 設定項目の整合性チェック
		if (typeof this.connectionConfig.deviceName != 'string') throw new InvalidInputError('The field "deviceName" must be provided as a string.');
		else if (typeof this.connectionConfig.companyId != 'number') throw new InvalidInputError('The field "companyId" must be provided as a number.');
		else if (this.connectionConfig.companyId < 0x0000 || this.connectionConfig.companyId > 0xFFFF) throw new InvalidInputError('The field "companyId" is out of valid range (0x0000-0xFFFF).');
		else if (typeof this.connectionConfig.numberOfTriggerData != 'number') throw new InvalidInputError('The field "numberOfTriggerData" must be provided as a number.');
		else if (this.connectionConfig.numberOfTriggerData < 1 || this.connectionConfig.numberOfTriggerData > 53) throw new InvalidInputError('The field "numberOfTriggerData" is out of valid range (1-53).');
		else if (typeof this.connectionConfig.services != 'object') throw new InvalidInputError('The field "services" must be provided as a dictionary object.');
		for (const serviceName in this.connectionConfig.services) {
			const service: IoTSensorModuleService = this.connectionConfig.services[serviceName];
			if (typeof service.uuid != 'string') throw new InvalidInputError(`The field "uuid" of service "${serviceName}" must be provided as a string.`);
			else if (!this.checkUUIDFormat(service.uuid)) throw new InvalidInputError(`The field "uuid" of service "${serviceName}" is not in valid UUID format.`);
			else if (typeof service.characteristics != 'object') throw new InvalidInputError(`The field "characteristics" of service "${serviceName}" must be provided as a dictionary object.`);
			switch (serviceName) {
				case 'systemService':
					if (typeof service.characteristics.mode != 'object') throw new InvalidInputError(`The characteristic "mode" in service "${serviceName}" must be provided as a dictionary object.`);
					else if (typeof service.characteristics.response != 'object') throw new InvalidInputError(`The characteristic "response" in service "${serviceName}" must be provided as a dictionary object.`);
					break;
				case 'sensorService':
					if (typeof service.characteristics.interval != 'object') throw new InvalidInputError(`The characteristic "interval" in service "${serviceName}" must be provided as a dictionary object.`);
					else if (typeof service.characteristics.response != 'object') throw new InvalidInputError(`The characteristic "response" in service "${serviceName}" must be provided as a dictionary object.`);
					break;
				case 'bleService':
					if (typeof service.characteristics.mode != 'object') throw new InvalidInputError(`The characteristic "mode" in service "${serviceName}" must be provided as a dictionary object.`);
					else if (typeof service.characteristics.advInterval != 'object') throw new InvalidInputError(`The characteristic "advInterval" in service "${serviceName}" must be provided as a dictionary object.`);
					else if (typeof service.characteristics.channel != 'object') throw new InvalidInputError(`The characteristic "channel" in service "${serviceName}" must be provided as a dictionary object.`);
					else if (typeof service.characteristics.txPower != 'object') throw new InvalidInputError(`The characteristic "txPower" in service "${serviceName}" must be provided as a dictionary object.`);
					else if (typeof service.characteristics.uuid != 'object') throw new InvalidInputError(`The characteristic "uuid" in service "${serviceName}" must be provided as a dictionary object.`);
					else if (typeof service.characteristics.major != 'object') throw new InvalidInputError(`The characteristic "major" in service "${serviceName}" must be provided as a dictionary object.`);
					else if (typeof service.characteristics.measuredPower != 'object') throw new InvalidInputError(`The characteristic "measuredPower" in service "${serviceName}" must be provided as a dictionary object.`);
					else if (typeof service.characteristics.response != 'object') throw new InvalidInputError(`The characteristic "response" in service "${serviceName}" must be provided as a dictionary object.`);
					break;
				case 'expressionService':
					if (typeof service.characteristics.targetTask != 'object') throw new InvalidInputError(`The characteristic "targetTask" in service "${serviceName}" must be provided as a dictionary object.`);
					else if (typeof service.characteristics.taskSlot != 'object') throw new InvalidInputError(`The characteristic "taskSlot" in service "${serviceName}" must be provided as a dictionary object.`);
					else if (typeof service.characteristics.expression != 'object') throw new InvalidInputError(`The characteristic "expression" in service "${serviceName}" must be provided as a dictionary object.`);
					else if (typeof service.characteristics.copy != 'object') throw new InvalidInputError(`The characteristic "copy" in service "${serviceName}" must be provided as a dictionary object.`);
					else if (typeof service.characteristics.move != 'object') throw new InvalidInputError(`The characteristic "move" in service "${serviceName}" must be provided as a dictionary object.`);
					else if (typeof service.characteristics.delete != 'object') throw new InvalidInputError(`The characteristic "delete" in service "${serviceName}" must be provided as a dictionary object.`);
					else if (typeof service.characteristics.response != 'object') throw new InvalidInputError(`The characteristic "response" in service "${serviceName}" must be provided as a dictionary object.`);
					break;
				default:
					break;
			}
			for (const characteristicName in service.characteristics) {
				const characteristic: IoTSensorModuleCharacteristic = service.characteristics[characteristicName];
				if (typeof characteristic.uuid != 'string') throw new InvalidInputError(`The field "uuid" of characteristic "${characteristicName}" in service "${serviceName}" must be provided as a string.`);
				else if (!this.checkUUIDFormat(characteristic.uuid)) throw new InvalidInputError(`The field "uuid" of characteristic "${characteristicName}" in service "${serviceName}" is not in valid UUID format.`);
				switch (serviceName) {
					case 'dataService':
						if (typeof characteristic.dataType != 'string') throw new InvalidInputError(`The field "dataType" of characteristic "${characteristicName}" in service "${serviceName}" must be provided as a IoTSensorModuleCharacteristicDataType.`);
						else if (!IOT_SENSOR_MODULE_CHARACTERISTIC_DATA_TYPE.includes(characteristic.dataType)) throw new InvalidInputError(`The field "dataType" of characteristic "${characteristicName}" in service "${serviceName}" is not a valid IoTSensorModuleCharacteristicDataType.`);
						break;
					case 'logService':
						if (typeof characteristic.dataType != 'string') throw new InvalidInputError(`The field "dataType" of characteristic "${characteristicName}" in service "${serviceName}" must be provided as a IoTSensorModuleCharacteristicDataType.`);
						else if (!IOT_SENSOR_MODULE_CHARACTERISTIC_DATA_TYPE.includes(characteristic.dataType)) throw new InvalidInputError(`The field "dataType" of characteristic "${characteristicName}" in service "${serviceName}" is not a valid IoTSensorModuleCharacteristicDataType.`);
						else if (typeof characteristic.logCount != 'number') throw new InvalidInputError(`The field "logCount" of characteristic "${characteristicName}" in service "${serviceName}" must be provided as a number.`);
						else if (characteristic.logCount < 1) throw new InvalidInputError(`The field "logCount" of characteristic "${characteristicName}" in service "${serviceName}" must be greater than or equal to 1.`);
						break;
					default:
						break;
				}
			}
		}
	}

	/**
	 * UUIDのフォーマットが正しいかどうかを確認する。
	 * @param stringToCheck 確認したい文字列
	 * @returns フォーマットが正しいなら`true`、そうでないのなら`false`を返す。
	 */
	private checkUUIDFormat(stringToCheck: string): boolean {
		return stringToCheck.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/) != null;
	}

	/**
	 * クライアントがWeb Bluetoothに対応しているかどうかを取得し返す。
	 * @returns 対応しているなら`true`、そうでないのなら`false`を返す。localhostからのアクセスやhttpsでのアクセスではない場合でも非対応扱いになるため接続は確認すること。
	 */
	public async getIsSupportedWebBluetooth(): Promise<boolean> {
		if (navigator.bluetooth != undefined) return await navigator.bluetooth.getAvailability();
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
	 * Notification購読イベント用の空いているイベントハンドラーを返す。
	 */
	public getNotificationEventHandler(): number {
		for (let i: number = 0; i < this.notificationEventListeners.length; i++) {
			if (this.notificationEventListeners[i] == null) return i;
		}
		return this.notificationEventListeners.length;
	}

	/**
	 * トリガーデータの指定したインデックスが立っているかどうかを返す。
	 * @param index 確認したトリガーデータのインデックス（0〜52）
	 * @throws InvalidInputError 指定したインデックスが0〜52の範囲外である場合に投げられる。
	 * @returns 指定したインデックスが立っているかどうか。
	 */
	public isTriggered(index: number): boolean {
		if (index < 0 || index >= this.connectionConfig.numberOfTriggerData) throw new InvalidInputError(`The specified index is out of valid range (0-${this.connectionConfig.numberOfTriggerData - 1}).`);
		if (this.lastTriggerValue != null) {
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
	private async getDevice(): Promise<BluetoothDevice | null> {
		if (!(await this.getIsSupportedWebBluetooth())) throw new NotSupportedError('Web Bluetooth is not supported or not available in this browser.');
		const serviceUUIDs: string[] = [];
		for (const service in this.connectionConfig.services) serviceUUIDs.push(this.connectionConfig.services[service].uuid);
		let device: BluetoothDevice | null = null;
		try {
			device = await navigator.bluetooth.requestDevice({
				filters: [
					{ name: this.connectionConfig.deviceName },
					{ manufacturerData: [{ companyIdentifier: this.connectionConfig.companyId }] }
				],
				optionalManufacturerData: [this.connectionConfig.companyId],
				optionalServices: serviceUUIDs
			});
		}
		catch (error: any) {
			if (error.name == 'NotFoundError') console.warn('No device selected. It may be caused by user cancelling the device selection.');
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
		if (device == null) throw new InvalidInputError('No Bluetooth device selected.');

		if (device.watchAdvertisements != undefined) {
			device.addEventListener('advertisementreceived', (event: BluetoothAdvertisingEvent) => {
				const triggerArray: Uint8Array = new Uint8Array(event.manufacturerData.get(this.connectionConfig.companyId)!.buffer);
				if (triggerArray.length >= 8 || (triggerArray.length == 7 && triggerArray[6] > 0b00011111)) throw new TriggerOverflowError('Too big trigger data received.');
				let triggerValue: number = 0;
				triggerArray.forEach((value: number, index: number) => triggerValue += value << ((triggerArray.length - index - 1) * 8));;
				this.lastTriggerValue = triggerValue;
				this.lastTriggerTimestamp = Date.now();
				this.dispatchEvent(new CustomEvent('trigger-data-received', { detail: { triggerValue: triggerValue } }));
			});
			await device.watchAdvertisements();
			console.info('Trigger data observation started.');
		}
		else {
			throw new NotSupportedError('Watching advertisements is not supported in this browser.');
		}
	}

	/**
	 * IoTセンサモジュールと接続し、詳細なセンサの取得やモジュールの設定を操作を行える状態にする。
	 * @throws InvalidInputError 適切なBluetoothデバイス（IoTセンサモジュール）が選択されていない場合に投げられる。
	 * @throws NotSupportedError Web Bluetoothが対応していない場合に投げられる。
	 * @throws SecurityError セキュリティ上の懸念点によりWeb Bluetoothの利用が許可されていない場合に投げられる。localhostやhttps以外でのアクセス時などで発生する。
	 * @throws InvalidStateError すでに接続が確立されている場合や接続を試みるデバイスにGATTサーバーがない場合に投げられる。
	 */
	public async connect(): Promise<void> {
		if (this.connectedDevice != null) throw new InvalidStateError('A device is already established a connection.');

		const device: BluetoothDevice | null = await this.getDevice();
		if (device == null) throw new InvalidInputError('No Bluetooth device selected.');

		device.addEventListener('gattserverdisconnected', () => {
			this.dispatchEvent(new CustomEvent('connection-closed'));
		});

		if (device.gatt == undefined) throw new InvalidStateError('GATT server not found on the selected device.');
		await device.gatt!.connect();
		this.connectedDevice = device;
		console.info('Connection established.');

		this.dispatchEvent(new CustomEvent('connection-established'));
	}

	/**
	 * IoTセンサモジュールから切断する。
	 * @throws InvalidStateError まだデバイスと接続されていない場合に投げられる。
	 */
	public disconnect(): void {
		if (this.connectedDevice == null) throw new InvalidStateError('No device is connected.');

		this.connectedDevice.gatt!.disconnect();
		this.connectedDevice = null;
		console.info('Connection closed.');
	}

	/**
	 * 接続したIoTセンサモジュール内のGATTサーバー上の指定したキャラクタリスティックからデータを読み出す。
	 * @param serviceUuid データ読み出し対象のキャラクタリスティックが含まれるサービスのUUID
	 * @param characteristicUuid データ読み出し対象のキャラクタリスティックのUUID
	 * @returns 読み出されたデータが符号なし8ビット整数の配列として返される。
	 * @throws InvalidStateError デバイスと接続されていない場合やデバイス上にGATTサーバーが見つからない場合に投げられる。
	 * @throws Error データの読み出し時に通信エラーが発生した場合に投げられる。
	 */
	private async readCharacteristicValue(serviceUuid: string, characteristicUuid: string): Promise<DataView<ArrayBufferLike>> {
		if (this.connectedDevice == null) throw new InvalidStateError('No device is connected.');
		else if (this.connectedDevice.gatt == null) throw new InvalidStateError('GATT server not found on the selected device.');
		const rawValue: DataView<ArrayBufferLike> = await (await (await this.connectedDevice.gatt!.getPrimaryService(serviceUuid)).getCharacteristic(characteristicUuid)).readValue()
		return rawValue;
	}

	/**
	 * 接続したIoTセンサモジュール内のGATTサーバー上の指定したキャラクタリスティックのNotificationを購読する。
	 * @param serviceUuid Notification購読対象のキャラクタリスティックが含まれるサービスのUUID
	 * @param characteristicUuid Notification購読対象のキャラクタリスティックのUUID
	 * @param listener Notification受信時に呼び出されるコールバック関数
	 * @throws InvalidStateError デバイスと接続されていない場合やデバイス上にGATTサーバーが見つからない場合に投げられる。
	 * @throws Error Notification購読処理中の通信エラーが発生した場合に投げられる。
	 */
	private async subscribeCharacteristicNotification(serviceUuid: string, characteristicUuid: string, listener: (event: Event) => void): Promise<void> {
		if (this.connectedDevice == null) throw new InvalidStateError('No device is connected.');
		else if (this.connectedDevice.gatt == null) throw new InvalidStateError('GATT server not found on the selected device.');

		const characteristic = await (await this.connectedDevice.gatt!.getPrimaryService(serviceUuid)).getCharacteristic(characteristicUuid);
		characteristic.addEventListener('characteristicvaluechanged', listener);
		await characteristic.startNotifications();
	}

	/**
	 * 接続したIoTセンサモジュール内のGATTサーバー上の指定したキャラクタリスティックのNotificationの購読を終了する。
	 * @param serviceUuid Notification購読終了対象のキャラクタリスティックが含まれるサービスのUUID
	 * @param characteristicUuid Notification購読終了対象のキャラクタリスティックのUUID
	 * @param listener イベントリスナー解除用のリスナー関数。サブスクライブしたときのものと同じものを渡す。
	 * @throws InvalidStateError デバイスと接続されていない場合やデバイス上にGATTサーバーが見つからない場合に投げられる。
	 * @throws Error Notification購読終了処理中の通信エラーが発生した場合に投げられる。
	 */
	private async unsubscribeCharacteristicNotification(serviceUuid: string, characteristicUuid: string, listener: (event: Event) => void): Promise<void> {
		if (this.connectedDevice == null) throw new InvalidStateError('No device is connected.');
		else if (this.connectedDevice.gatt == null) throw new InvalidStateError('GATT server not found on the selected device.');

		const characteristic = await (await this.connectedDevice.gatt!.getPrimaryService(serviceUuid)).getCharacteristic(characteristicUuid);
		characteristic.removeEventListener('characteristicvaluechanged', listener);
		await characteristic.stopNotifications();
	}

	/**
	 * DataServiceからセンサーデータを読み出す。
	 * @param sensorName 読み出し対象のセンサーデータの名称
	 * @returns 読み出されたセンサーデータ。センサーのデーターフォーマットに応じて整形された値が返される。単なるnumber型か3つの値が1セットになったVector3型か判別する必要がある。
	 * @throws NotSupportedError 接続先のIoTセンサモジュールがDataServiceをサポートしていない場合に投げられる。
	 * @throws InvalidInputError 指定した名前のセンサーデータが存在しない場合に投げられる。
	 * @throws Error データの読み出し時に通信エラーが発生した場合に投げられる。
	 */
	public async getSensorData(sensorName: string): Promise<number|BigInt|Vector3<number>|Vector3<BigInt>> {
		if (this.connectionConfig.services.dataService == undefined) throw new NotSupportedError('Data Service is not supported on the connected device.');
		else if (!Object.keys(this.connectionConfig.services.dataService!.characteristics).includes(sensorName)) throw new InvalidInputError(`Non-existent sensor "${sensorName}" specified.`);

		console.info('Sensor data acquired.');
		const rawValue: DataView<ArrayBufferLike> = await this.readCharacteristicValue(this.connectionConfig.services.dataService!.uuid, this.connectionConfig.services.dataService!.characteristics[sensorName]!.uuid);
		switch (this.connectionConfig.services.dataService!.characteristics[sensorName]!.dataType) {
			case 'int8': {
				return rawValue.getInt8(0);
			}
			case 'uint8': {
				return rawValue.getUint8(0);
			}
			case 'int8_vec3': {
				return new Vector3(rawValue.getInt8(0), rawValue.getInt8(1), rawValue.getInt8(2));
			}
			case 'uint8_vec3': {
				return new Vector3(rawValue.getUint8(0), rawValue.getUint8(1), rawValue.getUint8(2));
			}
			case 'int16': {
				return rawValue.getInt16(0);
			}
			case 'uint16': {
				return rawValue.getUint16(0);
			}
			case 'int16_vec3': {
				return new Vector3(rawValue.getInt16(0), rawValue.getInt16(2), rawValue.getInt16(4));
			}
			case 'uint16_vec3': {
				return new Vector3(rawValue.getUint16(0), rawValue.getUint16(2), rawValue.getUint16(4));
			}
			case 'int32': {
				return rawValue.getInt32(0);
			}
			case 'uint32': {
				return rawValue.getUint32(0);
			}
			case 'int32_vec3': {
				return new Vector3(rawValue.getInt32(0), rawValue.getInt32(4), rawValue.getInt32(8));
			}
			case 'uint32_vec3': {
				return new Vector3(rawValue.getUint32(0), rawValue.getUint32(4), rawValue.getUint32(8));
			}
			case 'int64': {
				return rawValue.getBigInt64(0);
			}
			case 'uint64': {
				return rawValue.getBigUint64(0);
			}
			case 'int64_vec3': {
				return new Vector3<BigInt>(rawValue.getBigInt64(0), rawValue.getBigInt64(8), rawValue.getBigInt64(16));
			}
			case 'uint64_vec3': {
				return new Vector3<BigInt>(rawValue.getBigUint64(0), rawValue.getBigUint64(8), rawValue.getBigUint64(16));
			}
			case 'float32': {
				return rawValue.getFloat32(0);
			}
			case 'float64': {
				return rawValue.getFloat64(0);
			}
			case 'float32_vec3': {
				return new Vector3(rawValue.getFloat32(0), rawValue.getFloat32(4), rawValue.getFloat32(8));
			}
			case 'float64_vec3': {
				return new Vector3(rawValue.getFloat64(0), rawValue.getFloat64(8), rawValue.getFloat64(16));
			}
			default: {
				throw new InvalidInputError(`Data type "${this.connectionConfig.services.dataService!.characteristics[sensorName]!.dataType}" is not valid data type.`);
			}
		}
	}

	/**
	 * センサーデータのNotificationを購読する。
	 * @param sensorName Notification購読対象のセンサーデータの名称
	 * @param listener Notification受信時に呼び出されるコールバック関数
	 * @param listener.event Notification受信時に渡されるイベントオブジェクト（characteristicvaluechanged）
	 * @param listener.value Notification受信時に渡されるセンサーデータ。センサーのデーターフォーマットに応じて整形された値が渡される。単なるnumber型か3つの値が1セットになったVector3型か判別する必要がある。
	 * @returns 登録したNotification購読イベントハンドラーの識別子。アンサブスクライブするときに必要。
	 * @throws NotSupportedError 接続先のIoTセンサモジュールがDataServiceをサポートしていない場合に投げられる。
	 * @throws InvalidInputError 指定した名前のセンサーデータが存在しない場合に投げられる。
	 * @throws Error Notification購読処理中の通信エラーが発生した場合に投げられる。
	 */
	public async subscribeSensorData(sensorName: string, listener: (event: Event, value: number|BigInt|Vector3<number>|Vector3<BigInt>) => void): Promise<number> {
		if (this.connectionConfig.services.dataService == undefined) throw new NotSupportedError('Data Service is not supported on the connected device.');
		else if (!Object.keys(this.connectionConfig.services.dataService!.characteristics).includes(sensorName)) throw new InvalidInputError(`Non-existent sensor "${sensorName}" specified.`);

		const handler = this.getNotificationEventHandler();
		this.notificationEventListeners[handler] = (event: Event) => {
			console.info('Sensor data Notification received.');
			const rawValue: DataView<ArrayBufferLike> = (event.target as BluetoothRemoteGATTCharacteristic).value!;
			switch (this.connectionConfig.services.dataService!.characteristics[sensorName]!.dataType) {
				case 'int8': {
					listener(event, rawValue.getInt8(0));
					break;
				}
				case 'uint8': {
					listener(event, rawValue.getUint8(0));
					break;
				}
				case 'int8_vec3': {
					listener(event, new Vector3(rawValue.getInt8(0), rawValue.getInt8(1), rawValue.getInt8(2)));
					break;
				}
				case 'uint8_vec3': {
					listener(event, new Vector3(rawValue.getUint8(0), rawValue.getUint8(1), rawValue.getUint8(2)));
					break;
				}
				case 'int16': {
					listener(event, rawValue.getInt16(0));
					break;
				}
				case 'uint16': {
					listener(event, rawValue.getUint16(0));
					break;
				}
				case 'int16_vec3': {
					listener(event, new Vector3(rawValue.getInt16(0), rawValue.getInt16(2), rawValue.getInt16(4)));
					break;
				}
				case 'uint16_vec3': {
					listener(event, new Vector3(rawValue.getUint16(0), rawValue.getUint16(2), rawValue.getUint16(4)));
					break;
				}
				case 'int32': {
					listener(event, rawValue.getInt32(0));
					break;
				}
				case 'uint32': {
					listener(event, rawValue.getUint32(0));
					break;
				}
				case 'int32_vec3': {
					listener(event, new Vector3(rawValue.getInt32(0), rawValue.getInt32(4), rawValue.getInt32(8)));
					break;
				}
				case 'uint32_vec3': {
					listener(event, new Vector3(rawValue.getUint32(0), rawValue.getUint32(4), rawValue.getUint32(8)));
					break;
				}
				case 'int64': {
					listener(event, rawValue.getBigInt64(0));
					break;
				}
				case 'uint64': {
					listener(event, rawValue.getBigUint64(0));
					break;
				}
				case 'int64_vec3': {
					listener(event, new Vector3<BigInt>(rawValue.getBigInt64(0), rawValue.getBigInt64(8), rawValue.getBigInt64(16)));
					break;
				}
				case 'uint64_vec3': {
					listener(event, new Vector3<BigInt>(rawValue.getBigUint64(0), rawValue.getBigUint64(8), rawValue.getBigUint64(16)));
					break;
				}
				case 'float32': {
					listener(event, rawValue.getFloat32(0));
					break;
				}
				case 'float64': {
					listener(event, rawValue.getFloat64(0));
					break;
				}
				case 'float32_vec3': {
					listener(event, new Vector3(rawValue.getFloat32(0), rawValue.getFloat32(4), rawValue.getFloat32(8)));
					break;
				}
				case 'float64_vec3': {
					listener(event, new Vector3(rawValue.getFloat64(0), rawValue.getFloat64(8), rawValue.getFloat64(16)));
					break;
				}
				default: {
					throw new InvalidInputError(`Data type "${this.connectionConfig.services.dataService!.characteristics[sensorName]!.dataType}" is not valid data type.`);
				}
			}
		}

		await this.subscribeCharacteristicNotification(this.connectionConfig.services.dataService!.uuid, this.connectionConfig.services.dataService!.characteristics[sensorName]!.uuid, this.notificationEventListeners[handler]!);
		console.info('Sensor data subscription started.');

		return handler;
	}

	/**
	 * センサーデータのNotificationの購読を終了する。
	 * @param sensorName Notification購読対象のセンサーデータの名称
	 * @param handler サブスクライブ関数の返り値のハンドラー変数
	 */
	public async unsubscribeSensorData(sensorName: string, handler: number): Promise<void> {
		if (this.connectionConfig.services.dataService == undefined) throw new NotSupportedError('Data Service is not supported on the connected device.');
		else if (!Object.keys(this.connectionConfig.services.dataService!.characteristics).includes(sensorName)) throw new InvalidInputError(`Non-existent sensor "${sensorName}" specified.`);

		await this.unsubscribeCharacteristicNotification(this.connectionConfig.services.dataService!.uuid, this.connectionConfig.services.dataService!.characteristics[sensorName]!.uuid, this.notificationEventListeners[handler]!);
		console.info('Sensor data subscription stopped.');

		this.notificationEventListeners[handler] = null;
	}

	/**
	 * LogServiceからセンサーログを読み出す。
	 * @param sensorName 読み出し対象のセンサーデータの名称
	 * @returns 読み出されたセンサーログが配列の形で返される。インデックス番号が若いほど新しいデータになる。各要素はセンサーのデーターフォーマットに応じて整形されている。単なるnumber型か3つの値が1セットになったVector3型か判別する必要がある。
	 * @throws NotSupportedError 接続先のIoTセンサモジュールがLogServiceをサポートしていない場合に投げられる。
	 * @throws InvalidInputError 指定した名前のセンサーデータが存在しない場合に投げられる。
	 * @throws Error ログの読み出し時に通信エラーが発生した場合に投げられる。
	 */
	public async readSensorLog(sensorName: string): Promise<(number|BigInt|Vector3<number>|Vector3<BigInt>)[]> {
		if (this.connectionConfig.services.logService == undefined) throw new NotSupportedError('Log Service is not supported on the connected device.');
		else if (!Object.keys(this.connectionConfig.services.logService!.characteristics).includes(sensorName)) throw new InvalidInputError(`Non-existent sensor "${sensorName}" specified.`);

		console.info('Sensor log acquired.');
		const rawValue: DataView<ArrayBufferLike> = await this.readCharacteristicValue(this.connectionConfig.services.logService!.uuid, this.connectionConfig.services.logService!.characteristics[sensorName]!.uuid);
		switch (this.connectionConfig.services.dataService!.characteristics[sensorName]!.dataType) {
			case 'int8': {
				const logArray: number[] = [];
				for (let i = 0; i < rawValue.byteLength; i++) logArray.push(rawValue.getInt8(i));
				return logArray;
			}
			case 'uint8': {
				const logArray: number[] = [];
				for (let i = 0; i < rawValue.byteLength; i++) logArray.push(rawValue.getUint8(i));
				return logArray;
			}
			case 'int8_vec3': {
				const logArray: Vector3<number>[] = [];
				for (let i = 0; i < rawValue.byteLength; i += 3) logArray.push(new Vector3(rawValue.getInt8(i), rawValue.getInt8(i + 1), rawValue.getInt8(i + 2)));
				return logArray;
			}
			case 'uint8_vec3': {
				const logArray: Vector3<number>[] = [];
				for (let i = 0; i < rawValue.byteLength; i += 3) logArray.push(new Vector3(rawValue.getUint8(i), rawValue.getUint8(i + 1), rawValue.getUint8(i + 2)));
				return logArray;
			}
			case 'int16': {
				const logArray: number[] = [];
				for (let i = 0; i < rawValue.byteLength; i += 2) logArray.push(rawValue.getInt16(i));
				return logArray;
			}
			case 'uint16': {
				const logArray: number[] = [];
				for (let i = 0; i < rawValue.byteLength; i += 2) logArray.push(rawValue.getUint16(i));
				return logArray;
			}
			case 'int16_vec3': {
				const logArray: Vector3<number>[] = [];
				for (let i = 0; i < rawValue.byteLength; i += 6) logArray.push(new Vector3(rawValue.getInt16(i), rawValue.getInt16(i + 2), rawValue.getInt16(i + 4)));
				return logArray;
			}
			case 'uint16_vec3': {
				const logArray: Vector3<number>[] = [];
				for (let i = 0; i < rawValue.byteLength; i += 6) logArray.push(new Vector3(rawValue.getUint16(i), rawValue.getUint16(i + 2), rawValue.getUint16(i + 4)));
				return logArray;
			}
			case 'int32': {
				const logArray: number[] = [];
				for (let i = 0; i < rawValue.byteLength; i += 4) logArray.push(rawValue.getInt32(i));
				return logArray;
			}
			case 'uint32': {
				const logArray: number[] = [];
				for (let i = 0; i < rawValue.byteLength; i += 4) logArray.push(rawValue.getUint32(i));
				return logArray;
			}
			case 'int32_vec3': {
				const logArray: Vector3<number>[] = [];
				for (let i = 0; i < rawValue.byteLength; i += 12) logArray.push(new Vector3(rawValue.getInt32(i), rawValue.getInt32(i + 4), rawValue.getInt32(i + 8)));
				return logArray;
			}
			case 'uint32_vec3': {
				const logArray: Vector3<number>[] = [];
				for (let i = 0; i < rawValue.byteLength; i += 12) logArray.push(new Vector3(rawValue.getUint32(i), rawValue.getUint32(i + 4), rawValue.getUint32(i + 8)));
				return logArray;
			}
			case 'int64': {
				const logArray: BigInt[] = [];
				for (let i = 0; i < rawValue.byteLength; i += 8) logArray.push(rawValue.getBigInt64(i));
				return logArray;
			}
			case 'uint64': {
				const logArray: BigInt[] = [];
				for (let i = 0; i < rawValue.byteLength; i += 8) logArray.push(rawValue.getBigUint64(i));
				return logArray;
			}
			case 'int64_vec3': {
				const logArray: Vector3<BigInt>[] = [];
				for (let i = 0; i < rawValue.byteLength; i += 24) logArray.push(new Vector3<BigInt>(rawValue.getBigInt64(i), rawValue.getBigInt64(i + 8), rawValue.getBigInt64(i + 16)));
				return logArray;
			}
			case 'uint64_vec3': {
				const logArray: Vector3<BigInt>[] = [];
				for (let i = 0; i < rawValue.byteLength; i += 24) logArray.push(new Vector3<BigInt>(rawValue.getBigUint64(i), rawValue.getBigUint64(i + 8), rawValue.getBigUint64(i + 16)));
				return logArray;
			}
			case 'float32': {
				const logArray: number[] = [];
				for (let i = 0; i < rawValue.byteLength; i += 4) logArray.push(rawValue.getFloat32(i));
				return logArray;
			}
			case 'float64': {
				const logArray: number[] = [];
				for (let i = 0; i < rawValue.byteLength; i += 8) logArray.push(rawValue.getFloat64(i));
				return logArray;
			}
			case 'float32_vec3': {
				const logArray: Vector3<number>[] = [];
				for (let i = 0; i < rawValue.byteLength; i += 12) logArray.push(new Vector3(rawValue.getFloat32(i), rawValue.getFloat32(i + 4), rawValue.getFloat32(i + 8)));
				return logArray;
			}
			case 'float64_vec3': {
				const logArray: Vector3<number>[] = [];
				for (let i = 0; i < rawValue.byteLength; i += 24) logArray.push(new Vector3(rawValue.getFloat64(i), rawValue.getFloat64(i + 8), rawValue.getFloat64(i + 16)));
				return logArray;
			}
			default: {
				throw new InvalidInputError(`Data type "${this.connectionConfig.services.logService!.characteristics[sensorName]!.dataType}" is not valid data type.`);
			}
		}
	}

	/**
	 * センサーログのNotificationを購読する。
	 * @param sensorName Notification購読対象のセンサーデータの名称
	 * @param listener Notification受信時に呼び出されるコールバック関数
	 * @param listener.event Notification受信時に渡されるイベントオブジェクト（characteristicvaluechanged）
	 * @param listener.value Notification受信時のセンサーログが配列の形で返される。インデックス番号が若いほど新しいデータになる。各要素はセンサーのデーターフォーマットに応じて整形されている。単なるnumber型か3つの値が1セットになったVector3型か判別する必要がある。
	 * @returns 登録したNotification購読イベントハンドラーの識別子。アンサブスクライブするときに必要。
	 * @throws NotSupportedError 接続先のIoTセンサモジュールがLogServiceをサポートしていない場合に投げられる。
	 * @throws InvalidInputError 指定した名前のセンサーデータが存在しない場合に投げられる。
	 * @throws Error Notification購読処理中の通信エラーが発生した場合に投げられる。
	 */
	public async subscribeSensorLog(sensorName: string, listener: (event: Event, value: (number|BigInt|Vector3<number>|Vector3<BigInt>)[]) => void): Promise<number> {
		if (this.connectionConfig.services.logService == undefined) throw new NotSupportedError('Log Service is not supported on the connected device.');
		else if (!Object.keys(this.connectionConfig.services.logService!.characteristics).includes(sensorName)) throw new InvalidInputError(`Non-existent sensor "${sensorName}" specified.`);

		const handler = this.getNotificationEventHandler();
		this.notificationEventListeners[handler] = (event: Event) => {
			console.info('Sensor log Notification received.');
			const rawValue: DataView<ArrayBufferLike> = (event.target as BluetoothRemoteGATTCharacteristic).value!;
			switch (this.connectionConfig.services.dataService!.characteristics[sensorName]!.dataType) {
				case 'int8': {
					const logArray : number[] = [];
					for (let i = 0; i < rawValue.byteLength; i++) logArray.push(rawValue.getInt8(i));
					listener(event, logArray);
					break;
				}
				case 'uint8': {
					const logArray : number[] = [];
					for (let i = 0; i < rawValue.byteLength; i++) logArray.push(rawValue.getUint8(i));
					listener(event, logArray);
					break;
				}
				case 'int8_vec3': {
					const logArray : Vector3<number>[] = [];
					for (let i = 0; i < rawValue.byteLength; i += 3) logArray.push(new Vector3(rawValue.getInt8(i), rawValue.getInt8(i + 1), rawValue.getInt8(i + 2)));
					listener(event, logArray);
					break;
				}
				case 'uint8_vec3': {
					const logArray : Vector3<number>[] = [];
					for (let i = 0; i < rawValue.byteLength; i += 3) logArray.push(new Vector3(rawValue.getUint8(i), rawValue.getUint8(i + 1), rawValue.getUint8(i + 2)));
					listener(event, logArray);
					break;
				}
				case 'int16': {
					const logArray : number[] = [];
					for (let i = 0; i < rawValue.byteLength; i += 2) logArray.push(rawValue.getInt16(i));
					listener(event, logArray);
					break;
				}
				case 'uint16': {
					const logArray : number[] = [];
					for (let i = 0; i < rawValue.byteLength; i += 2) logArray.push(rawValue.getUint16(i));
					listener(event, logArray);
					break;
				}
				case 'int16_vec3': {
					const logArray : Vector3<number>[] = [];
					for (let i = 0; i < rawValue.byteLength; i += 6) logArray.push(new Vector3(rawValue.getInt16(i), rawValue.getInt16(i + 2), rawValue.getInt16(i + 4)));
					listener(event, logArray);
					break;
				}
				case 'uint16_vec3': {
					const logArray : Vector3<number>[] = [];
					for (let i = 0; i < rawValue.byteLength; i += 6) logArray.push(new Vector3(rawValue.getUint16(i), rawValue.getUint16(i + 2), rawValue.getUint16(i + 4)));
					listener(event, logArray);
					break;
				}
				case 'int32': {
					const logArray : number[] = [];
					for (let i = 0; i < rawValue.byteLength; i += 4) logArray.push(rawValue.getInt32(i));
					listener(event, logArray);
					break;
				}
				case 'uint32': {
					const logArray : number[] = [];
					for (let i = 0; i < rawValue.byteLength; i += 4) logArray.push(rawValue.getUint32(i));
					listener(event, logArray);
					break;
				}
				case 'int32_vec3': {
					const logArray : Vector3<number>[] = [];
					for (let i = 0; i < rawValue.byteLength; i += 12) logArray.push(new Vector3(rawValue.getInt32(i), rawValue.getInt32(i + 4), rawValue.getInt32(i + 8)));
					listener(event, logArray);
					break;
				}
				case 'uint32_vec3': {
					const logArray : Vector3<number>[] = [];
					for (let i = 0; i < rawValue.byteLength; i += 12) logArray.push(new Vector3(rawValue.getUint32(i), rawValue.getUint32(i + 4), rawValue.getUint32(i + 8)));
					listener(event, logArray);
					break;
				}
				case 'int64': {
					const logArray : BigInt[] = [];
					for (let i = 0; i < rawValue.byteLength; i += 8) logArray.push(rawValue.getBigInt64(i));
					listener(event, logArray);
					break;
				}
				case 'uint64': {
					const logArray : BigInt[] = [];
					for (let i = 0; i < rawValue.byteLength; i += 8) logArray.push(rawValue.getBigUint64(i));
					listener(event, logArray);
					break;
				}
				case 'int64_vec3': {
					const logArray : Vector3<BigInt>[] = [];
					for (let i = 0; i < rawValue.byteLength; i += 24) logArray.push(new Vector3(rawValue.getBigInt64(i), rawValue.getBigInt64(i + 8), rawValue.getBigInt64(i + 16)));
					listener(event, logArray);
					break;
				}
				case 'uint64_vec3': {
					const logArray : Vector3<BigInt>[] = [];
					for (let i = 0; i < rawValue.byteLength; i += 24) logArray.push(new Vector3(rawValue.getBigUint64(i), rawValue.getBigUint64(i + 8), rawValue.getBigUint64(i + 16)));
					listener(event, logArray);
					break;
				}
				case 'float32': {
					const logArray : number[] = [];
					for (let i = 0; i < rawValue.byteLength; i += 4) logArray.push(rawValue.getFloat32(i));
					listener(event, logArray);
					break;
				}
				case 'float64': {
					const logArray : number[] = [];
					for (let i = 0; i < rawValue.byteLength; i += 8) logArray.push(rawValue.getFloat64(i));
					listener(event, logArray);
					break;
				}
				case 'float32_vec3': {
					const logArray : Vector3<number>[] = [];
					for (let i = 0; i < rawValue.byteLength; i += 12) logArray.push(new Vector3(rawValue.getFloat32(i), rawValue.getFloat32(i + 4), rawValue.getFloat32(i + 8)));
					listener(event, logArray);
					break;
				}
				case 'float64_vec3': {
					const logArray : Vector3<number>[] = [];
					for (let i = 0; i < rawValue.byteLength; i += 24) logArray.push(new Vector3(rawValue.getFloat64(i), rawValue.getFloat64(i + 8), rawValue.getFloat64(i + 16)));
					listener(event, logArray);
					break;
				}
				default: {
					throw new InvalidInputError(`Data type "${this.connectionConfig.services.dataService!.characteristics[sensorName]!.dataType}" is not valid data type.`);
				}
			}
		}

		await this.subscribeCharacteristicNotification(this.connectionConfig.services.logService!.uuid, this.connectionConfig.services.logService!.characteristics[sensorName]!.uuid, this.notificationEventListeners[handler]!);
		console.info('Sensor log subscription started.');

		return handler;
	}

	/**
	 * センサーログのNotificationの購読を終了する。
	 * @param sensorName Notification購読対象のセンサーデータの名称
	 * @param handler サブスクライブ関数の返り値のハンドラー変数
	 */
	public async unsubscribeSensorLog(sensorName: string, handler: number): Promise<void> {
		if (this.connectionConfig.services.logService == undefined) throw new NotSupportedError('Log Service is not supported on the connected device.');
		else if (!Object.keys(this.connectionConfig.services.logService!.characteristics).includes(sensorName)) throw new InvalidInputError(`Non-existent sensor "${sensorName}" specified.`);

		await this.unsubscribeCharacteristicNotification(this.connectionConfig.services.logService!.uuid, this.connectionConfig.services.logService!.characteristics[sensorName]!.uuid, this.notificationEventListeners[handler]!);
		console.info('Sensor log subscription stopped.');

		this.notificationEventListeners[handler] = null;
	}
}

// グローバル宣言用
declare global {
	const IoTSensorModuleAPI: IoTSensorModuleAPI;
}
