import { format, formatISO, parse } from 'date-fns'

export type TDate = string;
export type TDateTime = string;

const TDateFormat = 'yyyy-MM-dd'

export const currentDate = () => formatDate(new Date())
export const currentDateTime = () => formatISO(new Date())

export const formatDateAs = (date: TDate, pattern: string) => format(parseDate(date), pattern)
export const formatDate = (date: Date) => format(date, TDateFormat)

export const parseDate = (date: TDate) => parse(date, TDateFormat, new Date())

export const compareDates = (a: TDate, b: TDate) => parseDate(a).getTime() - parseDate(b).getTime()
