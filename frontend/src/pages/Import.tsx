import { useState } from 'react'
import { ImportTask } from '../shared/ImportContent'
import ImportProcess from './Import/ImportProcessor'
import ImportStarter from './Import/ImportStarter'


function Import() {
  const [processing, setProcessing] = useState([] as ImportTask[])

  return (
    <div className="importArea">
      <ImportStarter onTask={(task) => setProcessing([...processing.filter(p => p.input.name !== task.input.name), task])} />
      {processing.map(task => <ImportProcess key={task.input.name} task={task} />)}
    </div>
  )
}

export { Import, Import as default }