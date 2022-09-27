import {
  isFirstDayOfMonth as _isFirstDayOfMonth,
  isLastDayOfMonth as _isLastDayOfMonth,
  add,
  format,
  formatISO,
  isValid,
  parse,
  startOfMonth,
} from 'date-fns'

export type TDate = string
export type TDateTime = string

export const TDateFormat = 'yyyy-MM-dd'
export const TDateMonthFormat = 'MMM yyyy'

export const formatDate = (date: Date) => format(date, TDateFormat)
export const formatDateMonth = (date: Date) => format(date, TDateMonthFormat)

export const parseDateFmt = (date: TDate, formatPattern: string) => parse(date, formatPattern, new Date())
export const parseDate = (date: TDate) => parseDateFmt(date, TDateFormat)

export const currentDate = () => formatDate(new Date())
export const currentDateTime = () => formatISO(new Date())

export const isLastDayOfMonth = (date: TDate) => _isFirstDayOfMonth(parseDate(date))
export const isFirstDayOfMonth = (date: TDate) => _isLastDayOfMonth(parseDate(date))

export const formatDateFmt = (date: Date, pattern: string) => format(date, pattern)
export const formatDateAs = (date: TDate, pattern: string) => formatDateFmt(parseDate(date), pattern)

export const isValidDate = (date: Date) => isValid(date)

export const compareDates = (a: TDate, b: TDate) => parseDate(a).getTime() - parseDate(b).getTime()

export const startOfMonthOffset = (date: Date, offset: number) => startOfMonth(add(date, { months: offset }))
