// @flow

import invariant from 'invariant';
import * as React from 'react';
import { Text } from 'react-native';

import type { ReactElement } from 'lib/shared/markdown';

import { TextMessageMarkdownContext } from '../chat/text-message-markdown-context';
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
    (messageKey &&
      parsedSpoilerIdentifier !== null &&
      spoilerRevealed[messageKey]?.[parsedSpoilerIdentifier]) ??
    false;

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

  // The idea is to break down the spoiler text into individual words,
  // and then encompass each word within a Text component, and
  // each text component within a GestureTouchableOpacity.
  // This is a way we can resolve the issue of long spoilers
  // breaking the layout of the message, as the spoiler would force
  // itself onto a new line if it exceeded the width of a text
  // message.

  // The conditional for {index !== arrayOfSpoilerText.length - 1 ? ' ' : ''}
  // is a way to not add a space after the last word in the spoiler text.

  // Sample text with nested markdown:
  // Hey this is a spoiler **and this is bold text**
  // This is converted to:
  // [
  //    "Hey this is a spoiler ",
  //    <Text style={{"fontWeight": "bold"}}>and this is bold text</Text>
  // ]

  // We split this ReactElement into an array of individual ReactElements
  // and then map over each individual ReactElement and return it
  // within a GestureTouchableOpacity.

  const componentsArray: ReactElement[] = React.useMemo(() => {
    return React.Children.map(text, (child, index) => {
      // If the element is a string, we split it into an array of words
      // and wrap each word in a Text within a GestureTouchableOpacity
      if (typeof child === 'string') {
        const words = child.split(' ');
        return words.map((word, wordIndex) => {
          return (
            <GestureTouchableOpacity
              key={`${index}-${wordIndex}`}
              onPress={onSpoilerClick}
            >
              <Text
                key={`${index}-${wordIndex}`}
                style={styleBasedOnSpoilerState}
              >
                {word}
                {wordIndex !== words.length - 1 ? ' ' : ''}
              </Text>
            </GestureTouchableOpacity>
          );
        });
      }
      // If it's a nested ReactElement,
      // we return it within a GestureTouchableOpacity.
      // We preserve the structure of the nested ReactElement
      // since we don't want to break the markdown.
      return (
        <GestureTouchableOpacity key={index} onPress={onSpoilerClick}>
          <Text key={index} style={styleBasedOnSpoilerState}>
            {child}
          </Text>
        </GestureTouchableOpacity>
      );
    });
  }, [text, onSpoilerClick, styleBasedOnSpoilerState]);

  return componentsArray;
}

const unboundStyles = {
  spoilerHidden: {
    color: 'spoiler',
    backgroundColor: 'spoiler',
  },
};

export default MarkdownSpoiler;
