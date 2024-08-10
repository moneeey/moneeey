import {
	isFirstDayOfMonth as _isFirstDayOfMonth,
	isLastDayOfMonth as _isLastDayOfMonth,
	add,
	differenceInSeconds,
	format,
	formatISO,
	isValid,
	parse,
	startOfMonth,
} from "date-fns";

export type TDate = string;
export type TDateTime = string;

export const TDateFormat = "yyyy-MM-dd";
export const TDateMonthFormat = "MMM yyyy";
export const TDateTimeFormat = "yyyy-MM-dd'T'HH:mm:ssXXX";

export const formatDate = (date: Date) => format(date, TDateFormat);
export const formatDateMonth = (date: Date) => format(date, TDateMonthFormat);

const parseCache = new Map<string, number>();

export const parseDateFmt = (date: TDate, formatPattern: string) => {
	const key = `${formatPattern}_${date}`;
	const cached = parseCache.get(key);
	if (cached !== undefined) {
		return new Date(cached);
	}

	const parsed = parse(date, formatPattern, new Date());
	parseCache.set(key, parsed.getTime());

	return parsed;
};

export const parseDate = (date: TDate) => parseDateFmt(date, TDateFormat);
export const parseDateTime = (date: TDateTime) =>
	parseDateFmt(date, TDateTimeFormat);
export const parseDateOrTime = (date: string) => {
	if (date) {
		if (date.length === TDateFormat.length) {
			return parseDate(date);
		}
		if (date.length === TDateTimeFormat.length) {
			return parseDateTime(date);
		}
	}

	return new Date();
};

export const currentDate = () => formatDate(new Date());
export const currentDateTime = () => formatISO(new Date());

export const isLastDayOfMonth = (date: TDate) =>
	_isFirstDayOfMonth(parseDate(date));
export const isFirstDayOfMonth = (date: TDate) =>
	_isLastDayOfMonth(parseDate(date));

export const formatDateFmt = (date: Date, pattern: string) =>
	format(date, pattern);
export const formatDateAs = (date: TDate, pattern: string) =>
	formatDateFmt(parseDate(date), pattern);

export const isValidDate = (date: Date) => isValid(date);

export const compareDates = (a: TDate, b: TDate) =>
	parseDate(a).getTime() - parseDate(b).getTime();
export const isDateGreater = (a: Date, b: Date) => a.getTime() >= b.getTime();
export const isDateLesser = (a: Date, b: Date) => a.getTime() <= b.getTime();
export const isDateBetween = (date: Date, min: Date, max: Date) =>
	isDateGreater(date, min) && isDateLesser(date, max);

export const startOfMonthOffset = (date: Date, offset: number) =>
	startOfMonth(add(date, { months: offset }));
export const dateDistanceInSecs = (a: Date, b: Date) =>
	Math.abs(differenceInSeconds(a, b));
export const addDay = (date: Date, offset: number) =>
	add(date, { days: offset });

export const MostCommonDateFormats = [
	"yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
	"yyyy-MM-dd HH:mm:ss.SSS'Z'",
	"yyyy-MM-dd'T'HH:mm:ss.SSS",
	"yyyy-MM-dd'T'HH:mm:ss.SSS",
	"yyyy-MM-dd'T'HH:mm:ss.SSSS",
	"yyyy-MM-dd HH:mm:ss.SSSS",
	"yyyy-MM-dd'T'HH:mm:ss'Z'",
	"yyyy-MM-dd HH:mm:ss.S'Z'",
	"yyyy-MM-dd'T'HH:mm:ss.SSS",
	"yyyy-MM-dd HH:mm:ss.SSS",
	"yyyyMMdd'T'HHmm'Z'.SSS'Z'",
	"yyyy-MM-dd'T'HH:mm:ss.S",
	"yyyy-MM-dd'T'HH:mm:ss'Z'",
	"yyyy-MM-dd'T'HH:mm:ss.SS",
	"yyyy-MM-dd'T'HH:mm:ss'Z'",
	"yyyy-MM-dd'T'HH:mm:ss'Z'",
	"yyyy-MM-dd HH:mm:ss.SS",
	"yyyy-MM-dd HH:mm:ss.SS",
	"yyyy-MM-dd HH:mm:ss.S",
	"yyyyMMdd'T'HHmmss.SS'Z'",
	"yyyy-MM-dd'T'HH:mm:ss.s",
	"yyyyMMdd'T'HHmmss.SS'Z'",
	"yyyy-MM-dd HH:mm:ss.S",
	"yyyyMMdd'T'HHmmss'Z'.S",
	"dd-MMM-yyyy HH:mm:ss",
	"yyyyMMdd'T'HHmmss.S'Z'",
	"yyyy-MM-dd'T'HH:mm:ss",
	"yyyy-MM-dd'T'HH:mm:ss",
	"yyyy.MM.dd HH:mm:ss",
	"dd/MM/yyyy HH:mm:ss",
	"MM/dd/yyyy HH:mm:ss",
	"yyyy-MM-dd HH:mm:ss",
	"yyyy-MM-dd'T'HH:mm:ss",
	"yyyyMMdd'T'HHmm'Z'.SS",
	"dd.MM.yyyy HH:mm:ss",
	"yyyyMMdd'T'HHmmSSS.SS",
	"dd/MM/yyyy HH'h'mm",
	"MM/dd/yyyy HH'h'mm",
	"yyyy-MM-dd HH'h'mm",
	"yyyy/MM/dd HH'h'mm",
	"dd.MM.yyyy HH'h'mm",
	"yyyyMMdd'T'HHmmss'Z'",
	"yyyyMMdd'T'HHmmss'Z'",
	"yyyyMMdd'T'HHmmss'Z'",
	"yyyyMMdd'T'HHmmss.SS",
	"yyyyMMdd'T'HHmmss.SS",
	"yyyyMMdd'T'HHmmss.S",
	"yy/MM/dd HH:mm:ss",
	"yyyyMMddHHmmss.SS",
	"dd/MM/yyyy HH:mm",
	"MM/dd/yyyy HH:mm",
	"yyyy-MM-dd HH:mm",
	"yyyy/MM/dd HH:mm",
	"dd.MM.yyyy HH:mm",
	"yyyyMMdd'T'HHmm'Z'",
	"yyyyMMdd'T'HHmm'Z'",
	"yyyy-MM-dd HH:mm",
	"yyyyMMdd'T'HHmm'Z'",
	"yyyyMMdd'T'HHmmSSS",
	"yyyyMMddHHmmSSS",
	"yyyyMMdd'T'HHmmSS",
	"yyyyMMdd'T'HHmmSS",
	"yyyyMMddHHmmSSS",
	"yyyyMMdd'T'HHmmSS",
	"MMMM dd, yyyy",
	"Do MMMM, yyyy",
	"yyyyMMdd'T'HHmm",
	"dd MMMM yyyy",
	"MMM dd, yyyy",
	"Do MMMM yyyy",
	"dd MMM yyyy",
	"MMMM dd, yy",
	"yyyy/MMM/dd",
	"MMM/dd/yyyy",
	"yyyy-MMM-dd",
	"MMM-dd-yyyy",
	"dd-MMM-yyyy",
	"MMM dd yyyy",
	"dd-MMM-yyyy",
	"yyyy-MM-dd",
	"MM/dd/yyyy",
	"dd/MM/yyyy",
	"yyyy/MM/dd",
	"MM-dd-yyyy",
	"dd-MM-yyyy",
	"yyyy.MM.dd",
	"dd.MM.yyyy",
	"MM.dd.yyyy",
	"dd MMMM yy",
	"MMM dd, yy",
	"MMMMddyyyy",
	"dd.MM.yyyy",
	"yyyy.MM.dd",
	"dd MMM yy",
	"ddMMMyyyy",
	"yyyyMMdd",
	"MM/dd/yy",
	"dd/MM/yy",
	"yy-MM-dd",
	"yy/MM/dd",
	"MM-dd-yy",
	"dd-MM-yy",
	"yyyyddd",
	"dd MMM",
	"MMM dd",
	"yyddd",
];
