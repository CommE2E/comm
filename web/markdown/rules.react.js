// @flow

import _memoize from 'lodash/memoize';
import * as React from 'react';
import * as SimpleMarkdown from 'simple-markdown';
import tinycolor from 'tinycolor2';

import { threadInfoSelector } from 'lib/selectors/thread-selectors';
import { relativeMemberInfoSelectorForMembersOfThread } from 'lib/selectors/user-selectors';
import * as SharedMarkdown from 'lib/shared/markdown';
import type { RelativeMemberInfo } from 'lib/types/thread-types';

import { useSelector } from '../redux/redux-utils';

export type MarkdownRules = {
  +simpleMarkdownRules: SharedMarkdown.ParserRules,
  +useDarkStyle: boolean,
};

const linkRules: boolean => MarkdownRules = _memoize(useDarkStyle => {
  const simpleMarkdownRules = {
    // We are using default simple-markdown rules
    // For more details, look at native/markdown/rules.react
    link: {
      ...SimpleMarkdown.defaultRules.link,
      match: () => null,
      // eslint-disable-next-line react/display-name
      react: (
        node: SharedMarkdown.SingleASTNode,
        output: SharedMarkdown.Output<SharedMarkdown.ReactElement>,
        state: SharedMarkdown.State,
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
        node: SharedMarkdown.SingleASTNode,
        output: SharedMarkdown.Output<SharedMarkdown.ReactElement>,
        state: SharedMarkdown.State,
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
});

const markdownRules: (
  useDarkStyle: boolean,
  isViewer: boolean,
  threadColor: ?string,
) => MarkdownRules = _memoize(
  (useDarkStyle, isViewer, threadColor) => {
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
        match: SharedMarkdown.matchBlockQuote(SharedMarkdown.blockQuoteRegex),
        parse: SharedMarkdown.parseBlockQuote,
        // eslint-disable-next-line react/display-name
        react: (
          node: SharedMarkdown.SingleASTNode,
          output: SharedMarkdown.Output<SharedMarkdown.ReactElement>,
          state: SharedMarkdown.State,
        ) => {
          let defaultTextMessageBackgroundColor;
          if (typeof window !== 'undefined') {
            const style = window.getComputedStyle(document.body);
            defaultTextMessageBackgroundColor = style.getPropertyValue(
              '--text-message-default-background',
            );
          }

          let backgroundColor = tinycolor(defaultTextMessageBackgroundColor)
            .lighten(40)
            .toString();
          let borderLeftColor = tinycolor(defaultTextMessageBackgroundColor)
            .lighten(20)
            .toString();

          if (threadColor) {
            backgroundColor = isViewer
              ? tinycolor(threadColor).darken(20).toString()
              : tinycolor(threadColor).toString();
            borderLeftColor = isViewer
              ? tinycolor(threadColor).darken(30).toString()
              : tinycolor(threadColor).darken(20).toString();
          }

          return (
            <blockquote
              key={state.key}
              style={{ backgroundColor, borderLeftColor }}
            >
              {output(node.content, state)}
            </blockquote>
          );
        },
      },
      inlineCode: SimpleMarkdown.defaultRules.inlineCode,
      em: SimpleMarkdown.defaultRules.em,
      strong: SimpleMarkdown.defaultRules.strong,
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
        parse: (capture: SharedMarkdown.Capture) => ({
          content: capture[0].replace(/^ {4}/gm, ''),
        }),
      },
      fence: {
        ...SimpleMarkdown.defaultRules.fence,
        match: SimpleMarkdown.blockRegex(SharedMarkdown.fenceRegex),
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
      },
      escape: SimpleMarkdown.defaultRules.escape,
    };
    return {
      ...linkMarkdownRules,
      simpleMarkdownRules,
      useDarkStyle,
    };
  },
  (...args) => JSON.stringify(args),
);

function useTextMessageRulesFunc(
  threadID: ?string,
): ?(useDarkStyle: boolean, isViewer: boolean) => MarkdownRules {
  const threadMembers = useSelector(
    relativeMemberInfoSelectorForMembersOfThread(threadID),
  );

  const threadColor = useSelector(state => {
    if (!threadID) {
      return undefined;
    }
    const threadInfo = threadInfoSelector(state)[threadID];
    return threadInfo ? threadInfo.color : null;
  });

  return React.useMemo(() => {
    if (!threadMembers) {
      return undefined;
    }
    return _memoize<[boolean, boolean], MarkdownRules>(
      (useDarkStyle: boolean, isViewer: boolean) =>
        textMessageRules(threadMembers, useDarkStyle, isViewer, threadColor),
      (...args) => JSON.stringify(args),
    );
  }, [threadMembers, threadColor]);
}

function textMessageRules(
  members: $ReadOnlyArray<RelativeMemberInfo>,
  useDarkStyle: boolean,
  isViewer: boolean,
  threadColor: ?string,
): MarkdownRules {
  const baseRules = markdownRules(useDarkStyle, isViewer, threadColor);
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
        ) => <strong key={state.key}>{node.content}</strong>,
      },
    },
  };
}

let defaultTextMessageRules = null;

function getDefaultTextMessageRules(): MarkdownRules {
  if (!defaultTextMessageRules) {
    defaultTextMessageRules = textMessageRules([], false, false, null);
  }
  return defaultTextMessageRules;
}

export { linkRules, useTextMessageRulesFunc, getDefaultTextMessageRules };
