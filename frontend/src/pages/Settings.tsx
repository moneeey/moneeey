import { Button, Input } from 'antd'
import { useState } from 'react'
import useMoneeeyStore from '../shared/useMoneeeyStore'
import ConfigTable from '../tables/ConfigTable'
import Messages from '../utils/Messages'

enum BackupRestoreState {
  IDLE,
  BACKUP_LOADING,
  RESTORE_INPUT,
  RESTORE_LOADING,
  CLEAR_INPUT,
  COMPLETED,
}

export default function Settings() {
  const [backupRestoreState, setBackupRestoreState] = useState(
    BackupRestoreState.IDLE
  )
  const [content, setContent] = useState('')
  const moneeeyStore = useMoneeeyStore()

  const actionsDisabled =
    backupRestoreState !== BackupRestoreState.IDLE &&
    backupRestoreState !== BackupRestoreState.COMPLETED

  const onBackupData = () => {
    if (!actionsDisabled) {
      setBackupRestoreState(BackupRestoreState.BACKUP_LOADING)
      setContent(Messages.settings.backup_loading(0))
      ;(async () => {
        const { data } = await moneeeyStore.persistence.exportAll(
          (percentage) => {
            setContent(Messages.settings.backup_loading(percentage))
          }
        )
        setContent(data)
        setBackupRestoreState(BackupRestoreState.COMPLETED)
      })()
    }
  }
  const onRestoreData = () => {
    if (backupRestoreState === BackupRestoreState.RESTORE_INPUT) {
      setBackupRestoreState(BackupRestoreState.RESTORE_LOADING)
      ;(async () => {
        const input = content
        setContent(Messages.settings.restore_loading(0))
        const { errors } = await moneeeyStore.persistence.restoreAll(
          input,
          (percentage) => {
            setContent(Messages.settings.restore_loading(percentage))
          }
        )
        setContent(
          [...errors, '', 'Reload your page to refresh stores'].join('\n')
        )
        setBackupRestoreState(BackupRestoreState.COMPLETED)
      })()
    } else if (!actionsDisabled) {
      setBackupRestoreState(BackupRestoreState.RESTORE_INPUT)
      setContent(Messages.settings.restore_data_placeholder)
    }
  }

  const onClearData = () => {
    if (backupRestoreState === BackupRestoreState.CLEAR_INPUT) {
      if (content === Messages.settings.clear_data_token) {
        moneeeyStore.persistence.truncateAll()
        setContent('Reload your page')
      }
    } else if (!actionsDisabled) {
      setBackupRestoreState(BackupRestoreState.CLEAR_INPUT)
      setContent(Messages.settings.clear_data_placeholder)
    }
  }

  return (
    <section className="settingsArea">
      <ConfigTable config={moneeeyStore.config} />
      <p>
        <Button onClick={onBackupData} disabled={actionsDisabled}>
          Export data
        </Button>
        <Button
          onClick={onRestoreData}
          disabled={
            actionsDisabled &&
            backupRestoreState !== BackupRestoreState.RESTORE_INPUT
          }
        >
          Restore data
        </Button>
        <Button
          onClick={onClearData}
          disabled={
            actionsDisabled &&
            backupRestoreState !== BackupRestoreState.CLEAR_INPUT
          }
        >
          Clear data
        </Button>
        {backupRestoreState !== BackupRestoreState.IDLE && (
          <Input.TextArea
            value={content}
            onChange={({ target: { value } }) => setContent(value)}
            rows={30}
          />
        )}
      </p>
    </section>
  )
}
