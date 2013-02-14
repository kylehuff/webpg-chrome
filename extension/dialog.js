/* <![CDATA[ */
if (typeof(webpg)=='undefined') { webpg = {}; }
// Enforce jQuery.noConflict if not already performed
if (typeof(jQuery)!='undefined') { webpg.jq = jQuery.noConflict(true); }

webpg.dialog = {

    init: function() {
        /*
            Global Variable: qs
            Stores the items found in the query string
            Type: <dict>
        */
        // Define a global variable to store the location query string
        this.qs = {};

        webpg.dialog.selectedKeys = [];
        var _ = webpg.utils.i18n.gettext;

        // Assign the location.search value for the appropriate
        //  window to a local variable. window.location for normal
        //  windows, and window.parent.location for iframes that are
        //  loaded from XUL in Firefox
        var loc = (window.location.search.substring()) ?
            window.location.search.substring() :
            window.parent.location.search.substring();

        // Populate the global var "webpg.dialog.qs" with the values
        loc.replace(
            new RegExp("([^?=&]+)(=([^&]*))?", "g"),
            function($0, $1, $2, $3) { webpg.dialog.qs[$1] = $3; }
        );

        var width = window.innerWidth - 10;
        var height = window.innerHeight - 48;
        var title = _("Select Recipient(s)");

        if (webpg.dialog.qs.dialog_type == "import")
            title = _("Import");
        else if (webpg.dialog.qs.dialog_type == "editor")
            title = _("Editor");

        webpg.jq("#ddialog").dialog({
            'resizable': false,
            'draggable': false,
            'minHeight': height,
            'width': width,
            'modal': true,
            'title': title,
            'autoOpen': true,
            'close': function(event) {
                if (webpg.utils.detectedBrowser['vendor'] == "mozilla") {
                    var iframe = window.parent.document.getElementById(window.frameElement.id);
                    window.frameElement.parentElement.removeChild(iframe);
                } else if (webpg.utils.detectedBrowser['product'] == "chrome") {
                    // In Google Chrome/Chormium, we do not have access to the
                    //  parent document, so we need to send an event to remove
                    //  this iframe.
                    webpg.utils.sendRequest({"msg": "removeiframe", "iframe_id": window.name});
                }
            },
            'open': function(event, ui) {
                switch(webpg.dialog.qs.dialog_type) {
                    case "encrypt":
                    case "encryptsign":
                        webpg.jq('.webpg-dialog-insert-btn').hide();
                        webpg.jq('.ui-button-text').each(function(idx, element) {
                            var el = webpg.jq(element);
                            if (el.text() == "Export")
                                el.parent().hide();
                        });
                        webpg.jq('#dialog-pubkey-search-lbl').text(_("Search/Filter") + ": ")
                            .show().next().show();
                        webpg.jq("#dialog-pubkey-search").unbind("change").bind("change", function(e) {
                            // Sometimes the event is a duplicate, so check the
                            //  data object for "original_value"
                            if (webpg.jq(this).data("original_value") == this.value)
                                return
                            // This is an original event, so set the data object
                            //  "original_value"
                            webpg.jq(this).data('original_value', this.value);
                            // Set our keylist object to the current pubkeylist
                            var keylist = webpg.pubkeylist;
                            // Retrieve the value of the serach field
                            var val = e.target.value.toLowerCase();
                            // Create an empty object that will hold the keys matching
                            //  the search string
                            var searchResults = {}
                            // Determine if this is a compound search
                            var compound = (val.search("&&") > -1)
                            if (compound)
                                var searchStrs = val.split(" && ");
                            else
                                var searchStrs = val.split(" & ");
                            // Iterate through the keys in the keylist to preform
                            //  our search
                            for (var key in keylist) {
                                // The instance of the current key object
                                var keyobj = keylist[key];
                                // Convert the key object to a string
                                var keyobjStr = JSON.stringify(keyobj).toLowerCase();
                                // Check if this is a compound search
                                if (compound) {
                                    // Set a flag to determine if all of the search words
                                    //  were located
                                    var allfound = true;
                                    // Iterate through each of the search words.
                                    for (var searchStr in searchStrs) {
                                        // Determine if this search word is a
                                        //  property:value item
                                        if (searchStrs[searchStr].search(":") > -1) {
                                            // Format the property:value search item
                                            //  to a compatible format
                                            searchStrM = webpg.utils.formatSearchParameter(
                                                searchStrs[searchStr]
                                            );
                                        } else {
                                            searchStrM = false;
                                        }
                                        var locate = (searchStrM) ? searchStrM
                                            : searchStrs[searchStr];
                                        if (keyobjStr.search(locate) == -1) {
                                            allfound = false;
                                        }
                                    }
                                    if (allfound)
                                        searchResults[key] = keyobj;
                                } else {
                                    for (var searchStr in searchStrs) {
                                        if (searchStrs[searchStr].search(":") > -1) {
                                            // Format the property:value search item
                                            //  to a compatible format
                                            searchStrM = webpg.utils.formatSearchParameter(
                                                searchStrs[searchStr]
                                            );
                                        } else {
                                            searchStrM = false;
                                        }
                                        var locate = (searchStrM) ? searchStrM
                                            : searchStrs[searchStr];
                                        if (keyobjStr.search(locate) > -1) {
                                            searchResults[key] = keyobj;
                                            break;
                                        }
                                    }
                                }
                            }

                            var nkeylist = (val.length > 0) ? searchResults : null;
                            if (this.value == "")
                                nkeylist = webpg.pubkeylist
                            webpg.dialog.populateKeylist(nkeylist, webpg.dialog.qs.dialog_type);
                        });
                        break;

                    case "export":
                        webpg.jq('#dialog-pubkey-search-lbl').hide().next().hide();
                        webpg.jq('.webpg-dialog-encrypt-btn, .webpg-dialog-insert-btn').hide();
                        break;

                    case "import":
                        webpg.jq('#dialog-pubkey-search-lbl').hide().next().hide();
                        webpg.jq('.webpg-dialog-encrypt-btn, .webpg-dialog-export-btn, .webpg-dialog-insert-btn').hide();
                        break;

                    case "editor":
                        webpg.jq('#dialog-pubkey-search-lbl').hide().next().hide().next().hide();
                        webpg.jq('.webpg-dialog-export-btn').hide();
                        webpg.jq('.webpg-dialog-encrypt-btn').hide();
                        var editor = webpg.jq('#webpg-dialog-editor');
                        editor.css({ 'height': editor.parent()[0].offsetHeight - 10 });
                        editor.text(unescape(webpg.dialog.qs.editor_data));
                        editor.show();
                        webpg.overlay.insert_target = editor;
                        webpg.jq("#ddialog").parent().css({'top': '0'});
                        break;

                }
                if (webpg.utils.detectedBrowser['vendor'] == "mozilla") {
                    if (webpg.dialog.qs.dialog_type == "encrypt" || webpg.dialog.qs.dialog_type == "encryptsign") {
                        webpg.pubkeylist = webpg.background.webpg.plugin.getPublicKeyList();
                    } else if (webpg.dialog.qs.dialog_type == "export") {
                        webpg.pubkeylist = webpg.background.webpg.plugin.getPrivateKeyList();
                    } else if (webpg.dialog.qs.dialog_type == "import") {
                        var import_data = unescape(webpg.dialog.qs.import_data);
                        var pubkeys = import_data.split(webpg.constants.PGPTags.PGP_KEY_END);
                        for (var pubkey in pubkeys) {
                            if (pubkeys[pubkey].length > 1
                                && pubkeys[pubkey].search(webpg.constants.PGPTags.PGP_KEY_BEGIN) > -1) {
                                if (pubkeys[pubkey].search(webpg.constants.PGPTags.PGP_KEY_END) < 1) {
                                    webpg.jq("#keylist_form").append("<pre>" + pubkeys[pubkey] +
                                        webpg.constants.PGPTags.PGP_KEY_END + "</pre>");
                                } else {
                                    webpg.jq("#keylist_form").append("<pre>" + pubkeys[pubkey] + "</pre>");
                                }
                            }
                        }
                        webpg.inline.PGPDataSearch(document);
                        return;
                    } else if (webpg.dialog.qs.dialog_type == "editor") {
                        webpg.inline.PGPDataSearch(document);
                    }
                    webpg.dialog.populateKeylist(webpg.pubkeylist, webpg.dialog.qs.dialog_type);
                } else if (webpg.utils.detectedBrowser['product'] == "chrome") {
                    if (webpg.dialog.qs.dialog_type == "encrypt" || webpg.dialog.qs.dialog_type == "encryptsign") {
                        webpg.utils.sendRequest({"msg": "public_keylist"}, function(response) {
                            webpg.pubkeylist = response.result;
                            webpg.dialog.populateKeylist(response.result, webpg.dialog.qs.dialog_type);
                        })
                    } else if (webpg.dialog.qs.dialog_type == "export") {
                        webpg.utils.sendRequest({"msg": "private_keylist"}, function(response) {
                            webpg.dialog.populateKeylist(response.result, webpg.dialog.qs.dialog_type);
                        })
                    } else if (webpg.dialog.qs.dialog_type == "import") {
                        var import_data = unescape(webpg.dialog.qs.import_data);
                        var pubkeys = import_data.split(webpg.constants.PGPTags.PGP_KEY_END);
                        for (var pubkey in pubkeys) {
                            if (pubkeys[pubkey].length > 1 &&
                                pubkeys[pubkey].search(webpg.constants.PGPTags.PGP_KEY_BEGIN) > -1) {
                                if (pubkeys[pubkey].search(webpg.constants.PGPTags.PGP_KEY_END) < 1) {
                                    webpg.jq("#keylist_form").append("<pre>" + pubkeys[pubkey] +
                                        webpg.constants.PGPTags.PGP_KEY_END + "</pre>");
                                } else {
                                    webpg.jq("#keylist_form").append("<pre>" + pubkeys[pubkey] + "</pre>");
                                }
                            }
                        }
                        webpg.inline.PGPDataSearch(document);
                    }
                }
            },
            'buttons': [
            {
                'text': _("Encrypt"),
                'class': 'webpg-dialog-encrypt-btn',
                'click': function() {
                    var encrypt_to_list = [];
                    for (i=0; i<document.forms.keylist_form.keylist_sel_list.length; i++) {
                        if (document.forms.keylist_form.keylist_sel_list[i].checked == true) {
                            encrypt_to_list[encrypt_to_list.length] = document.forms.keylist_form.keylist_sel_list[i].id.split('_')[1];
                        }
                    };

                    var pre_selection = (unescape(webpg.dialog.qs.pre_selection)) ?
                        unescape(webpg.dialog.qs.pre_selection) : "";

                    var post_selection = (unescape(webpg.dialog.qs.post_selection)) ?
                        unescape(webpg.dialog.qs.post_selection) : "";

                    if (webpg.utils.detectedBrowser['vendor'] == "mozilla") {
                        var ev_element = window.parent.document.getElementById(window.frameElement.id);
                        if (webpg.utils.detectedBrowser['product'] == "seamonkey") {
                            var encryptEvent = document.createEvent('CustomEvent');
                            encryptEvent.initCustomEvent("sendResult", true, true,
                                {
                                    'data': unescape(webpg.dialog.qs.encrypt_data),
                                    'pre_selection': pre_selection,
                                    'post_selection': post_selection,
                                    'recipients': encrypt_to_list,
                                    'sign': (webpg.dialog.qs.dialog_type == "encryptsign"),
                                }
                            );
                        } else {
                            var encryptEvent = new window.CustomEvent('sendResult', {
                                detail: {
	                                'data': unescape(webpg.dialog.qs.encrypt_data),
                                    'pre_selection': pre_selection,
                                    'post_selection': post_selection,
	                                'recipients': encrypt_to_list,
	                                'sign': (webpg.dialog.qs.dialog_type == "encryptsign"),
                                }
                            })
                        }
                        ev_element.dispatchEvent(encryptEvent);
                    } else if (webpg.utils.detectedBrowser['product'] == "chrome") {
                        webpg.utils.sendRequest({"msg": "encrypt",
                            "data": unescape(webpg.dialog.qs.encrypt_data),
                            "pre_selection": pre_selection,
                            "post_selection": post_selection,
                            "recipients": encrypt_to_list,
                            "sign": (webpg.dialog.qs.dialog_type == "encryptsign"),
                            "iframe_id": window.name});
                    }
                }
            }, {
                'text': _("Export"),
                'class': 'webpg-dialog-export-btn',
                'click': function() {
                    var export_list = [];
                    for (i=0; i<document.forms.keylist_form.keylist_sel_list.length; i++) {
                        if (document.forms.keylist_form.keylist_sel_list[i].checked == true) {
                            export_list[export_list.length] = document.forms.keylist_form.keylist_sel_list[i].id.split('_')[1];
                        }
                    };
                    if (webpg.utils.detectedBrowser['vendor'] == "mozilla") {
                        var ev_element =  window.parent.document.getElementById(window.frameElement.id);
                        if (webpg.utils.detectedBrowser['product'] == "seamonkey") {
                            var exportEvent = document.createEvent('CustomEvent');
                            exportEvent.initCustomEvent("sendResult", true, true,
                                {
                                    recipients: export_list
                                }
                            );
                        } else {
                            var exportEvent = new CustomEvent('sendResult', {
                                detail: {
	                                recipients: export_list
                                },
                            })
                        }
                        ev_element.dispatchEvent(exportEvent);
                    } else if (webpg.utils.detectedBrowser['product'] == "chrome") {
                        webpg.utils.sendRequest({"msg": "export", "recipients": export_list,
                            'iframe_id': window.name})
                    }
                }
            }, {
                'text': _("Insert"),
                'class': 'webpg-dialog-insert-btn',
                'click': function() {
                    if (!webpg.inline.action_selected) {
                        console.log("no action has been selected");
                        webpg.jq('#dialog-pubkey-search-lbl').appendTo(
                            webpg.jq(".ui-dialog-buttonpane")).css({
                                'color': '#f11',
                                'padding': '14px 20px 0 0',
                                'float': 'right'
                            }).text(_("no action has been selected")).show();
                        return false;
                    } else if (webpg.inline.before_action_value.selectionText == webpg.jq('#webpg-dialog-editor').val()) {
                        console.log("no action has been successful");
                        webpg.jq('#dialog-pubkey-search-lbl').appendTo(
                            webpg.jq(".ui-dialog-buttonpane")).css({
                                'color': '#f11',
                                'padding': '14px 20px 0 0',
                                'float': 'right'
                            }).text(_("no action has been successful")).show();
                        return false;
                    }

                    if (webpg.utils.detectedBrowser['vendor'] == "mozilla") {
                        var ev_element = window.frameElement;
                        if (webpg.utils.detectedBrowser['product'] == "seamonkey") {
                            var insertEvent = document.createEvent('CustomEvent');
                            insertEvent.initCustomEvent("sendResult", true, true,
                                {
                                    data: webpg.overlay.insert_target.value,
                                }
                            );
                        } else {
                            var insertEvent = new window.CustomEvent('sendResult', {
                                detail: {
	                                'data': webpg.overlay.insert_target.value,
                                }
                            })
                        }
                        ev_element.dispatchEvent(insertEvent);
                    } else if (webpg.utils.detectedBrowser['product'] == "chrome") {
                        webpg.utils.sendRequest({"msg": "insertIntoPrior",
                            "data": webpg.overlay.insert_target.value});
                    }
                    webpg.jq("#ddialog").dialog("close");
                },
            }, {
                'text': _("Cancel"),
                'class': 'webpg-dialog-cancel-btn',
                'click': function() {
                    webpg.jq("#ddialog").dialog("close");
                },
            }]
        });
    },

    populateKeylist: function(keylist, dialog_type) {
        var _ = webpg.utils.i18n.gettext;
        webpg.jq("#keylist_form").find("ul").remove();
        var ul = webpg.jq("<ul></ul>", {
            'style': "padding:0px; margin:0px;"
        });
        for (idx in keylist) {
            var key = keylist[idx];
            if (key.invalid || key.disabled || key.expired || key.revoked)
                continue;

            var enabled = (dialog_type == "encrypt") ? (key.can_encrypt) :
                (dialog_type == "encryptsign") ? (key.can_encrypt && key.can_sign) :
                true;

            var uidlist = _("UIDs");
            
            for (var uid in key.uids)
                uidlist += "\n" + key.uids[uid].uid + " " + key.uids[uid].email;

            var title = (enabled) ? uidlist : _("Key does not support this operation");

            webpg.jq(ul).append(webpg.jq("<li></li>", {
                    'style': "list-style-type: none"
                }).append(webpg.jq("<input></input>", {
                        'id': "key_" + webpg.utils.escape(idx),
                        'type': "checkbox",
                        'name': "keylist_sel_list",
                        'disabled': (!enabled),
                        'title': title,
                        'checked': (webpg.dialog.selectedKeys.indexOf(idx) > -1),
                        'click': function(e) {
                            if (this.checked) {
                                webpg.dialog.selectedKeys.push(this.id.split("_")[1]);
                            } else {
                                webpg.dialog.selectedKeys.pop(this.id.split("_")[1]);
                            }
                        }
                    })
                ).append(webpg.jq("<label></label>", {
                        'id': "lbl-key_" + webpg.utils.escape(idx),
                        'for': "key_" + webpg.utils.escape(idx),
                        'class': "help-text",
                        'title': title,
                        'html': webpg.utils.escape(key.name + " (" + (key.email || idx) + ")")
                    })
                )
            );
        }
        webpg.jq("#keylist_form").append(ul);
    },
}

webpg.jq(function() {
    webpg.dialog.init();
});
/* ]]> */
