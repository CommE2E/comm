// @flow

import classNames from 'classnames';
import * as React from 'react';

import css from './keyserver-faq.css';
import typography from './typography.css';

const answerClassName = classNames([typography.paragraph1, css.answerText]);

type FAQItem = {
  +question: string,
  +answer: React.Node,
};

export const faqData: $ReadOnlyArray<FAQItem> = [
  {
    question: 'What’s a keyserver?',
    answer: (
      <p className={answerClassName}>
        Comm uses the term &ldquo;keyserver&rdquo; to refer to a personal,
        private server. It&rsquo;s worth admitting that the more common usage of
        the term is for a server that vends keys in the context of enterprise
        key management… you may get confused if you Google it!
      </p>
    ),
  },
  {
    question: 'Where does a keyserver run?',
    answer: (
      <p className={answerClassName}>
        That&rsquo;s up to you! You can run a keyserver in the cloud, or on
        personal hardware (such as a spare laptop) at home. What&rsquo;s
        important is that keyserver is always available: turned on and connected
        to the Internet.
      </p>
    ),
  },
  {
    question: 'How do I run my own keyserver?',
    answer: (
      <p className={answerClassName}>
        <span>
          Comm is still in beta, and as such it&rsquo;s only possible to run a
          keyserver using our Docker Compose config. If you&rsquo;re
          sufficiently technical, check out&nbsp;
        </span>
        <a
          href="https://github.com/CommE2E/comm/tree/master/docs/nix_keyserver_deployment.md"
          target="_blank"
          rel="noreferrer"
          className={css.link}
        >
          this doc
        </a>
        <span>&nbsp;to give it a try.</span>
      </p>
    ),
  },
  {
    question: 'What happens if my keyserver is lost?',
    answer: (
      <p className={answerClassName}>
        <span>
          In the future, Comm will automatically back up all of your
          keyserver&rsquo;s data. Right now your best bet is to configure manual
          backups of the underlying database, which are explained in&nbsp;
        </span>
        <a
          href="https://github.com/CommE2E/comm/tree/master/docs/nix_keyserver_deployment.md"
          target="_blank"
          rel="noreferrer"
          className={css.link}
        >
          this doc
        </a>
        <span>.</span>
      </p>
    ),
  },
  {
    question: 'What else can I do with my keyserver?',
    answer: (
      <p className={answerClassName}>
        Hosting chat communities is just the start. Your keyserver is your
        personal cloud, and in the future it can be your password manager, your
        file storage, your email server, and your crypto wallet. Stay tuned!
      </p>
    ),
  },
];
