/* <![CDATA[ */
if (typeof(webpg)=='undefined') { webpg = {}; }

/*
    Class: webpg.gmail
        Adds WebPG functionality to gmail
*/
webpg.gmail = {

    /*
        Function: setup
            Sets up the required observers and creates instances to reusable objects

        Parameters:
            navDiv - <obj> The navigation div from the gmail interface we will be working with
    */
    setup: function(navDiv) {
        if (navDiv.find("#webpg-action-menu").length < 1) {
            // If we are running Mozilla, inject the CSS file
            if (webpg.utils.detectedBrowser['vendor'] == "mozilla") {
                var sss = Components.classes["@mozilla.org/content/style-sheet-service;1"]
                    .getService(Components.interfaces.nsIStyleSheetService);
                var ios = Components.classes["@mozilla.org/network/io-service;1"]
                    .getService(Components.interfaces.nsIIOService);
                var uri = ios.newURI("chrome://webpg-firefox/skin/gmail_overlay.css", null, null);
                sss.loadAndRegisterSheet(uri, sss.USER_SHEET);
            }

            // Create a persistant reference to the Gmail "Send" button
            this.oSendBtn = navDiv.find('div')
                .contents(':contains("Send")');

            // Create a persistant reference to the Gmail "Save" button
            this.oSaveBtn = navDiv.find('div')
                .contents(':contains("Save")');

            // Create a persistant reference to the Gmail "Discard" button
            this.oDisBtn = navDiv.find('div').contents(':contains("Discard")')
                .first();

            // Replace the "Send" button with our own
            this.oSendBtn.parent().clone().insertBefore(this.oSendBtn.parent())
                .attr('id', 'webpg-send-btn').click(this.overrideSend);

            // Hide the original "Send" button
            this.oSendBtn.parent().hide();

            // Replace the "Save" (draft) button with our own
            this.oSaveBtn.parent().clone().insertBefore(this.oSaveBtn.parent())
                .attr('id', 'webpg-save-btn').click(this.overrideSave);

            // Hide the original "Save" button
            this.oSaveBtn.parent().hide();

            // Add the WebPG Options list to the actions menu
            this.addSendOptionBtn(navDiv);

            // Add a listener to refresh the button text if the navigation
            //  div or it's children are modified.
            navDiv[0].addEventListener("DOMSubtreeModified", this.refreshText);

            var canvasFrame = (webpg.gmail.getCanvasFrame().length) ?
                webpg.gmail.getCanvasFrame().contents() :
                (jQuery(window.document).contents().length > 1) ?
                jQuery(jQuery(window.document).contents()[1]) :
                jQuery(window.document).contents();

            // Watch for when the mouse exits the TO, CC and BCC fields so we
            //  can check the recipients listed therein
            canvasFrame.find(
                'textarea[name="to"], textarea[name="cc"], textarea[name="bcc"]'
                ).blur(function(e) {
                    if (webpg.gmail.action == 1 || webpg.gmail.action == 3)
                        webpg.gmail.checkRecipients();
                });

        }
    },

    /*
        Function: getCanvasFrame
            Retrieves the gmail UI message editor iframe
    */
    getCanvasFrame: function() {
        if (webpg.utils.detectedBrowser['vendor'] == "mozilla")
            return jQuery(content.document.getElementById("canvas_frame"))
                .length > 0 ? jQuery(content.document.getElementById("canvas_frame")) :
                jQuery(content.document);
        else
            return jQuery('#canvas_frame').length > 0 ?
                jQuery('#canvas_frame').contents() : jQuery(document);
    },

    /*
        Function: getCanvasFrame
            Retrieves the gmail UI message editor document
    */
    getCanvasFrameDocument: function() {
        var cd =  webpg.gmail.getCanvasFrame()[0].contentDocument;
        
        return typeof(cd)!='undefined' ? cd :
            (webpg.utils.detectedBrowser['vendor'] == "mozilla") ? content.document
                : document;
    },

    /*
        Function: refreshText
            Refresh the button text and style to reflect the present state

        Parameters:
            e - <event> The HTML Event dispatched
    */
    refreshText: function(e) {
        if (webpg.utils.detectedBrowser['vendor'] == "mozilla")
            e.srcElement = e.target;
        if (e.srcElement.getAttribute && e.srcElement.getAttribute("role") == "button") {
            if (e.srcElement.textContent && e.srcElement.textContent.length > 0) {
                var btnType = (e.srcElement.textContent.search("Save") == 0 &&
                    e.srcElement.id.search("webpg") == -1) ?
                    "Save" : "";
                var prevSibling = e.srcElement.previousSibling;
                if (btnType.length > 0 && prevSibling && prevSibling.textContent &&
                prevSibling.textContent != e.srcElement.textContent) {
                    prevSibling.textContent = e.srcElement.textContent;
                    prevSibling.setAttribute("class", e.target.getAttribute("class"));
                }
            }
        }
    },

    /*
        Function: overrideSave
            Modifies the behavior of the gmail Save button to perform certains tasks when saved
    */
    overrideSave: function() {
        var navDiv = webpg.gmail.getCanvasFrame().contents().find(
            'div[class="dW E"] > div > div'
        ).contents(':contains("Send")').parent().parent()
        var oSaveBtn = navDiv.find('div')
            .contents(':contains("Save")').parent().filter("[id!=webpg-save-btn]");
        webpg.gmail.emulateMouseClick(oSaveBtn[0]);
    },

    /*
        Function: overrideSend
            Modifies the behavior of the gmail SEND button to perform certain tasks prior to sending the email
    */
    overrideSend: function() {
        // Retrieve the contents of the message
        var message = webpg.gmail.getContents(webpg.gmail.getCanvasFrame().
            contents().find('form'));

        webpg.gmail.removeStatusLine();
        
        console.log(webpg.gmail.action);

        // Cycle through the available actions until we find the selected
        //  action
        switch (webpg.gmail.action) {

            case 0:
                // No webpg action was selected by the user, simply send
                //  the email without modifications
                webpg.gmail.emulateMouseClick(webpg.gmail.oSendBtn[0]);
                break;

            case 1:
                // Standard GnuPG Encryption was selected; verify the
                //  recipients are valid, encrypt the plaintext and
                //  populate the editor with the result and send
                //  the email.
                webpg.gmail.checkRecipients(function(recipKeys) {
                    var users = webpg.gmail.getRecipients();
                    if (message.search("-----BEGIN PGP") != 0) {
                        webpg.utils.sendRequest({'msg': 'encrypt',
                            'data': message,
                            'recipients': users
                    }, function(response) {
                        if (!response.result.error && response.result.data) {
                            webpg.gmail.setContents(webpg.gmail.getCanvasFrame().
                                contents().find('form'),
                                response.result.data
                            );
                            webpg.gmail.emulateMouseClick(webpg.gmail.oSendBtn[0]);
                        } else {
                            var result = response.result;
                            webpg.gmail.handleFailure(result, recipKeys);
                        }
                       });
                    }
                });
                break;

           case 2:
                // Standard GnuPG Sign was selected; sign the plaintext
                //  and populate the editor with the result and send
                //  the email.
                if (message.search("-----BEGIN PGP") != 0) {
                    webpg.utils.sendRequest({'msg': 'sign',
                        'selectionData': {
                            'selectionText': message
                        }
                    }, function(response) {
                        if (!response.result.error && response.result.data) {
                            webpg.gmail.setContents(webpg.gmail.getCanvasFrame().
                                contents().find('form'),
                                response.result.data
                            );
                            webpg.gmail.emulateMouseClick(webpg.gmail.oSendBtn[0]);
                        } else {
                            console.log(response);
                        }
                    });
                }
                break;

            case 3:
                // GnuPG Encrypt & Sign was selected; verify the
                //  recipients are valid, encrypt+sign the plaintext,
                //  populate the editor with the result and send
                //  the email.
                webpg.gmail.checkRecipients(function(recipKeys) {
                    var users = webpg.gmail.getRecipients();
                    if (message.search("-----BEGIN PGP") != 0) {
                        webpg.utils.sendRequest({'msg': 'encryptSign',
                            'data': message,
                            'recipients': users
                    }, function(response) {
                        //console.log(response);
                        if (!response.result.error && response.result.data) {
                            webpg.gmail.setContents(webpg.gmail.getCanvasFrame().
                                contents().find('form'),
                                response.result.data
                            );
                            webpg.gmail.emulateMouseClick(webpg.gmail.oSendBtn[0]);
                        } else {
                            var result = response.result;
                            webpg.gmail.handleFailure(result, recipKeys);
                        }
                       });
                    }
                });
                break;

            case 4:
                //  Symmetric encryption was selected; Encrypt the plaintext,
                //  populate the editor with the result and send
                //  the email.
                if (message.search("-----BEGIN PGP") != 0) {
                    webpg.utils.sendRequest({'msg': 'symmetricEncrypt',
                        'data': message
                }, function(response) {
                    if (!response.result.error && response.result.data) {
                        webpg.gmail.setContents(webpg.gmail.getCanvasFrame().
                            contents().find('form'),
                            response.result.data
                        );
                        webpg.gmail.emulateMouseClick(webpg.gmail.oSendBtn[0]);
                    } else {
                        var result = response.result;
                        webpg.gmail.handleFailure(result);
                    }
                   });
                }
                break;

            default:
                // No webpg action was selected by the user, simply send
                //  the email without modifications
                webpg.gmail.emulateMouseClick(webpg.gmail.oSendBtn[0]);
                break;

        }
    },

    /*
        Function: checkRecipients
            Checks the keyring for the required keys when performing GnuPG methods that require them

        Parameters:
            callback - <func> The function to execute when completed
    */
    checkRecipients: function(callback) {
        webpg.gmail.removeStatusLine();
        var users = webpg.gmail.getRecipients();
        webpg.utils.sendRequest({'msg': 'getNamedKeys',
            'users': users
        }, function(response) {
            var recipKeys = {};
            var keys = response.result.keys;
            for (var u in keys) {
                for (var k in keys[u]) {
                    recipKeys[u] = keys[u][k];
                }
            }
            var notAllKeys = false;
            var missingKeys = [];
            for (var u in users) {
                if (!(users[u] in recipKeys)) {
                    notAllKeys = true;
                    missingKeys.push(users[u]);
                }
            }
            if (notAllKeys) {
                var status = _("You do not have any keys for") + " " +
                    missingKeys.toString().
                    replace(/((,!$))/g, " " + _("or") + " ").replace(",", "");
                webpg.gmail.displayStatusLine(status);
            } else {
                if (callback)
                    callback(recipKeys);
            }
        });
    },

    /*
        Function: displayStatusLine
            Adds a status message line to the gmail UI to display information

        Parameters:
            message - <str> The message to display
    */
    displayStatusLine: function(message) {
        var canvasFrame = (webpg.gmail.getCanvasFrame().length) ?
            webpg.gmail.getCanvasFrame().contents() :
            (jQuery(window.document).contents().length > 1) ?
            jQuery(jQuery(window.document).contents()[1]) : jQuery(window.document).contents();
        var status_line = canvasFrame.find(".fN");
        canvasFrame.find(".webpg-status-line").remove();
        var status_msg = webpg.gmail.getCanvasFrameDocument()
            .createElement("span");
        status_msg.setAttribute("class", "webpg-status-line");
        jQuery(status_msg).html("WebPG: " + webpg.utils.escape(message));
        jQuery(status_msg).insertBefore(status_line.children(0));
        canvasFrame.find('.keylink').click(function() {
            webpg.utils.sendRequest({
                'msg': "newtab",
                'url': this.id,
                }
            );
        });
    },

    /*
        Function: removeStatusLine
            Removes the status message line from the gmail UI
    */
    removeStatusLine: function() {
        var canvasFrame = (webpg.gmail.getCanvasFrame().length) ?
            webpg.gmail.getCanvasFrame().contents() :
            (jQuery(window.document).contents().length > 1) ?
            jQuery(jQuery(window.document).contents()[1]) : jQuery(window.document).contents();
        var status_line = canvasFrame.find(".fN");
        canvasFrame.find(".webpg-status-line").remove();
    },

    /*
        Function: handleFailure
            Determines the details of a GnuPG operation failure and adds status message to the UI

        Parameters:
            result - <obj> The result of the GnuPG operation that failed
            recipKeys - <obj> The recipient keys found (if any)
    */
    handleFailure: function(result, recipKeys) {
        if (result.gpg_error_code == "107") {
            var status = result.error_string + ": " +
                result.data + "; " + _("You have more than 1 public key matching that address");
            webpg.gmail.displayStatusLine(status);
        } else if (typeof(result.data)!='undefined' && result.data.length > 0) {
            var invKeyFP = result.data;
            var shortKey = invKeyFP.substr(-16);
            var status = "";
            var url = webpg.utils.resourcePath +
                "key_manager.html?auto_init=true" +
                "&tab=-1&openkey=" + shortKey;
            for (var r in recipKeys) {
                var fp = recipKeys[r].fingerprint;
                if (fp == invKeyFP) {
                    status = _("The Key for") + " " + r + " " +
                    _("is invalid") + " [" + result.
                    error_string + "] " +
                    "&nbsp;&nbsp;(<a href='#' class=" +
                    "'keylink' " + "id='" + url + "'" +
                    " title='" + _("Open the Key Manager") + "'>" + shortKey +
                    "</a>)";
                    webpg.gmail.displayStatusLine(status);
                }
            }
        } else {
            var status = result.error_string;
            webpg.gmail.displayStatusLine(status);
        }
    },

    /*
        Function: emulateMouseClick
            Creates an synthetic mouseclick event for activating the standard gmail UI buttons

        Parameters:
            button - <obj> The target button to click
    */
    emulateMouseClick: function(button) {
        evt = webpg.gmail.getCanvasFrameDocument().createEvent("MouseEvents");
        evt.initMouseEvent("mousedown", true, true, window, 0, 0, 0, 0, 0,
            false, false, false, false, 0, null);
        button.dispatchEvent(evt);
        evt = webpg.gmail.getCanvasFrameDocument().createEvent("MouseEvents");
        evt.initMouseEvent("mouseup", true, true, window, 0, 0, 0, 0, 0,
            false, false, false, false, 0, null);
        button.dispatchEvent(evt)
    },

    /*
        Function: getRecipients
            Retrieves the recipients in the TO, CC and BCC fields
    */
    getRecipients: function() {
        var canvasFrame = (webpg.gmail.getCanvasFrame().length) ?
            webpg.gmail.getCanvasFrame().contents() :
            (jQuery(window.document).contents().length > 1) ?
            jQuery(jQuery(window.document).contents()[1]) : jQuery(window.document).contents();
        var emails = canvasFrame.find('textarea[name="to"]').val()
            .replace(', ', ',').split(',');
        if (canvasFrame.find('textarea[name="cc"]').val().length)
            emails = emails.concat(canvasFrame
                .find('textarea[name="cc"]').val().replace(', ', ',')
                .replace(' ', '').split(','))
        if (canvasFrame.find('textarea[name="bcc"]').val().length)
            emails = emails.concat(canvasFrame
                .find('textarea[name="bcc"]').val().replace(', ', ',')
                .replace(' ', '').split(','))
        var users = [];
        for (var r in emails) {
            if (emails[r].length > 1)
                users.push(emails[r].replace(/((.*)<(.*)>)/g,'$3'));
        }
        return users;
    },

    /*
        Function: addSendOptionBtn
            Creates the WebPG actions menu and adds it to the gmail UI

        Parameters:
            navDiv - <obj> The navigation div from the gmail interface we will be working with
    */
    addSendOptionBtn: function(navDiv) {

        // Set the default action according to the user preference
        webpg.gmail.action = (webpg.gmail.sign_gmail=='true') ? 2 : 0;

        if (navDiv.find('#webpg-send-btn').length > 1)
            navDiv.find('#webpg-send-btn').remove();
        if (navDiv.find('#webpg-save-btn').length > 1)
            navDiv.find('#webpg-save-btn').remove();

        var sendBtn = navDiv.find('div').contents(':contains("Send")').first();
        sendBtn.parent().show();
        var saveBtn = navDiv.find('div').contents(':contains("Save")').first();
        saveBtn.parent().show();
        var disBtn = navDiv.find('div').contents(':contains("Discard")').first();
        disBtn.parent().show();

        var esBtn = disBtn.parent().clone().insertBefore(saveBtn.first().
            parent()).attr('id', 'webpg-action-menu').show();

        var sign_gmail = (webpg.preferences.sign_gmail.get() == 'true');

        var action_menu = '' +
'<span id="webpg-current-action">' +
    '<img src="' + webpg.utils.escape(webpg.utils.resourcePath) + "skin/images/webpg-48.png" + '" width=16 height=16/>' +
    'WebPG' +
'</span>' +
'&nbsp;' +
'<span class="webpg-action-list-icon">' +
    '&nbsp;' +
'</span>' +
'<span>' +
'<ul class="webpg-action-list">' +
    '<li class="webpg-action-btn" id="webpg-crypt-btn">' +
        '<a href="#">' +
            '<img src="' + webpg.utils.escape(webpg.utils.resourcePath) + 'skin/images/badges/stock_encrypted.png" class="webpg-li-icon"/>' +
            _('Encrypt') +
        '</a>' +
    '</li>' +
    '<li class="webpg-action-btn" id="webpg-sign-btn">' +
        '<a href="#">' +
            '<img src="' + webpg.utils.escape(webpg.utils.resourcePath) + 'skin/images/badges/stock_signature-ok.png" class="webpg-li-icon"/>' +
            _('Sign only') +
        '</a>' +
    '</li>' +
    '<li class="webpg-action-btn" id="webpg-scrypt-btn">' +
        '<a href="#">' +
            '<img src="' + webpg.utils.escape(webpg.utils.resourcePath) + 'skin/images/badges/stock_encrypted_signed.png" class="webpg-li-icon"/>' +
            _('Sign and Encrypt') +
        '</a>' +
    '</li>' +
    '<li class="webpg-action-btn" id="webpg-symmetric-btn">' +
        '<a href="#">' +
            '<img src="' + webpg.utils.escape(webpg.utils.resourcePath) + 'skin/images/badges/stock_encrypted.png" class="webpg-li-icon"/>' +
            _('Symmetric Encryption') +
        '</a>' +
    '</li>' +
    '<li class="webpg-action-btn" id="webpg-none-btn">' +
        '<a href="#">' +
            '<img src="' + webpg.utils.escape(webpg.utils.resourcePath) + 'skin/images/badges/stock_decrypted-signature-bad.png" class="webpg-li-icon"/>' +
            _('Do not use WebPG for this message') +
        '</a>' +
    '</li>' +
'</ul>';

        esBtn.html(action_menu);

        esBtn.click(function(e) {
            var list = jQuery(this).find('.webpg-action-list');
            list[0].style.display = (list[0].style.display == "inline") ? "none" : "inline";
        }).bind('mouseleave', function() {
            if (jQuery(this).find('.webpg-action-list')[0].style.display == "inline")
                jQuery(this).click();
        });

        esBtn.find(".webpg-action-btn").click(function(e) {
            var newIcon = jQuery(this).find("img")[0];
            var newText = jQuery(this).find("a").text();
            jQuery(this).parent().parent().parent().find("#webpg-current-action")
                .html("<img src='" + newIcon.src + "' height=17 " +
                "width=17 style='padding:0;margin:0;'/>" + newText);

            var action = this.id.split("-")[1];

            switch (action) {

                case "crypt":
                    webpg.gmail.removeStatusLine();
                    webpg.gmail.checkRecipients();
                    webpg.gmail.action = 1;
                    break;

                case "sign":
                    webpg.gmail.removeStatusLine();
                    webpg.gmail.action = 2;
                    break;

                case "scrypt":
                    webpg.gmail.removeStatusLine();
                    webpg.gmail.checkRecipients();
                    webpg.gmail.action = 3;
                    break;

                case "symmetric":
                    webpg.gmail.removeStatusLine();
                    webpg.gmail.action = 4;
                    break;

                default:
                    webpg.gmail.removeStatusLine();
                    webpg.gmail.action = 0;
            }
        });
    },

    /*
        Function: getContents
            Retrieves the contents of the gmail UI message editor

        Parameters:
            editor - <editor> The editor instance to use as the context
    */
    getContents: function(editor) {
        var textarea = jQuery('textarea[name!=to]', editor).
            filter("[name!=bcc]").filter("[name!=cc]");
        var iframe = jQuery('iframe', editor).contents().find('body');
        if (iframe.length > 0) {
            var message = iframe.html();
        } else {
            var message = textarea.val();
        }
        return webpg.gmail.clean(message);
    },

    /*
        Function: setContents
            Sets the contents of the gmail UI message editor

        Parameters:
            editor - <obj> The editor instance to use as the context
            message - <str/html> The content to place in the gmail UI message editor
    */
    setContents: function(editor, message){
        var textarea = jQuery('textarea[name!=to]', editor).
            filter("[name!=bcc]").filter("[name!=cc]");
        var iframe = jQuery('iframe', editor).contents().find('body');

        if (iframe.length > 0) {
            var reg = new RegExp("\n\n", "g");
            message = message.replace(reg, "<div><br></div>");
            var reg = new RegExp("\n", "g");
            message = message.replace(reg, "<br>");
            iframe.html(message);
        } else {
            textarea.val(message);
        }
    },

    /*
        Function: clean
            Strips out or replaces extra HTML markup added by the editor

        Parameters:
            text - <str> The string to parse
    */
    clean: function(text) {
        var reg = new RegExp("<br[^>]*>", "gi");
        str = text.replace(reg,"\n");

        reg = new RegExp("<br>", "gi");
        str = str.replace(reg,"\n");

        var reg = new RegExp("</div>", "gi");
        str = str.replace(reg, "\n");

        reg = new RegExp("<[^>]+>", "g");
        str = str.replace(reg, "");

        reg = new RegExp("&lt;", "g");
        str = str.replace(reg, "<");

        reg = new RegExp("&gt;", "g");
        str = str.replace(reg, ">");

        reg = new RegExp("&nbsp;", "g");
        str = str.replace(reg, " ");

        return str;
    },
}

// Check if gmail_integration is enabled and set appropriate listeners.
webpg.utils.sendRequest({
    msg: "gmail_integration" },
    function(response) {
        if (response.result.gmail_integration == "true") {
            webpg.gmail.sign_gmail = response.result.sign_gmail;
            // Retrieve a reference to the appropriate window object
            if (webpg.utils.detectedBrowser['vendor'] == "mozilla") {
                var appcontent = document.getElementById("appcontent");
                appcontent.addEventListener("DOMContentLoaded", function(aEvent) {
                    // We need to filter based on the URL for mozilla, as we do
                    //  not have the option to set the overlay by URL
                    if (content.location.host == "mail.google.com") {
                        content.addEventListener("DOMSubtreeModified", gmailChanges, false);
                    }
                }, true);
            } else {
                window.addEventListener("DOMSubtreeModified", gmailChanges, true);
            }
        }
    }
);

/*
    Function: gmailChanges
        Called when the DOM changes. Watches for our queue in DOM modifications to add the webpg related controls

    Parameters:
        e - <event> The HTML Event dispatched
*/
function gmailChanges(e) {
    // An additional compose window has been opened
    if (typeof(jQuery(e.target).attr("class"))!="undefined" && jQuery(e.target).attr("class").search("L3") > -1) {
        if (jQuery(e.target).contents(':contains("Discard")').length > 0) {
            var navDiv = jQuery(e.target.ownerDocument).contents().find(
            'div[class="dW E"] > div > div'
            ).contents(':contains("Send")').parent().parent();
            if (navDiv.length > 1)
                webpg.gmail.setup(jQuery(navDiv[1]));
        }
    // A reply/forward has been initiated
    } else if (typeof(jQuery(e.target).parent().attr("class"))!="undefined" && jQuery(e.target).parent().attr("class").search("dW E") > -1) {
        if (jQuery(e.target).attr("class").search("eH") > -1) {
            var navDiv = jQuery(e.target.ownerDocument).contents().find(
                'div[class="dW E"] > div > div'
            ).contents(':contains("Send")').parent().parent().each(function() {
                var navDiv = this;
                setTimeout(function() {
                    if (!window.document.getElementById("webpg-action-menu")) {
                        webpg.gmail.setup(jQuery(navDiv));
                    }
                }, 100);
            });
        }
    // A normal document load
    } else {
        var dW = webpg.gmail.getCanvasFrame()
            .find('div[class="dW E"] > div').filter("[class~=J-Jw]").not(':has("#webpg-send-btn")');
        if (dW.length > 0) {
            dW.each(function() {
                var navDiv = jQuery(this).contents(':contains("Discard")').parent();
                if (navDiv.length > 0)
                    webpg.gmail.setup(navDiv);
            });
       }
    }
};

/* ]]> */
