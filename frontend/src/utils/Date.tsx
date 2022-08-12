import { format, formatISO, isValid, parse } from 'date-fns'

export type TDate = string;
export type TDateTime = string;

export const TDateFormat = 'yyyy-MM-dd'

export const currentDate = () => formatDate(new Date())
export const currentDateTime = () => formatISO(new Date())

export const formatDateAs = (date: TDate, pattern: string) => format(parseDate(date), pattern)
export const formatDate = (date: Date) => format(date, TDateFormat)

export const parseDateFmt = (date: TDate, format: string) => parse(date, format, new Date())
export const parseDate = (date: TDate) => parseDateFmt(date, TDateFormat)

export const isValidDate = (date: Date) => isValid(date)

export const compareDates = (a: TDate, b: TDate) => parseDate(a).getTime() - parseDate(b).getTime()
