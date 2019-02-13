let __defaultThemes = [
    {
        "name": "Schoology Plus",
        "version": 2,
        "color": {
            "hue": 210
        },
        "logo": {
            "preset": "schoology_logo"
        }
    },
    {
        "name": "Rainbow",
        "version": 2,
        "color": {
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
        },
        "logo": {
            "preset": "schoology_logo"
        }
    },
    {
        "name": "Toy",
        "version": 2,
        "color": {
            "hue": 150
        },
        "logo": {
            "preset": "schoology_logo"
        },
        "cursor": {
            "primary": chrome.runtime.getURL("/imgs/toy-mode.png")
        }
    },
    {
        "name": "LAUSD Dark Blue",
        "version": 2,
        "color": {
            "custom": {
                "primaryColor": "#143f69",
                "hoverColor": "#345f89",
                "backgroundColor": "#345f89",
                "borderColor": "#024f7d"
            }
        },
        "logo": {
            "preset": "lausd_2019"
        }
    },
    {
        "name": "LAUSD Orange",
        "version": 2,
        "color": {
            "custom": {
                "primaryColor": "#ff7a00",
                "hoverColor": "#ff9a20",
                "backgroundColor": "#ff8a10",
                "borderColor": "#df5a00"
            }
        },
        "logo": {
            "preset": "lausd_legacy"
        }
    },
    {
        "name": "Schoology Default",
        "version": 2,
        "color": {
            "custom": {
                "primaryColor": "#0677ba",
                "hoverColor": "#024f7d",
                "backgroundColor": "#002c47",
                "borderColor": "#024f7d"
            }
        },
        "logo": {
            "preset": "schoology_logo"
        }
    }
];