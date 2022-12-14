
# Custom Themes for Schoology Plus
## Introduction
Schoology Plus allows users to create, share, and apply custom themes for the Schoology interface. Themes are defined as a JSON object and can be installed to your browser from the theme editor, located in Schoology Plus settings. To install a theme from a JSON object, complete the following steps:

1. Open the theme editor from Schoology Plus settings
2. Click "Import Theme"
3. Click into the "Paste Theme JSON Here" textbox
4. Press Ctrl+V or right click and select Paste
5. Click "Import"

## Format of Theme Specification Version 2
A Schoology Plus theme has the following format and components (each component will be explained in detail below):
```js
{
    "name": "My Theme",
    "version": 2,
    "color": {
        // Exactly one of the following 3 properties
        "hue": 359,
        "custom": {
            "primary": "red",
            "hover": "rgb(0,0,255)",
            "background": "hsl(150,50%,50%)",
            "border": "#000000",
            "link": "magenta"
        },
        "rainbow": {
            "hue": {
                "animate": {
                    "speed": 100,
                    "offset": 0,
                    "min": 0,
                    "max": 359,
                    "alternate": false
                }
            },
            "saturation": {
                "value": 50
            },
            "lightness": {
                "value": 50
            }
        },
        // Optional
        "modern": {
            "dark": false,
            "interface": {
                "primary": "#EAEAEA",
                "accent": "#F7F7F7",
                "secondary": "#DDD",
                "input": "#D0D0D0",
                "border": "#BABABA",
                "highlight": "rgba(255, 183, 2, 0.2)",
                "active": "rgba(152, 212, 228, 0.8)",
                "grades": "#009400",
                "error": "#F44336"
            },
            "calendar": [
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
                "#e9e9ea"
            ],
            "text": {
                "primary": "#2A2A2A",
                "muted": "#677583",
                "contrast": "white"
            },
            "options": {
                "borderRadius": 5,
                "borderSize": 1,
                "padding": 10
            }
        }
    },
    "logo": {
        // Only one of the following properties
        "url": "https://example.com/my-logo-image.png",
        "preset": "schoology_plus",
        "preset": "schoology_logo",
        "preset": "lausd_legacy",
        "preset": "lausd_2019",
        "preset": "lausd_2022"
    },
    "cursor": {
        "primary": "https://example.com/my-cursor-image.png"
    },
    "icons": [
        {
            "regex": "BIO(LOGY)? ",
            "url": "https://example.com/my-biology-image.png"
        },
        {
            "regex": "MATH|ALGEBRA",
            "url": "https://example.com/my-math-image.png"
        }
    ]
}
```
## Components of Theme Specification Version 2
|Property| Type | Optional? |
|--|--|--|
|[`name`](#name)|`string`|false
|[`version`](#version)|`number`|false
|[`color`](#color)|`Object`|true
|[`logo`](#logo)|`Object`|true
|[`cursor`](#cursor)|`Object`|true
|[`icons`](#icons)|`[{regex: RegExp, url: URL}]`|true

### `name`
|Property||
|--|--|
|Key|`name`
|Value Type|`string`|
|Optional|No
|Description|The name of the theme. Used to identify the theme in the selection dropdown menu. Two themes with the same name cannot be installed at the same time.
|Example|`"name": "My Theme"`
### `version`
|Property||
|--|--|
|Key|`version`
|Value Type|`number`|
|Optional|No
|Description|The version of the theme specification used by the theme
|Special Notes|Backwards compatibility is not guaranteed, so always check this document for the newest theme specification version
|Example|`"version": 2`
### `color`
|Property||
|--|--|
|Key|`color`
|Value Type|`Object`|
|Optional|Yes
|Description|Describes the colors to use for the Schoology interface
|Special Notes|The color object must contain ***exactly one*** of the following color definitions (either [hue](#hue-color-definition), [custom](#custom-color-definition), or [rainbow](#rainbow-color-definition)). It can optionally include a [modern](#modern-color-definition) color definition as well. 
#### `hue` color definition
|Property||
|--|--|
|Key|`hue`
|Value Type|`number`|
|Description|The theme's HSL color hue, used to color the interface by modifying the saturation and lightness values. The default Schoology Plus theme uses hue 210, and this value will be used by default if no color definitions are present.
|Value Restrictions|Hues are integers between 0 and 359, however decimal numbers still work and numbers over 359 are subject to a modulus of 360 (i.e. actual hue value will be `providedHueValue % 360`).
|Special Notes|N/A|
**Example**
```json
"color": {
    "hue": 300
}
```
#### `custom` color definition
|Property||
|--|--|
|Key|`custom`
|Value Type|`{primary: CSSColor, background: CSSColor, hover: CSSColor, border: CSSColor, link: CSSColor}`|
|Description|Allows fine control over individual colors in the interface
|Value Restrictions|Each of the defined colors must be [valid CSS colors](https://www.w3schools.com/colors/default.asp) in any valid format
|Subkeys (Required)|<table><tr><th>Key</th><th>Description</th><tr><td>`primary`</td><td>The main interface color used in the navigation bar and as the primary color for buttons and other UI elements. **Should be dark enough to read white text.**</td></tr><tr><td>`background`</td><td>The color of items in the settings menu (in the top right, when you click your name) when you hover over them.</td></tr><tr><td>`hover`</td><td>The background color of buttons and other interactive elements when you hover over them, and the color of the settings dropdown menu (in the top right, when you click your name). **Should be dark enough to read white text.**</td></tr><tr><td>`border`</td><td>The border color of buttons and the border between the navigation bar and drop-down menus.</td></tr><tr><td>`link`</td><td>The color of clickable links throughout the website. This is **optional**, and defaults to `hover` if not specified to maintain backwards compatibility.</td></tr></table>|
**Example**
```json
"color": {
    "custom": {
        "primary": "#011e3e",
        "hover": "#b70014",
        "background": "#06448e",
        "border": "#b70014",
        "link": "#b70014"
    }
}
```
#### `rainbow` color definition
|Property||
|--|--|
|Key|`rainbow`
|Value Type|`Object` as defined below|
|Description|Allows for animations of hue, saturation, and lightness of interface colors. The rainbow options are quite complex, see the following detailed documentation for more inforamtion.|
|Subkeys (Required)|<table><tr><td>Key</td><td>Description</td></tr><tr><td>`hue`</td><td>Defines behavior of the hue component of the interface colors</td></tr><tr><td>`saturation`</td><td>Defines behavior of the saturation component of the interface colors</td></tr><tr><td>`lightness`</td><td>Defines behavior of the lightness component of the interface colors</td></tr></table>Each subkey must contain ***exactly one*** of the following component definitions ([animated](#Animated-Color-Definition) or [static](#Static-Color-Definition))|
##### Animated Color Definition
|Property||
|--|--|
|Key|`animate`
|Value Type|`{speed: number, offset: number, min: number, max: number, alternate: boolean}`|
|Description|Describes how a color component should be animated|
|Subkeys (Required)|<table><tr><td>Key</td><td>Description</td></tr><tr><td>`speed`</td><td>Speed of the animation; larger numbers are faster.<br>`number` (0-100)</td></tr><tr><td>`offset`</td><td>The initial value for the animation (the first time step); used to create separation between the animations of the different color compontents.<br>`number` (0-359 for hue, 0-100 for saturation/lightness)</td></tr></tr><tr><td>`min`</td><td>The minimum value in the animation cycle; the animation will cycle through all possible values for the component greater than this value and less than `max`.<br>`number` (0-359 for hue, 0-100 for saturation/lightness)</td></tr></tr><tr><td>`max`</td><td>The maximum value in the animation cycle; the animation will cycle through all possible values for the component less than this value and greater than `min`.<br>`number` (0-359 for hue, 0-100 for saturation/lightness)</td></tr></tr><tr><td>`alternate`</td><td>`boolean`<br>When `true`: color compontent animates from `min` to `max` and then from `max` to `min`.<br>When `false`: color component animates from `min` to `max` and then resets back to `min` again.</td></tr></table>|
**Example**
```json
"hue": {
    "animate": {
        "speed": 100,
        "offset": 0,
        "min": 130,
        "max": 200,
        "alternate": true
    }
}
```
##### Static Color Definition
|Property||
|--|--|
|Key|`value`
|Value Type|`number`|
|Description|The static value of the color component|
|Value Restrictions|For hue: Integer from 0 to 359<br>For saturation or lightness: Integer from 0 to 100|
**Example**
```json
"saturation": {
    "value": 50
}
```
**Full Example of Rainbow Color Definition**
```json
"rainbow": {
    "hue": {
        "animate": {
            "speed": 50,
            "offset": 0,
            "min": 0,
            "max": 359,
            "alternate": false
        }
    },
    "saturation": {
        "value": "50"
    },
    "lightness": {
        "value": "50"
    }
}
```

#### `modern` color definition
|Property||
|--|--|
|Key|`modern`
|Value Type|`Object` as defined below|
|Description|Allows extremely fine-grained control of colors for the entire Schoology interface. Unlike the other color definitions, the `modern` color defintion changes the entire interface instead of just links and the navigation bar. |
|Subkeys (Required)|<table><tr><td>Key</td><td>Description</td></tr><tr><td>`dark`</td><td>`bool`: `true` if the `primary` interface color is "dark", meaning dark enough that certain white images should be inverted.</td></tr><tr><td>`interface`</td><td>Defines colors used throughout the interface. [See more details below](#interface-color-defintion).</td></tr><tr><td>`calendar`</td><td>`CSSColor[16]`: Array of 16 colors to use for calendar events</td></tr><tr><td>`text`</td><td>Defines text colors used in different situations. [See more details below](#text-color-definition).</td></tr><tr><td>`options`</td><td>Defines certain styling options to apply to interface elements. [See more details below](#modern-options-definition).</td></tr></table>|

#### Interface Color Defintion
|Property||
|--|--|
|Key|`interface`
|Value Type|`Object` as defined below|
|Description|Allows extremely fine-grained control of colors for the entire Schoology interface. Each value is a `CSSColor` and may be used in many contexts. The descriptions are just to give a general idea of where the color is used. |
|Subkeys (Required)|<table><tr><td>Key</td><td>Description</td></tr><tr><td>`primary`</td><td>Primary interface color, used for page backgrounds. In general, should be the lightest of `primary`, `accent`, and `secondary`.</td></tr><tr><td>`accent`</td><td>Interface accent color, used for inset elements. In general, should have a lightness between `primary` and `secondary`.</td></tr><tr><td>`secondary`</td><td>Secondary interface color, used for menus and doubly-inset elements. In general, should be the darkest of `primary`, `accent`, and `secondary`.</td></tr><tr><td>`input`</td><td>Used for input fields (like text boxes)</td></tr><tr><td>`border`</td><td>Used for element borders</td></tr><tr><td>`highlight`</td><td>Used to draw attention to something important, usually used in negative connotations like warnings</td></tr><tr><td>`active`</td><td>Used for selected menu items and to draw attention to things in a more positive connotation, such as correct answers</td></tr><tr><td>`grades`</td><td>Used for letter grades and scores</td></tr><tr><td>`error`</td><td>Used for both error backgrounds and error text.</td></tr></table>|

#### Text Color Definition
|Property||
|--|--|
|Key|`text`
|Value Type|`Object` as defined below|
|Description|Allows extremely fine-grained control of text colors for the entire Schoology interface. Each value is a `CSSColor` and may be used in many contexts. The descriptions are just to give a general idea of where the color is used. |
|Subkeys (Required)|<table><tr><td>Key</td><td>Description</td></tr><tr><td>`primary`</td><td>Primary text color, used in nearly all contexts</td></tr><tr><td>`muted`</td><td>Muted text color, used for elements that shouldn't stand out as much</td></tr><tr><td>`contrast`</td><td>Text color used on the navigation bar or other elements with background colors set by other color definitions. In general, this should probably be `white`.</td></tr></table>|
#### Modern Options Definition
|Property||
|--|--|
|Key|`options`
|Value Type|`Object` as defined below|
|Description|Defines certain styling options to apply to interface elements. |
|Subkeys (Required)|<table><tr><td>Key</td><td>Description</td></tr><tr><td>`borderRadius`</td><td>`int`: CSS border radius property used on numerous inset elements (in pixels)</td></tr><tr><td>`borderSize`</td><td>`int`: Size of element borders (in pixels)</td></tr><tr><td>`padding`</td><td>`int`: Pixels of padding between elements</td></tr></table>|

**Full Example of Modern Color Definition**
```json
"modern": {
    "dark": false,
    "interface": {
        "primary": "#EAEAEA",
        "accent": "#F7F7F7",
        "secondary": "#DDD",
        "input": "#D0D0D0",
        "border": "#BABABA",
        "highlight": "rgba(255, 183, 2, 0.2)",
        "active": "rgba(152, 212, 228, 0.8)",
        "grades": "#009400",
        "error": "#F44336"
    },
    "calendar": [
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
        "#e9e9ea"
    ],
    "text": {
        "primary": "#2A2A2A",
        "muted": "#677583",
        "contrast": "white"
    },
    "options": {
        "borderRadius": 5,
        "borderSize": 1,
        "padding": 10
    }
}
```

### `logo`
|Property||
|--|--|
|Key|`logo`
|Value Type|`{url: URL} | {preset: string}`|
|Optional|Yes
|Default Value|![Schoology Plus](https://imgur.com/znq2Mc1.png)
|Description|Describes the logo to be displayed on the left side of the navbar.
|Subkey Options (Must contain ***exactly one*** of these subkeys)|<table><tr><td>Key</td><td>Description</td></tr><tr><td>`url`</td><td>A direct link to an image to be used as the logo. Should be **160x50** or smaller for best results.</td></tr><tr><td>`preset`</td><td>One of the values described below that results in a preset image being used as the logo.</td></tr></table>
|`preset` Values|<table><tr><th>Value</th><th>Preview</th></tr><tr><td>`"schoology_plus"`</td><td>![Schoology Plus](https://imgur.com/znq2Mc1.png)</td></tr><tr><td>`"schoology_logo"`</td><td>![Schoology logo](https://i.imgur.com/y64kiCY.png)</td></tr><tr><td>`"lausd_legacy"`</td><td>![LAUSD legacy](https://imgur.com/Mm7FXhD.png)</td></tr><tr><td>`"lausd_2019"`</td><td>![LAUSD 2019](https://imgur.com/NOuGRyZ.png)</td></tr><tr><td>`"lausd_2022"`</td><td>![LAUSD 2022](https://i.imgur.com/QFbx7wL.png)</td></tr><tr><td>`"default"`</td><td>Don't override the logo whatsoever</td></tr></table>**NOTE**: The Schoology and Schoology Plus logos have a transparent background, however the LAUSD logo backgrounds are orange or dark blue as shown.
**Examples**
```js
// Example using "url"
"logo": {
    "url": "https://example.com/my-correctly-sized-image.png"
}

// Example using "preset"
"logo": {
    "preset": "schoology_logo"
}
```
### `cursor`
|Property||
|--|--|
|Key|`cursor`
|Value Type|`{primary: URL}`|
|Optional|true
|Default Value|System default cursor
|Description|Image URLs to be used as the mouse curor
|Value Restrictions|A direct image link. Chrome and Firefox restrict cursor images to a **maximum size of `128x128`**, however it is recommended to use a significantly smaller image size.
|Special Notes|At the moment, this property only supports the default cursor (CSS value `default`), not the cursor shown when hovering over links or performing other special actions. This is currently defined as the `primary` subkey.
|Subkeys|Each subkey is optional, however as there is only one at the moment, not including it would be equivalent to not including the `cursor` key at all. <table><tr><td>Key</td><td>Description</td></tr><tr><td>`primary`</td><td>The image to be used for the default cursor (CSS value `default`). Does not affect the cursor shown when hovering over links or performing other special actions.</td></tr><tr><td colspan="2">More cursor types coming soon</td></tr></table>
**Example**
```json
"cursor": {
    "primary": "https://imgur.com/5QVrDqX.png"
}
```
### `icons`
|Property||
|--|--|
|Key|`icons`
|Value Type|`[{regex: RegExp, url: URL}]`|
|Optional|true
|Default Value|Schoology Plus default course icon set
|Description|An array of two-key objects, where the key `regex` is a regular expression and the key `url` is an image URL to be used as an icon for courses with names matching the regular expression.
|Value Restrictions|An array of objects where all values of `regex` keys are valid regular expressions and all values of `url` keys are direct image links. Images should be square and at least `32x32` in size, but this is not required.
|Special Notes|Course names are checked against regular expressions in array order, meaning the regexes in the objects with lower indices in the array are checked first *in a non-case-sensitive manner*. If no regular expression matches a specific course, Schoology Plus will fallback to the default Schoology Plus icon set. If you want to prevent this behavior, add an entry such as `{ regex: ".", url: "https://example.com/my-image.png" }` that will match all course titles.
**Example**
```json
"icons": [
    {
        "regex": "FRENCH", 
        "url": "https://cdn.countryflags.com/thumbs/france/flag-round-250.png"
    },
    {
        "regex": ".",
        "url": "https://cdn-icons-png.flaticon.com/512/183/183759.png"
    }
]
```