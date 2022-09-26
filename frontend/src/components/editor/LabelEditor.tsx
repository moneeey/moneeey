import { observer } from 'mobx-react'

import { IBaseEntity } from '../../shared/Entity'

import { EditorProps } from './EditorProps'
import { TextSorter } from './TextEditor'

export const LabelEditor = observer(
  <EntityType extends IBaseEntity>(props: EditorProps<EntityType, string, string>) => {
    const entity = props.store.byUuid(props.entityId)
    const value = entity?.[props.field.field] as string

    return <span>{value}</span>
  }
)

export const LabelSorter = TextSorter
