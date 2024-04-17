import { createElement } from "./dom";

interface BetaTest {
    name: string;
    description: string;
    url: string;
    controls?: () => HTMLElement;
    activate?: () => void;
}

export const BETA_TESTS: Record<string, BetaTest> = {
    // test: "https://schoologypl.us",
    mv3: {
        name: "Manifest v3",
        description:
            "Schoology Plus is currently being rewritten to use the new Manifest v3 API. The extension has been modified substantially to accommodate this change. Please test as many features as possible and report any issues you encounter.",
        url: "https://discord.schoologypl.us",
        controls: () => {
            return createElement("div", [], {}, [
                createElement("a", [], {
                    textContent: "Report an Issue on Discord",
                    href: "https://discord.schoologypl.us",
                }),
            ]);
        },
        activate: () => {},
    },
};

export const FORCED_BETA_TEST: string | undefined = "mv3";

export function createBetaSection(name: string) {
    return createElement("div", ["splus-beta-section"], { id: `splus-beta-section-${name}` }, [
        createElement("h3", [], {}, [
            createElement("a", [], {
                href: BETA_TESTS[name].url,
                textContent:
                    BETA_TESTS[name].name +
                    (FORCED_BETA_TEST === name ? " [Cannot be disabled]" : ""),
                style: {
                    color: "white !important",
                },
            }),
        ]),
        createElement("p", [], { textContent: BETA_TESTS[name].description }),
        BETA_TESTS[name].controls?.() ?? createElement("div"),
    ]);
}

function createBetaToggleCheckbox(
    name: string,
    onchange: (e: Event) => void,
    checked = false,
    nestingLevel = 1
) {
    return createElement(
        "div",
        ["splus-beta-toggle"],
        { style: { paddingLeft: `${(nestingLevel - 1) * 10}px` } },
        [
            createElement("label", [], { textContent: name }),
            createElement("input", [], {
                type: "checkbox",
                checked: checked,
                onchange: onchange,
            }),
        ]
    );
}
