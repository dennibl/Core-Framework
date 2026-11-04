import { ColorItem, ColorSystemFormData, ColorVariable } from "../types";
import { colord } from "colord";
import { ulid } from "ulid";
import { convertToDesiredColorFormat, convertToVariableDeclarationName } from "utils";
import { colorGroupsToVariables } from "./colorGroupsToVariables";
import { getColor, isValidColorValue } from "./getColor";

export function getTransparentVariable(
	color: ColorItem,
	variant: string | number,
	includeRawValue: boolean = false,
	darkMode: boolean = false,
	includeVariants: boolean = false,
	colorVariables: ColorVariable[] = [],
) {
	const { format } = color;
	const colorValue = getColor(darkMode ? color.darkValue ?? "" : color.value, colorVariables, darkMode);

	if (!colord(colorValue).isValid()) return null;

	const name = `${color.name}-${String(variant).replace("0.", "")}`;
	const instance = colord(colorValue).alpha(Number(variant) / 100);
	const value = convertToDesiredColorFormat(instance, format);
	const id = [color.id, variant].join(".");

	return {
		name,
		value,
		format,
		id,
		...(includeRawValue && {
			raw: color.value,
		}),
		...(includeVariants
			? {
					types: darkMode
						? ["variable", "transparent-class", "dark-mode"]
						: ["variable", "transparent-class"],
			  }
			: {}),
	};
}

function createDeclarations(
	groups: {
		id: string;
		name: string;
		colors: ColorItem[];
		isDisabled?: boolean;
	}[],
	darkMode: boolean = false,
	includeVariants: boolean = false,
) {
	const colorsToProcess: ColorItem[] = [];
	const vars = colorGroupsToVariables({ groups }) as ColorVariable[];

	for (const { colors, isDisabled, name: groupName } of groups) {
		if (isDisabled) continue;

		for (const color of colors) {
			const colorValue = darkMode ? color.darkValue : color.value;
			if (!colorValue || !isValidColorValue(getColor(colorValue, vars, darkMode))) continue;

			const processedColor = darkMode ? { ...color, value: color.darkValue ?? "" } : color;
			colorsToProcess.push({
				...processedColor,
				...(includeVariants ? { types: ["variable"], groupName } : {}),
			});

			if (color?.transparent && color?.transparentVariables?.length) {
				color.transparentVariables.forEach((variant) => {
					const variable = getTransparentVariable(color, variant, false, darkMode, includeVariants, vars);
					if (variable) colorsToProcess.push({ ...variable, ...(includeVariants ? { groupName } : {}) });
				});
			}

			if (color.isShades && (darkMode ? color.darkShades : color.shades)) {
				const shades = darkMode ? color.darkShades : color.shades;
				shades?.map(({ name, value }, i) => {
					colorsToProcess.push({
						id: String(i) + value,
						name,
						value,
						...(includeVariants
							? { types: ["variable", "shade-tint", ...(darkMode ? ["dark-mode"] : [])], groupName }
							: {}),
					});
				});
			}

			if (color.isTints && (darkMode ? color.darkTints : color.tints)) {
				const tints = darkMode ? color.darkTints : color.tints;
				tints?.forEach(({ name, value }, i) => {
					colorsToProcess.push({
						id: String(i) + value,
						name,
						value,
						...(includeVariants
							? { types: ["variable", "shade-tint", ...(darkMode ? ["dark-mode"] : [])], groupName }
							: {}),
					});
				});
			}
		}
	}

	return colorsToProcess.map((color) => {
		const { value, name } = color;
		const { types, groupName } = color as unknown as CSSDeclaration;
		const property = convertToVariableDeclarationName(name);

		return {
			id: ulid(),
			property,
			value,
			...(types?.length ? { types } : {}),
			...(groupName ? { groupName } : {}),
		};
	});
}

interface IGenerateColorSystemVariables {
	readonly colorSystemState: ColorSystemFormData;
	readonly manual_theme?: boolean;
	readonly themeMode?: "light" | "dark" | "auto";
	readonly darkModeSelector?: string;
	readonly lightModeSelector?: string;
	readonly classPrefix?: string;
	readonly includeVariants?: boolean;
}

export function generateColorSystemVariables({
	colorSystemState,
	manual_theme,
	themeMode,
	darkModeSelector = ".cf-theme-dark",
	lightModeSelector = ".cf-theme-light",
	classPrefix = "",
	includeVariants,
}: IGenerateColorSystemVariables): CssObject[] {
	if (colorSystemState.isDisabled) return [];
	const resolvedThemeMode = themeMode ?? (manual_theme === false ? "auto" : "light");

	const lightModeDeclarations = createDeclarations(colorSystemState.groups, false, includeVariants);
	const darkModeDeclarations = createDeclarations(colorSystemState.groups, true, includeVariants);
	const darkDeclarationsByProperty = new Map(
		darkModeDeclarations.map((declaration) => [declaration.property, declaration]),
	);
	const darkModeBaseDeclarations = lightModeDeclarations.map(
		(declaration) => darkDeclarationsByProperty.get(declaration.property) ?? declaration,
	);
	const lightModeProperties = new Set(lightModeDeclarations.map(({ property }) => property));
	darkModeBaseDeclarations.push(
		...darkModeDeclarations.filter(({ property }) => !lightModeProperties.has(property)),
	);
	const baseDeclarations =
		resolvedThemeMode === "dark" ? darkModeBaseDeclarations : lightModeDeclarations;
	const cssObject: CssObject = {
		id: ulid(),
		selector: ":root",
		declarations: baseDeclarations,
		...(includeVariants ? { types: ["variable"] } : {}),
	};

	if (!darkModeDeclarations.length) return [cssObject];

	const invertedSelector = `.${classPrefix}theme-inverted`;
	const alwaysDarkSelector = ".theme-always-dark";
	const alwaysLightSelector = ".theme-always-light";
	const darkSelector = `:root${darkModeSelector}, :root${lightModeSelector} ${invertedSelector}, :root${lightModeSelector} ${alwaysDarkSelector}, :root${darkModeSelector} ${invertedSelector} ${alwaysDarkSelector}`;
	const lightSelector = `:root${lightModeSelector}, :root${darkModeSelector} ${invertedSelector}, :root${darkModeSelector} ${alwaysLightSelector}, :root${lightModeSelector} ${invertedSelector} ${alwaysLightSelector}`;
	const systemThemeRoot = `:root:not(${lightModeSelector}):not(${darkModeSelector})`;

	const themedObjects: CssObject[] = [];
	const addThemeObject = (
		selector: string,
		declarations: CSSDeclaration[],
		mode: "light" | "dark",
		media?: "DARK_MODE",
	) => {
		themedObjects.push({
			id: ulid(),
			selector,
			declarations,
			...(media ? { media } : {}),
			...(includeVariants
				? { types: mode === "dark" ? ["variable", "dark-mode"] : ["variable"] }
				: {}),
		});
	};

	if (resolvedThemeMode === "light") {
		addThemeObject(darkSelector, darkModeDeclarations, "dark");
	} else if (resolvedThemeMode === "dark") {
		addThemeObject(lightSelector, lightModeDeclarations, "light");
	} else {
		addThemeObject(darkSelector, darkModeDeclarations, "dark");
		addThemeObject(lightSelector, lightModeDeclarations, "light");
		addThemeObject(
			`${systemThemeRoot}, ${systemThemeRoot} ${alwaysDarkSelector}, ${systemThemeRoot} ${invertedSelector} ${alwaysDarkSelector}`,
			darkModeDeclarations,
			"dark",
			"DARK_MODE",
		);
		addThemeObject(
			`${systemThemeRoot} ${invertedSelector}, ${systemThemeRoot} ${alwaysLightSelector}, ${systemThemeRoot} ${invertedSelector} ${alwaysLightSelector}`,
			lightModeDeclarations,
			"light",
			"DARK_MODE",
		);
	}

	const colorSchemeObject = (
		selector: string,
		value: "light" | "dark",
		media?: "DARK_MODE",
	): CssObject => ({
		id: `color-scheme-${value}-${selector}-${media ?? "default"}`,
		selector,
		declarations: [{ id: `${value}-color-scheme`, property: "color-scheme", value }],
		...(media ? { media } : {}),
	});

	if (resolvedThemeMode === "light") {
		themedObjects.push(colorSchemeObject("html", "light"));
		themedObjects.push(colorSchemeObject(`html${darkModeSelector}`, "dark"));
	} else if (resolvedThemeMode === "dark") {
		themedObjects.push(colorSchemeObject("html", "dark"));
		themedObjects.push(colorSchemeObject(`html${lightModeSelector}`, "light"));
	} else {
		themedObjects.push(colorSchemeObject("html", "light"));
		themedObjects.push(colorSchemeObject(`html${darkModeSelector}`, "dark"));
		themedObjects.push(colorSchemeObject(`html${lightModeSelector}`, "light"));
		themedObjects.push(
			colorSchemeObject(`html:not(${lightModeSelector}):not(${darkModeSelector})`, "dark", "DARK_MODE"),
		);
	}

	return [cssObject, ...themedObjects];
}
