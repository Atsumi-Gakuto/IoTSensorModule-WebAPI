import { IoTSensorModuleAPI } from '../../dist/iot_sensor_module_api.mjs';

/**
 * 初期化関数
 */
async function init() {
	// IoTセンサモジュールの情報取得
	let connectionConfig;
	try {
		const response = await fetch('./data/thunderboard_efr32bg22.json');
		console.info('Connection config fetched.');
		connectionConfig = await response.json();
		console.info('Connection config parsed.');
	} catch (error) {
		const connectionInfoElement = document.getElementById('message_connection_info');
		if(error instanceof SyntaxError) {
			console.error(`Failed to parse connection config. Reason: ${error}`);
			connectionInfoElement.innerText = '解析失敗';
		}
		else {
			console.error(`Failed to fetch connection config. Reason: ${error}`);
			connectionInfoElement.innerText = '取得失敗';
		}
		connectionInfoElement.classList.add('message_ng');
		return;
	}
	const connectionInfoElement = document.getElementById('message_connection_info');
	connectionInfoElement.innerText = '取得OK';
	connectionInfoElement.classList.add('message_ok');


	// IoTセンサモジュールAPIの初期化
	const api = new IoTSensorModuleAPI(connectionConfig);


	// Web Bluetooth対応チェック
	const isWebBluetoothSupported = api.getIsSupportedWebBluetooth();
	if(isWebBluetoothSupported) {
		console.info('Web Bluetooth is supported on this browser.');
		const supportIndicatorElement = document.getElementById('message_is_web_bluetooth_supported');
		supportIndicatorElement.innerText = 'はい';
		supportIndicatorElement.classList.add('message_ok');
	}
	else {
		console.warn('Web Bluetooth is not supported on this browser.');
		const supportIndicatorElement = document.getElementById('message_is_web_bluetooth_supported');
		supportIndicatorElement.innerText = 'いいえ';
		supportIndicatorElement.classList.add('message_ng');
	}


	// トリガーデータ可視化の表
	for(let i = 0; i < api.getNumberOfTriggerData(); i++) {
		const indexElement = document.createElement('td');
		indexElement.innerText = i.toString();
		document.getElementById('row_trigger_data_index').append(indexElement);
		const flagElement = document.createElement('td');
		flagElement.innerText = '❌';
		document.getElementById('row_trigger_data_flags').append(flagElement);
	}


	if(isWebBluetoothSupported) {
		// トリガーデータ監視ボタン
		const startObserveButton = document.getElementById('button_start_advertise_observe');
		startObserveButton.addEventListener('click', async () => api.observeTrigger());
		startObserveButton.disabled = false;


		// イベント登録
		api.addEventListener('trigger-data-received', () => {
			document.getElementById('message_last_trigger_timestamp').innerText = new Date(api.getLastTriggerTimestamp()).toLocaleString();
			for(let i = 0; i < api.getNumberOfTriggerData(); i++) {
				document.getElementById('row_trigger_data_flags').children[i].innerText = api.isTriggered(i) ? '✅' : '❌';
			}
		});
	}
}

init();
