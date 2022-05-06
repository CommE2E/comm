// @flow

import classnames from 'classnames';
import * as React from 'react';

import SWMansionIcon from '../../../SWMansionIcon.react';
import css from './notifications-modal.css';

type Props = {
  +active: boolean,
  +children: React.Node,
};

function NotificationsOptionInfo(props: Props): React.Node {
  const { active, children } = props;

  const optionInfoClasses = React.useMemo(
    () =>
      classnames(css.optionInfo, {
        [css.optionInfoFalse]: !active,
      }),
    [active],
  );

  const icon = React.useMemo(
    () => (
      <SWMansionIcon
        icon={active ? 'check' : 'cross'}
        size={12}
      ></SWMansionIcon>
    ),
    [active],
  );
  return (
    <div className={optionInfoClasses}>
      {icon}
      {children}
    </div>
  );
}

export default NotificationsOptionInfo;
