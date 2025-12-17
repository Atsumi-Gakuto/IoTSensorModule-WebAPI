/**
 * 3軸データの構造体
 */
export class Vector3<T = number> {
	/**
	 * x軸の値
	 */
	public x: T = 0 as any;

	/**
	 * y軸の値
	 */
	public y: T = 0 as any;

	/**
	 * z軸の値
	 */
	public z: T = 0 as any;

	/**
	 * コンストラクタ
	 * @param x x軸の値
	 * @param y y軸の値
	 * @param z z軸の値
	 */
	constructor(x?: T, y?: T, z?: T) {
		if (x != undefined) this.x = x;
		if (y != undefined) this.y = y;
		if (z != undefined) this.z = z;
	}
}
