import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { shouldApplyColorValueChange } from "../functions/shouldApplyColorValueChange";
import { ColorFormatValue } from "../index";
import { Tooltip } from "@mantine/core";
import { convertToDesiredColorFormat } from "utils";
import { Info } from "assets/icons/Info.icon";
import { Autocomplete } from "components/basic/Autocomplete";
import { useDebounce } from "hooks/useDebounce";
import { useGetColor } from "hooks/useGetColor";

interface ColorValue {
	value: string;
	format: ColorFormatValue;
	variableName: string;
	onChange: (color: string) => void;
	onBlur?: (color: string) => void;
	isDark?: boolean;
}

export const ColorValue = memo<ColorValue>(({ value, format, variableName, onChange, isDark }) => {
	const { getColor, isValidColorValue, errorMsg, parseColorValue, colorVariables } = useGetColor();

	const [colorValue, setColorValue] = useState(() => value);
	const [isFocused, setIsFocused] = useState(false);

	const validFormat = useMemo(
		() => (format === "raw" ? "hex" : format === "oklch" ? "hsl" : format),
		[format],
	);
	const isRawFormat = format === "raw";
	const dynamicParsedColor = useMemo(
		() => parseColorValue(value, validFormat, isDark),
		[value, validFormat, isDark, parseColorValue],
	);
	const parsedColor = useDebounce(dynamicParsedColor, 300);
	const formattedParsedColor = useMemo(
		() =>
			format === "oklch"
				? convertToDesiredColorFormat(parsedColor.toString("hsla"), "oklch")
				: parsedColor.toString(validFormat),
		[format, parsedColor, validFormat],
	);

	const filteredSuggestions = useMemo(() => {
		if (!isRawFormat) return [];

		return colorVariables
			.filter(({ colorDarkValue, colorValue, name }) => {
				const colorCheck = isDark ? colorDarkValue : colorValue;
				return colorCheck && !name.toLowerCase().includes(variableName.toLowerCase());
			})
			.map(({ colorDarkValue, colorValue, name }) => {
				return {
					value: `--${name}`,
					color: isDark ? getColor(colorDarkValue ?? "", true) : getColor(colorValue),
					group: "Colors",
				};
			});
	}, [isRawFormat, colorVariables, getColor, isDark, variableName.toLowerCase]);

	const handleValueChange = useCallback(
		(color: string) => {
			const resolvedColor = getColor(color, isDark);
			const isSameColor =
				(format === "oklch"
					? convertToDesiredColorFormat(resolvedColor, "oklch")
					: parseColorValue(resolvedColor, validFormat, isDark).toString(validFormat)) ===
				formattedParsedColor;

			const isValidColor = isValidColorValue(color, isDark);

			if (
				shouldApplyColorValueChange({
					currentValue: value,
					isRawFormat,
					isSameColor,
					isValidColor,
					nextValue: color,
				})
			) {
				onChange(color);
			}
			setColorValue(color);
		},
		[
			isValidColorValue,
			onChange,
			getColor,
			isDark,
			isRawFormat,
			parseColorValue,
			validFormat,
			value,
			format,
			formattedParsedColor,
		],
	);

	useEffect(() => {
		isFocused || setColorValue(isRawFormat ? value : formattedParsedColor);
	}, [formattedParsedColor, isFocused, isRawFormat, value]);

	return (
		<Tooltip label={isDark ? "Color value in dark mode" : "Color value"} withArrow>
			<div className="ColorInput">
				<Autocomplete
					onChange={handleValueChange}
					onBlur={() => setIsFocused(false)}
					onFocus={() => setIsFocused(true)}
					value={colorValue}
					data={filteredSuggestions || []}
					allowMultipleWords={true}
					placeholder="Value"
				/>

				{isRawFormat && !isValidColorValue(value as string, isDark) && (
					<Tooltip label={errorMsg.current} position="top" openDelay={300} width={250} multiline withArrow>
						<span className="help-tooltip">
							<Info />
						</span>
					</Tooltip>
				)}
			</div>
		</Tooltip>
	);
});

ColorValue.displayName = "ColorValue";
