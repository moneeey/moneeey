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
	"yyyy-MM-dd",
	"MM/dd/yyyy",
	"dd/MM/yyyy",
	"yyyy/MM/dd",
	"MM-dd-yyyy",
	"dd-MM-yyyy",
	"MMMM dd, yyyy",
	"dd MMMM yyyy",
	"MMM dd, yyyy",
	"dd MMM yyyy",
	"yyyy.MM.dd",
	"dd.MM.yyyy",
	"MM.dd.yyyy",
	"yyyyMMdd",
	"MM/dd/yy",
	"dd/MM/yy",
	"yy-MM-dd",
	"yy/MM/dd",
	"MM-dd-yy",
	"dd-MM-yy",
	"dd/MM/yyyy HH:MM",
	"MM/dd/yyyy HH:MM",
	"yyyy-MM-dd HH:MM",
	"yyyy/MM/dd HH:MM",
	"dd.MM.yyyy HH:MM",
	"MMMM dd, yy",
	"dd MMMM yy",
	"MMM dd, yy",
	"dd MMM yy",
	"yyyy-MM-ddTHH:MM:ss'Z'",
	"yyyy-MM-ddTHH:MM:ss.SSS'Z'",
	"yyyy-MM-ddTHH:MM:SS",
	"yyyyMMddTHHMMSS'Z'",
	"yyyy-MM-ddTHH:MM:ss.SSS",
	"yyyy/MMM/dd",
	"MMM/dd/yyyy",
	"yyyy-MMM-dd",
	"MMM-dd-yyyy",
	"yyyy-MM-dd HH:MM:ss.SSS",
	"yyyyMMddTHHMM'Z'",
	"yyyy-MM-dd'T'HH:mm:ss.SSSXXX",
	"yyyy-MM-dd HH:MM:ss.S",
	"Do MMMM yyyy",
	"ddMMMyyyy",
	"MMMMddyyyy",
	"yyyyddd",
	"yyddd",
	"yyyyMMddHHMMSSS",
	"yyyyMMddTHHMMSS.SS'Z'",
	"yyyy-MM-ddTHH:mm:ssXXX",
	"yyyyMMddTHHmmss'Z'",
	"yyyy-MM-ddTHH:MM:ss.s",
	"yyyy-MM-ddTHH:mm:ss",
	"yyyyMMddTHHMMSS",
	"yyyy-MM-ddTHH:MM:ss.SSSXXX",
	"yy/MM/dd HH:MM:ss",
	"Do MMMM, yyyy",
	"yyyyMMddTHHMMSS.SS'Z'",
	"yyyy-MM-ddTHH:MM:ss.SS",
	"yyyyMMddTHHMM",
	"yyyyMMddTHHMMSS",
	"yyyyMMddTHHMM'Z'",
	"yyyy-MM-dd HH:MM",
	"yyyy.MM.dd HH:MM:ss",
	"dd-MMM-yyyy",
	"yyyy-MM-ddTHH:MM:ss'Z'",
	"yyyy-MM-ddTHH:MM:SS'Z'",
	"yyyy-MM-dd'T'HH:mm:ss.SSS",
	"MMM dd yyyy",
	"yyyyMMddTHHMMSS'Z'",
	"yyyy-MM-dd HH:MM:ss.S",
	"yyyy-MM-dd HH:MM:ss.SS",
	"yyyyMMddTHHMM'Z'",
	"dd/MM/yyyy HH:MM:ss",
	"MM/dd/yyyy HH:MM:ss",
	"yyyy-MM-dd HH:MM:ss",
	"yyyyMMddHHMMSSS",
	"yyyyMMddTHHMMSS",
	"yyyy-MM-ddTHH:MM:SS",
	"yyyyMMddTHHMMSS.SS",
	"yyyy-MM-ddTHH:MM:ss.SSSS",
	"yyyyMMddHHMMSS.SS",
	"yyyyMMddTHHMMSS.SS",
	"yyyyMMddTHHMM'Z'.SS",
	"yyyyMMddTHHMMSS'Z'.S",
	"yyyy-MM-dd'T'HH:mm:ss.SSS",
	"dd.MM.yyyy HH:MM:ss",
	"dd.MM.yyyy",
	"yyyy.MM.dd",
	"dd-MMM-yyyy HH:MM:ss",
	"yyyy-MM-dd'T'HH:mm:ss.SSSXXX",
	"yyyy-MM-dd HH:MM:ss.SSSS",
	"dd-MMM-yyyy",
	"yyyyMMddTHHMM'Z'.SSS'Z'",
	"yyyyMMddTHHMMSS.S'Z'",
	"yyyy-MM-dd'T'HH:mm:ssXXX",
	"yyyy-MM-dd HH:MM:ss.SSS'Z'",
	"yyyy-MM-dd'T'HH:mm:ss'Z'",
	"yyyy-MM-dd'T'HH:mm:ss.S",
	"yyyy-MM-dd HH:MM:ss.SS",
	"yyyy-MM-dd HH:MM:ss.S'Z'",
	"yyyyMMddTHHMMSSS.SS",
	"yyyyMMddTHHMMSSS.S",
	"yyyy-MM-ddTHH:mm:ss.S.SS",
	"yyyyMMddTHHMMSSS",
	"dd MMM",
	"MMM dd",
];
