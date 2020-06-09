// @flow

import type { StyleSheetOf } from '../themes/colors';
import type { MarkdownStyles } from '../themes/markdown-styles';

import * as React from 'react';
import { Text, Linking } from 'react-native';
import * as SimpleMarkdown from 'simple-markdown';

import { onlyEmojiRegex } from 'lib/shared/emojis';

export default function rules(styles: StyleSheetOf<MarkdownStyles>) {
  return {
    // simple-markdown uses autolink rule to catch links inside <>.
    // Autolink node is a node of link type, it will match links inside <>.
    // Inside of it's content will be text node, with target to be opened onPress
    // We don't need to specify how it should be transformed into output,
    // link will handle this
    autolink: SimpleMarkdown.defaultRules.autolink,
    // Link node is responsible for [title](actual link) links,
    // it is also type for autolink and url nodes, that are going through it
    // Content of this node is a text node, styled based on state.linkPresent
    // Link contains additional field target, opened on press
    link: {
      ...SimpleMarkdown.defaultRules.link,
      react(
        node: SimpleMarkdown.SingleASTNode,
        output: SimpleMarkdown.Output<SimpleMarkdown.ReactElement>,
        state: SimpleMarkdown.State,
      ) {
        // Setting state.linkPresent to true to mark that link is found,
        // then we need to make it false, so we know that it's ended.
        // In one message we might have normal text after link
        // we need this, to apply proper text style in text node.
        // We're doing this only here, autolink and url are going through link
        state.linkPresent = true;
        const onPressLink = () => {
          Linking.openURL(node.target);
        };
        const link = (
          <Text key={state.key} onPress={onPressLink}>
            {output(node.content, state)}
          </Text>
        );
        state.linkPresent = false;
        return link;
      },
    },
    // This is the main node, containing other nodes inside it's content.
    // If content is contains something more than just plain text,
    // it will be splited into separate nodes, with appropriate types -
    // for example text, then some link.
    // Paragraph style is responsible for wrapping message bubble over text
    paragraph: {
      ...SimpleMarkdown.defaultRules.paragraph,
      // eslint-disable-next-line react/display-name
      react: (
        node: SimpleMarkdown.SingleASTNode,
        output: SimpleMarkdown.Output<SimpleMarkdown.ReactElement>,
        state: SimpleMarkdown.State,
      ) => (
        <Text key={state.key} style={styles.paragraph}>
          {output(node.content, state)}
        </Text>
      ),
    },
    // Rule for increasing emoji size if it's the only thing in this message,
    // emojiOnly node contains text node inside, styled based on state.emojiOnly
    emojiOnly: {
      // this rule will be executed before text rule
      order: SimpleMarkdown.defaultRules.text.order - 0.5,
      match(source: string, state: SimpleMarkdown.State) {
        // If we captured something before, then it's not the only thing in message,
        // so we don't want to make it bigger and we're treating it like normal text
        return state.prevCapture == null ? onlyEmojiRegex.exec(source) : null;
      },
      parse: (capture: SimpleMarkdown.Capture) => ({
        type: 'emojiOnly',
        content: [
          {
            type: 'text',
            content: capture[0],
          },
        ],
      }),
      react(
        node: SimpleMarkdown.SingleASTNode,
        output: SimpleMarkdown.Output<string>,
        state: SimpleMarkdown.State,
      ) {
        state.emojiOnly = true;
        const emojiOnly = (
          <React.Fragment key={state.key}>
            {output(node.content, state)}
          </React.Fragment>
        );
        state.emojiOnly = false;
        return emojiOnly;
      },
    },
    // Rule to preserve our text style in simple messages
    // Text node contains text to be displayed in bubble,
    // it might be plain text, link or emoji.
    // We apply style based on state
    // Text node might be inside another node, it will contain additional data,
    // and we use this to determine which style to apply
    text: {
      ...SimpleMarkdown.defaultRules.text,
      react(
        node: SimpleMarkdown.SingleASTNode,
        output: SimpleMarkdown.Output<string>,
        state: SimpleMarkdown.State,
      ) {
        const textStyle = [styles.text];
        if (state.linkPresent) {
          textStyle.push(styles.link);
        } else if (state.emojiOnly) {
          textStyle.push(styles.emojiOnlyText);
        }

        return (
          <Text key={state.key} style={textStyle}>
            {node.content}
          </Text>
        );
      },
    },
    // Simple-markdown uses url rule to catch https inside text.
    // url node is a node of link type, it will match syntax with https.
    // Inside of it's content will be text node, with target to be opened onPress
    // We don't need to specify how it should be transformed into output,
    // link will handle this
    // We need custom match function, to match case-insensitive url
    url: {
      ...SimpleMarkdown.defaultRules.url,
      match: SimpleMarkdown.inlineRegex(
        /^(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/i,
      ),
    },
  };
}
