// @flow

import * as SimpleMarkdown from 'simple-markdown';
import * as React from 'react';

import * as MarkdownRegex from 'lib/shared/markdown';

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
      match: SimpleMarkdown.blockRegex(MarkdownRegex.paragraphRegex),
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
      match: SimpleMarkdown.inlineRegex(MarkdownRegex.urlRegex),
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
      match: SimpleMarkdown.blockRegex(MarkdownRegex.blockQuoteRegex),
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
    u: SimpleMarkdown.defaultRules.u,
    heading: {
      ...SimpleMarkdown.defaultRules.heading,
      match: SimpleMarkdown.blockRegex(MarkdownRegex.headingRegex),
    },
    mailto: SimpleMarkdown.defaultRules.mailto,
    codeBlock: {
      ...SimpleMarkdown.defaultRules.codeBlock,
      match: SimpleMarkdown.blockRegex(MarkdownRegex.codeBlockRegex),
      parse(capture: SimpleMarkdown.Capture) {
        const content = capture[0].replace(/^ {4}/gm, '');
        return {
          content: content,
        };
      },
    },
    fence: {
      ...SimpleMarkdown.defaultRules.fence,
      match: SimpleMarkdown.blockRegex(MarkdownRegex.fenceRegex),
      parse: (capture: SimpleMarkdown.Capture) => ({
        type: 'codeBlock',
        content: capture[2],
      }),
    },
  };
  return {
    ...linkMarkdownRules,
    simpleMarkdownRules,
  };
}

export { linkRules, markdownRules };
