// archived courses button in courses dropdown
(function () {
    let coursesDropdownContainer;

    let coursesDropdownObserver = new MutationObserver(function (mutationList) {
        let processThis = false;

        // ensure we're processing more than an addition of something this very handler added
        for (let mutation of mutationList) {
            for (let addedElem of mutation.addedNodes) {
                if (addedElem.classList && !addedElem.classList.contains("splus-addedtodynamicdropdown")) {
                    processThis = true;
                    break;
                }
            }

            if (processThis) {
                break;
            }
        }

        if (!processThis) {
            return;
        }

        Logger.log("Processing courses dropdown mutation");

        if (Setting.getValue("archivedCoursesButton") === "show") {
            // aims to select the original "My Courses" link in the dropdown
            let candidateLink = coursesDropdownContainer.querySelector(".CjR09._8a6xl._1tpub > a[href=\"/courses\"]._3ghFm");
            if (candidateLink) {
                // the obfuscated class name is the one Schoology uses to float these links right
                let newContainer = createElement("div", ["courses-mycourses-droppeddown-link-container", "splus-addedtodynamicdropdown", "_3ghFm"], {}, [
                    createElement("a", ["floating-contained-link", "splus-addedtodynamicdropdown"], {
                        href: "/courses",
                        textContent: "My Courses"
                    }),
                    createElement("a", ["floating-contained-link", "splus-addedtodynamicdropdown"], {
                        href: "/courses/mycourses/past",
                        textContent: "Past Courses"
                    })
                ]);

                candidateLink.replaceWith(newContainer);
            }
        }

        // rearrange spacing in the courses dropdown
        // Schoology has 4 tiles per row by default, we want 6
        const targetRowWidth = 6;

        function createSpacerTile() {
            return createElement("div", ["_3hM4e", "_3_a9F", "zJU7e", "util-width-zero-1OcAd", "_2oHes", "util-last-child-margin-right-zero-1DVn4", "splus-addedtodynamicdropdown"]);
        }

        function isSpacerTile(element) {
            return element.childElementCount == 0;
        }

        // tiles must be mutable; caller must not care what happens to it
        // spaceToTotal = desired width
        function createTilesRow(tiles, spaceToTotal) {
            if (!spaceToTotal) {
                spaceToTotal = targetRowWidth;
            }

            while (tiles.length < spaceToTotal) {
                tiles.push(createSpacerTile());
            }

            // the two obfuscated classes are the ones Schoology has on its rows
            return createElement("div", ["_1tpub", "Kluyr", "splus-addedtodynamicdropdown"], {}, tiles);
        }

        let rowContainer;
        let tiles = [];

        let needsReorganization = false;

        // selector: (actual content container) (thing which just holds the inner body) (row of tiles)
        const rowsSelector = "div[role=\"menu\"] ._3mp5E._24W2g._26UWf ._1tpub.Kluyr";

        for (let tilesRow of coursesDropdownContainer.querySelectorAll(rowsSelector)) {
            if (!rowContainer) {
                rowContainer = tilesRow.parentElement;
            }
            if (tilesRow.childElementCount != targetRowWidth) {
                needsReorganization = true;
            }
            for (let tile of tilesRow.children) {
                if (!isSpacerTile(tile)) {
                    tiles.push(tile);
                }
            }
        }

        // used later, clone the complete tiles list
        let contentTiles = tiles.slice(0);

        if (needsReorganization) {
            let nodeToDelete;
            while (nodeToDelete = coursesDropdownContainer.querySelector(rowsSelector)) {
                nodeToDelete.remove();
            }

            while (tiles.length > 0) {
                rowContainer.appendChild(createTilesRow(tiles.splice(0, targetRowWidth), targetRowWidth));
            }
        }

        // nicknames in courses dropdown
        // these need to be handled specially because it's not displayed as one contiguous block anymore
        for (let contentTile of contentTiles) {
            let cardData = contentTile.querySelector(".Card-card-data-17m6S");
            if (!cardData || cardData.querySelector(".splus-coursesdropdown-nicknamed-dataset") || cardData.childElementCount > 1) {
                // not a course, or already handled
                continue;
            }

            let courseAlias;
            if (cardData.parentElement.href) {
                let courseLinkMatch = cardData.parentElement.href.match(/\/course\/(\d+)\/?$/);
                if (courseLinkMatch) {
                    courseLinkMatch = courseLinkMatch[1];
                }
                if (courseLinkMatch && Setting.getValue("courseAliases")) {
                    courseAlias = Setting.getValue("courseAliases")[courseLinkMatch];
                }
            }

            if (!courseAlias) {
                continue;
            }

            // create our splus-coursesdropdown-nicknamed-dataset
            // we can't delete the old one because theming uses data from it
            cardData.firstElementChild.style.display = "none";

            // Schoology's styling: by default, card data has:
            // course name, in blue, at top: div._3U8Br._2s0LQ._2qcpH._3ghFm._17Z60._1Aph-.gs0RB
            // section title, in black, in middle (most emphasized, I think): div._1wP6w._23_WZ._2qcpH._3ghFm._17Z60._1Aph-.gs0RB
            // school name, in smaller gray at bottom: div._2wOCj.xjR5v._2qcpH._17Z60._1Aph-.gs0RB

            let origCourseTitle = cardData.firstElementChild.querySelector("div._3U8Br._2s0LQ._2qcpH._3ghFm._17Z60._1Aph-.gs0RB");
            let origSectionTitle = cardData.firstElementChild.querySelector("div._1wP6w._23_WZ._2qcpH._3ghFm._17Z60._1Aph-.gs0RB");
            let origSchoolTitle = cardData.firstElementChild.querySelector("div._2wOCj.xjR5v._2qcpH._17Z60._1Aph-.gs0RB");

            // stylistically equivalent to the other card data, in terms of our class list for the container element
            // FIXME: there's a stylistic incongruity between a nicknamed course in the dropdown and a non-nicknamed one
            let newCardDataChild = createElement("div", ["_36sHx", "_3M0N7", "fjQuT", "_1EyV_", "splus-coursesdropdown-nicknamed-dataset", "splus-addedtodynamicdropdown"], {}, [
                createElement("div", ["_1wP6w", "_23_WZ", "_2qcpH", "_3ghFm", "_17Z60", "_1Aph-", "gs0RB"], { textContent: courseAlias }), // stylized like section title
                createElement("div", ["_2wOCj", "xjR5v", "_2qcpH", "_17Z60", "_1Aph-", "gs0RB", "splus-coursealiasing-exempt"], { textContent: origCourseTitle.textContent + ": " + origSectionTitle.textContent }), // original full title, stylized like school name
                createElement("div", ["_2wOCj", "xjR5v", "_2qcpH", "_17Z60", "_1Aph-", "gs0RB"], { textContent: origSchoolTitle.textContent }) // school title, original styling and text
            ]);
            cardData.appendChild(newCardDataChild);
        }
    });

    for (let candidateLabel of document.querySelectorAll("#header nav ul > li span._1D8fw")) {
        if (candidateLabel.textContent == "Courses") {
            // a span inside a button inside a div (inside a li)
            coursesDropdownContainer = candidateLabel.parentElement.parentElement;

            // to make interaction throughout the rest of the codebase easier
            coursesDropdownContainer.parentElement.classList.add("splus-courses-navbar-button");
            break;
        }
    }

    if (!coursesDropdownContainer) {
        return;
    }

    coursesDropdownObserver.observe(coursesDropdownContainer, { childList: true, subtree: true });

    if (!document.getElementById("reorder-ui")) {
        let newContainer = document.createElement("div");
        newContainer.innerHTML = '<div id="reorder-ui"><div class="_3W1Kw"><div><button class="link-btn" role="button" style="height: 100%;"><span class="Reorder-reorder-icon-15wl2"></span>Reorder Courses</button></div></div></div>';
        document.getElementById("footer").appendChild(newContainer);
        let newScriptProps = "{\"containerId\":\"reorder-ui\",\"locales\":{\"en\":{\"reorder-ui.reorder_course\":\"Reorder Courses\",\"reorder-ui.courses_below_the_line_message\":\"Courses that appear below this line will not appear in the courses dropdown.\",\"reorder-ui.reorder_group\":\"Reorder Groups\",\"reorder-ui.groups_below_the_line_message\":\"Groups that appear below this line will not appear in the groups dropdown.\",\"core.admin\":\"Administrator\",\"core.note\":\"Note:\",\"core.of\":\"of\",\"core.to\":\"to\",\"core.add\":\"Add\",\"core.and\":\"and\",\"core.added\":\"Added\",\"core.add_to\":\"Add to\",\"core.added_to\":\"Added to\",\"core.confirm\":\"Confirm\",\"core.continue\":\"Continue\",\"core.edit\":\"Edit\",\"core.delete\":\"Delete\",\"core.remove\":\"Remove\",\"core.delete_content\":\"Delete Content\",\"core.create\":\"Create\",\"core.download\":\"Download\",\"core.copy\":\"Copy\",\"core.copied\":\"Copied\",\"core.save\":\"Save\",\"core.done\":\"done\",\"core.saving\":\"Saving...\",\"core.saving_without_ellipsis\":\"Saving\",\"core.last_saved\":\"Last saved\",\"core.saved\":\"Saved\",\"core.go_back\":\"Go back\",\"core.back\":\"Back\",\"core.try_again\":\"Try Again\",\"core.connection_error_title\":\"Connection Error\",\"core.err_generic\":\"An error occurred\",\"core.err_unable_to_save\":\"An error occurred while saving\",\"core.err_unable_to_save_reorder\":\"Reordering failed to save due to a system error. Please refresh the page and try reordering your content again.\",\"core.err_unable_to_save_try_again\":\"An error occurred while saving - please try again\",\"core.send\":\"Send\",\"core.cancel\":\"Cancel\",\"core.replace\":\"Replace\",\"core.close\":\"Close\",\"core.grade_level\":\"Level\",\"core.save_changes\":\"Save changes\",\"core.undo_last_change\":\"Undo last change\",\"core.nothing_to_undo\":\"There are no changes that can be undone. Undo will be active once you make changes.\",\"core.browse\":\"Browse\",\"core.browse_or_search\":\"Browse\\/Search\",\"core.manage\":\"Manage\",\"core.count_selected\":\"%{count} selected\",\"core.selected_count\":\"selected (%{count})\",\"core.selected_with_num\":\"Selected (%{num})\",\"core.associated_with_num\":\"Associated (%{num})\",\"core.version\":\"version\",\"core.html5_media_error\":\"Your browser does not support HTML5 media tags\",\"core.today_at\":\"Today at\",\"core.yesterday_at\":\"Yesterday at\",\"core.date_at_time\":\"%{month}, at %{time}\",\"core.publish_to_nobody\":\"No One\",\"core.publish_to_user\":\"your Connections\",\"core.publish_to_schoology\":\"all Schoology Users\",\"core.publish_to_everyone\":\"Everyone\",\"core.loading_msg\":\"Loading...\",\"core.title\":\"Title\",\"core.description\":\"Description\",\"core.untitled\":\"Untitled\",\"core.unnamed_page\":\"Unnamed Page\",\"core.edit_page\":\"Edit Page\",\"core.preview_page\":\"Preview Page\",\"core.file\":\"File\",\"core.view_file\":\"View File\",\"core.link_url\":\"Link\\/URL\",\"core.assignment\":\"Assignment\",\"core.view_assignment\":\"View Assignment\",\"core.assignment_submission\":\"Assignment Submission\",\"core.no_assignments_with_submissions_in_course\":\"There are no assignments with submissions in this course\",\"core.no_course_enrollment_msg\":\"You are not currently enrolled in any courses\",\"core.upload\":\"Upload\",\"core.num_items\":\"%{smart_count} Item |||| %{smart_count} Items\",\"core.num_selected\":\"%{num} Selected\",\"core.num_questions\":\"%{smart_count} question |||| %{smart_count} questions\",\"core.assessment\":\"Test\\/Quiz\",\"core.view_assessment\":\"View Test\\/Quiz\",\"core.add_a_link\":\"Add a link\",\"core.add_link\":\"Add link\",\"core.unable_to_add_link\":\"Unable to add link\",\"core.attachments\":\"Attachments\",\"core.image\":\"Image\",\"core.upload_image\":\"Upload image\",\"core.update\":\"Update\",\"core.color\":\"Color\",\"core.preview\":\"Preview\",\"core.no_cover_image\":\"No cover image\",\"core.red\":\"Red\",\"core.orange\":\"Orange\",\"core.yellow\":\"Yellow\",\"core.green\":\"Green\",\"core.blue\":\"Blue\",\"core.grey\":\"Grey\",\"core.doc_convert_header\":\"Document conversion in progress for file:\",\"core.doc_convert_line1\":\"We are converting your file which may take several minutes.\",\"core.doc_convert_line2\":\"Once successfully converted your file will be displayed here.\",\"core.doc_convert_fail_header\":\"Document conversion has failed.\",\"core.doc_convert_fail_line1\":\"Please check your file and try again.\",\"core.doc_convert_fail_line2\":\"If you're still experiencing issues please contact customer support for further assistance.\",\"core.contact_support\":\"Contact Customer Support\",\"core.export_to_pdf\":\"Export to PDF\",\"core.export_to_zip\":\"Export to ZIP\",\"core.edit_cover_image\":\"Edit Cover Image\",\"core.thumb_max_msg\":\"Max 5MB\",\"core.upload_file_fail_msg\":\"Unable to upload file\",\"core.retry\":\"Retry\",\"core.retry_save\":\"Retry save\",\"core.retry_upload\":\"Retry upload\",\"core.click_to_retry\":\"Click to retry\",\"core.revert\":\"Revert\",\"core.select_new_file\":\"Select New File\",\"core.upload_file_too_large\":\"The file is too large to upload\",\"core.send_feedback\":\"Send Feedback\",\"core.sign_in_to_send_feedback\":\"Sign In To Send Feedback\",\"core.switch_to_html\":\"Switch to HTML\",\"core.switch_to_visual\":\"Switch to Visual\",\"core.image_media\":\"Image\\/Media\",\"core.link\":\"Link\",\"core.view_link\":\"View Link\",\"core.symbol\":\"Symbol\",\"core.symbols\":\"Symbols\",\"core.equation\":\"Equation\",\"core.latex\":\"LaTeX\",\"core.tooltip\":\"Tooltip\",\"core.strikethrough\":\"Strikethrough\",\"core.superscript\":\"Superscript\",\"core.subscript\":\"Subscript\",\"core.clear_formatting\":\"Clear Formatting\",\"core.insert_content\":\"Insert Content\",\"core.formatting\":\"Formatting\",\"core.subject\":\"Subject\",\"core.message\":\"Message\",\"core.page\":\"Page\",\"core.view_page\":\"View Page\",\"core.revision\":\"Revision\",\"core.err_try_add_again\":\"Error, please try clicking 'Add' again\",\"core.try_it_out\":\"Try it out!\",\"core.ok_got_it\":\"Okay, got it!\",\"core.my_courses\":\"My courses\",\"core.archived_courses\":\"Archived Courses\",\"core.recent_submissions\":\"Recent submission\",\"core.add_submission\":\"Add submission\",\"core.add_a_submission\":\"Add a submission\",\"core.unable_to_add_submission\":\"Unable to add submission\",\"core.flash_missing_msg\":\"To view this page ensure that Adobe Flash Player version 10.0.0 or greater is installed.\",\"core.congratulations\":\"Congratulations!\",\"core.search\":\"Search\",\"core.clear_search\":\"Clear Search\",\"core.student\":\"Student\",\"core.students\":\"Students\",\"core.school\":\"School\",\"core.schools\":\"Schools\",\"core.course_name\":\"Course Name\",\"core.course_code\":\"Course Code\",\"core.subject_area\":\"Subject Area\",\"core.level\":\"Level\",\"core.section\":\"Section\",\"core.sections\":\"Sections\",\"core.section_name\":\"Section Name\",\"core.section_code\":\"Section Code\",\"core.grading_period\":\"Grading Period\",\"core.instructor\":\"Instructor\",\"core.instructors\":\"Instructors\",\"core.instructor_last_name\":\"Instructor Last Name\",\"core.instructor_first_name\":\"Instructor First Name\",\"core.num_others\":\"%{smart_count} other |||| %{smart_count} others\",\"core.num_schools\":\"%{smart_count} School |||| %{smart_count} Schools\",\"core.all_schools\":\"All Schools\",\"core.num_sections\":\"%{smart_count} Section |||| %{smart_count} Sections\",\"core.all_sections\":\"All Sections\",\"core.num_instructors\":\"%{smart_count} Instructor |||| %{smart_count} Instructors\",\"core.all_instructors\":\"All Instructors\",\"core.previous\":\"Previous\",\"core.first\":\"First\",\"core.next\":\"Next\",\"core.last\":\"Last\",\"core.loading\":\"Loading\",\"core.displaying_page_result\":\"Displaying %{start} - %{end} of %{total} results\",\"core.add_members\":\"Add Members\",\"core.edit_members\":\"Edit Members\",\"core.link_existing_section\":\"Link Existing Section\",\"core.unlink_existing_section\":\"Unlink Existing Section\",\"core.copy_section\":\"Copy Section\",\"core.duplicate\":\"Duplicate\",\"core.question_bank\":\"Question Bank\",\"core.question_banks\":\"Question Banks\",\"core.question_banks_with_num\":\"Question Bank (%{smart_count}) |||| Question Banks (%{smart_count})\",\"core.content\":\"Content\",\"core.page_break\":\"Page Break\",\"core.text\":\"Text\",\"core.see_more\":\"see more\",\"core.see_less\":\"see less\",\"core.total\":\"Total\",\"core.show_more\":\"show more\",\"core.show_less\":\"show less\",\"core.points\":\"points\",\"core.criteria\":\"criteria\",\"core.total_points\":\"Total Points\",\"core.question\":\"Question\",\"core.click_to_type_question\":\"Click to type your question\",\"core.yes\":\"Yes\",\"core.no\":\"No\",\"core.yes_with_correct_answers\":\"Yes with correct answers\",\"core.unlimited\":\"Unlimited\",\"core.times\":\"%{smart_count} time |||| %{smart_count} times\",\"core.hide_point_values\":\"Hide\",\"core.show_point_values\":\"Display\",\"core.minutes\":\"minute |||| minutes\",\"core.mins\":\"%{smart_count} min |||| %{smart_count} mins\",\"core.with_answers\":\"with correct answers\",\"core.highest_score\":\"Highest Score\",\"core.average_score\":\"Average Score\",\"core.last_score\":\"Last Score\",\"core.none\":\"none\",\"core.spanish\":\"Spanish\",\"core.no_search_results_found\":\"No search results found\",\"core.months_long\":\"January,February,March,April,May,June,July,August,September,October,November,December\",\"core.days_long\":\"Sunday,Monday,Tuesday,Wednesday,Thursday,Friday,Saturday\",\"core.questions_label\":\"questions\",\"core.questions\":\"%{smart_count} question |||| %{smart_count} questions\",\"core.point\":\"%{smart_count} point |||| %{smart_count} points\",\"core.short_answer\":\"Short answer\",\"core.essay_question\":\"Essay question\",\"core.printing\":\"Printing\",\"core.excused\":\"Excused\",\"core.incomplete\":\"Incomplete\",\"core.missing\":\"Missing\",\"core.mark_exception\":\"Mark With an Exception\",\"core.clear_exception\":\"Clear Exception\",\"core.exception\":\"Exception\",\"core.in_progress\":\"In Progress\",\"core.view\":\"View\",\"core.settings\":\"Settings\",\"core.setup\":\"Setup\",\"core.status\":\"Status\",\"core.status_draft\":\"Draft\",\"core.status_active\":\"Active\",\"core.status_retired\":\"Retired\",\"core.other\":\"Other\",\"core.last_modified\":\"Last modified\",\"core.created_by\":\"Created by\",\"core.date\":\"Date\",\"core.date_range\":\"Date Range\",\"core.select_date\":\"Select Date\",\"core.start_date\":\"Start Date\",\"core.end_date\":\"End Date\",\"core.start_date_invalid_date_range\":\"Start time must occur before the end time\",\"core.end_date_invalid_date_range\":\"End time must occur after the start time\",\"core.invalid\":\"Invalid\",\"core.invalidated\":\"Invalidated\",\"core.course_search.display_current_sections_only\":\"Display Current Sections Only\",\"core.course_search.search_sections\":\"Search Sections\",\"core.course_search.show_all_search_options\":\"Show all search options\",\"core.course_search.show_fewer_search_options\":\"Show fewer search options\",\"core.course_search.advanced_search\":\"Advanced Search\",\"core.course_search.sections_in_active\":\"Sections in Active Grading Periods\",\"core.course_search.curr_section_only_hint\":\"You must deselect \\\"Sections in Active Grading Periods\\\" to select a grading period.\",\"core.course_search.select_school\":\"Select school\",\"core.course_search.select_subject\":\"Select a subject area\",\"core.course_search.select_grade_level\":\"Select a grade level\",\"core.course_search.select_grading_period\":\"Select a grading period\",\"core.course_search.enter_course_name\":\"Enter course name\",\"core.course_search.enter_section_name\":\"Enter section name\",\"core.course_search.enter_course_code\":\"Enter course code\",\"core.course_search.enter_section_code\":\"Enter section code\",\"core.course_search.enter_first_name\":\"Enter instructor first name\",\"core.course_search.enter_last_name\":\"Enter instructor last name\",\"core.az\":\"AZ\",\"core.za\":\"ZA\",\"core.first_name_a_z\":\"First Name, A-Z\",\"core.first_name_z_a\":\"First Name, Z-A\",\"core.last_name_a_z\":\"Last Name, A-Z\",\"core.last_name_z_a\":\"Last Name, Z-A\",\"core.instructions\":\"Instructions\",\"core.action\":\"Action\",\"core.ascending\":\"Ascending\",\"core.descending\":\"Descending\",\"core.collapse\":\"Collapse\",\"core.label\":\"Label\",\"unauthorized.error.insufficient.permissions\":\"You do not have permission to see results for the current selection\",\"core.no_result_match_search_terms\":\"No results matched your search terms\",\"core.accept\":\"Accept\",\"core.dismiss\":\"Dismiss\",\"core.open\":\"Open\",\"core.results\":\"Results\",\"core.sortable.enter_sort_mode\":\"Entering sort mode\",\"core.sortable.exit_sort_mode\":\"Exiting sort mode\",\"core.sortable.moved_item\":\"Moved item from position %{old_position} to %{new_position}\",\"core.view_rubric\":\"View Rubric\",\"core.recalculating\":\"Recalculating\",\"core.unsubmit\":\"Unsubmit\",\"core.submitted\":\"Submitted\",\"core.late\":\"Late\",\"core.on_time\":\"On Time\",\"core.graded\":\"Graded\",\"core.needs_grading\":\"Needs Grading\",\"core.grade\":\"Grade\",\"core.comments\":\"Comments\",\"core.rating\":\"Rating\",\"core.shared\":\"Shared\",\"core.rubric\":\"Rubric\",\"core.exceptions\":\"Exceptions\",\"core.no_cancel\":\"No, cancel\",\"core.true\":\"True\",\"core.false\":\"False\",\"core.items\":\"Items\",\"core.done_capitalized\":\"Done\",\"core.yes_submit\":\"Yes, submit\",\"core.nevermind_not_yet\":\"Nevermind, not yet\",\"core.complete\":\"Complete\",\"core.display\":\"Display\",\"core.activity_not_available\":\"This Activity is Not Available\",\"core.import.auto\":\"Auto\",\"core.import.manual\":\"Manual\",\"core.import.type_csv\":\"Csv\",\"core.import.accepted\":\"Accepted\",\"core.import.in_progress\":\"In progress\",\"core.import.completed\":\"Completed\",\"core.import.failed\":\"Failed\",\"core.grades\":\"Grades\",\"core.mastery\":\"Mastery\",\"core.calendar\":\"Calendar\",\"core.more\":\"More\",\"core.add_to_sections\":\"Add To Sections\",\"core.section_add_confirm_popup\":\"You have added an assessment to %{smart_count} section.||||You have added an assessment to %{smart_count} sections.\",\"core.section_add_confirm_popup_async\":\"Your assessment is being added to %{smart_count} section. You can view the progress in <link>Transfer History<\\/link>.||||Your assessment is being added to %{smart_count} sections. You can view the progress in <link>Transfer History<\\/link>.\"}},\"type\":\"courses\"}";
        let newScript = createElement("script", [], { src: "https://ui.schoology.com/platform/reorder-ui/bundle.0.1.1.js", async: true, id: "reorder-ui-script" });
        newScript.dataset.props = newScriptProps;
        newContainer.appendChild(newScript);
    }
})();

// hack for course aliases
(async function () {
    let applyCourseAliases = null;
    let applyThemeIcons = null;

    // PREP COURSE ICONS
    // course dashboard
    let mainInner = document.getElementById("main-inner");
    let courseDashboard = mainInner && window.location.pathname == "/home/course-dashboard";
    let hasAppliedDashboard = false;

    // duplicate of logic in themes.js; needed because we do mutation logic here
    let skipOverriddenIcons = Setting.getValue("courseIcons") === "defaultOnly";

    if (Setting.getValue("courseIcons") != "disabled") {
        applyThemeIcons = function () {
            let ancillaryList = null;
            if (courseDashboard && !hasAppliedDashboard) {
                let cardLenses = mainInner.querySelectorAll(".course-dashboard .sgy-card-lens");
                if (cardLenses && cardLenses.length > 0) {
                    ancillaryList = [];
                    //Course icons on "Course Dashboard" view of homepage
                    for (let tile of cardLenses) {
                        // check if not default icon
                        // underlying method does this, but since we mutate we have to do it too
                        if (skipOverriddenIcons && !((tile.firstChild.data || tile.firstChild.src || "").match(defaultCourseIconUrlRegex))) {
                            continue;
                        }

                        // clear children
                        while (tile.firstChild) {
                            tile.removeChild(tile.firstChild);
                        }
                        // create an img
                        let img = document.createElement("img");
                        // find course name
                        // note the context footer does linebreaks, so we have to undo that
                        let courseName = tile.parentElement.querySelector(".course-dashboard__card-context-title").textContent.replace("\n", " ");
                        img.alt = "Profile picture for " + courseName;
                        // to mirror original styling and behavior
                        img.classList.add("course-dashboard__card-lens-svg");
                        img.tabIndex = -1;

                        tile.appendChild(img);
                        ancillaryList.push(img);
                    }
                    hasAppliedDashboard = true;
                }
            }
            Theme.setProfilePictures(ancillaryList);
        };
        applyThemeIcons();
    }

    // PREP COURSE ALIASES
    if (Setting.getValue("courseAliases")) {
        let myClasses = (await fetchApiJson(`/users/${getUserId()}/sections`)).section;

        // get course info for courses with aliases that I'm not currently enrolled in, concurrently
        myClasses.push(...await Promise.all(Object.keys(Setting.getValue("courseAliases")).filter(aliasedCourseId => !myClasses.some(x => x.id == aliasedCourseId))
            .filter(aliasedCourseId => Setting.getValue("courseAliases")[aliasedCourseId]) // only fetch if the alias hasn't subsequently been cleared
            .map(id => fetchApi(`/sections/${id}`).then(resp => resp.json().catch(rej => null), rej => null))));

        Logger.log("Classes loaded, building alias stylesheet");
        // https://stackoverflow.com/a/707794 for stylesheet insertion
        let sheet = window.document.styleSheets[0];

        for (let aliasedCourseId in Setting.getValue("courseAliases")) {
            // https://stackoverflow.com/a/18027136 for text replacement
            sheet.insertRule(`.course-name-wrapper-${aliasedCourseId} {
            visibility: hidden;
            word-spacing:-999px;
            letter-spacing: -999px;
        }`, sheet.cssRules.length);
            sheet.insertRule(`.course-name-wrapper-${aliasedCourseId}:after {
            content: "${Setting.getValue("courseAliases")[aliasedCourseId]}";
            visibility: visible;
            word-spacing:normal;
            letter-spacing:normal; 
        }`, sheet.cssRules.length);
        }

        Logger.log("Applying aliases");
        applyCourseAliases = function (mutationsList) {
            let rootElement = document.body;

            if (mutationsList && mutationsList.length == 0) {
                return;
            }

            if (mutationsList && mutationsList.length == 1) {
                rootElement = mutationsList[0].target;
            }

            for (let jsonCourse of myClasses) {
                if (!jsonCourse || !Setting.getValue("courseAliases")[jsonCourse.id]) {
                    continue;
                }

                let findTexts = [jsonCourse.course_title + ": " + jsonCourse.section_title, jsonCourse.course_title + " : " + jsonCourse.section_title];
                let wrapClassName = "course-name-wrapper-" + jsonCourse.id;

                for (let findText of findTexts) {
                    findAndReplaceDOMText(rootElement, {
                        find: findText,
                        wrap: "span",
                        wrapClass: wrapClassName,
                        portionMode: "first",
                        filterElements: (elem) => !elem.classList || !elem.classList.contains("splus-coursealiasing-exempt")
                    });

                    document.title = document.title.replace(findText, Setting.getValue("courseAliases")[jsonCourse.id]);
                }

                // cleanup: if we run this replacement twice, we'll end up with unnecessary nested elements <special-span><special-span>FULL COURSE NAME</special-span></special-span>
                let nestedSpan;
                while (nestedSpan = document.querySelector(`span.${wrapClassName}>span.${wrapClassName}`)) {
                    let parentText = nestedSpan.textContent;
                    let parentElem = nestedSpan.parentElement;
                    while (parentElem.firstChild) {
                        parentElem.firstChild.remove();
                    }
                    parentElem.textContent = parentText;
                }
            }

        };
        applyCourseAliases();
    }

    // MUTATION HOOK
    let isModifying = false;

    // beware of performance implications of observing document.body
    let aliasPrepObserver = new MutationObserver(function (mutationsList) {
        if (isModifying) {
            return;
        }

        isModifying = true;

        let filteredList = mutationsList.filter(function (mutation) {
            for (let cssClass of mutation.target.classList) {
                // target blacklist
                // we don't care about some (especially frequent and performance-hurting) changes
                if (cssClass.startsWith("course-name-wrapper-")) {
                    // our own element, we don't care
                    return false;
                }
                if (cssClass.includes("pendo")) {
                    // Schoology's analytics platform, we don't care
                    return false;
                }
            }

            return true;
        });

        // this delegate has the conditional within it
        if (applyCourseAliases) {
            applyCourseAliases(filteredList);
        }

        if (applyThemeIcons && filteredList.length > 0) {
            applyThemeIcons();
        }

        isModifying = false;
    });
    // necessary (again) because on *some* pages, namely course-dashboard, we have a race condition
    // if the main body loads after our initial check but before the observe call (e.g. during our network awaits), 
    // we won't catch the update until a separate unrelated DOM change
    // this is not as much of an issue with aliases because we do our initial check there after the network awaits,
    // which are by far the longest-running part of this code
    if (applyThemeIcons) {
        applyThemeIcons();
    }
    aliasPrepObserver.observe(document.body, { childList: true, subtree: true });

})();

// show grades on notifications dropdown
(function () {
    let notifsMenuContainer = document.querySelector("#header nav button[aria-label$=\"notifications\"]").parentElement;
    let gradesLoadedPromise = (async function () {
        let myGrades = await fetchApiJson(`/users/${getUserId()}/grades`);

        let loadedGradeContainer = {};

        // assignment grades
        // period is an array of object
        // period[x].assignment is an array of grade objects (the ones we want to enumerate)
        for (let assignment of myGrades.section.reduce((oa, thisClassGrades) => oa.concat(thisClassGrades.period.reduce((accum, curr) => accum.concat(curr.assignment), [])), [])) {
            loadedGradeContainer[assignment.assignment_id] = assignment;
            Object.freeze(assignment);
        }

        Object.freeze(loadedGradeContainer);

        return loadedGradeContainer;
    })();

    let notifsDropdownObserver = new MutationObserver(function (mutationList) {
        let processThis = false;

        // ensure we're processing more than an addition of something this very handler added
        for (let mutation of mutationList) {
            for (let addedElem of mutation.addedNodes) {
                if (addedElem.classList && !addedElem.classList.contains("splus-addedtodynamicdropdown")) {
                    processThis = true;
                    break;
                }
            }

            if (processThis) {
                break;
            }
        }

        if (!processThis) {
            return;
        }

        let coll = notifsMenuContainer.querySelectorAll("div[role=\"menu\"] ._2awxe._3skcp._1tpub a[href^=\"/assignment/\"]");
        if (coll.length > 0) {
            Logger.log("NotifsDropdown observation has links to process - processing now");
        }

        // obfuscated classnames identify the div containers of our individual notifications (explicitly excluding the "View All" button)
        for (let gradeLink of coll) {
            if (gradeLink.offsetParent == null) {
                // hidden and therefore irrelevant
                continue;
            }

            // correct the showing of "N other people" on assignment/grade notifications which should read "N other assignments"
            if (!gradeLink.parentElement.classList.contains("splus-people-are-assignments-corrected")) {
                let parentElem = gradeLink.parentElement;
                if (parentElem.firstElementChild.textContent.includes("grade") && parentElem.firstElementChild.textContent.includes("posted")) {
                    // a grades posted notification
                    for (let candidateSpan of parentElem.getElementsByTagName("span")) {
                        if (candidateSpan.textContent.includes("other people")) {
                            candidateSpan.textContent = candidateSpan.textContent.replace("other people", "other assignments");
                        }
                    }
                    parentElem.classList.add("splus-people-are-assignments-corrected");
                }
            }

            let assignmentId = (gradeLink.href.match(/\d+/) || [])[0];

            if (!assignmentId) {
                continue;
            }

            if (gradeLink.parentElement.querySelector(".grade-data.splus-addedtodynamicdropdown")) {
                // already processed
                continue;
            }

            gradesLoadedPromise.then(gradeContainer => {
                gradeLink.insertAdjacentElement("afterend", createElement("span", ["grade-data", "splus-addedtodynamicdropdown"], { textContent: ` (${gradeContainer[assignmentId].grade} / ${gradeContainer[assignmentId].max_points || 0})` }))
            });
        }

    });

    notifsDropdownObserver.observe(notifsMenuContainer, { childList: true, subtree: true });

    if (window.location.pathname == "/home/notifications") {
        // notifications page: legacy style

        let processItemList = function (itemList) {
            for (let gradeLink of itemList.querySelectorAll(".s-edge-type-grade-add a[href^=\"/assignment/\"]")) {
                if (gradeLink.offsetParent == null) {
                    // hidden and therefore irrelevant
                    continue;
                }

                let assignmentId = (gradeLink.href.match(/\d+/) || [])[0];

                if (!assignmentId) {
                    continue;
                }

                gradesLoadedPromise.then(gradeContainer => {
                    gradeLink.insertAdjacentElement("afterend", createElement("span", ["grade-data"], { textContent: ` (${gradeContainer[assignmentId].grade} / ${gradeContainer[assignmentId].max_points || 0})` }))
                });
            };
        }

        let itemList = document.querySelector("#main-inner .item-list ul.s-notifications-mini");

        let oldNotifsObserver = new MutationObserver(function () {
            processItemList(itemList);
        });

        processItemList(itemList);

        oldNotifsObserver.observe(itemList, { childList: true });
    }

    let moreGradesModalObserver = new MutationObserver(mutationsList => {
        for (let mutation of mutationsList) {
            for (let addedNode of mutation.addedNodes) {
                if (!addedNode.classList.contains("popups-box")) {
                    continue;
                }

                if (addedNode.querySelector(".popups-title .title").textContent.trim().toLowerCase() != "grades") {
                    continue;
                }

                for (let assignmentWrapper of addedNode.querySelectorAll(".popups-body .item-list li .user-item")) {
                    if (assignmentWrapper.offsetParent == null) {
                        // hidden and therefore irrelevant
                        continue;
                    }

                    let assignmentId = assignmentWrapper.getElementsByTagName("a")[1].href.match(/\d+/)[0];

                    gradesLoadedPromise.then(gradeContainer => {
                        assignmentWrapper.insertAdjacentElement("beforeend", createElement("span", ["grade-data"], { textContent: `${gradeContainer[assignmentId].grade} / ${gradeContainer[assignmentId].max_points || 0}` }))
                    });
                }
                return;
            }
        }
    });

    moreGradesModalObserver.observe(document.body, { childList: true });
})();