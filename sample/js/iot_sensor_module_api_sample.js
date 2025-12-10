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
	let api;
	try {
		api = new IoTSensorModuleAPI(connectionConfig);
	}
	catch(error) {
		console.error(`Failed to create API instance. Reason: ${error}`);
		const apiInstanceElement = document.getElementById('message_api_instance');
		apiInstanceElement.innerText = '入力情報に誤りあり';
		apiInstanceElement.classList.add('message_ng');
		return;
	}
	const apiInstanceElement = document.getElementById('message_api_instance');
	apiInstanceElement.innerText = '生成OK';
	apiInstanceElement.classList.add('message_ok');

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

		// 接続ボタン
		const connectButton = document.getElementById('button_connect');
		connectButton.addEventListener('click', async () => api.connect());
		connectButton.disabled = false;

		// 切断ボタン
		const disconnectButton = document.getElementById('button_disconnect');
		//disconnectButton.addEventListener('click', async () => api.disconnect());

		// イベント登録
		api.addEventListener('trigger-data-received', () => {
			document.getElementById('message_last_trigger_timestamp').innerText = new Date(api.getLastTriggerTimestamp()).toLocaleString();
			for(let i = 0; i < api.getNumberOfTriggerData(); i++) {
				document.getElementById('row_trigger_data_flags').children[i].innerText = api.isTriggered(i) ? '✅' : '❌';
			}
		});
		api.addEventListener('connection-established', () => {
			startObserveButton.disabled = true;
			connectButton.disabled = true;
			disconnectButton.disabled = false;
		});
		api.addEventListener('connection-closed', () => {
			startObserveButton.disabled = false;
			connectButton.disabled = false;
			disconnectButton.disabled = true;
		});
	}
}

init();
