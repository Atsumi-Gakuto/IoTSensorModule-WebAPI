import {defineConfig} from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/main.ts'),
      name: 'IoTSensorModuleAPI',
      fileName: 'iot_sensor_module_api',
      formats: ['iife']
    }
  }
});
