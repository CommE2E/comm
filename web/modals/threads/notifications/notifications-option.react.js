// @flow

import classnames from 'classnames';
import * as React from 'react';

import Radio from '../../../components/radio.react';
import css from './notifications-modal.css';
import NotificationsOptionInfo from './notifications-option-info.react';

type Props = {
  +active: boolean,
  +onSelect: () => void,
  +icon: React.Node,
  +title: string,
  +description: Array<[string, boolean]>,
};

function NotificationsOption(props: Props): React.Node {
  const { icon, title, description, active, onSelect } = props;

  const descriptionItems = React.useMemo(
    () =>
      description.map(([text, isActive]) => (
        <NotificationsOptionInfo key={text} active={isActive}>
          {text}
        </NotificationsOptionInfo>
      )),
    [description],
  );

  const optionContainerClasses = React.useMemo(
    () =>
      classnames(css.optionContainer, {
        [css.optionContainerActive]: active,
      }),
    [active],
  );
  return (
    <div className={optionContainerClasses} onClick={onSelect}>
      <div className={css.optionIcon}>{icon}</div>
      <div className={css.optionContent}>
        <div className={css.optionTitle}>{title}</div>
        <div className={css.optionDescription}>{descriptionItems}</div>
      </div>
      <Radio checked={active} />
    </div>
  );
}

export default NotificationsOption;
