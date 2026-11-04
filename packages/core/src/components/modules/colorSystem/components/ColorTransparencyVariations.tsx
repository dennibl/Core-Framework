import { memo, useCallback, useEffect, useMemo } from "react";
import { Info } from "assets/icons/Info.icon";
import { NumberInput } from "components/basic/NumberInput";
import { Tooltip } from "components/ui/Tooltip";
import { useGetColor } from "hooks/useGetColor";
import { getTransparentVariable } from "../functions/generateColorSystemVariables";
import {
	generateOpacityVariants,
	normalizeOpacityVariants,
	splitOpacityVariantsIntoRows,
} from "../functions/opacityVariants";
import {
	ColorFormatValue,
	ColorItem,
	DEFAULT_OPACITY_VARIANTS,
	MAX_OPACITY_VARIANTS_COUNT,
	MIN_OPACITY_VARIANTS_COUNT,
	OPACITY_VARIANTS_PER_ROW,
} from "../index";
import { Collapse, Switch } from "@mantine/core";
import { clsx } from "clsx";
import { ColorVariationPreview } from "./ColorVariationPreview";

interface ColorTransparencyVariationsProps {
	color: ColorItem;
	onUpdateItem: (value: ColorItem) => void;
}

export const ColorTransparencyVariations = memo<ColorTransparencyVariationsProps>(({ color, onUpdateItem }) => {
	const { colorVariables } = useGetColor();
	const storedVariants = useMemo(
		() => normalizeOpacityVariants(color.transparentVariables ?? []),
		[color.transparentVariables],
	);
	const variantCount = storedVariants.length || DEFAULT_OPACITY_VARIANTS.length;
	const variants = useMemo(() => generateOpacityVariants(variantCount), [variantCount]);
	const rows = useMemo(() => splitOpacityVariantsIntoRows(variants), [variants]);

	useEffect(() => {
		if (!color.transparent) return;
		const isEvenlyDistributed =
			storedVariants.length === variants.length && storedVariants.every((value, index) => value === variants[index]);
		if (isEvenlyDistributed) return;
		onUpdateItem({ ...color, transparentVariables: variants });
	}, [color, onUpdateItem, storedVariants, variants]);

	const handleToggle = useCallback(
		(checked: boolean) => {
			onUpdateItem({
				...color,
				transparent: checked,
				transparentVariables: checked ? variants : [],
			});
		},
		[color, onUpdateItem, variants],
	);

	const handleCountChange = useCallback(
		(value: number | string) => {
			if (value === "") return;
			onUpdateItem({
				...color,
				transparentVariables: generateOpacityVariants(Number(value)),
			});
		},
		[color, onUpdateItem],
	);

	const renderPreview = (variant: number, dark: boolean) => {
		const preview = getTransparentVariable(color, variant, false, dark, false, colorVariables);
		if (!preview) return null;

		return (
			<ColorVariationPreview
				key={`${dark ? "dark" : "light"}-${variant}`}
				color={preview.value}
				colorName={preview.name}
				format={(preview.format ?? color.format ?? "hex") as ColorFormatValue}
				defaultValue={preview.value}
				onChangeEnd={() => undefined}
				isEditable={false}
			/>
		);
	};

	const renderRows = (dark: boolean) => (
		<div className="grid gap-s">
			{rows.map((row, rowIndex) => (
				<div
					className="grid"
					key={`${dark ? "dark" : "light"}-row-${rowIndex}`}
					style={{
						gridTemplateColumns: `repeat(${variants.length > OPACITY_VARIANTS_PER_ROW ? OPACITY_VARIANTS_PER_ROW : row.length}, minmax(0, 1fr))`,
					}}
				>
					{row.map((variant) => renderPreview(variant, dark))}
				</div>
			))}
		</div>
	);

	const tooltipLabel = `Generate 1 to ${MAX_OPACITY_VARIANTS_COUNT} evenly spaced opacity variants between fully transparent and fully opaque.`;

	return (
		<div className="grid gap-s transparent-vars-row">
			<div className="row gap-l space-between align-center">
				<div className="row gap-s align-center">
					<h5>Generate transparent variants</h5>

					<Tooltip label={tooltipLabel} position="top" openDelay={300} width={250} multiline withArrow>
						<span className="help-tooltip">
							<Info />
						</span>
					</Tooltip>

					<div className={clsx("transition-global", { "opacity-0": !color.transparent })}>
						<NumberInput
							onChange={handleCountChange}
							value={variantCount}
							unit="count"
							size={10}
							max={MAX_OPACITY_VARIANTS_COUNT}
							min={MIN_OPACITY_VARIANTS_COUNT}
							step={1}
							onlyInteger
							allowMouseWheel
						/>
					</div>
				</div>

				<Switch
					labelPosition="left"
					checked={color.transparent ?? false}
					onChange={(event) => handleToggle(event.target.checked)}
				/>
			</div>

			{Boolean(color.transparent) && (
				<Collapse in={Boolean(color.transparent)}>
					{renderRows(false)}
					{color.isDarkMode && <div className="margin-top-m">{renderRows(true)}</div>}
				</Collapse>
			)}
		</div>
	);
});

ColorTransparencyVariations.displayName = "ColorTransparencyVariations";
