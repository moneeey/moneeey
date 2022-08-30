import { format, formatISO, isValid, parse, isLastDayOfMonth as _isLastDayOfMonth, isFirstDayOfMonth as _isFirstDayOfMonth } from 'date-fns'

export type TDate = string;
export type TDateTime = string;

export const TDateFormat = 'yyyy-MM-dd'
export const TDateMonthFormat = 'MMM yyyy'

export const currentDate = () => formatDate(new Date())
export const currentDateTime = () => formatISO(new Date())

export const isLastDayOfMonth = (date: TDate) => _isFirstDayOfMonth(parseDate(date))
export const isFirstDayOfMonth = (date: TDate) => _isLastDayOfMonth(parseDate(date))

export const formatDateFmt = (date: Date, pattern: string) => format(date, pattern)
export const formatDateAs = (date: TDate, pattern: string) => formatDateFmt(parseDate(date), pattern)
export const formatDate = (date: Date) => format(date, TDateFormat)
export const formatDateMonth = (date: Date) => format(date, TDateMonthFormat)

export const parseDateFmt = (date: TDate, format: string) => parse(date, format, new Date())
export const parseDate = (date: TDate) => parseDateFmt(date, TDateFormat)

export const isValidDate = (date: Date) => isValid(date)

export const compareDates = (a: TDate, b: TDate) => parseDate(a).getTime() - parseDate(b).getTime()
