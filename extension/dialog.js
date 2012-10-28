jQuery(function(){
    /*
        Global Variable: qs
        Stores the items found in the query string
        Type: <dict>
    */
    // Define a global variable to store the location query string
    qs = {};

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

    jQuery("#ddialog").dialog({
        resizable: false,
        draggable: false,
        minHeight: 300,
        width: 630,
        modal: true,
        title: _("Select Recipient(s)"),
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
                    jQuery('.ui-button-text').each(function(idx, element) {
                        var el = jQuery(element);
                        if (el.text() == "Export")
                            el.parent().hide();
                    });
                    break;

                case "export":
                    jQuery('.ui-button-text').each(function(idx, element) {
                        var el = jQuery(element);
                        if (el.text() == "Encrypt")
                            el.parent().hide();
                    });
                    break;
            }
            if (webpg.utils.detectedBrowser['vendor'] == "mozilla") {
                var keylist = webpg.background.plugin.getPublicKeyList();
                populateKeylist(keylist);
            } else if (webpg.utils.detectedBrowser['product'] == "chrome") {
                webpg.utils.sendRequest({"msg": "public_keylist"}, function(response) {
                    populateKeylist(response.result);
                })
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
                    var ev_element =  window.parent.document.getElementById(window.frameElement.id);
                    var encryptEvent = new CustomEvent('sendResult', {
                        detail: {
	                        data: unescape(qs.encrypt_data),
	                        recipients: encrypt_to_list
                        }
                    })
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
                    var exportEvent = new CustomEvent('sendResult', {
                        detail: {
	                        recipients: export_list
                        },
                    })
                    ev_element.dispatchEvent(exportEvent);
                } else if (webpg.utils.detectedBrowser['product'] == "chrome") {
                    webpg.utils.sendRequest({"msg": "export", "recipients": export_list,
                        'iframe_id': window.name})
                }
            },
            "Cancel" : function() {
                jQuery("#ddialog").dialog("close");
            },
        }
    });

    function populateKeylist(keylist) {
        var ul = jQuery("<ul></ul>", {
            'style': "padding:0px; margin:0px;"
        });
        for (idx in keylist) {
            var key = keylist[idx];
            if (key.invalid || key.disabled || key.expired || key.revoked)
                continue;
            jQuery(ul).append(jQuery("<li></li>", {
                    'style': "list-style-type: none"
                }).append(jQuery("<input></input>", {
                        'id': "key_" + webpg.utils.escape(idx),
                        'type': "checkbox",
                        'name': "keylist_sel_list"
                    })
                ).append(jQuery("<label></label>", {
                        'id': "lbl-key_" + webpg.utils.escape(idx),
                        'for': "key_" + webpg.utils.escape(idx),
                        'class': "help-text",
                        'html': webpg.utils.escape(key.name + " (" + idx + ")")
                    })
                )
            );
        }
        jQuery("#keylist_form").append(ul);
    }
});
