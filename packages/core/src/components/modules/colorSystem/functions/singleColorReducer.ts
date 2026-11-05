import { ColorItem, Shade, SingleColorReducerAction } from "../types";
import { convertToDesiredColorFormat } from "utils";
import { generateAdditionalColorName, generateWithCheck } from "./generateShadesTints";
import { getColor } from "./getColor";
import { refreshColorReferences } from "./refreshColorReferences";

export const singleColorReducer = (state: ColorItem, action: SingleColorReducerAction): ColorItem => {
	switch (action.type) {
		case "refreshReferences":
			return refreshColorReferences(state, action.payload.previousVariables, action.payload.colorVariables);
		case "restore":
			return action.payload;
		case "rename": {
			const { name } = action.payload;
			const { isTints, isShades, isDarkMode, darkTints, darkShades, tints, shades, darkValue } = state;

			const generateNames = (list: Shade[], type: "shade" | "tint") =>
				list.map((item, index) => ({ ...item, name: generateAdditionalColorName({ name, index, type }) }));

			return {
				...state,
				name,
				...(isShades ? { shades: generateNames(shades || [], "shade") } : {}),
				...(isTints ? { tints: generateNames(tints || [], "tint") } : {}),
				...(isShades && isDarkMode && darkValue
					? { darkShades: generateNames(darkShades || [], "shade") }
					: {}),
				...(isTints && isDarkMode && darkValue ? { darkTints: generateNames(darkTints || [], "tint") } : {}),
			};
		}
		case "updateColor": {
			const { value, colorVariables } = action.payload;

			return {
				...state,
				value,
				...(state.isShades
					? { shades: generateWithCheck(state, value, "shade", false, colorVariables) }
					: {}),
				...(state.isTints ? { tints: generateWithCheck(state, value, "tint", false, colorVariables) } : {}),
			};
		}
		case "updateFormat": {
			const { format, colorVariables } = action.payload;
			const { value, darkValue, isDarkMode, isShades, isTints, shades, tints, darkShades, darkTints } = state;

			const resolvedColor = getColor(value, colorVariables);
			const colorInDesiredFormat = convertToDesiredColorFormat(resolvedColor, format);

			const resolvedDarkColor =
				isDarkMode && darkValue ? getColor(darkValue, colorVariables, true) : resolvedColor;
			const colorDarkInDesiredFormat =
				isDarkMode && darkValue
					? convertToDesiredColorFormat(resolvedDarkColor, format)
					: colorInDesiredFormat;

			const formatItem = (item: Shade) => ({
				...item,
				value: convertToDesiredColorFormat(item.value, format),
			});

			return {
				...state,
				format,
				value: colorInDesiredFormat,
				darkValue: colorDarkInDesiredFormat,
				...(isShades ? { shades: shades?.map(formatItem) } : {}),
				...(isTints ? { tints: tints?.map(formatItem) } : {}),
				...(isShades && isDarkMode && darkValue ? { darkShades: darkShades?.map(formatItem) } : {}),
				...(isTints && isDarkMode && darkValue ? { darkTints: darkTints?.map(formatItem) } : {}),
			};
		}
		case "updateDarkColor": {
			const { value, colorVariables } = action.payload;
			if (!value) return state;

			return {
				...state,
				darkValue: value,
				darkShades: state.isShades ? generateWithCheck(state, value, "shade", true, colorVariables) : [],
				darkTints: state.isTints ? generateWithCheck(state, value, "tint", true, colorVariables) : [],
			};
		}
	}
};
