import { apiPage } from './pages/api.jsx';
import { assessmentPage } from './pages/assessment.js';
import { coursePage } from './pages/course.js';
import { coursesPage } from './pages/courses.js';
import { gradesPage } from './pages/grades.js';
import { homePage } from './pages/home.js';
import { materialsPage } from './pages/materials.js';
import { pagePage } from './pages/page.js';
import { App } from './solid.jsx';
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
const loadSolid = () => {
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
    render(<App />, shadow);
};

document.addEventListener('DOMContentLoaded', () => {
    // Load solid
    loadSolid();

    // Load page
    loadPage(new URL(location.toString()), routes);
});
