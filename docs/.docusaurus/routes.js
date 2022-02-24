
import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
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
