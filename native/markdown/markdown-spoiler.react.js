// @flow

import * as React from 'react';
import { Text } from 'react-native';

import type { ReactElement } from 'lib/shared/markdown';

import { MessageContext } from '../chat/message-context.react';
import GestureTouchableOpacity from '../components/gesture-touchable-opacity.react';
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

  const setSpoilerRevealed = markdownContext?.setSpoilerRevealed;
  const spoilerRevealed = markdownContext?.spoilerRevealed;
  const parsedSpoilerIdentifier = spoilerIdentifier
    ? parseInt(spoilerIdentifier)
    : -1;

  const isRevealed =
    spoilerRevealed?.[messageID]?.[parsedSpoilerIdentifier] ?? false;

  const styleBasedOnSpoilerState = React.useMemo(() => {
    if (isRevealed) {
      return null;
    }
    return styles.spoilerHidden;
  }, [isRevealed, styles.spoilerHidden]);

  const onSpoilerClick = React.useCallback(() => {
    if (isRevealed) {
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
  }, [
    isRevealed,
    spoilerRevealed,
    setSpoilerRevealed,
    messageID,
    parsedSpoilerIdentifier,
  ]);

  const memoizedSpoiler = React.useMemo(() => {
    return (
      <GestureTouchableOpacity onPress={onSpoilerClick}>
        <Text style={styleBasedOnSpoilerState}>{text}</Text>
      </GestureTouchableOpacity>
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
