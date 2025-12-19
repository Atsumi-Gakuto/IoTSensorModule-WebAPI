/**
 * Uint16Arrayのエンディアンを変換する。
 * @param input 変換対象のUint16Array
 * @returns エンディアンが変換されたUint16Array
 */
export function swapUint16Array(input: Uint16Array): Uint16Array {
	const output = new Uint16Array(input.length);
	for (let i = 0; i < input.length; i++) {
		output[i] = ((input[i] & 0xff) << 8) | ((input[i] >> 8) & 0xff);
	}
	return output;
}
