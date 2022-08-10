import { observer } from 'mobx-react'

import { EditorProps } from './EditorProps'

export const TransactionValueEditor = observer(<EntityType,>(props: EditorProps<EntityType, number, number>) => {
  const entity = props.store.byUuid(props.entityId)

  // const formatterForAccount = (account_uuid: TAccountUUID) => {
  // return (value: TMonetary) => {
  // const acct = moneeeyStore.accounts.byUuid(account_uuid);
  // if (acct) {
  // return moneeeyStore.currencies.formatByUuid(acct.currency_uuid, value);
  // } else {
  // return value;
  // }
  // };
  // };
  // 
  // let value;
  // const formatter_to_acct = formatterForAccount(row.to_account);
  // if (row.from_value === row.to_value) {
  // const color = row.to_account === referenceAccount ? 'green' : 'red';
  // value = <span style={{ color: color }}>{formatter_to_acct(row.to_value)}</span>;
  // } else {
  // const formatter_from_acct = formatterForAccount(row.from_account);
  // value = formatter_from_acct(row.from_value) + ' -> ' + formatter_to_acct(row.to_value);
  // }
  // return (
  // <>
  {/* {value} */}
  {/* </> */}
  // );
  return (
    <p>NotImplemented {entity}</p>
  )
})
