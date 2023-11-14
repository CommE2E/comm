// @flow

import classNames from 'classnames';
import * as React from 'react';

import type { ConnectionInfo } from 'lib/types/socket-types.js';

import css from './status-indicator.css';

type Props = {
  +connectionInfo: ConnectionInfo,
};

function StatusIndicator(props: Props): React.Node {
  const { connectionInfo } = props;

  const isConnected = connectionInfo.status === 'connected';

  const outerClassName = classNames({
    [css.indicatorOuter]: true,
    [css.outerActive]: isConnected,
    [css.outerInactive]: !isConnected,
  });

  const innerClassName = classNames({
    [css.indicatorInner]: true,
    [css.innerActive]: isConnected,
    [css.innerInactive]: !isConnected,
  });

  return (
    <div className={outerClassName}>
      <div className={innerClassName} />
    </div>
  );
}

export default StatusIndicator;
