// @flow

import invariant from 'invariant';
import * as React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { TextStyle as FlattenedTextStyle } from 'react-native/Libraries/StyleSheet/StyleSheet';
import * as SimpleMarkdown from 'simple-markdown';
import tinycolor from 'tinycolor2';

import { onlyEmojiRegex } from 'lib/shared/emojis';

import type { TextStyle } from '../types/styles';
import type { MarkdownRules } from './rules.react';

type Props = {
  +style: TextStyle,
  +children: string,
  +rules: MarkdownRules,
  +threadColor?: string,
};
function Markdown(props: Props): React.Node {
  const { style, children, rules, threadColor } = props;
  const { simpleMarkdownRules, emojiOnlyFactor, container } = rules;

  const parser = React.useMemo(
    () => SimpleMarkdown.parserFor(simpleMarkdownRules),
    [simpleMarkdownRules],
  );
  const ast = React.useMemo(
    () => parser(children, { disableAutoBlockNewlines: true, container }),
    [parser, children, container],
  );

  const output = React.useMemo(
    () => SimpleMarkdown.outputFor(simpleMarkdownRules, 'react'),
    [simpleMarkdownRules],
  );

  const emojiOnly = React.useMemo(() => {
    if (emojiOnlyFactor === null || emojiOnlyFactor === undefined) {
      return false;
    }
    return onlyEmojiRegex.test(children);
  }, [emojiOnlyFactor, children]);
  const textStyle = React.useMemo(() => {
    if (
      !emojiOnly ||
      emojiOnlyFactor === null ||
      emojiOnlyFactor === undefined
    ) {
      return style;
    }
    const flattened: FlattenedTextStyle = (StyleSheet.flatten(style): any);
    invariant(
      flattened && typeof flattened === 'object',
      `Markdown component should have style`,
    );
    const { fontSize } = flattened;
    invariant(
      fontSize,
      `style prop should have fontSize if using emojiOnlyFactor`,
    );
    return { ...flattened, fontSize: fontSize * emojiOnlyFactor };
  }, [emojiOnly, style, emojiOnlyFactor]);

  const renderedOutput = React.useMemo(() => {
    const color = tinycolor(threadColor).darken(20).toString();
    return output(ast, { textStyle, container, color });
  }, [ast, output, textStyle, container, threadColor]);

  if (container === 'Text') {
    return <Text>{renderedOutput}</Text>;
  } else {
    return <View>{renderedOutput}</View>;
  }
}

export default Markdown;
