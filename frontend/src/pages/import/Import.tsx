import { observer } from 'mobx-react';
import { useState } from 'react';

import Tabs from '../../components/base/Tabs';
import { ImportTask } from '../../shared/import/ImportContent';
import useMoneeeyStore from '../../shared/useMoneeeyStore';
import useMessages from '../../utils/Messages';

import ImportProcess from './ImportProcessor';
import ImportStarter from './ImportStarter';

const Import = observer(() => {
  const Messages = useMessages();
  const [processing, setProcessing] = useState([] as ImportTask[]);
  const { config } = useMoneeeyStore();

  const closeImportTask = (task: ImportTask) =>
    setProcessing((prevProcessing) => prevProcessing.filter((p) => p.input.name !== task.input.name));

  return (
    <Tabs
      testId='importTabs'
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
              {task.input.name} <span onClick={() => closeImportTask(task)}>X</span>
            </span>
          ),
          children: <ImportProcess task={task} close={() => closeImportTask(task)} />,
        })),
      ]}
    />
  );
});

export { Import, Import as default };
