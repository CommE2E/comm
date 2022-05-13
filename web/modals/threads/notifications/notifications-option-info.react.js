// @flow

import classnames from 'classnames';
import * as React from 'react';

import SWMansionIcon from '../../../SWMansionIcon.react';
import css from './notifications-modal.css';

type Props = {
  +valid: boolean,
  +children: React.Node,
};

function NotificationsOptionInfo(props: Props): React.Node {
  const { valid, children } = props;

  const optionInfoClasses = React.useMemo(
    () =>
      classnames(css.optionInfo, {
        [css.optionInfoInvalid]: !valid,
      }),
    [valid],
  );

  const icon = React.useMemo(
    () => <SWMansionIcon icon={valid ? 'check' : 'cross'} size={12} />,
    [valid],
  );
  return (
    <div className={optionInfoClasses}>
      {icon}
      {children}
    </div>
  );
}

export default NotificationsOptionInfo;
