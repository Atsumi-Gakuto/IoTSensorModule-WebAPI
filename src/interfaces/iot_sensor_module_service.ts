import { IoTSensorModuleCharacteristic } from "./iot_sensor_module_characteristics";

/**
 * IoTセンサモジュールのGATTサーバーが持つサービスの情報
 */
export interface IoTSensorModuleService {
	/**
	 * サービスのUUID
	 */
	uuid: string;

	/**
	 * サービス内に含まれるキャラクタリスティックの情報
	 */
	characteristics: { [key: string]: IoTSensorModuleCharacteristic };
}
