// @flow

import * as SimpleMarkdown from 'simple-markdown';

export default function rules() {
  return {
    // We are using default simple-markdown rules
    // For more details, look at native/components/rules.react
    autolink: SimpleMarkdown.defaultRules.autolink,
    link: SimpleMarkdown.defaultRules.link,
    text: SimpleMarkdown.defaultRules.text,
    url: {
      ...SimpleMarkdown.defaultRules.url,
      match: SimpleMarkdown.inlineRegex(
        /^(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/i,
      ),
    },
  };
}
