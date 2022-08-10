import { Input, Select } from 'antd'
import _ from 'lodash'
import { observer } from 'mobx-react'
import { TAccountUUID } from '../../entities/Account'
import { IBaseEntity } from '../../shared/Entity'
import MappedStore from '../../shared/MappedStore'
import MoneeeyStore from '../../shared/MoneeeyStore'
import useMoneeeyStore from '../../shared/useMoneeeyStore'
import { Row } from '../TableEditor'
import { TagsFrom, TagsTo } from '../Tags'

import { BaseSelectEditor } from './BaseSelectEditor'
import { EditorProps } from './EditorProps'

export const AccountEditor = observer(<EntityType,>(props: EditorProps<EntityType, TAccountUUID, TAccountUUID>) => {
  const { accounts } = useMoneeeyStore()
  const entity = props.store.byUuid(props.entityId)
  const value = entity?.[props.field.field]
  const tags = accounts.accountTags(value)
  const TagsComponent = props.field.field === 'from_account' ? TagsFrom : TagsTo
  return (
    <Input.Group compact className="accountEditor">
      <BaseSelectEditor
        {...{
          ...props,
          value,
          rev: entity?._rev,
          options: _(accounts.all)
            .map((account) => ({ label: account.name, value: account.account_uuid }))
            .compact()
            .value(),
          ComposedProps: () => ({}),
          ComposedInput: Select
        }}
      />
      <TagsComponent tags={tags} />
    </Input.Group>
  )
})

export const AccountSorter = <EntityType extends IBaseEntity,>(store: MappedStore<EntityType>, field: keyof EntityType, moneeeyStore: MoneeeyStore) =>
  (a?: Row, b?: Row, asc?: boolean): number => {
    const entityA = store.byUuid(a?.entityId||'')
    const entityB = store.byUuid(b?.entityId||'')
    const av = moneeeyStore.accounts.nameForUuid('' + entityA?.[field] || '')
    const bv = moneeeyStore.accounts.nameForUuid('' + entityB?.[field] || '')
    return asc ? av.localeCompare(bv) : bv.localeCompare(av)
  }
