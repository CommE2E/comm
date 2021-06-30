// @flow

import * as React from 'react';

import css from './landing.css';

function Privacy(): React.Node {
  return (
    <div>
      <h1 className={css.legal}>Privacy Policy</h1>

      <p>
        Effective date: <strong>June 29, 2021</strong>
      </p>

      <h2 className={css.legal}>Introduction</h2>

      <p>
        We built Comm as a privacy-focused alternative to the cloud-based
        community chat apps that exist today. In order to protect the privacy of
        user content, communities on Comm are hosted on private keyservers, and
        messages transmitted through the platform are encrypted, preventing us
        from being able to access their contents. While Comm does collect a
        minimal amount of information as necessary to power and maintain the
        Services, Comm will never be able to access or view your messages or
        content. This Privacy Policy describes the limited ways in which Comm
        uses information in connection with its Services.
      </p>

      <p>
        <strong>
          ‌By using or accessing our Services, you acknowledge that you accept
          the practices and policies outlined below.
        </strong>
      </p>

      <h2 className={css.legal}>Table of Contents</h2>

      <ul>
        <li>
          <strong>Information We Collect</strong>
        </li>
        <li>
          <strong>How We May Share Your Information</strong>
        </li>
        <li>
          <strong>Retention of Information</strong>
        </li>
        <li>
          <strong>Your Rights in the Personal Data You Provide to Us</strong>
        </li>
        <li>
          <strong>Deleting Your Data</strong>
        </li>
        <li>
          <strong>Changes to this Privacy Policy</strong>
        </li>
        <li>
          <strong>Terms of Use</strong>
        </li>
        <li>
          <strong>Contact Information</strong>
        </li>
      </ul>

      <h2 className={css.legal}>Information We Collect</h2>

      <p>
        We collect the following categories of information, some of which might
        constitute personal information:
      </p>

      <ol>
        <li>
          <strong>Account Information.</strong> In order to use Comm, you will
          be required to create an account, and in doing so, will be required to
          provide a username and password to us. We only store salted and hashed
          versions of your password – we never store the plaintext version. No
          other information is required to create an account and we do not want
          you to provide any other information.
        </li>
        <li>
          <strong>Updates About the Services.</strong> If you choose to receive
          updates on Comm’s progress, you will be required to provide your email
          address to us. These email addresses will not be associated with any
          accounts, and will not be used for any purpose other than to provide
          updates on Comm.
        </li>
        <li>
          <strong>Time Zone Detection.</strong> When responding to a web
          request, we use the requester’s IP address in order to determine which
          time zone to render timestamps in. We do not store these IP addresses
          or associate them with specific accounts.
        </li>
        <li>
          <strong>Security, Fraud and Abuse.</strong> In order to detect and
          prevent abuse of our Services and cyberattacks, we keep track of
          request metadata, which includes requests made by IP addresses as well
          as the frequency of those requests. This data is only stored on a
          short-term basis and is never associated with specific accounts, even
          if the requests themselves originate from or are associated with
          specific accounts. Additionally, we may view and block certain IP
          address ranges as necessary to comply with applicable United States
          export control laws and regulations.
        </li>
        <li>
          <strong>Crash Reports.</strong> If you choose to send us a crash
          report, we may collect data from such reports for purposes of
          debugging and system maintenance. These reports contain operational
          information such as telemetry data (e.g., information with respect to
          the recent connection between the client and server), metadata (e.g.,
          time stamps from messages sent in a conversation or chat), and device
          data (e.g., your device’s operating system) but never contain the
          content of your messages.
        </li>
        <li>
          <strong>Push Notifications.</strong> If you choose to allow push
          notifications to your device, your device’s operating system’s
          provider will know that you are using the Services and may be able to
          see the content of the messages you transmit using the Services. We
          only collect push tokens required to send you such notifications and
          these tokens do not permit us to access or view the content of your
          messages.
        </li>
        <li>
          <strong>Contact List.</strong> If you allow us to do so, we can
          discover which contacts in your address book are Comm users by using
          technology designed to protect the privacy of you and your contacts.
          If you opt to discover other Comm users in your contact list, phone
          numbers from the contacts on your device, as well as your own phone
          number, will be hashed and transmitted to Comm in order to match you
          and your friends on the Services. Since this contact information is
          hashed, Comm cannot view or access the plaintext version.
        </li>
        <li>
          <strong>Cookies.</strong> We only use a single cookie per user in
          order to authenticate a user as being logged in to Comm. Most browsers
          allow you to decide whether to accept these cookies and whether to
          remove any cookies already on your device. If you disable these
          cookies, you will not be able to stay logged into Comm.
        </li>
        <li>
          <strong>Content.</strong> Other Comm users may have access to all or
          some of the Content owned by you.{' '}
          <strong>
            However, as this Content is end-to-end encrypted, we have no ability
            to access, view or control your Content.
          </strong>{' '}
          For more information on how Comm works, please{' '}
          <a href="https://comm.app/how-it-works">click here</a>.
        </li>
        <li>
          <strong>Anonymized Data.</strong> We may create aggregated,
          de-identified or anonymized data from the information we collect from
          you, including by removing information that makes the data personally
          identifiable to you. We may use such aggregated, de-identified or
          anonymized data for our own lawful business purposes, including to
          analyze, build and improve the Services and promote our business,
          provided that we will not use such data in a manner that could
          identify you.
        </li>
      </ol>

      <h2>How We May Share Your Information</h2>

      <p>
        We have no access to your Content and therefore have no ability to share
        it. As for the very limited information we do collect, we would{' '}
        <strong>never</strong> sell, rent or monetize that information. However,
        we may share this information with third parties for the following
        reasons:
      </p>

      <ol>
        <li>
          To fulfill our legal obligations under applicable law, regulation,
          court order or other legal process.
        </li>
        <li>
          To protect the rights, property or safety of you, Comm Technologies or
          another party as required or permitted by law.
        </li>
        <li>To enforce any agreements with you.</li>
        <li>
          Pursuant to a merger, acquisition, bankruptcy or other transaction in
          which that third party assumes control of our business (in whole or in
          part).
        </li>
      </ol>

      <h2>Retention of Information</h2>

      <p>
        For any of your personal information that we collect, we retain such
        personal information for as long as you have an open account with us or,
        only with respect to the association between your username and public
        key, as otherwise necessary to provide our Services.
      </p>

      <h1 className={css.legal}>
        Your Rights in the Personal Data You Provide to Us
      </h1>

      <h2 className={css.legal}>Your Rights</h2>

      <p>
        Under applicable data protection legislation, in certain circumstances,
        you have rights concerning your personal data. You have a right to:
      </p>

      <ol>
        <li>
          <strong>Access.</strong> You can request more information about the
          personal data we hold about you and request a copy of such personal
          data.
        </li>
        <li>
          <strong>‌Rectification.</strong> You can correct any inaccurate or
          incomplete personal data we are holding about you.
        </li>
        <li>
          <strong>Erasure.</strong> You can request that we erase some or all of
          your personal data from our systems.
        </li>
        <li>
          <strong>Withdrawal of Consent.</strong> You have the right to withdraw
          your consent to our processing of your personal data at any time.
          Please note, however, that if you exercise this right, you may have to
          then provide express consent on a case-by-case basis for the use or
          disclosure of certain of your personal data, if such use or disclosure
          is necessary to enable you to utilize some or all of our Services.
        </li>
        <li>
          <strong>Portability.</strong> You can ask for a copy of your personal
          data in a machine-readable format and can also request that we
          transmit the data to another data controller where technically
          feasible.
        </li>
        <li>
          <strong>Objection.</strong> You can contact us to let us know that you
          object to the further use of your personal data.
        </li>
        <li>
          <strong>Restriction of Processing.</strong> You can ask us to restrict
          further processing of your personal data.
        </li>
        <li>
          <strong>Right to File Complaint.</strong> You have the right to lodge
          a complaint with national data protection authorities regarding our
          processing of your personal data.
        </li>
      </ol>

      <h2 className={css.legal}>Exercising Your Rights</h2>

      <p>
        If you wish to exercise any of these rights, please contact us using the
        details below.
      </p>

      <h2 className={css.legal}>Deleting Your Data</h2>

      <p>
        If you would like to delete your account, you can do this either by
        deleting your account within the app, or by contacting us using the
        information below. Deleting your account removes all personal
        information that you provided to us.
      </p>

      <p>
        Termination of your account may or may not result in destruction of
        Content associated with your account, and other Comm users may continue
        to have access to and control over your Content.
      </p>

      <h2 className={css.legal}>Changes to this Privacy Policy</h2>

      <p>
        We may update this Privacy Policy from time to time. If you use the
        Services after any changes to the Privacy Policy have been posted, that
        means you agree to all of the changes. Use of information we collect is
        subject to the Privacy Policy in effect at the time such information is
        collected.
      </p>

      <h2 className={css.legal}>Terms of Use</h2>

      <p>
        Remember that your use of Comm Technologies&apos; Services is at all
        times subject to our <a href="https://comm.app/terms">Terms of Use</a>,
        which incorporates this Privacy Policy. Any terms we use in this Policy
        without defining them have the definitions given to them in the Terms of
        Use.
      </p>

      <h2 className={css.legal}>Contact Information</h2>

      <p>
        If you have any questions or comments about this Privacy Policy, the
        ways in which we collect and use your information or your choices and
        rights regarding such collection and use, please do not hesitate to
        contact us at:
      </p>

      <ul>
        <li>
          Website: <a href="https://comm.app">https://comm.app</a>
        </li>
        <li>
          Email: <a href="mailto:support@comm.app">support@comm.app</a>
        </li>
        <li>Phone: +1 (332) 203-4023</li>
        <li>
          Address: Comm Technologies, Inc. / 203 Rivington St. Apt 1K / New
          York, NY 10002
        </li>
      </ul>
    </div>
  );
}

export default Privacy;
