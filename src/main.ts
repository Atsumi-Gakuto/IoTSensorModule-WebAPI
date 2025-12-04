export class IoTSensorModuleAPI {
	public sayHello(): void {
		console.log('Hello from IoTSensorModuleAPI!');
	}
}

declare global {
	const IoTSensorModuleAPI: IoTSensorModuleAPI;
}
