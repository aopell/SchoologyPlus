var icons = [
    //Physical education
    //Source: https://www.flaticon.com/free-icon/speed_181017 by Eucalyp under Flaticon Basic License (CC BY 3.0)
    { regex: "(\\bPE\\b|Phys(ical)? Edu?(cation)?|\\bSRLA\\b)", url: "https://image.flaticon.com/icons/svg/181/181017.svg" },
    //World History
    //Source: https://www.flaticon.com/free-icon/internet_174249 by Flat Icons under Flaticon Basic License (CC BY 3.0)
    { regex: "WO?R?LD HIST?(ORY)?|WHG", url: "https://image.flaticon.com/icons/svg/174/174249.svg" },
    //Algebra 1/2
    //Source: https://www.flaticon.com/free-icon/blackboard_167753 by Freepik under Flaticon Basic License (CC BY 3.0)
    { regex: "ALG(EB|EBRA)?(\\d|\\b)", url: "https://image.flaticon.com/icons/svg/167/167753.svg" },
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
    //Source: https://www.flaticon.com/free-icon/parabola_1074140 by Freepik under Flaticon Basic License (CC BY 3.0)
    { regex: "PRE ?CALC", url: "https://image.flaticon.com/icons/svg/1074/1074140.svg" },
    //Calculus
    //Source: https://www.flaticon.com/free-icon/line-graph_1572296 by Pixelmeetup under Flaticon Basic License (CC BY 3.0)
    { regex: "(^|\\b)CALC(ULUS)?\\b", url: "https://image.flaticon.com/icons/svg/1572/1572296.svg" },
    //Chemistry
    //Source: https://www.flaticon.com/free-icon/flask_123381 by Freepik under Flaticon Basic License (CC BY 3.0)
    { regex: "CHEM", url: "https://image.flaticon.com/icons/svg/123/123381.svg" },
    //Computer Science and related courses
    //Source: https://www.flaticon.com/free-icon/binary-code_626570 by Freepik under Flaticon Basic License (CC BY 3.0)
    { regex: "COMP SCI?|COMPUTER|INTRO COMP", url: "https://image.flaticon.com/icons/svg/626/626570.svg" },
    //US History and other American studies
    //Source: https://www.flaticon.com/free-icon/united-states-of-america_149513 by Smashicons under Flaticon Basic License (CC BY 3.0)
    { regex: "US HIST|AMER(ICAN?)?|AM DEM", url: "https://image.flaticon.com/icons/svg/149/149513.svg" },
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
    { regex: "SEM(INAR)?\\b", url: "https://image.flaticon.com/icons/svg/176/176690.svg" },
    //Discrete Math
    //Source: https://www.flaticon.com/free-icon/calculating_251986 by Freepik under Flaticon Basic License (CC BY 3.0)
    { regex: "DISCR", url: "https://image.flaticon.com/icons/svg/251/251986.svg" },
    //Orchestra
    //Source: https://www.flaticon.com/free-icon/violin_124811 by Freepik under Flaticon Basic License (CC BY 3.0)
    { regex: "ORCH", url: "https://image.flaticon.com/icons/svg/124/124811.svg" },
    //Band
    //Source: https://www.flaticon.com/free-icon/drums_718543 by DinosoftLabs under Flaticon Basic License (CC BY 3.0)
    { regex: "BAND|MAR DYN", url: "https://image.flaticon.com/icons/svg/718/718543.svg" },
    //Music
    //Source: https://www.flaticon.com/free-icon/treble-clef_579496 by Twitter under CC BY 3.0
    { regex: "MUSIC|JAZZ|CHOIR|INSTRUM", url: "https://image.flaticon.com/icons/svg/579/579496.svg" },
    //Biology
    //Source: https://www.flaticon.com/free-icon/dna_620366 by Freepik under Flaticon Basic License (CC BY 3.0)
    { regex: "BIO(LOGY|TECH)?\\b", url: "https://image.flaticon.com/icons/svg/620/620366.svg" },
    //Literature
    //Source: https://www.flaticon.com/free-icon/open-book_167755 by Freepik under Flaticon Basic License (CC BY 3.0)
    { regex: "(^|\\b)LIT(ERATURE)?\\b", url: "https://image.flaticon.com/icons/svg/167/167755.svg" },
    //Economics
    //Source: https://www.flaticon.com/free-icon/profit_712743 by DinosoftLabs under Flaticon Basic License (CC BY 3.0)
    { regex: "ECON(O(MICS)?)?", url: "https://image.flaticon.com/icons/svg/712/712743.svg" },
    //Statistics
    //Source: https://www.flaticon.com/free-icon/analysis_1006636 by Freepik under Flaticon Basic License (CC BY 3.0)
    { regex: "STAT(STICS|ISTCS)|STATS?|STATISTICS", url: "https://image.flaticon.com/icons/svg/1006/1006636.svg" },
    //Film
    //Source: https://www.flaticon.com/free-icon/video-camera_321799 by Vectors Market under Flaticon Basic License (CC BY 3.0)
    { regex: "FILM(MAKING)?\\b", url: "https://image.flaticon.com/icons/svg/321/321799.svg" },
    //Geology
    //Source: https://www.flaticon.com/free-icon/science_184647 by Freepik under Flaticon Basic License (CC BY 3.0)
    { regex: "GEOLOGY", url: "https://image.flaticon.com/icons/svg/184/184647.svg" },
    //Government
    //Source: https://www.flaticon.com/free-icon/university_167718 by Freepik under Flaticon Basic License (CC BY 3.0)
    { regex: "\\bGOVT\\b", url: "https://image.flaticon.com/icons/svg/167/167718.svg" },
    //Geometry
    //Source: https://www.flaticon.com/free-icon/office-material_258316 by Freepik under Flaticon Basic License (CC BY 3.0)
    { regex: "GEOM", url: "https://image.flaticon.com/icons/svg/258/258316.svg" },
    //Guitar
    //Source: https://www.flaticon.com/free-icon/guitar_1586234 by Freepik under Flaticon Basic License (CC BY 3.0)
    { regex: "GUITAR", url: "https://image.flaticon.com/icons/svg/1586/1586234.svg" },
    //English (Generic), Creative Writing, Composition
    //Source: https://www.flaticon.com/free-icon/signing_254022 by Freepik under Flaticon Basic License (CC BY 3.0)
    { regex: "ENG(LISH)?\\b|CREAT(IVE)? WRI?T(ING)?|\\bCOMP(OSITION)?\\b|\\bERWC\\b", url: "https://image.flaticon.com/icons/svg/254/254022.svg" },
    //Spanish (Generic)
    //Source: https://www.flaticon.com/free-icon/spain_206724 by Freepik under Flaticon Basic License (CC BY 3.0)
    { regex: "SPAN(ISH)?\\b", url: "https://image.flaticon.com/icons/svg/206/206724.svg" },
    //French (Generic)
    //Source: https://www.flaticon.com/free-icon/france_206657 by Freepik under Flaticon Basic License (CC BY 3.0)
    { regex: "FREN(CH)?\\b", url: "https://image.flaticon.com/icons/svg/206/206657.svg" },
    //Environmental Science
    //Source: https://www.flaticon.com/free-icon/recycle_291211 by Maxim Basinski under CC BY 3.0
    { regex: "ENV", url: "https://image.flaticon.com/icons/svg/291/291211.svg" },
    //Robotics
    //Source: https://www.flaticon.com/free-icon/robotic-arm_1546683 by Eucalyp under Flaticon Basic License (CC BY 3.0)
    { regex: "ROBOT", url: "https://image.flaticon.com/icons/svg/1546/1546683.svg" },
    //Flight and Space
    //Source: https://www.flaticon.com/free-icon/globe_744502 by Vectors Market under Flaticon Basic License (CC BY 3.0)
    { regex: "FLIGHT|SPACE", url: "https://image.flaticon.com/icons/svg/744/744502.svg" },
    //Geography
    //Source: https://www.flaticon.com/free-icon/globe_717982 by DinosoftLabs under Flaticon Basic License (CC BY 3.0)
    { regex: "GEOG", url: "https://image.flaticon.com/icons/svg/717/717982.svg" },
    //Art (Generic)
    //Source: https://www.flaticon.com/free-icon/creativity_1497573 by Smashicons under Flaticon Basic License (CC BY 3.0)
    { regex: "(^|\\b)ART\\b", url: "https://image.flaticon.com/icons/svg/1497/1497573.svg" },
    //Dance
    //Source: https://www.flaticon.com/free-icon/dancing_493507 by Freepik under Flaticon Basic License (CC BY 3.0)
    { regex: "DANCE", url: "https://image.flaticon.com/icons/svg/493/493507.svg" },
    //Museum Studies
    //Source: https://www.flaticon.com/free-icon/banks_252032 by Freepik under Flaticon Basic License (CC BY 3.0)
    { regex: "MUSEUM", url: "https://image.flaticon.com/icons/svg/252/252032.svg" },
    //Golf
    //Source: https://www.flaticon.com/free-icon/golf_1584143 by Freepik under Flaticon Basic License (CC BY 3.0)
    { regex: "GOLF", url: "https://image.flaticon.com/icons/svg/1584/1584143.svg" },
    //English Language Development
    //Source: https://www.flaticon.com/free-icon/book_947478 by Eucalyp under Flaticon Basic License (CC BY 3.0)
    { regex: "(^|\\b)ELD\\b|(^|\\b)ELL\\b", url: "https://image.flaticon.com/icons/svg/947/947478.svg" },
    //Theater/Drama
    //Source: https://www.flaticon.com/free-icon/theater_214351 by Pixel Buddha under Flaticon Basic License (CC BY 3.0)
    { regex: "(^|\\b)THEA(TER)?\\b|DRAMA", url: "https://image.flaticon.com/icons/svg/214/214351.svg" },
    //Leadership
    //Source: https://www.flaticon.com/free-icon/government_1534091 by Freepik under Flaticon Basic License (CC BY 3.0)
    { regex: "LEADERSHIP", url: "https://image.flaticon.com/icons/svg/1534/1534091.svg" },
    //TA, Peer Counseling, Tutor
    //Source: https://www.flaticon.com/free-icon/collaboration_1402119 by Eucalyp under Flaticon Basic License (CC BY 3.0)
    { regex: "SERVICE|PEER COUNSELING|TUTOR|INTRO SOCIO", url: "https://image.flaticon.com/icons/svg/1402/1402119.svg" },
    // IB Middle Years Program Sci/Tech, Creative Expression
    //Source: https://www.flaticon.com/free-icon/idea_1460471 by Eucalyp under Flaticon Basic License (CC BY 3.0)
    { regex: "MYP ST TECH|PRN ENGINEER|CREAT EXP", url: "https://image.flaticon.com/icons/svg/1460/1460471.svg" },
    //Latin
    //Source: https://www.flaticon.com/free-icon/manuscript_1020074 by Freepik under Flaticon Basic License (CC BY 3.0)
    { regex: "LATIN", url: "https://image.flaticon.com/icons/svg/1020/1020074.svg" },
    //Humanities & Life Management
    //Source: https://www.flaticon.com/free-icon/discussion_1205495 by Freepik under Flaticon Basic License (CC BY 3.0)
    { regex: "HUMANITI?E?S?|LIFE MGMT", url: "https://image.flaticon.com/icons/svg/1205/1205495.svg" },
    //Yearbook
    //Source: https://www.flaticon.com/free-icon/memories_1006107 by Freepik under Flaticon Basic License (CC BY 3.0)
    { regex: "YEARBOOK|DIG IMAG", url: "https://image.flaticon.com/icons/svg/1006/1006107.svg" },
    //Networking
    //Source: https://www.flaticon.com/free-icon/network_1554377 by srip under Flaticon Basic License (CC BY 3.0)
    { regex: "NETWORKING", url: "https://image.flaticon.com/icons/svg/1554/1554377.svg" },
    //Research
    //Source: https://www.flaticon.com/free-icon/research_164996 by Freepik under Flaticon Basic License (CC BY 3.0)
    { regex: "RES(EA)?RCH", url: "https://image.flaticon.com/icons/svg/164/164996.svg" },
    //College Prep, etc.
    //Source: https://www.flaticon.com/free-icon/mortarboard_167743 by Freepik under Flaticon Basic License (CC BY 3.0)
    { regex: "COL(LEGE)?\\b", url: "https://image.flaticon.com/icons/svg/167/167743.svg" },
    //Career exploration
    //Source: https://www.flaticon.com/free-icon/briefcase_149018 by Smashicons under Flaticon Basic License (CC BY 3.0)
    { regex: "CAREER|JOB", url: "https://image.flaticon.com/icons/svg/149/149018.svg" },
    //Advisory, Homeroom, No Period
    //Source: https://www.flaticon.com/free-icon/books_167756 by Freepik under Flaticon Basic License (CC BY 3.0)
    { regex: "ADVIS|HOME|SOCIAL COM", url: "https://image.flaticon.com/icons/svg/167/167756.svg" },
    //Swimming
    //Source: https://www.flaticon.com/free-icon/swimming_124212 by Freepik under Flaticon Basic License (CC BY 3.0)
    { regex: "SWIM", url: "https://image.flaticon.com/icons/svg/124/124212.svg" },
    //Journalism
    //Source: https://www.flaticon.com/free-icon/communication_1720094 by Freepik under Flaticon Basic License (CC BY 3.0)
    { regex: "JOURNALISM", url: "https://image.flaticon.com/icons/svg/1720/1720094.svg" },
    //Tennis
    //Source: https://www.flaticon.com/free-icon/tennis_1645793 by Eucalyp under Flaticon Basic License (CC BY 3.0)
    { regex: "TENNIS", url: "https://image.flaticon.com/icons/svg/1645/1645793.svg" },
    //Speech (and Debate?)
    //Source: https://www.flaticon.com/free-icon/speak_512500 by Twitter under CC BY 3.0
    { regex: "SPEECH", url: "https://image.flaticon.com/icons/svg/512/512500.svg" },
    //Game Design
    //Source: https://www.flaticon.com/free-icon/computer_1737285 by Eucalyp under Flaticon Basic License (CC BY 3.0)
    { regex: "GAME DSGN", url: "https://image.flaticon.com/icons/svg/1737/1737285.svg" },
    //Graphic Design
    //Source: https://www.flaticon.com/free-icon/layers_148862 by Smashicons under Flaticon Basic License (CC BY 3.0)
    { regex: "GRAPHIC DESIGN", url: "https://image.flaticon.com/icons/svg/148/148862.svg" },
    //Water Polo
    //Source: https://www.flaticon.com/free-icon/water-polo_625383 by Freepik under Flaticon Basic License (CC BY 3.0)
    { regex: "WATERPOLO", url: "https://image.flaticon.com/icons/svg/625/625383.svg" },
    //Horticulture
    //Source: https://www.flaticon.com/free-icon/sprout_346195 by Freepik under Flaticon Basic License (CC BY 3.0)
    { regex: "HORT", url: "https://image.flaticon.com/icons/svg/346/346195.svg" },
    //History (Generic)
    //Source: https://www.flaticon.com/free-icon/parchment_1501478 by surang under Flaticon Basic License (CC BY 3.0)
    { regex: "HIST", url: "https://image.flaticon.com/icons/svg/1501/1501478.svg" },
    //Science (Generic)
    //Source: https://image.flaticon.com/icons/svg/167/167733.svg by Freepik under Flaticon Basic License (CC BY 3.0)
    { regex: "SCI", url: "https://image.flaticon.com/icons/svg/167/167733.svg" },
    //Math (Generic)
    //Source: https://www.flaticon.com/free-icon/mathematics_1284095 by surang under Flaticon Basic License (CC BY 3.0)
    { regex: "(^|\\b)MATH", url: "https://image.flaticon.com/icons/svg/1284/1284095.svg" },
    //All classes without an image
    //Source: https://www.flaticon.com/free-icon/bookshelf_164949 by Freepik under Flaticon Basic License (CC BY 3.0)
    { regex: ".", url: "https://image.flaticon.com/icons/svg/164/164949.svg" }
];