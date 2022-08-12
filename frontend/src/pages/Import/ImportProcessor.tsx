import { Table, Typography } from 'antd'
import { map } from 'lodash'
import { useEffect, useState } from 'react'
import { TAccountUUID } from '../../entities/Account'
import { ContentProcessor, ImportResult, ImportTask } from '../../shared/ImportContent'
import useMoneeeyStore from '../../shared/useMoneeeyStore'
import Messages from '../../utils/Messages'


function ImportProcess({ task }: { task: ImportTask }) {
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<ImportResult | undefined>(undefined)
  const moneeeyStore = useMoneeeyStore()

  useEffect(() => {
    (async () => {
      const processor = ContentProcessor[task.input.mode]
      if (processor) {
        const onProgress = (tasks: number, tasksTotal: number) => setProgress(Math.round((1 - (tasks / tasksTotal)) * 10000) / 100)
        setResult(await processor(moneeeyStore, task, onProgress))
      } else {
        setResult({
          errors: [{
            data: task.input.name,
            description: Messages.import.unknown_mode(task.input.mode),
          }], transactions: []
        })
      }
    })()
  }, [task])

  const AccountRender = (account_uuid: TAccountUUID) => moneeeyStore.accounts.nameForUuid(account_uuid)

  return (
    <>
      <h4>{Messages.import.processing} <strong>{task.input.mode}</strong> {task.input.name} ({progress}%)</h4>
      {result && (
        <>
          {map(result.errors, err => (
            <Typography.Text key={err.description} type='danger' title={err.data}>
              {err.description}
            </Typography.Text>))}
          <Table
            dataSource={result.transactions}
            rowKey="transaction_uuid"
            pagination={false}
            columns={[
              { dataIndex: 'date', title: 'Date' },
              { dataIndex: 'from_account', title: 'From', render: AccountRender, },
              { dataIndex: 'to_account', title: 'To', render: AccountRender, },
              { dataIndex: 'memo', title: 'Memo' },
              { dataIndex: 'from_value', title: 'Value' },
            ]} />
        </>
      )}
    </>
  )
}

export { ImportProcess, ImportProcess as default }