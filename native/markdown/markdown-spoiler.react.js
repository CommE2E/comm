// @flow

import * as React from 'react';
import { Text } from 'react-native';

import type { ReactElement } from 'lib/shared/markdown';

import { MessageContext } from '../chat/message-context.react';
import { useStyles } from '../themes/colors';
import { MarkdownContext } from './markdown-context';

type MarkdownSpoilerProps = {
  +spoilerIdentifier: string | number | void,
  +text: ReactElement,
  +children?: React.Node,
};

function MarkdownSpoiler(props: MarkdownSpoilerProps): React.Node {
  const markdownContext = React.useContext(MarkdownContext);
  const messageContext = React.useContext(MessageContext);
  const styles = useStyles(unboundStyles);

  const { messageID } = messageContext;
  const { text, spoilerIdentifier } = props;

  const parsedSpoilerIdentifier = spoilerIdentifier
    ? parseInt(spoilerIdentifier)
    : -1;

  const setSpoilerRevealed = markdownContext?.setSpoilerRevealed;
  const spoilerRevealed = markdownContext?.spoilerRevealed;
  const setSpoilerPressActive = markdownContext?.setSpoilerPressActive;

  const styleBasedOnSpoilerState = React.useMemo(() => {
    return parsedSpoilerIdentifier &&
      spoilerRevealed?.[messageID]?.[parsedSpoilerIdentifier]
      ? null
      : styles.spoilerHidden;
  }, [
    parsedSpoilerIdentifier,
    spoilerRevealed,
    messageID,
    styles.spoilerHidden,
  ]);

  const onSpoilerClick = React.useCallback(() => {
    if (
      parsedSpoilerIdentifier &&
      spoilerRevealed?.[messageID]?.[parsedSpoilerIdentifier]
    ) {
      setSpoilerPressActive && setSpoilerPressActive(false);
      return;
    }

    if (
      spoilerRevealed &&
      setSpoilerRevealed &&
      messageID &&
      parsedSpoilerIdentifier
    ) {
      setSpoilerRevealed({
        ...spoilerRevealed,
        [messageID]: {
          ...spoilerRevealed[messageID],
          [parsedSpoilerIdentifier]: true,
        },
      });
    }
    setSpoilerPressActive && setSpoilerPressActive(true);
  }, [
    setSpoilerPressActive,
    spoilerRevealed,
    setSpoilerRevealed,
    messageID,
    parsedSpoilerIdentifier,
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
