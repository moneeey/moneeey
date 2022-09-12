import { Column } from '@ant-design/charts'
import { ReactElement, useEffect, useState } from 'react'
import Loading from '../../components/Loading'
import { IAccount } from '../../entities/Account'
import useMoneeeyStore from '../../shared/useMoneeeyStore'
import { DateGroupingSelector } from './DateGroupingSelector'
import {
  PeriodGroups,
  asyncProcessTransactionsForAccounts,
  AsyncProcessTransactionFn,
  ReportDataPoint,
} from './ReportUtils'

interface BaseReportProps {
  title: string
  accounts: IAccount[]
  processFn: AsyncProcessTransactionFn
  chartFn: (rows: ReportDataPoint[]) => ReactElement
}

export function BaseReport({
  accounts,
  processFn,
  title,
  chartFn,
}: BaseReportProps) {
  const [rows, setRows] = useState([] as ReportDataPoint[])
  const [period, setPeriod] = useState(PeriodGroups.Month)
  const [progress, setProgress] = useState(0)
  const moneeeyStore = useMoneeeyStore()
  useEffect(() => {
    ;(async () => {
      const rows = await asyncProcessTransactionsForAccounts({
        moneeeyStore,
        accounts: accounts.map((act) => act.account_uuid),
        processFn,
        period,
        setProgress,
      })
      setProgress(0)
      setRows(rows)
    })()
  }, [moneeeyStore, period, accounts])

  return (
    <>
      <h2>{title}</h2>
      <DateGroupingSelector setPeriod={setPeriod} period={period} />
      <Loading loading={progress !== 0} progress={progress}>
        {chartFn(rows)}
      </Loading>
    </>
  )
}

export function BaseColumnChart({ rows }: { rows: ReportDataPoint[] }) {
  return (
    <Column
      {...{
        data: rows,
        height: 400,
        yField: 'value',
        xField: 'x',
        seriesField: 'y',
        connectNulls: true,
        smooth: true,
        point: {
          size: 5,
          shape: 'diamond',
        },
      }}
    />
  )
}
