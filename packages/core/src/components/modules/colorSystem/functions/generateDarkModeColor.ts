import { ColorItem } from "../types";
import { colord } from "colord";
import {
	convertToDesiredColorFormat,
	fitOklchToSrgb,
	formatOklch,
	oklchToRgba,
	parseColorToColord,
	parseOklch,
	rgbaToOklch,
} from "utils";

export function generateDarkModeColor(value: string, format?: ColorItem["format"]): string | null {
	const parsedOklch = parseOklch(value);
	const parsedColor = parsedOklch ? null : parseColorToColord(value);
	if (!(parsedOklch || parsedColor?.isValid())) return null;

	const source = parsedOklch ?? rgbaToOklch(parsedColor!.toRgb());
	const darkColor = fitOklchToSrgb({
		...source,
		l: 1 - source.l,
	});

	if (format === "oklch") return formatOklch(darkColor);
	return convertToDesiredColorFormat(colord(oklchToRgba(darkColor)), format);
}
