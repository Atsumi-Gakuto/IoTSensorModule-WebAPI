import { IoTSensorModuleAPI } from '../../dist/iot_sensor_module_api.mjs';

const api = new IoTSensorModuleAPI();

// 対応チェック
document.getElementById('message_is_web_bluetooth_supported').innerText = api.getIsSupportedWebBluetooth() ? 'はい' : 'いいえ';

// トリガーデータ可視化の表
for(let i = 0; i < api.getNumberOfTriggerData(); i++) {
	const indexElement = document.createElement('td');
	indexElement.innerText = i.toString();
	document.getElementById('row_trigger_data_index').append(indexElement);
	const flagElement = document.createElement('td');
	flagElement.innerText = '❌';
	document.getElementById('row_trigger_data_flags').append(flagElement);
}

// トリガーデータ監視ボタン
document.getElementById('button_start_advertise_observe').addEventListener('click', async () => api.observeTrigger());

api.addEventListener('trigger-data-received', () => {
	document.getElementById('message_last_trigger_timestamp').innerText = new Date(api.getLastTriggerTimestamp()).toLocaleString();
	for(let i = 0; i < api.getNumberOfTriggerData(); i++) {
		document.getElementById('row_trigger_data_flags').children[i].innerText = api.isTriggered(i) ? '✅' : '❌';
	}
});
