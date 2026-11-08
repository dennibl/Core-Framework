export interface OklchColor {
	l: number;
	c: number;
	h: number;
	a: number;
}

interface RgbaColor {
	r: number;
	g: number;
	b: number;
	a: number;
}

interface SrgbColor {
	r: number;
	g: number;
	b: number;
}

const NUMBER_PATTERN = "[+-]?(?:\\d*\\.)?\\d+(?:e[+-]?\\d+)?";
const OKLCH_PATTERN = new RegExp(
	`^oklch\\(\\s*(${NUMBER_PATTERN})(%)?\\s+(${NUMBER_PATTERN})(%)?\\s+(${NUMBER_PATTERN})(deg|grad|rad|turn)?(?:\\s*\\/\\s*(${NUMBER_PATTERN})(%)?)?\\s*\\)$`,
	"i",
);

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

const normalizeHue = (hue: number) => ((hue % 360) + 360) % 360;

const hueToDegrees = (hue: number, unit?: string) => {
	switch (unit?.toLowerCase()) {
		case "grad":
			return hue * 0.9;
		case "rad":
			return (hue * 180) / Math.PI;
		case "turn":
			return hue * 360;
		default:
			return hue;
	}
};

const round = (value: number, precision: number) => {
	const factor = 10 ** precision;
	return Math.round((value + Number.EPSILON) * factor) / factor;
};

const formatNumber = (value: number, precision: number) => String(round(value, precision));

export function parseOklch(value: string): OklchColor | null {
	const match = value.trim().match(OKLCH_PATTERN);
	if (!match) return null;

	const lightness = Number(match[1]);
	const chroma = Number(match[3]);
	const hue = Number(match[5]);
	const alpha = match[7] === undefined ? 1 : Number(match[7]);
	if (![lightness, chroma, hue, alpha].every(Number.isFinite) || chroma < 0) return null;

	return {
		l: clamp(match[2] ? lightness / 100 : lightness),
		// CSS maps 100% chroma to 0.4.
		c: match[4] ? chroma * 0.004 : chroma,
		h: normalizeHue(hueToDegrees(hue, match[6])),
		a: clamp(match[8] ? alpha / 100 : alpha),
	};
}

export function formatOklch({ l, c, h, a }: OklchColor): string {
	const channels = `${formatNumber(clamp(l) * 100, 2)}% ${formatNumber(Math.max(0, c), 4)} ${formatNumber(normalizeHue(h), 2)}`;
	return a < 1 ? `oklch(${channels} / ${formatNumber(clamp(a), 3)})` : `oklch(${channels})`;
}

const linearToSrgb = (value: number) =>
	value <= 0.0031308 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - 0.055;

const srgbToLinear = (value: number) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);

function oklchToSrgb({ l, c, h }: OklchColor): SrgbColor {
	const radians = (normalizeHue(h) * Math.PI) / 180;
	const labA = c * Math.cos(radians);
	const labB = c * Math.sin(radians);

	const lPrime = l + 0.3963377774 * labA + 0.2158037573 * labB;
	const mPrime = l - 0.1055613458 * labA - 0.0638541728 * labB;
	const sPrime = l - 0.0894841775 * labA - 1.291485548 * labB;
	const linearL = lPrime ** 3;
	const linearM = mPrime ** 3;
	const linearS = sPrime ** 3;

	const red = linearToSrgb(4.0767416621 * linearL - 3.3077115913 * linearM + 0.2309699292 * linearS);
	const green = linearToSrgb(-1.2684380046 * linearL + 2.6097574011 * linearM - 0.3413193965 * linearS);
	const blue = linearToSrgb(-0.0041960863 * linearL - 0.7034186147 * linearM + 1.707614701 * linearS);

	return { r: red, g: green, b: blue };
}

export function isOklchInSrgbGamut(color: OklchColor): boolean {
	const { r, g, b } = oklchToSrgb(color);
	const epsilon = 1e-7;
	return [r, g, b].every((channel) => channel >= -epsilon && channel <= 1 + epsilon);
}

export function fitOklchToSrgb(color: OklchColor): OklchColor {
	const normalizedColor = {
		l: clamp(color.l),
		c: Math.max(0, color.c),
		h: normalizeHue(color.h),
		a: clamp(color.a),
	};
	if (isOklchInSrgbGamut(normalizedColor)) return normalizedColor;

	let minimumChroma = 0;
	let maximumChroma = normalizedColor.c;
	for (let iteration = 0; iteration < 24; iteration++) {
		const chroma = (minimumChroma + maximumChroma) / 2;
		if (isOklchInSrgbGamut({ ...normalizedColor, c: chroma })) {
			minimumChroma = chroma;
		} else {
			maximumChroma = chroma;
		}
	}

	// Keep the four-decimal CSS representation inside sRGB as well. Rounding an
	// exact boundary value up could otherwise move the serialized color back out.
	const serializableChroma = Math.floor((minimumChroma + Number.EPSILON) * 10000) / 10000;
	return { ...normalizedColor, c: serializableChroma };
}

export function oklchToRgba(color: OklchColor): RgbaColor {
	const { r, g, b } = oklchToSrgb(color);
	return {
		r: Math.round(clamp(r) * 255),
		g: Math.round(clamp(g) * 255),
		b: Math.round(clamp(b) * 255),
		a: clamp(color.a),
	};
}

export function rgbaToOklch({ r, g, b, a }: RgbaColor): OklchColor {
	const red = srgbToLinear(clamp(r / 255));
	const green = srgbToLinear(clamp(g / 255));
	const blue = srgbToLinear(clamp(b / 255));

	const linearL = 0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue;
	const linearM = 0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue;
	const linearS = 0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue;
	const lPrime = Math.cbrt(linearL);
	const mPrime = Math.cbrt(linearM);
	const sPrime = Math.cbrt(linearS);

	const lightness = 0.2104542553 * lPrime + 0.793617785 * mPrime - 0.0040720468 * sPrime;
	const labA = 1.9779984951 * lPrime - 2.428592205 * mPrime + 0.4505937099 * sPrime;
	const labB = 0.0259040371 * lPrime + 0.7827717662 * mPrime - 0.808675766 * sPrime;
	const chroma = Math.sqrt(labA ** 2 + labB ** 2);
	const hue = chroma < 0.000001 ? 0 : normalizeHue((Math.atan2(labB, labA) * 180) / Math.PI);

	return { l: clamp(lightness), c: chroma, h: hue, a: clamp(a) };
}
