// add tooltip to assignments
// Schoology uses a jQuery plugin called tipsy to do its native tooltips; we use the same for consistency
// https://github.com/MartinMartimeo/tipsy
// we use an ancient jquery version because our upstream library does

(async function () {
    let gradeLoadHooks = [];

    // FIXME the container element in question (the list of assignments) can be recreated; we should handle this case
    $("#course-profile-materials tr.type-assignment").each((index, value) => {
        let loadedGrade = "...";
        $(value).find(".item-title>a").tipsy({ gravity: "w", title: () => loadedGrade });
    });

    if (gradeLoadHooks.length > 0) {
        // TODO load grade information for this class, call grade hooks
    }
})();

