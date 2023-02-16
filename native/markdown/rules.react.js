// @flow

import _memoize from 'lodash/memoize.js';
import * as React from 'react';
import { Text, View, Platform } from 'react-native';
import * as SimpleMarkdown from 'simple-markdown';

import * as SharedMarkdown from 'lib/shared/markdown.js';
import type { RelativeMemberInfo, ThreadInfo } from 'lib/types/thread-types.js';

import MarkdownLink from './markdown-link.react.js';
import MarkdownParagraph from './markdown-paragraph.react.js';
import MarkdownSpoiler from './markdown-spoiler.react.js';
import { getMarkdownStyles } from './styles.js';

export type MarkdownRules = {
  +simpleMarkdownRules: SharedMarkdown.ParserRules,
  +emojiOnlyFactor: ?number,
  // We need to use a Text container for Entry because it needs to match up
  // exactly with TextInput. However, if we use a Text container, we can't
  // support styles for things like blockQuote, which rely on rendering as a
  // View, and Views can't be nested inside Texts without explicit height and
  // width
  +container: 'View' | 'Text',
};

// Entry requires a seamless transition between Markdown and TextInput
// components, so we can't do anything that would change the position of text
const inlineMarkdownRules: boolean => MarkdownRules = _memoize(useDarkStyle => {
  const styles = getMarkdownStyles(useDarkStyle ? 'dark' : 'light');
  const simpleMarkdownRules = {
    // Matches 'https://google.com' during parse phase and returns a 'link' node
    url: {
      ...SimpleMarkdown.defaultRules.url,
      // simple-markdown is case-sensitive, but we don't want to be
      match: SimpleMarkdown.inlineRegex(SharedMarkdown.urlRegex),
    },
    // Matches '[Google](https://google.com)' during parse phase and handles
    // rendering all 'link' nodes, including for 'autolink' and 'url'
    link: {
      ...SimpleMarkdown.defaultRules.link,
      match: () => null,
      react(
        node: SharedMarkdown.SingleASTNode,
        output: SharedMarkdown.Output<SharedMarkdown.ReactElement>,
        state: SharedMarkdown.State,
      ) {
        return (
          <MarkdownLink
            key={state.key}
            style={styles.link}
            target={node.target}
          >
            {output(node.content, state)}
          </MarkdownLink>
        );
      },
    },
    // Each line gets parsed into a 'paragraph' node. The AST returned by the
    // parser will be an array of one or more 'paragraph' nodes
    paragraph: {
      ...SimpleMarkdown.defaultRules.paragraph,
      // simple-markdown's default RegEx collapses multiple newlines into one.
      // We want to keep the newlines, but when rendering within a View, we
      // strip just one trailing newline off, since the View adds vertical
      // spacing between its children
      match: (source: string, state: SharedMarkdown.State) => {
        if (state.inline) {
          return null;
        } else if (state.container === 'View') {
          return SharedMarkdown.paragraphStripTrailingNewlineRegex.exec(source);
        } else {
          return SharedMarkdown.paragraphRegex.exec(source);
        }
      },
      parse(
        capture: SharedMarkdown.Capture,
        parse: SharedMarkdown.Parser,
        state: SharedMarkdown.State,
      ) {
        let content = capture[1];
        if (state.container === 'View') {
          // React Native renders empty lines with less height. We want to
          // preserve the newline characters, so we replace empty lines with a
          // single space
          content = content.replace(/^$/m, ' ');
        }
        return {
          content: SimpleMarkdown.parseInline(parse, content, state),
        };
      },
      // eslint-disable-next-line react/display-name
      react: (
        node: SharedMarkdown.SingleASTNode,
        output: SharedMarkdown.Output<SharedMarkdown.ReactElement>,
        state: SharedMarkdown.State,
      ) => (
        <MarkdownParagraph key={state.key} style={state.textStyle}>
          {output(node.content, state)}
        </MarkdownParagraph>
      ),
    },
    // This is the leaf node in the AST returned by the parse phase
    text: SimpleMarkdown.defaultRules.text,
  };
  return {
    simpleMarkdownRules,
    emojiOnlyFactor: null,
    container: 'Text',
  };
});

// We allow the most markdown features for TextMessage, which doesn't have the
// same requirements as Entry
const fullMarkdownRules: boolean => MarkdownRules = _memoize(useDarkStyle => {
  const styles = getMarkdownStyles(useDarkStyle ? 'dark' : 'light');
  const inlineRules = inlineMarkdownRules(useDarkStyle);
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
    mailto: SimpleMarkdown.defaultRules.mailto,
    em: {
      ...SimpleMarkdown.defaultRules.em,
      // eslint-disable-next-line react/display-name
      react: (
        node: SharedMarkdown.SingleASTNode,
        output: SharedMarkdown.Output<SharedMarkdown.ReactElement>,
        state: SharedMarkdown.State,
      ) => (
        <Text key={state.key} style={styles.italics}>
          {output(node.content, state)}
        </Text>
      ),
    },
    strong: {
      ...SimpleMarkdown.defaultRules.strong,
      // eslint-disable-next-line react/display-name
      react: (
        node: SharedMarkdown.SingleASTNode,
        output: SharedMarkdown.Output<SharedMarkdown.ReactElement>,
        state: SharedMarkdown.State,
      ) => (
        <Text key={state.key} style={styles.bold}>
          {output(node.content, state)}
        </Text>
      ),
    },
    u: {
      ...SimpleMarkdown.defaultRules.u,
      // eslint-disable-next-line react/display-name
      react: (
        node: SharedMarkdown.SingleASTNode,
        output: SharedMarkdown.Output<SharedMarkdown.ReactElement>,
        state: SharedMarkdown.State,
      ) => (
        <Text key={state.key} style={styles.underline}>
          {output(node.content, state)}
        </Text>
      ),
    },
    del: {
      ...SimpleMarkdown.defaultRules.del,
      // eslint-disable-next-line react/display-name
      react: (
        node: SharedMarkdown.SingleASTNode,
        output: SharedMarkdown.Output<SharedMarkdown.ReactElement>,
        state: SharedMarkdown.State,
      ) => (
        <Text key={state.key} style={styles.strikethrough}>
          {output(node.content, state)}
        </Text>
      ),
    },
    spoiler: {
      order: SimpleMarkdown.defaultRules.paragraph.order - 1,
      match: SimpleMarkdown.inlineRegex(SharedMarkdown.spoilerRegex),
      parse(
        capture: SharedMarkdown.Capture,
        parse: SharedMarkdown.Parser,
        state: SharedMarkdown.State,
      ) {
        const content = capture[1];
        return {
          content: SimpleMarkdown.parseInline(parse, content, state),
        };
      },
      // eslint-disable-next-line react/display-name
      react: (
        node: SharedMarkdown.SingleASTNode,
        output: SharedMarkdown.Output<SharedMarkdown.ReactElement>,
        state: SharedMarkdown.State,
      ) => (
        <MarkdownSpoiler
          key={state.key}
          spoilerIdentifier={state.key}
          text={output(node.content, state)}
        />
      ),
    },
    inlineCode: {
      ...SimpleMarkdown.defaultRules.inlineCode,
      // eslint-disable-next-line react/display-name
      react: (
        node: SharedMarkdown.SingleASTNode,
        output: SharedMarkdown.Output<SharedMarkdown.ReactElement>,
        state: SharedMarkdown.State,
      ) => (
        <Text key={state.key} style={styles.inlineCode}>
          {node.content}
        </Text>
      ),
    },
    heading: {
      ...SimpleMarkdown.defaultRules.heading,
      match: SimpleMarkdown.blockRegex(
        SharedMarkdown.headingStripFollowingNewlineRegex,
      ),
      // eslint-disable-next-line react/display-name
      react(
        node: SharedMarkdown.SingleASTNode,
        output: SharedMarkdown.Output<SharedMarkdown.ReactElement>,
        state: SharedMarkdown.State,
      ) {
        const headingStyle = styles['h' + node.level];
        return (
          <Text key={state.key} style={[state.textStyle, headingStyle]}>
            {output(node.content, state)}
          </Text>
        );
      },
    },
    blockQuote: {
      ...SimpleMarkdown.defaultRules.blockQuote,
      // match end of blockQuote by either \n\n or end of string
      match: SharedMarkdown.matchBlockQuote(
        SharedMarkdown.blockQuoteStripFollowingNewlineRegex,
      ),
      parse: SharedMarkdown.parseBlockQuote,
      // eslint-disable-next-line react/display-name
      react: (
        node: SharedMarkdown.SingleASTNode,
        output: SharedMarkdown.Output<SharedMarkdown.ReactElement>,
        state: SharedMarkdown.State,
      ) => {
        const { isNestedQuote } = state;
        const backgroundColor = isNestedQuote ? '#00000000' : '#00000066';
        const borderLeftColor = (Platform.select({
          ios: '#00000066',
          default: isNestedQuote ? '#00000066' : '#000000A3',
        }): string);

        return (
          <View
            key={state.key}
            style={[styles.blockQuote, { backgroundColor, borderLeftColor }]}
          >
            {output(node.content, { ...state, isNestedQuote: true })}
          </View>
        );
      },
    },
    codeBlock: {
      ...SimpleMarkdown.defaultRules.codeBlock,
      match: SimpleMarkdown.blockRegex(
        SharedMarkdown.codeBlockStripTrailingNewlineRegex,
      ),
      parse(capture: SharedMarkdown.Capture) {
        return {
          content: capture[1].replace(/^ {4}/gm, ''),
        };
      },
      // eslint-disable-next-line react/display-name
      react: (
        node: SharedMarkdown.SingleASTNode,
        output: SharedMarkdown.Output<SharedMarkdown.ReactElement>,
        state: SharedMarkdown.State,
      ) => (
        <View key={state.key} style={styles.codeBlock}>
          <Text style={[state.textStyle, styles.codeBlockText]}>
            {node.content}
          </Text>
        </View>
      ),
    },
    fence: {
      ...SimpleMarkdown.defaultRules.fence,
      match: SimpleMarkdown.blockRegex(
        SharedMarkdown.fenceStripTrailingNewlineRegex,
      ),
      parse: (capture: SharedMarkdown.Capture) => ({
        type: 'codeBlock',
        content: capture[2],
      }),
    },
    json: {
      order: SimpleMarkdown.defaultRules.paragraph.order - 1,
      match: (source: string, state: SharedMarkdown.State) => {
        if (state.inline) {
          return null;
        }
        return SharedMarkdown.jsonMatch(source);
      },
      parse: (capture: SharedMarkdown.Capture) => {
        const jsonCapture: SharedMarkdown.JSONCapture = (capture: any);
        return {
          type: 'codeBlock',
          content: SharedMarkdown.jsonPrint(jsonCapture),
        };
      },
    },
    list: {
      ...SimpleMarkdown.defaultRules.list,
      match: SharedMarkdown.matchList,
      parse: SharedMarkdown.parseList,
      react(
        node: SharedMarkdown.SingleASTNode,
        output: SharedMarkdown.Output<SharedMarkdown.ReactElement>,
        state: SharedMarkdown.State,
      ) {
        const children = node.items.map((item, i) => {
          const content = output(item, state);
          const bulletValue = node.ordered ? node.start + i + '. ' : '\u2022 ';
          return (
            <View key={i} style={styles.listRow}>
              <Text style={[state.textStyle, styles.listBulletStyle]}>
                {bulletValue}
              </Text>
              <View style={styles.insideListView}>{content}</View>
            </View>
          );
        });

        return <View key={state.key}>{children}</View>;
      },
    },
    escape: SimpleMarkdown.defaultRules.escape,
  };
  return {
    ...inlineRules,
    simpleMarkdownRules,
    emojiOnlyFactor: 2,
    container: 'View',
  };
});

function useTextMessageRulesFunc(
  threadInfo: ThreadInfo,
): (useDarkStyle: boolean) => MarkdownRules {
  const { members } = threadInfo;
  return React.useMemo(
    () =>
      _memoize<[boolean], MarkdownRules>((useDarkStyle: boolean) =>
        textMessageRules(members, useDarkStyle),
      ),
    [members],
  );
}

function textMessageRules(
  members: $ReadOnlyArray<RelativeMemberInfo>,
  useDarkStyle: boolean,
): MarkdownRules {
  const styles = getMarkdownStyles(useDarkStyle ? 'dark' : 'light');
  const baseRules = fullMarkdownRules(useDarkStyle);
  return {
    ...baseRules,
    simpleMarkdownRules: {
      ...baseRules.simpleMarkdownRules,
      mention: {
        ...SimpleMarkdown.defaultRules.strong,
        match: SharedMarkdown.matchMentions(members),
        parse: (capture: SharedMarkdown.Capture) => ({
          content: capture[0],
        }),
        // eslint-disable-next-line react/display-name
        react: (
          node: SharedMarkdown.SingleASTNode,
          output: SharedMarkdown.Output<SharedMarkdown.ReactElement>,
          state: SharedMarkdown.State,
        ) => (
          <Text key={state.key} style={styles.bold}>
            {node.content}
          </Text>
        ),
      },
    },
  };
}

let defaultTextMessageRules = null;

function getDefaultTextMessageRules(): MarkdownRules {
  if (!defaultTextMessageRules) {
    defaultTextMessageRules = textMessageRules([], false);
  }
  return defaultTextMessageRules;
}

export {
  inlineMarkdownRules,
  useTextMessageRulesFunc,
  getDefaultTextMessageRules,
};
