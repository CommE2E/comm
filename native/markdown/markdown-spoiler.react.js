// @flow

import * as React from 'react';
import { Text } from 'react-native';

import type { ReactElement } from 'lib/shared/markdown';

import { MessageContext } from '../chat/message-context.react';
import { useStyles } from '../themes/colors';
import { MarkdownContext } from './markdown-context';

type MarkdownSpoilerProps = {
  +text: ReactElement,
  +children?: React.Node,
};

function MarkdownSpoiler(props: MarkdownSpoilerProps): React.Node {
  const markdownContext = React.useContext(MarkdownContext);
  const messageContext = React.useContext(MessageContext);
  const styles = useStyles(unboundStyles);

  const { messageID, messageText } = messageContext;
  const text = props.text;

  const setSpoilerRevealed = markdownContext?.setSpoilerRevealed;
  const spoilerRevealed = markdownContext?.spoilerRevealed;
  const setSpoilerPressActive = markdownContext?.setSpoilerPressActive;

  const spoilerIndex = messageText?.indexOf(text.toString());

  const [styleBasedOnState, setStyleBasedOnState] = React.useState(
    spoilerIndex && spoilerRevealed?.[messageID]?.[spoilerIndex]
      ? null
      : styles.spoilerHidden,
  );

  const onSpoilerClick = React.useCallback(() => {
    if (styleBasedOnState === null) {
      setSpoilerPressActive && setSpoilerPressActive(false);
      return;
    }

    spoilerRevealed &&
      setSpoilerRevealed &&
      spoilerIndex &&
      setSpoilerRevealed({
        ...spoilerRevealed,
        [messageID]: { ...spoilerRevealed[messageID], [spoilerIndex]: true },
      });
    setSpoilerPressActive && setSpoilerPressActive(true);
    setStyleBasedOnState(null);
  }, [
    setSpoilerPressActive,
    spoilerRevealed,
    setSpoilerRevealed,
    messageID,
    spoilerIndex,
    styleBasedOnState,
  ]);

  const memoizedSpoiler = React.useMemo(() => {
    return (
      <Text onPress={onSpoilerClick} style={styleBasedOnState}>
        {text}
      </Text>
    );
  }, [onSpoilerClick, styleBasedOnState, text]);

  return memoizedSpoiler;
}

const unboundStyles = {
  spoilerHidden: {
    color: 'spoiler',
    backgroundColor: 'spoiler',
  },
};

export default MarkdownSpoiler;
