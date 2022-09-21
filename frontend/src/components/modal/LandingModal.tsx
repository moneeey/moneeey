import { map } from 'lodash'
import { useEffect } from 'react'
import { NavigationModal } from '../../shared/Navigation'
import useMoneeeyStore from '../../shared/useMoneeeyStore'
import Messages from '../../utils/Messages'
import { getStorage, setStorage, StorageKind } from '../../utils/Utils'
import { useMoneeeyTour } from '../Tour'
import BaseModal from './BaseModal'

function LandingModal() {
  const { navigation } = useMoneeeyStore()
  const tour = useMoneeeyTour()
  useEffect(() => {
    if (getStorage('show_landing', 'true', StorageKind.PERMANENT) === 'true') {
      navigation.openModal(NavigationModal.LANDING)
    }
  }, [])
  return (
    <BaseModal
      modalId={NavigationModal.LANDING}
      title={Messages.modal.landing}
      onSubmit={() => {
        setStorage('show_landing', 'false', StorageKind.PERMANENT)
        navigation.closeModal()
        tour.open()
      }}
      cancelText={Messages.util.close}
      okText={Messages.modal.start_tour}
    >
      <ul>
        {map(Messages.landing.messages, (message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
    </BaseModal>
  )
}

export { LandingModal, LandingModal as default }
