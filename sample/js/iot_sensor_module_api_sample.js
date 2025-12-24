import { IoTSensorModuleAPI } from '../../dist/iot_sensor_module_api.mjs';

/**
 * IoTセンサモジュールAPIインスタンス
 * @type {IoTSensorModuleAPI}
 */
let api;

/**
 * 接続先のIoTセンサモジュールがコンフィグレーションモードかどうか
 */
let isConfigurationMode = false;

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
function setConnectionControlsEnabled(isEnabled) {
	if (isEnabled) document.querySelectorAll('.connection_only_control').forEach((element) => {
		if (!element.classList.contains('control_disabled')) element.disabled = false;
	});
	else document.querySelectorAll('.connection_only_control').forEach((element) => element.disabled = true);
}

/**
 * IoTセンサモジュールの設定変更入力を一括で有効/無効にする。
 * @param {boolean} isEnabled 有効にする場合はtrue、無効にする場合はfalse
 */
function setConfigurationControlEnabled(isEnabled) {
	if (isEnabled) document.querySelectorAll('.configuration_only_control').forEach((element) => {
		if (!element.classList.contains('control_disabled')) element.disabled = false;
	});
	else document.querySelectorAll('.configuration_only_control').forEach((element) => element.disabled = true);
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
	setConnectionControlsEnabled(false);
	setConfigurationControlEnabled(false);

	let mode;
	try {
		mode = await api.getOperationMode();
	}
	catch (error) {
		// TODO: エラーを見やすく表示
		setConnectionControlsEnabled(true);
		if (isConfigurationMode) setConfigurationControlEnabled(true);
		throw error;
	}

	document.getElementById('value_system_service_operation_mode').innerText = mode == 0 ? 'User Mode' : 'Configuration Mode';
	setConnectionControlsEnabled(true);
	if (isConfigurationMode) setConfigurationControlEnabled(true);
}

/**
 * System Serviceからの応答コードを取得して表示する。
 */
async function getSystemServiceResponse() {
	setConnectionControlsEnabled(false);
	setConfigurationControlEnabled(false);

	let response;
	try {
		response = await api.getSystemServiceResponse();
	}
	catch (error) {
		// TODO: エラーを見やすく表示
		setConnectionControlsEnabled(true);
		if (isConfigurationMode) setConfigurationControlEnabled(true);
		throw error;
	}

	document.getElementById('value_system_service_response').innerText = getStatusCodeText(response);
	setConnectionControlsEnabled(true);
	if (isConfigurationMode) setConfigurationControlEnabled(true);
}

/**
 * センサーインターバルの設定入力が正しいかチェックする。
 */
function checkSensorIntervalInput() {
	const value = document.getElementById('input_sensor_service_sensor_interval').value;
	if (value < 1 || value > 65535) {
		const messageElement = document.getElementById('message_sensor_service_sensor_interval');
		messageElement.innerText = '入力値は1〜65535の範囲を超えてはいけません';
		messageElement.classList.remove('hidden');
		const buttonElement = document.getElementById('button_sensor_service_set_sensor_interval');
		buttonElement.classList.add('control_disabled');
		buttonElement.disabled = true;
	}
	else if(value % 1 > 0) {
		const messageElement = document.getElementById('message_sensor_service_sensor_interval');
		messageElement.innerText = '入力値は整数でなければなりません';
		messageElement.classList.remove('hidden');
		const buttonElement = document.getElementById('button_sensor_service_set_sensor_interval');
		buttonElement.classList.add('control_disabled');
		buttonElement.disabled = true;
	}
	else {
		const messageElement = document.getElementById('message_sensor_service_sensor_interval');
		messageElement.innerText = '';
		messageElement.classList.add('hidden');
		const buttonElement = document.getElementById('button_sensor_service_set_sensor_interval');
		buttonElement.classList.remove('control_disabled');
		buttonElement.disabled = false;
	}
}

/**
 * センサーインターバルの現在値を取得して表示する。
 */
async function getSensorInterval() {
	setConnectionControlsEnabled(false);
	setConfigurationControlEnabled(false);

	let interval;
	try {
		interval = await api.getSensorInterval();
	}
	catch (error) {
		// TODO: エラーを見やすく表示
		setConnectionControlsEnabled(true);
		if (isConfigurationMode) setConfigurationControlEnabled(true);
		throw error;
	}

	document.getElementById('value_sensor_service_sensor_interval').innerText = interval;
	setConnectionControlsEnabled(true);
	if (isConfigurationMode) setConfigurationControlEnabled(true);
}

/**
 * Sensor Serviceからの応答コードを取得して表示する。
 */
async function getSensorServiceResponse() {
	setConnectionControlsEnabled(false);
	setConfigurationControlEnabled(false);
	let response;
	try {
		response = await api.getSensorServiceResponse();
	}
	catch (error) {
		// TODO: エラーを見やすく表示
		setConnectionControlsEnabled(true);
		if (isConfigurationMode) setConfigurationControlEnabled(true);
		throw error;
	}

	document.getElementById('value_sensor_service_response').innerText = getStatusCodeText(response);
	setConnectionControlsEnabled(true);
	if (isConfigurationMode) setConfigurationControlEnabled(true);
}

/**
 * アドバタイズインターバルの設定入力が正しいかチェックする。
 */
function checkAdvertiseIntervalInputs() {
	const minValue = Number(document.getElementById('input_ble_service_adv_interval_min').value);
	const maxValue = Number(document.getElementById('input_ble_service_adv_interval_max').value);
	if (minValue < 20 || minValue > 10240 || maxValue < 20 || maxValue > 10240) {
		const messageElement = document.getElementById('message_ble_service_adv_interval');
		messageElement.innerText = '入力値は20〜10240の範囲を超えてはいけません';
		messageElement.classList.remove('hidden');
		const buttonElement = document.getElementById('button_ble_service_set_adv_interval');
		buttonElement.classList.add('control_disabled');
		buttonElement.disabled = true;
	}
	else if (minValue % 0.0625 != 0 || maxValue % 0.0625 != 0) {
		const messageElement = document.getElementById('message_ble_service_adv_interval');
		messageElement.innerText = '入力値は0.0625の倍数でなければなりません';
		messageElement.classList.remove('hidden');
		const buttonElement = document.getElementById('button_ble_service_set_adv_interval');
		buttonElement.classList.add('control_disabled');
		buttonElement.disabled = true;
	}
	else if (minValue > maxValue) {
		const messageElement = document.getElementById('message_ble_service_adv_interval');
		messageElement.innerText = '最小値が最大値を超えてはいけません';
		messageElement.classList.remove('hidden');
		const buttonElement = document.getElementById('button_ble_service_set_adv_interval');
		buttonElement.classList.add('control_disabled');
		buttonElement.disabled = true;
	}
	else {
		const messageElement = document.getElementById('message_ble_service_adv_interval');
		messageElement.innerText = '';
		messageElement.classList.add('hidden');
		const buttonElement = document.getElementById('button_ble_service_set_adv_interval');
		buttonElement.classList.remove('control_disabled');
		buttonElement.disabled = false;
	}
}

/**
 * アドバタイズインターバルの現在値を取得して表示する。
 */
async function getAdvertiseInterval() {
	setConnectionControlsEnabled(false);
	setConfigurationControlEnabled(false);

	let interval;
	try {
		interval = await api.getAdvertiseInterval();
	}
	catch (error) {
		// TODO: エラーを見やすく表示
		setConnectionControlsEnabled(true);
		if (isConfigurationMode) setConfigurationControlEnabled(true);
		throw error;
	}

	document.getElementById('value_ble_service_adv_interval_min').innerText = interval.min;
	document.getElementById('value_ble_service_adv_interval_max').innerText = interval.max;
	setConnectionControlsEnabled(true);
	if (isConfigurationMode) setConfigurationControlEnabled(true);
}

/**
 * チャンネルマスクの設定入力が正しいかどうかをチェックする。
 */
function checkAdvertiseChannelMaskInputs() {
	const ch37 = document.getElementById('input_ble_service_adv_channel_37').checked;
	const ch38 = document.getElementById('input_ble_service_adv_channel_38').checked;
	const ch39 = document.getElementById('input_ble_service_adv_channel_39').checked;
	if (!ch37 && !ch38 && !ch39) {
		const messageElement = document.getElementById('message_ble_service_adv_channel_mask');
		messageElement.innerText = '全てのチャンネルを無効にすることはできません';
		messageElement.classList.remove('hidden');
		const buttonElement = document.getElementById('button_ble_service_set_adv_channel_mask');
		buttonElement.classList.add('control_disabled');
		buttonElement.disabled = true;
	}
	else {
		const messageElement = document.getElementById('message_ble_service_adv_channel_mask');
		messageElement.innerText = '';
		messageElement.classList.add('hidden');
		const buttonElement = document.getElementById('button_ble_service_set_adv_channel_mask');
		buttonElement.classList.remove('control_disabled');
		buttonElement.disabled = false;
	}
}

/**
 * アドバタイズチャンネルマスクの現在値を取得して表示する。
 */
async function getAdvertiseChannelMask() {
	setConnectionControlsEnabled(false);
	setConfigurationControlEnabled(false);

	let mask;
	try {
		mask = await api.getAdvertiseChannelMask();
	}
	catch (error) {
		// TODO: エラーを見やすく表示
		setConnectionControlsEnabled(true);
		if (isConfigurationMode) setConfigurationControlEnabled(true);
		throw error;
	}

	document.getElementById('value_ble_service_adv_channel_37').checked = (mask & 0x01) != 0;
	document.getElementById('value_ble_service_adv_channel_38').checked = (mask & 0x02) != 0;
	document.getElementById('value_ble_service_adv_channel_39').checked = (mask & 0x04) != 0;
	setConnectionControlsEnabled(true);
	if (isConfigurationMode) setConfigurationControlEnabled(true);
}

/**
 * アドバタイズの送信電力の設定入力が正しいかどうかをチェックする。
 */
function checkAdvertiseTxPowerInput() {
	const value = document.getElementById('input_ble_service_tx_power').value;
	if (value < -100 || value > 20) {
		const messageElement = document.getElementById('message_ble_service_tx_power');
		messageElement.innerText = '入力値は-100〜20の範囲を超えてはいけません';
		messageElement.classList.remove('hidden');
		const buttonElement = document.getElementById('button_ble_service_set_tx_power');
		buttonElement.classList.add('control_disabled');
		buttonElement.disabled = true;
	}
	else if (value % 1 > 0) {
		const messageElement = document.getElementById('message_ble_service_tx_power');
		messageElement.innerText = '入力値は整数でなければなりません';
		messageElement.classList.remove('hidden');
		const buttonElement = document.getElementById('button_ble_service_set_tx_power');
		buttonElement.classList.add('control_disabled');
		buttonElement.disabled = true;
	}
	else {
		const messageElement = document.getElementById('message_ble_service_tx_power');
		messageElement.innerText = '';
		messageElement.classList.add('hidden');
		const buttonElement = document.getElementById('button_ble_service_set_tx_power');
		buttonElement.classList.remove('control_disabled');
		buttonElement.disabled = false;
	}
}

/**
 * アドバタイズ送信電力の現在値を取得して表示する。
 */
async function getAdvertiseTxPower() {
	setConnectionControlsEnabled(false);
	setConfigurationControlEnabled(false);

	let txPower;
	try {
		txPower = await api.getAdvertiseTxPower();
	}
	catch (error) {
		// TODO: エラーを見やすく表示
		setConnectionControlsEnabled(true);
		if (isConfigurationMode) setConfigurationControlEnabled(true);
		throw error;
	}

	document.getElementById('value_ble_service_tx_power').innerText = txPower;
	setConnectionControlsEnabled(true);
	if (isConfigurationMode) setConfigurationControlEnabled(true);
}

/**
 * BLE Serviceからの応答コードを取得して表示する。
 */
async function getBLEServiceResponse() {
	setConnectionControlsEnabled(false);
	setConfigurationControlEnabled(false);

	let response;
	try {
		response = await api.getBLEServiceResponse();
	}
	catch (error) {
		// TODO: エラーを見やすく表示
		setConnectionControlsEnabled(true);
		if (isConfigurationMode) setConfigurationControlEnabled(true);
		throw error;
	}

	document.getElementById('value_ble_service_response').innerText = getStatusCodeText(response);
	setConnectionControlsEnabled(true);
	if (isConfigurationMode) setConfigurationControlEnabled(true);
}

/**
 * ターゲットの条件式の設定値入力が正しいかどうかをチェックする。
 */
function checkTargetExpressionInput() {
	const value = document.getElementById('input_expression_service_target_expression').value;
	if (value < 0 || value > 255) {
		const messageElement = document.getElementById('message_expression_service_target_expression');
		messageElement.innerText = '入力値は0〜255の範囲を超えてはいけません';
		messageElement.classList.remove('hidden');
		const buttonElement = document.getElementById('button_expression_service_set_target_expression');
		buttonElement.classList.add('control_disabled');
		buttonElement.disabled = true;
	}
	else if (value % 1 > 0) {
		const messageElement = document.getElementById('message_expression_service_target_expression');
		messageElement.innerText = '入力値は整数でなければなりません';
		messageElement.classList.remove('hidden');
		const buttonElement = document.getElementById('button_expression_service_set_target_expression');
		buttonElement.classList.add('control_disabled');
		buttonElement.disabled = true;
	}
	else {
		const messageElement = document.getElementById('message_expression_service_target_expression');
		messageElement.innerText = '';
		messageElement.classList.add('hidden');
		const buttonElement = document.getElementById('button_expression_service_set_target_expression');
		buttonElement.classList.remove('control_disabled');
		buttonElement.disabled = false;
	}
}

/**
 * 現在編集中の条件式のIDを取得して表示する。
 */
async function getTargetExpression() {
	setConnectionControlsEnabled(false);
	setConfigurationControlEnabled(false);

	let expressionId;
	try {
		expressionId = await api.getCurrentExpression();
	}
	catch (error) {
		// TODO: エラーを見やすく表示
		setConnectionControlsEnabled(true);
		if (isConfigurationMode) setConfigurationControlEnabled(true);
		throw error;
	}

	document.getElementById('value_expression_service_target_expression').innerText = expressionId;
	setConnectionControlsEnabled(true);
	if (isConfigurationMode) setConfigurationControlEnabled(true);
}

/**
 * アクティブスロット登録の入力が正しいかどうかをチェックする。
 */
function checkExpressionActiveSlotInput() {
	const maxTriggers = api.getNumberOfTriggerData();
	const value = document.getElementById('input_expression_service_active_slot').value;
	if (value < 0 || value > maxTriggers - 1) {
		const messageElement = document.getElementById('message_expression_service_active_slot');
		messageElement.innerText = `入力値は0〜${maxTriggers - 1}の範囲を超えてはいけません`;
		messageElement.classList.remove('hidden');
		const buttonElement = document.getElementById('button_expression_service_set_active_slot');
		buttonElement.classList.add('control_disabled');
		buttonElement.disabled = true;
	}
	else if (value % 1 > 0) {
		const messageElement = document.getElementById('message_expression_service_active_slot');
		messageElement.innerText = '入力値は整数でなければなりません';
		messageElement.classList.remove('hidden');
		const buttonElement = document.getElementById('button_expression_service_set_active_slot');
		buttonElement.classList.add('control_disabled');
		buttonElement.disabled = true;
	}
	else {
		const messageElement = document.getElementById('message_expression_service_active_slot');
		messageElement.innerText = '';
		messageElement.classList.add('hidden');
		const buttonElement = document.getElementById('button_expression_service_set_active_slot');
		buttonElement.classList.remove('control_disabled');
		buttonElement.disabled = false;
	}
}

/**
 * 現在アクティブなスロット番号を取得して表示する。
 */
async function getExpressionActiveSlot() {
	setConnectionControlsEnabled(false);
	setConfigurationControlEnabled(false);

	let slot;
	try {
		slot = await api.getExpressionActiveSlot();
	}
	catch (error) {
		// TODO: エラーを見やすく表示
		setConnectionControlsEnabled(true);
		if (isConfigurationMode) setConfigurationControlEnabled(true);
		throw error;
	}

	document.getElementById('value_expression_service_active_slot').innerText = slot == 255 ? '未登録' : slot;
	setConnectionControlsEnabled(true);
	if (isConfigurationMode) setConfigurationControlEnabled(true);
}

/**
 * 条件式入力が正しいかどうかをチェックする。
 */
function checkExpressionInput() {
	const expressionString = document.getElementById('input_expression_service_expression').value;
	try {
		api.expressionStringToToken(expressionString);
	}
	catch (error) {
		const messageElement = document.getElementById('message_expression_service_expression');
		messageElement.innerText = '不明なトークンです';
		messageElement.classList.remove('hidden');
		const buttonElement = document.getElementById('button_expression_service_set_expression');
		buttonElement.classList.add('control_disabled');
		buttonElement.disabled = true;
		return;
	}

	const messageElement = document.getElementById('message_expression_service_expression');
	messageElement.innerText = '';
	messageElement.classList.add('hidden');
	const buttonElement = document.getElementById('button_expression_service_set_expression');
	buttonElement.classList.remove('control_disabled');
	buttonElement.disabled = false;
}

/**
 * 現在の条件式の本体を取得して表示する。
 */
async function getExpression() {
	setConnectionControlsEnabled(false);
	setConfigurationControlEnabled(false);

	let expressionString;
	try {
		expressionString = api.tokenToExpressionString(await api.getExpression());
	}
	catch (error) {
		// TODO: エラーを見やすく表示
		setConnectionControlsEnabled(true);
		if (isConfigurationMode) setConfigurationControlEnabled(true);
		throw error;
	}

	document.getElementById('value_expression_service_expression').value = expressionString;
	setConnectionControlsEnabled(true);
	if (isConfigurationMode) setConfigurationControlEnabled(true);
}

/**
 * 条件式コピー先の入力が正しいかどうかをチェックする。
 */
function checkCopyExpressionInput() {
	const maxTriggers = api.getNumberOfTriggerData();
	const value = document.getElementById('input_expression_service_copy').value;
	if (value < 0 || value > maxTriggers - 1) {
		const messageElement = document.getElementById('message_expression_service_copy');
		messageElement.innerText = `入力値は0〜${maxTriggers - 1}の範囲を超えてはいけません`;
		messageElement.classList.remove('hidden');
		const buttonElement = document.getElementById('button_expression_service_copy');
		buttonElement.classList.add('control_disabled');
		buttonElement.disabled = true;
	}
	else if (value % 1 > 0) {
		const messageElement = document.getElementById('message_expression_service_copy');
		messageElement.innerText = '入力値は整数でなければなりません';
		messageElement.classList.remove('hidden');
		const buttonElement = document.getElementById('button_expression_service_copy');
		buttonElement.classList.add('control_disabled');
		buttonElement.disabled = true;
	}
	else if(value == Number(document.getElementById('value_expression_service_target_expression').innerText)) {
		const messageElement = document.getElementById('message_expression_service_copy');
		messageElement.innerText = 'コピー元とコピー先を同じにすることはできません';
		messageElement.classList.remove('hidden');
		const buttonElement = document.getElementById('button_expression_service_copy');
		buttonElement.classList.add('control_disabled');
		buttonElement.disabled = true;
	}
	else {
		const messageElement = document.getElementById('message_expression_service_copy');
		messageElement.innerText = '';
		messageElement.classList.add('hidden');
		const buttonElement = document.getElementById('button_expression_service_copy');
		buttonElement.classList.remove('control_disabled');
		buttonElement.disabled = false;
	}
}

/**
 * 条件式移動先の入力が正しいかどうかをチェックする。
 */
function checkMoveExpressionInput() {
	const maxTriggers = api.getNumberOfTriggerData();
	const value = document.getElementById('input_expression_service_move').value;
	if (value < 0 || value > maxTriggers - 1) {
		const messageElement = document.getElementById('message_expression_service_move');
		messageElement.innerText = `入力値は0〜${maxTriggers - 1}の範囲を超えてはいけません`;
		messageElement.classList.remove('hidden');
		const buttonElement = document.getElementById('button_expression_service_move');
		buttonElement.classList.add('control_disabled');
		buttonElement.disabled = true;
	}
	else if (value % 1 > 0) {
		const messageElement = document.getElementById('message_expression_service_move');
		messageElement.innerText = '入力値は整数でなければなりません';
		messageElement.classList.remove('hidden');
		const buttonElement = document.getElementById('button_expression_service_move');
		buttonElement.classList.add('control_disabled');
		buttonElement.disabled = true;
	}
	else if(value == Number(document.getElementById('value_expression_service_target_expression').innerText)) {
		const messageElement = document.getElementById('message_expression_service_move');
		messageElement.innerText = 'コピー元とコピー先を同じにすることはできません';
		messageElement.classList.remove('hidden');
		const buttonElement = document.getElementById('button_expression_service_move');
		buttonElement.classList.add('control_disabled');
		buttonElement.disabled = true;
	}
	else {
		const messageElement = document.getElementById('message_expression_service_move');
		messageElement.innerText = '';
		messageElement.classList.add('hidden');
		const buttonElement = document.getElementById('button_expression_service_move');
		buttonElement.classList.remove('control_disabled');
		buttonElement.disabled = false;
	}
}

/**
 * Expression Serviceからの応答コードを取得して表示する。
 */
async function getExpressionServiceResponse() {
	setConnectionControlsEnabled(false);
	setConfigurationControlEnabled(false);

	let response;
	try {
		response = await api.getExpressionServiceResponse();
	}
	catch (error) {
		// TODO: エラーを見やすく表示
		setConnectionControlsEnabled(true);
		if (isConfigurationMode) setConfigurationControlEnabled(true);
		throw error;
	}

	document.getElementById('value_expression_service_response').innerText = getStatusCodeText(response);
	setConnectionControlsEnabled(true);
	if (isConfigurationMode) setConfigurationControlEnabled(true);
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
				setConnectionControlsEnabled(false);
				setConfigurationControlEnabled(false);
				let sensorData;
				try {
					sensorData = await api.getSensorData(sensorDataName);
				}
				catch (error) {
					// TODO: エラーを見やすく表示
					setConnectionControlsEnabled(true);
					if (isConfigurationMode) setConfigurationControlEnabled(true);
					throw error;
				}
				pushSensorData(sensorDataName, sensorData, connectionConfig.services.dataService.characteristics[sensorDataName].unit);
				setConnectionControlsEnabled(true);
				if (isConfigurationMode) setConfigurationControlEnabled(true);
			});
			dataServiceGetDataButtonCellElement.append(dataServiceGetDataButtonElement);
			tableRowElement.append(dataServiceGetDataButtonCellElement);
			const dataServiceSubscribeButtonCellElement = document.createElement('td');
			const dataServiceSubscribeButtonElement = document.createElement('input');
			dataServiceSubscribeButtonElement.type = 'checkbox';
			dataServiceSubscribeButtonElement.classList.add('connection_only_control', 'notification_checkbox')
			dataServiceSubscribeButtonElement.disabled = true
			dataServiceSubscribeButtonElement.addEventListener('change', async () => {
				setConnectionControlsEnabled(false);
				setConfigurationControlEnabled(false);

				if (dataServiceSubscribeButtonElement.checked) {
					try {
						dataServiceNotificationEventHandlers[sensorDataName] = await api.subscribeSensorData(sensorDataName, (event, value) => pushSensorData(sensorDataName, value, connectionConfig.services.dataService.characteristics[sensorDataName].unit));
					}
					catch (error) {
						// TODO: エラーを見やすく表示
						setConnectionControlsEnabled(true);
						if (isConfigurationMode) setConfigurationControlEnabled(true);
						throw error;
					}
				}
				else {
					try {
						await api.unsubscribeSensorData(sensorDataName, dataServiceNotificationEventHandlers[sensorDataName]);
					}
					catch (error) {
						// TODO: エラーを見やすく表示
						setConnectionControlsEnabled(true);
						if (isConfigurationMode) setConfigurationControlEnabled(true);
						throw error;
					}
				}
				setConnectionControlsEnabled(true);
				if (isConfigurationMode) setConfigurationControlEnabled(true);
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
				setConnectionControlsEnabled(false);
				setConfigurationControlEnabled(false);
				let sensorLog;
				try {
					sensorLog = await api.readSensorLog(sensorDataName);
				}
				catch (error) {
					// TODO: エラーを見やすく表示
					setConnectionControlsEnabled(true);
					if (isConfigurationMode) setConfigurationControlEnabled(true);
					throw error;
				}
				pushSensorLog(sensorDataName, sensorLog, connectionConfig.services.logService.characteristics[sensorDataName].unit);
				setConnectionControlsEnabled(true);
				if (isConfigurationMode) setConfigurationControlEnabled(true);
			});
			logServiceGetDataButtonCellElement.append(logServiceGetDataButtonElement);
			tableRowElement.append(logServiceGetDataButtonCellElement);
			const logServiceSubscribeButtonCellElement = document.createElement('td');
			const logServiceSubscribeButtonElement = document.createElement('input');
			logServiceSubscribeButtonElement.type = 'checkbox';
			logServiceSubscribeButtonElement.classList.add('connection_only_control', 'notification_checkbox')
			logServiceSubscribeButtonElement.disabled = true
			logServiceSubscribeButtonElement.addEventListener('change', async () => {
				setConnectionControlsEnabled(false);
				setConfigurationControlEnabled(false);

				if (logServiceSubscribeButtonElement.checked) {
					try {
						logServiceNotificationEventHandlers[sensorDataName] = await api.subscribeSensorLog(sensorDataName, (event, value) => pushSensorLog(sensorDataName, value, connectionConfig.services.logService.characteristics[sensorDataName].unit));
					}
					catch (error) {
						// TODO: エラーを見やすく表示
						setConnectionControlsEnabled(true);
						if (isConfigurationMode) setConfigurationControlEnabled(true);
						throw error;
					}
				}
				else {
					try {
						await api.unsubscribeSensorLog(sensorDataName, logServiceNotificationEventHandlers[sensorDataName]);
					}
					catch (error) {
						// TODO: エラーを見やすく表示
						setConnectionControlsEnabled(true);
						if (isConfigurationMode) setConfigurationControlEnabled(true);
						throw error;
					}
				}
				setConnectionControlsEnabled(true);
				if (isConfigurationMode) setConfigurationControlEnabled(true);
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
				setConnectionControlsEnabled(false);
				setConfigurationControlEnabled(false);

				let selectedValue;
				document.getElementsByName('input_radio_system_service_operation_mode').forEach((element) => {
					if (element.checked) selectedValue = element.value;
				});
				let response;
				try {
					response = await api.setOperationMode(Number(selectedValue));
				}
				catch (error) {
					// TODO: エラーを見やすく表示
					setConnectionControlsEnabled(true);
					if (isConfigurationMode) setConfigurationControlEnabled(true);
					throw error;
				}
				if (response > 0) {
					// TODO: エラーを見やすく表示
					document.getElementById('value_system_service_response').innerText = getStatusCodeText(response);
					setConnectionControlsEnabled(true);
					if (isConfigurationMode) setConfigurationControlEnabled(true);
					throw new Error(`Operation failed. Response code: ${getStatusCodeText(response)}`);
				}
				document.getElementById('value_system_service_operation_mode').innerText = selectedValue == 0 ? 'User Mode' : 'Configuration Mode';
				document.getElementById('value_system_service_response').innerText = getStatusCodeText(response);
				isConfigurationMode = selectedValue == 1;
				if (isConfigurationMode) {
					checkSensorIntervalInput();
					checkAdvertiseIntervalInputs();
					checkAdvertiseChannelMaskInputs();
					checkAdvertiseTxPowerInput();
					checkTargetExpressionInput();
					checkExpressionActiveSlotInput();
					checkExpressionInput();
					checkCopyExpressionInput();
					checkMoveExpressionInput();
				}
				setConnectionControlsEnabled(true);
				if (isConfigurationMode) setConfigurationControlEnabled(true);
			});
			document.getElementById('button_system_service_get_operation_mode').addEventListener('click', async () => getOperationMode());
			document.getElementById('button_system_service_get_response').addEventListener('click', async () => getSystemServiceResponse());
		}
		else {
			document.getElementById('system_service_area').classList.add('hidden');
		}

		// Sensor Service
		if (connectionConfig.services.sensorService != undefined) {
			document.getElementById('input_sensor_service_sensor_interval').addEventListener('input', checkSensorIntervalInput);
			document.getElementById('button_sensor_service_set_sensor_interval').addEventListener('click', async () => {
				setConnectionControlsEnabled(false);
				setConfigurationControlEnabled(false);

				let response;
				const intervalValue = Number(document.getElementById('input_sensor_service_sensor_interval').value);
				try {
					response = await api.setSensorInterval(intervalValue);
				}
				catch (error) {
					// TODO: エラーを見やすく表示
					setConnectionControlsEnabled(true);
					if (isConfigurationMode) setConfigurationControlEnabled(true);
					throw error;
				}
				if (response > 0) {
					// TODO: エラーを見やすく表示
					document.getElementById('value_sensor_service_response').innerText = getStatusCodeText(response);
					setConnectionControlsEnabled(true);
					if (isConfigurationMode) setConfigurationControlEnabled(true);
					throw new Error(`Operation failed. Response code: ${getStatusCodeText(response)}`);
				}
				document.getElementById('value_sensor_service_sensor_interval').innerText = intervalValue;
				document.getElementById('value_sensor_service_response').innerText = getStatusCodeText(response);
				setConnectionControlsEnabled(true);
				if (isConfigurationMode) setConfigurationControlEnabled(true);
			});
			document.getElementById('button_sensor_service_get_sensor_interval').addEventListener('click', async () => getSensorInterval());
			document.getElementById('button_sensor_service_get_response').addEventListener('click', async () => getSensorServiceResponse());
		}
		else {
			document.getElementById('sensor_service_area').classList.add('hidden');
		}

		// BLE Service
		if (connectionConfig.services.bleService != undefined) {
			// Adv. Interval
			document.querySelectorAll('.ble_service_adv_interval_input').forEach((element) => element.addEventListener('input', checkAdvertiseIntervalInputs));
			document.getElementById('button_ble_service_set_adv_interval').addEventListener('click', async () => {
				setConnectionControlsEnabled(false);
				setConfigurationControlEnabled(false);

				let response;
				const minValue = Number(document.getElementById('input_ble_service_adv_interval_min').value);
				const maxValue = Number(document.getElementById('input_ble_service_adv_interval_max').value);
				try {
					response = await api.setAdvertiseInterval(minValue, maxValue);
				}
				catch (error) {
					// TODO: エラーを見やすく表示
					setConnectionControlsEnabled(true);
					if (isConfigurationMode) setConfigurationControlEnabled(true);
					throw error;
				}
				if (response > 0) {
					// TODO: エラーを見やすく表示
					document.getElementById('value_ble_service_response').innerText = getStatusCodeText(response);
					setConnectionControlsEnabled(true);
					if (isConfigurationMode) setConfigurationControlEnabled(true);
					throw new Error(`Operation failed. Response code: ${getStatusCodeText(response)}`);
				}
				document.getElementById('value_ble_service_adv_interval_min').innerText = minValue;
				document.getElementById('value_ble_service_adv_interval_max').innerText = maxValue;
				document.getElementById('value_ble_service_response').innerText = getStatusCodeText(response);
				setConnectionControlsEnabled(true);
				if (isConfigurationMode) setConfigurationControlEnabled(true);
			});
			document.getElementById('button_ble_service_get_adv_interval').addEventListener('click', async () => getAdvertiseInterval());

			// Adv. Channel Mask
			document.querySelectorAll('.ble_service_adv_channel_checkbox').forEach((element) => element.addEventListener('input', checkAdvertiseChannelMaskInputs));
			document.getElementById('button_ble_service_set_adv_channel_mask').addEventListener('click', async () => {
				setConnectionControlsEnabled(false);
				setConfigurationControlEnabled(false);

				let response;
				let channelMask = 0;
				if (document.getElementById('input_ble_service_adv_channel_37').checked) channelMask |= 0x01;
				if (document.getElementById('input_ble_service_adv_channel_38').checked) channelMask |= 0x02;
				if (document.getElementById('input_ble_service_adv_channel_39').checked) channelMask |= 0x04;
				try {
					response = await api.setAdvertiseChannelMask(channelMask);
				}
				catch (error) {
					// TODO: エラーを見やすく表示
					setConnectionControlsEnabled(true);
					if (isConfigurationMode) setConfigurationControlEnabled(true);
					throw error;
				}
				if (response > 0) {
					// TODO: エラーを見やすく表示
					document.getElementById('value_ble_service_response').innerText = getStatusCodeText(response);
					setConnectionControlsEnabled(true);
					if (isConfigurationMode) setConfigurationControlEnabled(true);
					throw new Error(`Operation failed. Response code: ${getStatusCodeText(response)}`);
				}
				document.getElementById('value_ble_service_adv_channel_37').checked = (channelMask & 0x01) != 0;
				document.getElementById('value_ble_service_adv_channel_38').checked = (channelMask & 0x02) != 0;
				document.getElementById('value_ble_service_adv_channel_39').checked = (channelMask & 0x04) != 0;
				document.getElementById('value_ble_service_response').innerText = getStatusCodeText(response);
				setConnectionControlsEnabled(true);
				if (isConfigurationMode) setConfigurationControlEnabled(true);
			});
			document.getElementById('button_ble_service_get_adv_channel_mask').addEventListener('click', async () => getAdvertiseChannelMask());

			// Adv. Tx Power
			document.getElementById('input_ble_service_tx_power').addEventListener('input', checkAdvertiseTxPowerInput);
			document.getElementById('button_ble_service_set_tx_power').addEventListener('click', async () => {
				setConnectionControlsEnabled(false);
				setConfigurationControlEnabled(false);

				let response;
				const txPowerValue = Number(document.getElementById('input_ble_service_tx_power').value);
				try {
					response = await api.setAdvertiseTxPower(txPowerValue);
				}
				catch (error) {
					// TODO: エラーを見やすく表示
					setConnectionControlsEnabled(true);
					if (isConfigurationMode) setConfigurationControlEnabled(true);
					throw error;
				}
				if (response > 0) {
					// TODO: エラーを見やすく表示
					document.getElementById('value_ble_service_response').innerText = getStatusCodeText(response);
					setConnectionControlsEnabled(true);
					if (isConfigurationMode) setConfigurationControlEnabled(true);
					throw new Error(`Operation failed. Response code: ${getStatusCodeText(response)}`);
				}
				document.getElementById('value_ble_service_response').innerText = getStatusCodeText(response);
				await getAdvertiseTxPower();
				setConnectionControlsEnabled(true);
				if (isConfigurationMode) setConfigurationControlEnabled(true);
			});

			document.getElementById('button_ble_service_get_response').addEventListener('click', async () => getBLEServiceResponse());
		}
		else {
			document.getElementById('ble_service_area').classList.add('hidden');
		}

		// Expression Service
		if (connectionConfig.services.expressionService != undefined) {
			// Target Expression
			document.getElementById('input_expression_service_target_expression').addEventListener('input', checkTargetExpressionInput);
			document.getElementById('button_expression_service_set_target_expression').addEventListener('click', async () => {
				setConnectionControlsEnabled(false);
				setConfigurationControlEnabled(false);

				let response;
				const expressionIdValue = Number(document.getElementById('input_expression_service_target_expression').value);
				try {
					response = await api.setCurrentExpression(expressionIdValue);
				}
				catch (error) {
					// TODO: エラーを見やすく表示
					setConnectionControlsEnabled(true);
					if (isConfigurationMode) setConfigurationControlEnabled(true);
					throw error;
				}
				if (response > 0) {
					// TODO: エラーを見やすく表示
					document.getElementById('value_expression_service_response').innerText = getStatusCodeText(response);
					setConnectionControlsEnabled(true);
					if (isConfigurationMode) setConfigurationControlEnabled(true);
					throw new Error(`Operation failed. Response code: ${getStatusCodeText(response)}`);
				}

				document.getElementById('value_expression_service_target_expression').innerText = expressionIdValue;
				document.getElementById('value_expression_service_response').innerText = getStatusCodeText(response);
				await getExpressionActiveSlot();
				await getExpression();
				setConnectionControlsEnabled(true);
				if (isConfigurationMode) setConfigurationControlEnabled(true);
			});
			document.getElementById('button_expression_service_get_target_expression').addEventListener('click', async () => getTargetExpression());

			// Expression Active Slot
			document.getElementById('input_expression_service_active_slot').addEventListener('input', checkExpressionActiveSlotInput);
			document.getElementById('button_expression_service_set_active_slot').addEventListener('click', async () => {
				setConnectionControlsEnabled(false);
				setConfigurationControlEnabled(false);

				let response;
				const slotValue = Number(document.getElementById('input_expression_service_active_slot').value);
				try {
					response = await api.setExpressionActiveSlot(slotValue);
				}
				catch (error) {
					// TODO: エラーを見やすく表示
					setConnectionControlsEnabled(true);
					if (isConfigurationMode) setConfigurationControlEnabled(true);
					throw error;
				}
				if (response > 0) {
					// TODO: エラーを見やすく表示
					document.getElementById('value_expression_service_response').innerText = getStatusCodeText(response);
					setConnectionControlsEnabled(true);
					if (isConfigurationMode) setConfigurationControlEnabled(true);
					throw new Error(`Operation failed. Response code: ${getStatusCodeText(response)}`);
				}

				document.getElementById('value_expression_service_active_slot').innerText = slotValue;
				document.getElementById('value_expression_service_response').innerText = getStatusCodeText(response);
				setConnectionControlsEnabled(true);
				if (isConfigurationMode) setConfigurationControlEnabled(true);
			});
			document.getElementById('button_expression_service_get_active_slot').addEventListener('click', async () => getExpressionActiveSlot());

			// Expression
			document.getElementById('input_expression_service_expression').addEventListener('input', checkExpressionInput);
			document.getElementById('button_expression_service_set_expression').addEventListener('click', async () => {
				setConnectionControlsEnabled(false);
				setConfigurationControlEnabled(false);

				let response;
				const expressionTokens = api.expressionStringToToken(document.getElementById('input_expression_service_expression').value);
				try {
					response = await api.setExpression(expressionTokens);
				}
				catch (error) {
					// TODO: エラーを見やすく表示
					setConnectionControlsEnabled(true);
					if (isConfigurationMode) setConfigurationControlEnabled(true);
					throw error;
				}
				if (response > 0) {
					// TODO: エラーを見やすく表示
					document.getElementById('value_expression_service_response').innerText = getStatusCodeText(response);
					setConnectionControlsEnabled(true);
					if (isConfigurationMode) setConfigurationControlEnabled(true);
					throw new Error(`Operation failed. Response code: ${getStatusCodeText(response)}`);
				}

				document.getElementById('value_expression_service_expression').value = api.tokenToExpressionString(expressionTokens);
				document.getElementById('value_expression_service_response').innerText = getStatusCodeText(response);
				setConnectionControlsEnabled(true);
				if (isConfigurationMode) setConfigurationControlEnabled(true);
			});
			document.getElementById('button_expression_service_get_expression').addEventListener('click', async () => getExpression());

			// Copy Expression
			document.getElementById('input_expression_service_copy').addEventListener('input', checkCopyExpressionInput);
			document.getElementById('button_expression_service_copy').addEventListener('click', async () => {
				setConnectionControlsEnabled(false);
				setConfigurationControlEnabled(false);

				let response;
				const targetIdValue = Number(document.getElementById('input_expression_service_copy').value);
				try {
					response = await api.copyExpression(targetIdValue);
				}
				catch (error) {
					// TODO: エラーを見やすく表示
					setConnectionControlsEnabled(true);
					if (isConfigurationMode) setConfigurationControlEnabled(true);
					throw error;
				}
				if (response > 0) {
					// TODO: エラーを見やすく表示
					document.getElementById('value_expression_service_response').innerText = getStatusCodeText(response);
					setConnectionControlsEnabled(true);
					if (isConfigurationMode) setConfigurationControlEnabled(true);
					throw new Error(`Operation failed. Response code: ${getStatusCodeText(response)}`);
				}

				document.getElementById('value_expression_service_response').innerText = getStatusCodeText(response);
				setConnectionControlsEnabled(true);
				if (isConfigurationMode) setConfigurationControlEnabled(true);
			});

			// Move Expression
			document.getElementById('input_expression_service_move').addEventListener('input', checkMoveExpressionInput);
			document.getElementById('button_expression_service_move').addEventListener('click', async () => {
				setConnectionControlsEnabled(false);
				setConfigurationControlEnabled(false);

				let response;
				const targetIdValue = Number(document.getElementById('input_expression_service_move').value);
				try {
					response = await api.moveExpression(targetIdValue);
				}
				catch (error) {
					// TODO: エラーを見やすく表示
					setConnectionControlsEnabled(true);
					if (isConfigurationMode) setConfigurationControlEnabled(true);
					throw error;
				}
				if (response > 0) {
					// TODO: エラーを見やすく表示
					document.getElementById('value_expression_service_response').innerText = getStatusCodeText(response);
					setConnectionControlsEnabled(true);
					if (isConfigurationMode) setConfigurationControlEnabled(true);
					throw new Error(`Operation failed. Response code: ${getStatusCodeText(response)}`);
				}

				document.getElementById('value_expression_service_response').innerText = getStatusCodeText(response);
				await getExpressionActiveSlot();
				await getExpression();
				setConnectionControlsEnabled(true);
				if (isConfigurationMode) setConfigurationControlEnabled(true);
			});

			// Delete Expression
			document.getElementById('button_expression_service_delete').addEventListener('click', async () => {
				if (confirm(`スロット${document.getElementById('value_expression_service_target_expression').innerText}の条件式を削除します。よろしいですか？`)) {
					setConnectionControlsEnabled(false);
					setConfigurationControlEnabled(false);

					let response;
					try {
						response = await api.deleteExpression();
					}
					catch (error) {
						// TODO: エラーを見やすく表示
						setConnectionControlsEnabled(true);
						if (isConfigurationMode) setConfigurationControlEnabled(true);
						throw error;
					}
					if (response > 0) {
						// TODO: エラーを見やすく表示
						document.getElementById('value_expression_service_response').innerText = getStatusCodeText(response);
						setConnectionControlsEnabled(true);
						if (isConfigurationMode) setConfigurationControlEnabled(true);
						throw new Error(`Operation failed. Response code: ${getStatusCodeText(response)}`);
					}

					document.getElementById('value_expression_service_response').innerText = getStatusCodeText(response);
					await getExpressionActiveSlot();
					await getExpression();
					setConnectionControlsEnabled(true);
					if (isConfigurationMode) setConfigurationControlEnabled(true);
				}
			});

			document.getElementById('button_expression_service_get_response').addEventListener('click', async () => getExpressionServiceResponse());
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
				await getSensorInterval();
				await getAdvertiseInterval();
				await getAdvertiseChannelMask();
				await getAdvertiseTxPower();
				await getTargetExpression();
				await getExpressionActiveSlot();
				await getExpression();
			}
			startObserveButton.disabled = true;
			connectButton.disabled = true;
			disconnectButton.disabled = false;
		});
		api.addEventListener('connection-closed', () => {
			startObserveButton.disabled = false;
			connectButton.disabled = false;
			disconnectButton.disabled = true;
			setConnectionControlsEnabled(false);
			setConfigurationControlEnabled(false);
			document.querySelectorAll('.notification_checkbox').forEach((element) => element.checked = false);
			document.querySelectorAll('.configuration_value').forEach((element) => element.innerText = '---');
			document.getElementById('input_radio_system_service_operation_mode_user_mode').checked = true;
		});
	}
}

init();
