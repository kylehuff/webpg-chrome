/* <![CDATA[ */
if (typeof(webpg)=='undefined') { webpg = {}; }
if (typeof(webpg.thunderbird)=='undefined') { webpg.thunderbird = {}; }

webpg.thunderbird.compose = {

    // list of valid send actions
    sendActions: {
        PSIGN: "PLAINSIGN", // Sign the message inline
        ASIGN: "ATTACHSIGN", // Create a detached signature and attach to the msg
        SIGN: "SIGN", // Create a signed data packet inline
        CRYPT: "CRYPT", // Encrypt the data inline
        CRYPTSIGN: "CRYPTSIGN", // Encrypt and Sign the data inline
        SYMCRYPT: "SYMCRYPT", // Perform Symmetric Encryption inline
    },

    init: function(aEvent) {
        var _ = webpg.utils.i18n.gettext;
        var webpg_menuitems = document.querySelectorAll('.webpg-menuitem');
        webpg.thunderbird.utils.setMenuItemLabels(webpg_menuitems);
        webpg.thunderbird.utils.setMenuItemLabels([document.querySelector('#webpg-menu-popup').parentElement]);
        var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
               .getService(Components.interfaces.nsIWindowMediator);
        var winType = (webpg.utils.detectedBrowser['product'] == "thunderbird") ?
            "mail:3pane" : "navigator:browser";
        var browserWindow = wm.getMostRecentWindow(winType);

        if (!webpg.plugin) {
            webpg.plugin = browserWindow.webpg.plugin;
        }

        if (!webpg.plugin.valid == true)
            return

        this.sendAction = false;
        this.actionPerformed = false;

        this.stateListener = {
            NotifyComposeFieldsReady: this.composeFieldsReady,  
            NotifyComposeBodyReady: this.composeBodyReady,
            ComposeProcessDone: this.composeProcessDone,
            SaveInFolderDone: this.saveInFolderDone,
        }

        gMsgCompose.RegisterStateListener(this.stateListener);

        // The message window has been recycled
        window.addEventListener('compose-window-reopen',
            webpg.thunderbird.compose.reopenMessageListener, true);

        // The message is being sent
        window.addEventListener('compose-send-message',
            function _sendMessageListener (aEvent) {
                webpg.thunderbird.compose.sendMessageListener(aEvent);
            }, true);

        window.addEventListener('compose-window-close',
            webpg.thunderbird.compose.closeWindowListener, true);

    },

    composeFieldsReady: function() {
    },

    // The body of the message is available/ready
    composeBodyReady: function() {
        var _ = webpg.utils.i18n.gettext;
        webpg.thunderbird.compose.editor = GetCurrentEditor();
        // Check if this is seamonkey, and add our toolbar item
        if (webpg.utils.detectedBrowser['product'] == "seamonkey") {
//            var style = document.getElementById("xml-stylesheet-webpg-compose-overlay");
//            style.setAttribute("href", "chrome://webpg-firefox/skin/seamonkey.css");
            var toolbar = document.getElementById("composeToolbar");
        } else {
            // composeToolbar2 MsgComposeToolbarPalette customToolbars
            var toolbar = document.getElementById("composeToolbar2");
        }

        if (toolbar) {
            var defaultset = toolbar.getAttribute("defaultset");
            if (defaultset.indexOf("webpg-msg-btn") == -1)
                toolbar.setAttribute("defaultset", defaultset + ",webpg-msg-btn");
            var currentset = toolbar.currentSet;
            if (currentset.indexOf("webpg-msg-btn") == -1)
                toolbar.currentSet = currentset + ",webpg-msg-btn";
        }

        // Apply the labels to the compose window actions
        try {
            document.getElementById("webpg-msg-noaction").label = _("Do not use WebPG for this message");
            document.getElementById("webpg-msg-sign").label = _("Sign Inline");
            document.getElementById("webpg-msg-asign").label = _("Sign as Attachment");
            document.getElementById("webpg-msg-sign-enc").label = _("Sign and Encrypt");
            document.getElementById("webpg-msg-enc").label = _("Encrypt");
            document.getElementById("webpg-msg-symenc").label = _("Symmetric Encryption");
        } catch (err) {
            // there are cases where these items might not be present;
            console.log(err.message);
        }
    },

    // Called after message was sent/saved (fires twice)
    composeProcessDone: function(aResult) {
    },

    saveInFolderDone: function(folderURI) {
    },

    // The message was reopened or the window was recycled
    reopenMessageListener: function(aEvent) {
    },

    // The message window was closed
    closeWindowListener: function(aEvent) {
        webpg.thunderbird.compose.actionPerformed = false;
    },

    sendMessageListener: function(aEvent) {
        var msgcomposeWindow = document.getElementById("msgcomposeWindow");
        var msgType = msgcomposeWindow.getAttribute("msgtype");

        // Determine if this an actual send event
        if(!(msgType == nsIMsgCompDeliverMode.Now || msgType == nsIMsgCompDeliverMode.Later))
            return;

        // Determine if we have a defined sendAction
        if (!webpg.thunderbird.compose.sendAction)
            return;

        // Determine if we have already performed the required action
        if (webpg.thunderbird.compose.actionPerformed)
            return;

        // execute the current sendAction
        try {
            var actionResult = webpg.thunderbird.compose.performSendAction();
        } catch (err) {
            alert("WebPG Error: error in webpg.thunderbird.compose.performSendAction(); " + err.message);
            aEvent.preventDefault();
            aEvent.stopPropagation();
        }

        // Handle any errors
        if (actionResult.error) {
            var statusMsg = "WebPG - error: " + webpg.utils.escape(actionResult.error_string) + ";";
            if (typeof(actionResult.gpg_error_code) != 'undefined')
                statusMsg += " Error code: " + webpg.utils.escape(actionResult.gpg_error_code);
            alert(statusMsg);
            aEvent.preventDefault();
            aEvent.stopPropagation();
        } else {
            webpg.thunderbird.compose.actionPerformed = true;
        }
    },

    setSendAction: function(action, element) {
        var baseClass = "webpg-msg-btn toolbarbutton-1";
        document.getElementById('webpg-msg-btn').label = element.label + " ";
        this.actionPerformed = false;

        switch (action) {
            case webpg.thunderbird.compose.sendActions.PSIGN:
                this.sendAction = "PLAINSIGN";
                document.getElementById("webpg-msg-btn").className = baseClass + " webpg-menu-sign";
                break;

            case webpg.thunderbird.compose.sendActions.ASIGN:
                this.sendAction = "ATTACHSIGN";
                document.getElementById("webpg-msg-btn").className = baseClass + " webpg-menu-attachsign";
                break;

            case webpg.thunderbird.compose.sendActions.CRYPTSIGN:
                this.sendAction = "CRYPTSIGN";
                document.getElementById("webpg-msg-btn").className = baseClass + " webpg-menu-cryptsign";
                break;

            case webpg.thunderbird.compose.sendActions.CRYPT:
                this.sendAction = "CRYPT";
                document.getElementById("webpg-msg-btn").className = baseClass + " webpg-menu-crypt";
                break;

            case webpg.thunderbird.compose.sendActions.SYMCRYPT:
                this.sendAction = "SYMCRYPT";
                document.getElementById("webpg-msg-btn").className = baseClass + " webpg-menu-crypt";
                break;

            default:
                document.getElementById("webpg-msg-btn").className = baseClass + " webpg-menu-donotuse";
                this.sendAction = false;

        }

    },

    getRecipients: function() {
        msgCompFields = gMsgCompose.compFields;
        var splitRecipients = msgCompFields.splitRecipients;
        var toList = [];
        var ccList = [];
        var bccList = [];
        var allList = [];
        var processed = new Object();

        if (msgCompFields.to.length > 0) {
            toList = msgCompFields.splitRecipients(msgCompFields.to, true, processed);
        }

        if (msgCompFields.cc.length > 0) {
            ccList = msgCompFields.splitRecipients(msgCompFields.cc, true, processed);
        }

        if (msgCompFields.bcc.length > 0) {
            bccList = msgCompFields.splitRecipients(msgCompFields.bcc, true, processed);
        }

        return { 'to': toList, 'cc': ccList, 'bcc': bccList, 'all': allList.concat(toList, ccList, bccList) };
    },

    /*
        Function: checkRecipients
            Checks the keyring for the required keys when performing GnuPG methods that require them

        Parameters:
            callback - <func> The function to execute when completed
    */
    checkRecipients: function(callback) {
        var _ = webpg.utils.i18n.gettext;
        var users = this.getRecipients().all;
        var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
               .getService(Components.interfaces.nsIWindowMediator);
        var winType = (webpg.utils.detectedBrowser['product'] == "thunderbird") ?
            "mail:3pane" : "navigator:browser";
        var browserWindow = wm.getMostRecentWindow(winType);

        var keyResults = {};
        for (var u in users) {
            keyResults[users[u]] = webpg.plugin.getNamedKey(users[u]);
            var i = -1;
            for (i in keyResults[users[u]]) {
                // nothing
            }
            if (i < 0) {
                var group_result = webpg.preferences.group.get(users[u]);
                for (var group in group_result) {
                    keyResults[users[u]] = webpg.plugin.getNamedKey(group_result[group]);
                }
            }
        }
        var recipKeys = {};
        for (var u in keyResults) {
            for (var k in keyResults[u]) {
                recipKeys[u] = keyResults[u][k];
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
                replace(/((,))/g, " " + _("or") + " ").replace(",", " ");
            return {'error': true, 'error_string': status};
        } else {
            if (callback)
                return callback(recipKeys);
        }
    },

    getEditorContents: function() {
        const dce = Components.interfaces.nsIDocumentEncoder;
        var encFlags = dce.OutputFormatted | dce.OutputLFLineBreak;
        return this.editor.outputToString("text/plain", encFlags);
    },

    setEditorContents: function(contents) {
        this.editor.selectAll();

        this.editor.beginTransaction();

        try {
            var editor = this.editor.QueryInterface(Components.interfaces.nsIEditorMailSupport);
            editor.insertTextWithQuotations(contents);
        } catch (ex) {
            this.editor.insertText(contents);
        }

        this.editor.endTransaction();
    },

    setAttachment: function(msg, contents) {
        return {'error': true, 'error_string': "Signatures as attachments not yet implemented"};
    },

    performSendAction: function() {
        // Retrieve the contents of the editor
        var msgContents = this.getEditorContents();

        var actionStatus = {'error': true};

        switch (this.sendAction) {
            case webpg.thunderbird.compose.sendActions.PSIGN:
                actionStatus = this.clearSignMsg(msgContents);
                break;

            case webpg.thunderbird.compose.sendActions.ASIGN:
                actionStatus = this.clearSignMsg(msgContents, true);
                break;

            case webpg.thunderbird.compose.sendActions.CRYPT:
                actionStatus = this.cryptMsg(msgContents);
                break;

            case webpg.thunderbird.compose.sendActions.CRYPTSIGN:
                actionStatus = this.cryptMsg(msgContents, true);
                break;

            case webpg.thunderbird.compose.sendActions.SYMCRYPT:
                actionStatus = this.symCryptMsg(msgContents);
                break;
        }

        return actionStatus;
    },

    clearSignMsg: function(msg, asAttachment) {
        try {
            var signKey = webpg.preferences.default_key.get();
            var signMode = (asAttachment == true) ? 1 : 2;
            var signStatus = webpg.plugin.gpgSignText([signKey], msg, signMode);
            if (!signStatus.error)
                if (asAttachment)
                    webpg.thunderbird.compose.setAttachment(msg, signStatus.data);
                else
                    webpg.thunderbird.compose.setEditorContents(signStatus.data);
        } catch (err) {
            signStatus = {'error': true, 'error_string': err.message};
        }
        console.log(signStatus.error);
        return signStatus;
    },

    cryptMsg: function(msg, sign) {
        var encryptStatus = this.checkRecipients(function(recipKeys) {
            // TODO: Check that the keys are good for this operation
            var allRecipients = webpg.thunderbird.compose.getRecipients();
            var recipients = allRecipients.to.concat(allRecipients.cc);
            try {
                // Check for BCC/hidden recipients
                if (allRecipients.bcc.length > 0) {
                    allRecipients.bcc.every(function(recip) {
                        // set the temp option prior to encryption;
                        webpg.plugin.setTempGPGOption('hidden-encrypt-to', recipKeys[recip].fingerprint.substr(-16))
                        return true;
                    });
                }
                var status = webpg.plugin.gpgEncrypt(msg, recipients, (sign == true) ? 1 : 0);
                webpg.plugin.restoreGPGConfig();
                if (!status.error)
                    webpg.thunderbird.compose.setEditorContents(status.data);
            } catch (err) {
                webpg.plugin.restoreGPGConfig();
                status = {'error': true, 'error_string': err.message};
            }
            return status;
        });

        return encryptStatus;
    },

    symCryptMsg: function(msg) {
        try {
            var encryptStatus = webpg.plugin.gpgSymmetricEncrypt(msg, 0);
            if (!encryptStatus.error)
                webpg.thunderbird.compose.setEditorContents(encryptStatus.data);
        } catch (err) {
            encryptStatus = {'error': true, 'error_string': err.message};
        }
        return encryptStatus;
    },
}

window.addEventListener('compose-window-init',
    function _init(aEvent) {
        webpg.thunderbird.compose.init(aEvent);
    }, true);
/* ]]> */
