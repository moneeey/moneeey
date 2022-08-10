import { computed, makeObservable } from 'mobx'

import { EditorType } from '../components/editor/EditorProps'
import { TCurrencyUUID } from './Currency'
import { currentDateTime, TDate } from '../utils/Date'
import { EntityType, IBaseEntity } from '../shared/Entity'
import MappedStore from '../shared/MappedStore'
import { uuid } from '../utils/Utils'
import MoneeeyStore from '../shared/MoneeeyStore'

export type TAccountUUID = string;

export enum AccountType {
  CHECKING = 'CHECKING',
  CREDIT_CARD = 'CREDIT_CARD',
  PAYEE = 'PAYEE'
}

export interface IAccount extends IBaseEntity {
  account_uuid: TAccountUUID;
  currency_uuid: TCurrencyUUID;
  name: string;
  created: TDate;
  type: AccountType;
}

export class AccountStore extends MappedStore<IAccount> {
  constructor(moneeeyStore: MoneeeyStore) {
    super(
      moneeeyStore,
      (a: IAccount) => a.account_uuid,
      () => ({
        entity_type: EntityType.ACCOUNT,
        name: '',
        account_uuid: uuid(),
        tags: [],
        currency_uuid: moneeeyStore.currencies.all[0]?.currency_uuid,
        type: AccountType.CHECKING,
        created: currentDateTime(),
        updated: currentDateTime(),
      }),
      () => ({
        name: {
          title: 'Name',
          field: 'name',
          required: true,
          validate: (value: string) => {
            if (value.length < 2) return { valid: false, error: 'Please type a name' }
            return { valid: true }
          },
          index: 0,
          editor: EditorType.TEXT,
        },
        currency_uuid: {
          title: 'Currency',
          field: 'currency_uuid',
          required: true,
          editor: EditorType.CURRENCY,
          index: 1,
        },
        tags: {
          title: 'Tags',
          field: 'tags',
          index: 2,
          editor: EditorType.TAG,
        },
        created: {
          title: 'Created',
          field: 'created',
          readOnly: true,
          index: 3,
          editor: EditorType.DATE,
        },
      })
    )

    makeObservable(this, {
      allPayees: computed,
      allNonPayees: computed,
    })
  }

  get allPayees() {
    return this.all.filter((acct) => acct.type === AccountType.PAYEE)
  }

  get allNonPayees() {
    return this.all.filter((acct) => acct.type !== AccountType.PAYEE)
  }

  byName(name: string) {
    return this.all.filter((acct) => acct.name === name)[0]
  }

  uuidByName(name: string) {
    return this.byName(name).account_uuid
  }

  accountTags(account_uuid: TAccountUUID) {
    const acct = this.byUuid(account_uuid)
    if (acct) return acct.tags
    return []
  }

  nameForUuid(account_uuid: TAccountUUID) {
    const acct = this.byUuid(account_uuid)
    if (acct) return acct.name
    return ''
  }
}

export default AccountStore