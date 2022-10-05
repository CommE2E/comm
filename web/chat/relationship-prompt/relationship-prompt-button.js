// @flow

import { type IconDefinition } from '@fortawesome/fontawesome-common-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import * as React from 'react';

import Button from '../../components/button.react';
import css from './relationship-prompt.css';

type Props = {
  +text: string,
  +icon: IconDefinition,
  +backgroundColor: string,
  +onClick: () => void,
};
function RelationshipPromptButton(props: Props): React.Node {
  const { text, icon, backgroundColor, onClick } = props;

  return (
    <Button
      variant="filled"
      buttonColor={{
        backgroundColor: `var(${backgroundColor})`,
        color: 'var(--relationship-button-text)',
      }}
      onClick={onClick}
      className={css.promptButton}
    >
      <FontAwesomeIcon icon={icon} className={css.promptIcon} />
      <p className={css.promptText}>{text}</p>
    </Button>
  );
}

export default RelationshipPromptButton;
