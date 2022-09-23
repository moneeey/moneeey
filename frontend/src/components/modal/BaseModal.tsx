import { Modal, ButtonProps } from 'antd'
import { observer } from 'mobx-react'
import { ReactElement } from 'react'
import { NavigationModal } from '../../shared/Navigation'
import useMoneeeyStore from '../../shared/useMoneeeyStore'
import Messages from '../../utils/Messages'

interface BaseModalProps {
  modalId: NavigationModal
  title: string
  okText?: string
  cancelText?: string
  onSubmit: () => void
  children: ReactElement | ReactElement[]
}

const BaseModal = observer(
  ({
    title,
    modalId,
    onSubmit,
    okText,
    cancelText,
    children,
  }: BaseModalProps) => {
    const { navigation } = useMoneeeyStore()

    return (
      <Modal
        title={title}
        open={navigation.modal === modalId}
        onOk={onSubmit}
        okText={okText || Messages.util.ok}
        onCancel={() => navigation.closeModal()}
        cancelText={cancelText || Messages.util.cancel}
        okButtonProps={
          {
            ['data-test-id']: 'abc',
          } as ButtonProps
        }
      >
        {children}
      </Modal>
    )
  }
)

export { BaseModal, BaseModal as default }
