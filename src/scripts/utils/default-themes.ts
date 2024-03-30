import browser from "webextension-polyfill";

import { SchoologyThemeV2 } from "./theme-model";

export const LAUSD_THEMES = ["LAUSD Orange", "LAUSD Dark Blue", "LAUSD 2019"];
export const CLASSIC_THEMES = ["Schoology Plus", "Rainbow"];

export const DEFAULT_THEMES: SchoologyThemeV2[] = [
    {
        name: "Schoology Plus Modern Light",
        version: 2,
        color: {
            hue: 200,
            modern: {
                dark: false,
                interface: {
                    primary: "#EAEAEA",
                    accent: "#F7F7F7",
                    secondary: "#DDD",
                    input: "#D0D0D0",
                    border: "#BABABA",
                    highlight: "rgba(255, 183, 2, 0.2)",
                    active: "rgba(152, 212, 228, 0.8)",
                    grades: "#009400",
                    error: "#F44336",
                },
                calendar: [
                    "#d6e7f4",
                    "#d7e8cf",
                    "#f9e9d4",
                    "#e7e0e5",
                    "#e6b5c9",
                    "#f9f1cf",
                    "#daf0f9",
                    "#f9ddea",
                    "#fbd7d8",
                    "#f1f2d1",
                    "#e0e8f5",
                    "#fbd7e4",
                    "#fcddd3",
                    "#e7f2d5",
                    "#e6e0ee",
                    "#f0e5db",
                    "#fce8d1",
                    "#e1f1e7",
                    "#f0dfed",
                    "#e9e9ea",
                    "#00427c",
                    "#603073",
                    "#8b1941",
                    "#970c0c",
                    "#9c3b07",
                    "#685203",
                    "#2a5f16",
                    "#09584f",
                    "#005a75",
                    "#4d5557",
                ],
                text: {
                    primary: "#2A2A2A",
                    muted: "#677583",
                    contrast: "white",
                },
                options: {
                    borderRadius: 5,
                    borderSize: 1,
                    padding: 10,
                },
            },
        },
        logo: {
            preset: "schoology_plus",
        },
    },
    {
        name: "Schoology Plus Modern Dark",
        version: 2,
        color: {
            custom: {
                primary: "#202225",
                hover: "#40444B",
                background: "#36393f",
                border: "#40444b",
                link: "#6fa8dc",
            },
            modern: {
                dark: true,
                interface: {
                    primary: "#36393F",
                    accent: "#2F3136",
                    secondary: "#202225",
                    input: "#40444B",
                    border: "#DCDDDE",
                    highlight: "rgba(184, 134, 11, 0.2)",
                    active: "rgba(0, 255, 255, 0.1)",
                    grades: "#8BC34A",
                    error: "#F44336",
                },
                calendar: [
                    "#457da5",
                    "#547c41",
                    "#926c37",
                    "#7c3d6b",
                    "#0b4c9c",
                    "#00209c",
                    "#004a09",
                    "#72721a",
                    "#44233e",
                    "#683131",
                    "#770a0a",
                    "#a72413",
                    "#E0024C",
                    "#188C16",
                    "#bd7304",
                    "#80168C",
                    "#164152",
                    "#00543f",
                    "#633e11",
                    "#461b2d",
                    "#00427c",
                    "#603073",
                    "#8b1941",
                    "#970c0c",
                    "#9c3b07",
                    "#685203",
                    "#2a5f16",
                    "#09584f",
                    "#005a75",
                    "#4d5557",
                ],
                text: {
                    primary: "#DCDDDE",
                    muted: "#72767D",
                    contrast: "#EEEEEE",
                },
                options: {
                    borderRadius: 5,
                    borderSize: 1,
                    padding: 10,
                },
            },
        },
        logo: {
            preset: "schoology_plus",
        },
    },
    {
        name: "Rainbow Modern",
        version: 2,
        color: {
            rainbow: {
                hue: {
                    animate: {
                        speed: 50,
                        offset: 0,
                        min: 0,
                        max: 359,
                        alternate: false,
                    },
                },
                saturation: {
                    value: 50,
                },
                lightness: {
                    value: 50,
                },
            },
            modern: {
                dark: false,
                interface: {
                    primary: "#EAEAEA",
                    accent: "#F7F7F7",
                    secondary: "#DDD",
                    input: "#D0D0D0",
                    border: "#BABABA",
                    highlight: "rgba(255, 183, 2, 0.2)",
                    active: "rgba(152, 212, 228, 0.8)",
                    grades: "#009400",
                    error: "#F44336",
                },
                calendar: [
                    "#d6e7f4",
                    "#d7e8cf",
                    "#f9e9d4",
                    "#e7e0e5",
                    "#e6b5c9",
                    "#f9f1cf",
                    "#daf0f9",
                    "#f9ddea",
                    "#fbd7d8",
                    "#f1f2d1",
                    "#e0e8f5",
                    "#fbd7e4",
                    "#fcddd3",
                    "#e7f2d5",
                    "#e6e0ee",
                    "#f0e5db",
                    "#fce8d1",
                    "#e1f1e7",
                    "#f0dfed",
                    "#e9e9ea",
                    "#00427c",
                    "#603073",
                    "#8b1941",
                    "#970c0c",
                    "#9c3b07",
                    "#685203",
                    "#2a5f16",
                    "#09584f",
                    "#005a75",
                    "#4d5557",
                ],
                text: {
                    primary: "#2A2A2A",
                    muted: "#677583",
                    contrast: "white",
                },
                options: {
                    borderRadius: 5,
                    borderSize: 1,
                    padding: 10,
                },
            },
        },
        logo: {
            preset: "schoology_plus",
        },
    },
    {
        name: "Schoology Plus",
        version: 2,
        color: {
            hue: 210,
        },
        logo: {
            preset: "schoology_plus",
        },
    },
    {
        name: "Rainbow",
        version: 2,
        color: {
            rainbow: {
                hue: {
                    animate: {
                        speed: 50,
                        offset: 0,
                        min: 0,
                        max: 359,
                        alternate: false,
                    },
                },
                saturation: {
                    value: 50,
                },
                lightness: {
                    value: 50,
                },
            },
        },
        logo: {
            preset: "schoology_plus",
        },
    },
    {
        name: "Toy",
        version: 2,
        color: {
            hue: 150,
        },
        logo: {
            preset: "schoology_plus",
        },
        cursor: {
            primary: browser.runtime.getURL("/imgs/toy-mode.png"),
        },
    },
    {
        name: "LAUSD Dark Blue",
        version: 2,
        color: {
            custom: {
                primary: "#143f69",
                hover: "#345f89",
                background: "#345f89",
                border: "#024f7d",
            },
        },
        logo: {
            preset: "lausd_2022",
        },
    },
    {
        name: "LAUSD 2019",
        version: 2,
        color: {
            custom: {
                primary: "#143f69",
                hover: "#345f89",
                background: "#345f89",
                border: "#024f7d",
            },
        },
        logo: {
            preset: "lausd_2019",
        },
    },
    {
        name: "LAUSD Orange",
        version: 2,
        color: {
            custom: {
                primary: "#ff7a00",
                hover: "#ff9a20",
                background: "#ff8a10",
                border: "#df5a00",
            },
        },
        logo: {
            preset: "lausd_legacy",
        },
    },
    {
        name: "Schoology Default",
        version: 2,
        color: {
            custom: {
                primary: "#0677ba",
                hover: "#024f7d",
                background: "#002c47",
                border: "#024f7d",
            },
        },
        logo: {
            preset: "schoology_logo",
        },
    },
];
