import { Tag } from 'antd'
import React, { ReactNode } from 'react'

import { TagsRoute } from '../routes/TagsRoute'
import useMoneeeyStore from '../shared/useMoneeeyStore'

const TagColors: { [_group: string]: string } = {
  highlight: 'lightsalmon',
  memo: 'goldenrod',
  from: 'mediumturquoise',
  to: 'geekblue',
}

const HighlightTagContext = React.createContext({
  tag: '',
  setTag: (_v: string) => { _v }
})

interface ITagsProp {
  tags: string[];
}

interface IStyledTagsProp extends ITagsProp {
  color: string;
}

function TagsRenderer({ color, tags }: IStyledTagsProp) {
  const { tag, setTag } = React.useContext(HighlightTagContext)
  if (!setTag) throw new Error('Missing HighlightTagContext')
  const moneeeyStore = useMoneeeyStore()
  return (
    <span>
      {tags.map((t: string) => {
        return (
          <Tag
            key={t}
            color={TagColors[tag === t ? 'highlight' : color]}
            onMouseOver={() => setTag(t)}
            onMouseOut={() => setTag('')}
            title={'Click to filter'}
            onClick={(e) => {
              e.preventDefault()
              moneeeyStore.navigation.navigate(TagsRoute.tagsUrl(t))
            }}>
            #{t}
          </Tag>
        )
      })}
    </span>
  )
}

export function TagsMemo({ tags }: ITagsProp) {
  return <TagsRenderer color={'memo'} tags={tags} />
}
export function TagsFrom({ tags }: ITagsProp) {
  return <TagsRenderer color={'from'} tags={tags} />
}
export function TagsTo({ tags }: ITagsProp) {
  return <TagsRenderer color={'to'} tags={tags} />
}

export function TagsHighlightProvider({ children }: { children: ReactNode[] }) {
  const [tag, setTag] = React.useState('')
  return <HighlightTagContext.Provider value={{ tag, setTag }}>{children}</HighlightTagContext.Provider>
}
