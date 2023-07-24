import _ from 'lodash';

import Select from '../../components/base/Select';

import { PeriodGroup, PeriodGroups } from './ReportUtils';

const DateGroupingSelector = function ({
  setPeriod,
  period,
}: {
  setPeriod: (newPeriod: PeriodGroup) => void;
  period: PeriodGroup;
}) {
  return (
    <Select
      testId='dateGroupingSelector'
      placeholder={period.label}
      options={_(_.values(PeriodGroups))
        .sortBy('order')
        .map((p) => ({ label: p.label, value: p.label }))
        .value()}
      value={period.label}
      onChange={(selectedLabel: string) => {
        const newPeriod = _.values(PeriodGroups).find((p) => p.label === selectedLabel);
        if (newPeriod) {
          setPeriod(newPeriod);
        }
      }}
    />
  );
};

export default DateGroupingSelector;
