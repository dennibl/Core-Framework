import {
	MAX_OPACITY_VARIANT,
	MAX_OPACITY_VARIANTS_COUNT,
	MIN_OPACITY_VARIANT,
	MIN_OPACITY_VARIANTS_COUNT,
	OPACITY_VARIANTS_PER_ROW,
} from "../data/defaults";

export function normalizeOpacityVariants(values: readonly (number | string)[]): number[] {
	const normalized = new Set<number>();

	for (const value of values) {
		const numericValue = Number(value);
		if (!Number.isFinite(numericValue)) continue;

		const roundedValue = Math.round(numericValue);
		const clampedValue = Math.max(MIN_OPACITY_VARIANT, Math.min(MAX_OPACITY_VARIANT, roundedValue));
		normalized.add(clampedValue);

		if (normalized.size === MAX_OPACITY_VARIANTS_COUNT) break;
	}

	return [...normalized];
}

export function generateOpacityVariants(count: number): number[] {
	const normalizedCount = Math.max(
		MIN_OPACITY_VARIANTS_COUNT,
		Math.min(
			MAX_OPACITY_VARIANTS_COUNT,
			Number.isFinite(count) ? Math.round(count) : MIN_OPACITY_VARIANTS_COUNT,
		),
	);

	return Array.from({ length: normalizedCount }, (_, index) =>
		Math.round((100 * (index + 1)) / (normalizedCount + 1)),
	);
}

export function splitOpacityVariantsIntoRows(values: readonly number[]): number[][] {
	const rows: number[][] = [];
	for (let index = 0; index < values.length; index += OPACITY_VARIANTS_PER_ROW) {
		rows.push(values.slice(index, index + OPACITY_VARIANTS_PER_ROW));
	}
	return rows;
}
