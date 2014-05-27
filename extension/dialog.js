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
        var aux = [];
        aux = webpg.preferences.selectedKeys.get();
        if(aux) {
        	webpg.dialog.selectedKeys = aux;
        } else {
        	webpg.dialog.selectedKeys = [];
        }

        var _ = webpg.utils.i18n.gettext;

        webpg.pubkeylist = {};

        if (webpg.overlay.default_key === undefined)
            webpg.overlay.init();

        if (webpg.utils.detectedBrowser.product === "chrome") {
          chrome.extension.onConnect.addListener(function(port) {
            port.onMessage.addListener(function(data) {
              webpg.keymanager.keylistprogress(data, port);
            });
          });
        }

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
        var height = window.innerHeight - 10;

        var title = _("Select Recipient(s)");

        if (webpg.dialog.qs.dialog_type === "import")
            title = _("Import");
        else if (webpg.dialog.qs.dialog_type === "export")
            title = _("Export");
        else if (webpg.dialog.qs.dialog_type === "editor")
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
                webpg.utils.sendRequest({
                    "msg": "removeiframe",
                    "iframe_id": window.name,
                    "dialog_type": webpg.dialog.qs.dialog_type
                });
            },
            'open': function(event, ui) {
                webpg.jq(".ui-dialog").css({'top':0});
                switch(webpg.dialog.qs.dialog_type) {
                    case "encrypt":
                    case "encryptsign":
                    case "export":
                        webpg.jq('#ddialog').css({
                            'padding-top': (webpg.utils.detectedBrowser.vendor === 'mozilla') ? '39px' : '35px',
                            'minHeight': '0',
                            'height': height - 160 + 'px'
                        }).parent().css({ 'height': height + 'px'});
                        if (webpg.dialog.qs.dialog_type === "export") {
                            webpg.jq('.webpg-dialog-encrypt-btn, .webpg-dialog-insert-btn').hide();
                            webpg.jq('.webpg-dialog-export-btn').show();
                            webpg.overlay.block_target = true;
                        } else {
                            webpg.jq('.webpg-dialog-insert-btn, .webpg-dialog-export-btn').hide();
                        }
                        webpg.jq('#dialog-pubkey-search-fixed').css({
                            'top': (webpg.utils.detectedBrowser.vendor === 'mozilla') ? '57px' : '58px'
                        });
                        webpg.jq('#dialog-pubkey-search-lbl').text(_("Search/Filter") + ": ")
                            .parent().show().next().show();
                        webpg.jq("#dialog-pubkey-search").unbind("change input").bind("change input", function(e) {
                            // Sometimes the event is a duplicate, so check the
                            //  data object for "original_value"
                            if (webpg.jq(this).data("original_value") === this.value)
                                return;
                            // This is an original event, so set the data object
                            //  "original_value"
                            webpg.jq(this).data('original_value', this.value);
                            // Set our keylist object to the current pubkeylist
                            var keylist = webpg.pubkeylist;
                            // Retrieve the value of the serach field
                            var val = e.target.value.toLowerCase();
                            var nkeylist = webpg.utils.keylistTextSearch(val, keylist);
                            if (this.value === "")
                                nkeylist = webpg.pubkeylist;
                            webpg.keymanager.keylistprogress(nkeylist);
                        });
                        break;

                    case "import":
                        webpg.jq('#dialog-pubkey-search-lbl').hide().next().hide();
                        webpg.jq('.webpg-dialog-encrypt-btn, .webpg-dialog-export-btn, .webpg-dialog-insert-btn').hide();
                        break;

                    case "editor":
                        webpg.jq('#dialog-pubkey-search-fixed').hide().next().hide();
                        webpg.jq('.webpg-dialog-export-btn').hide();
                        webpg.jq('.webpg-dialog-encrypt-btn').hide();
                        var editor = webpg.jq('#webpg-dialog-editor');
                        editor.css({ 'height': editor.parent()[0].offsetHeight - 48 });
                        editor.text(unescape(webpg.dialog.qs.editor_data));
                        editor.show();
                        webpg.overlay.insert_target = editor;
                        webpg.overlay.block_target = true;
                        break;

                }
                if (webpg.utils.detectedBrowser.vendor === "mozilla") {
                    if (webpg.dialog.qs.dialog_type === "encrypt" || webpg.dialog.qs.dialog_type === "encryptsign") {
                        webpg.utils.sendRequest({"msg": "public_keylist",
                          'fastlistmode': true,
                          'threaded': true,
                          'iframe_id': window.name}, function(response) {
                        });
                    } else if (webpg.dialog.qs.dialog_type === "export") {
                        webpg.pubkeylist = webpg.background.webpg.plugin.getPrivateKeyList();
                    } else if (webpg.dialog.qs.dialog_type === "import") {
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
                        webpg.inline.init(document, "window");
                        webpg.inline.PGPDataSearch(document);
                    } else if (webpg.dialog.qs.dialog_type === "editor") {
                        webpg.inline.PGPDataSearch(document, false, false, webpg.jq("#keylist_form")[0]);
                    }
                    webpg.keymanager.keylistprogress(webpg.pubkeylist);
                } else if (webpg.utils.detectedBrowser.product === "chrome") {
                    if (webpg.dialog.qs.dialog_type === "encrypt" || webpg.dialog.qs.dialog_type === "encryptsign") {
                        webpg.utils.sendRequest({"msg": "public_keylist", 'fastlistmode': true, 'threaded': true});
                    } else if (webpg.dialog.qs.dialog_type === "export") {
                        webpg.utils.sendRequest({"msg": "private_keylist"}, function(response) {
                            webpg.pubkeylist = response.result;
                            webpg.keymanager.keylistprogress(response.result);
                        });
                    } else if (webpg.dialog.qs.dialog_type === "import") {
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
                    }
                }
            },
            'buttons': [
            {
                'text': _("Encrypt"),
                'class': 'webpg-dialog-encrypt-btn',
                'click': function() {
                    var pre_selection = unescape(webpg.dialog.qs.pre_selection) || "";

                    var post_selection = unescape(webpg.dialog.qs.post_selection) || "";

                    var iframe_id = window.name;
                    
                    var signers = (webpg.dialog.qs.signers!==undefined && 
                        unescape(webpg.dialog.qs.signers)!==null) ?
                        [unescape(webpg.dialog.qs.signers)] : null;

                    webpg.preferences.selectedKeys.set(webpg.dialog.selectedKeys);

                    webpg.utils.sendRequest({"msg": "encrypt",
                        "data": unescape(webpg.dialog.qs.encrypt_data),
                        "pre_selection": pre_selection,
                        "post_selection": post_selection,
                        "recipients": webpg.dialog.selectedKeys,
                        "sign": (webpg.dialog.qs.dialog_type === "encryptsign"),
                        "signers": signers,
                        "target_id": iframe_id,
                        "iframe_id": iframe_id});
                }
            }, {
                'text': _("Export"),
                'class': 'webpg-dialog-export-btn',
                'click': function() {
                    var export_list = [];
                    for (i=0; i<document.forms.keylist_form.keylist_sel_list.length; i++) {
                        if (document.forms.keylist_form.keylist_sel_list[i].checked === true) {
                            export_list[export_list.length] = document.forms.keylist_form.keylist_sel_list[i].id.split('_')[1];
                        }
                    }
                    webpg.utils.sendRequest({"msg": "export", "recipients": export_list,
                        'iframe_id': window.name});
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
                    } else if (webpg.inline.before_action_value.selectionText === webpg.jq('#webpg-dialog-editor').val()) {
                        console.log("no action has been successful");
                        webpg.jq('#dialog-pubkey-search-lbl').appendTo(
                            webpg.jq(".ui-dialog-buttonpane")).css({
                                'color': '#f11',
                                'padding': '14px 20px 0 0',
                                'float': 'right'
                            }).text(_("no action has been successful")).show();
                        return false;
                    }

                    webpg.utils.sendRequest({"msg": "insertIntoPrior",
                        "data": webpg.overlay.insert_target.value});
                    webpg.jq("#ddialog").dialog("close");
                    webpg.jq("#ddialog").dialog("destroy");
                }
            }, {
                'text': _("Cancel"),
                'class': 'webpg-dialog-cancel-btn',
                'click': function() {
                    webpg.jq("#ddialog").dialog("close");
                    webpg.jq("#ddialog").dialog("destroy");
                }
            }]
        });
    },
}

webpg.keymanager = {
    keylistprogress: function(data, port) {
        // Check if we recieved a key, or a key list
        //  keylists need to be converted to individual keys and recall this
        //  this method.
        if (webpg.utils.detectedBrowser.vendor === "mozilla") {
            if (data.detail !== undefined &&
                data.detail.type === "key") {
                port = "port";
                data = data.detail;
          } else if (typeof(data) === "object" &&
                     Object.keys(data).length < 2) {
            return;
          }
        }
        if (port === undefined) {
            webpg.jq("ul#keylist").empty();
            for (var idx in data) {
                webpg.keymanager.keylistprogress(data[idx], 'port');
            }
        } else { // Single key
            if (data && data.hasOwnProperty('type') && data.type === "key" &&
                data.data !== undefined) {
              try {
                var key = JSON.parse(data.data);
              } catch (e) {
                return;
              }
            } else if (data === null || data === undefined) {
              return;
            } else { // Key object passed
              var key = data;
            }

            webpg.pubkeylist[key.id] = key;

            var _ = webpg.utils.i18n.gettext;

            // Get a reference to our keylist ul, or create a new one.
            var ul = webpg.jq("ul#keylist");

            if (key.invalid || key.disabled || key.expired || key.revoked)
                return;

            var dialog_type = webpg.dialog.qs.dialog_type;

            var enabled = (dialog_type === "encrypt") ? (key.can_encrypt) :
                (dialog_type === "encryptsign") ? (key.can_encrypt && key.can_sign) :
                true;

            var uidlist = _("UIDs");

            for (var uid in key.uids)
                uidlist += key.uids[uid].uid + " " + key.uids[uid].email;

            var title = (enabled) ? uidlist : _("Key does not support this operation");

            ul.append(
                webpg.jq("<li></li>", {
                    'class': (webpg.dialog.selectedKeys.indexOf(key.id) > -1) ? "active"
                        : (enabled) ? "" : "disabled"
                }).append(
                    webpg.jq("<input></input>", {
                        'id': "key_" + webpg.utils.escape(key.id),
                        'type': "checkbox",
                        'name': "keylist_sel_list",
                        'disabled': (!enabled),
                        'title': title,
                        'class': "",
                        'checked': (webpg.dialog.selectedKeys.indexOf(key.id) > -1),
                        'click': function(e) {
                            if (this.checked) {
                                webpg.jq(this).parent().addClass("active");
                                webpg.dialog.selectedKeys.push(this.id.split("_")[1]);
                            } else {
                                webpg.jq(this).parent().removeClass("active");
                                webpg.dialog.selectedKeys.pop(this.id.split("_")[1]);
                            }
                        }
                    })
                ).append(webpg.jq("<label></label>", {
                        'id': "lbl-key_" + webpg.utils.escape(key.id),
                        'for': "key_" + webpg.utils.escape(key.id),
                        'class': (enabled) ? "help-text" : "help-text disabled",
                        'title': title,
                        'html': webpg.utils.escape(key.name + " (" + (key.email || key.id) + ")")
                    })
                )
            );
        }
    }
};

webpg.jq(function() {
    webpg.dialog.init();
});
/* ]]> */
