import { Component, createSignal, onCleanup, onMount } from 'solid-js';
import { Logger } from '../utils/logger';
import { Portal } from 'solid-js/web';
import { MountableElementsStore } from '../solid';

import wordmark from '../assets/logo/wordmark.svg';

export const apiPage = () => {
    const logger = Logger.createContext('pages::api::apiPage');

    logger.info('API page loaded!');

    MountableElementsStore.registerComponent(ApiPortal);
};

const ApiPortal: Component = () => {
    const logger = Logger.createContext('pages::api::ApiPortal');
    const [titleMount, setTitleMount] = createSignal<HTMLElement>(document.createElement('div'));
    const [mount, setMount] = createSignal<HTMLElement>(document.createElement('div'));
    const [editReveal, setEditReveal] = createSignal<HTMLElement | null>(null);

    onMount(() => {
        const mount = document.getElementById('content-wrapper');
        const titleMount = document.getElementById('center-top');
        const editReveal = document.getElementById('edit-reveal');

        if (!mount) {
            logger.error('Could not find mount point!');
            return;
        }

        if (!titleMount) {
            logger.error('Could not find title mount point!');
            return;
        }

        // Hide all children from the mount point
        for (const child of mount.children) {
            child.setAttribute('data-splus-hidden', 'true');
            child.setAttribute('style', 'display: none !important;');
        }

        // Hide all children from the mount point
        for (const child of titleMount.children) {
            child.setAttribute('data-splus-hidden', 'true');
            child.setAttribute('style', 'display: none !important;');
        }

        setMount(mount);
        setTitleMount(titleMount);
        setEditReveal(editReveal);

        onCleanup(() => {
            // Show all children from the mount point
            for (const child of mount.children) {
                child.removeAttribute('data-splus-hidden');
                child.removeAttribute('style');
            }

            // Show all children from the mount point
            for (const child of titleMount.children) {
                child.removeAttribute('data-splus-hidden');
                child.removeAttribute('style');
            }
        });
    });

    return (
        <>
            <Portal mount={titleMount()}>
                <div
                    style={{
                        display: 'flex'
                    }}
                >
                    <h2 class='page-title'>Schoology+ API Access</h2>
                    <div
                        style={{
                            'flex-grow': 1
                        }}
                    />
                    <div class='s-rte'>
                        <input
                            type='submit'
                            onClick={() => {
                                MountableElementsStore.removeComponent(ApiPortal);
                            }}
                            value='Manage API Keys'
                        />
                    </div>
                </div>
            </Portal>
            <Portal mount={mount()}>
                <div
                    class='s-rte'
                    style={{
                        padding: '1rem'
                    }}
                >
                    <div
                        style={{
                            padding: '1rem 0',
                            width: '100%'
                        }}
                    >
                        <div
                            style={{
                                width: '100%',
                                height: '4rem',
                                'background-color': 'currentColor',
                                '-webkit-mask': `url(${chrome.runtime.getURL(
                                    wordmark
                                )}) no-repeat left / contain`,
                                mask: `url(${chrome.runtime.getURL(
                                    wordmark
                                )}) no-repeat left / contain`
                            }}
                        />
                    </div>
                    <p>
                        The Schoology Plus needs access to the Schoology API for some features to
                        work. These features include:
                    </p>
                    <ul>
                        <li>What-If Grades</li>
                        <li>Assignment Checkmarks</li>
                        <li>Quick Access</li>
                        <li>Courses in Common</li>
                    </ul>
                    <p>
                        By providing access to your API key, Schoology Plus can view extra details
                        about the courses you're enrolled in.
                    </p>
                    <p>
                        <strong>Schoology Plus will never:</strong>
                    </p>
                    <ul>
                        <li>
                            <strong>Collect or store any personal information</strong>
                        </li>
                        <li>
                            <strong>Have access to your account's password</strong>
                        </li>
                    </ul>
                    <p>
                        To allow access, click the button below.{' '}
                        <strong>
                            If you just want to generate an API key, click the "Manage API Keys"
                            button in the top right.
                        </strong>
                    </p>
                    <p>
                        If you have any questions, you can view the code on{' '}
                        <a href='https://github.com/aopell/SchoologyPlus' target='_blank'>
                            GitHub
                        </a>{' '}
                        or contact us on{' '}
                        <a href='https://discord.schoologypl.us' target='_blank'>
                            Discord
                        </a>
                        . You can change this setting at any time in the Schoology Plus settings
                        menu.
                    </p>
                    {editReveal() === null && (
                        <p
                            style={{
                                color: 'var(--error, #F44336)'
                            }}
                        >
                            It looks like your school or district has disabled API Key generation.
                            Unfortunately, this means the above features will not work. The rest of
                            Schoology Plus' features will still work, though!{' '}
                            <a href='https://schoologypl.us/docs/faq/api' target='_blank'>
                                Learn More
                            </a>
                        </p>
                    )}
                    {editReveal() !== null && <input type='submit' value='Allow API Access' />}
                </div>
            </Portal>
        </>
    );
};
