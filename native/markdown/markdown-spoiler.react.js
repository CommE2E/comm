// @flow

import invariant from 'invariant';
import * as React from 'react';
import { Text } from 'react-native';

import type { ReactElement } from 'lib/shared/markdown.js';

import { MarkdownContext } from './markdown-context.js';
import { MarkdownSpoilerContext } from './markdown-spoiler-context.js';
import { TextMessageMarkdownContext } from '../chat/text-message-markdown-context.js';
import { useStyles } from '../themes/colors.js';

type MarkdownSpoilerProps = {
  +spoilerIdentifier: string | number | void,
  +text: ReactElement,
  +children?: React.Node,
};

function MarkdownSpoiler(props: MarkdownSpoilerProps): React.Node {
  const markdownContext = React.useContext(MarkdownContext);
  invariant(markdownContext, 'MarkdownContext should be set');

  const textMessageMarkdownContext = React.useContext(
    TextMessageMarkdownContext,
  );

  const styles = useStyles(unboundStyles);

  const { text, spoilerIdentifier } = props;
  const { spoilerRevealed, setSpoilerRevealed } = markdownContext;
  const messageKey = textMessageMarkdownContext?.messageKey;

  const parsedSpoilerIdentifier = spoilerIdentifier
    ? parseInt(spoilerIdentifier)
    : null;

  const isRevealed =
    (!!messageKey &&
      parsedSpoilerIdentifier !== null &&
      spoilerRevealed[messageKey]?.[parsedSpoilerIdentifier]) ??
    false;

  const styleBasedOnSpoilerState = React.useMemo(() => {
    if (isRevealed) {
      return null;
    }
    return styles.spoilerHidden;
  }, [isRevealed, styles.spoilerHidden]);

  const markdownSpoilerContextValue = React.useMemo(
    () => ({
      isRevealed,
    }),
    [isRevealed],
  );

  const onSpoilerClick = React.useCallback(() => {
    if (isRevealed) {
      return;
    }

    if (messageKey && parsedSpoilerIdentifier !== null) {
      setSpoilerRevealed({
        ...spoilerRevealed,
        [messageKey]: {
          ...spoilerRevealed[messageKey],
          [parsedSpoilerIdentifier]: true,
        },
      });
    }
  }, [
    isRevealed,
    spoilerRevealed,
    setSpoilerRevealed,
    messageKey,
    parsedSpoilerIdentifier,
  ]);

  const memoizedSpoiler = React.useMemo(() => {
    return (
      <MarkdownSpoilerContext.Provider value={markdownSpoilerContextValue}>
        <Text onPress={onSpoilerClick} style={styleBasedOnSpoilerState}>
          {text}
        </Text>
      </MarkdownSpoilerContext.Provider>
    );
  }, [
    markdownSpoilerContextValue,
    onSpoilerClick,
    styleBasedOnSpoilerState,
    text,
  ]);

  return memoizedSpoiler;
}

const unboundStyles = {
  spoilerHidden: {
    color: 'spoiler',
    backgroundColor: 'spoiler',
  },
};

export default MarkdownSpoiler;
