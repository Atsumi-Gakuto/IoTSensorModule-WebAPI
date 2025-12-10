import { IoTSensorModuleCharacteristicDataType } from "../types/iot_sensor_module_characteristic_data_type";

/**
 * IoTセンサモジュールのサービスが持つキャラクタリスティックの情報
 */
export interface IoTSensorModuleCharacteristic {
	/**
	 * キャラクタリスティックのUUID
	 */
	uuid: string;

	/**
	 * キャラクタリスティックの値のデータ表現形式。Data Service及びLog Serviceのみで使用する。
	 */
	dataType?: IoTSensorModuleCharacteristicDataType;

	/**
	 * Log Serviceのキャラクタリスティックの値に含まれるログの最大件数。Log Serviceのみで使用する。
	 */
	logCount?: number;
}
