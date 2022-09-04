import { observer } from 'mobx-react'

import { EditorProps } from './EditorProps'
import { TextSorter } from './TextEditor'

export const LinkEditor = observer(
  <EntityType,>(props: EditorProps<EntityType, string, string>) => {
    const entity = props.store.byUuid(props.entityId)
    return (
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault()
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const ctxFunc = (props.context as unknown as any)?.[props.field.field]
          ctxFunc(entity)
        }}
      >
        {entity?.[props.field.field]}
      </a>
    )
  }
)

export const LinkSorter = TextSorter
