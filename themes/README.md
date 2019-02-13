
# Custom Themes for Schoology Plus
### Introduction
Schoology Plus allows users to create, share, and apply custom themes for the Schoology interface. Themes are defined as a JSON object and can be installed to your browser from Schoology Plus settings. This can be done by pasting the JSON into the `Install from JSON` box found under the `Install and Manage Themes...` item in the `Theme` dropdown menu in Schoology Plus settings. 

![Example: installing a custom theme](https://i.imgur.com/x5QlaPZ.gif)

### Format
A Schoology Plus theme has the following format and components (each component will be explained in detail below):
```json
{
    "name": "My Theme",
    "version": 2,
    "color": {
        // Only one of the following properties
        "hue": 359,
        "custom": {
            "primary": "red",
            "hover": "rgb(0,0,255)",
            "background": "hsl(150,50%,50%)",
            "border": "#000000"
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
        }
    },
    "logo": {
        // Only one of the following properties
        "url": "https://example.com/my-logo-image.png",
        "preset": "schoology_logo",
        "preset": "lausd_legacy",
        "preset": "lausd_2019"
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
### Components
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
|Optional|false
|Default Value|N/A
|Description|The name of the theme. Used to identify the theme in the selection dropdown menu. Two themes with the same name cannot be installed at the same time.
|Value Restrictions|N/A
|Special Notes|N/A
|Example|`"name": "My Theme"`
### `version`
|Property||
|--|--|
|Key|`version`
|Value Type|`number`|
|Optional|false
|Default Value|N/A
|Description|The version of the theme specification used by the theme
|Value Restrictions|N/A
|Special Notes|Backwards compatibility is not guaranteed, so always check this document for the newest theme spec version
|Example|`"version": 2`
### `color`
|Property||
|--|--|
|Key|`color`
|Value Type|`Object`|
|Optional|true
|Description|Describes the colors to use for the Schoology interface
|Special Notes|The color object must contain ***exactly one*** of the following color definitions
#### `hue` color definition
|Property||
|--|--|
|Key|`hue`
|Value Type|`number`|
|Description|The theme's HSL color hue, used to color the interface by modifying the saturation and lightness values. The default Schoology Plus theme uses hue 210, and this value will be used by default if no color definitions are present.
|Value Restrictions|Hues are integers between 0 and 359, however decimal numbers still work and numbers over 359 are subject to a modus of 360 (i.e. actual hue value will be `providedHueValue % 360`).
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
|Value Type|`Object` as defined below|
|Description|Allows fine control over individual colors in the interface
|Value Restrictions|Each of the defined colors must be [valid CSS colors](https://www.w3schools.com/colors/default.asp) in any valid format
|Required Keys|<table><tr><th>Key</th><th>Description</th><tr><td>`primary`</td><td>The main interface color used in the navigation bar and as the primary color for buttons and other UI elements. **Should be dark enough to read white text.**</td></tr><tr><td>`background`</td><td>The color of items in the settings menu (in the top right, when you click your name) when you hover over them.</td></tr><tr><td>`hover`</td><td>The background color of buttons and other interactive elements when you hover over them, and the color of the settings dropdown menu (in the top right, when you click your name). **Should be dark enough to read white text.**</td></tr><tr><td>`border`</td><td>The border color of buttons and the border between the navigation bar and drop-down menus.</td></tr></table>|
**Example**
```json
"color": {
    "custom": {
        "primary": "#011e3e",
        "hover": "#b70014",
        "background": "#06448e",
        "border": "#b70014"
    }
}
```
#### `rainbow` color definition
|Property||
|--|--|
|Key|`rainbow`
|Value Type|`Object` as defined below|
|Description|Allows for animations of hue, saturation, and lightness of interface colors|
|Special Notes|The rainbow options are quite complex, see the following detailed documentation for more inforamtion.|
### `logo`
|Property||
|--|--|
|Key|`logo`
|Value Type|`Object` as defined below|
|Optional|true
|Default Value|![Schoology logo](https://i.imgur.com/y64kiCY.png)
|Description|Describes the logo to be displayed on the left side of the navbar.
|Subkey Options (Must contain ***exactly one*** of these subkeys)|<table><tr><td>Key</td><td>Description</td></tr><tr><td>`url`</td><td>A direct link to an image to be used as the logo. Should be **160x50** or smaller for best results.</td></tr><tr><td>`preset`</td><td>One of the values described below that results in a preset image being used as the logo.</td></tr></table>
|`preset` Values|<table><tr><th>Value</th><th>Preview</th></tr><tr><td>`"schoology_logo"`</td><td>![Schoology logo](https://i.imgur.com/y64kiCY.png)</td></tr><tr><td>`"lausd_legacy"`</td><td>![LAUSD legacy](https://imgur.com/Mm7FXhD.png)</td></tr><tr><td>`"lausd_2019"`</td><td>![LAUSD 2019](https://imgur.com/NOuGRyZ.png)</td></tr></table>**NOTE**: The Schoology logo has a transparent background, however the LAUSD logo backgrounds are orange or dark blue as shown.
**Examples**
```json
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
|Value Type|`Object` as defined below|
|Optional|true
|Default Value|System default cursor
|Description|Image urls to be used as the mouse curor
|Value Restrictions|A direct image link. Chrome and Firefox restrict cursor images to a **maximum size of `128x128`**, however it is recommended to use a significantly smaller image size.
|Special Notes|At the moment, this property only supports the default cursor (CSS value `default`), not the cursor shown when hovering over links or performing other special actions. This is currently defined as the `primary` subkey.
|Subkeys|<table><tr><td>Key</td><td>Description</td></tr><tr><td>`primary`</td><td>The image to be used for the default cursor (CSS value `default`). Does not affect the cursor shown when hovering over links or performing other special actions.</td></tr><tr><td colspan="2">More cursor types coming soon</td></tr></table>
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
|Special Notes|Course names are checked against regular expressions in array order, meaning the regexes in the objects with lower indecies in the array are checked first *in a non-case-sensitive manor*. If no regular expression matches a specific course, Schoology Plus will fallback to the default Schoology Plus icon set. If you want to prevent this behavior, add an entry such as `".": "https://example.com/my-image.png"` that will match all course titles.
**Example**
```json
"icons": [
    {
        "regex": "FRENCH", 
        "url": "https://cdn.countryflags.com/thumbs/france/flag-round-250.png"
    },
    {
        "regex": ".",
        "url": "https://image.flaticon.com/icons/svg/183/183759.svg"
    }
]
```