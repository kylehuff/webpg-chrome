/* <![CDATA[ */
if (typeof(webpg)=='undefined') { webpg = {}; }
// Enforce jQuery.noConflict if not already performed
if (typeof(jQuery)!='undefined') { var jq = jQuery.noConflict(true); }

/*
    This file is loaded with each new page request and handles setting up
    the required structure(s) for parsing/modifying page content.
*/

/*
   Class: webpg.overlay
    This class implements the overlay/content-script for the extension.
    It is loaded with each new page request and handles setting up
    the required structure(s) for parsing/modifying page content.
*/
webpg.overlay = {

    /*
        Function: init
            This function is called when a new window is created. It sets the preferences
            and calls the parsing functions.

        Parameters:
            aEvent - <event> The window event
    */
    init: function(aEvent) {
        webpg.doc = (aEvent) ?
            aEvent.originalTarget : document;

        webpg.overlay.insert_target = null;
        webpg.overlay.block_target = null;

        document.addEventListener("contextmenu", webpg.overlay.contextHandler, true);

        // Setup a listener for making changes to the page
        webpg.utils._onRequest.addListener(webpg.overlay._onRequest);

        // Check if inline formatting is enabled and setup
        //  required parsers
        webpg.utils.sendRequest({
            msg: "decorate_inline" },
            function(response) {
                if (response.result.decorate_inline == "true") {
                    if (webpg.utils.detectedBrowser['vendor'] == "mozilla") {
                        // Begin parsing the document for PGP Data
                        gBrowser.addEventListener("DOMContentLoaded",
                            function(aEvent) { webpg.inline.init(webpg.doc) }, false);
                    } else if (webpg.utils.detectedBrowser['product'] == "chrome") {
                        webpg.inline.init(document);
                    }
                }
            }
        );
    },


    /*
        Function: _onRequest
            Provides the document listeners for receiving events

        Parameters:
            request - <obj> The request object
            sender  - <obj> The sender (tab/page) of the request
            sendResponse - <func> The function to execute with the
                response as the parameter
    */
    _onRequest: function(request, sender, sendResponse) {
        var response = null;
        if (request.msg == "log") {
            console.log("Remote log request recieved; ", request.data);
        }
        if (request.msg == "resizeiframe"){
            var iframe = webpg.utils.getFrameById(request.iframe_id)
            if (iframe) {
                if (request.width)
                    iframe.style.width = width + "px";
                var height = request.height;
                iframe.height = height + "px";
                response = "resized to: " + height + " x " + request.width + "; thanks..";
            }
            if (request.scrollTop) {
                if (iframe) {
                    var pos = iframe.offsetTop - 10;
                    var body = (webpg.utils.detectedBrowser['vendor'] == "mozilla") ?
                        content.document.body : "html,body";
                    jq(body).animate({scrollTop: pos}, 1);
                }
            }
        } else if (request.msg == "removeiframe"){
            if (request.iframe_id) {
                var iframe = document.getElementById(request.iframe_id);
                if (webpg.utils.detectedBrowser['vendor'] == "mozilla")
                    content.document.body.removeChild(iframe);
                else if (webpg.utils.detectedBrowser['product'] == "chrome")
                    document.body.removeChild(iframe);
            }
        } else if (request.msg == "insertEncryptedData") {
            if (webpg.overlay.insert_target != null) {
                webpg.overlay.insert_target.value = request.data;
            }
            if (request.iframe_id) {
                webpg.overlay._onRequest({"msg": "removeiframe",
                    "iframe_id": request.iframe_id});
            }
        } else if (request.msg == "insertPublicKey") {
            if (webpg.overlay.insert_target != null) {
                webpg.overlay.insert_target.value = request.data;
            }
            if (request.iframe_id) {
                webpg.overlay._onRequest({"msg": "removeiframe",
                    "iframe_id": request.iframe_id});
            }
        } else if (request.msg == "insertSignedData") {
            if (webpg.overlay.insert_target != null) {
                var ndata = "";
                if (request.pre)
                    ndata = request.pre + "\n";
                ndata += request.data;
                if (request.post)
                    ndata += "\n" + request.post;
                webpg.overlay.insert_target.value = ndata;
            }
        } else if (request.msg == "insertDecryptedData") {
            if (webpg.overlay.insert_target != null) {
                if (!request.decrypt_status.block_type)
                    request.decrypt_status.block_type = (request.block_type) ? request.block_type : webpg.constants.PGPBlocks.PGP_SIGNED_MSG;
                if (request.decrypt_status.error)
                    request.decrypt_status.original_text = request.original_text;
                if (!request.decrypt_status.error &&
                    request.decrypt_status.signatures.hasOwnProperty("0"))
                    request.decrypt_status.block_type = webpg.constants.PGPBlocks.PGP_SIGNED_MSG;
                else if (!request.decrypt_status.error)
                    request.decrypt_status.block_type = webpg.constants.PGPBlocks.PGP_ENCRYPTED;
                results_frame = webpg.inline.addResultsReplacementFrame(webpg.overlay.insert_target);
                if (!request.decrypt_status.original_text)
                    request.decrypt_status.original_text = request.original_text;
                var params = {
                    'msg': "sendtoiframe",
                    'block_type': request.decrypt_status.block_type,
                    'target_id': results_frame.id,
                    'verify_result': request.decrypt_status,
                    'message_event': request.message_type,
                    'message_type': "encrypted_message",
                    'noninline': true
                }
                if (webpg.utils.detectedBrowser['vendor'] == "mozilla")
                    webpg.utils.sendRequest(params);
                else
                    results_frame.onload = function() {
                        webpg.utils.sendRequest(params);
                    }
            }
        } else if (request.msg == "openKeySelectionDialog") {
            webpg.overlay.block_target = true;
            var target = webpg.overlay.insert_target;
            if (request.dialog_type == "import")
                var iframe = webpg.inline.addDialogFrame(380, 810);
            else
                var iframe = webpg.inline.addDialogFrame();

            if (webpg.utils.detectedBrowser['vendor'] == "mozilla")
                content.document.body.appendChild(iframe);
            else if (webpg.utils.detectedBrowser['product'] == "chrome")
                document.body.appendChild(iframe);

            var theURL = webpg.utils.resourcePath + "dialog.html?dialog_type="
                + request.dialog_type;
            if (request.dialog_type == "encrypt")
                theURL += "&encrypt_data=" + escape(request.data);
            if (request.dialog_type == "import")
                theURL += "&import_data=" + escape(request.data);

            if (webpg.utils.detectedBrowser['vendor'] == "mozilla")
                iframe.contentWindow.location.href = theURL;
            else if (webpg.utils.detectedBrowser['product'] == "chrome")
                iframe.src = theURL;

            iframe.style.marginTop = "";
            iframe.style.marginLeft = "";
            var scrollY = (webpg.utils.detectedBrowser['vendor'] == "mozilla") ?
                content.window.scrollY : window.scrollY;
            var posY = scrollY + (jq(iframe).innerHeight()
                    / 3);
            var posX = (window.outerWidth
                    / 3) - 100;
            jq(iframe).animate({"top": window.scrollY}, 1, function() {
                jq(iframe).animate({"top": posY}, 1);
                jq(iframe).animate({"left": posX}, 1);
            });
            
            // the sendResult event is for communicating with the iframe
            //  from firefox; Google Chrome/Chromium uses the
            //  chrome.extension.sendRequest method.
            iframe.addEventListener("sendResult", function(e) {
                if (request.dialog_type == "encrypt") {
                    response = webpg.plugin.gpgEncrypt(e.detail.data,
                        e.detail.recipients, 0);
                    if (!response.error && (target.type == "textarea" || target.type == "text"))
                        target.value = response.data;
                    else
                        console.log(response);
                } else if (request.dialog_type == "export") {
                    exported_items = "";
                    for (var idx in e.detail.recipients) {
                        exported_items += webpg.plugin.
                            gpgExportPublicKey(e.detail.recipients[idx]).result
                            + "\n";
                    }
                    if (target.type == "textarea" || target.type == "text")
                        target.value = exported_items;
                } else if (request.dialog_type == "import") {
                    console.log(e.detail);
                }
                webpg.overlay.block_target = false;
                content.document.body.removeChild(iframe);
            });
        } else if (request.msg == "onContextCommand") {
            webpg.overlay.onContextCommand(null, request.action, sender);
        }
    },

    /*
        Function: contextHandler
            The receiver for all context events

        Parameters:
            event - <evt> The context event
    */
    contextHandler: function(event) {
        context_menuitems = {};
        if (!webpg.overlay.block_target)
            webpg.overlay.insert_target = event.target;
        var s = webpg.utils.getSelectedText();
        var selection = (s.selectionText) ? s.selectionText : "";
        block_type = selection.match(/^\s*?(-----BEGIN PGP.*)/gi);
        if (selection.length > 0 && block_type && block_type[0] ==
            webpg.constants.PGPTags.PGP_KEY_BEGIN) {
                context_menuitems['import'] = true;
        } else if (selection.length > 0 && block_type && block_type[0] ==
            webpg.constants.PGPTags.PGP_ENCRYPTED_BEGIN) {
                context_menuitems['decrypt'] = true;
        } else if (selection.length > 0 && (block_type && block_type[0] ==
            webpg.constants.PGPTags.PGP_SIGNED_MSG_BEGIN) ||
            (event.target.value && event.target.value.substr(event.target
            .selectionStart,
            webpg.constants.PGPTags.PGP_SIGNED_MSG_BEGIN.length) ==
            webpg.constants.PGPTags.PGP_SIGNED_MSG_BEGIN)) {
                context_menuitems['verify'] = true;
        } else if (selection.length > 0) {
            // text to sign or encrypt
            if (event.target.value.substr(0, 5) != "-----") {
                context_menuitems['sign'] = true;
                context_menuitems['encrypt'] = true;
            }
        } else if (!selection.length > 0) {
            context_menuitems['paste'] = true;
        }
        webpg.utils.sendRequest({msg: "create_menu", "context_menuitems":
            context_menuitems});
    },

    /*
        Function: onContextCommand
            Handles context and menu requests

        Parameters:
            event - <event> The original event
            action - <str> The action to perform
            sender  - <obj> The sender (tab/page) of the request
    */
	onContextCommand: function(event, action, sender) {
	    selection = webpg.utils.getSelectedText();
	    switch (action) {
       		case webpg.constants.overlayActions.PSIGN:
       		    webpg.utils.sendRequest({"msg": "sign", "selectionData": selection});
                break;

		    case webpg.constants.overlayActions.VERIF:
		        webpg.utils.sendRequest({"msg": "verify",
		            "message_event": "context", "selectionData": selection},
                    function(response) {
                        if (response.result.signatures && response.result.data)
                            blockType = webpg.constants.PGPBlocks.PGP_SIGNED_MSG;
                        else
                            blockType = webpg.constants.PGPBlocks.PGP_ENCRYPTED;
                        response.result.original_text = selection.selectionText;
                        webpg.overlay._onRequest({
                            'msg': "insertDecryptedData",
                            'block_type': blockType,
                            'decrypt_status': response.result,
                            'message_event': 'context',
                            'original_text': selection.selectionText
                         });
                    });
        		break;

		    case webpg.constants.overlayActions.CRYPT:
                webpg.overlay._onRequest({'msg': 'openKeySelectionDialog',
                    'data': selection.selectionText,
                    'dialog_type': 'encrypt'
                });
                break;

		    case webpg.constants.overlayActions.DECRYPT:
		        webpg.utils.sendRequest({
                    // WebPG found a PGP MESSAGE, but it could be a signed. Lets gpgVerify first
                    'msg': 'verify',
                    'data': selection.selectionText,
                    'message_event': 'context'},
                    function(response) {
                        if (response.result.signatures && response.result.data)
                            blockType = webpg.constants.PGPBlocks.PGP_SIGNED_MSG;
                        else
                            blockType = webpg.constants.PGPBlocks.PGP_ENCRYPTED;
                        response.result.original_text = selection.selectionText;
                        webpg.overlay._onRequest({
                            'msg': "insertDecryptedData",
                            'block_type': blockType,
                            'decrypt_status': response.result,
                            'message_event': 'context',
                            'original_text': selection.selectionText
                         });
                    }
                );
                break;

		    case webpg.constants.overlayActions.IMPORT:
                webpg.overlay._onRequest({'msg': 'openKeySelectionDialog',
                    'dialog_type': 'import',
                    'data': selection.selectionText
                });
//                webpg.utils.sendRequest({"msg": "doKeyImport",
//                    "data": selection.selectionText }, function(response) {
//                        var import_status = response.result.import_status;
//                        var msg = "Public Keys Considered: " + import_status.considered +
//                        "\nPublic Keys Imported: " + import_status.imported +
//                        "\nPublic Keys - \n\n";
//                        for (var pubkey in import_status.imports) {
//                            msg += "  Key ID: " + import_status.imports[pubkey].fingerprint.substr(-6) +
//                                "\n  Status: ";
//                            var status = (import_status.imports[pubkey].status == "1") ?
//                                "Imported" : (import_status.imports[pubkey].status == "0") ?
//                                "Already in Public Keyring" : (import_status.imports[pubkey].status == "6") ?
//                                "Updated Public Key" : "Unknown";
//                            msg += status + "\n\n";
//                        }
//                        alert(msg);
//                    }
//                );
                break;

		    case webpg.constants.overlayActions.EXPORT:
		        webpg.utils.sendRequest({"msg": "enabled_keys"}, function(response) {
		            var enabled_keys = response.result;
		            if (enabled_keys.length > 1) {
                        webpg.overlay._onRequest({'msg': 'openKeySelectionDialog',
                            'dialog_type': 'export'
                        });
		            } else {
		                webpg.utils.sendRequest({"msg": "export", "keyid": enabled_keys[0]},
		                function(pubkey) {
                            webpg.overlay._onRequest({msg: 'insertPublicKey', 'data': pubkey.result});
                        });
                    }
                });
                break;

		    case webpg.constants.overlayActions.MANAGER:
		        if (webpg.utils.detectedBrowser['vendor'] == "mozilla") {
                    webpg.utils.openNewTab(webpg.utils.resourcePath +
                        "XULContent/options.xul?options_tab=1");
			    } else if (webpg.utils.detectedBrowser['product'] == "chrome") {
                    var url = "options.html?auto_init=true"
                    webpg.utils.openNewTab(webpg.utils.resourcePath + url, sender.tab.index + 1);
                }
			    break;

            case webpg.constants.overlayActions.OPTS:
		        if (webpg.utils.detectedBrowser['vendor'] == "mozilla") {
                    webpg.utils.openNewTab(webpg.utils.resourcePath +
                        "XULContent/options.xul?options_tab=0");
			    } else if (webpg.utils.detectedBrowser['product'] == "chrome") {
                    var url = "key_manager.html?auto_init=true";
                    webpg.utils.openNewTab(webpg.utils.resourcePath + url, sender.tab.index + 1);
                }
			    break;

            case webpg.constants.overlayActions.ABOUT:
		        if (webpg.utils.detectedBrowser['vendor'] == "mozilla") {
                    webpg.utils.openNewTab(webpg.utils.resourcePath +
                        "XULContent/options.xul?options_tab=2");
			    } else if (webpg.utils.detectedBrowser['product'] == "chrome") {
                    var url = "about.html?auto_init=true";
                    webpg.utils.openNewTab(webpg.utils.resourcePath + url, sender.tab.index + 1);
                }
			    break;
        }
	},


    /*
        Function: listenerUnload
            This function unloads then event listener when the window/tab is closed.

        Parameters:
            aEvent - <event> The window event
    */
    listenerUnload: function(aEvent) {
        webpg.initialized = false;
    },

};

if (webpg.utils.detectedBrowser['vendor'] == "mozilla") {
    webpg.appcontent = document.getElementById("appcontent");
    webpg.appcontent.addEventListener("DOMContentLoaded", webpg.overlay.init, true);
} else {
    webpg.overlay.init();
}
/* ]]> */
