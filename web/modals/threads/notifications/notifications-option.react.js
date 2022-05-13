// @flow

import classnames from 'classnames';
import * as React from 'react';

import Radio from '../../../components/radio.react';
import css from './notifications-modal.css';
import NotificationsOptionInfo from './notifications-option-info.react';

type Props = {
  +selected: boolean,
  +onSelect: () => void,
  +icon: React.Node,
  +title: string,
  +description: $ReadOnlyArray<[string, boolean]>,
};

function NotificationsOption(props: Props): React.Node {
  const { icon, title, description, selected, onSelect } = props;

  const descriptionItems = React.useMemo(
    () =>
      description.map(([text, isValid]) => (
        <NotificationsOptionInfo key={text} valid={isValid}>
          {text}
        </NotificationsOptionInfo>
      )),
    [description],
  );

  const optionContainerClasses = React.useMemo(
    () =>
      classnames(css.optionContainer, {
        [css.optionContainerSelected]: selected,
      }),
    [selected],
  );
  return (
    <div className={optionContainerClasses} onClick={onSelect}>
      <div className={css.optionIcon}>{icon}</div>
      <div className={css.optionContent}>
        <div className={css.optionTitle}>{title}</div>
        <div className={css.optionDescription}>{descriptionItems}</div>
      </div>
      <Radio checked={selected} />
    </div>
  );
}

export default NotificationsOption;
