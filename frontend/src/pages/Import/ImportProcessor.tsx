import { Button, Table, Typography } from 'antd'
import { compact, map } from 'lodash'
import { Dispatch, SetStateAction, useEffect, useState } from 'react'
import { AccountSelector } from '../../components/editor/AccountEditor'
import { TAccountUUID } from '../../entities/Account'
import { ITransaction } from '../../entities/Transaction'
import { ContentProcessor, ImportResult, ImportTask } from '../../shared/ImportContent'
import useMoneeeyStore from '../../shared/useMoneeeyStore'
import Messages from '../../utils/Messages'

function ImportProcessResult({ task, result, setResult }: { task: ImportTask, result: ImportResult, setResult: Dispatch<SetStateAction<ImportResult>> }) {
  const moneeeyStore = useMoneeeyStore()

  const accountRender = (field: string) => (account_uuid: TAccountUUID, row: ITransaction) => {
    if (task.config.referenceAccount === account_uuid) {
      return <span>{moneeeyStore.accounts.nameForUuid(account_uuid)}</span>
    }
    return <AccountSelector
      account={account_uuid}
      accounts={compact([
        ...map(result?.recommended_accounts[row.transaction_uuid], account_uuid => moneeeyStore.accounts.byUuid(account_uuid)),
        ...map(moneeeyStore.accounts.all)
      ])}
      onSelect={(account_uuid: TAccountUUID) => setResult({
        ...result,
        transactions: map(result?.transactions, t => t.transaction_uuid === row.transaction_uuid ? { ...t, [field]: account_uuid } : t)
      })} />
  }

  const onImport = () => {
    result.transactions.forEach(t => moneeeyStore.transactions.merge(t))
    setResult({ ...result, transactions: [] })
  }

  return (
    <>
      {map(result.errors, err => (
        <Typography.Text key={err.description} type='danger' title={err.data}>
          {err.description}
        </Typography.Text>))}
      <Table
        className="tableEditor"
        dataSource={result.transactions}
        rowKey="transaction_uuid"
        pagination={false}
        columns={[
          { dataIndex: 'date', title: 'Date' },
          { dataIndex: 'from_account', title: 'From', render: accountRender('from_account'), },
          { dataIndex: 'to_account', title: 'To', render: accountRender('to_account'), },
          { dataIndex: 'memo', title: 'Memo' },
          { dataIndex: 'from_value', title: 'Value' },
          { dataIndex: 'noop', title: 'Status', render: (_v, transaction: ITransaction) => result.is_updating.has(transaction.transaction_uuid) ? 'Update' : 'New' },
        ]} />
      <Button type='primary' onClick={onImport}>Import transactions</Button>
    </>
  )
}


function ImportProcess({ task }: { task: ImportTask }) {
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<ImportResult>(undefined as unknown as ImportResult)
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
          }],
          transactions: [],
          recommended_accounts: {},
          is_updating: new Set(),
        })
      }
    })()
  }, [task])

  return (
    <>
      <h4>{Messages.import.processing} <strong>{task.input.mode}</strong> {task.input.name} ({progress}%)</h4>
      {result && <ImportProcessResult {...{ task, result, setResult }} />}
    </>
  )
}

export { ImportProcess, ImportProcess as default }