// @flow

import classnames from 'classnames';
import * as React from 'react';

import Checkbox from './checkbox.react';
import EnumSettingsOptionInfo from './enum-settings-option-info.react.js';
import css from './enum-settings-option.css';
import Radio from './radio.react';

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

  const inputIcon = React.useMemo(
    () =>
      type === 'checkbox' ? (
        <Checkbox checked={selected} />
      ) : (
        <Radio checked={selected} />
      ),
    [type, selected],
  );

  const optionContainerClasses = React.useMemo(
    () =>
      classnames(css.optionContainer, {
        [css.optionContainerSelected]: selected,
      }),
    [selected],
  );

  const optionIconClasses = React.useMemo(
    () => classnames(css.optionIcon, iconPositionClassnames[iconPosition]),
    [iconPosition],
  );

  return (
    <div className={optionContainerClasses} onClick={onSelect}>
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
