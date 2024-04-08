type DeepPartial<T> = {
    [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

/**
 * Creates a DOM element
 * @returns {HTMLElement} A DOM element
 * @param {string} tag - The HTML tag name of the type of DOM element to create
 * @param {string[]} classList - CSS classes to apply to the DOM element
 * @param {Object.<string,any>} properties - Properties to apply to the DOM element
 * @param {HTMLElement[]} children - Elements to append as children to the created element
 */
export function createElement<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    classList?: string[],
    properties?: DeepPartial<HTMLElementTagNameMap[K]>,
    children?: Element[]
): HTMLElementTagNameMap[K] {
    let element = document.createElement(tag);

    if (classList) {
        for (let c of classList) {
            element.classList.add(c);
        }
    }
    if (properties) {
        for (let property in properties) {
            if (
                properties[property] instanceof Object &&
                !(properties[property] instanceof Function)
            ) {
                for (let subproperty in properties[property]) {
                    element[property][subproperty] = properties[property][subproperty] as any;
                }
            } else if (property !== undefined && properties[property] !== undefined) {
                element[property] = properties[property] as any;
            }
        }
    }
    if (children) {
        for (let child of children) {
            element.appendChild(child);
        }
    }
    return element;
}

/**
 * Creates a Schoology Plus themed button element
 * @param {string} id The ID for the button element
 * @param {string} text The text to show on the button
 * @param {(e: Event)=>void} callback A function to be called when the button is clicked
 */
export function createButton(id: string, text: string, callback?: (e: Event) => void) {
    return createElement(
        "span",
        ["submit-span-wrapper", "splus-modal-button"],
        { onclick: callback },
        [
            createElement("input", ["form-submit", "splus-track-clicks"], {
                type: "button",
                value: text,
                id: id,
                dataset: { splusTrackingContext: "S+ Button" },
            }),
        ]
    );
}

/**
 * Returns the name of the current browser
 * @returns {"Chrome"|"Firefox"|"Other"} Name of the current browser
 */
export function getBrowser(): "Chrome" | "Firefox" | "Other" {
    if (typeof (globalThis as any).chrome !== "undefined") {
        if (typeof (globalThis as any).browser !== "undefined") {
            return "Firefox";
        } else {
            // Likely captures all Chromium-based browsers
            return "Chrome";
        }
    } else {
        return "Other";
    }
}

/**
 * Returns `true` if an element is visible to the user
 * @param {HTMLElement} elem The element to check for visibility
 * @returns {boolean} `true` if element is visible
 */
export function isVisible(elem: HTMLElement): boolean {
    return !!(elem.offsetWidth || elem.offsetHeight || elem.getClientRects().length);
}

/**
 * Returns all parent elements matching the provided selector.
 * Essentially works like a reverse `document.querySelectorAll`.
 * @param {HTMLElement} elem The target element
 * @param {string} selector A CSS selector
 * @returns {HTMLElement[]} An array of matching parent elements
 */
export function getParents(elem: HTMLElement, selector: string): HTMLElement[] {
    var parents: HTMLElement[] = [];
    var firstChar: string | undefined;
    if (selector) {
        firstChar = selector.charAt(0);
    }
    for (; elem && elem !== document.documentElement; elem = elem.parentNode as HTMLElement) {
        if (selector) {
            if (firstChar === ".") {
                if (elem.classList.contains(selector.substr(1))) {
                    parents.push(elem);
                }
            }
            if (firstChar === "#") {
                if (elem.id === selector.substr(1)) {
                    parents.push(elem);
                }
            }
            if (firstChar === "[") {
                if (elem.hasAttribute(selector.substr(1, selector.length - 1))) {
                    parents.push(elem);
                }
            }
            if (elem.tagName.toLowerCase() === selector) {
                parents.push(elem);
            }
        } else {
            parents.push(elem);
        }
    }

    return parents;
}

/**
 * Sets the value of a CSS variable on the document
 * @param {string} name Variable name
 * @param {string} val New variable value
 */
export function setCSSVariable(name: string, val?: string | null) {
    document.documentElement.style.setProperty(`--${name}`, val ?? null);
}

export function createSvgLogo(...classes: string[]) {
    let circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", "250");
    circle.setAttribute("cy", "250");
    circle.setAttribute("r", "230");
    circle.setAttribute("style", "fill: none; stroke-width: 35px; stroke: currentColor;");
    let line1 = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line1.setAttribute("x1", "250");
    line1.setAttribute("y1", "125");
    line1.setAttribute("x2", "250");
    line1.setAttribute("y2", "375");
    line1.setAttribute("style", "stroke-linecap: round; stroke-width: 35px; stroke: currentColor;");
    let line2 = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line2.setAttribute("x1", "125");
    line2.setAttribute("y1", "250");
    line2.setAttribute("x2", "375");
    line2.setAttribute("y2", "250");
    line2.setAttribute("style", "stroke-linecap: round; stroke-width: 35px; stroke: currentColor;");

    let svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 500 500");

    svg.append(circle, line1, line2);

    if (classes) {
        svg.classList.add(...classes);
    }

    return svg;
}
