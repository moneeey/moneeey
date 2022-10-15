import { ReactElement, useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { Checkbox } from '../../components/base/Input';
import Loading from '../../components/Loading';
import { IAccount } from '../../entities/Account';
import useMoneeeyStore from '../../shared/useMoneeeyStore';
import Messages from '../../utils/Messages';

import DateGroupingSelector from './DateGroupingSelector';
import {
  AsyncProcessTransactionFn,
  PeriodGroups,
  ReportDataPoint,
  asyncProcessTransactionsForAccounts,
} from './ReportUtils';

import './BaseReport.less';
import { uniq } from 'lodash';

interface BaseReportProps {
  title: string;
  accounts: IAccount[];
  processFn: AsyncProcessTransactionFn;
  chartFn: (rows: ReportDataPoint[]) => ReactElement;
}

export const BaseReport = function ({ accounts, processFn, title, chartFn }: BaseReportProps) {
  const [rows, setRows] = useState([] as ReportDataPoint[]);
  const [selectedAccounts, setSelectedAccounts] = useState(accounts);
  const [period, setPeriod] = useState(PeriodGroups.Month);
  const [progress, setProgress] = useState(0);
  const moneeeyStore = useMoneeeyStore();
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-extra-semi
    (async () => {
      const currentRows = await asyncProcessTransactionsForAccounts({
        moneeeyStore,
        accounts: selectedAccounts.map((act) => act.account_uuid),
        processFn,
        period,
        setProgress,
      });
      setProgress(0);
      setRows(currentRows);
    })();
  }, [moneeeyStore, period, selectedAccounts]);

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
            data-test-id={`accountVisible_${account.account_uuid}`}
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
  );
};

const ChartColors = ['#BBE7FE', '#D3B5E5', '#FFD4DB', '#EFF1DB', '#FBE7C6', '#B4F8C8', '#A0E7E5', '#FFAEBC'];

export const BaseColumnChart = function ({ rows }: { rows: ReportDataPoint[] }) {
  let color = 0;
  const getColor = () => {
    color += 1;

    return ChartColors[color - 1];
  };

  const columns = uniq(rows.map((row) => row.y));
  const data = rows.map((row) => ({ x: row.x, [row.y]: row.value }));

  return (
    <section className='chartArea'>
      <ResponsiveContainer width='100%' height='100%' minHeight='42em'>
        <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <XAxis dataKey='x' />
          <Tooltip />
          <CartesianGrid stroke='#fafafa' strokeDasharray='3 3' />
          {columns.map((column) => (
            <Bar key={column} type='monotone' dataKey={column} fill={getColor()} stackId='a' />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </section>
  );
};

export const BaseLineChart = function ({ rows }: { rows: ReportDataPoint[] }) {
  let color = 0;
  const getColor = () => {
    color += 1;

    return ChartColors[color - 1];
  };

  const columns = uniq(rows.map((row) => row.y));
  const data = rows.map((row) => ({ x: row.x, [row.y]: row.value }));

  return (
    <section className='chartArea'>
      <ResponsiveContainer width='100%' height='100%' minHeight='42em'>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <XAxis dataKey='x' />
          <Tooltip />
          <CartesianGrid stroke='#fafafa' strokeDasharray='3 3' />
          {columns.map((column, index) => (
            <Line key={column} type='monotone' dataKey={column} stroke={getColor()} yAxisId={index} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </section>
  );
};
