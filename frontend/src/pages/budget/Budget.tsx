import {
  Button,
  Card,
  Checkbox,
  Drawer,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
} from 'antd'
import { map, range } from 'lodash'
import { observer } from 'mobx-react'
import { Dispatch, SetStateAction, useEffect, useState } from 'react'
import { TableEditor } from '../../components/TableEditor'
import { IBudget } from '../../entities/Budget'
import { BudgetEnvelope } from '../../entities/BudgetEnvelope'
import { TCurrencyUUID } from '../../entities/Currency'
import useMoneeeyStore from '../../shared/useMoneeeyStore'
import {
  formatDate,
  formatDateMonth,
  startOfMonthOffset,
} from '../../utils/Date'
import Messages from '../../utils/Messages'

interface PeriodProps {
  startingDate: Date
  setEditing: Dispatch<SetStateAction<IBudget | undefined>>
  viewArchived: boolean
}

const BudgetPeriods = ({
  startingDate,
  setEditing,
  viewArchived,
  viewMonths,
}: PeriodProps & { viewMonths: number }) => (
  <div className="periods">
    {map(range(0, viewMonths), (offset) => (
      <BudgetPeriod
        key={offset}
        startingDate={startOfMonthOffset(startingDate, offset)}
        setEditing={setEditing}
        viewArchived={viewArchived}
      />
    ))}
  </div>
)

const BudgetPeriod = observer(
  ({ startingDate, setEditing, viewArchived }: PeriodProps) => {
    const { budget } = useMoneeeyStore()
    const starting = formatDate(startingDate)
    useEffect(() => {
      budget.makeEnvelopes(starting)
    }, [startingDate])
    const onNewBudget = () => setEditing(budget.factory())
    return (
      <Card className="period" title={formatDateMonth(startingDate)}>
        <TableEditor
          store={budget.envelopes}
          factory={budget.envelopes.factory}
          creatable={false}
          schemaFilter={(b) =>
            b.starting === starting && (!b.budget.archived || viewArchived)
          }
          context={{ name: (env: BudgetEnvelope) => setEditing(env.budget) }}
        />
        <Button onClick={onNewBudget}>{Messages.budget.new}</Button>
      </Card>
    )
  }
)

const BudgetEditor = ({
  editing,
  setEditing,
}: {
  editing?: IBudget
  setEditing: Dispatch<SetStateAction<IBudget | undefined>>
}) => {
  const { budget, tags, currencies } = useMoneeeyStore()

  const onClose = () => setEditing(undefined)
  const onSave = () => {
    if (editing) {
      budget.merge(editing)
      setEditing(undefined)
    }
  }

  return !editing ? (
    <div />
  ) : (
    <Drawer
      className="editor"
      title={editing.name || ''}
      width={500}
      placement="right"
      onClose={onClose}
      open={true}
      extra={
        <Space>
          <Button onClick={onClose}>{Messages.util.close}</Button>
          <Button onClick={onSave} type="primary">
            {Messages.budget.save}
          </Button>
        </Space>
      }
    >
      <Form layout="vertical">
        <Form.Item label={Messages.util.name}>
          <Input
            type="text"
            placeholder={Messages.util.name}
            value={editing.name}
            onChange={({ target: { value: name } }) =>
              setEditing({ ...editing, name })
            }
          />
        </Form.Item>
        <Form.Item label={Messages.util.currency}>
          <Select
            placeholder={Messages.util.currency}
            options={currencies.all.map((c) => ({
              label: c.name,
              value: c.currency_uuid,
            }))}
            value={editing.currency_uuid}
            onChange={(currency_uuid: TCurrencyUUID) =>
              setEditing({ ...editing, currency_uuid })
            }
          />
        </Form.Item>
        <Form.Item label={Messages.util.tags}>
          <Select
            mode="tags"
            placeholder={Messages.util.tags}
            options={tags.all.map((t) => ({ label: t, value: t }))}
            value={editing.tags}
            onChange={(tags: string[]) => setEditing({ ...editing, tags })}
          />
        </Form.Item>
        <Form.Item>
          <Checkbox
            value={editing.archived}
            onChange={({ target: { checked: archived } }) =>
              setEditing({ ...editing, archived })
            }
          >
            {Messages.util.archived}
          </Checkbox>
        </Form.Item>
      </Form>
    </Drawer>
  )
}

const MonthDateSelector = ({
  setDate,
  date,
}: {
  setDate: Dispatch<SetStateAction<Date>>
  date: Date
}) => (
  <Space>
    <Button onClick={() => setDate(startOfMonthOffset(date, -1))}>
      {Messages.budget.prev}
    </Button>
    {formatDateMonth(date)}
    <Button onClick={() => setDate(startOfMonthOffset(date, +1))}>
      {Messages.budget.next}
    </Button>
  </Space>
)

const Budget = observer(() => {
  const { config } = useMoneeeyStore()
  const [startingDate, setStartingDate] = useState(() =>
    startOfMonthOffset(new Date(), 0)
  )
  const [editing, setEditing] = useState<IBudget | undefined>(undefined)

  const viewMonths = config.main?.view_months || 3
  const viewArchived = config.main?.view_archived === true
  return (
    <section className="budgetArea">
      <Space className="control">
        <MonthDateSelector date={startingDate} setDate={setStartingDate} />
        <div className="divider" />
        {Messages.budget.show_months}
        <InputNumber
          placeholder={Messages.budget.show_months}
          value={viewMonths}
          onChange={(val) => config.merge({ ...config.main, view_months: val })}
        />
        <Checkbox
          checked={viewArchived}
          onChange={({ target: { checked } }) =>
            config.merge({ ...config.main, view_archived: checked })
          }
        >
          {Messages.budget.show_archived}
        </Checkbox>
      </Space>
      <BudgetPeriods
        startingDate={startingDate}
        setEditing={setEditing}
        viewArchived={viewArchived}
        viewMonths={viewMonths}
      />
      <BudgetEditor editing={editing} setEditing={setEditing} />
    </section>
  )
})

export { Budget, Budget as default }
