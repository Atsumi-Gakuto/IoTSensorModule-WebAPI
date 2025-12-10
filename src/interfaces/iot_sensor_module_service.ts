import { IoTSensorModuleCharacteristicDataType } from "../types/iot_sensor_module_characteristic_data_type";

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
	characteristics: { [key: string]: IoTSensorModuleCharacteristicDataType };
}
