import { createSignal, onCleanup, onMount } from 'solid-js';
import { Logger } from '../utils/logger.js';
import { Portal } from 'solid-js/web';
import { MountableElementsStore } from '../solid.jsx';

import logo from '../assets/logo/logo.svg';

export const toolbar = () => {
    const logger = Logger.createContext('addons::course::coursePage');

    logger.info('Toolbar loaded!');

    MountableElementsStore.registerComponent(Toolbar);
};

const Toolbar = () => {
    const logger = Logger.createContext('addons::course::coursePage');
    const [mount, setMount] = createSignal<HTMLElement>();

    onMount(() => {
        // Find navbar
        const navbar = document.querySelector('nav');

        if (!navbar) {
            logger.error('Could not find navbar!');
            return;
        }

        // Get the second child
        const secondChild = navbar.children[1];

        if (!secondChild) {
            logger.error('Could not find second child of navbar!');
            return;
        }

        // Prepend the toolbar
        const div = document.createElement('div');
        secondChild.prepend(div);

        // Set the mount
        setMount(div);

        // Return the cleanup function
        onCleanup(() => {
            div.remove();
        });
    });

    return (
        <Portal mount={mount() ?? document.createElement('div')}>
            <li>
                <button aria-label='Schoology Plus Settings'>
                    <img
                        style={{
                            width: '2rem',
                            height: '2rem'
                        }}
                        alt='Schoolgy Plus Settings'
                        src={chrome.runtime.getURL(logo)}
                    />
                </button>
            </li>
        </Portal>
    );
};
