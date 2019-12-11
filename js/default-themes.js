let __defaultThemes = [
    {
        "name": "Schoology Plus",
        "version": 2,
        "color": {
            "hue": 210
        },
        "logo": {
            "preset": "schoology_plus"
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
            "preset": "schoology_plus"
        }
    },
    {
        "name": "Toy",
        "version": 2,
        "color": {
            "hue": 150
        },
        "logo": {
            "preset": "schoology_plus"
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
                "primary": "#143f69",
                "hover": "#345f89",
                "background": "#345f89",
                "border": "#024f7d"
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
                "primary": "#ff7a00",
                "hover": "#ff9a20",
                "background": "#ff8a10",
                "border": "#df5a00"
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
                "primary": "#0677ba",
                "hover": "#024f7d",
                "background": "#002c47",
                "border": "#024f7d"
            }
        },
        "logo": {
            "preset": "schoology_logo"
        }
    }
];