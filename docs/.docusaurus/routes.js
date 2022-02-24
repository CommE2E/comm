
import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/__docusaurus/debug',
    component: ComponentCreator('/__docusaurus/debug','3d6'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/config',
    component: ComponentCreator('/__docusaurus/debug/config','914'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/content',
    component: ComponentCreator('/__docusaurus/debug/content','c28'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/globalData',
    component: ComponentCreator('/__docusaurus/debug/globalData','3cf'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/metadata',
    component: ComponentCreator('/__docusaurus/debug/metadata','31b'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/registry',
    component: ComponentCreator('/__docusaurus/debug/registry','0da'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/routes',
    component: ComponentCreator('/__docusaurus/debug/routes','244'),
    exact: true
  },
  {
    path: '/blog/archive',
    component: ComponentCreator('/blog/archive','f4c'),
    exact: true
  },
  {
    path: '/',
    component: ComponentCreator('/','c11'),
    routes: [
      {
        path: '/',
        component: ComponentCreator('/','b10'),
        exact: true,
        'sidebar': "tutorialSidebar"
      },
      {
        path: '/dev_environment_mac/configuration',
        component: ComponentCreator('/dev_environment_mac/configuration','fa8'),
        exact: true,
        'sidebar': "tutorialSidebar"
      },
      {
        path: '/dev_environment_mac/development/debugging',
        component: ComponentCreator('/dev_environment_mac/development/debugging','993'),
        exact: true,
        'sidebar': "tutorialSidebar"
      },
      {
        path: '/dev_environment_mac/development/development',
        component: ComponentCreator('/dev_environment_mac/development/development','92d'),
        exact: true,
        'sidebar': "tutorialSidebar"
      },
      {
        path: '/dev_environment_mac/prerequisites',
        component: ComponentCreator('/dev_environment_mac/prerequisites','9af'),
        exact: true,
        'sidebar': "tutorialSidebar"
      },
      {
        path: '/linux_dev_environment',
        component: ComponentCreator('/linux_dev_environment','4dd'),
        exact: true,
        'sidebar': "tutorialSidebar"
      }
    ]
  },
  {
    path: '*',
    component: ComponentCreator('*')
  }
];
