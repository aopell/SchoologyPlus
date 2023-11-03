import { Component, onCleanup, onMount } from 'solid-js';
import { MountableElementsStore } from '../solid.jsx';
import { Logger } from '../utils/logger.js';
import { Portal } from 'solid-js/web';

// Import css as file name (like an asset)
import main from '../styles/main.css?inline';

export const theme = () => {
    const logger = Logger.createContext('addons::theme');

    logger.info('Theme loaded!');

    // Mount the theme
    MountableElementsStore.registerComponent(Theme);
};

const Theme: Component = () => {
    onMount(() => {
        const updateTheme = () => {
            // Media query
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

            // Set the theme
            document.documentElement.classList.add(prefersDark.matches ? 'dark' : 'light');

            // Remove the other theme
            document.documentElement.classList.remove(prefersDark.matches ? 'light' : 'dark');
        };

        const listener = window.matchMedia('(prefers-color-scheme: dark)');

        // On media change
        listener.addEventListener('change', updateTheme);

        // Update the theme
        updateTheme();

        onCleanup(() => {
            listener.removeEventListener('change', updateTheme);
            document.documentElement.classList.remove('dark', 'light');
        });
    });

    return (
        <Portal mount={document.head}>
            <style>{main}</style>
        </Portal>
    );
};
