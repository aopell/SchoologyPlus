import { InterfaceOf } from "./types";

export class CustomColorDefinition {
    primary: string;
    hover: string;
    background: string;
    border: string;
    link: string;

    /**
     * Allows fine control over individual colors in the interface
     * @param {string} primary The main interface color used in the navigation bar and as the primary color for buttons and other UI elements.
     * @param {string} hover The color of items in the settings menu
     * @param {string} background The background color of buttons and other interactive elements when you hover over them, and the color of the settings dropdown menu
     * @param {string} border The border color of buttons and the border between the navigation bar and drop-down menus
     * @param {string} link The color of links and other interactive text
     */
    constructor(primary: string, hover: string, background: string, border: string, link: string) {
        this.primary = primary;
        this.hover = hover;
        this.background = background;
        this.border = border;
        this.link = link || hover;
    }

    /**
     * Creates and returns a `CustomColorDefinition` given a valid JSON object
     * @param {*} o JSON representation of a `CustomColorDefinition`
     * @returns {CustomColorDefinition}
     */
    static loadFromObject(
        o?: InterfaceOf<CustomColorDefinition>
    ): CustomColorDefinition | undefined {
        return o
            ? new CustomColorDefinition(
                  o.primary,
                  o.hover,
                  o.background,
                  o.border,
                  o.link || o.hover
              )
            : undefined;
    }
}

export class RainbowColorComponentAnimation {
    speed: number;
    offset: number;
    min: number;
    max: number;
    alternate: boolean;

    /**
     * Defines a color animation
     * @param {number} speed Speed of the animation; larger numbers are faster. (0-100)
     * @param {number} offset The initial value for the animation (the first time step); used to create separation between the animations of the different color compontents.
     * @param {number} min The minimum value in the animation cycle; the animation will cycle through all possible values for the component greater than this value and less than max.
     * @param {number} max The maximum value in the animation cycle; the animation will cycle through all possible values for the component less than this value and greater than min.
     * @param {boolean} alternate When true: color compontent animates from min to max and then from max to min. When false: color component animates from min to max and then resets back to min again
     */
    constructor(speed: number, offset: number, min: number, max: number, alternate: boolean) {
        this.speed = speed;
        this.offset = offset;
        this.min = min;
        this.max = max;
        this.alternate = alternate;
    }

    /**
     * Creates and returns a `RainbowColorComponentAnimation` given a valid JSON object
     * @param {*} o JSON representation of a `RainbowColorComponentAnimation`
     * @returns {RainbowColorComponentAnimation}
     */
    static loadFromObject(
        o?: InterfaceOf<RainbowColorComponentAnimation>
    ): RainbowColorComponentAnimation | undefined {
        return o
            ? new RainbowColorComponentAnimation(o.speed, o.offset, o.min, o.max, o.alternate)
            : undefined;
    }
}

export class RainbowColorComponentDefinition {
    animate?: RainbowColorComponentAnimation;
    value?: number;

    /**
     * Defines a rainbow color component (hue, saturation, lightness)
     * @param {RainbowColorComponentAnimation} animate Defines a color animation
     * @param {number} value Defines a static color
     */
    constructor(animate?: RainbowColorComponentAnimation, value?: number) {
        this.animate = animate;
        this.value = value;
    }

    /**
     * Creates and returns a `RainbowColorComponentDefinition` given a valid JSON object
     * @param {*} o JSON representation of a `RainbowColorComponentDefinition`
     * @returns {RainbowColorComponentDefinition}
     */
    static loadFromObject(
        o?: InterfaceOf<RainbowColorComponentDefinition>
    ): RainbowColorComponentDefinition | undefined {
        return o
            ? new RainbowColorComponentDefinition(
                  RainbowColorComponentAnimation.loadFromObject(o.animate),
                  o.value
              )
            : undefined;
    }
}

export class RainbowColorDefinition {
    hue?: RainbowColorComponentDefinition;
    saturation?: RainbowColorComponentDefinition;
    lightness?: RainbowColorComponentDefinition;

    /**
     * Allows for animations of hue, saturation, and lightness of interface colors.
     * @param {RainbowColorComponentDefinition} hue Defines behavior of the hue component of the interface colors
     * @param {RainbowColorComponentDefinition} saturation Defines behavior of the saturation component of the interface colors
     * @param {RainbowColorComponentDefinition} lightness Defines behavior of the lightness component of the interface colors
     */
    constructor(
        hue?: RainbowColorComponentDefinition,
        saturation?: RainbowColorComponentDefinition,
        lightness?: RainbowColorComponentDefinition
    ) {
        this.hue = hue;
        this.saturation = saturation;
        this.lightness = lightness;
    }

    /**
     * Creates and returns a `RainbowColorDefinition` given a valid JSON object
     * @param {*} o JSON representation of a `RainbowColorDefinition`
     * @returns {RainbowColorDefinition}
     */
    static loadFromObject(
        o?: InterfaceOf<RainbowColorDefinition>
    ): RainbowColorDefinition | undefined {
        return o
            ? new RainbowColorDefinition(
                  RainbowColorComponentDefinition.loadFromObject(o.hue),
                  RainbowColorComponentDefinition.loadFromObject(o.saturation),
                  RainbowColorComponentDefinition.loadFromObject(o.lightness)
              )
            : undefined;
    }
}

export class ModernInterfaceColorDefinition {
    primary: string;
    accent: string;
    secondary: string;
    input: string;
    border: string;
    highlight: string;
    active: string;
    grades: string;
    error: string;

    /**
     * Defines individual colors for different Schoology interface components
     * @param {string} primary Primary interface color -- should be the lightest of the main colors
     * @param {string} accent Accent interface color -- should be darker than primary, but lighter than secondary
     * @param {string} secondary Secondary interface color -- should be the darkest of the main colors
     * @param {string} input Color for textboxes and other input fields
     * @param {string} border Color for element borders
     * @param {string} highlight Color for highlights, warnings, and wrong answers
     * @param {string} active Color for active elements, selected items, and correct answers
     * @param {string} grades Color for grades and scores
     * @param {string} error Color for error messages and icons
     */
    constructor(
        primary: string,
        accent: string,
        secondary: string,
        input: string,
        border: string,
        highlight: string,
        active: string,
        grades: string,
        error: string
    ) {
        this.primary = primary;
        this.accent = accent;
        this.secondary = secondary;
        this.input = input;
        this.border = border;
        this.highlight = highlight;
        this.active = active;
        this.grades = grades;
        this.error = error;
    }

    /**
     * Creates and returns a `ModernInterfaceColorDefinition` given a valid JSON object
     * @param {*} o JSON representation of a `ModernInterfaceColorDefinition`
     * @returns {ModernInterfaceColorDefinition}
     */
    static loadFromObject(
        o?: InterfaceOf<ModernInterfaceColorDefinition>
    ): ModernInterfaceColorDefinition | undefined {
        return o
            ? new ModernInterfaceColorDefinition(
                  o.primary,
                  o.accent,
                  o.secondary,
                  o.input,
                  o.border,
                  o.highlight,
                  o.active,
                  o.grades,
                  o.error
              )
            : undefined;
    }
}

export class ModernTextColorDefinition {
    primary: string;
    muted: string;
    contrast: string;

    /**
     * Defines colors for textual elements of the Schoology interface
     * @param {string} primary Main text color, should contrast with `interface.primary`
     * @param {string} muted Muted text color, should stand out less than primary
     * @param {string} contrast Contrast text color, should always be light or white
     */
    constructor(primary: string, muted: string, contrast: string) {
        this.primary = primary;
        this.muted = muted;
        this.contrast = contrast;
    }

    /**
     * Creates and returns a `ModernTextColorDefinition` given a valid JSON object
     * @param {*} o JSON representation of a `ModernTextColorDefinition`
     * @returns {ModernTextColorDefinition}
     */
    static loadFromObject(
        o?: InterfaceOf<ModernTextColorDefinition>
    ): ModernTextColorDefinition | undefined {
        return o ? new ModernTextColorDefinition(o.primary, o.muted, o.contrast) : undefined;
    }
}

export class ModernOptionsDefinition {
    borderRadius: number;
    borderSize: number;
    padding: number;

    /**
     * Configures style options for the modern theme engine
     * @param {number} borderRadius The size of border radius rounded corners (in pixels)
     * @param {number} borderSize The width of borders (in pixels)
     * @param {number} padding The amount of padding for certain elements (in pixels)
     */
    constructor(borderRadius: number, borderSize: number, padding: number) {
        this.borderRadius = borderRadius;
        this.borderSize = borderSize;
        this.padding = padding;
    }

    /**
     * Creates and returns a `ModernOptionsDefinition` given a valid JSON object
     * @param {*} o JSON representation of a `ModernOptionsDefinition`
     * @returns {ModernOptionsDefinition}
     */
    static loadFromObject(
        o?: InterfaceOf<ModernOptionsDefinition>
    ): ModernOptionsDefinition | undefined {
        return o ? new ModernOptionsDefinition(o.borderRadius, o.borderSize, o.padding) : undefined;
    }
}

export class ModernColorDefinition {
    dark?: boolean;
    interface?: ModernInterfaceColorDefinition;
    calendar?: string[];
    text?: ModernTextColorDefinition;
    options?: ModernOptionsDefinition;

    /**
     * Utilizes the modern theme engine to control significantly more of the interface's colors.
     * @param {boolean} dark Whether the theme is dark or light
     * @param {ModernInterfaceColorDefinition} interfaceColors Colors for main interface components
     * @param {string[]} calendar Colors for Schoology calendar events (specify exactly 20)
     * @param {ModernTextColorDefinition} text Colors for text elements
     * @param {ModernOptionsDefinition} options Style options for the interface
     */
    constructor(
        dark?: boolean,
        interfaceColors?: ModernInterfaceColorDefinition,
        calendar?: string[],
        text?: ModernTextColorDefinition,
        options?: ModernOptionsDefinition
    ) {
        this.dark = dark;
        this.interface = interfaceColors;
        this.calendar = calendar;
        this.text = text;
        this.options = options;
    }

    /**
     * Creates and returns a `ModernColorDefinition` given a valid JSON object
     * @param {*} o JSON representation of a `ModernColorDefinition`
     * @returns {ModernColorDefinition}
     */
    static loadFromObject(
        o?: InterfaceOf<ModernColorDefinition>
    ): ModernColorDefinition | undefined {
        return o
            ? new ModernColorDefinition(
                  o.dark,
                  ModernInterfaceColorDefinition.loadFromObject(o.interface),
                  o.calendar,
                  ModernTextColorDefinition.loadFromObject(o.text),
                  ModernOptionsDefinition.loadFromObject(o.options)
              )
            : undefined;
    }
}

export class ThemeColor {
    hue?: number;
    custom?: CustomColorDefinition;
    rainbow?: RainbowColorDefinition;
    modern?: ModernColorDefinition;

    /**
     * Describes the colors to use for the Schoology interface
     * @param {number} hue The theme's HSL color hue, used to color the interface by modifying the saturation and lightness values
     * @param {CustomColorDefinition} custom Allows fine control over individual colors in the interface
     * @param {RainbowColorDefinition} rainbow Allows for animations of hue, saturation, and lightness of interface colors
     * @param {ModernColorDefinition} modern Utilizes the modern theme engine to control significantly more of the interface's colors
     */
    constructor(
        hue?: number,
        custom?: CustomColorDefinition,
        rainbow?: RainbowColorDefinition,
        modern?: ModernColorDefinition
    ) {
        this.hue = hue;
        this.custom = custom;
        this.rainbow = rainbow;
        this.modern = modern;
    }

    /**
     * Creates and returns a `ThemeColor` given a valid JSON object
     * @param {*} o JSON representation of a `ThemeColor`
     * @returns {ThemeColor}
     */
    static loadFromObject(o?: InterfaceOf<ThemeColor>): ThemeColor {
        return o
            ? new ThemeColor(
                  o.hue,
                  CustomColorDefinition.loadFromObject(o.custom),
                  RainbowColorDefinition.loadFromObject(o.rainbow),
                  ModernColorDefinition.loadFromObject(o.modern)
              )
            : new ThemeColor(210);
    }
}

type ThemeLogoPreset =
    | "schoology_plus"
    | "schoology_logo"
    | "lausd_legacy"
    | "lausd_2019"
    | "lausd_2022"
    | "default";

export class ThemeLogo {
    url?: string;
    preset?: ThemeLogoPreset;

    /**
     * Defines a logo image
     * @param {string} url Link to an image
     * @param {"schoology_plus"|"schoology_logo"|"lausd_legacy"|"lausd_2019"|"lausd_2022"|"default"} preset Built-in image
     */
    constructor(
        url?: string,
        preset?:
            | "schoology_plus"
            | "schoology_logo"
            | "lausd_legacy"
            | "lausd_2019"
            | "lausd_2022"
            | "default"
    ) {
        this.url = url;
        this.preset = preset;
    }

    /**
     * Creates and returns a `ThemeLogo` given a valid JSON object
     * @param {*} o JSON representation of a `ThemeLogo`
     * @returns {ThemeLogo}
     */
    static loadFromObject(o?: InterfaceOf<ThemeLogo>): ThemeLogo {
        return o ? new ThemeLogo(o.url, o.preset) : new ThemeLogo(undefined, "schoology_plus");
    }
}

export class ThemeCursor {
    primary: string;

    /**
     * Defines a cursor image
     * @param {string} primary Link to an image
     */
    constructor(primary: string) {
        this.primary = primary;
    }

    /**
     * Creates and returns a `ThemeCursor` given a valid JSON object
     * @param {*} o JSON representation of a `ThemeCursor`
     * @returns {ThemeCursor}
     */
    static loadFromObject(o?: InterfaceOf<ThemeCursor>): ThemeCursor | undefined {
        return o ? new ThemeCursor(o.primary) : undefined;
    }
}

export class ThemeIcon {
    regex: RegExp | string;
    url: string;

    /**
     * Defines a custom course icon
     * @param {RegExp|string} regex Regular expression to match courses
     * @param {string} url Link to an image
     */
    constructor(regex: RegExp | string, url: string) {
        this.regex = regex;
        this.url = url;
    }

    /**
     * Creates and returns a `ThemeIcon[]` given a valid JSON array
     * @param {[]} array JSON representation of a `ThemeIcon[]`
     * @returns {ThemeIcon[]}
     */
    static loadArrayFromObject(array?: InterfaceOf<ThemeIcon>[]): ThemeIcon[] | undefined {
        return array ? array.map(x => new ThemeIcon(x.regex, x.url)) : undefined;
    }
}

/**
 * @deprecated V1 themes are no longer supported. Use `ISchoologyThemeV2` instead.
 */
export interface SchoologyThemeV1 {
    name: string;
    colors?: string[];
    hue?: number;
    cursor?: string;
    logo?: string;
    icons?: string[][]; // [regex, url]

    version: undefined;
    color: undefined;
}

export interface SchoologyThemeV2 {
    name: string;
    version: 2;
    color: Pick<ThemeColor, keyof ThemeColor>;
    logo?: Pick<ThemeLogo, keyof ThemeLogo>;
    cursor?: Pick<ThemeCursor, keyof ThemeCursor>;
    icons?: Pick<ThemeIcon, keyof ThemeIcon>[];
}

export type AnySchoolgyTheme = SchoologyThemeV1 | SchoologyThemeV2;

export class SchoologyTheme implements SchoologyThemeV2 {
    name: string;
    version: 2;
    color: ThemeColor;
    logo?: ThemeLogo;
    cursor?: ThemeCursor;
    icons?: ThemeIcon[];

    /**
     * Creates a theme from the given parameters
     * @param {string} name Used for identification purposes
     * @param {number} version Theme specification version
     * @param {ThemeColor} color Interface colors
     * @param {ThemeLogo} logo Logo image
     * @param {ThemeCursor} cursor Cursor image
     * @param {ThemeIcon[]} icons Custom course icons
     */
    constructor(
        name: string,
        version: 2,
        color: ThemeColor,
        logo?: ThemeLogo,
        cursor?: ThemeCursor,
        icons?: ThemeIcon[]
    ) {
        if (!name) {
            throw new Error("Theme must have a name");
        }
        this.name = name;
        this.version = version || SchoologyTheme.CURRENT_VERSION;
        this.color = color;
        this.logo = logo;
        this.cursor = cursor;
        this.icons = icons;
    }

    toString() {
        return JSON.stringify(this);
    }

    static get CURRENT_VERSION() {
        return 2;
    }

    /**
     * Creates and returns a `SchoologyTheme` given a valid JSON object
     * @param {*} o JSON representation of a `SchoologyTheme`
     * @returns {SchoologyTheme}
     */
    static loadFromObject(o?: SchoologyThemeV2): SchoologyTheme {
        if (o && o.version === SchoologyTheme.CURRENT_VERSION) {
            return new SchoologyTheme(
                o.name,
                o.version,
                ThemeColor.loadFromObject(o.color),
                ThemeLogo.loadFromObject(o.logo),
                ThemeCursor.loadFromObject(o.cursor),
                ThemeIcon.loadArrayFromObject(o.icons)
            );
        }

        throw new Error(
            `Invalid theme object provided. Make sure the provided JSON is a valid version ${SchoologyTheme.CURRENT_VERSION} theme.`
        );
    }
}
