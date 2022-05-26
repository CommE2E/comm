// @flow

import * as React from 'react';

import history from '../router-history.js';
import SWMansionIcon from '../SWMansionIcon.react.js';
import css from './navigation-arrows.css';

function NavigationArrows(): React.Node {
  const goBack = React.useCallback(
    () => history.getHistoryObject().goBack(),
    [],
  );
  const goForward = React.useCallback(
    () => history.getHistoryObject().goForward(),
    [],
  );

  return (
    <div className={css.container}>
      <a className={css.button} onClick={goBack}>
        <SWMansionIcon icon="arrow-left" size={24} />
      </a>
      <a className={css.button} onClick={goForward}>
        <SWMansionIcon icon="arrow-right" size={24} />
      </a>
    </div>
  );
}

export default NavigationArrows;
