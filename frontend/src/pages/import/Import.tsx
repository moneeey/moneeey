import { observer } from 'mobx-react'
import { useState } from 'react'

import Tabs from '../../components/base/Tabs'
import { ImportTask } from '../../shared/import/ImportContent'
import useMoneeeyStore from '../../shared/useMoneeeyStore'
import Messages from '../../utils/Messages'

import ImportProcess from './ImportProcessor'
import ImportStarter from './ImportStarter'

import './Import.less'

const Import = observer(() => {
  const [processing, setProcessing] = useState([] as ImportTask[])
  const { config } = useMoneeeyStore()

  return (
    <div className='importArea'>
      <Tabs
        data-test-id='importTabs'
        items={[
          {
            label: Messages.import.start,
            key: Messages.import.start,
            children: (
              <ImportStarter
                onTask={(task) =>
                  setProcessing((prevProcessing) => [
                    ...prevProcessing.filter((p) => p.input.name !== task.input.name),
                    task,
                  ])
                }
                configuration={config}
              />
            ),
          },
          ...processing.map((task) => ({
            key: task.input.name,
            label: (
              <span>
                {task.input.name}{' '}
                <span
                  className='importTaskClose'
                  onClick={() =>
                    setProcessing((prevProcessing) => prevProcessing.filter((p) => p.input.name !== task.input.name))
                  }>
                  X
                </span>
              </span>
            ),
            children: <ImportProcess task={task} />,
          })),
        ]}
      />
    </div>
  )
})

export { Import, Import as default }
