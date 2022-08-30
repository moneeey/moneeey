import { Button, Form, Input, Select, Typography } from 'antd'
import { add, startOfMonth } from 'date-fns'
import { map, range } from 'lodash'
import { observer } from 'mobx-react'
import { Dispatch, SetStateAction, useEffect, useState } from 'react'
import { TBudgetUUID } from '../../entities/Budget'
import useMoneeeyStore from '../../shared/useMoneeeyStore'
import { formatDateMonth } from '../../utils/Date'
import Messages from '../../utils/Messages'

const startOfMonthOffset = (date: Date, offset: number) =>
  startOfMonth(add(date, { months: offset }))

const BudgetPeriod = observer(
  ({
    startingDate,
    setEditingBudget,
  }: {
    startingDate: Date
    setEditingBudget: Dispatch<SetStateAction<TBudgetUUID>>
  }) => {
    const { budget } = useMoneeeyStore()
    return (
      <section className="period">
        <p>{formatDateMonth(startingDate)}</p>
        {budget.all.map((b) => (
          <p key={b.budget_uuid}>
            {b.name}{' '}
            <Typography.Link onClick={() => setEditingBudget(b.budget_uuid)}>
              Edit
            </Typography.Link>
          </p>
        ))}
      </section>
    )
  }
)

const BudgetEditor = observer(
  ({
    budget_uuid,
    setEditingBudget,
  }: {
    budget_uuid?: TBudgetUUID
    setEditingBudget: Dispatch<SetStateAction<TBudgetUUID>>
  }) => {
    const { budget, tags } = useMoneeeyStore()
    const [editing, setEditing] = useState(() => budget.factory())
    useEffect(() => {
      setEditing(budget.byUuid(budget_uuid) || editing)
    }, [budget_uuid, setEditing])
    return (
      <Form className="editor">
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
            value={editing.tags}
            onChange={(tags: string[]) => setEditing({ ...editing, tags })}
            options={tags.all.map((t) => ({ label: t, value: t }))}
          />
        </Form.Item>
        <Form.Item>
          <Button
            onClick={() => {
              budget.merge(editing)
              setEditing(budget.factory())
              setEditingBudget('')
            }}
          >
            {Messages.budget.save}
          </Button>
        </Form.Item>
      </Form>
    )
  }
)

const Budget = observer(() => {
  const [startingDate, setStartingDate] = useState(() =>
    startOfMonthOffset(new Date(), 0)
  )
  const [editingBudget, setEditingBudget] = useState('')
  return (
    <section className="budgetArea">
      <section className="control">
        <Button
          onClick={() => setStartingDate(startOfMonthOffset(startingDate, -1))}
        >
          {Messages.budget.prev}
        </Button>
        {formatDateMonth(startingDate)}
        <Button
          onClick={() => setStartingDate(startOfMonthOffset(startingDate, +1))}
        >
          {Messages.budget.next}
        </Button>
      </section>
      <section className="periods">
        {map(range(-1, 3), (offset) => (
          <BudgetPeriod
            key={offset}
            startingDate={startOfMonthOffset(startingDate, offset)}
            setEditingBudget={setEditingBudget}
          />
        ))}
      </section>
      <BudgetEditor
        budget_uuid={editingBudget}
        setEditingBudget={setEditingBudget}
      />
    </section>
  )
})

export { Budget, Budget as default }
