import { COLOR_SYSTEM_INITIAL_STATE, DEFAULT_COLOR_ITEM } from "../../data/defaults";
import { colorItemSchema } from "../../schema/colorSystem.schema";
import { generateDarkModeColor } from "../generateDarkModeColor";
import { getTransparentVariable } from "../generateColorSystemVariables";
import { generateShades, generateTints, generateWithCheck } from "../generateShadesTints";
import { singleColorReducer } from "../singleColorReducer";
import { updateColorVariation } from "../updateColorVariations";
import {
	convertToDesiredColorFormat,
	isOklchInSrgbGamut,
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

	test("generates dark mode colors by reflecting OKLCH lightness", () => {
		expect(generateDarkModeColor("oklch(23.61% 0.0876 289.18)", "oklch")).toBe(
			"oklch(76.39% 0.0876 289.18)",
		);
		expect(generateDarkModeColor("oklch(81.83% 0.2166 138.99)", "oklch")).toBe(
			"oklch(18.17% 0.0572 138.99)",
		);

		const mappedGreen = parseOklch(generateDarkModeColor("oklch(81.83% 0.2166 138.99)", "oklch")!);
		expect(mappedGreen && isOklchInSrgbGamut(mappedGreen)).toBe(true);
	});

	test.each(["hex", "hexa", "rgb", "rgba", "hsl", "hsla", "oklch"] as const)(
		"turns a dark %s color into a light contrast color",
		(format) => {
			const source = convertToDesiredColorFormat("oklch(23.61% 0.0876 289.18)", format);
			const result = generateDarkModeColor(source, format);
			const resultOklch = result && parseOklch(convertToDesiredColorFormat(result, "oklch"));

			expect(resultOklch?.l).toBeGreaterThan(0.5);
		},
	);

	test.each([
		["hex", "#70e34a", /^#[\da-f]{6}$/i],
		["hexa", "#70e34aff", /^#[\da-f]{8}$/i],
		["rgb", "rgb(112, 227, 74)", /^rgb\(/],
		["rgba", "rgba(112, 227, 74, 0.4)", /^rgba\(/],
		["hsl", "hsl(105, 73%, 59%)", /^hsl\(/],
		["hsla", "hsla(105, 73%, 59%, 0.4)", /^hsla\(/],
		["oklch", "oklch(81.83% 0.2166 138.99)", /^oklch\(/],
	] as const)("returns a valid dark mode color in %s", (format, value, expectedSyntax) => {
		const result = generateDarkModeColor(value, format);
		expect(result).toMatch(expectedSyntax);
		expect(result && isValidColor(result)).toBe(true);
		expect(result && parseColorToColord(result).toHex()).not.toBe("#000000");
	});

	test("preserves alpha and rejects unresolved raw values", () => {
		expect(generateDarkModeColor("rgba(112, 227, 74, 0.4)", "rgba")).toMatch(/, 0\.4\)$/);
		expect(generateDarkModeColor("oklch(81.83% 0.2166 138.99 / 0.4)", "oklch")).toMatch(/\/ 0\.4\)$/);
		expect(generateDarkModeColor("var(--missing)", "raw")).toBeNull();
	});

	test("updates the automatic dark color when the main color changes", () => {
		const color = {
			id: "brand",
			name: "brand",
			value: "oklch(23.61% 0.0876 289.18)",
			format: "oklch" as const,
			isDarkMode: true,
			darkValue: "oklch(76.39% 0.0876 289.18)",
			isShades: true,
			shadesNumber: 2,
		};
		const withDarkShades = {
			...color,
			darkShades: generateWithCheck(color, color.darkValue, "shade", true),
		};
		const withCustomShade = updateColorVariation(withDarkShades, "shade", 0, "#123456", true);
		const previousAutomaticShade = withCustomShade.darkShades![1].value;

		const updated = singleColorReducer(withCustomShade, {
			type: "updateColor",
			payload: { value: "oklch(81.83% 0.2166 138.99)", colorVariables: [] },
		});

		expect(updated.darkValue).toBe("oklch(18.17% 0.0572 138.99)");
		expect(updated.darkShades![0].value).toBe("#123456");
		expect(updated.darkShades![1].value).not.toBe(previousAutomaticShade);
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
