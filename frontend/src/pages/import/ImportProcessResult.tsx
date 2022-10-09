/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable react/display-name */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Table } from 'antd'
import { compact, identity, isEmpty, isNumber, map } from 'lodash'
import { Dispatch, SetStateAction } from 'react'

import { PrimaryButton } from '../../components/base/Button'
import { DangerText } from '../../components/base/Text'
import { AccountSelector } from '../../components/editor/AccountEditor'
import { TAccountUUID } from '../../entities/Account'
import { ITransaction } from '../../entities/Transaction'
import { ImportResult, ImportTask } from '../../shared/import/ImportContent'
import useMoneeeyStore from '../../shared/useMoneeeyStore'
import Messages from '../../utils/Messages'

const ImportProcessResult = ({
  task,
  result,
  setResult,
}: {
  task: ImportTask
  result: ImportResult
  setResult: Dispatch<SetStateAction<ImportResult>>
}) => {
  const moneeeyStore = useMoneeeyStore()

  const accountRender = (field: string) => (account_uuid: TAccountUUID, row: ITransaction) => {
    if (task.config.referenceAccount === account_uuid) {
      return <span>{moneeeyStore.accounts.nameForUuid(account_uuid)}</span>
    }

    return (
      <AccountSelector
        clearable
        title='Account'
        account={account_uuid}
        accounts={compact([
          ...map(result?.recommended_accounts[row.transaction_uuid], (cur_account_uuid) =>
            moneeeyStore.accounts.byUuid(cur_account_uuid)
          ),
          ...map(moneeeyStore.accounts.all),
        ])}
        onSelect={(new_account_uuid: TAccountUUID) =>
          setResult({
            ...result,
            transactions: map(result?.transactions, (t) =>
              t.transaction_uuid === row.transaction_uuid ? { ...t, [field]: new_account_uuid } : t
            ),
          })
        }
      />
    )
  }

  const onImport = () => {
    result.transactions.forEach((t) => moneeeyStore.transactions.merge(t))
    setResult({ ...result, transactions: [] })
  }

  return (
    <>
      {map(result.errors, (err) => (
        <p>
          <DangerText key={err.description}>
            {err.data} {err.description}
          </DangerText>
        </p>
      ))}
      <Table
        className='tableEditor'
        dataSource={result.transactions}
        rowKey='transaction_uuid'
        pagination={false}
        columns={[
          { dataIndex: 'date', title: Messages.util.date },
          {
            dataIndex: 'from_account',
            title: Messages.transactions.from_account,
            render: accountRender('from_account'),
          },
          {
            dataIndex: 'to_account',
            title: Messages.transactions.to_account,
            render: accountRender('to_account'),
          },
          { dataIndex: 'memo', title: Messages.transactions.memo },
          { dataIndex: 'from_value', title: Messages.transactions.amount },
        ].map((col) => ({
          ...col,
          render: (cellValue: any, row: ITransaction) => {
            let mode = 'New'
            let title = mode
            if (col.dataIndex) {
              const original = moneeeyStore.transactions.byUuid(row.transaction_uuid)
              if (original) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                const originalValue = (original as Record<string, any>)[col.dataIndex]
                if (!isEmpty(originalValue) || isNumber(originalValue)) {
                  const format = (value: string) =>
                    col.dataIndex.indexOf('_account') > 0 ? moneeeyStore.accounts.nameForUuid(value) : `${value}`
                  const changed = format(originalValue) !== format(cellValue)
                  if (changed) {
                    mode = Messages.import.updated
                    title = Messages.import.changed_description(format(originalValue), format(cellValue))
                  } else {
                    mode = Messages.import.unchanged
                    title = Messages.import.unchanged
                  }
                }
              }
            }
            const cell = (col.render || identity)(cellValue, row)

            return (
              <span className={`import${mode}`} title={title}>
                <>
                  {cell} {mode === 'Updated' ? <span className='newTag'>{mode}</span> : false}
                </>
              </span>
            )
          },
        }))}
      />
      <PrimaryButton onClick={onImport}>{Messages.import.import_transactions}</PrimaryButton>
    </>
  )
}

export { ImportProcessResult, ImportProcessResult as default }
