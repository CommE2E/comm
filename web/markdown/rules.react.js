// @flow

import * as SimpleMarkdown from 'simple-markdown';
import * as React from 'react';

import * as SharedMarkdown from 'lib/shared/markdown';

export type MarkdownRules = {|
  +simpleMarkdownRules: SimpleMarkdown.Rules,
  +useDarkStyle: boolean,
|};

function linkRules(useDarkStyle: boolean): MarkdownRules {
  const simpleMarkdownRules = {
    // We are using default simple-markdown rules
    // For more details, look at native/markdown/rules.react
    link: {
      ...SimpleMarkdown.defaultRules.link,
      match: () => null,
      // eslint-disable-next-line react/display-name
      react: (
        node: SimpleMarkdown.SingleASTNode,
        output: SimpleMarkdown.Output<SimpleMarkdown.ReactElement>,
        state: SimpleMarkdown.State,
      ) => (
        <a
          href={SimpleMarkdown.sanitizeUrl(node.target)}
          key={state.key}
          title={node.title}
          target="_blank"
          rel="noopener noreferrer"
        >
          {output(node.content, state)}
        </a>
      ),
    },
    paragraph: {
      ...SimpleMarkdown.defaultRules.paragraph,
      match: SimpleMarkdown.blockRegex(SharedMarkdown.paragraphRegex),
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
    text: SimpleMarkdown.defaultRules.text,
    url: {
      ...SimpleMarkdown.defaultRules.url,
      match: SimpleMarkdown.inlineRegex(SharedMarkdown.urlRegex),
    },
  };
  return {
    simpleMarkdownRules: simpleMarkdownRules,
    useDarkStyle,
  };
}

// function will contain additional rules for message formatting
function markdownRules(useDarkStyle: boolean): MarkdownRules {
  const linkMarkdownRules = linkRules(useDarkStyle);

  const simpleMarkdownRules = {
    ...linkMarkdownRules.simpleMarkdownRules,
    autolink: SimpleMarkdown.defaultRules.autolink,
    link: {
      ...linkMarkdownRules.simpleMarkdownRules.link,
      match: SimpleMarkdown.defaultRules.link.match,
    },
    blockQuote: {
      ...SimpleMarkdown.defaultRules.blockQuote,
      // match end of blockQuote by either \n\n or end of string
      match: SimpleMarkdown.blockRegex(SharedMarkdown.blockQuoteRegex),
      parse(
        capture: SimpleMarkdown.Capture,
        parse: SimpleMarkdown.Parser,
        state: SimpleMarkdown.State,
      ) {
        const content = capture[1].replace(/^ *> ?/gm, '');
        return {
          content: parse(content, state),
        };
      },
    },
    inlineCode: SimpleMarkdown.defaultRules.inlineCode,
    em: SimpleMarkdown.defaultRules.em,
    strong: SimpleMarkdown.defaultRules.strong,
    mention: {
      ...SimpleMarkdown.defaultRules.strong,
      match: SimpleMarkdown.inlineRegex(SharedMarkdown.mentionRegex),
      parse: (capture: SimpleMarkdown.Capture) => ({
        content: capture[0],
      }),
      // eslint-disable-next-line react/display-name
      react: (
        node: SimpleMarkdown.SingleASTNode,
        output: SimpleMarkdown.Output<SimpleMarkdown.ReactElement>,
        state: SimpleMarkdown.State,
      ) => <strong key={state.key}>{node.content}</strong>,
    },
    del: SimpleMarkdown.defaultRules.del,
    u: SimpleMarkdown.defaultRules.u,
    heading: {
      ...SimpleMarkdown.defaultRules.heading,
      match: SimpleMarkdown.blockRegex(SharedMarkdown.headingRegex),
    },
    mailto: SimpleMarkdown.defaultRules.mailto,
    codeBlock: {
      ...SimpleMarkdown.defaultRules.codeBlock,
      match: SimpleMarkdown.blockRegex(SharedMarkdown.codeBlockRegex),
      parse: (capture: SimpleMarkdown.Capture) => ({
        content: capture[0].replace(/^ {4}/gm, ''),
      }),
    },
    fence: {
      ...SimpleMarkdown.defaultRules.fence,
      match: SimpleMarkdown.blockRegex(SharedMarkdown.fenceRegex),
      parse: (capture: SimpleMarkdown.Capture) => ({
        type: 'codeBlock',
        content: capture[2],
      }),
    },
    json: {
      order: SimpleMarkdown.defaultRules.paragraph.order - 1,
      match: (source: string, state: SimpleMarkdown.State) => {
        if (state.inline) {
          return null;
        }
        return SharedMarkdown.jsonMatch(source);
      },
      parse: (capture: SimpleMarkdown.Capture) => ({
        type: 'codeBlock',
        content: SharedMarkdown.jsonPrint(capture),
      }),
    },
    list: {
      ...SimpleMarkdown.defaultRules.list,
      match: SharedMarkdown.matchList,
      parse: SharedMarkdown.parseList,
    },
    escape: SimpleMarkdown.defaultRules.escape,
  };
  return {
    ...linkMarkdownRules,
    simpleMarkdownRules,
    useDarkStyle,
  };
}

export { linkRules, markdownRules };
