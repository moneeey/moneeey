import { observer } from 'mobx-react-lite';

import { TableEditor } from '../components/TableEditor';
import ConfigStore from '../entities/Config';

const ConfigTable = observer(({ config }: { config: ConfigStore }) => {
  return <TableEditor data-test-id='configTable' store={config} factory={() => config.factory()} creatable={false} />;
});

export { ConfigTable, ConfigTable as default };
