// @flow

import * as SimpleMarkdown from 'simple-markdown';
import * as React from 'react';

import { urlRegex } from 'lib/shared/markdown';

import css from './markdown.css';
type MarkdownRuleSpec = {|
  +simpleMarkdownRules: SimpleMarkdown.Rules,
|};
export type MarkdownRules = () => MarkdownRuleSpec;

function linkRules(): MarkdownRuleSpec {
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
      match: SimpleMarkdown.blockRegex(/^((?:[^\n]*)(?:\n|$))/),
      // match: SimpleMarkdown.blockRegex(/^((?:[^\n]|\n(?! *\n))+)(?:\n *)+\n/)
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
    text: {
      ...SimpleMarkdown.defaultRules.text,
      // eslint-disable-next-line react/display-name
      react: (
        node: SimpleMarkdown.SingleASTNode,
        output: SimpleMarkdown.Output<string>,
        state: SimpleMarkdown.State,
      ) => <React.Fragment key={state.key}>{node.content}</React.Fragment>,
    },
    url: {
      ...SimpleMarkdown.defaultRules.url,
      match: SimpleMarkdown.inlineRegex(urlRegex),
    },
  };
  return {
    simpleMarkdownRules: simpleMarkdownRules,
  };
}

// function will contain additional rules for message formatting
function markdownRules(): MarkdownRuleSpec {
  const linkMarkdownRules = linkRules();

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
      match: SimpleMarkdown.blockRegex(/^( *>[^\n]+(\n[^\n]+)*\n*)+(\n{2,}|$)/),
      parse(
        capture: SimpleMarkdown.Capture,
        parse: SimpleMarkdown.Parser,
        state: SimpleMarkdown.State,
      ) {
        var content = capture[0].replace(/^ *> ?/gm, '');
        return {
          // remove new line from captured string
          content: parse(content.trim(), state),
        };
      },
      // eslint-disable-next-line react/display-name
      react: (
        node: SimpleMarkdown.SingleASTNode,
        output: SimpleMarkdown.Output<SimpleMarkdown.ReactElement>,
        state: SimpleMarkdown.State,
      ) => (
        <blockquote key={state.key} className={css.block}>
          {output(node.content, state)}
        </blockquote>
      ),
    },
    inlineCode: {
      ...SimpleMarkdown.defaultRules.inlineCode,
      // eslint-disable-next-line react/display-name
      react: (
        node: SimpleMarkdown.SingleASTNode,
        output: SimpleMarkdown.Output<SimpleMarkdown.ReactElement>,
        state: SimpleMarkdown.State,
      ) => (
        <code key={state.key} className={css.inlineCode}>
          {node.content}
        </code>
      ),
    },
    em: SimpleMarkdown.defaultRules.em,
    strong: SimpleMarkdown.defaultRules.strong,
    del: SimpleMarkdown.defaultRules.del,
    underline: {
      order: SimpleMarkdown.defaultRules.em.order - 0.5,
      match: SimpleMarkdown.inlineRegex(/^__([\s\S]+?)__(?!_)/),
      parse: (
        capture: SimpleMarkdown.Capture,
        parse: SimpleMarkdown.Parser,
        state: SimpleMarkdown.state,
      ) => ({
        content: parse(capture[1], state),
      }),
      // eslint-disable-next-line react/display-name
      react: (
        node: SimpleMarkdown.SingleASTNode,
        output: SimpleMarkdown.Output<SimpleMarkdown.ReactElement>,
        state: SimpleMarkdown.State,
      ) => <u key={state.key}>{output(node.content, state)}</u>,
    },
    // heading: {
    //   ...SimpleMarkdown.defaultRules.heading,
    //   match: SimpleMarkdown.inlineRegex(/^ *(#{1,6} )([^\n]+?) *(?:\n+|$)/),
    // },
    mailto: SimpleMarkdown.defaultRules.mailto,
    codeBlock: {
      ...SimpleMarkdown.defaultRules.codeBlock,
      match: SimpleMarkdown.blockRegex(/^(?: {4}[^\n]+\n*)+(?:\n *)/),
      parse(capture: SimpleMarkdown.Capture) {
        var content = capture[0].replace(/^ {4}/gm, '');
        return {
          lang: undefined,
          content: content,
        };
      },
    },
    fence: {
      ...SimpleMarkdown.defaultRules.fence,
      match: SimpleMarkdown.blockRegex(/`{3}(?:(.*$)\n)?([\s\S]*)`{3}/m),
      parse(capture: SimpleMarkdown.Capture) {
        return {
          type: 'codeBlock',
          lang: capture[1] || undefined,
          content: capture[2],
        };
      },
    },
  };
  return {
    ...linkMarkdownRules,
    simpleMarkdownRules,
  };
}

export { linkRules, markdownRules };
