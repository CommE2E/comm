// @flow

import * as React from 'react';
import { useHistory } from 'react-router-dom';

function useScrollToTopOnNavigate(): void {
  const history = useHistory();

  return React.useEffect(() => {
    const unlisten = history.listen(() => {
      window.scrollTo(0, 0);
    });

    return () => {
      unlisten();
    };
  }, [history]);
}

export default useScrollToTopOnNavigate;
