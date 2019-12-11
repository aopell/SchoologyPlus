class CustomColorDefinition {
    /**
     * Allows fine control over individual colors in the interface
     * @param {string} primary The main interface color used in the navigation bar and as the primary color for buttons and other UI elements.
     * @param {string} hover The color of items in the settings menu
     * @param {string} background The background color of buttons and other interactive elements when you hover over them, and the color of the settings dropdown menu
     * @param {string} border The border color of buttons and the border between the navigation bar and drop-down menus
     */
    constructor(primary, hover, background, border) {
        this.primary = primary;
        this.hover = hover;
        this.background = background;
        this.border = border;
    }

    /**
     * Creates and returns a `CustomColorDefinition` given a valid JSON object
     * @param {*} object JSON representation of a `CustomColorDefinition`
     * @returns {CustomColorDefinition}
     */
    static loadFromObject(o) {
        return o ? new CustomColorDefinition(o.primary, o.hover, o.background, o.border) : undefined;
    }
}

class RainbowColorComponentAnimation {
    /**
     * Defines a color animation
     * @param {number} speed Speed of the animation; larger numbers are faster. (0-100)
     * @param {number} offset The initial value for the animation (the first time step); used to create separation between the animations of the different color compontents.
     * @param {number} min The minimum value in the animation cycle; the animation will cycle through all possible values for the component greater than this value and less than max.
     * @param {number} max The maximum value in the animation cycle; the animation will cycle through all possible values for the component less than this value and greater than min.
     * @param {boolean} alternate When true: color compontent animates from min to max and then from max to min. When false: color component animates from min to max and then resets back to min again
     */
    constructor(speed, offset, min, max, alternate) {
        this.speed = speed;
        this.offset = offset;
        this.min = min;
        this.max = max;
        this.alternate = alternate;
    }

    /**
     * Creates and returns a `RainbowColorComponentAnimation` given a valid JSON object
     * @param {*} object JSON representation of a `RainbowColorComponentAnimation`
     * @returns {RainbowColorComponentAnimation}
     */
    static loadFromObject(o) {
        return o ? new RainbowColorComponentAnimation(o.speed, o.offset, o.min, o.max, o.alternate) : undefined;
    }
}

class RainbowColorComponentDefinition {
    /**
     * Defines a rainbow color component (hue, saturation, lightness)
     * @param {RainbowColorComponentAnimation} animate Defines a color animation
     * @param {number} value Defines a static color
     */
    constructor(animate, value) {
        this.animate = animate;
        this.value = value;
    }

    /**
     * Creates and returns a `RainbowColorComponentDefinition` given a valid JSON object
     * @param {*} object JSON representation of a `RainbowColorComponentDefinition`
     * @returns {RainbowColorComponentDefinition}
     */
    static loadFromObject(o) {
        return o ? new RainbowColorComponentDefinition(RainbowColorComponentAnimation.loadFromObject(o.animate), o.value) : undefined;
    }
}

class RainbowColorDefinition {
    /**
     * Allows for animations of hue, saturation, and lightness of interface colors.
     * @param {RainbowColorComponentDefinition} hue Defines behavior of the hue component of the interface colors
     * @param {RainbowColorComponentDefinition} saturation Defines behavior of the saturation component of the interface colors
     * @param {RainbowColorComponentDefinition} lightness Defines behavior of the lightness component of the interface colors
     */
    constructor(hue, saturation, lightness) {
        this.hue = hue;
        this.saturation = saturation;
        this.lightness = lightness;
    }

    /**
     * Creates and returns a `RainbowColorDefinition` given a valid JSON object
     * @param {*} object JSON representation of a `RainbowColorDefinition`
     * @returns {RainbowColorDefinition}
     */
    static loadFromObject(o) {
        return o
            ? new RainbowColorDefinition(
                RainbowColorComponentDefinition.loadFromObject(o.hue),
                RainbowColorComponentDefinition.loadFromObject(o.saturation),
                RainbowColorComponentDefinition.loadFromObject(o.lightness)
            )
            : undefined;
    }
}

class ThemeColor {
    /**
     * Describes the colors to use for the Schoology interface
     * @param {number} hue The theme's HSL color hue, used to color the interface by modifying the saturation and lightness values
     * @param {CustomColorDefinition} custom Allows fine control over individual colors in the interface
     * @param {RainbowColorDefinition} rainbow Allows for animations of hue, saturation, and lightness of interface colors
     */
    constructor(hue, custom, rainbow) {
        this.hue = hue;
        this.custom = custom;
        this.rainbow = rainbow;
    }

    /**
     * Creates and returns a `ThemeColor` given a valid JSON object
     * @param {*} object JSON representation of a `ThemeColor`
     * @returns {ThemeColor}
     */
    static loadFromObject(o) {
        return o ? new ThemeColor(o.hue, CustomColorDefinition.loadFromObject(o.custom), RainbowColorDefinition.loadFromObject(o.rainbow)) : new ThemeColor(210);
    }
}

class ThemeLogo {
    /**
     * Defines a logo image
     * @param {string} url Link to an image
     * @param {"schoology_plus"|"schoology_logo"|"lausd_legacy"|"lausd_2019"} preset Built-in image
     */
    constructor(url, preset) {
        this.url = url;
        this.preset = preset;
    }

    /**
     * Creates and returns a `ThemeLogo` given a valid JSON object
     * @param {*} object JSON representation of a `ThemeLogo`
     * @returns {ThemeLogo}
     */
    static loadFromObject(o) {
        return o ? new ThemeLogo(o.url, o.preset) : new ThemeLogo(undefined, "schoology_plus");
    }
}

class ThemeCursor {
    /**
     * Defines a cursor image
     * @param {string} primary Link to an image 
     */
    constructor(primary) {
        this.primary = primary;
    }

    /**
     * Creates and returns a `ThemeCursor` given a valid JSON object
     * @param {*} object JSON representation of a `ThemeCursor`
     * @returns {ThemeCursor}
     */
    static loadFromObject(o) {
        return o ? new ThemeCursor(o.primary) : undefined;
    }
}

class ThemeIcon {
    /**
     * Defines a custom course icon
     * @param {RegExp|string} regex Regular expression to match courses
     * @param {string} url Link to an image
     */
    constructor(regex, url) {
        this.regex = regex;
        this.url = url;
    }

    /**
     * Creates and returns a `ThemeIcon` given a valid JSON array
     * @param {[]} array JSON representation of a `ThemeIcon[]`
     * @returns {ThemeIcon[]}
     */
    static loadArrayFromObject(array) {
        return array ? array.map(x => new ThemeIcon(x.regex, x.url)) : undefined;
    }
}

class SchoologyTheme {
    /**
     * Creates a theme from the given parameters
     * @param {string} name Used for identification purposes
     * @param {number} version Theme specification version
     * @param {ThemeColor} color Interface colors
     * @param {ThemeLogo} logo Logo image
     * @param {ThemeCursor} cursor Cursor image
     * @param {ThemeIcon[]} icons Custom course icons
     */
    constructor(name, version, color, logo, cursor, icons) {
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
     * @param {*} object JSON representation of a `SchoologyTheme`
     * @returns {SchoologyTheme}
     */
    static loadFromObject(o) {
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

        throw new Error(`Invalid theme object provided. Make sure the provided JSON is a valid version ${SchoologyTheme.CURRENT_VERSION} theme.`);
    }
}