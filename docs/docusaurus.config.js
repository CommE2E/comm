// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require('prism-react-renderer/themes/github');
const darkCodeTheme = require('prism-react-renderer/themes/dracula');

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Comm docs',
  tagline: 'Documentation',
  url: 'https://andnasnd.github.io',
  baseUrl: '/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/favicon.ico',
  projectName: 'andnasnd.github.io', // Usually your repo name.
  organizationName: 'andnasnd', // Usually your GitHub org/user name.
  trailingSlash: false,

  presets: [
    [
      '@docusaurus/preset-classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          routeBasePath: '/',
          // TODO: Change to repo link
          // editUrl: 'https://github.com/facebook/docusaurus/edit/main/website/',
        },
        blog: {
          showReadingTime: true,
          // TODO: Change to repo link
          // editUrl:
          // 'https://github.com/facebook/docusaurus/edit/main/website/blog/',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      navbar: {
        title: 'Comm docs',
        logo: {
          alt: 'Comm Logo',
          src: 'img/appicon3x.png',
        },
        items: [
          {
            type: 'doc',
            docId: 'my-home-doc',
            position: 'left',
            label: 'Documentation',
          },
          {
            href: 'https://github.com/CommE2E/comm',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Docs',
            items: [
              {
                label: 'Documentation',
                to: '/dev_environment_mac/prerequisites',
              },
            ],
          },
          {
            title: 'Community',
            items: [
              {
                label: 'Website',
                href: 'https://comm.app/',
              },
              {
                label: 'GitHub',
                href: 'https://github.com/CommE2E/comm',
              },
              {
                label: 'Twitter',
                href: 'https://twitter.com/commdotapp',
              },
            ],
          },
          {
            title: 'More',
            items: [
              {
                label: 'Support',
                href: 'https://comm.app/support',
              },
              {
                label: 'Terms of Use',
                href: 'https://comm.app/terms',
              },
              {
                label: 'Privacy Policy',
                href: 'https://comm.app/privacy',
              },
            ],
          },
        ],
        copyright: `Comm Technologies, Built with Docusaurus 2.`,
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
      },
    }),
};

module.exports = config;
