import { CurrencyEditor, DateEditor, TextEditor } from '../components/editor/EntityEditor';
import { ICurrency, TCurrencyUUID } from './Currency';
import { currentDateTime, TDate } from './Date';
import { EntityType, IBaseEntity } from './Entity';
import MappedStore from './MappedStore';
import { uuid } from './Utils';

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

interface IAccountSchemaFactory {
  currencies: ICurrency[];
  type: AccountType;
}

export class AccountStore extends MappedStore<IAccount, IAccountSchemaFactory> {
  constructor() {
    super(
      (a) => a.account_uuid,
      (props) => ({
        entity_type: EntityType.ACCOUNT,
        name: '',
        account_uuid: uuid(),
        tags: [],
        currency_uuid: '',
        type: props.type,
        created: currentDateTime(),
        updated: currentDateTime(),
      }),
      (props) => ({
        name: {
          title: 'Name',
          field: 'name',
          required: true,
          validate: (value) => {
            if (value.length < 2) return { valid: false, error: 'Please type a name' };
            return { valid: true };
          },
          index: 0,
          renderer: TextEditor,
        },
        currency_uuid: {
          title: 'Currency',
          field: 'currency_uuid',
          required: true,
          currencies: props.currencies,
          index: 1,
          renderer: CurrencyEditor,
        },
        created: {
          title: 'Created',
          field: 'created',
          readOnly: true,
          index: 2,
          renderer: DateEditor,
        },
      })
    );
  }

  allPayees() {
    return this.all.filter((acct) => acct.type === AccountType.PAYEE);
  }

  allNonPayees() {
    return this.all.filter((acct) => acct.type !== AccountType.PAYEE);
  }

  byName(name: string) {
    return this.all.filter((acct) => acct.name === name)[0];
  }

  uuidByName(name: string) {
    return this.byName(name).account_uuid;
  }

  accountTags(account_uuid: TAccountUUID) {
    const acct = this.byUuid(account_uuid);
    if (acct) return acct.tags;
    return [];
  }
}
