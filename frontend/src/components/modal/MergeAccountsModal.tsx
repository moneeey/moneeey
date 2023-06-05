import { useState } from 'react';

import { NavigationModal } from '../../shared/Navigation';
import Messages from '../../utils/Messages';
import { OkCancel } from '../base/Button';
import Modal from '../base/Modal';

import { TAccountUUID } from '../../entities/Account';
import useMoneeeyStore from '../../shared/useMoneeeyStore';
import { AccountSelector } from '../editor/AccountEditor';
import { VerticalSpace } from '../base/Space';
import { observer } from 'mobx-react-lite';

export const MergeAccountsModal = observer(function MergeAccountsModal() {
  const { navigation, accounts, transactions } = useMoneeeyStore();
  const [state, setState] = useState({ source_account: '', target_account: '' });

  const allAccounts = accounts.all;

  const mergeAccounts = (source_deleted: TAccountUUID, target_merged_into: TAccountUUID) => {
    transactions.replaceAccount(source_deleted, target_merged_into);
    const account = accounts.byUuid(source_deleted);
    if (account) {
      accounts.remove(account);
    }
  };

  const onMergeAccounts = () => {
    if (state.source_account && state.target_account) {
      mergeAccounts(state.source_account, state.target_account);
      navigation.closeModal();
      setState({ source_account: '', target_account: '' });
      navigation.success(Messages.merge_accounts.success);
    }
  };

  return (
    <Modal
      modalId={NavigationModal.MERGE_ACCOUNTS}
      title={Messages.modal.merge_accounts}
      footer={
        <OkCancel
          okTitle={Messages.merge_accounts.submit}
          onOk={() => onMergeAccounts()}
          onCancel={() => navigation.closeModal()}
        />
      }>
      <VerticalSpace>
        <span className='white-space-preline'>{Messages.merge_accounts.description}</span>
        <AccountSelector
          account={state.source_account}
          onSelect={(source_account) => setState({ ...state, source_account })}
          accounts={allAccounts}
          title={Messages.merge_accounts.source}
        />
        <AccountSelector
          account={state.target_account}
          onSelect={(target_account) => setState({ ...state, target_account })}
          accounts={allAccounts}
          title={Messages.merge_accounts.target}
        />
      </VerticalSpace>
    </Modal>
  );
});

export default MergeAccountsModal;
