import { compact, head, map, uniqBy } from 'lodash';
import { observer } from 'mobx-react';

import { AccountKind, IAccount, TAccountUUID } from '../../entities/Account';
import { isTransaction } from '../../entities/Transaction';
import { IBaseEntity } from '../../shared/Entity';
import MappedStore from '../../shared/MappedStore';
import MoneeeyStore from '../../shared/MoneeeyStore';
import useMoneeeyStore from '../../shared/useMoneeeyStore';
import Select from '../base/Select';
import { TagsFrom, TagsTo } from '../Tags';

import { BaseEditor } from './BaseEditor';
import { EditorProps, EditorType, Row } from './EditorProps';

interface AccountEditorBaseProps<EntityType extends IBaseEntity>
  extends EditorProps<EntityType, TAccountUUID, TAccountUUID> {
  accounts: IAccount[];
  value: TAccountUUID;
  rev?: string;
  entity?: EntityType;
  clearable?: boolean;
}

const AccountEditorBase = observer(<EntityType extends IBaseEntity>(props: AccountEditorBaseProps<EntityType>) => {
  const { accounts, transactions } = useMoneeeyStore();
  const currentAccount = accounts.byUuid(props.value);
  const value = currentAccount?.account_uuid || '';
  const tags = accounts.accountTags(props.value).filter((t) => t !== currentAccount?.name);
  const TagsComponent = props.field.field === 'from_account' ? TagsFrom : TagsTo;
  const options = uniqBy(
    compact([
      ...map(props.accounts, (account) => ({
        label: account.name,
        value: account.account_uuid,
      })),
    ]),
    'value'
  );

  return (
    <div className='accountEditor'>
      <BaseEditor
        {...{
          ...props,
          value,
          rev: props.rev || '',
        }}
        Composed={(baseProps, onChange) => (
          <Select
            {...baseProps}
            options={options}
            onCreate={(name) => {
              const account = {
                ...accounts.factory(),
                kind: AccountKind.PAYEE,
                name,
              };
              const transaction = transactions.byUuid(props.entityId);
              if (transaction && isTransaction(transaction)) {
                const transaction_currencies = compact(
                  [transaction.from_account, transaction.to_account].map(
                    (account_uuid) => accounts.byUuid(account_uuid)?.currency_uuid
                  )
                );
                account.currency_uuid = head(transaction_currencies) || account.currency_uuid;
              }
              accounts.merge(account);
              onChange(undefined, account.account_uuid, undefined);
            }}
            onChange={(newValue) => {
              onChange(undefined, newValue, undefined);
            }}
            suffix={<TagsComponent tags={tags} />}
          />
        )}
      />
    </div>
  );
});

interface AccountSelectorProps {
  account: TAccountUUID;
  accounts: IAccount[];
  title: string;
  onSelect: (account: TAccountUUID) => void;
  clearable?: boolean;
}

export const AccountSelector = ({ account, accounts, onSelect, clearable, title }: AccountSelectorProps) => (
  <AccountEditorBase
    clearable={clearable}
    accounts={accounts}
    value={account}
    entityId={account}
    field={{
      editor: EditorType.ACCOUNT,
      field: 'selectorz',
      index: 0,
      title,
    }}
    onUpdate={(value) => {
      onSelect(value);

      return accounts[0];
    }}
    store={
      {
        byUuid: () => ({ selectorz: account } as unknown as IAccount),
      } as unknown as MappedStore<IAccount>
    }
  />
);

export const AccountEditor = observer(
  <EntityType extends IBaseEntity>(props: EditorProps<EntityType, TAccountUUID, TAccountUUID>) => {
    const { accounts } = useMoneeeyStore();
    const entity = props.store.byUuid(props.entityId);
    const value = entity?.[props.field.field] as TAccountUUID;

    return (
      <AccountEditorBase
        {...{
          ...props,
          accounts: accounts.all,
          value,
          rev: entity?._rev || '',
        }}
      />
    );
  }
);

export const AccountSorter =
  <EntityType extends IBaseEntity>(
    store: MappedStore<EntityType>,
    field: keyof EntityType,
    moneeeyStore: MoneeeyStore
  ) =>
  (a?: Row, b?: Row, asc?: boolean): number => {
    const entityA = store.byUuid(a?.entityId || '');
    const entityB = store.byUuid(b?.entityId || '');
    const acctUuidA = (entityA?.[field] as TAccountUUID | undefined) || '';
    const acctUuidB = (entityB?.[field] as TAccountUUID | undefined) || '';
    const av = moneeeyStore.accounts.nameForUuid(`${acctUuidA}`);
    const bv = moneeeyStore.accounts.nameForUuid(`${acctUuidB}`);

    return asc ? av.localeCompare(bv) : bv.localeCompare(av);
  };
