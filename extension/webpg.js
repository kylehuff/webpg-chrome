/* Constants */
VERSION = "0.6.0"
PARSED_COUNT = 0;

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

        window.insert_target = null;

        window.onresize = function(){
            // Check if the iframe has a parent, if so, resize the iframe to fit within
            //  the parent element; otherwise, fit it to the document
            $('.webpg-result-frame').each(function(){
                this.style.width = document.body.offsetWidth - 200 + "px";
            });
        }

        // Setup a listener for making changes to the page
        chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
            if (request.msg == "sendtoiframe"){
                if (request.cmd == "resizeiframe") {
                    iframe_id = request.iframe_id;
                    width = document.body.offsetWidth - 200;
                    height = request.height;
                    iframe = $('#' + iframe_id)[0]
                    iframe.style.width = width + "px";
                    iframe.style.height = height + "px";
                    response = "resized to: " + height + " x " + width + "; thanks..";
                }
            } else if (request.msg == "insertEncryptedData") {
                if (window.insert_target != null) {
                    window.insert_target.value = request.data;
                }
            } else if (request.msg == "insertPublicKey") {
                if (window.insert_target != null) {
                    window.insert_target.value = request.data;
                }
            } else if (request.msg == "insertSignedData") {
                if (window.insert_target != null) {
                    if (request.pre)
                        request.data = request.pre + "\n" + request.data
                    if (request.post)
                        request.data += "\n" + request.post
                    window.insert_target.value = request.data;
                }
            } else if (request.msg == "insertDecryptedData") {
                if (window.insert_target != null) {
                    results_frame = webpg.addResultsReplacementFrame(window.insert_target);
                    if (request.decrypt_status.error)
                        request.decrypt_status.original_text = request.original_text;
                    request.decrypt_status.original_text = request.original_text;
                    results_frame.onload = function(block_text){
                        chrome.extension.sendRequest({
                            'msg': "sendtoiframe",
                            'block_type': "encrypted_message",
                            'target_id': results_frame.id,
                            'verify_result': request.decrypt_status,
                            'message_event': "manual",
                            'message_type': "encrypted_message",
                            'noninline': true}
                        );
                    };
                }
            } else if (request.msg == "openKeySelectionDialog") {
                console.log(request);
                window.block_target = true;
                modal_element = document.createElement('div');
                modal_element.style.top = "50%";
                modal_element.style.left = "50%";
                modal_element.style.position = "absolute";
                modal_element.style.backgroundColor = "transparent";
                dialog_element = document.createElement('div');
                dialog_element.id = "ddialog";
                dialog_element.style.position = "relative";
                dialog_element.style.width = "600px";
                dialog_element.style.height = "300px";
                dialog_element.style.marginLeft = "-300px";
                dialog_element.style.marginTop = "-150px";
                dialog_element.style.borderRadius = "12px";
                dialog_element.style.backgroundColor = "#222";
                dialog_element.style.paddingLeft = "4px";
                dialog_element.style.zIndex = "9999";
                dialog_element.style.color = "#fff";
                dialog_element.style.paddingLeft = "0px"
			    keylist = request.keylist;
			    dialog_element.innerHTML = "<div style='font-size: 18px; text-shadow: #555 1px 1px 1px; padding: 4px; margin: 0px; border-radius: 8px 8px 0 0; color: #fff; background-color: #f81; position: relative; width: 592px;'>Select key(s) for Encryption</div>";
			    keylist_div = document.createElement('div');
			    keylist_div.style.overflowY = "auto";
			    keylist_div.style.backgroundColor = "#000";
			    keylist_div.style.height = "80%";
			    keylist_div.style.borderBottom = "#f81 1px solid";
			    formHTML = "<form name='encrypt_to_form' style='padding: 0px; margin: 0px;'><ul style='padding: 0px; margin: 0px;'>";
                for (idx in keylist) {
                    key = keylist[idx];
                    if (key.invalid || key.disabled || key.expired || key.revoked)
                        continue;
                    formHTML += "<li style='list-style-type: none;'> \
                        <input type='checkbox' id='encrypt_to_" + idx + "' name='encrypt_to_list'/\><label for='encrypt_to_" + idx + "' id='lbl-encrypt_to_" + idx + "' class='help-text'>" + key.name + " (" + idx + ")</label></li>";
                }
                keylist_div.innerHTML = formHTML + "</ul></form>";
                dialog_element.appendChild(keylist_div);
                modal_element.addEventListener("encryptData", function(e) {
                    chrome.extension.sendRequest({
                        msg: 'encrypt',
                        data: e.detail.data,
                        recipients: e.detail.recipients },
                        function(response) {
                            if (!response.result.error && (window.insert_target.type == "textarea" ||
                            window.insert_target.type == "text"))
                                window.insert_target.value = response.result.data;
                            else
                                console.log(response.result);
                            window.block_target = false;
                        }
                    );
                })

                dialog_element.innerHTML += "<div style='float:right; padding-top: 2px;'><input type='button' value='Encrypt' style='border-radius: 12px;' name='encrypt_to_submit' onclick=\"encrypt_to_list = []; \
                for (i=0; i<document.forms.encrypt_to_form.encrypt_to_list.length; i++){ \
                    if (document.forms.encrypt_to_form.encrypt_to_list[i].checked == true) { \
                        encrypt_to_list[encrypt_to_list.length] = document.forms.encrypt_to_form.encrypt_to_list[i].id.split('_')[2]; \
                    } \
                }; \
                modal_element = this.parentElement.parentElement.parentElement; \
                var encryptEvent = new CustomEvent('encryptData', { \
	                detail: { \
		                data: '" + escape(request.data) + "', \
		                recipients: encrypt_to_list \
	                } \
                });\
                modal_element.dispatchEvent(encryptEvent); \
                modal_element.style.display = 'none'; document.body.removeChild(modal_element); \
                \"/> \
                <input type='button' value='Cancel' style='border-radius: 12px;' onclick=\"modal = this.parentElement.parentElement.parentElement; modal.style.display = 'none'; document.body.removeChild(modal);\"/></div>";
                modal_element.appendChild(dialog_element);
                document.body.appendChild(modal_element);
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

        document.addEventListener("mousedown", function(event){
            context_menuitems = {};
            if (event.target.type == "textarea" || event.target.type == "text") {
                selection = window.getSelection().toString();
                selectionObject = window.getSelection();
                if (!selection.length > 0) {
                    selection = event.target.value;
                    pre_selection = null;
                    post_selection = null;
                } else {
                    pre_selection = event.target.value.substr(0, event.target.selectionStart);
                    post_selection = event.target.value.substr(event.target.selectionEnd, event.target.value.length);
                }
                block_type = selection.match(/^\s*?(-----BEGIN PGP.*)/gi);
                if (selection.length > 0 && block_type && block_type[0] == webpg.PGPTags.PGP_KEY_BEGIN) {
                    context_menuitems['import'] = {'data': selection};
                } else if (selection.length > 0 && block_type && block_type[0] == webpg.PGPTags.PGP_ENCRYPTED_BEGIN) {
                    context_menuitems['decrypt'] = {'data': selection};
                } else if (selection.length > 0 && (block_type && block_type[0] == webpg.PGPTags.PGP_SIGNED_MSG_BEGIN) ||
                    event.target.value.substr(event.target.selectionStart, webpg.PGPTags.PGP_SIGNED_MSG_BEGIN.length) == webpg.PGPTags.PGP_SIGNED_MSG_BEGIN) {
                    context_menuitems['verify'] = {'data': selection};
                } else if (selection.length > 0) {
                    // text to sign or encrypt
                    if (event.target.value.substr(0, 5) != "-----") {
                        context_menuitems['sign'] = {'data': selection, 'pre': pre_selection, 'post': post_selection};
                        context_menuitems['encrypt'] = {'data': selection, 'pre': pre_selection, 'post': post_selection};
                    }
                } else if (!selection.length > 0) {
                    context_menuitems['paste'] = true;
                }
                if (!window.block_target)
                    window.insert_target = event.target;
            }
            chrome.extension.sendRequest({msg: "create_menu", "context_menuitems" : context_menuitems});
        }, true);

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
        $("*:contains('-----BEGIN PGP')" ) //, "body:contains('-----BEGIN PGP')")
            .andSelf()
            .contents()
            .filter(function(){
                return this.nodeType == 1;
            })
            .filter(function(){
                // Do not process more than 10 inline elements.
                if (PARSED_COUNT > 10)
                    return true;
                if (this.hasOwnProperty("nodeName") && this.nodeName == "TEXTAREA") {
                    if (this.value.indexOf(webpg.PGPTags.PGP_DATA_BEGIN) != -1) {
                        return true;
                    }
                } else {
                    if (this.textContent) {
                        if (this.textContent.indexOf(webpg.PGPTags.PGP_DATA_BEGIN) != -1) {
                            item = webpg.PGPDataElementCheck($(this), webpg.PGPTags.PGP_DATA_BEGIN);
                            if (item.length > 1)
                                return true;
                            webpg.PGPDataParse(item[0]);
                            PARSED_COUNT++;
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
            //console.log(reg_results);
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
                    results_frame.original_text = PGP_DATA[block];
                    results_frame.onload = function(block_text){
                        chrome.extension.sendRequest({
                            msg: "sendtoiframe",
                            block_type: "public_key",
                            target_id: results_frame.id,
                            original_text: results_frame.original_text}
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
                        if (PGP_DATA[block].indexOf(" " + webpg.PGPTags.PGP_SIGNATURE_END) != -1) {
                            console.log("we found a signed message with bad formatting");
                        } else {
                            console.log("we found an incomplete signed message");
                        }
                        return
                    }
                    var results_frame = webpg.addResultsFrame(element, pretext_str, posttext_str);
                    cipher = PGP_DATA[block];
                    chrome.extension.sendRequest({
                        msg: 'verify',
                        data: cipher},
                        function(response) {
                            if (response.result.gpg_error_code == "58" || !response.result.error) {
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
                        // We found a PGP MESSAGE, but it could be a signature. Lets gpgVerify first
                        msg: 'verify',
                        data: cipher,
                        target_id: results_frame.id },
                        function(response) {
                            if (response.result.signatures && response.result.data)
                                type = "signed_message";
                            else
                                type = "encrypted_message";
                            chrome.extension.sendRequest({
                                msg: "sendtoiframe",
                                block_type: type,
                                target_id: results_frame.id,
                                verify_result: response.result}
                             );
                        }
                    );
                    break;

            }
            if (posttext_str.indexOf(webpg.PGPTags.PGP_DATA_BEGIN) != -1){
                webpg.PGPDataSearch();
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
        iframe.style.marginLeft = "85px";
        iframe.style.top = "0";
        iframe.style.backgroundColor = "#efefef";
        original_text = document.createElement("div");
        original_text.className = "original";
        original_text.style.display = "none";
        original_text.innerText = element.innerText;
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
    Function: addResultsReplacementFrame
        Creates a results iframe that replaces the element that contained
        the original PGP data

    Parameters:
        element - The HTML element that contains the PGP Data
*/

    addResultsReplacementFrame: function(element){
        var iframe = document.createElement("iframe");
        var id = (new Date()).getTime();
        iframe.id = id;
        iframe.className = "webpg-result-frame"
        iframe.scrolling = "no";
        iframe.frameBorder = "none";
        iframe.style.position = "relative";
        iframe.style.borderRadius = "6px";
        iframe.style.boxShadow = "2px 2px 2px #000";
        //iframe.style.width = "100%";
        //iframe.style.marginLeft = "85px";
        iframe.style.top = "0";
        iframe.style.backgroundColor = "#efefef";
        original_text = document.createElement("div");
        original_text.className = "original";
        original_text.style.display = "none";
        original_text.innerText = element.innerText;
        iframe.src = chrome.extension.getURL("webpg_results.html") + "?id=" + id;
        //console.log($(element).parent());
        $(element).parent()[0].appendChild(iframe);
        $(element).hide();
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
