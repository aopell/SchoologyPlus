// Firefox patch for assessment submit confirmation
(function () {
    if (getBrowser() == "Firefox") {
        let popupObserver = new MutationObserver(function (mutationList) {
            for (let mutation of mutationList) {
                for (let addedElem of mutation.addedNodes) {
                    if (addedElem.tagName == "DIV" && addedElem.id.startsWith("popups-") && addedElem.classList.contains("popups-box")) {
                        if (addedElem.querySelector(".popups-title .title").textContent == "Confirm Submission") {
                            // this is the modal we're looking for
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
                        }
                    }
                }
            }
        });

        popupObserver.observe(document.body, {
            childList: true,
            subtree: false
        });
    }
})();