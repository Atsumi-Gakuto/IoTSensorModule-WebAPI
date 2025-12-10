import { IoTSensorModuleService } from "./iot_sensor_module_service";

/**
 * IoTセンサモジュールのアドバタイジングの受信や接続に関する情報を定義するインターフェース。
 */
export interface IoTSensorModuleConnectionConfig {
	/**
	 * IoTセンサモジュールデバイスのBLE上の表示名
	 */
	deviceName: string;

	/**
	 * IoTセンサモジュールデバイスのManufacturer Specific DataのCompany ID（0x0000 - 0xFFFF）
	 */
	companyId: number;

	/**
	 * トリガーデータの数（1 - 53）
	 */
	numberOfTriggerData: number;

	/**
	 * IoTセンサモジュールのGATTサーバーが持つサービスの情報
	 */
	services: { [key: string]: IoTSensorModuleService };
}
