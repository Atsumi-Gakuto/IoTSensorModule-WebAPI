import { ExpressionParseError } from "../errors/expression_parse_error";

/**
 * 条件式要素の種類の配列
 */
export const EXPRESSION_ELEMENT_TYPE = ['VALUE', 'SENSOR', 'OPERATOR'] as const;

/**
 * 条件式要素の種類
 */
export type ExpressionElementType = typeof EXPRESSION_ELEMENT_TYPE[number];

/**
 * 条件式要素の型
 */
export interface ExpressionElement {
	/** 要素の種類 */
	type: ExpressionElementType,
	/** 要素の値 */
	value: number;
}

/**
 * 数式の形式で入力された条件式をトークン毎に分割する。
 * @param expression 数式の形式で入力された条件式
 * @return 条件式をトークンに分解した配列
 * @throws ExpressionParseError 不明なトークンが検出された場合
 */
export function stringToToken(expression: string): ExpressionElement[] {
	let processString: string = expression.replace(/(?<!-)\s/g, "").toLowerCase();
	const tokens: ExpressionElement[] = [];

	while (processString.length > 0) {
		//数値トークン
		const valueToken: RegExpMatchArray | null = processString.match(/^\-?\d+(\.\d+)?/);
		if (valueToken != null) {
			tokens.push({ type: "VALUE", value: Number(valueToken[0]) });
			processString = processString.substring(valueToken[0].length);
			continue;
		}

		//センサトークン
		const sensorToken: RegExpMatchArray | null = processString.match(/^s(\d+)([x-z])?/);
		if (sensorToken != null) {
			let sensorValue: number = Number(sensorToken[1]) << 2;
			if (sensorToken[2] != undefined) sensorValue |= (sensorToken[2].charCodeAt(0) - 0x78 + 1); //小文字のxのASCIIコードは0x78
			tokens.push({ type: "SENSOR", value: sensorValue });
			processString = processString.substring(sensorToken[0].length);
			continue;
		}

		//演算子トークン
		const operatorToken: RegExpMatchArray | null = processString.match(/^[=!><]=|^[&\|]{2}|^-\s?|^[\+\*\/\^%><\(\)]/);
		if (operatorToken != null) {
			const operatorString: string = operatorToken[0].replace(/ /g, "");
			const token: ExpressionElement = { type: "OPERATOR", value: -1 };
			switch (operatorString) {
				case "+":
					token.value = 0;
					break;
				case "-":
					token.value = 1;
					break;
				case "*":
					token.value = 2;
					break;
				case "/":
					token.value = 3;
					break;
				case "^":
					token.value = 4;
					break;
				case "%":
					token.value = 5;
					break;
				case "(":
					token.value = 6;
					break;
				case ")":
					token.value = 7;
					break;
				case "==":
					token.value = 8;
					break;
				case "!=":
					token.value = 9;
					break;
				case ">=":
					token.value = 10;
					break;
				case ">":
					token.value = 11;
					break;
				case "<=":
					token.value = 12;
					break;
				case "<":
					token.value = 13;
					break;
				case "&&":
					token.value = 14;
					break;
				case "||":
					token.value = 15;
					break;
				default:
					throw new ExpressionParseError(`Unknown operator token found: ${operatorToken[0]}`);
			}
			tokens.push(token);
			processString = processString.substring(operatorToken[0].length);
			continue;
		}

		//不明なトークン
		throw new ExpressionParseError("Unknown token found");
	}

	return tokens;
}

/**
 * 条件式のトークン配列をBLEで送信可能なUint8Arrayに変換する。
 * @param tokens 変換対象の条件式のトークン配列
 * @returns BLEで送信可能な形式に変換されたUint8Array
 * @throws ExpressionParseError 不明なトークンが検出された場合
 */
export function tokenToUint8Array(tokens: ExpressionElement[]): Uint8Array {
	const bleValue: number[] = [];
	tokens.forEach((token) => {
		switch (token.type) {
			case "VALUE":
				let processValue: number = Math.fround(token.value);
				const bitArray: boolean[] = new Array(32).fill(false);
				if (processValue < 0) {
					bitArray[31] = true;
					processValue *= -1;
				}
				let decimalPointer: number = Math.floor(Math.log2(processValue));
				let exponent: number = decimalPointer + 127;
				for (let i = 23; i >= 0; i--) {
					const cardinalNumber: number = Math.pow(2, decimalPointer);
					if (cardinalNumber <= processValue) {
						if (i < 23) bitArray[i] = true;
						processValue -= cardinalNumber;
					}
					decimalPointer--;
				}
				for (let i = 31; i >= 23; i--) {
					const cardinalNumber: number = Math.pow(2, i - 23);
					if (cardinalNumber <= exponent) {
						bitArray[i] = true;
						exponent -= cardinalNumber;
					}
				}

				bleValue.push(0x06, 0x01);
				for (let i = 3; i >= 0; i--) {
					let byteValue: number = 0;
					for (let j = 7; j >= 0; j--) {
						byteValue <<= 1;
						byteValue |= (bitArray[i * 8 + j] ? 1 : 0);
					}
					bleValue.push(byteValue);
				}
				break;
			case "SENSOR":
				if (token.value < 0 || token.value > 0xff) throw new ExpressionParseError(`Sensor index must be between 0 and 255: ${token.value}`);
				else if (token.value % 1 != 0) throw new ExpressionParseError(`Sensor index must be an integer: ${token.value}`);

				bleValue.push(0x03, 0x02, token.value);
				break;
			case "OPERATOR":
				if (token.value < 0 || token.value > 15) throw new ExpressionParseError(`Operator code must be between 0 and 15: ${token.value}`);
				else if (token.value % 1 != 0) throw new ExpressionParseError(`Operator code must be an integer: ${token.value}`);

				bleValue.push(0x03, 0x03, token.value);
				break;
		}
	});

	return new Uint8Array(bleValue);
}

/**
 * BLEで送信可能なUint8Arrayの条件式からトークン配列に変換する。
 * @param bleArray BLEで送信可能なUint8Arrayの条件式
 * @returns 条件式のトークン配列
 * @throws ExpressionParseError 不明なトークンが検出された場合
 */
export function uint8ArrayToToken(bleArray: Uint8Array): ExpressionElement[] {
	const tokens: ExpressionElement[] = [];
	let tokenLength: number = 0;
	let tokenType: number = 0;
	let value: number[] = [];
	for (let i = 0; i < bleArray.length; i++) {
		if (tokenLength == 0) {
			const length: number = bleArray[i];
			if (length == 0) return tokens;
			tokenLength = length;
		}
		else if (tokenType == 0) {
			const type: number = bleArray[i];
			if (EXPRESSION_ELEMENT_TYPE[type - 1] == undefined) throw new ExpressionParseError(`Unknown token type found: ${type}`);
			tokenType = type;
		}
		else {
			value.push(bleArray[i]);
			if (tokenLength == 1) {
				const token: ExpressionElement = {type: "VALUE", value: 0};
				token.type = EXPRESSION_ELEMENT_TYPE[tokenType - 1];
				if (token.type == "VALUE") {
					if (value.length != 4) throw new ExpressionParseError("Invalid token length");
					token.value = new DataView(new Uint8Array(value).buffer).getFloat32(0);
				}
				else {
					if (value.length != 1) throw new ExpressionParseError("Invalid token length");
					token.value = new DataView(new Uint8Array(value).buffer).getUint8(0);
				}
				tokens.push(token);
				tokenType = 0;
				value = [];
			}
		}
		tokenLength--;
	}

	return tokens;
}

/**
 * トークン配列を数式の文字列に変換する。
 * @param tokens 変換対象のトークン配列
 * @returns 数式の形式に変換された文字列
 * @throws ExpressionParseError 不明なトークンが検出された場合
 */
export function tokenToString(tokens: ExpressionElement[]): string {
	let expressionString: string = "";
	tokens.forEach((token: ExpressionElement, index: number) => {
		switch (token.type) {
			case "VALUE": {
				expressionString += (Math.round(token.value * 1000) / 1000).toString();
				break;
			}
			case "SENSOR": {
				const sensorIndex = token.value >> 2;
				if (sensorIndex < 0 || sensorIndex > 255) throw new ExpressionParseError(`Unexpected sensor index found: ${sensorIndex}`);
				else if (sensorIndex % 1 != 0) throw new ExpressionParseError(`Sensor index must be an integer: ${sensorIndex}`);

				const axis: number = token.value & 0b11;
				let axisChar: string = "";
				switch (axis) {
					case 1:
						axisChar = "x";
						break;
					case 2:
						axisChar = "y";
						break;
					case 3:
						axisChar = "z";
						break;
					default:
						axisChar = "";
						break;
				}
				expressionString += `s${sensorIndex}${axisChar}`;
				break;
			}
			case "OPERATOR": {
				switch (token.value) {
					case 0:
						expressionString += "+";
						break;
					case 1:
						expressionString += "-";
						break;
					case 2:
						expressionString += "*";
						break;
					case 3:
						expressionString += "/";
						break;
					case 4:
						expressionString += "^";
						break;
					case 5:
						expressionString += "%";
						break;
					case 6:
						expressionString += "(";
						break;
					case 7:
						expressionString += ")";
						break;
					case 8:
						expressionString += "==";
						break;
					case 9:
						expressionString += "!=";
						break;
					case 10:
						expressionString += ">=";
						break;
					case 11:
						expressionString += ">";
						break;
					case 12:
						expressionString += "<=";
						break;
					case 13:
						expressionString += "<";
						break;
					case 14:
						expressionString += "&&";
						break;
					case 15:
						expressionString += "||";
						break;
					default:
						throw new ExpressionParseError(`Unexpected operator code found: ${token.value}`);
				}
				break;
			}
			default:
				throw new ExpressionParseError(`Unknown token type found: ${token.type}`);
		}
		if (index < tokens.length - 1) expressionString += " ";
	});
	return expressionString;
}
