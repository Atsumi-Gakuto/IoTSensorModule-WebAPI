import { IoTSensorModuleAPI } from '../../dist/iot_sensor_module_api.mjs';

/**
 * IoTセンサモジュールAPIインスタンス
 * @type {IoTSensorModuleAPI}
 */
let api;

/**
 * Data ServiceのNotificationイベントハンドラーの格納用オブジェクト
 * @type {Object<string,Function>}
 */
const dataServiceNotificationEventHandlers = {};

/**
 * Log ServiceのNotificationイベントハンドラーの格納用オブジェクト
 * @type {Object<string,Function>}
 */
const logServiceNotificationEventHandlers = {};

/**
 * IoTセンサモジュールからのデータ取得や操作のボタンを一括で有効/無効にする。
 * @param {boolean} isEnabled 有効にする場合はtrue、無効にする場合はfalse
 */
function setControlsEnabled(isEnabled) {
	if (isEnabled) document.querySelectorAll('.connection_only_control').forEach((element) => element.disabled = false);
	else document.querySelectorAll('.connection_only_control').forEach((element) => element.disabled = true);
}

/**
 * センサーデータ情報の表にデータを追加する。
 * @param {string} name センサー名。有効なセンサー名かどうかのチェックは行わない。
 * @param {number|{x:number,y:number,z:number}} data センサーから取得したデータ
 * @param {string} unit センサーデータの単位
 */
function pushSensorData(name, data, unit) {
	const tableRowElement = document.createElement('tr');
	const getTimeElement = document.createElement('td');
	getTimeElement.innerText = new Date().toLocaleString();
	tableRowElement.append(getTimeElement);
	const sensorNameElement = document.createElement('td');
	sensorNameElement.innerText = name;
	tableRowElement.append(sensorNameElement);
	const sensorDataElement = document.createElement('td');
	sensorDataElement.innerText = data.x == undefined ? `${(Math.round(data * 100) / 100).toFixed(2)}${unit}` : `x=${(Math.round(data.x * 100) / 100).toFixed(2)}${unit}, y=${(Math.round(data.y * 100) / 100).toFixed(2)}${unit}, z=${(Math.round(data.z * 100) / 100).toFixed(2)}${unit}`;
	tableRowElement.append(sensorDataElement);
	document.getElementById('table_sensor_data').append(tableRowElement);
}

/**
 * センサーログ情報の表にデータを追加する。
 * @param {string} name センサー名。有効なセンサー名かどうかのチェックは行わない。
 * @param {(number|{x:number,y:number,z:number})[]} data センサーから取得したログデータの配列
 * @param {string} unit センサーデータの単位
 */
function pushSensorLog(name, data, unit) {
	const tableRowElement = document.createElement('tr');
	const getTimeElement = document.createElement('td');
	getTimeElement.innerText = new Date().toLocaleString();
	tableRowElement.append(getTimeElement);
	const sensorNameElement = document.createElement('td');
	sensorNameElement.innerText = name;
	tableRowElement.append(sensorNameElement);
	const sensorLogElement = document.createElement('td');
	const sensorLogListElement = document.createElement('ol');
	data.forEach((elm) => {
		const sensorLogListElmElement = document.createElement('li');
		sensorLogListElmElement.innerText = elm.x == undefined ? `${(Math.round(elm * 100) / 100).toFixed(2)}${unit}` : `x=${(Math.round(elm.x * 100) / 100).toFixed(2)}${unit}, y=${(Math.round(elm.y * 100) / 100).toFixed(2)}${unit}, z=${(Math.round(elm.z * 100) / 100).toFixed(2)}${unit}`;
		sensorLogListElement.append(sensorLogListElmElement);
	});
	sensorLogElement.append(sensorLogListElement);
	tableRowElement.append(sensorLogElement);
	document.getElementById('table_sensor_log').append(tableRowElement);
}

/**
 * 応答コードのテキストを返す。
 * @param {number} code 応答コード
 * @return {string} 応答コードのテキスト
 */
function getStatusCodeText(code) {
	const codeText = [
		'OPERATION_SUCCEEDED',
		'OPERATION_FAILED',
		'INVALID_INPUT',
		'NOT_PERMITTED',
		'MALLOC_FAILED',
		'NOT_IMPLEMENTED'
	]
	return codeText[code];
}

/**
 * IoTセンサモジュールの動作モードを取得して表示する。
 */
async function getOperationMode() {
	setControlsEnabled(false);

	let mode;
	try {
		mode = await api.getOperationMode();
	}
	catch (error) {
		//TODO: エラーを見やすく表示
		setControlsEnabled(true);
		throw error;
	}
	document.getElementById('value_system_service_operation_mode').innerText = mode == 0 ? 'User Mode' : 'Configuration Mode';
	setControlsEnabled(true);
}

/**
 * System Serviceからの応答コードを取得して表示する。
 */
async function getSystemServiceResponse() {
	setControlsEnabled(false);

	let response;
	try {
		response = await api.getSystemServiceResponse();
	}
	catch (error) {
		//TODO: エラーを見やすく表示
		setControlsEnabled(true);
		throw error;
	}
	document.getElementById('value_system_service_response').innerText = getStatusCodeText(response);
	setControlsEnabled(true);
}

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
		if (error instanceof SyntaxError) {
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
	try {
		api = new IoTSensorModuleAPI(connectionConfig);
	}
	catch (error) {
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
	if (isWebBluetoothSupported) {
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
	for (let i = 0; i < api.getNumberOfTriggerData(); i++) {
		const indexElement = document.createElement('td');
		indexElement.innerText = i.toString();
		document.getElementById('row_trigger_data_index').append(indexElement);
		const flagElement = document.createElement('td');
		flagElement.innerText = '❌';
		document.getElementById('row_trigger_data_flags').append(flagElement);
	}

	// センサーデータ取得コントロールの表
	const hasDataService = connectionConfig.services.dataService != undefined;
	if (hasDataService) {
		const dataServiceLabelElement = document.createElement('th');
		dataServiceLabelElement.innerText = 'Data Service';
		dataServiceLabelElement.colSpan = 2;
		document.getElementById('tr_sensor_data_control_header_1').append(dataServiceLabelElement);
		const readLabelElement = document.createElement('th');
		readLabelElement.innerText = 'Read';
		document.getElementById('tr_sensor_data_control_header_2').append(readLabelElement);
		const subscribeLabelElement = document.createElement('th');
		subscribeLabelElement.innerText = 'Subscribe';
		document.getElementById('tr_sensor_data_control_header_2').append(subscribeLabelElement);
	}
	else {
		document.getElementById('data_service_area').classList.add('hidden');
	}

	const hasLogService = connectionConfig.services.logService != undefined;
	if (hasLogService) {
		const logServiceLabelElement = document.createElement('th');
		logServiceLabelElement.innerText = 'Log Service';
		logServiceLabelElement.colSpan = 2;
		document.getElementById('tr_sensor_data_control_header_1').append(logServiceLabelElement);
		const readLabelElement = document.createElement('th');
		readLabelElement.innerText = 'Read';
		document.getElementById('tr_sensor_data_control_header_2').append(readLabelElement);
		const subscribeLabelElement = document.createElement('th');
		subscribeLabelElement.innerText = 'Subscribe';
		document.getElementById('tr_sensor_data_control_header_2').append(subscribeLabelElement);
	}
	else {
		document.getElementById('log_service_area').classList.add('hidden');
	}

	for (const sensorDataName in connectionConfig.services.dataService.characteristics) {
		const tableRowElement = document.createElement('tr');
		const sensorDataNameElement = document.createElement('td');
		sensorDataNameElement.innerText = sensorDataName;
		tableRowElement.append(sensorDataNameElement);
		if (hasDataService) {
			const dataServiceGetDataButtonCellElement = document.createElement('td');
			const dataServiceGetDataButtonElement = document.createElement('button');
			dataServiceGetDataButtonElement.innerText = '取得';
			dataServiceGetDataButtonElement.classList.add('connection_only_control')
			dataServiceGetDataButtonElement.disabled = true
			dataServiceGetDataButtonElement.addEventListener('click', async () => {
				setControlsEnabled(false);
				let sensorData;
				try {
					sensorData = await api.getSensorData(sensorDataName);
				}
				catch (error) {
					//TODO: エラーを見やすく表示
					setControlsEnabled(true);
					throw error;
				}
				pushSensorData(sensorDataName, sensorData, connectionConfig.services.dataService.characteristics[sensorDataName].unit);
				setControlsEnabled(true);
			});
			dataServiceGetDataButtonCellElement.append(dataServiceGetDataButtonElement);
			tableRowElement.append(dataServiceGetDataButtonCellElement);
			const dataServiceSubscribeButtonCellElement = document.createElement('td');
			const dataServiceSubscribeButtonElement = document.createElement('input');
			dataServiceSubscribeButtonElement.type = 'checkbox';
			dataServiceSubscribeButtonElement.classList.add('connection_only_control', 'notification_checkbox')
			dataServiceSubscribeButtonElement.disabled = true
			dataServiceSubscribeButtonElement.addEventListener('change', async () => {
				setControlsEnabled(false);

				if (dataServiceSubscribeButtonElement.checked) {
					try {
						dataServiceNotificationEventHandlers[sensorDataName] = await api.subscribeSensorData(sensorDataName, (event, value) => pushSensorData(sensorDataName, value, connectionConfig.services.dataService.characteristics[sensorDataName].unit));
					}
					catch (error) {
						//TODO: エラーを見やすく表示
						setControlsEnabled(true);
						throw error;
					}
				}
				else {
					try {
						await api.unsubscribeSensorData(sensorDataName, dataServiceNotificationEventHandlers[sensorDataName]);
					}
					catch (error) {
						//TODO: エラーを見やすく表示
						setControlsEnabled(true);
						throw error;
					}
				}
				setControlsEnabled(true);
			});
			dataServiceSubscribeButtonCellElement.append(dataServiceSubscribeButtonElement);
			tableRowElement.append(dataServiceSubscribeButtonCellElement);
		}
		if (hasLogService) {
			const logServiceGetDataButtonCellElement = document.createElement('td');
			const logServiceGetDataButtonElement = document.createElement('button');
			logServiceGetDataButtonElement.innerText = '取得';
			logServiceGetDataButtonElement.classList.add('connection_only_control')
			logServiceGetDataButtonElement.disabled = true
			logServiceGetDataButtonElement.addEventListener('click', async () => {
				setControlsEnabled(false);
				let sensorLog;
				try {
					sensorLog = await api.readSensorLog(sensorDataName);
				}
				catch (error) {
					//TODO: エラーを見やすく表示
					setControlsEnabled(true);
					throw error;
				}
				pushSensorLog(sensorDataName, sensorLog, connectionConfig.services.logService.characteristics[sensorDataName].unit);
				setControlsEnabled(true);
			});
			logServiceGetDataButtonCellElement.append(logServiceGetDataButtonElement);
			tableRowElement.append(logServiceGetDataButtonCellElement);
			const logServiceSubscribeButtonCellElement = document.createElement('td');
			const logServiceSubscribeButtonElement = document.createElement('input');
			logServiceSubscribeButtonElement.type = 'checkbox';
			logServiceSubscribeButtonElement.classList.add('connection_only_control', 'notification_checkbox')
			logServiceSubscribeButtonElement.disabled = true
			logServiceSubscribeButtonElement.addEventListener('change', async () => {
				setControlsEnabled(false);

				if (logServiceSubscribeButtonElement.checked) {
					try {
						logServiceNotificationEventHandlers[sensorDataName] = await api.subscribeSensorLog(sensorDataName, (event, value) => pushSensorLog(sensorDataName, value, connectionConfig.services.logService.characteristics[sensorDataName].unit));
					}
					catch (error) {
						//TODO: エラーを見やすく表示
						setControlsEnabled(true);
						throw error;
					}
				}
				else {
					try {
						await api.unsubscribeSensorLog(sensorDataName, logServiceNotificationEventHandlers[sensorDataName]);
					}
					catch (error) {
						//TODO: エラーを見やすく表示
						setControlsEnabled(true);
						throw error;
					}
				}
				setControlsEnabled(true);
			});
			logServiceSubscribeButtonCellElement.append(logServiceSubscribeButtonElement);
			tableRowElement.append(logServiceSubscribeButtonCellElement);
		}

		document.getElementById('table_sensor_data_control').append(tableRowElement);
	}

	if (isWebBluetoothSupported) {
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
		disconnectButton.addEventListener('click', async () => api.disconnect());

		// System Service
		if (connectionConfig.services.systemService != undefined) {
			document.getElementById('button_system_service_set_operation_mode').addEventListener('click', async () => {
				let selectedValue;
				document.getElementsByName('input_radio_system_service_operation_mode').forEach((element) => {
					if (element.checked) selectedValue = element.value;
				});
				let response;
				try {
					response = await api.setOperationMode(Number(selectedValue));
				}
				catch (error) {
					//TODO: エラーを見やすく表示
					setControlsEnabled(true);
					throw error;
				}
				if (response > 0) {
					//TODO: エラーを見やすく表示
					setControlsEnabled(true);
					throw new Error(`Operation failed. Response code: ${getStatusCodeText(response)}`);
				}
				document.getElementById('value_system_service_operation_mode').innerText = selectedValue == 0 ? 'User Mode' : 'Configuration Mode';
				document.getElementById('value_system_service_response').innerText = getStatusCodeText(response);
				setControlsEnabled(true);
			});
			document.getElementById('button_system_service_get_operation_mode').addEventListener('click', async () => getOperationMode());
			document.getElementById('button_system_service_get_response').addEventListener('click', async () => getSystemServiceResponse());
		}
		else {
			document.getElementById('system_service_area').classList.add('hidden');
		}

		// イベント登録
		api.addEventListener('trigger-data-received', () => {
			document.getElementById('message_last_trigger_timestamp').innerText = new Date(api.getLastTriggerTimestamp()).toLocaleString();
			for (let i = 0; i < api.getNumberOfTriggerData(); i++) {
				document.getElementById('row_trigger_data_flags').children[i].innerText = api.isTriggered(i) ? '✅' : '❌';
			}
		});
		api.addEventListener('connection-established', async () => {
			if (connectionConfig.services.systemService != undefined) {
				await getOperationMode();
			}
			startObserveButton.disabled = true;
			connectButton.disabled = true;
			disconnectButton.disabled = false;
		});
		api.addEventListener('connection-closed', () => {
			startObserveButton.disabled = false;
			connectButton.disabled = false;
			disconnectButton.disabled = true;
			setControlsEnabled(false);
			document.querySelectorAll('.notification_checkbox').forEach((element) => element.checked = false);
			document.querySelectorAll('.configuration_value').forEach((element) => element.innerText = '未取得');
			document.getElementById('input_radio_system_service_operation_mode_user_mode').checked = true;
		});
	}
}

init();
