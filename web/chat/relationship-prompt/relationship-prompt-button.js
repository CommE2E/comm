// @flow

import { type IconDefinition } from '@fortawesome/fontawesome-common-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import * as React from 'react';

import Button, { type ButtonColor } from '../../components/button.react.js';
import css from './relationship-prompt.css';

type Props = {
  +text: string,
  +icon: IconDefinition,
  +buttonColor: ButtonColor,
  +onClick: () => void,
};
function RelationshipPromptButton(props: Props): React.Node {
  const { text, icon, buttonColor, onClick } = props;

  return (
    <Button
      variant="filled"
      buttonColor={buttonColor}
      onClick={onClick}
      className={css.promptButton}
    >
      <FontAwesomeIcon icon={icon} className={css.promptIcon} />
      <p className={css.promptText}>{text}</p>
    </Button>
  );
}

export default RelationshipPromptButton;
