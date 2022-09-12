import { Tabs } from 'antd'
import { observer } from 'mobx-react'
import { useState } from 'react'
import { ImportTask } from '../../shared/import/ImportContent'
import useMoneeeyStore from '../../shared/useMoneeeyStore'
import Messages from '../../utils/Messages'
import ImportProcess from './ImportProcessor'
import ImportStarter from './ImportStarter'

const Import = observer(() => {
  const [processing, setProcessing] = useState([] as ImportTask[])
  const { config } = useMoneeeyStore()

  return (
    <div className="importArea">
      <Tabs
        items={[
          {
            label: Messages.import.start,
            key: Messages.import.start,
            children: (
              <ImportStarter
                onTask={(task) =>
                  setProcessing([
                    ...processing.filter(
                      (p) => p.input.name !== task.input.name
                    ),
                    task,
                  ])
                }
                configuration={config}
              />
            ),
          },
          ...processing.map((task) => ({
            key: task.input.name,
            label: task.input.name,
            children: <ImportProcess task={task} />,
          })),
        ]}
      />
    </div>
  )
})

export { Import, Import as default }
