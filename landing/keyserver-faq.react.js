// @flow

import { faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import classNames from 'classnames';
import * as React from 'react';

import { faqData } from './keyserver-faq-data.js';
import css from './keyserver-faq.css';
import typography from './typography.css';

function KeyserverFAQ(): React.Node {
  const questionClassName = classNames([
    typography.subheading2,
    css.questionText,
  ]);
  const answerClassName = classNames([typography.paragraph1, css.answerText]);

  const [activeFAQIndex, setActiveFAQIndex] = React.useState(null);

  const onClickFAQItem = React.useCallback(
    (index: number) => {
      if (index === activeFAQIndex) {
        setActiveFAQIndex(null);
      } else {
        setActiveFAQIndex(index);
      }
    },
    [activeFAQIndex],
  );

  const keyserverFAQ = React.useMemo(() => {
    return faqData.map((faq, index) => {
      const answerContainerClassName = classNames({
        [css.answerContainer]: true,
        [css.activeAnswerContainer]: activeFAQIndex === index,
      });

      const iconClassName = classNames({
        [css.icon]: true,
        [css.activeIcon]: activeFAQIndex === index,
      });

      return (
        <div
          key={index}
          className={css.faqItemContainer}
          onClick={() => onClickFAQItem(index)}
        >
          <div className={css.questionContainer}>
            <p className={questionClassName}>{faq.question}</p>
            <FontAwesomeIcon
              size="sm"
              className={iconClassName}
              icon={faChevronDown}
            />
          </div>
          <div className={answerContainerClassName}>
            <p className={answerClassName}>{faq.answer}</p>
          </div>
        </div>
      );
    });
  }, [activeFAQIndex, answerClassName, onClickFAQItem, questionClassName]);

  return (
    <section className={css.faqSection}>
      <h1 className={typography.heading1}>FAQ</h1>
      <div className={css.faqContainer}>{keyserverFAQ}</div>
    </section>
  );
}

export default KeyserverFAQ;
