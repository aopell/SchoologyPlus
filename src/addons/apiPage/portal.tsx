import { Component, createSignal, onCleanup, onMount } from 'solid-js';
import { Logger } from '../../utils/logger.js';
import { Portal } from 'solid-js/web';
import { MountableElementsStore } from '../../solid.jsx';

import wordmark from '../../assets/logo/wordmark.svg';
import { CachedDataStore } from '../../utils/cache.js';
import { StorableSettings } from '../../store/storable.js';

export const ApiPortal: Component = () => {
    const logger = Logger.createContext('addons::api::ApiPortal');
    const [titleMount, setTitleMount] = createSignal<HTMLElement>(document.createElement('div'));
    const [infoMount, setInfoMount] = createSignal<HTMLElement>(document.createElement('div'));
    const [buttonsMount, setButtonsMount] = createSignal<HTMLElement>(
        document.createElement('div')
    );
    const [editRevealRequest, setEditRevealRequest] = createSignal<HTMLElement | null>(null);
    const [success, setSuccess] = createSignal<string | null>(null);
    const [store, setStore] = StorableSettings.getStoreRef();
    const [cache] = CachedDataStore.getStoreRef();

    onMount(() => {
        // Get the form and title mount (cause they don't need to be special)
        const form = document.getElementById('content-wrapper')?.children[0];
        const formItems = form?.children[0];
        const titleMount = document.getElementById('center-top');

        // Get the consumer key and secret mount
        const consumerKeyMount = document.getElementById('edit-current-key');
        const consumerSecretMount = document.getElementById('edit-current-secret');

        const revealed =
            consumerKeyMount &&
            consumerKeyMount instanceof HTMLInputElement &&
            consumerSecretMount &&
            consumerSecretMount instanceof HTMLInputElement &&
            !consumerSecretMount.value.includes('*');

        if (!form || !formItems) {
            logger.error('Could not find form point!');

            // Unmount the component
            MountableElementsStore.removeComponent(ApiPortal);

            return;
        }

        if (!titleMount) {
            logger.error('Could not find title mount point!');

            // Unmount the component
            MountableElementsStore.removeComponent(ApiPortal);

            return;
        }

        // Hide all children from the form point
        for (const child of formItems.children) {
            // Skip the 'h-captcha' element
            if (child.classList.contains('h-captcha')) {
                continue;
            }

            if (revealed) {
                if (
                    ['edit-current-key-wrapper', 'edit-current-secret-wrapper'].includes(child.id)
                ) {
                    continue;
                }
            }

            child.setAttribute('data-splus-hidden', 'true');
            child.setAttribute('style', 'display: none !important;');
        }

        // Hide all children from the title mount point
        for (const child of titleMount.children) {
            child.setAttribute('data-splus-hidden', 'true');
            child.setAttribute('style', 'display: none !important;');
        }

        // Create the mount point
        const infoMount = document.createElement('div');
        const buttonsMount = document.createElement('div');

        // Info mount needs to be prepended
        form.prepend(infoMount);

        // Buttons mount needs to be appended
        form.appendChild(buttonsMount);

        setInfoMount(infoMount);
        setButtonsMount(buttonsMount);
        setTitleMount(titleMount);

        const editRevealRequest =
            document.getElementById('edit-reveal') ?? document.getElementById('edit-request');

        if (!editRevealRequest) {
            logger.error('Could not find edit reveal or edit request or hCaptcha site key!');
        } else {
            // Set the data
            setEditRevealRequest(editRevealRequest);
        }

        // Do stuff w/the keys
        if (revealed) {
            setSuccess('Your API keys have been saved!');
        }

        onCleanup(() => {
            // Remove the mount points
            infoMount.remove();
            buttonsMount.remove();

            // Show all children from the mount point
            for (const child of formItems.children) {
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
                                // Set the bypass query
                                window.location.hash = '#sgyplus-bypass';
                                MountableElementsStore.removeComponent(ApiPortal);
                            }}
                            value='Manage API Keys'
                        />
                    </div>
                </div>
            </Portal>
            <Portal mount={infoMount()}>
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
                        Schoology Plus needs access to the Schoology API for some features to work.
                        These features include:
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
                </div>
            </Portal>
            <Portal mount={buttonsMount()}>
                <div class='s-rte'>
                    {editRevealRequest() === null && (
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
                    {editRevealRequest() !== null && (
                        <>
                            <input
                                type='submit'
                                value='Allow API Access'
                                onClick={async e => {
                                    e.preventDefault();

                                    // Get user id
                                    const userId = cache.user?.id;

                                    if (!userId) {
                                        logger.error('Could not find user id!');
                                        return;
                                    }

                                    store.apiKeys[userId] = {
                                        type: 'non-captured'
                                    };

                                    // Save the store
                                    setStore(store);

                                    // Click the button on the page
                                    editRevealRequest()?.click();
                                }}
                            />
                        </>
                    )}
                    {success() !== null && (
                        <p
                            style={{
                                color: 'var(--success, #4CAF50)'
                            }}
                        >
                            {success()}
                        </p>
                    )}
                </div>
            </Portal>
        </>
    );
};
