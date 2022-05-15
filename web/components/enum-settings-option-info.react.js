// @flow

import classnames from 'classnames';
import * as React from 'react';

import SWMansionIcon from '../SWMansionIcon.react';
import css from './enum-settings-option-info.css';

type Props = {
  +optionSelected: boolean,
  +valid: boolean,
  +children: React.Node,
};

function EnumSettingsOptionInfo(props: Props): React.Node {
  const { valid, children, optionSelected } = props;

  const optionInfoClasses = React.useMemo(
    () =>
      classnames({
        [css.optionInfo]: true,
        [css.optionInfoInvalid]: !valid,
        [css.optionInfoInvalidSelected]: !valid && optionSelected,
      }),
    [valid, optionSelected],
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

export default EnumSettingsOptionInfo;
