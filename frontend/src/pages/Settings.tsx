import { useState } from 'react'

import { PrimaryButton, SecondaryButton } from '../components/base/Button'
import { TextArea } from '../components/base/Input'
import Space from '../components/base/Space'
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
  const [backupRestoreState, setBackupRestoreState] = useState(BackupRestoreState.IDLE)
  const [content, setContent] = useState('')
  const moneeeyStore = useMoneeeyStore()

  const actionsDisabled =
    backupRestoreState !== BackupRestoreState.IDLE && backupRestoreState !== BackupRestoreState.COMPLETED

  const onBackupData = async () => {
    if (!actionsDisabled) {
      setBackupRestoreState(BackupRestoreState.BACKUP_LOADING)
      setContent(Messages.settings.backup_loading(0))
      const data = await moneeeyStore.persistence.exportAll((percentage) => {
        setContent(Messages.settings.backup_loading(percentage))
      })
      setContent(data)
      setBackupRestoreState(BackupRestoreState.COMPLETED)
    }
  }
  const onRestoreData = async () => {
    if (backupRestoreState === BackupRestoreState.RESTORE_INPUT) {
      setBackupRestoreState(BackupRestoreState.RESTORE_LOADING)
      const input = content
      setContent(Messages.settings.restore_loading(0))
      const { errors } = await moneeeyStore.persistence.restoreAll(input, (percentage) => {
        setContent(Messages.settings.restore_loading(percentage))
      })
      setContent([...errors, '', Messages.settings.reload_page].join('\n'))
      setBackupRestoreState(BackupRestoreState.COMPLETED)
    } else if (!actionsDisabled) {
      setBackupRestoreState(BackupRestoreState.RESTORE_INPUT)
      setContent(Messages.settings.restore_data_placeholder)
    }
  }

  const onClearData = () => {
    if (backupRestoreState === BackupRestoreState.CLEAR_INPUT) {
      if (content === Messages.settings.clear_data_token) {
        moneeeyStore.persistence.truncateAll()
        setContent(Messages.settings.reload_page)
      }
    } else if (!actionsDisabled) {
      setBackupRestoreState(BackupRestoreState.CLEAR_INPUT)
      setContent(Messages.settings.clear_data_placeholder)
    }
  }

  return (
    <section className='settingsArea'>
      <ConfigTable config={moneeeyStore.config} />
      <Space>
        <PrimaryButton onClick={onBackupData} disabled={actionsDisabled}>
          {Messages.settings.export_data}
        </PrimaryButton>
        <SecondaryButton
          onClick={onRestoreData}
          disabled={actionsDisabled && backupRestoreState !== BackupRestoreState.RESTORE_INPUT}>
          {Messages.settings.import_data}
        </SecondaryButton>
        <SecondaryButton
          onClick={onClearData}
          disabled={actionsDisabled && backupRestoreState !== BackupRestoreState.CLEAR_INPUT}>
          {Messages.settings.clear_all}
        </SecondaryButton>
        {backupRestoreState !== BackupRestoreState.IDLE && (
          <TextArea
            data-test-id='importExportOutput'
            value={content}
            onChange={({ target: { value } }) => setContent(value)}
            rows={30}
          />
        )}
      </Space>
    </section>
  )
}
