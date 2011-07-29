/* Constants */
VERSION = "0.0.1b"

/*
   Class: webpg
   This class implements webpg
*/
var webpg = {

    /*
    Function: onLoad
    This function is called when a new chrome window is created. It sets the GPG preferences and
    */
    onLoad: function() {
        this._version = VERSION;
        chrome.extension.sendRequest({msg: 'enabled'}, function(response) { webpg.init(response); });
    },

    init: function(response) {
        var webpg_enabled = response.result.enabled;
        if (webpg_enabled == "false" || webpg_enabled == false 
            || webpg_enabled == ''
            || webpg_enabled == null) {
            console.log("webpg is not enabled, exiting");
            return false;
        }

        this.initialized = true;

        window.onresize = function(){
            $('.webpg-result-frame').each(function(){
                this.style.width = document.body.offsetWidth + "px";
            });
        }

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
                if (sendResponse) {
                    sendResponse({'result': response});
                }
            }
        });

        // Begin parsing the document for PGP Data
        webpg.PGPDataSearch();

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

    actionBadge: null,

    PGPDataSearch: function() {
        $('*', 'body')
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
                            return true
                        }
                    }
                }
            }).each(function(){
                // Build a regex to locate all of the PGP Data chunks for parsing
                BLOCK_REGEX = /-----BEGIN PGP[\s\S]*?-----END PGP(.*?)-----/gim
                BLOCK_START_REGEX = /-----BEGIN PGP.*/gi
                if (this.hasOwnProperty("nodeName") && this.nodeName == "TEXTAREA") {
                    PGP_DATA = this.value.match(BLOCK_REGEX);
                } else {
                    PGP_DATA = this.textContent.match(BLOCK_REGEX);
                }
                for (block in PGP_DATA) {
                    block_type = PGP_DATA[block].match(BLOCK_START_REGEX)[0];
                    switch(block_type) {
                        case webpg.PGPTags.PGP_KEY_BEGIN:
                            console.log("we found a public key");
                            results_frame = webpg.addResultsFrame(this);
                            results_frame.onload = function(){
                                chrome.extension.sendRequest({
                                    msg: "sendtoiframe",
                                    block_type: "public_key",
                                    target_id: results_frame.id,
                                    original_text: PGP_DATA[block]}
                                );
                            };
                            break;
                        case webpg.PGPTags.PGP_PKEY_BEGIN:
                            console.log("we found a private key, which is scary when you think about it... exiting");
                            break;
                        case webpg.PGPTags.PGP_SIGNED_MSG_BEGIN:
                            console.log("we found a signed message");
                            var results_frame = webpg.addResultsFrame(this);
                            cipher = PGP_DATA[block];
                            chrome.extension.sendRequest({
                                msg: 'decrypt',
                                data: PGP_DATA[block],
                                target_id: results_frame.id },
                                function(response) {
                                    chrome.extension.sendRequest({
                                        msg: "sendtoiframe",
                                        block_type: "signed_message",
                                        target_id: results_frame.id,
                                        verify_result: response.result}
                                     );
                                }
                            );
                            break;
                        case webpg.PGPTags.PGP_SIGNATURE_BEGIN:
                            // This should never be reached, because our REGEX would
                            //  normally catch both the text, and the detached sig
                            console.log("we found a detached signature, but we don't have the file - exiting");
                            break;
                        case webpg.PGPTags.PGP_ENCRYPTED_BEGIN:
                            console.log("we found an encrypted or signed message");
                            var results_frame = webpg.addResultsFrame(this);
                            cipher = PGP_DATA[block];
                            chrome.extension.sendRequest({
                                msg: 'decrypt',
                                data: PGP_DATA[block],
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
            });
    },

    addResultsFrame: function( obj ){
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
        obj.innerHTML = "";
        iframe.src = chrome.extension.getURL("webpg_results.html") + "?id=" + id;
        element = obj.appendChild(iframe);
        return element;
    },

    /*
    Function: listenerUnload
    This function unloads then event listener when the window/tab is closed.
    */
    listenerUnload: function( event ) {
        webpg.initialized = false;
    },

};


webpg.onLoad();
