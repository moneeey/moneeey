import { observer } from 'mobx-react'
import { useState } from 'react'
import { ImportTask } from '../../shared/import/ImportContent'
import useMoneeeyStore from '../../shared/useMoneeeyStore'
import ImportProcess from './ImportProcessor'
import ImportStarter from './ImportStarter'


const Import = observer(() => {
  const [processing, setProcessing] = useState([] as ImportTask[])
  const { config } = useMoneeeyStore()

  return (
    <div className="importArea">
      {config.loaded && <ImportStarter onTask={(task) => setProcessing([...processing.filter(p => p.input.name !== task.input.name), task])} configuration={config} />}
      {processing.map(task => <ImportProcess key={task.input.name} task={task} />)}
    </div>
  )
})

export { Import, Import as default }