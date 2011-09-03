/* Constants */
VERSION = "0.2.32"

/*
   Class: webpg
   This class implements webpg
*/
var webpg = {

/*
    Function: onLoad
        This function is called when a new window is created. It sets the preferences
        and calls the parsing functions.

    Parameters:
        none
*/
    onLoad: function() {

        window.onresize = function(){
            // Check if the iframe has a parent, if so, resize the iframe to fit within
            //  the parent element; otherwise, fit it to the document
            $('.webpg-result-frame').each(function(){
                if ($(this).parent()) {
                    this.style.width = $(this).parent()[0].offsetWidth + "px";
                } else if (this.offsetWidth > document.body.offsetWidth) {
                    this.style.width = document.body.offsetWidth + "px";
                }
            });
        }

        // Setup a listener for making changes to the page
        chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
            if (request.request.msg == "sendtoiframe"){
                if (request.request.cmd == "resizeiframe") {
                    iframe_id = request.request.iframe_id;
                    width = request.request.width;
                    height = request.request.height;
                    iframe = $('#' + iframe_id)[0]
                    iframe.style.width = width + "px";
                    iframe.style.height = height + "px";
                    response = "resized to: " + height + " x " + width + "; thanks..";
                }
            }
        });

        // Check if inline formatting is enabled
        chrome.extension.sendRequest({
            msg: "decorate_inline" },
            function(response) {
                if (response.result.decorate_inline == "true") {
                    // Begin parsing the document for PGP Data
                    webpg.PGPDataSearch();
                }
            }
        );
    },

    PGPTags: {
        PGP_DATA_BEGIN: "-----BEGIN PGP",
	    PGP_KEY_BEGIN: "-----BEGIN PGP PUBLIC KEY BLOCK-----",
	    PGP_KEY_END: "-----END PGP PUBLIC KEY BLOCK-----",
	    PGP_PKEY_BEGIN: "-----BEGIN PGP PRIVATE KEY BLOCK-----",
	    PGP_PKEY_END: "-----END PGP PRIVATE KEY BLOCK-----",
	    PGP_SIGNED_MSG_BEGIN: "-----BEGIN PGP SIGNED MESSAGE-----",
	    PGP_SIGNATURE_BEGIN: "-----BEGIN PGP SIGNATURE-----",
	    PGP_SIGNATURE_END: "-----END PGP SIGNATURE-----",
	    PGP_ENCRYPTED_BEGIN: "-----BEGIN PGP MESSAGE-----",
	    PGP_ENCRYPTED_END: "-----END PGP MESSAGE-----",
    },

/*
    Function: PGPDataSearch
        Parses the document for elements that contain PGP Data blocks.

    Parameters:
        none
*/
    PGPDataSearch: function() {
        $("*:contains('-----BEGIN PGP')", "body:contains('-----BEGIN PGP')")
            .andSelf()
            .contents()
            .filter(function(){
                return this.nodeType == 1;
            })
            .filter(function(){
                if (this.hasOwnProperty("nodeName") && this.nodeName == "TEXTAREA") {
                    if (this.value.indexOf(webpg.PGPTags.PGP_DATA_BEGIN) != -1) {
                        return true
                    }
                } else {
                    if (this.textContent) {
                        if (this.textContent.indexOf(webpg.PGPTags.PGP_DATA_BEGIN) != -1) {
                            item = webpg.PGPDataElementCheck($(this), webpg.PGPTags.PGP_DATA_BEGIN);
                            webpg.PGPDataParse(item[0]);
                        }
                    }
                }
            })
    },

/*
    Function: PGPDataElementCheck
        Searches deep through the children of HTMLElements that contain PGP Blocks
        in order to find the bottom most element.

    Parameters:
        jqElement - a jQuery selector query of an element
*/
    PGPDataElementCheck: function(jqElement) {
        if (jqElement.children().length) {
            children = jqElement.children().filter(":contains('" + webpg.PGPTags.PGP_DATA_BEGIN + "')");
            if (children.length) {
                return webpg.PGPDataElementCheck(children, webpg.PGPTags.PGP_DATA_BEGIN);
            } else {
                if (jqElement[0].textContent.indexOf(webpg.PGPTags.PGP_DATA_BEGIN) != -1) {
                    return jqElement;
                }
            }
        } else {
            return jqElement;
        }
    },

/*
    Function: PGPDataParse
        Parses the matched HTMLelement to separate the PGP data from the
        rest of the data

    Parameters:
        element - The HTML Element that contains the PGP data
*/

    PGPDataParse: function(element) {
        // Build a regex to locate all of the PGP Data chunks for parsing
        BLOCK_REGEX = /^\s*?(-----BEGIN PGP[\s\S]*?-----END PGP(.*?)-----)/gim
        BLOCK_START_REGEX = /^\s*?(-----BEGIN PGP.*)/gi
        BLOCK_END_REGEX = /^\s*?(-----END PGP.*)/gi
        PGP_DATA = []
        innerText = element.innerText;
        textContent = element.textContent;
        if (element.hasOwnProperty("nodeName") && element.nodeName == "TEXTAREA") {
            PGP_DATA = element.value.match(BLOCK_REGEX);
        } else {
            reg_results = BLOCK_REGEX.exec(textContent);
            if (reg_results) {
                PGP_DATA = [reg_results[1].replace(" \n", "\n")];
            }
            if (PGP_DATA.length) {
                if (!PGP_DATA[0].match(/[\n]{2}/)) {
                    // There are no double-newlines in this PGP Data,
                    //  something failed - try the innerText property.
                    second_match = innerText.match(BLOCK_REGEX);
                    if (second_match){
                        PGP_DATA = [second_match[0].replace(" \n", "\n")];
                    }
                }
            }
        }
        for (block in PGP_DATA) {
            block_type = PGP_DATA[block].match(BLOCK_START_REGEX)[0];
            startIndex = textContent.indexOf(webpg.PGPTags.PGP_DATA_BEGIN);
            pretext_str = textContent.substr(0, startIndex);
            endIndex = pretext_str.length + PGP_DATA[block].length;
            posttext_str = textContent.substr(endIndex, textContent.length);
            switch(block_type) {
                case webpg.PGPTags.PGP_KEY_BEGIN:
                    console.log("we found a public key");
                    results_frame = webpg.addResultsFrame(element, pretext_str, posttext_str);
                    block_text = PGP_DATA[block];
                    results_frame.onload = function(){
                        chrome.extension.sendRequest({
                            msg: "sendtoiframe",
                            block_type: "public_key",
                            target_id: results_frame.id,
                            original_text: block_text}
                        );
                    };
                    break;
                case webpg.PGPTags.PGP_PKEY_BEGIN:
                    console.log("we found a private key, which is scary when you think about it... exiting");
                    break;
                case webpg.PGPTags.PGP_SIGNED_MSG_BEGIN:
                    // check for the required PGP BLOCKS
                    if (PGP_DATA[block].indexOf(webpg.PGPTags.PGP_DATA_BEGIN) != -1 &&
                        PGP_DATA[block].indexOf("\n" + webpg.PGPTags.PGP_SIGNATURE_BEGIN) != -1 &&
                        PGP_DATA[block].indexOf("\n" + webpg.PGPTags.PGP_SIGNATURE_END) != -1 ) {
                        console.log("we found a signed message", element.nodeName);
                    } else {
                        console.log("we found an incomplete signed message");
                        return
                    }
                    var results_frame = webpg.addResultsFrame(element, pretext_str, posttext_str);
                    cipher = PGP_DATA[block];
                    chrome.extension.sendRequest({
                        msg: 'decrypt',
                        data: cipher},
                        function(response) {
                            if (!response.result.error) {
                                chrome.extension.sendRequest({
                                    msg: "sendtoiframe",
                                    block_type: "signed_message",
                                    target_id: results_frame.id,
                                    verify_result: response.result}
                                 );
                            } else {
                                $(results_frame).hide();
                                $(element).children(".original").show();
                                $(element).children(".pretext, .postext").hide();
                                console.log("error processing signed message", response.result);
                            }
                        }
                    );
                    break;
                case webpg.PGPTags.PGP_SIGNATURE_BEGIN:
                    // This should never be reached, because our REGEX would
                    //  normally catch both the text, and the detached sig'
                    console.log("we found a detached signature, but we don't have the file - exiting");
                    break;
                case webpg.PGPTags.PGP_ENCRYPTED_BEGIN:
                    console.log("we found an encrypted or signed message");
                    var results_frame = webpg.addResultsFrame(element, pretext_str, posttext_str);
                    cipher = PGP_DATA[block];
                    chrome.extension.sendRequest({
                        msg: 'decrypt',
                        data: cipher,
                        target_id: results_frame.id },
                        function(response) {
                            chrome.extension.sendRequest({
                                msg: 'sendtoiframe',
                                block_type: "signed_message",
                                target_id: results_frame.id,
                                verify_result: response.result}
                            );
                        }
                    );
                    break;
            }
        }
    },

/*
    Function: addResultsFrame
        Creates the results container(s) and iframe for the inline formatting

    Parameters:
        element - The HTML element that contains the PGP Data
        pretext_str - A string of data that preceeds the PGP Data block
        posttext_str - A string of data that proceeds the PGP Data block
*/
    addResultsFrame: function(element, pretext_str, posttext_str){
        var iframe = document.createElement("iframe");
        var id = (new Date()).getTime();
        iframe.id = id;
        iframe.className = "webpg-result-frame"
        iframe.scrolling = "no";
        iframe.frameBorder = "none";
        iframe.style.position = "relative";
        iframe.style.borderRadius = "6px";
        iframe.style.boxShadow = "2px 2px 2px #000";
        iframe.style.width = "100%";
        iframe.style.top = "0";
        iframe.style.backgroundColor = "#efefef";
        original_text = document.createElement("div");
        original_text.className = "original";
        original_text.style.display = "none";
        original_text.innerHTML = element.innerHTML;
        pretext = document.createElement("div");
        pretext.innerHTML = pretext_str
        pretext.className = "pretext";
        element.innerHTML = "";
        element.appendChild(pretext);
        element.appendChild(original_text);
        iframe.src = chrome.extension.getURL("webpg_results.html") + "?id=" + id;
        element.appendChild(iframe);
        posttext = document.createElement("div");
        posttext.innerHTML = posttext_str
        posttext.className = "posttext";
        element.appendChild(posttext);
        return iframe;
    },

/*
    Function: listenerUnload
        This function unloads then event listener when the window/tab is closed.

    Parameters:
        none
*/
    listenerUnload: function( event ) {
        webpg.initialized = false;
    },

};


webpg.onLoad();
