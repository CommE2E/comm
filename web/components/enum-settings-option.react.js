// @flow

import classnames from 'classnames';
import * as React from 'react';

import Checkbox from './checkbox.react.js';
import EnumSettingsOptionInfo from './enum-settings-option-info.react.js';
import css from './enum-settings-option.css';
import Radio from './radio.react.js';

const iconPositionClassnames = {
  top: css.optionIconTop,
  center: css.optionIconCenter,
  bottom: css.optionIconBottom,
};

type InputType = 'radio' | 'checkbox';
type IconPosition = $Keys<typeof iconPositionClassnames>;

type Props = {
  +selected: boolean,
  +onSelect: () => void,
  +disabled?: boolean,
  +icon: React.Node,
  +title: string,
  +type?: InputType,
  +iconPosition?: IconPosition,
  +statements: $ReadOnlyArray<{
    +statement: string,
    +isStatementValid: boolean,
    +styleStatementBasedOnValidity: boolean,
  }>,
};

function EnumSettingsOption(props: Props): React.Node {
  const {
    icon,
    title,
    statements,
    selected,
    onSelect,
    disabled = false,
    type = 'radio',
    iconPosition = 'center',
  } = props;

  const descriptionItems = React.useMemo(
    () =>
      statements.map(
        ({ statement, isStatementValid, styleStatementBasedOnValidity }) => (
          <EnumSettingsOptionInfo
            key={statement}
            optionSelected={selected}
            valid={isStatementValid}
            styleStatementBasedOnValidity={styleStatementBasedOnValidity}
          >
            {statement}
          </EnumSettingsOptionInfo>
        ),
      ),
    [selected, statements],
  );

  const inputIcon = React.useMemo(() => {
    if (disabled) {
      return null;
    } else if (type === 'checkbox') {
      return <Checkbox checked={selected} />;
    } else if (type === 'radio') {
      return <Radio checked={selected} />;
    }
    return undefined;
  }, [disabled, type, selected]);

  const optionContainerClasses = classnames(css.optionContainer, {
    [css.optionContainerSelected]: selected,
  });

  const optionIconClasses = classnames(
    css.optionIcon,
    iconPositionClassnames[iconPosition],
  );

  return (
    <div
      className={optionContainerClasses}
      onClick={disabled ? null : onSelect}
    >
      <div className={optionIconClasses}>{icon}</div>
      <div className={css.optionContent}>
        <div className={css.optionTitle}>{title}</div>
        <div className={css.optionDescription}>{descriptionItems}</div>
      </div>
      {inputIcon}
    </div>
  );
}

export default EnumSettingsOption;
