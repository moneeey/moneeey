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
} from 'date-fns';

export type TDate = string;
export type TDateTime = string;

export const TDateFormat = 'yyyy-MM-dd';
export const TDateMonthFormat = 'MMM yyyy';
export const TDateTimeFormat = "yyyy-MM-dd'T'HH:mm:ssXXX";

export const formatDate = (date: Date) => format(date, TDateFormat);
export const formatDateMonth = (date: Date) => format(date, TDateMonthFormat);

export const parseDateFmt = (date: TDate, formatPattern: string) => parse(date, formatPattern, new Date());
export const parseDate = (date: TDate) => parseDateFmt(date, TDateFormat);
export const parseDateTime = (date: TDateTime) => parseDateFmt(date, TDateTimeFormat);
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

export const isLastDayOfMonth = (date: TDate) => _isFirstDayOfMonth(parseDate(date));
export const isFirstDayOfMonth = (date: TDate) => _isLastDayOfMonth(parseDate(date));

export const formatDateFmt = (date: Date, pattern: string) => format(date, pattern);
export const formatDateAs = (date: TDate, pattern: string) => formatDateFmt(parseDate(date), pattern);

export const isValidDate = (date: Date) => isValid(date);

export const compareDates = (a: TDate, b: TDate) => parseDate(a).getTime() - parseDate(b).getTime();
export const isDateGreater = (a: Date, b: Date) => a.getTime() >= b.getTime();
export const isDateLesser = (a: Date, b: Date) => a.getTime() <= b.getTime();
export const isDateBetween = (date: Date, min: Date, max: Date) => isDateGreater(date, min) && isDateLesser(date, max);

export const startOfMonthOffset = (date: Date, offset: number) => startOfMonth(add(date, { months: offset }));
export const dateDistanceInSecs = (a: Date, b: Date) => Math.abs(differenceInSeconds(a, b));
