/* <![CDATA[ */
if (typeof(webpg)=='undefined') { webpg = {}; }
// Enforce jQuery.noConflict if not already performed
if (typeof(jQuery)!='undefined') { var jq = jQuery.noConflict(true); }

webpg.dialog = {}
webpg.dialog.selectedKeys = [];

jq(function(){
    /*
        Global Variable: qs
        Stores the items found in the query string
        Type: <dict>
    */
    // Define a global variable to store the location query string
    qs = {};
    
    var _ = webpg.utils.i18n.gettext;

    // Assign the location.search value for the appropriate
    //  window to a local variable. window.location for normal
    //  windows, and window.parent.location for iframes that are
    //  loaded from XUL in Firefox
    var loc = (window.location.search.substring()) ?
        window.location.search.substring() :
        window.parent.location.search.substring();

    // Populate the global var "qs" with the values
    loc.replace(
        new RegExp("([^?=&]+)(=([^&]*))?", "g"),
        function($0, $1, $2, $3) { qs[$1] = $3; }
    );

    var width = (qs.dialog_type == "import") ? 800 : 630;
    var height = (qs.dialog_type == "import") ? 380 : 300;
    var title = (qs.dialog_type == "import") ? _("Import") : _("Select Recipient(s)");

    jq("#ddialog").dialog({
        resizable: false,
        draggable: false,
        minHeight: height,
        width: width,
        modal: true,
        title: title,
        autoOpen: true,
        close: function(event) {
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
        open: function(event, ui) {
            switch(qs.dialog_type) {
                case "encrypt":
                case "encryptsign":
                    jq('.ui-button-text').each(function(idx, element) {
                        var el = jq(element);
                        if (el.text() == "Export")
                            el.parent().hide();
                    });
                    jq('#dialog-pubkey-search-lbl').text(_("Search/Filter") + ": ")
                        .show().next().show();
                    jq("#dialog-pubkey-search").unbind("change").bind("change", function(e) {
                        // Sometimes the event is a duplicate, so check the
                        //  data object for "original_value"
                        if (jq(this).data("original_value") == this.value)
                            return
                        // This is an original event, so set the data object
                        //  "original_value"
                        jq(this).data('original_value', this.value);
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
                        populateKeylist(nkeylist, qs.dialog_type);
                    });
                    break;

                case "export":
                    jq('#dialog-pubkey-search-lbl').hide().next().hide();
                    jq('.ui-button-text').each(function(idx, element) {
                        var el = jq(element);
                        if (el.text() == "Encrypt")
                            el.parent().hide();
                    });
                    break;

                case "import":
                    jq('#dialog-pubkey-search-lbl').hide().next().hide();
                    jq('.ui-button-text').each(function(idx, element) {
                        var el = jq(element);
                        if (el.text() == "Export")
                            el.parent().hide();
                        if (el.text() == "Encrypt")
                            el.parent().hide();
                    });
                    break;
            }
            if (webpg.utils.detectedBrowser['vendor'] == "mozilla") {
                if (qs.dialog_type == "encrypt" || qs.dialog_type == "encryptsign") {
                    webpg.pubkeylist = webpg.background.webpg.plugin.getPublicKeyList();
                } else if (qs.dialog_type == "export") {
                    webpg.pubkeylist = webpg.background.webpg.plugin.getPrivateKeyList();
                } else {
                    var import_data = unescape(qs.import_data);
                    var pubkeys = import_data.split(webpg.constants.PGPTags.PGP_KEY_END);
                    for (var pubkey in pubkeys) {
                        if (pubkeys[pubkey].length > 1
                            && pubkeys[pubkey].search(webpg.constants.PGPTags.PGP_KEY_BEGIN) > -1) {
                            if (pubkeys[pubkey].search(webpg.constants.PGPTags.PGP_KEY_END) < 1) {
                                jq("#keylist_form").append("<pre>" + pubkeys[pubkey] +
                                    webpg.constants.PGPTags.PGP_KEY_END + "</pre>");
                            } else {
                                jq("#keylist_form").append("<pre>" + pubkeys[pubkey] + "</pre>");
                            }
                        }
                    }
                    webpg.inline.PGPDataSearch(document);
                    return;
                }
                populateKeylist(webpg.pubkeylist, qs.dialog_type);
            } else if (webpg.utils.detectedBrowser['product'] == "chrome") {
                if (qs.dialog_type == "encrypt" || qs.dialog_type == "encryptsign") {
                    webpg.utils.sendRequest({"msg": "public_keylist"}, function(response) {
                        webpg.pubkeylist = response.result;
                        populateKeylist(response.result, qs.dialog_type);
                    })
                } else if (qs.dialog_type == "export") {
                    webpg.utils.sendRequest({"msg": "private_keylist"}, function(response) {
                        populateKeylist(response.result, qs.dialog_type);
                    })
                } else if (qs.dialog_type == "import") {
                    var import_data = unescape(qs.import_data);
                    var pubkeys = import_data.split(webpg.constants.PGPTags.PGP_KEY_END);
                    for (var pubkey in pubkeys) {
                        if (pubkeys[pubkey].length > 1 &&
                            pubkeys[pubkey].search(webpg.constants.PGPTags.PGP_KEY_BEGIN) > -1) {
                            if (pubkeys[pubkey].search(webpg.constants.PGPTags.PGP_KEY_END) < 1) {
                                jq("#keylist_form").append("<pre>" + pubkeys[pubkey] +
                                    webpg.constants.PGPTags.PGP_KEY_END + "</pre>");
                            } else {
                                jq("#keylist_form").append("<pre>" + pubkeys[pubkey] + "</pre>");
                            }
                        }
                    }
                    webpg.inline.PGPDataSearch(document);
                }
            }
        },
        buttons: {
            "Encrypt": function() {
                var encrypt_to_list = [];
                for (i=0; i<document.forms.keylist_form.keylist_sel_list.length; i++){
                    if (document.forms.keylist_form.keylist_sel_list[i].checked == true) {
                        encrypt_to_list[encrypt_to_list.length] = document.forms.keylist_form.keylist_sel_list[i].id.split('_')[1];
                    }
                };

                var pre_selection = (unescape(qs.pre_selection)) ?
                    unescape(qs.pre_selection) : "";

                var post_selection = (unescape(qs.post_selection)) ?
                    unescape(qs.post_selection) : "";

                if (webpg.utils.detectedBrowser['vendor'] == "mozilla") {
                    var ev_element = window.parent.document.getElementById(window.frameElement.id);
                    if (webpg.utils.detectedBrowser['product'] == "seamonkey") {
                        var encryptEvent = document.createEvent('CustomEvent');
                        encryptEvent.initCustomEvent("sendResult", true, true,
                            {
                                data: unescape(qs.encrypt_data),
                                pre_selection: pre_selection,
                                post_selection: post_selection,
                                recipients: encrypt_to_list,
                                sign: (qs.dialog_type == "encryptsign"),
                            }
                        );
                    } else {
                        var encryptEvent = new window.CustomEvent('sendResult', {
                            detail: {
	                            data: unescape(qs.encrypt_data),
                                pre_selection: pre_selection,
                                post_selection: post_selection,
	                            recipients: encrypt_to_list,
	                            sign: (qs.dialog_type == "encryptsign"),
                            }
                        })
                    }
                    ev_element.dispatchEvent(encryptEvent);
                } else if (webpg.utils.detectedBrowser['product'] == "chrome") {
                    webpg.utils.sendRequest({"msg": "encrypt",
                        "data": unescape(qs.encrypt_data),
                        "pre_selection": pre_selection,
                        "post_selection": post_selection,
                        "recipients": encrypt_to_list,
                        "sign": (qs.dialog_type == "encryptsign"),
                        "iframe_id": window.name});
                }
            },
            "Export": function() {
                var export_list = [];
                for (i=0; i<document.forms.keylist_form.keylist_sel_list.length; i++){
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
            },
            "Cancel" : function() {
                jq("#ddialog").dialog("close");
            },
        }
    });

    function populateKeylist(keylist, dialog_type) {
        jq("#keylist_form").find("ul").remove();
        var ul = jq("<ul></ul>", {
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

            jq(ul).append(jq("<li></li>", {
                    'style': "list-style-type: none"
                }).append(jq("<input></input>", {
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
                ).append(jq("<label></label>", {
                        'id': "lbl-key_" + webpg.utils.escape(idx),
                        'for': "key_" + webpg.utils.escape(idx),
                        'class': "help-text",
                        'title': title,
                        'html': webpg.utils.escape(key.name + " (" + (key.email || idx) + ")")
                    })
                )
            );
        }
        jq("#keylist_form").append(ul);
    }
});
/* ]]> */
