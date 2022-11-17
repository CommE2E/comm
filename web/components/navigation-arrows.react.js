// @flow

import classnames from 'classnames';
import * as React from 'react';

import electron from '../electron.js';
import history from '../router-history.js';
import SWMansionIcon from '../SWMansionIcon.react.js';
import css from './navigation-arrows.css';

const stopDoubleClickPropagation = e => e.stopPropagation();

function NavigationArrows(): React.Node {
  const goBack = React.useCallback(
    () => history.getHistoryObject().goBack(),
    [],
  );
  const goForward = React.useCallback(
    () => history.getHistoryObject().goForward(),
    [],
  );

  const [disableBack, setDisableBack] = React.useState(false);
  const [disableFoward, setDisableForward] = React.useState(false);

  React.useEffect(
    () =>
      electron?.onNavigate(({ canGoBack, canGoForward }) => {
        setDisableBack(!canGoBack);
        setDisableForward(!canGoForward);
      }),
    [],
  );

  const goBackClasses = classnames(css.button, { [css.disabled]: disableBack });
  const goForwardClasses = classnames(css.button, {
    [css.disabled]: disableFoward,
  });

  return (
    <div className={css.container}>
      <a
        className={goBackClasses}
        onClick={goBack}
        onDoubleClick={stopDoubleClickPropagation}
      >
        <SWMansionIcon icon="arrow-left" size={24} />
      </a>
      <a
        className={goForwardClasses}
        onClick={goForward}
        onDoubleClick={stopDoubleClickPropagation}
      >
        <SWMansionIcon icon="arrow-right" size={24} />
      </a>
    </div>
  );
}

export default NavigationArrows;
