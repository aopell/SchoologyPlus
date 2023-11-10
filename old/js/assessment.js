(async function() {
    // Wait for loader.js to finish running
    while (!window.splusLoaded) {
        await new Promise(resolve => setTimeout(resolve, 10));
    }
    await loadDependencies("assessment", ["all"]);
})();

// modifications to Confirm Submission assessment popup
(function () {
    /**
     * The array of handlers to call on a newly-added Confirm Submission popup.
     * @type Array<function(Element):void>
     */
    let modificationHooks = [];

    // Firefox patch for assessment submit confirmation
    if (getBrowser() == "Firefox") {
        modificationHooks.push(function (addedElem) {
            let yesBtn = addedElem.querySelector("#popup_confirm");
            yesBtn.onclick = function () {
                // reimplement the confirm-submit logic, because it apparently doesn't work in page JS once we touch the page

                // firefox-specific way to break down content script isolation; used to access a setting used by Schoology's JS
                // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Sharing_objects_with_page_scripts
                window.wrappedJSObject.Drupal.settings.s_assessment_question_fill_form.confirm_submit = false;

                // the original code sets the confirm_submit setting, clicks the button again (which is the step that fails), then closes the popup
                // since we redirect anyway, we don't bother to close the popup in the reimplemented version
                //   because I'd like to minimize the amount we break content script isolation
                //   it could be done using window.[wrappedJSObject.]Popups and iterating over popupStack
                // we disable its buttons instead, to prevent double submission
                // we do it first because (experimentally) it has issues if done after
                for (let popupBtn of addedElem.querySelectorAll(".popups-buttons input")) {
                    popupBtn.disabled = true;
                }

                document.querySelector("input#edit-submit.form-submit.assessment-nav").click();
            };
        });
    }

    // unanswered questions warning
    modificationHooks.push(function (addedElem) {
        // same CSS selector as they use to put the warning icon
        let unansweredQuestionCount = document.querySelectorAll(".review-page .no-answer-provided, .user-submissions .no-answer-provided").length;
        if (unansweredQuestionCount > 0) {
            // add 17px to the height...
            let cssHeight = addedElem.style.height;
            let regexMatch = /^(\d+)\s*px$/.exec(cssHeight);
            if (regexMatch && regexMatch[1]) {
                addedElem.style.height = (+regexMatch[1] + 17) + "px";
            } else {
                // TODO handle this case: couldn't parse height
            }

            // and add a line of text to the modal
            let textParent = addedElem.querySelector("div.popups-body-inner-has-buttons");
            let textWrapper = document.createElement("span");
            textWrapper.append(...textParent.childNodes); // move existing text into a span
            textParent.appendChild(textWrapper);
            textParent.appendChild(document.createElement("br"));
            textParent.appendChild(createElement("span", ["no-answer-provided"], {
                textContent: "You have " + unansweredQuestionCount + " unanswered question" + (unansweredQuestionCount == 1 ? "." : "s.")
            }));
        }
    });

    // set up the observer
    let popupObserver = new MutationObserver(function (mutationList) {
        for (let mutation of mutationList) {
            for (let addedElem of mutation.addedNodes) {
                if (addedElem.tagName == "DIV" && addedElem.id.startsWith("popups-") && addedElem.classList.contains("popups-box")) {
                    if (addedElem.querySelector(".popups-title .title").textContent == "Confirm Submission") {
                        // this is the modal we're looking for
                        for (let modifyHook of modificationHooks) {
                            modifyHook(addedElem);
                        }
                    }
                }
            }
        }
    });

    popupObserver.observe(document.body, {
        childList: true,
        subtree: false
    });
})();

Logger.debug("Finished loading assessment.js");