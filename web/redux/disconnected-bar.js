// @flow

import classNames from 'classnames';
import * as React from 'react';

import {
  useShouldShowDisconnectedBar,
  useDisconnectedBar,
} from 'lib/hooks/disconnected-bar.js';

import css from './disconnected-bar.css';

function DisconnectedBar(): React.Node {
  const { shouldShowDisconnectedBar } = useShouldShowDisconnectedBar();
  const [showing, setShowing] = React.useState(shouldShowDisconnectedBar);

  const barCause = useDisconnectedBar(setShowing);
  const isDisconnected = barCause === 'disconnected';
  const text = isDisconnected ? 'DISCONNECTED' : 'CONNECTING…';
  if (!showing) {
    return null;
  }

  const textClasses = classNames(css.bar, {
    [css.disconnected]: isDisconnected,
    [css.connecting]: !isDisconnected,
  });
  return <p className={textClasses}>{text}</p>;
}

export default DisconnectedBar;
