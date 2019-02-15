var icons = [
    //Physical education
    //Source: https://www.flaticon.com/free-icon/speed_181017 by Eucalyp under Flaticon Basic License (CC BY 3.0)
    { regex: "( PE |Phys(ical)? Edu?(cation)?)", url: "https://image.flaticon.com/icons/svg/181/181017.svg" },
    //World History
    //Source: https://www.flaticon.com/free-icon/internet_174249 by Flat Icons under Flaticon Basic License (CC BY 3.0)
    { regex: "WO?R?LD HIST?(ORY)?", url: "https://image.flaticon.com/icons/svg/174/174249.svg" },
    //Algebra 1/2
    //Source: https://www.flaticon.com/free-icon/blackboard_167753 by Freepik under Flaticon Basic License (CC BY 3.0)
    { regex: "ALG(EB|EBRA)? ", url: "https://image.flaticon.com/icons/svg/167/167753.svg" },
    //Art History
    //Source: https://www.flaticon.com/free-icon/paint-brush_214275 by Pixel Buddha under Flaticon Basic License (CC BY 3.0)
    { regex: "ART HIST", url: "https://image.flaticon.com/icons/svg/214/214275.svg" },
    //European History
    //Source: https://www.flaticon.com/free-icon/europe_664549 by Smashicons under Flaticon Basic License (CC BY 3.0)
    { regex: "EUR", url: "https://image.flaticon.com/icons/svg/664/664549.svg" },
    //Physics
    //Source: https://www.flaticon.com/free-icon/science_164969 by Freepik under Flaticon Basic License (CC BY 3.0)
    { regex: "PHYSICS|PHY:C", url: "https://image.flaticon.com/icons/svg/164/164969.svg" },
    //Astronomy
    //Source: https://www.flaticon.com/free-icon/telescope_124553 by Freepik under Flaticon Basic License (CC BY 3.0)
    { regex: "ASTRONOMY", url: "https://image.flaticon.com/icons/svg/124/124553.svg" },
    //Precalculus
    //Source: https://www.flaticon.com/free-icon/axis_707967 by Freepik under Flaticon Basic License (CC BY 3.0)
    { regex: "PRE ?CALC", url: "https://image.flaticon.com/icons/svg/707/707967.svg" },
    //Calculus
    //Source: https://www.flaticon.com/free-icon/calculating_265682 by Freepik under Flaticon Basic License (CC BY 3.0)
    { regex: " CALC", url: "https://image.flaticon.com/icons/svg/265/265682.svg" },
    //Chemistry
    //Source: https://www.flaticon.com/free-icon/flask_123381 by Freepik under Flaticon Basic License (CC BY 3.0)
    { regex: "CHEM", url: "https://image.flaticon.com/icons/svg/123/123381.svg" },
    //Computer Science and related courses
    //Source: https://www.flaticon.com/free-icon/binary-code_626570 by Freepik under Flaticon Basic License (CC BY 3.0)
    { regex: "COMP SCI?|COMPUTER", url: "https://image.flaticon.com/icons/svg/626/626570.svg" },
    //US History
    //Source: https://www.flaticon.com/free-icon/united-states-of-america_149513 by Smashicons under Flaticon Basic License (CC BY 3.0)
    { regex: "US HIST", url: "https://image.flaticon.com/icons/svg/149/149513.svg" },
    //Health
    //Source: https://www.flaticon.com/free-icon/first-aid-kit_179555 by Pixel Buddha under Flaticon Basic License (CC BY 3.0)
    { regex: "HEALTH", url: "https://image.flaticon.com/icons/svg/179/179555.svg" },
    //Drawing
    //Source: https://www.flaticon.com/free-icon/sketch_681560 by Freepik under Flaticon Basic License (CC BY 3.0)
    { regex: "DRAW|2D|3D", url: "https://image.flaticon.com/icons/svg/681/681560.svg" },
    //Ceramics
    //Source: https://www.flaticon.com/free-icon/pot_123458 by Freepik under Flaticon Basic License (CC BY 3.0)
    { regex: "CERAMICS", url: "https://image.flaticon.com/icons/svg/123/123458.svg" },
    //Floral
    //Source: https://www.flaticon.com/free-icon/flower_346167 by Freepik under Flaticon Basic License (CC BY 3.0)
    { regex: "FLOR", url: "https://image.flaticon.com/icons/svg/346/346167.svg" },
    //Marine Science/Biology
    //Source: https://www.flaticon.com/free-icon/turtle_146718 by Freepik under Flaticon Basic License (CC BY 3.0)
    { regex: "MARINE", url: "https://image.flaticon.com/icons/svg/146/146718.svg" },
    //Psychology
    //Source: https://www.flaticon.com/free-icon/creativity_552408 by Freepik under Flaticon Basic License (CC BY 3.0)
    { regex: "PSYCH", url: "https://image.flaticon.com/icons/svg/552/552408.svg" },
    //Writing Seminar/AP Seminar
    //Source: https://www.flaticon.com/free-icon/writing_176690 by Freepik under Flaticon Basic License (CC BY 3.0)
    { regex: "SEM(INAR)? ", url: "https://image.flaticon.com/icons/svg/176/176690.svg" },
    //Discrete Math
    //Source: https://www.flaticon.com/free-icon/calculating_251986 by Freepik under Flaticon Basic License (CC BY 3.0)
    { regex: "DISCR", url: "https://image.flaticon.com/icons/svg/251/251986.svg" },
    //Orchestra
    //Source: https://www.flaticon.com/free-icon/violin_124811 by Freepik under Flaticon Basic License (CC BY 3.0)
    { regex: "ORCH", url: "https://image.flaticon.com/icons/svg/124/124811.svg" },
    //Band
    //Source: https://www.flaticon.com/free-icon/drums_718543 by DinosoftLabs under Flaticon Basic License (CC BY 3.0)
    { regex: "BAND|MAR DYN", url: "https://image.flaticon.com/icons/svg/718/718543.svg" },
    //Music (Generic)
    //Source: https://www.flaticon.com/free-icon/treble-clef_579496 by Twitter under CC BY 3.0
    { regex: "MUSIC", url: "https://image.flaticon.com/icons/svg/579/579496.svg" },
    //Biology
    //Source: https://www.flaticon.com/free-icon/dna_620366 by Freepik under Flaticon Basic License (CC BY 3.0)
    { regex: "BIO(LOGY)? ", url: "https://image.flaticon.com/icons/svg/620/620366.svg" },
    //Literature
    //Source: https://www.flaticon.com/free-icon/open-book_167755 by Freepik under Flaticon Basic License (CC BY 3.0)
    { regex: " LIT ", url: "https://image.flaticon.com/icons/svg/167/167755.svg" },
    //Economics
    //Source: https://www.flaticon.com/free-icon/profit_712743 by DinosoftLabs under Flaticon Basic License (CC BY 3.0)
    { regex: "ECON(O(MICS)?)?", url: "https://image.flaticon.com/icons/svg/712/712743.svg" },
    //Statistics
    //Source: https://www.flaticon.com/free-icon/graph_138349 by Smashicons under Flaticon Basic License (CC BY 3.0)
    { regex: "STAT(STICS|ISTCS)|STATS?|STATISTICS ", url: "https://image.flaticon.com/icons/svg/138/138349.svg" },
    //Film
    //Source: https://www.flaticon.com/free-icon/video-camera_321799 by Vectors Market under Flaticon Basic License (CC BY 3.0)
    { regex: "FILM(MAKING)? ", url: "https://image.flaticon.com/icons/svg/321/321799.svg" },
    //Geology
    //Source: https://www.flaticon.com/free-icon/science_184647 by Freepik under Flaticon Basic License (CC BY 3.0)
    { regex: " GEOLOGY ", url: "https://image.flaticon.com/icons/svg/184/184647.svg" },
    //Government
    //Source: https://www.flaticon.com/free-icon/university_167718 by Freepik under Flaticon Basic License (CC BY 3.0)
    { regex: " GOVT ", url: "https://image.flaticon.com/icons/svg/167/167718.svg" },
    //English (Generic)
    //Source: https://www.flaticon.com/free-icon/signing_254022 by Freepik under Flaticon Basic License (CC BY 3.0)
    { regex: "ENG(LISH)? ", url: "https://image.flaticon.com/icons/svg/254/254022.svg" },
    //Spanish (Generic)
    //Source: https://www.flaticon.com/free-icon/spain_206724 by Freepik under Flaticon Basic License (CC BY 3.0)
    { regex: "SPAN(ISH)? ", url: "https://image.flaticon.com/icons/svg/206/206724.svg" },
    //French (Generic)
    //Source: https://www.flaticon.com/free-icon/france_206657 by Freepik under Flaticon Basic License (CC BY 3.0)
    { regex: "FREN(CH)? ", url: "https://image.flaticon.com/icons/svg/206/206657.svg" },
    //Environmental Science
    //Source: https://www.flaticon.com/free-icon/recycle_291211 by Maxim Basinski under CC BY 3.0
    { regex: "ENV", url: "https://image.flaticon.com/icons/svg/291/291211.svg" },
    //Geography
    //Source: https://www.flaticon.com/free-icon/globe_717982 by DinosoftLabs under Flaticon Basic License (CC BY 3.0)
    { regex: "GEOG", url: "https://image.flaticon.com/icons/svg/717/717982.svg" },
    //Research
    //Source: https://www.flaticon.com/free-icon/research_164996 by Freepik under Flaticon Basic License (CC BY 3.0)
    { regex: "RES(EA)?RCH", url: "https://image.flaticon.com/icons/svg/164/164996.svg" },
    //No Period
    //Source: https://www.flaticon.com/free-icon/house_149064 by Smashicons under Flaticon Basic License (CC BY 3.0)
    { regex: "HOME", url: "https://image.flaticon.com/icons/svg/149/149064.svg" },
    //All classes without an image
    //Source: https://www.flaticon.com/free-icon/bookshelf_164949 by Freepik under Flaticon Basic License (CC BY 3.0)
    { regex: ".", url: "https://image.flaticon.com/icons/svg/164/164949.svg" }
];