import { apiPage } from './addons/apiPage/loader.js';
import { assessmentPage } from './addons/assessment.js';
import { coursePage } from './addons/course.js';
import { coursesPage } from './addons/courses.js';
import { gradesPage } from './addons/grades.js';
import { homePage } from './addons/home.js';
import { materialsPage } from './addons/materials.js';
import { pagePage } from './addons/page.js';
import { theme } from './addons/theme.jsx';
import { toolbar } from './addons/toolbar.jsx';
import { App } from './solid.jsx';
import { StorableSettings } from './store/storable.js';
import { CachedDataStore } from './utils/cache.js';
import { Logger } from './utils/logger.js';

import { render } from 'solid-js/web';

interface IRouteGlob {
    matches: string[];
    route: () => void;
}

// * = [a-zA-Z0-9_]
// ** = [a-zA-Z0-9_/]
const routes: IRouteGlob[] = [
    {
        matches: ['/grades/grades', '/course/*/student_grades'],
        route: gradesPage
    },
    {
        matches: ['/course/*/materials'],
        route: materialsPage
    },
    {
        matches: ['/', '/home', '/home/recent_activity', '/home/course-dashboard'],
        route: homePage
    },
    {
        matches: ['/course/*/**'],
        route: coursePage
    },
    {
        matches: ['/api'],
        route: apiPage
    },
    {
        matches: ['/assignment/*/assessment'],
        route: assessmentPage
    },
    {
        matches: ['/page/*'],
        route: pagePage
    },
    {
        matches: ['/courses'],
        route: coursesPage
    }
];

const allPages = [toolbar, theme];

// Load page
const loadPage = (url: URL, routes: IRouteGlob[]) => {
    const logger = Logger.createContext('content::loadPage');
    // Normalize URL
    const path =
        '/' +
        url.pathname
            .split('/')
            .filter(x => x !== '')
            .join('/');

    logger.debug('Normalized path: %s', path);

    // Load all pages
    for (const page of allPages) {
        page();
    }

    // Find (all) routes that match
    for (const route of routes) {
        inner: for (const match of route.matches) {
            const regex = new RegExp(
                '^' +
                    match
                        .replace(/\*\*/g, '(?:[a-zA-Z0-9_/]+)')
                        .replace(/\*/g, '(?:[a-zA-Z0-9_]+)') +
                    '$'
            );

            if (regex.test(path)) {
                route.route();
                // Break out of this loop but not the outer loop
                break inner;
            }
        }
    }
};

// Load solid
const loadSolid = async () => {
    const logger = Logger.createContext('content::loadSolid');

    // Create root element
    const root = document.createElement('div');
    root.id = 'sgyplus-root';
    root.style.display = 'none';
    document.body.appendChild(root);

    // Create shadow root
    const shadow = root.attachShadow({ mode: 'open' });

    logger.info('Mounted solid root element!');

    // Init solid
    render(() => <App />, shadow);
};

const main = async () => {
    // Add dark mode by default so that the page doesn't flash white
    document.documentElement.classList.add('dark');

    // Load solid
    await loadSolid();

    // Load the store
    StorableSettings.load();

    // Load the cache
    await CachedDataStore.load();

    // Load page
    loadPage(new URL(location.toString()), routes);
};

document.addEventListener('DOMContentLoaded', main);
