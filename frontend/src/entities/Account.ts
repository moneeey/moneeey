import { computed, makeObservable } from 'mobx';

import { EditorType } from '../components/editor/EditorProps';

import { TDate, currentDateTime } from '../utils/Date';
import { EntityType, IBaseEntity } from '../shared/Entity';
import MappedStore from '../shared/MappedStore';
import { uuid } from '../utils/Utils';
import MoneeeyStore from '../shared/MoneeeyStore';
import Messages from '../utils/Messages';

import { TCurrencyUUID } from './Currency';

export type TAccountUUID = string;

export enum AccountKind {
  CHECKING = 'CHECKING',
  INVESTMENT = 'INVESTMENT',
  SAVINGS = 'SAVINGS',
  CREDIT_CARD = 'CREDIT_CARD',
  PAYEE = 'PAYEE',
}

export interface IAccount extends IBaseEntity {
  account_uuid: TAccountUUID;
  currency_uuid: TCurrencyUUID;
  name: string;
  created: TDate;
  kind: AccountKind;
  offbudget: boolean;
  archived: boolean;
}

export class AccountStore extends MappedStore<IAccount> {
  constructor(moneeeyStore: MoneeeyStore) {
    super(moneeeyStore, {
      getUuid: (a: IAccount) => a.account_uuid,
      factory: (id?: string) => ({
        entity_type: EntityType.ACCOUNT,
        name: '',
        account_uuid: id || uuid(),
        tags: [],
        offbudget: false,
        archived: false,
        currency_uuid: moneeeyStore.currencies.all[0]?.currency_uuid,
        kind: AccountKind.CHECKING,
        created: currentDateTime(),
        updated: currentDateTime(),
      }),
      schema: () => ({
        name: {
          title: Messages.util.name,
          field: 'name',
          required: true,
          validate: (value: string) => {
            if (value.length < 2) {
              return { valid: false, error: 'Please type a name' };
            }

            return { valid: true };
          },
          index: 0,
          editor: EditorType.TEXT,
        },
        currency_uuid: {
          title: Messages.util.currency,
          field: 'currency_uuid',
          required: true,
          editor: EditorType.CURRENCY,
          index: 1,
        },
        tags: {
          title: Messages.util.tags,
          field: 'tags',
          index: 2,
          editor: EditorType.TAG,
        },
        kind: {
          title: Messages.account.account_kind,
          field: 'kind',
          index: 3,
          editor: EditorType.ACCOUNT_TYPE,
        },
        offbudget: {
          title: Messages.account.offbudget,
          field: 'offbudget',
          index: 4,
          editor: EditorType.CHECKBOX,
        },
        archived: {
          title: Messages.util.archived,
          field: 'archived',
          index: 5,
          editor: EditorType.CHECKBOX,
        },
        created: {
          title: Messages.util.created,
          field: 'created',
          readOnly: true,
          index: 6,
          editor: EditorType.DATE,
        },
      }),
    });

    makeObservable(this, {
      allPayees: computed,
      allNonPayees: computed,
    });
  }

  merge(item: IAccount, options: { setUpdated: boolean } = { setUpdated: true }) {
    super.merge(item, options);
    this.moneeeyStore.tags.register(item.name);
  }

  get allPayees() {
    return this.all.filter((acct) => acct.kind === AccountKind.PAYEE);
  }

  get allNonPayees() {
    return this.all.filter((acct) => acct.kind !== AccountKind.PAYEE);
  }

  byName(name: string) {
    return this.all.filter((acct) => acct.name === name)[0];
  }

  uuidByName(name: string) {
    return this.byName(name).account_uuid;
  }

  accountTags(account_uuid: TAccountUUID) {
    const acct = this.byUuid(account_uuid);
    if (acct) {
      const currencyTags = this.moneeeyStore.currencies.currencyTags(acct.currency_uuid);

      return [acct.name, ...acct.tags, ...currencyTags];
    }

    return [];
  }

  nameForUuid(account_uuid: TAccountUUID) {
    const acct = this.byUuid(account_uuid);
    if (acct) {
      return acct.name;
    }

    return '';
  }

  isArchived(account_uuid: TAccountUUID): boolean {
    const acct = this.byUuid(account_uuid);
    if (acct) {
      return acct.archived === true;
    }

    return true;
  }

  isOffBudget(account_uuid: TAccountUUID): boolean {
    const acct = this.byUuid(account_uuid);
    if (acct) {
      return acct.offbudget === true;
    }

    return true;
  }
}

export default AccountStore;
