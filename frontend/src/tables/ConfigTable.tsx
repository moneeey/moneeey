import { observer } from 'mobx-react-lite';

import FormEditor from '../components/FormEditor';
import ConfigStore from '../entities/Config';

const ConfigTable = observer(({ config }: { config: ConfigStore }) => {
  return <FormEditor data-test-id='configTable' store={config} entity={{ entityId: config.getUuid(config.main) }} />;
});

export { ConfigTable, ConfigTable as default };
