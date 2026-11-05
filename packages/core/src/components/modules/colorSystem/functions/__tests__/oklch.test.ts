import { COLOR_SYSTEM_INITIAL_STATE, DEFAULT_COLOR_ITEM } from "../../data/defaults";
import { colorItemSchema } from "../../schema/colorSystem.schema";
import { getTransparentVariable } from "../generateColorSystemVariables";
import { generateShades, generateTints } from "../generateShadesTints";
import {
	convertToDesiredColorFormat,
	isValidColor,
	parseColorToColord,
	parseOklch,
	setColorAlpha,
} from "utils";

describe("OKLCH color support", () => {
	test("parses CSS OKLCH syntax including percentages and alpha", () => {
		expect(parseOklch("oklch(62.8% 0.2577 29.23 / 50%)")).toEqual({
			l: 0.628,
			c: 0.2577,
			h: expect.closeTo(29.23, 8),
			a: 0.5,
		});
		expect(isValidColor("oklch(62.8% 0.2577 29.23)")).toBe(true);
	});

	test("converts between sRGB-based formats and OKLCH", () => {
		const red = convertToDesiredColorFormat("#ff0000", "oklch");
		expect(red).toBe("oklch(62.8% 0.2577 29.23)");
		expect(parseColorToColord(red).toHex()).toBe("#ff0000");
		expect(convertToDesiredColorFormat(`${red.slice(0, -1)} / 0.5)`, "hsla")).toBe("hsla(0, 100%, 50%, 0.5)");
	});

	test("preserves OKLCH channels when changing alpha", () => {
		expect(setColorAlpha("oklch(60% 0.2 120)", 0.18, "oklch")).toBe("oklch(60% 0.2 120 / 0.18)");
	});

	test("generates shades, tints, and opacity variants in OKLCH", () => {
		const color = {
			id: "red",
			name: "red",
			value: "oklch(62.8% 0.2577 29.23)",
			format: "oklch" as const,
		};
		const shades = generateShades({ midColor: color.value, name: color.name, number: 2, format: "oklch" });
		const tints = generateTints({ midColor: color.value, name: color.name, number: 2, format: "oklch" });
		const transparent = getTransparentVariable(color, 25);

		expect(shades).toHaveLength(2);
		expect(tints).toHaveLength(2);
		expect([...shades, ...tints].every(({ value }) => value.startsWith("oklch("))).toBe(true);
		expect(transparent?.value).toBe("oklch(62.8% 0.2577 29.23 / 0.25)");
	});

	test("uses OKLCH for new and default colors while accepting the format in persisted data", () => {
		expect(DEFAULT_COLOR_ITEM.format).toBe("oklch");
		expect(DEFAULT_COLOR_ITEM.value.startsWith("oklch(")).toBe(true);

		for (const group of COLOR_SYSTEM_INITIAL_STATE.groups) {
			for (const color of group.colors) {
				expect(color.format).toBe("oklch");
				expect(color.value.startsWith("oklch(")).toBe(true);
				expect(colorItemSchema.safeParse(color).success).toBe(true);
			}
		}
	});
});
