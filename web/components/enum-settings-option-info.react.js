// @flow

import classnames from 'classnames';
import * as React from 'react';

import SWMansionIcon from 'lib/components/SWMansionIcon.react.js';

import css from './enum-settings-option-info.css';

type Props = {
  +optionSelected: boolean,
  +valid: boolean,
  +styleStatementBasedOnValidity: boolean,
  +children: React.Node,
};

function EnumSettingsOptionInfo(props: Props): React.Node {
  const { optionSelected, valid, styleStatementBasedOnValidity, children } =
    props;

  const optionInfoClasses = classnames({
    [css.optionInfo]: true,
    [css.optionInfoInvalid]: styleStatementBasedOnValidity && !valid,
    [css.optionInfoInvalidSelected]:
      styleStatementBasedOnValidity && !valid && optionSelected,
  });

  const icon = React.useMemo(() => {
    if (!styleStatementBasedOnValidity) {
      return null;
    }
    return <SWMansionIcon icon={valid ? 'check' : 'cross'} size={12} />;
  }, [styleStatementBasedOnValidity, valid]);
  return (
    <div className={optionInfoClasses}>
      {icon}
      {children}
    </div>
  );
}

export default EnumSettingsOptionInfo;
