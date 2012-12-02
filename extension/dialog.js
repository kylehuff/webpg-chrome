// Enforce jQuery.noConflict if not already performed
if (typeof(jQuery)!='undefined') { var jq = jQuery.noConflict(true); }

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
                window.parent.document.body.removeChild(iframe);
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
                    jq('.ui-button-text').each(function(idx, element) {
                        var el = jq(element);
                        if (el.text() == "Export")
                            el.parent().hide();
                    });
                    break;

                case "export":
                    jq('.ui-button-text').each(function(idx, element) {
                        var el = jq(element);
                        if (el.text() == "Encrypt")
                            el.parent().hide();
                    });
                    break;

                case "import":
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
                if (qs.dialog_type == "encrypt") {
                    var keylist = webpg.background.webpg.plugin.getPublicKeyList();
                } else if (qs.dialog_type == "export") {
                    var keylist = webpg.background.webpg.plugin.getPrivateKeyList();
                } else {
                    var import_data = unescape(qs.import_data);
                    var pubkeys = import_data.split("-----END PGP PUBLIC KEY BLOCK-----");
                    for (var pubkey in pubkeys) {
                        if (pubkeys[pubkey].length > 1) {
                            jq("#keylist_form").append("<pre>" + pubkeys[pubkey] +
                                "-----END PGP PUBLIC KEY BLOCK-----" + "</pre>");
                        }
                    }
                    webpg.inline.PGPDataSearch(document);
                    return;
                }
                populateKeylist(keylist);
            } else if (webpg.utils.detectedBrowser['product'] == "chrome") {
                if (qs.dialog_type == "encrypt") {
                    webpg.utils.sendRequest({"msg": "public_keylist"}, function(response) {
                        populateKeylist(response.result);
                    })
                } else if (qs.dialog_type == "export") {
                    webpg.utils.sendRequest({"msg": "private_keylist"}, function(response) {
                        populateKeylist(response.result);
                    })
                } else if (qs.dialog_type == "import") {
                    var import_data = unescape(qs.import_data);
                    var pubkeys = import_data.split("-----END PGP PUBLIC KEY BLOCK-----");
                    for (var pubkey in pubkeys) {
                        if (pubkeys[pubkey].length > 1) {
                            jq("#keylist_form").append("<pre>" + pubkeys[pubkey] +
                                "-----END PGP PUBLIC KEY BLOCK-----" + "</pre>");
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
                if (webpg.utils.detectedBrowser['vendor'] == "mozilla") {
                    var ev_element = window.parent.document.getElementById(window.frameElement.id);
                    if (webpg.utils.detectedBrowser['product'] == "seamonkey") {
                        var encryptEvent = document.createEvent('CustomEvent');
                        encryptEvent.initCustomEvent("sendResult", true, true,
                            {
                                data: unescape(qs.encrypt_data),
                                recipients: encrypt_to_list
                            }
                        );
                    } else {
                        var encryptEvent = new window.CustomEvent('sendResult', {
                            detail: {
	                            data: unescape(qs.encrypt_data),
	                            recipients: encrypt_to_list
                            }
                        })
                    }
                    ev_element.dispatchEvent(encryptEvent);
                } else if (webpg.utils.detectedBrowser['product'] == "chrome") {
                    webpg.utils.sendRequest({"msg": "encrypt",
                        "data": unescape(qs.encrypt_data),
                        "recipients": encrypt_to_list,
                        "sign": false, "iframe_id": window.name});
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

    function populateKeylist(keylist) {
        var ul = jq("<ul></ul>", {
            'style': "padding:0px; margin:0px;"
        });
        for (idx in keylist) {
            var key = keylist[idx];
            if (key.invalid || key.disabled || key.expired || key.revoked)
                continue;
            jq(ul).append(jq("<li></li>", {
                    'style': "list-style-type: none"
                }).append(jq("<input></input>", {
                        'id': "key_" + webpg.utils.escape(idx),
                        'type': "checkbox",
                        'name': "keylist_sel_list"
                    })
                ).append(jq("<label></label>", {
                        'id': "lbl-key_" + webpg.utils.escape(idx),
                        'for': "key_" + webpg.utils.escape(idx),
                        'class': "help-text",
                        'html': webpg.utils.escape(key.name + " (" + idx + ")")
                    })
                )
            );
        }
        jq("#keylist_form").append(ul);
    }
});
