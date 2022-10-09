import { observer } from 'mobx-react';
import { useNavigate } from 'react-router-dom';

import useMoneeeyStore from '../shared/useMoneeeyStore';

const Navigator = () => {
  const { navigation } = useMoneeeyStore();
  const navigateTo = useNavigate();
  const Navigate = observer(() => {
    const toUrl = `${navigation.navigateTo}`;
    if (toUrl && toUrl !== '') {
      navigation.navigate('');
      setTimeout(() => {
        navigateTo(toUrl);
      }, 1);
    }

    return <div />;
  });

  return <Navigate />;
};

export { Navigator, Navigator as default };
