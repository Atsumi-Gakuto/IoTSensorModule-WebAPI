import { IoTSensorModuleAPI } from "../../dist/iot_sensor_module_api.mjs";

const api = new IoTSensorModuleAPI();
document.getElementById("message_is_web_bluetooth_supported").innerText = api.getIsSupportedWebBluetooth() ? "はい" : "いいえ";

document.getElementById("button_start_advertise_observe").addEventListener("click", async () => api.observeTrigger());

api.addEventListener("trigger-data-received", (event) => {
	console.log(event.detail.triggerValue);
});
