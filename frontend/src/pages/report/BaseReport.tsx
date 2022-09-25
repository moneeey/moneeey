import { Column, Line } from '@ant-design/charts'
import { Checkbox } from 'antd'
import { ReactElement, useEffect, useState } from 'react'

import Loading from '../../components/Loading'
import { IAccount } from '../../entities/Account'
import useMoneeeyStore from '../../shared/useMoneeeyStore'
import Messages from '../../utils/Messages'

import { DateGroupingSelector } from './DateGroupingSelector'
import {
  AsyncProcessTransactionFn,
  PeriodGroups,
  ReportDataPoint,
  asyncProcessTransactionsForAccounts,
} from './ReportUtils'

interface BaseReportProps {
  title: string
  accounts: IAccount[]
  processFn: AsyncProcessTransactionFn
  chartFn: (rows: ReportDataPoint[]) => ReactElement
}

export const BaseReport = function ({ accounts, processFn, title, chartFn }: BaseReportProps) {
  const [rows, setRows] = useState([] as ReportDataPoint[])
  const [selectedAccounts, setSelectedAccounts] = useState(accounts)
  const [period, setPeriod] = useState(PeriodGroups.Month)
  const [progress, setProgress] = useState(0)
  const moneeeyStore = useMoneeeyStore()
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-extra-semi
    ;(async () => {
      const currentRows = await asyncProcessTransactionsForAccounts({
        moneeeyStore,
        accounts: selectedAccounts.map((act) => act.account_uuid),
        processFn,
        period,
        setProgress,
      })
      setProgress(0)
      setRows(currentRows)
    })()
  }, [moneeeyStore, period, selectedAccounts])

  return (
    <>
      <h2>{title}</h2>
      <DateGroupingSelector setPeriod={setPeriod} period={period} />
      <Loading loading={progress !== 0} progress={progress}>
        {chartFn(rows)}
      </Loading>
      <section className='includedAccountsArea'>
        {Messages.reports.include_accounts}
        {accounts.map((account) => (
          <Checkbox
            key={account.account_uuid}
            checked={Boolean(selectedAccounts.find((act) => act.account_uuid === account.account_uuid))}
            onChange={({ target: { checked } }) =>
              setSelectedAccounts(
                selectedAccounts
                  .filter((act) => act.account_uuid !== account.account_uuid)
                  .concat(checked ? [account] : [])
              )
            }>
            {account.name}
          </Checkbox>
        ))}
      </section>
    </>
  )
}

export const BaseColumnChart = function ({ rows, chartProps }: { rows: ReportDataPoint[]; chartProps?: object }) {
  return (
    <Column
      {...{
        data: rows,
        yField: 'value',
        xField: 'x',
        seriesField: 'y',
        connectNulls: true,
        smooth: true,
        ...chartProps,
      }}
    />
  )
}

export const BaseLineChart = function ({ rows, chartProps }: { rows: ReportDataPoint[]; chartProps?: object }) {
  return (
    <Line
      {...{
        data: rows,
        yField: 'value',
        xField: 'x',
        seriesField: 'y',
        connectNulls: true,
        smooth: true,
        ...chartProps,
      }}
    />
  )
}
