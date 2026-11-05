import { useMemo, useRef } from "react";
import { ColorFormatValue, ColorVariable } from "../components/modules/colorSystem";
import { colorGroupsToVariables } from "../components/modules/colorSystem/functions/colorGroupsToVariables";
import cssColorNames from "../data/cssColorNames";
import { convertToDesiredColorFormat, getDefaultColorInFormat, isValidColor } from "../utils";
import type { Color } from "@adobe/react-spectrum";
import { parseColor } from "@adobe/react-spectrum";
import { ColorFormat } from "@mantine/core/lib/ColorPicker/types";
import { colord } from "colord";
import { useAtomValue } from "jotai";
import { colorSystemFormDataAtom } from "../state";

const errors = {
	overlap: "Variables cannot overlap.",
	invalid: "No such variable or color.",
};

export function useGetColor() {
	const colorSystem = useAtomValue(colorSystemFormDataAtom);
	const colorVariables = useMemo(() => colorGroupsToVariables(colorSystem), [colorSystem]) as ColorVariable[];

	const errorMsg = useRef("");
	const variableRegex = /^var\(--(.*?)\)$/;
	const hexFormats = ["hex", "hexa"];

	function getColor(value: string, isDark: boolean = false, visited: Set<string> = new Set()): string {
		const regMatch = value.match(variableRegex);
		if (!regMatch) return cssColorNames[value] ?? value;

		const varName = regMatch[1];
		const variable = colorVariables.find((el) => el.name === varName);

		if (visited.has(varName)) {
			errorMsg.current = errors.overlap;
			return "";
		}

		if (variable) {
			visited.add(varName);
			const color = isDark ? variable.colorDarkValue || variable.colorValue : variable.colorValue;
			return getColor(color, isDark, visited);
		}
		return cssColorNames[value] ?? value;
	}

	function isValidColorValue(value: string, isDark: boolean = false) {
		const color = getColor(value, isDark);
		const isValid = isValidColor(color);

		errorMsg.current = isValid ? "" : errorMsg.current === errors.overlap ? errors.overlap : errors.invalid;
		return isValid;
	}

	function checkInfinite(value: string, isDark: boolean = false, visited: Set<string> = new Set()): boolean {
		const regMatch = value.match(variableRegex);
		if (!regMatch) return false;

		const varName = regMatch[1];
		const variable = colorVariables.find((el) => el.name === varName);

		if (visited.has(varName)) {
			errorMsg.current = errors.overlap;
			return true;
		}

		if (variable) {
			visited.add(varName);
			const color = isDark ? variable.colorDarkValue || variable.colorValue : variable.colorValue;
			return checkInfinite(color, isDark, visited);
		}

		return false;
	}

	function parseColorValue(value: string, format: ColorFormatValue, isDark: boolean = false) {
		const supportedFormat: ColorFormat = format === "oklch" || format === "raw" ? "hsl" : format;
		try {
			if (!value) return parseColor(getDefaultColorInFormat(supportedFormat));

			const color = getColor(value, isDark);
			const isConversionFromHslToHex = color?.startsWith("hsl") && hexFormats.includes(supportedFormat);
			if (isConversionFromHslToHex) {
				const colorDInstance = colord(color ?? getDefaultColorInFormat(supportedFormat));
				return parseColor(colorDInstance.toHex());
			}

			const supportedColor = convertToDesiredColorFormat(
				color ?? getDefaultColorInFormat(supportedFormat),
				supportedFormat,
			);
			return parseColor(supportedColor).toFormat(supportedFormat);
		} catch {
			return parseColor(getDefaultColorInFormat(supportedFormat)).toFormat(supportedFormat);
		}
	}

	function colorChannels(parsedColor: Color, format: ColorFormat) {
		try {
			return parsedColor.getColorChannels();
		} catch {
			const defaultColor = parseColor(getDefaultColorInFormat(format));
			return defaultColor.getColorChannels();
		}
	}

	return {
		getColor,
		colorVariables,
		errorMsg,
		isValidColorValue,
		checkInfinite,
		parseColorValue,
		colorChannels,
	};
}
