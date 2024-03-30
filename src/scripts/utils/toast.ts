import iziToast, {
    IziToast,
    IziToastPosition,
    IziToastSettings,
    IziToastTransitionOut,
} from "izitoast";
import browser from "webextension-polyfill";

import { trackEvent } from "./analytics";

type ToastButton = [
    string,
    (
        instance: IziToast,
        toast: HTMLDivElement,
        button: HTMLButtonElement,
        event: MouseEvent,
        inputs: Array<HTMLInputElement>
    ) => void,
    boolean
];

/**
 * Shows an iziToast with the given options
 * @param {string} title Toast title
 * @param {string} message Toast message
 * @param {string} color Progress bar color
 * @param {{theme:string,layout:number,buttons:[],timeout:number,position:string,options:{}}} options Options object (options object inside options is for additional options). Default values: `{ theme: "dark", layout: 1, timeout: 0, position: "topRight", iconUrl: chrome.runtime.getURL("/imgs/plus-icon.png") }`
 */
export function showToast(
    title: string,
    message: string,
    color: string,
    {
        theme = "dark",
        layout = 1,
        buttons = [],
        timeout = 0,
        position = "topRight",
        options = {},
        iconUrl = browser.runtime.getURL("/imgs/plus-icon.png"),
    }: {
        theme?: string;
        layout?: number;
        buttons?: ToastButton[];
        timeout?: number;
        position?: IziToastPosition;
        iconUrl?: string;
        options?: IziToastSettings;
    } = {
        theme: "dark",
        layout: 1,
        timeout: 0,
        position: "topRight",
        iconUrl: browser.runtime.getURL("/imgs/plus-icon.png"),
    }
) {
    let toastOptions = {
        theme,
        iconUrl,
        title,
        message,
        progressBarColor: color,
        layout,
        buttons,
        timeout,
        position,
    };
    Object.assign(toastOptions, options);
    iziToast.show(toastOptions);
}

/**
 * Creates a button for an iziToast. Results of calls to this function should be passed to `showToast` as an array.
 * @param {string} text Text to display on the button
 * @param {string} id The element ID of the button
 * @param {(instance:any,toast:any,closedBy:any)=>void} onClick Function called when the button is clicked
 * @param {"fadeOut"|"fadeOutUp"|"fadeOutDown"|"fadeOutLeft"|"fadeOutRight"|"flipOutX"} [transition="fadeOutRight"] The notification's exit transition
 * @returns {ToastButton}
 */
export function createToastButton(
    text: string,
    id: string,
    onClick: (instance: IziToastSettings, toast: HTMLDivElement, closedBy: string) => void,
    transition: IziToastTransitionOut = "fadeOutRight",
    focus: boolean = true
): ToastButton {
    return [
        `<button>${text}</button>`,
        function (instance, toast) {
            instance.hide(
                {
                    transitionOut: transition,
                    onClosing: function (instance, toast, closedBy) {
                        trackEvent("button_click", {
                            id: id || text,
                            context: "Toast",
                            legacyTarget: id || text,
                            legacyAction: "click",
                            legacyLabel: "Toast Button",
                        });
                        onClick(instance, toast, closedBy);
                    },
                },
                toast,
                id
            );
        },
        focus,
    ];
}
