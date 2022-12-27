import { ReactElement, useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';

import { Checkbox } from '../../components/base/Input';
import Loading from '../../components/Loading';
import { IAccount } from '../../entities/Account';
import useMoneeeyStore from '../../shared/useMoneeeyStore';
import Messages from '../../utils/Messages';

import DateGroupingSelector from './DateGroupingSelector';
import {
  AsyncProcessTransactionFn,
  NewReportDataMap,
  PeriodGroups,
  ReportDataMap,
  asyncProcessTransactionsForAccounts,
} from './ReportUtils';

import './BaseReport.less';

interface BaseReportProps {
  title: string;
  accounts: IAccount[];
  processFn: AsyncProcessTransactionFn;
  chartFn: (data: ReportDataMap) => ReactElement;
}

export const BaseReport = function ({ accounts, processFn, title, chartFn }: BaseReportProps) {
  const [data, setData] = useState(NewReportDataMap());
  const [selectedAccounts, setSelectedAccounts] = useState(accounts);
  const [period, setPeriod] = useState(PeriodGroups.Month);
  const [progress, setProgress] = useState(0);
  const moneeeyStore = useMoneeeyStore();
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-extra-semi
    (async () => {
      const currentData = await asyncProcessTransactionsForAccounts({
        moneeeyStore,
        accounts: selectedAccounts.map((act) => act.account_uuid),
        processFn,
        period,
        setProgress,
      });
      setProgress(0);
      setData(currentData);
    })();
  }, [moneeeyStore, period, selectedAccounts]);

  return (
    <>
      <h2>{title}</h2>
      <DateGroupingSelector setPeriod={setPeriod} period={period} />
      <Loading loading={progress !== 0} progress={progress}>
        {chartFn(data)}
      </Loading>
      <section className='includedAccountsArea'>
        {Messages.reports.include_accounts}
        {accounts.map((account) => (
          <Checkbox
            data-test-id={`accountVisible_${account.account_uuid}`}
            key={account.account_uuid}
            value={Boolean(selectedAccounts.find((act) => act.account_uuid === account.account_uuid))}
            onChange={(checked) =>
              setSelectedAccounts(
                selectedAccounts
                  .filter((act) => act.account_uuid !== account.account_uuid)
                  .concat(checked ? [account] : [])
              )
            }
            placeholder={account.name}>
            {account.name}
          </Checkbox>
        ))}
      </section>
    </>
  );
};

const ChartColorGenerator = () => {
  const colors = ['#FFAEBC', '#FBE7C6', '#BBE7FE', '#D3B5E5', '#FFD4DB', '#EFF1DB', '#B4F8C8', '#A0E7E5'];
  let index = 0;

  return () => {
    index += 1;
    index %= colors.length;

    return colors[index];
  };
};

interface ChartRenderProps {
  columns: string[];
  rows: object[];
  width: number;
  height: number;
}

const BaseChart = function ({
  data,
  Chart,
}: {
  data: ReportDataMap;
  Chart: (props: ChartRenderProps) => ReactElement;
}) {
  const columns = Array.from(data.columns.keys());
  const rows = Array.from(data.points.entries()).map(([date, points]) => ({ date, ...points }));

  return (
    <section className='chartArea'>
      <ResponsiveContainer width='100%' height='100%' minHeight='42em'>
        <Chart width={0} height={0} columns={columns} rows={rows} />
      </ResponsiveContainer>
    </section>
  );
};

export const BaseColumnChart = function ({ data }: { data: ReportDataMap }) {
  return (
    <BaseChart
      data={data}
      Chart={(props: ChartRenderProps) => {
        const nextColor = ChartColorGenerator();

        return (
          <BarChart
            width={props.width}
            height={props.height}
            data={props.rows}
            margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <XAxis dataKey='date' />
            <CartesianGrid stroke='#fafafa' strokeDasharray='3 3' />
            <Tooltip wrapperClassName='chartTooltip' />
            {props.columns.map((column) => (
              <Bar
                key={column}
                type='monotone'
                dataKey={column}
                fill={nextColor()}
                stackId='onlyonestackintheworldaaaaaaa'
              />
            ))}
          </BarChart>
        );
      }}
    />
  );
};

export const BaseLineChart = function ({ data }: { data: ReportDataMap }) {
  return (
    <BaseChart
      data={data}
      Chart={(props: ChartRenderProps) => {
        const nextColor = ChartColorGenerator();

        return (
          <LineChart
            width={props.width}
            height={props.height}
            data={props.rows}
            margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <XAxis dataKey='date' />
            <Tooltip wrapperClassName='chartTooltip' />
            <CartesianGrid stroke='#fafafa' strokeDasharray='3 3' />
            {props.columns.map((column, index) => (
              <Line key={column} type='monotone' dataKey={column} stroke={nextColor()} yAxisId={index} />
            ))}
          </LineChart>
        );
      }}
    />
  );
};
