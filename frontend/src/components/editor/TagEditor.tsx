import { Select } from 'antd'
import _, { flattenDeep } from 'lodash'
import { observer } from 'mobx-react'
import useMoneeeyStore from '../../shared/useMoneeeyStore'

import { BaseSelectEditor } from './BaseSelectEditor'
import { EditorProps } from './EditorProps'

export const TagEditor = observer(
  <EntityType,>(props: EditorProps<EntityType, string[], string[]>) => {
    const { tags } = useMoneeeyStore()
    const entity = props.store.byUuid(props.entityId)
    const currentValue = entity?.[props.field.field]
    return (
      <BaseSelectEditor
        {...{
          ...props,
          value: currentValue,
          rev: entity?._rev,
          options: _(tags.all)
            .map(
              (tag) =>
                ({ label: tag, value: tag } as unknown as {
                  label: string
                  value: string[]
                })
            )
            .compact()
            .value(),
          ComposedProps: (
            onChange: (
              value?: string[],
              editorValue?: string[],
              additional?: object
            ) => void
          ) => ({
            onChange: (value: string[]) => onChange(flattenDeep([value])),
            onSelect: (value: string) =>
              onChange(flattenDeep([[value], [currentValue]])),
            mode: 'tags',
          }),
          ComposedInput: Select,
        }}
      />
    )
  }
)
