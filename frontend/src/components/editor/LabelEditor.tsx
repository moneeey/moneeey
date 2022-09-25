import { observer } from 'mobx-react'

import { EditorProps } from './EditorProps'
import { TextSorter } from './TextEditor'

export const LabelEditor = observer(<EntityType,>(props: EditorProps<EntityType, string, string>) => {
  const entity = props.store.byUuid(props.entityId)

  return <span>{entity?.[props.field.field]}</span>
})

export const LabelSorter = TextSorter
