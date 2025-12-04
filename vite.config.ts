import {defineConfig} from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/main.ts'),
      name: 'IoTSensorModuleAPI',
      fileName: 'iot_sensor_module_api',
      formats: ['es', 'umd', 'iife']
    }
  },
  plugins: [
    dts({
      rollupTypes: true,
      insertTypesEntry: true
    })
  ]
});
