// @flow

import * as React from 'react';
import { Text } from 'react-native';

import type { ReactElement } from 'lib/shared/markdown';

import { MessageContext } from '../chat/message-context.react';
import { useStyles } from '../themes/colors';
import { MarkdownContext } from './markdown-context';

type MarkdownSpoilerProps = {
  +identifier: string | number | void,
  +text: ReactElement,
  +children?: React.Node,
};

function MarkdownSpoiler(props: MarkdownSpoilerProps): React.Node {
  const markdownContext = React.useContext(MarkdownContext);
  const messageContext = React.useContext(MessageContext);
  const styles = useStyles(unboundStyles);

  const { messageID } = messageContext;
  const { text, identifier } = props;

  const castedIdentifier = identifier ? parseInt(identifier) : identifier;

  const setSpoilerRevealed = markdownContext?.setSpoilerRevealed;
  const spoilerRevealed = markdownContext?.spoilerRevealed;
  const setSpoilerPressActive = markdownContext?.setSpoilerPressActive;

  const styleBasedOnSpoilerState = React.useMemo(() => {
    return castedIdentifier && spoilerRevealed?.[messageID]?.[castedIdentifier]
      ? null
      : styles.spoilerHidden;
  }, [castedIdentifier, spoilerRevealed, messageID, styles.spoilerHidden]);

  const onSpoilerClick = React.useCallback(() => {
    if (styleBasedOnSpoilerState === null) {
      setSpoilerPressActive && setSpoilerPressActive(false);
      return;
    }

    if (
      spoilerRevealed &&
      setSpoilerRevealed &&
      messageID &&
      castedIdentifier
    ) {
      setSpoilerRevealed({
        ...spoilerRevealed,
        [messageID]: {
          ...spoilerRevealed[messageID],
          [castedIdentifier]: true,
        },
      });
    }
    setSpoilerPressActive && setSpoilerPressActive(true);
  }, [
    styleBasedOnSpoilerState,
    setSpoilerPressActive,
    spoilerRevealed,
    setSpoilerRevealed,
    messageID,
    castedIdentifier,
  ]);

  const memoizedSpoiler = React.useMemo(() => {
    return (
      <Text onPress={onSpoilerClick} style={styleBasedOnSpoilerState}>
        {text}
      </Text>
    );
  }, [onSpoilerClick, styleBasedOnSpoilerState, text]);

  return memoizedSpoiler;
}

const unboundStyles = {
  spoilerHidden: {
    color: 'spoiler',
    backgroundColor: 'spoiler',
  },
};

export default MarkdownSpoiler;
