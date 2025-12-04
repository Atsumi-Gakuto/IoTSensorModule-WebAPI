import { IoTSensorModuleAPI } from "../../dist/iot_sensor_module_api.mjs";

const api = new IoTSensorModuleAPI();
document.getElementById("message_is_web_bluetooth_supported").innerText = api.getIsSupportedWebBluetooth() ? "はい" : "いいえ";
