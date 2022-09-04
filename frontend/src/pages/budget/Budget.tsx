import { Button, Drawer, Form, Input, Select, Space, Typography } from 'antd'
import { map, range } from 'lodash'
import { observer } from 'mobx-react'
import { Dispatch, SetStateAction, useState } from 'react'
import { IBudget } from '../../entities/Budget'
import useMoneeeyStore from '../../shared/useMoneeeyStore'
import { formatDateMonth, startOfMonthOffset } from '../../utils/Date'
import Messages from '../../utils/Messages'

const BudgetPeriods = ({
  startingDate,
  setEditing,
}: {
  startingDate: Date
  setEditing: Dispatch<SetStateAction<IBudget | undefined>>
}) => (
  <section className="periods">
    {map(range(-1, 3), (offset) => (
      <BudgetPeriod
        key={offset}
        startingDate={startOfMonthOffset(startingDate, offset)}
        setEditing={setEditing}
      />
    ))}
  </section>
)

const BudgetPeriod = observer(
  ({
    startingDate,
    setEditing,
  }: {
    startingDate: Date
    setEditing: Dispatch<SetStateAction<IBudget | undefined>>
  }) => {
    const { budget } = useMoneeeyStore()
    return (
      <section className="period">
        <p>{formatDateMonth(startingDate)}</p>
        {budget.all.map((b) => (
          <p key={b.budget_uuid}>
            {b.name}{' '}
            <Typography.Link onClick={() => setEditing(b)}>
              Edit
            </Typography.Link>
          </p>
        ))}
      </section>
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
  const { budget, tags } = useMoneeeyStore()

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
      <Form>
        <Form.Item label="Name">
          <Input
            type="text"
            placeholder="Name"
            value={editing.name}
            onChange={({ target: { value: name } }) =>
              setEditing({ ...editing, name })
            }
          />
        </Form.Item>
        <Form.Item label="Tags">
          <Select
            mode="tags"
            placeholder="Tags"
            options={tags.all.map((t) => ({ label: t, value: t }))}
            value={editing.tags}
            onChange={(tags: string[]) => setEditing({ ...editing, tags })}
          />
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
  <Space className="control">
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
  const [startingDate, setStartingDate] = useState(() =>
    startOfMonthOffset(new Date(), 0)
  )
  const [editing, setEditing] = useState<IBudget | undefined>(undefined)
  const { budget } = useMoneeeyStore()
  const onNewBudget = () => setEditing(budget.factory())
  return (
    <section className="budgetArea">
      <MonthDateSelector date={startingDate} setDate={setStartingDate} />
      <BudgetPeriods startingDate={startingDate} setEditing={setEditing} />
      <BudgetEditor editing={editing} setEditing={setEditing} />
      <Button onClick={onNewBudget}>{Messages.budget.new}</Button>
    </section>
  )
})

export { Budget, Budget as default }
