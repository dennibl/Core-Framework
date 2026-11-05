import { DEFAULT_COLOR_ITEM } from "../data/defaults";
import { random } from "colord";
import { ulid } from "ulid";
import { convertToDesiredColorFormat } from "utils";

export function getNewColor(length: number) {
	const randomColor = random();
	return {
		...DEFAULT_COLOR_ITEM,
		name: `${DEFAULT_COLOR_ITEM.name}-${length + 1}`,
		value: convertToDesiredColorFormat(randomColor, "oklch"),
		id: ulid(),
	};
}
