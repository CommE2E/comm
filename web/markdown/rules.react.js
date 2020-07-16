// @flow

import * as SimpleMarkdown from 'simple-markdown';
import * as React from 'react';

import { urlRegex } from 'lib/shared/markdown';

type MarkdownRuleSpec = {|
  +simpleMarkdownRules: SimpleMarkdown.Rules,
|};
export type MarkdownRules = () => MarkdownRuleSpec;

function linkRules(): MarkdownRuleSpec {
  const simpleMarkdownRules = {
    // We are using default simple-markdown rules
    // For more details, look at native/markdown/rules.react
    autolink: SimpleMarkdown.defaultRules.autolink,
    link: {
      ...SimpleMarkdown.defaultRules.link,
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
    text: SimpleMarkdown.defaultRules.text,
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
  return {
    ...linkRules(),
  };
}

export { linkRules, markdownRules };
