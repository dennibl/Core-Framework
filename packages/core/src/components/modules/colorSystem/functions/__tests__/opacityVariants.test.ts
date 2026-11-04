import {
	generateOpacityVariants,
	normalizeOpacityVariants,
	splitOpacityVariantsIntoRows,
} from "../opacityVariants";
import { colorItemSchema } from "../../schema/colorSystem.schema";
import { DEFAULT_OPACITY_VARIANTS } from "../../data/defaults";

test("normalizes opacity variants to unique integers between 1 and 99 while retaining their order", () => {
	expect(normalizeOpacityVariants([50, "10", 10, 0, 100, 20.6, "invalid"])).toEqual([50, 10, 1, 99, 21]);
});

test("limits opacity variants to twenty entries", () => {
	expect(normalizeOpacityVariants(Array.from({ length: 21 }, (_, index) => index + 1))).toEqual(
		Array.from({ length: 20 }, (_, index) => index + 1),
	);
});

test("generates evenly distributed opacity variants without the 0 and 100 endpoints", () => {
	expect(generateOpacityVariants(1)).toEqual([50]);
	expect(generateOpacityVariants(3)).toEqual([25, 50, 75]);
	expect(generateOpacityVariants(4)).toEqual([20, 40, 60, 80]);
	expect(generateOpacityVariants(10)).toEqual(DEFAULT_OPACITY_VARIANTS);
	expect(generateOpacityVariants(20)).toEqual([
		5, 10, 14, 19, 24, 29, 33, 38, 43, 48, 52, 57, 62, 67, 71, 76, 81, 86, 90, 95,
	]);
});

test("constrains generated opacity counts to 1 through 20", () => {
	expect(generateOpacityVariants(0)).toHaveLength(1);
	expect(generateOpacityVariants(21)).toHaveLength(20);
	expect(generateOpacityVariants(Number.NaN)).toEqual([50]);
});

test("uses one row through ten variants and two rows from eleven variants", () => {
	expect(splitOpacityVariantsIntoRows(generateOpacityVariants(10))).toHaveLength(1);
	expect(splitOpacityVariantsIntoRows(generateOpacityVariants(11)).map((row) => row.length)).toEqual([10, 1]);
	expect(splitOpacityVariantsIntoRows(generateOpacityVariants(20)).map((row) => row.length)).toEqual([10, 10]);
});

test("keeps an imported opacity list in the schema before the editor redistributes it by count", () => {
	const color = colorItemSchema.parse({
		id: "brand",
		name: "brand",
		value: "#5c62ff",
		transparent: true,
		transparentVariables: [10, 30, 50],
	});

	expect(color.transparentVariables).toEqual([10, 30, 50]);
});
