// @flow

import type { StyleSheetOf } from '../themes/colors';
import type { MarkdownStyles } from './styles';

import * as React from 'react';
import { Text, Linking, Alert } from 'react-native';
import * as SimpleMarkdown from 'simple-markdown';

import { urlRegex, paragraphRegex } from 'lib/shared/markdown';
import { normalizeURL } from 'lib/utils/url-utils';

type MarkdownRuleSpec = {|
  +simpleMarkdownRules: SimpleMarkdown.ParserRules,
  +emojiOnlyFactor: ?number,
|};
export type MarkdownRules = (
  styles: StyleSheetOf<MarkdownStyles>,
) => MarkdownRuleSpec;

function displayLinkPrompt(inputURL: string) {
  const url = normalizeURL(inputURL);
  const onConfirm = () => {
    Linking.openURL(url);
  };

  let displayURL = url.substring(0, 64);
  if (url.length > displayURL.length) {
    displayURL += '…';
  }

  Alert.alert(
    'External link',
    `You sure you want to open this link?\n\n${displayURL}`,
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Open', onPress: onConfirm },
    ],
    { cancelable: true },
  );
}

// Entry requires a seamless transition between Markdown and TextInput
// components, so we can't do anything that would change the position of text
function inlineMarkdownRules(
  styles: StyleSheetOf<MarkdownStyles>,
): MarkdownRuleSpec {
  const simpleMarkdownRules = {
    // Matches 'https://google.com' during parse phase and returns a 'link' node
    url: {
      ...SimpleMarkdown.defaultRules.url,
      // simple-markdown is case-sensitive, but we don't want to be
      match: SimpleMarkdown.inlineRegex(urlRegex),
    },
    // Matches '[Google](https://google.com)' during parse phase and handles
    // rendering all 'link' nodes, including for 'autolink' and 'url'
    link: {
      ...SimpleMarkdown.defaultRules.link,
      match: () => null,
      react(
        node: SimpleMarkdown.SingleASTNode,
        output: SimpleMarkdown.Output<SimpleMarkdown.ReactElement>,
        state: SimpleMarkdown.State,
      ) {
        const onPressLink = () => displayLinkPrompt(node.target);
        return (
          <Text key={state.key} style={styles.link} onPress={onPressLink}>
            {output(node.content, state)}
          </Text>
        );
      },
    },
    // Each line gets parsed into a 'paragraph' node. The AST returned by the
    // parser will be an array of one or more 'paragraph' nodes
    paragraph: {
      ...SimpleMarkdown.defaultRules.paragraph,
      // simple-markdown collapses multiple newlines into one, but we want to
      // preserve the newlines
      match: SimpleMarkdown.blockRegex(paragraphRegex),
      // eslint-disable-next-line react/display-name
      react: (
        node: SimpleMarkdown.SingleASTNode,
        output: SimpleMarkdown.Output<SimpleMarkdown.ReactElement>,
        state: SimpleMarkdown.State,
      ) => (
        <React.Fragment key={state.key}>
          {output(node.content, state)}
        </React.Fragment>
      ),
    },
    // This is the leaf node in the AST returned by the parse phase
    text: SimpleMarkdown.defaultRules.text,
  };
  return {
    simpleMarkdownRules,
    emojiOnlyFactor: null,
  };
}

// We allow the most markdown features for TextMessage, which doesn't have the
// same requirements as Entry
function fullMarkdownRules(
  styles: StyleSheetOf<MarkdownStyles>,
): MarkdownRuleSpec {
  const inlineRules = inlineMarkdownRules(styles);
  const simpleMarkdownRules = {
    ...inlineRules.simpleMarkdownRules,
    // Matches '<https://google.com>' during parse phase and returns a 'link'
    // node
    autolink: SimpleMarkdown.defaultRules.autolink,
    // Matches '[Google](https://google.com)' during parse phase and handles
    // rendering all 'link' nodes, including for 'autolink' and 'url'
    link: {
      ...inlineRules.simpleMarkdownRules.link,
      match: SimpleMarkdown.defaultRules.link.match,
    },
  };
  return {
    ...inlineRules,
    simpleMarkdownRules,
    emojiOnlyFactor: 2,
  };
}

export { inlineMarkdownRules, fullMarkdownRules };
