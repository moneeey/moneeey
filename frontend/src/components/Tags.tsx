import React, { ReactNode } from 'react'

import TagsRoute from '../routes/TagsRoute'
import useMoneeeyStore from '../shared/useMoneeeyStore'

import Tag from './base/Tag'

const TagColors: { [_group: string]: string } = {
  highlight: 'lightsalmon',
  memo: 'goldenrod',
  from: 'mediumturquoise',
  to: 'geekblue',
}

const HighlightTagContext = React.createContext({
  tag: '',
  setTag: (_v: string) => {
    // eslint-disable-next-line no-unused-expressions
    _v
  },
})

interface ITagsProp {
  tags: string[]
}

interface IStyledTagsProp extends ITagsProp {
  color: string
}

const TagsRenderer = function ({ color, tags }: IStyledTagsProp) {
  const { tag, setTag } = React.useContext(HighlightTagContext)
  if (!setTag) {
    throw new Error('Missing HighlightTagContext')
  }
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
            title={t}
            onClick={(e) => {
              e.preventDefault()
              moneeeyStore.navigation.navigate(TagsRoute.tagsUrl(t))
            }}
          />
        )
      })}
    </span>
  )
}

const TagsMemo = function ({ tags }: ITagsProp) {
  return <TagsRenderer color={'memo'} tags={tags} />
}
const TagsFrom = function ({ tags }: ITagsProp) {
  return <TagsRenderer color={'from'} tags={tags} />
}
const TagsTo = function ({ tags }: ITagsProp) {
  return <TagsRenderer color={'to'} tags={tags} />
}

const TagsHighlightProvider = function ({ children }: { children: ReactNode }) {
  const [tag, setTag] = React.useState('')

  return <HighlightTagContext.Provider value={{ tag, setTag }}>{children}</HighlightTagContext.Provider>
}

export { TagsMemo, TagsFrom, TagsTo, TagsHighlightProvider }
