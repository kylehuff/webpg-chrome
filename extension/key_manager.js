/* <![CDATA[ */
if (typeof(webpg)=='undefined') { webpg = {}; }
// Enforce jQuery.noConflict if not already performed
if (typeof(jQuery)!='undefined') { webpg.jq = jQuery.noConflict(true); }

/*
   Class: webpg.keymanager
        This class implements the methods to create/modify and interact
        with the key manager.
*/
webpg.keymanager = {

    /*
       Function: init
            Sets up the reference to the webpg.background class and related objects

        Parameters:
            browserWindow - <window> A reference to the main browser window/object
    */
    init: function(browserWindow) {
        var _ = webpg.utils.i18n.gettext;
        document.title = _("WebPG Key Manager");
        document.dir = (webpg.utils.isRTL() ? 'rtl' : 'ltr');
        if (webpg.utils.detectedBrowser['vendor'] == "mozilla") {
            webpg.background = browserWindow;
            webpg.secret_keys = browserWindow.webpg.secret_keys;
            webpg.plugin = webpg.background.webpg.plugin;
        } else if (webpg.utils.detectedBrowser['product'] == "chrome") {
            webpg.secret_keys = webpg.background.webpg.secret_keys;
            webpg.plugin = webpg.background.webpg.plugin;
        }

        webpg.utils.extension.version(function(version) {
            webpg.jq("#webpg-info-version-string").text(
                _("Version") + ": " + webpg.utils.escape(version)
            )
        });

        /*
            Global Variable: webpg.keymanager.qs
            Stores the items found in the query string
            Type: <dict>
        */
        // Define a global variable to store the location query string
        this.qs = {};
        gpgauth_enabled = false;

        // Assign the location.search value for the appropriate
        //  window to a local variable. window.location for normal
        //  windows, and window.parent.location for iframes that are
        //  loaded from XUL in Firefox
        var loc = (window.location.search.substring()) ?
            window.location.search.substring() :
            window.parent.location.search.substring();

        // Populate the global var "webpg.keymanager.qs" with the values
        loc.replace(
            new RegExp("([^?=&]+)(=([^&]*))?", "g"),
            function($0, $1, $2, $3) { webpg.keymanager.qs[$1] = $3; }
        );

        webpg.jq('#tab-2-btn').text(_("Private Keys"));
        webpg.jq('#tab-3-btn').text(_("Public Keys"));
        webpg.jq('#pubkey-search-lbl').text(_("Search/Filter") + ": ");
        webpg.jq("label[for=uid_0_name]", "#genkey-form").text(_("Your Name") + ":");
        webpg.jq("label[for=uid_0_email]", "#genkey-form").text(_("Your Email") + ":");
        webpg.jq("label[for=uid_0_comment]", "#genkey-form").text(_("Comment") + ":");
        webpg.jq("#passphrase").click(function(e) {
            webpg.jq(this).removeClass('input-error');
        })
        webpg.jq("label[for=passphrase]", "#genkey-form").text(_("Passphrase") + ":");
        webpg.jq("#pass_repeat").click(function(e) {
            webpg.jq(this).removeClass('input-error');
        })
        webpg.jq("label[for=pass_repeat]", "#genkey-form").text(_("Repeat Passphrase") + ":");
        webpg.jq(".trigger", "#genkey-form").find("strong").text(_("Advanced Options"));
        webpg.jq("label[for=publicKey_algo]", "#genkey-form").text(_("Public Key Algorithm"));
        webpg.jq("label[for=publicKey_size]", "#genkey-form").text(_("Public Key Size"));
        webpg.jq("label[for=subKey_algo]", "#genkey-form").text(_("Private Key Algorithm"));
        webpg.jq("label[for=subKey_size]", "#genkey-form").text(_("Private Key Size"));
        webpg.jq("label[for=key_expire]", "#genkey-form").text(_("Expire in") + " ");
        webpg.jq("option", "#key_expire, #gs_key_expire").each(function(e){
            switch(this.value) {
                case "0":
                    this.textContent = _("Never");
                    break;
                case "30":
                    this.textContent = _("n30 days");
                    break;
                case "90":
                    this.textContent = _("n90 days");
                    break;
                case "365":
                    this.textContent = _("n1 year")
                    break;
            }
        });
        webpg.jq("strong", "#gensubkey-form").first(_("Subkey Options"))
        webpg.jq("label[for=gs_subKey_algo]", "#genkey-form").text(_("Private Key Algorithm"));
        webpg.jq("option", "#gs_subKey_algo").each(function(e){
            switch(this.value) {
                case "3":
                    this.textContent = "DSA (" + _("Sign only").toLowerCase() + ")";
                    break;
                case "4":
                    this.textContent = "RSA (" + _("Sign only").toLowerCase() + ")";
                    break;
                case "5":
                    this.textContent = "Elgamal (" + _("encrypt only").toLowerCase() + ")";
                    break;
                case "6":
                    this.textContent = "RSA (" + _("encrypt only").toLowerCase() + ")";
                    break;
                case "7":
                    this.textContent = "DSA (" + _("set your own capabilities").toLowerCase() + ")";
                    break;
                case "8":
                    this.textContent = "RSA (" + _("set your own capabilities").toLowerCase() + ")";
                    break;
            }
        });
        webpg.jq("input", "#subKey_flags").each(function(e) {
            webpg.jq("label[for=" + this.id + "]").text((this.name == "sign") ? _("Sign") :
                (this.name == "enc") ? _("Encrypt") :
                (this.name == "auth") ? _("Authenticate") : ""
            );
        });
        webpg.jq("label[for=gs_subKey_size]", "#genkey-form").text(_("Private Key Size"));
        webpg.jq("label[for=gs_key_expire]", "#genkey-form").text(_("Expire in") + " ");
        webpg.jq("#au-uid_0_name").click(function(e) {
            webpg.jq(this).removeClass('ui-state-error');
        });
        webpg.jq("label[for=au-uid_0_name]", "#adduid-form").text(_("Your Name") + ":");
        webpg.jq("#au-uid_0_email").click(function(e) {
            webpg.jq(this).removeClass('ui-state-error');
        });
        webpg.jq("label[for=au-uid_0_email]", "#adduid-form").text(_("Your Email") + ":");
        webpg.jq("#au-uid_0_comment").click(function(e) {
            webpg.jq(this).removeClass('ui-state-error');
        });
        webpg.jq("label[for=au-uid_0_email]", "#adduid-form").text(_("Comment") + ":");

        webpg.jq("#revkey-confirm").attr("title", _("Revoke this Key") + "?");
        webpg.jq("#revuid-confirm").attr("title", _("Revoke this UID") + "?");
        webpg.jq("#revsig-confirm").attr("title", _("Revoke this Signature") + "?");
        webpg.jq("#delsig-confirm").attr("title", _("Delete this Signature") + "?");
        webpg.jq("#deluid-confirm").attr("title", _("Delete this UID") + "?");
        webpg.jq("#delete-key-dialog-confirm").attr("title", _("Delete this Key") + "?");
        webpg.jq("#delete-key-confirm-text").text(_("This key will be permanently deleted") +
            ". " + _("Are you sure") + "?");
        webpg.jq("#keyexp-dialog").attr("title", _("Change Expiration"));
        webpg.jq("#createsig-dialog").attr("title", _("Sign this UID"));
        webpg.jq("#genkey-dialog, #gensubkey-dialog").attr("title", _("Key Details"));
        webpg.jq("#export-dialog").attr("title", _("Export Public Key"));
        webpg.jq("#adduid-dialog").attr("title", _("Add UID"));
        
        
        
        webpg.jq('#revkey-text').text(_("Are you sure you wish to revoke this Key") + "?");
        webpg.jq('#revuid-text').text(_("Are you sure you wish to revoke this UID") + "?");
        webpg.jq('#revsig-text').text(_("Are you sure you wish to revoke this Signature") + "?");
        webpg.jq('#delsig-text').text(_("Are you sure you wish to delete this Signature") + "?");
        webpg.jq('#deluid-text').text(_("Are you sure you want to permanently delete this UID") + "?");
        webpg.jq('#keyexp-text').text(_("New Expiration Date") + ":");
        webpg.jq('#keyexp-never').button({"label": _("Never Expire")});
        webpg.jq('#keyexp-ondate').button({"label": _("Expiration Date")});

        // Build the Private keylist on tab selection 
        webpg.jq('#tab-2-btn').click(function(){
            webpg.keymanager.buildKeylistProxy(
                null, 'private', null, null, null, true
            );
        });

        // Build the Public keylist on tab selection
        webpg.jq('#tab-3-btn').click(function(){
            webpg.keymanager.buildKeylistProxy(
                null, 'public', null, null, null, true
            );
        });

        var selected_tab = webpg.keymanager.qs.tab ? webpg.keymanager.qs.tab : 0;
        openKey = (webpg.keymanager.qs.openkey)? webpg.keymanager.qs.openkey : null;
        if (openKey) {
            if (openKey in webpg.secret_keys){
                selected_tab = 0;
            } else {
                selected_tab = 1;
            }
        }
        var openSubkey = (webpg.keymanager.qs.opensubkey)? webpg.keymanager.qs.opensubkey : null;
        var openUID = (webpg.keymanager.qs.openuid)? webpg.keymanager.qs.openuid : null;
        webpg.jq('#tabs').tabs({ selected: selected_tab });

        if (selected_tab == 0)
            webpg.keymanager.buildKeylistProxy(
                null, 'private', openKey, openSubkey, openUID, true
            );
        if (selected_tab == 1)
            webpg.keymanager.buildKeylistProxy(
                null, 'public', openKey, openSubkey, openUID, true
            );
        if (webpg.keymanager.qs.strip) {
            webpg.jq("#header").remove();
            webpg.jq(document.getElementsByTagName("ul")[0]).remove();
        }
        if (webpg.utils.detectedBrowser['product'] == 'opera') {
            webpg.jq('#close').button().button("option", "label", _("Finished"))
                .click(function(e) {
                    var popup = opera.extension.bgProcess.opera.contexts.toolbar[0];
                    opera.extension.bgProcess.window.setTimeout(function() {
                        opera.extension.bgProcess.opera.contexts.toolbar.removeItem(popup);
                        opera.extension.bgProcess.opera.contexts.toolbar.addItem(popup);
                    }, 1);
                    opera.extension.bgProcess.opera.contexts.toolbar.removeItem(popup);
            });
        }

        if (webpg.utils.detectedBrowser['vendor'] == "mozilla")
            webpg.jq('#window_functions').hide();

        webpg.jq('#close').button().button("option", "label", _("Finished"))
            .click(function(e) { window.top.close(); });

        webpg.jq('ul.expand').each(function(){
            webpg.jq('li.trigger', this).filter(':first').addClass('top').end().filter(':not(.open)').next().hide();
            webpg.jq('li.trigger', this).click(function(){
                var height = (webpg.jq("#genkey-status").length > 0) ? webpg.jq("#genkey-status").height() : 0;
                if(webpg.jq(this).hasClass('open')) {
                    webpg.jq(this).removeClass('open').next().slideUp();
                    webpg.jq("#genkey-dialog").dialog("option", "minHeight", 300 + height);
                } else {
                    webpg.jq(this).parent().find('li.trigger').removeClass('open').next().filter(':visible').slideUp();
                    webpg.jq(this).addClass('open').next().slideDown(300, function() {
                        webpg.jq("#genkey-dialog").dialog("option", "minHeight",
                            webpg.jq("#genkey-dialog")[0].scrollHeight + webpg.jq('li.trigger').parent().parent().innerHeight()
                        )
                    });
                }
            });
        });
    },

    /*
       Function: buildKeylistProxy
            Calls the buildKeyList method if the desired keylist is not already
            built (unless forced), after setting the wait dialog

        Parameters:
            keyList - <JSON obj> A JSON object containing the keys and their associated data
            type - <str> The type of keylist being generated ("public"/"private")
            openKey - <str> The ID for the Key to render in the open (viewing) status
            openSubkey - <str> The ID for the Subkey to render in the open (viewing) status
            openUID - <int> The index number for the UID to render in the open (viewing) status
            changedTab - <bool> Passed if we are just changing tabs
    */
    buildKeylistProxy: function(keyList, type, openKey, openSubkey, openUID, changedTab) {
        if (changedTab && type == "public" && webpg.keymanager.public_built)
            return;
        if (changedTab && type == "private" && webpg.keymanager.private_built)
            return;

        var _ = webpg.utils.i18n.gettext;

        webpg.jq("#dialog-modal").dialog({
            'height': 140,
            'modal': true,
            'autoOpen': true,
            'title': "Building Key list"
        }).animate({"top": window.scrollY}, 1, function() {
            webpg.jq('#dialog-msg').text("Please wait while we build the key list.");
            webpg.jq(this).animate({"top": window.scrollY + webpg.jq(this).innerHeight() + 100}, 1,
            function() {
                webpg.keymanager.buildKeylist(
                    keyList, type, openKey,
                    openSubkey, openUID
                );
                webpg.jq("#dialog-modal").dialog('close');
                if (webpg.keymanager.qs.helper) {
                    function bounce(elem_class, left, top, perpetual) {
                        var nleft = webpg.jq(webpg.jq(elem_class)[0]).parent().offset().left - left;
                        var ntop = webpg.jq(webpg.jq(elem_class)[0]).parent().offset().top - top;
                        webpg.jq("#error_help").parent().css('left', nleft).css('top', ntop).
                            effect("bounce", {'times': 1, 'direction': 'up', 'distance': 8 }, 1200, function(){ if (perpetual) { bounce(elem_class, left, top, perpetual) } } )
                    }
                    var helper_arrow = document.createElement('div');
                    webpg.jq(helper_arrow).html('' +
                        '<div id="error_help">' +
                        '<div id="help_text"></div>' +
                        '<span style="margin-left: 94px;"><img width="30px" src="skin/images/help_arrow.png"></span>' +
                        '</div>');
                    helper_arrow.style.position = 'absolute';
                    helper_arrow.style.zIndex = 1000;
                    webpg.jq(helper_arrow).css("max-width", "75%");
                    switch(webpg.keymanager.qs.helper){
                        case 'generate':
                            webpg.jq(helper_arrow).find('#help_text').text(_("Click to generate a new key"));
                            document.body.appendChild(helper_arrow);
                            webpg.jq('#generate-key-btn').click(function() {
                                webpg.jq(helper_arrow).stop(true, true).stop(true, true);
                                document.body.removeChild(helper_arrow.parentElement);
                                webpg.keymanager.qs.helper = "";
                            });
                            bounce('#generate-key-btn', 5, 44, true);
                            break;
                        case 'enable':
                            webpg.jq(helper_arrow).find('#help_text').text(_("Click to enable key"))[0].style.minWidth = "150px";
                            document.body.appendChild(helper_arrow);
                            webpg.jq('.enable-check').click(function() {
                                webpg.jq(helper_arrow).stop(true, true).stop(true, true);
                                document.body.removeChild(helper_arrow.parentElement);
                                webpg.keymanager.qs.helper = "";
                            });
                            bounce('.enable-check', 65, 50, true);
                            break;
                        case 'default':
                            webpg.jq(helper_arrow).find('#help_text').text(_("Click to set default key"));
                            webpg.jq('.default-check').click(function() {
                                webpg.jq(helper_arrow).stop(true, true).stop(true, true);
                                document.body.removeChild(helper_arrow.parentElement);
                                webpg.keymanager.qs.helper = "";
                            });
                            document.body.appendChild(helper_arrow);
                            bounce('.default-check', 40, 45, true);
                            break;
                        case 'signuids':
                            webpg.jq(helper_arrow).find('#help_text').text("Below is a list of key IDs that represent the domains that this server key is valid for; please sign the domain IDs that you want to use with webpg.");
                            document.body.appendChild(helper_arrow);
                            bounce('#disable-public-' + openKey, 15, 15, false);
                            break;
                    }
                }
            });
        })

        if (type == "public")
            webpg.keymanager.public_built = true;

        if (type == "private")
            webpg.keymanager.private_built = true;

    },

    progressMsg: function(evt) {
        var _ = webpg.utils.i18n.gettext;
        var msg = (webpg.utils.detectedBrowser['vendor'] == "mozilla") ? evt.detail : evt;
        var dialog = (webpg.jq("#genkey-dialog").dialog("isOpen") == true) ?
            "#genkey" : (webpg.jq("#gensubkey-dialog").dialog("isOpen") == true) ?
            "#gensubkey" : null;
        if (dialog && msg.type == "progress") {
            var data = msg.data;
            if (!isNaN(data))
                data = String.fromCharCode(data);
            data += " ";
            webpg.jq(dialog + "_progress").append(data);
            var waitMsg = (msg.data == 43) ? _("Generating Key") : _("Waiting for entropy");
            webpg.jq(dialog + "-status").text(_("Building key") + " " + _("please wait") + " [" + waitMsg + "]");
            if (data == "complete" || data == "complete ") {
                webpg.keymanager.genkey_refresh = true;
                webpg.keymanager.genkey_waiting = false;
                var gen_dialog = dialog + "-dialog";
                var new_pkeylist = webpg.plugin.getPrivateKeyList();
                var generated_key = (dialog == "#gensubkey") ?
                    webpg.jq(gen_dialog).find("#gensubkey-form")[0].key_id.value
                        : null;
                if (dialog == "#genkey") {
                    for (var key in new_pkeylist) {
                        if (key in webpg.keymanager.pkeylist == false) {
                            generated_key = key;
                            break;
                        }
                    }
                }
                var subkey_index = (dialog == "#gensubkey") ? 0 : null;
                if (dialog == "#gensubkey") {
                    if (webpg.secret_keys.hasOwnProperty(generated_key)) {
                        for (subkey in webpg.secret_keys[generated_key].subkeys) {
                            subkey_index = parseInt(subkey) + 1;
                        }
                    }
                }
                webpg.keymanager.buildKeylistProxy(null, "private",
                    generated_key, subkey_index, null);
                webpg.jq(dialog + "-status_detail").remove()
                webpg.jq(dialog + "-status").remove();
                webpg.jq(dialog + "-form")[0].reset();
                webpg.jq(dialog + "-form")[0].style.display="inline-block";
                webpg.jq(dialog + "-dialog").dialog("close");
            } else if (data.search("failed") > -1) {
                webpg.keymanager.genkey_waiting = false;
                webpg.jq(dialog + "-status").html("Generation " +
                    webpg.utils.escape(data));
                webpg.jq(dialog + "-dialog").dialog("option", "buttons", [{ 
                    'text': _("Close"),
                    'click': function() {
                        if (dialog == "#gensubkey")
                             webpg.jq(dialog + "-dialog").dialog("option", "height", 320);
                        webpg.jq(dialog + "_progress").html("");
                        webpg.jq(dialog + "-status_detail").remove()
                        webpg.jq(dialog + "-status").remove();
                        webpg.jq(dialog + "-form")[0].reset();
                        webpg.jq(dialog + "-form")[0].style.display="inline-block";
                        webpg.jq(dialog + "-dialog").dialog("close");
                    }
                }]);

            }
        }
    },

    /*
       Function: buildKeylist
            Generates the formatted, interactive keylist and populates the DOM.
            This function is a mess and needs some serious attention; it is
            ugly, but works quickly for what all it does.

        Parameters:
            keyList - <JSON obj> A JSON object containing the keys and their associated data
            type - <str> The type of keylist being generated ("public"/"private")
            openKey - <str> The ID for the Key to render in the open (viewing) status
            openSubkey - <str> The ID for the Subkey to render in the open (viewing) status
            openUID - <int> The index number for the UID to render in the open (viewing) status 
    */
    buildKeylist: function(keylist, type, openKey, openSubkey, openUID){
        var _ = webpg.utils.i18n.gettext;
        var scrub = webpg.utils.escape;
        //console.log(keyList, type, openKey, openSubkey, openUID);
        refresh_trust = function(item, type) {
            if (this.debug) console.log("refresh requested for type: " + type);
            if (type == 'private') {
                webpg.jq("#dialog-modal:ui-dialog").dialog( "destroy" );
                return false;
            }
            if (item.parentNode.parentNode && item.parentNode.parentNode.nodeName == "H3") {
                var uidcontainer = item.parentNode.parentNode.parentNode.children[1];
            } else {
                var uidcontainer = item.parentNode.parentNode.children[1];
            }
            var uidlist = webpg.jq(uidcontainer).children('[class~=uid]');
            var keylist = (!webpg.keymanager.public_built) ? webpg.keymanager.publickeylist : webpg.plugin.getPublicKeyList();
            if (!keylist) {
                // if the parsing failed, create an empty keylist
                var keylist = {};
            }
            var key = uidcontainer.id;
            var GAUTrust = -1;
            uidlist.each(function(event, uidobj) {
                var uid = uidobj.id.split('-')[1];
                var enabled_keys = webpg.preferences.enabled_keys.get();
                for (privateKeyId in enabled_keys) {
                    GAUTrust = webpg.plugin.verifyDomainKey(keylist[key].uids[uid].uid, key, uid, enabled_keys[privateKeyId]);
                    if (GAUTrust == 0) {
                        break;
                    }
                }
                var validity = keylist[key].uids[uid].validity;
                webpg.jq(uidobj).find('.trust')[0].textContent = validity + ' | gpgAuth ' + _("trust") + ': ' + GAUTrust;
            });
            webpg.jq("#dialog-modal:ui-dialog").dialog( "destroy" );
        }

        if (type == 'public') {
            var keylist_element = document.getElementById('public_keylist');
        } else {
            var keylist_element = document.getElementById('private_keylist');
            var enabled_keys = webpg.preferences.enabled_keys.get();
        }

        if (!keylist) {
            if (type == 'public') {
                var find = webpg.jq("#pubkey-search")[0].value;
                if (find.length > 0) {
                    if (find.search(":") > -1) {
                        var keylist = webpg.plugin.getPublicKeyList();
                        webpg.jq("#pubkey-search")[0].value = '';
                    } else {
                        var keylist = webpg.plugin.getNamedKey(find);
                    }
                } else {
                    var keylist = (!webpg.keymanager.public_built) ? webpg.keymanager.publickeylist : webpg.plugin.getPublicKeyList();
                }

                if (!keylist) {
                    // if the parsing failed, create an empty keylist
                    var keylist = {};
                }
            } else {
                keylist = webpg.plugin.getPublicKeyList();
            }
            var pkeylist = webpg.plugin.getPrivateKeyList();

            if (!pkeylist) {
                // if the parsing failed, create an empty keylist
                var pkeylist = {};
            }
            webpg.keymanager.pubkeylist = keylist;
            webpg.keymanager.pkeylist = pkeylist;
        } else {
            var pkeylist = webpg.plugin.getPrivateKeyList();
            webpg.keymanager.pkeylist = pkeylist;
        }

        webpg.jq(keylist_element).html("<div class='ui-accordion-left'></div>");

        if (type == 'private') {
            // Create the key-generate button and dialog
            var genkey_div = document.createElement('div');
            genkey_div.style.padding = "8px 0 20px 0";
            var genkey_button = document.createElement('input');
            genkey_button.setAttribute('value', _('Generate New Key'));
            genkey_button.setAttribute('type', 'button');
            genkey_button.setAttribute('id', 'generate-key-btn');
            webpg.jq(genkey_button).button().click(function(e){
                webpg.keymanager.genkey_refresh = false;
                webpg.jq("#genkey-dialog").dialog({
                    "position": "top",
                    "buttons": [
                    {
                        'text': _("Create"),
                        'click': function() {
                            var form = webpg.jq(this).find("#genkey-form")[0];
                            webpg.jq(form).parent().before("<div id=\"genkey-status\"> </div>");
                            var error = "";
                            if (!form.uid_0_name.value){
                                error += _("Name Required") + "<br>";
                                webpg.jq(form.uid_0_name).addClass("ui-state-error");
                            }
                            if (form.uid_0_name.value.length < 5){
                                error += _("UID Names must be at least 5 characters") + "<br>";
                                webpg.jq(form.uid_0_name).addClass("ui-state-error");
                            } else {
                                webpg.jq(form.uid_0_name).removeClass("ui-state-error");
                            }
                            if (!isNaN(form.uid_0_name.value[0])){
                                error += _("UID Names cannot begin with a number") + "<br>";
                                webpg.jq(form.uid_0_name).addClass("ui-state-error");
                            } else {
                                webpg.jq(form.uid_0_name).removeClass("ui-state-error");
                            }
                            if (form.uid_0_email.value && !webpg.utils.
                                isValidEmailAddress(form.uid_0_email.value)){
                                error += _("Not a valid email address") + "<br>";
                                webpg.jq(form.uid_0_email).addClass("ui-state-error");
                            } else {
                                webpg.jq(form.uid_0_email).removeClass("ui-state-error");
                            }
                            if (form.passphrase.value != form.pass_repeat.value){
                                webpg.jq(form.passphrase).addClass("ui-state-error");
                                webpg.jq(form.pass_repeat).addClass("ui-state-error");
                                webpg.jq(form.passphrase).next()
                                    .find("#passwordStrength-text")
                                    .html(_("Passphrases do not match"))
                                    .css({"color": "#f00"});
                                error += _("Passphrases do not match") + "<br>";
                            } else {
                                webpg.jq(form.passphrase).removeClass("ui-state-error");
                                webpg.jq(form.pass_repeat).removeClass("ui-state-error");
                            }
                            if (error.length) {
                                webpg.jq("#genkey-status").html(error)[0].style.display="block";
                                webpg.jq("#genkey-dialog").dialog("option", "minHeight", 350);
                                return false;
                            }
                            webpg.keymanager.genkey_waiting = true;
                            if (webpg.utils.detectedBrowser['product'] == "chrome") {
                                chrome.extension.onConnect.addListener(function(port) {
                                    port.onMessage.addListener(webpg.keymanager.progressMsg);
                                });
                            }
                            webpg.jq("#genkey-form").find(".open").trigger("click");
                            console.log("going to create a key with the following details:" + '\n' +
                                "Primary Key:", form.publicKey_algo.value + 
                                  ' (' + form.publicKey_size.value + ')\n' +
                                "Sub Key:", form.subKey_algo.value + 
                                  ' (' + form.subKey_size.value + ')\n' +
                                "name:", form.uid_0_name.value + '\n' +
                                "comment: ", form.uid_0_name.value + '\n' +
                                "email:", form.uid_0_email.value + '\n' +
                                "passphrase:", '<omitted>' +  '\n' +
                                "expiration:", "Key will expire in " + form.key_expire.value + ' days');
                            webpg.jq("#genkey-dialog").dialog("option", "minHeight", 300);
                            webpg.jq("#genkey-status").html(error)[0].style.display="block";
                            webpg.jq("#genkey-status").html(_("Building key, please wait"));
                            webpg.jq("#genkey-status").after("<div id='genkey-status_detail' style=\"font-size: 12px; color:#fff;padding: 20px;\">" + _("This may take a long time (5 minutes or more) to complete") + ". " + _("Please be patient while the key is created") + ". " + _("It is safe to close this window") + ", " + _("key generation will continue in the background") + ".<br><br><div id='genkey_progress' style='height:auto;display:block;'></div></div>");
                            webpg.jq(form)[0].style.display = "none";
                            webpg.jq("#genkey-dialog")[0].style.height = "20";
                            webpg.jq("#genkey-dialog")[0].style.display = "none";
                            response = webpg.plugin.gpgGenKey(form.publicKey_algo.value,
                                form.publicKey_size.value,
                                form.subKey_algo.value,
                                form.subKey_size.value,
                                form.uid_0_name.value,
                                form.uid_0_comment.value,
                                form.uid_0_email.value,
                                form.key_expire.value,
                                form.passphrase.value
                            );
                            if (response == "queued") {
                                webpg.jq("#genkey-dialog").dialog("option", "buttons", [{ 
                                    'text': _("Close"),
                                    'click': function() {
                                        webpg.jq("#genkey-dialog").dialog("close");
                                    }
                                }]);
                            }
                        },
                    }, {
                        'text': _("Cancel"),
                        'click': function() {
                            webpg.jq("#genkey-dialog").dialog("close");
                            if (webpg.keymanager.genkey_refresh)
                                webpg.keymanager.buildKeylistProxy(null, 'private');
                        }
                    }]
                }).parent().animate({"top": window.scrollY}, 1, function() {
                    webpg.jq(this).animate({"top": window.scrollY + webpg.jq(this).innerHeight()
                        / 3}, 1);
                });

                webpg.jq("#genkey-form").children('input').removeClass('input-error');
                webpg.jq("#genkey-form")[0].reset();
                webpg.jq('.key-algo').each(function(){
                    //webpg.jq(this)[0].options.selectedIndex = webpg.jq(this)[0].options.length - 1;
                    if (webpg.jq(this).parent().next().find('.key-size').length) {
                        webpg.jq(this).parent().next().find('.key-size')[0].children[0].disabled = true;
                        webpg.jq(webpg.jq(this).parent().next().find('.key-size')[0].children[0]).hide();
                    }
                }).change(function(){
                    if (webpg.jq(this)[0].options.selectedIndex == 0){
                        // DSA Selected
                        console.log("DSA");
                        webpg.jq(this).parent().next().find('.key-size')[0].children[0].disabled = false;
                        webpg.jq(webpg.jq(this).parent().next().find('.key-size')[0].children[0]).show();
                        webpg.jq(this).parent().next().find('.key-size')[0].children[4].disabled = true;
                        webpg.jq(webpg.jq(this).parent().next().find('.key-size')[0].children[4]).hide();
                        webpg.jq(this).parent().next().find('.key-size')[0].options.selectedIndex = 2;
                    } else if(webpg.jq(this)[0].options.selectedIndex == 1){
                        // RSA Selected
                        console.log("RSA");
                        webpg.jq(this).parent().next().find('.key-size')[0].children[0].disabled = true;
                        webpg.jq(webpg.jq(this).parent().next().find('.key-size')[0].children[0]).hide();
                        webpg.jq(this).parent().next().find('.key-size')[0].children[4].disabled = false;
                        webpg.jq(webpg.jq(this).parent().next().find('.key-size')[0].children[4]).show();
                        webpg.jq(this).parent().next().find('.key-size')[0].options.selectedIndex = 2;
                    } else {
                        // Elgamal Selected
                        console.log("Elgamal");
                        webpg.jq(this).parent().next().find('.key-size')[0].children[0].disabled = false;
                        webpg.jq(webpg.jq(this).parent().next().find('.key-size')[0].children[0]).show();
                        webpg.jq(this).parent().next().find('.key-size')[0].children[4].disabled = false;
                        webpg.jq(webpg.jq(this).parent().next().find('.key-size')[0].children[4]).show();
                        webpg.jq(this).parent().next().find('.key-size')[0].options.selectedIndex = 2;
                    }
                });
                webpg.jq("#genkey-dialog").dialog('open');
                webpg.jq("#genkey-form").find(".open").trigger("click");
            });
            webpg.jq("#genkey-dialog").dialog({
                'resizable': true,
                'minHeight': 300,
                'width': 630,
                'modal': true,
                'autoOpen': false
            }).parent().animate({"top": window.scrollY}, 1, function() {
                webpg.jq(this).animate({"top": window.scrollY + webpg.jq(this).innerHeight()
                    / 3}, 1);
            });
            webpg.jq('.passphrase').passwordStrength("#pass_repeat");
            genkey_div.appendChild(genkey_button);
            document.getElementById('private_keylist').appendChild(genkey_div);
            // End key generation dialog
            webpg.keymanager.private_built = true;
        }
        // End key-generate button and dialog

        var prev_key = null;
        var current_keylist = (type == 'public')? keylist : pkeylist;
        var tpublic_keylist = webpg.keymanager.pubkeylist; //webpg.plugin.getPublicKeyList();
        var default_key_s = webpg.preferences.default_key.get();
        var existing_groups = webpg.preferences.group.get_group_names();

        if (!webpg.plugin.webpg_status.openpgp_detected)
            return false;

        for (var key in current_keylist){
            if (type == 'public') {
                if (key in pkeylist) {
                    continue;
                }
            } else {
                var keyobj = document.createElement('div');
                if (current_keylist[key].disabled)
                    keyobj.className = 'disabled';
                if (current_keylist[key].expired)
                    keyobj.className = 'invalid-key';
                if (current_keylist[key].invalid)
                    keyobj.className = 'invalid-key';
                if (current_keylist[key].revoked)
                    webpg.jq(keyobj).addClass('invalid-key');
                keyobj.className += ' primary_key';
                var enabled = (enabled_keys.indexOf(key) != -1) ? 'checked' : '';
                var status_text = (enabled) ? _("Enabled") : _("Disabled");
                var default_key = (key == default_key_s) ? 'checked' : '';
            }
            var status = _("Valid");
            var keyobj = document.createElement('div');
            if (current_keylist[key].disabled) {
                webpg.jq(keyobj).addClass('disabled');
                status = _("Disabled");
            }
            if (current_keylist[key].expired) {
                webpg.jq(keyobj).addClass('invalid-key');
                status = _("Expired");
            }
            if (current_keylist[key].invalid) {
                webpg.jq(keyobj).addClass('invalid-key');
                status = _("Invalid");
            }
            if (current_keylist[key].revoked) {
                webpg.jq(keyobj).addClass('invalid-key');
                status = _("Revoked");
            }
            webpg.jq(keyobj).addClass('primary_key');
            if (key == openKey) {
                webpg.jq(keyobj).addClass('open_key');
                keyobj.setAttribute('id', 'open_key');
            }
            var email = (current_keylist[key].email.length > 1) ?
                "&lt;" + scrub(current_keylist[key].email) + "&gt;" :
                "(" + _("no email address provided") + ")";
            if (type == "public") {
                webpg.jq(keyobj).html("<h3 class='public_keylist'><a href='#' name='" + scrub(key) + "'><span style='margin: 0;width: 25%;min-width:200px; display:inline-table;'>" + scrub(current_keylist[key].name) + "</span><span>" + email + "</span><span class='trust' style='float:" + ((webpg.utils.isRTL()) ? "right" : "left") + "'></span></a></h3>");
            } else {
                webpg.jq(keyobj).html("<h3 class='private_keylist' style='height: 29px;'><a href='#' name='" + scrub(key) + "'><span style='margin: 0;width: 25%;min-width:200px; display:inline-table;'>[" + key.substr(-8) + "] " + scrub(current_keylist[key].name) + 
                    "</span><span>" + email + "</span></a><span class='trust' style='z-index:1000; left: 4px; top:-30px;height:22px;float:" + ((webpg.utils.isRTL()) ? "left" : "right") + "'>" +
                    "<span class='keyoption-help-text' style=\"margin: 0 14px;position:relative;top:2px;\">&nbsp;</span>" +
                    "<input class='enable-check' id='check-" + scrub(key) +"' type='checkbox' " + enabled + "/\><label class='enable-check-text' for='check-" + scrub(key) + "' style='z-index:100;height:29px;'>" + scrub(status_text) + "</label><input class='default-check' type='radio' name='default_key' " +
                    " id='default-" + scrub(key) + "' " + scrub(default_key) + "/\><label class='default-check' dir='ltr' style='z-index:0;margin-left:0px;height:29px;' for='default-" + scrub(key) + "'>Set as default</label></span></h3>");
            }
            keylist_element.appendChild(keyobj);
            webpg.jq(keyobj).find('.enable-check').click(function(e){
                var checked_id = this.id.split("-")[1];
                if (webpg.preferences.enabled_keys.has(checked_id) && 
                    checked_id == webpg.preferences.default_key.get()){
                    webpg.jq(this).next().addClass('ui-state-active');
                    webpg.jq(this).parent().children('.keyoption-help-text').html("<span style=\"color:f6f;\">" + _("Cannot unset your default key") + "</span>");
                    return false;
                }
                if (this.checked && !webpg.preferences.default_key.get()) {
                    webpg.jq(this).next().next().click();
                    webpg.jq(this).next().next().next().addClass('ui-state-active');
                }
                if (this.checked == true) {
                    webpg.preferences.enabled_keys.add(checked_id);
                    webpg.jq("#enable-private-" + checked_id).click();
                } else {
                    webpg.preferences.enabled_keys.remove(checked_id);
                    webpg.jq("#disable-private-" + checked_id).click();
                }
//                (this.checked) ? webpg.preferences.enabled_keys.add(this.id.split("-")[1]) :
//                    webpg.preferences.enabled_keys.remove(this.id.split("-")[1]);
                (this.checked) ? webpg.jq(this).button('option', 'label', _('Enabled')) :
                    webpg.jq(this).button('option', 'label', _('Disabled'));
            });
            webpg.jq(keyobj).find('.default-check').click(function(e){
                var clicked_id = this.id.split("-")[1];
                if (clicked_id == webpg.preferences.default_key.get()) {
                    webpg.jq(this).parent().children('.keyoption-help-text').html("<span style=\"color:f6f;\">" + _("Cannot unset your default key") + "</span>");
                }
            });
            current_keylist[key].nuids = 0;
            for (var uid in current_keylist[key].uids) {
                current_keylist[key].nuids += 1;
            }
            var uidlist = document.createElement('div');
            uidlist.setAttribute('class', 'uidlist');
            uidlist.setAttribute('id', scrub(key));
            var created_date = new Date(current_keylist[key].subkeys[0].created * 1000).toJSON().substring(0, 10);
            var expiry = (current_keylist[key].subkeys[0].expires == 0) ? 'Never' : new Date(current_keylist[key].subkeys[0].expires * 1000).toJSON();
            if (current_keylist[key].subkeys[0].expires > 0) {
                expiry = (Math.round(new Date().getTime()/1000.0) > current_keylist[key].subkeys[0].expires) ? _("Expired") + " [" + expiry.substring(0, 10) + "]" : expiry.substring(0, 10);
            }
            var options_list = [];
            var option = {};
            if (type == "private") {
                option = {
                    "command" : "trust",
                    "text" : _("Trust Assignment"),
                    "input_type" : "list",
                    "list_values" : [_("Unknown"), _("Never"), _("Marginal"), _("Full"), _("Ultimate")],
                    "type" : "trust"
                }
                options_list[options_list.length] = option;
                var group_list = [_("None"), _("New group")];
                group_list = group_list.concat(existing_groups);
                option = {
                    "command" : "group",
                    "text" : _("Group Assignment"),
                    "input_type" : "list",
                    "list_values" : group_list,
                    "type" : "group"
                }
                options_list[options_list.length] = option;
                option = {
                    "command" : "expire",
                    "text" : _("Change Expiration"),
                    "input_type" : "calendar"
                }
                options_list[options_list.length] = option;
                option = {
                    "command" : "passphrase",
                    "text" : _("Change Passphrase"),
                    "input_type" : "button"
                }
                options_list[options_list.length] = option;
                option = {
                    "command" : "adduid",
                    "text" : _("Add UID"),
                    "input_type" : "dialog"
                }
                options_list[options_list.length] = option;
                option = {
                    "command" : "addsubkey",
                    "text" : _("Add Subkey"),
                    "input_type" : "dialog"
                }
                options_list[options_list.length] = option;
            } else {
                option = {
                    "command" : "trust",
                    "text" : _("Trust Assignment"),
                    "input_type" : "list",
                    "list_values" : [_("Unknown"), _("Never"), _("Marginal"), _("Full"), _("Ultimate")],
                    "type" : "trust"
                }
                options_list[options_list.length] = option;
                var group_list = [_("None"), _("New group")];
                group_list = group_list.concat(existing_groups);
                option = {
                    "command" : "group",
                    "text" : _("Group Assignment"),
                    "input_type" : "list",
                    "list_values" : group_list,
                    "type" : "group"
                }
                options_list[options_list.length] = option;
            }
            var compiled_option_list = "";
            for (var option_i in options_list){
                option = options_list[option_i];
                switch(option.input_type) {
                    case "button":
                        compiled_option_list += "<span class='uid-options'><input class='" + 
                            type + "-key-option-button' id='" + scrub(option.command) + "-" + scrub(type) + "-" + scrub(key) + 
                                "' type='button' value='" + scrub(option.text) + "'/\></span>";
                        break;

                    case "dialog":
                        compiled_option_list += "<span class='uid-options'><input class='" + 
                            type + "-key-option-button' id='" + scrub(option.command) + "-" + scrub(type) + "-" + scrub(key) + 
                                "' type='button' value='" + scrub(option.text) + "'/\></span>";
                        break;

                    case "calendar":
                        compiled_option_list += "<span class='uid-options'><input class='" + 
                            type + "-key-option-button' id='" + scrub(option.command) + "-" + scrub(type) + "-" + scrub(key) + 
                                "' type='button' value='" + scrub(option.text) + "'/\></span>";
                        break;

                    case "list":
                        var style = (webpg.utils.detectedBrowser['vendor'] == 'mozilla') ?
                            'position: relative; top: -16px;' : 'margin-top:-10px;';
                        compiled_option_list += "<span class='uid-options' style='" + scrub(style) + "'>" +
                            "<label for='" + scrub(option.command) + "-" + scrub(type) + "-" + scrub(key) + 
                            "'>" + scrub(option.text) + "</label><select class='" + 
                            scrub(type) + "-key-option-list ui-button ui-corner-all ui-button ui-widget ui-state-default' id='" + 
                            scrub(option.command) + "-" + scrub(type) + "-" + scrub(key) + "' style=\"text-align:left; margin-right: 10px;\">";
                        for (var listitem in option.list_values) {
                            if (option.type == "trust") {
                                if (option.list_values[listitem].toLowerCase() == current_keylist[key].owner_trust)
                                    var selected = "selected";
                                else
                                    var selected = "";
                            } else if (option.type == "group") {
                                var key_group = webpg.preferences.group.get_groups_for_key(key);
                                key_group = (key_group.length) ? key_group[0].toLowerCase() : '';
                                if (option.list_values[listitem].toLowerCase() == key_group)
                                    var selected = "selected";
                                else
                                    var selected = "";
                            }
                            compiled_option_list += "<option class=\"ui-state-default\" value=\"" + 
                                option.list_values[listitem] + "\" " + 
                                selected + ">" + option.list_values[listitem] + "</option>";
                        }
                        compiled_option_list += "</select></span>";
                        break;

                    case "multilist":
                        compiled_option_list += "<span class='uid-options' style='margin-top:-10px;'>" +
                            "<label for='" + scrub(option.command) + "-" + scrub(type) + "-" + scrub(key) + 
                            "' style=\"display:block; margin-right: 24px;\">" + scrub(option.text) + "</label><input class='" + 
                            scrub(type) + "-key-option-list ui-corner-all ui-widget ui-state-default' id='" + 
                            scrub(option.command) + "-" + scrub(type) + "-" + scrub(key) + "' style=\"text-align:left;height:25px; margin-right: 10px;\"/></span>";
                        break;
                }
            }
            var keystatus = (current_keylist[key].disabled) ? 'enable':'disable';
            var keystatus_text = (current_keylist[key].disabled)? _('Enable this Key'):_('Disable this Key');
            var key_option_button = "<span class='uid-options' style='font-size:12px;'><input class='" + 
                    scrub(type) + "-key-option-button' id='" + scrub(keystatus) + "-" + scrub(type) + "-" + scrub(key) + 
                        "' type='button' value='" + scrub(keystatus_text) + "'/\></span>";
            var uidlist_innerHTML = "<div class='keydetails' style='text-align:" + (webpg.utils.isRTL() ? 'right' : 'left') + "'><span class='dh'>" + _("Key Details") + "</span><hr" + (webpg.utils.isRTL() ? ' class=\"rtl\"' : '') + "/\>" +
                "<span><h4>" + _("KeyID") + ":</h4> " + key.substr(-8) + "</span><span><h4>" + _("Key Created") + ":</h4> " + 
                    scrub(created_date) + "</span><span><h4>" + _("Expires") + ":</h4> " + scrub(expiry) +
                        "</span><span><h4>" + _("UIDs") + ":</h4> " + scrub(current_keylist[key].nuids) + "</span><br/\>" +
                "<h4 style='margin-right: 24px;'>" + _("Fingerprint") + ":</h4> " + scrub(current_keylist[key].fingerprint) + "<br/\>" +
                "<span><h4>" + _("Status") + ":</h4> " + scrub(status) + "</span><span><h4>" + _("Key Algorithm") + ":</h4> " +
                        scrub(current_keylist[key].subkeys[0].algorithm_name) + "</span>" +
                "<span><h4>" + _("Validity") + ":</h4> " + scrub(current_keylist[key].uids[0].validity) + "</span>" +
                "<br/\>" +
                "<span class='dh'>" + _("Key Options") + "</span><hr" + (webpg.utils.isRTL() ? ' class=\"rtl\"' : '') + "/\>" +
                compiled_option_list + "<br/\>" + 
                "<span class='dh'>" + _("Operations") + "</span><hr" + (webpg.utils.isRTL() ? ' class=\"rtl\"' : '') + "/\>" +
                    key_option_button + 
                "<span class='uid-options'><input class='" + 
                            scrub(type) + "-key-option-button key-operation-button-delete' id='delete-" + scrub(type) + "-" + scrub(key) + 
                                "' type='button' value='" + _("Delete this Key") + "'/\></span>";
            uidlist_innerHTML += "<span class='uid-options'><input class='" + 
                scrub(type) + "-key-option-button key-operation-button-export' id='export-" + scrub(type) + "-" + scrub(key) + 
                    "' type='button' value='" + _("Export this Key") + "'/\></span>";
            if (type == "private") {
                uidlist_innerHTML += "<span class='uid-options'><input class='" + 
                    scrub(type) + "-key-option-button key-operation-button-publish' id='publish-" + scrub(type) + "-" + scrub(key) + 
                        "' type='button' value='" + _("Publish to Keyserver") + "'/\></span>";
            }
            uidlist_innerHTML += "<span class='uid-options'><input class='" + 
                scrub(type) + "-key-option-button key-operation-button-refresh' id='refresh-" + scrub(type) + "-" + scrub(key) + 
                    "' type='button' value='" + _("Refresh from Keyserver") + "'/\></span><br/\>" +
                "</div>";
            webpg.jq(uidlist).html(uidlist_innerHTML);
            var subkey_info = "<span class='dh'>" + _("Subkeys") + "</span><hr"
                + (webpg.utils.isRTL() ? ' class=\"rtl\"' : '') + "/\>";
            for (var subkey in current_keylist[key].subkeys) {
                var skey = current_keylist[key].subkeys[subkey];
                var skey_status = _("Valid");
                if (skey.disabled) {
                    skey_status = _("Disabled");
                }
                if (skey.expired) {
                    skey_status = _("Expired");
                }
                if (skey.invalid) {
                    skey_status = _("Invalid");
                }
                if (skey.revoked) {
                    skey_status = _("Revoked");
                }
                var created_date = new Date(skey.created * 1000).toJSON().substring(0, 10);
                var expiry = (skey.expires == 0) ? 'Never' : new Date(skey.expires * 1000).toJSON();
                if (skey.expires > 0) {
                    expiry = (Math.round(new Date().getTime()/1000.0) > skey.expires) ? _("Expired") : expiry.substring(0, 10);
                }
                var extraClass = "";
                if (key == openKey && subkey == openSubkey) {
                    extraClass = " open_subkey";
                }
                if (skey.revoked) {
                    extraClass += " invalid-key";
                }
                if (skey_status == _("Expired"))
                    extraClass += " invalid-key";
                var flags = []
                var sign_flag = (skey.can_sign) ? flags.push(_("Sign")) : "";
                var enc_flag = (skey.can_encrypt) ? flags.push(_("Encrypt")) : "";
                var auth_flag = (skey.can_authenticate) ? flags.push(_("Authenticate")) : "";
                subkey_info += "<div class=\"subkey" + extraClass + "\" id=\"" + 
                    scrub(key) + '-s' + scrub(subkey) + "\"><h4 class='subkeylist'><a href='#'>" +
                    "<span style='margin:0; width: 50%'>" + scrub(skey.size) + 
                    webpg.constants.algoTypes[skey.algorithm_name] + "/" + scrub(skey.subkey.substr(-8)) + 
                    "</span></a></h4><div class=\"subkey-info\">" +
                    "<div class='keydetails' style='text-align:" +
                        (webpg.utils.isRTL() ? 'right' : 'left') +
                        "'><span class='dh'>" + _("Subkey Details") +
                        "</span><hr" + (webpg.utils.isRTL() ?
                            ' class=\"rtl\"' : '') + "/\>" +
                    "<span><h4>" + _("KeyID") + ":</h4> " + scrub(skey.subkey.substr(-8)) + "</span><span><h4>" + _("Key Created") + ":</h4> " + 
                    scrub(created_date) + "</span><span><h4>" + _("Expires") + ":</h4> " + scrub(expiry) + "</span>" +
                    "<br/\><h4 style='margin-right: 24px;'>" + _("Fingerprint") + ":</h4> " + scrub(skey.subkey) + "<br/\>" +
                    "<span><h4>" + _("Status") + ":</h4> " + scrub(skey_status) + "</span><span><h4>" + _("Key Algorithm") + ":</h4> " +
                    scrub(skey.algorithm_name) + "</span><span><h4>" + _("Flags") + ":</h4> " + flags.toString().replace(/\,/g, ", ") + "</span>";
                if (type == "private") {
                    subkey_info += "<br/\>" +
                        "<span class='dh'>" + _("Key Options") + "</span><hr" +
                        (webpg.utils.isRTL() ? ' class=\"rtl\"' : '') + "/\>" +
                        "<span class='uid-options'><input class='" + 
                        "sub-key-option-button' id='expire-subkey-" + scrub(key) + "-" + scrub(subkey) + 
                        "' type='button' value='" + _("Change Expiration") + "'/\></span>" +
                        "<br/\>" +
                        "<span class='dh'>" + _("Operations") + "</span><hr" +
                        (webpg.utils.isRTL() ? ' class=\"rtl\"' : '') + "/\>" +
                        "<span class='uid-options'><input class='" + 
                        "sub-key-option-button' id='delete-subkey-" + scrub(key) + "-" + scrub(subkey) + 
                        "' type='button' value='" + _("Delete this Subkey") + "'/\></span>" +
                        "<span class='uid-options'><input class='" + 
                        "sub-key-option-button' id='revoke-subkey-" + scrub(key) + "-" + scrub(subkey) + 
                        "' type='button' value='" + _("Revoke this Subkey") + "'/\></span>"
                }
                subkey_info += "</div></div></div>";
            }
            webpg.jq(uidlist).append(subkey_info);
            webpg.jq(uidlist).append("<br/\><span class='dh'>" + _("User IDs") +
                "</span><hr" + (webpg.utils.isRTL() ? ' class=\"rtl\"' : '') +
                "/\>");
            for (var uid in current_keylist[key].uids) {
                var uidobj = document.createElement('div');
                uidobj.setAttribute('class', 'uid');
                uidobj.setAttribute('id', scrub(key) + '-' + scrub(uid));
                if (key == openKey && uid == openUID)
                    webpg.jq(uidobj).addClass('open_uid');
                if (current_keylist[key].expired || current_keylist[key].uids[uid].revoked)
                    uidobj.className += ' invalid-key';
                var email = (current_keylist[key].uids[uid].email.length > 1) ?
                    current_keylist[key].uids[uid].email :
                    _("no email address provided");
                if (webpg.utils.isRTL())
                    var uid_string = (current_keylist[key].uids[uid].email.length > 1) ?
                        scrub(email) + "&gt;  -  " + scrub(current_keylist[key].uids[uid].uid) + "&gt;" :
                        scrub(current_keylist[key].uids[uid].uid) + "  -  (" + email + ") ";
                else
                    var uid_string = (current_keylist[key].uids[uid].email.length > 1) ?
                        scrub(current_keylist[key].uids[uid].uid) + " - &lt;" + scrub(email) + "&gt;" :
                        scrub(current_keylist[key].uids[uid].uid) + " - (" + scrub(email) + ")";
                var comment = (current_keylist[key].uids[uid].comment.length > 1) ?
                    "[" + scrub(current_keylist[key].uids[uid].comment) + "]" :
                    "";
                webpg.jq(uidobj).html("<h4 class='uidlist'><a href='#'><span style='margin:0; width: 50%;'>" + uid_string + "<span style='margin:0 15px;'>" + comment + "</span></span><span class='trust' style='text-decoration: none;float:" + ((webpg.utils.isRTL()) ? "left" : "right") + "''></span></a></h4>");
                var signed = 0;
                var uidobjbody = document.createElement('div');
                var primary_button = "";
                var revoke_button = "";

                if (type == "private") {
                    if (uid != 0) {
                        primary_button = "<span class=\"uid-options\"><input class='uid-option-button uid-option-button-primary' id='primary-" +
                            scrub(type) + "-" + scrub(key) + "-" + scrub(uid) + "' type='button' value='" + _("Make primary") + "'/\></span>";
                    }
                    if (!current_keylist[key].uids[uid].revoked){
                        revoke_button = "<span class=\"uid-options\"><input class='uid-option-button uid-option-button-revoke' id='revoke-" +
                            scrub(type) + "-" + scrub(key) + "-" + scrub(uid) + "' type='button' value='" + _("Revoke UID") + "'/\></span>";
                    }
                }

                webpg.jq(uidobjbody).html("<div class=\"uid-options uid-options-line\"><span class='uid-options'><input class='uid-option-button-sign' id='sign-" + scrub(type) + "-" + scrub(key) + "-" + scrub(uid) + "' type='button' value='" + _("Sign this UID") + "'/\></span>" +
                    "<span class='uid-options'>" + primary_button + revoke_button + "<input class='uid-option-button' id='delete-" + scrub(type) + "-" + scrub(key) + "-" + scrub(uid) +
                    "' type='button' value='" + _("Delete this UID") + "'/\></span></div>");
                webpg.jq(uidobjbody).append("<br/\>");
                if (current_keylist[key].uids[uid].revoked) {
                    webpg.jq(uidobjbody).find('.uid-option-button-sign').addClass('uid-revoked');
                    webpg.jq(uidobjbody).find('.uid-option-button-primary').addClass('uid-revoked');
                }
                if (current_keylist[key].expired)
                    webpg.jq(uidobjbody).find('.uid-option-button-sign').addClass('key-expired');
                // Not all signatures are included in the step-iteration of a signature revocation, 
                //  therefor we need to keep track of the index of revocable keys.
                var rev_index = -1;
                // For each signature that is revoked, there  are 2 signatures,
                //  the signature to be revoked and the revocation signature.
                //  We need to keep a list of revocation signature ID's so we can
                //  exclude the revoked signatures from being displayed.
                var revocation_sig_ids = {};
                var sigs_not_in_keyring = {};
                for (var sig in current_keylist[key].uids[uid].signatures) {
                    var sig_keyid = current_keylist[key].uids[uid].signatures[sig].keyid
                    var status = "";
                    if (current_keylist[key].uids[uid].signatures[sig].revoked) {
                        revocation_sig_ids[sig_keyid] = 'revoked';
                        status = " [" + _("REVOKED") + "]";
                    } else if (sig_keyid in revocation_sig_ids) {
                        continue;
                    }
                    if (sig_keyid in tpublic_keylist) {
                        if (sig_keyid in pkeylist) {
                            signed = 1;
                            if (!current_keylist[key].uids[uid].signatures[sig].revoked) {
                                rev_index += 1;
                            }
                        }
                        email = (tpublic_keylist[sig_keyid].uids[0].email.length > 1) ? "&lt;" +
                            scrub(tpublic_keylist[sig_keyid].uids[0].email) + 
                            "&gt;" : "(" + _("no email address provided") + ")"
                        var sig_class;
                        var sig_image;
                        if (tpublic_keylist[key].uids[uid].signatures[sig].revoked) {
                            sig_class = " sig-revoked";
                            sig_image = "stock_signature-bad.png";
                        } else if (!tpublic_keylist[key].uids[uid].signatures[sig].expired && !tpublic_keylist[key].uids[uid].signatures[sig].invalid) {
                            sig_class = " sig-good";
                            sig_image = "stock_signature-ok.png";
                        } else {
                            sig_class = "";
                            sig_image = "stock_signature.png";
                        }
                        var sig_box = "<div id='sig-" + scrub(sig_keyid) + "-" + scrub(sig) + "' class='signature-box " + scrub(sig_class) + "'>" +
                            "<img src='skin/images/badges/48x48/" + scrub(sig_image) + "'>" + 
                            "<div style='float:left;clear:right;width:80%;white-space:nowrap;'><span class='signature-uid'>" + 
                            tpublic_keylist[sig_keyid].name + status + "</span><br/\><span class='signature-email'>" + 
                            email + "</span><br/\><span class='signature-keyid'>" + sig_keyid + "</span><br/\>";
                        var date_created = (tpublic_keylist[key].uids[uid].signatures[sig].created == 0) ?
                            _('Unknown') : new Date(tpublic_keylist[key].uids[uid].signatures[sig].created * 1000).toJSON().substring(0, 10);
                        var date_expires = (tpublic_keylist[key].uids[uid].signatures[sig].expires == 0) ? 
                            _('Never') : new Date(tpublic_keylist[key].uids[uid].signatures[sig].expires * 1000).toJSON().substring(0, 10);
                        sig_box += "<span class='signature-keyid'>" + _('Created') + ": " + scrub(date_created) + "</span><br/\>";
                        sig_box += "<span class='signature-keyid'>" + _('Expires') + ": " + scrub(date_expires) + "</span><br/\>"

                        sig_box += "<span class='signature-keyid'>";
                        if (sig_keyid == key) {
                            sig_box += "[" + _("self-signature") + "]";
                        } else if (!current_keylist[key].uids[uid].signatures[sig].exportable) {
                            sig_box += "[" + _("local") + ", " + _("non-exportable") + "]";
                        } else {
                            sig_box += "[" + _("other signature") + "]";
                        }
                        sig_box += "</span></div><br/\>";

                        if (signed && tpublic_keylist[key].uids[uid].signatures[sig].exportable && key != sig_keyid
                            && !tpublic_keylist[key].uids[uid].signatures[sig].revoked) {
                            sig_box += "<input type='button' class='revsig-button' id='revsig-" + scrub(type) + "-" + 
                                scrub(key) + "-" + scrub(uid) + "-" + scrub(rev_index) + "' value='" + _("Revoke") + "'/\>";
                        }
                        sig_box += "<input type='button' class='delsig-button' id='delsig-" + scrub(type) + "-" + scrub(key) +
                            "-" + scrub(uid) + "-" + scrub(sig) + "' value='" + _("Delete") + "'/\></div>";
                        webpg.jq(uidobjbody).append(sig_box);
                    } else {
                        sigs_not_in_keyring[sig] = current_keylist[key].uids[uid].signatures[sig];
                    }
                }
                uidobj.appendChild(uidobjbody);
                if (sigs_not_in_keyring.hasOwnProperty(0)) {
                    webpg.jq(uidobjbody).find(".uid-options-line").append(
                        "<span style='position:absolute;right:60px;color:#F11;margin-top:0px;'>*" + _("Signatures made with keys not in your keyring are omitted") + ".</span>"
                    );
                }
                uidlist.appendChild(uidobj);
            }
            keyobj.appendChild(uidlist);
        }

        // This allows us to toggle the "Enable" and "Default" buttons without activating the accordion
        webpg.jq('.trust').click(function(e){
            e.stopPropagation();
        });
        var pKeyAcOptions = {
                                'header': 'h3', 'alwaysOpen': false,
                                'autoheight': false, 'clearStyle': true,
                                'active': '.ui-accordion-left',
                                'collapsible': true
                            }
        webpg.jq('#' + type + '_keylist').children('.primary_key').
            accordion(pKeyAcOptions).children();

        var subKeyAcOptions = {
                                'header': 'h4.subkeylist', 'alwaysOpen': false,
                                'autoheight': false, 'clearStyle': true,
                                'active': '.ui-accordion-left',
                                'collapsible': true
                              }

        webpg.jq(".uidlist").find('.subkey').accordion(subKeyAcOptions);

        var uidAcOptions = {
                                'header': 'h4.uidlist', 'alwaysOpen': false,
                                'autoheight': false, 'clearStyle': true,
                                'active':'.ui-accordion-left',
                                'collapsible': true
                            }

        webpg.jq(".uidlist").children('.uid').accordion(uidAcOptions);

        if (openKey && gpgauth_enabled) {
            open_element = webpg.jq('#' + type + '_keylist').children('.open_key');
            if (open_element && type == 'public') {
                uid_list = open_element.children('h3').find('a')[0];
                webpg.jq("#dialog-modal").dialog({
                    'height': 140,
                    'modal': true,
                    'title': _("Calculating Trust")
                }).children().text(_("Please wait while recalculate the trust for this item"));
                setTimeout( function() { refresh_trust(uid_list, 'public') }, 300);
            }
        }

        webpg.jq('#' + type + '_keylist').children('.open_key').
            accordion("activate", 0)
        webpg.jq('.open_uid').accordion('destroy').accordion().
            accordion("activate", 0).accordion("option", {'collapsible': true});
        webpg.jq('.open_subkey').accordion('destroy').accordion().
            accordion("activate", 0).accordion("option", {'collapsible': true});
        webpg.jq('.ui-add-hover').hover(
            function(){
                webpg.jq(this).addClass("ui-state-hover");
            },
            function(){
                webpg.jq(this).removeClass("ui-state-hover");
            }
        );

        webpg.jq('.private-key-option-list, .public-key-option-list').hover(
            function(){
                webpg.jq(this).addClass("ui-state-hover");
            },
            function(){
                webpg.jq(this).removeClass("ui-state-hover");
            }
        ).each(function(i, e){
            // Assign the previous index value so we know what group
            //  (if any) to remove the key from before assignment to
            //  a new group.
            var previousIndex = e.selectedIndex;

            webpg.jq(e).bind("change", function() {
                params = this.id.split('-');
                var refresh = false;

                switch(params[0]) {
                    case "trust":
                        var trust_value = this.options.selectedIndex + 1;
                        console.log(trust_value)
                        var result = webpg.plugin.gpgSetKeyTrust(params[2], trust_value);
                        if (result.error) {
                            console.log(result);
                            return
                        }
                        refresh = true;
                        console.log(".*-key-option-list changed..", params, trust_value, result);
                        break;

                    case "group":
                        var selectedIndex = this.options.selectedIndex;
                        var group = (selectedIndex > 1) ?
                            this.options[selectedIndex].value :
                            this.options[previousIndex].value;

                        switch(selectedIndex) {
                            case 0:
                                // Remove this key from the group
                                if (previousIndex > 1) {
                                    console.log("Removing key " + params[2] + " from group " + group);
                                    console.log(webpg.preferences.group.remove(group, params[2]));
                                }
                                break;

                            case 1:
                                // Show prompt for new group creation
                                console.log("Create new group for key " + params[2]);
                                var group = prompt("Enter the name for your new Group");
                                if (group == null || group == "")
                                    break;

                            default:
                                // Remove the key from the previous group, if assigned
                                if (previousIndex > 1) {
                                    console.log("Removing " + params[2] + " from group " + this.options[previousIndex].value);
                                    console.log(webpg.preferences.group.remove(this.options[previousIndex].value, params[2]));
                                }

                                // Set the key to the named group
                                if (group.length > 0) {
                                    console.log("Assigning key " + params[2] + " to group " + group);
                                    console.log(webpg.preferences.group.add(group, params[2]));
                                }
                                break;
                        }
                        break;

                    default:
                        console.log("we don't know what to do with ourselves...");
                        alert("You attempted to activate " + params[0] +
                            ", but this feature is not yet implemented...");
                        break;
                }
                previousIndex = selectedIndex;
                if (refresh)
                    webpg.keymanager.buildKeylistProxy(null, params[1], params[2], null, null);
            })
        });

        webpg.jq('.private-key-option-button, .public-key-option-button, .sub-key-option-button').button().click(function(e){
            var params = this.id.split('-');
            var refresh = false;

            switch(params[0]) {
                case "disable":
                    if (params[1] == "private")
                        webpg.preferences.enabled_keys.remove(params[2]);
                    webpg.plugin.gpgDisableKey(params[2]);
                    refresh = true;
                    break;

                case "enable":
                    if (params[1] == "private")
                        webpg.preferences.enabled_keys.add(params[2]);
                    webpg.plugin.gpgEnableKey(params[2]);
                    refresh = true;
                    break;

                case "expire":
                    webpg.jq("#keyexp-dialog").dialog({
                        'resizable': true,
                        'height': 190,
                        'modal': true,
                        'position': "top",
                        'open': function(event, ui) {
                            var key = webpg.plugin.getNamedKey(params[2])
                            webpg.jq("#keyexp-date-input").datepicker({
                                'showButtonPanel': true,
                                'minDate': "+1D",
                                'maxDate': "+4096D",
                                'changeMonth': true,
                                'changeYear': true
                            });
                            if (params.length > 3) {
                                subkey_idx = params[3];
                            } else {
                                subkey_idx = 0;
                            }
                            if (key[params[2]].subkeys[subkey_idx].expires == 0) {
                                webpg.jq("#keyexp-never")[0].checked = true;
                                webpg.jq("#keyexp-date-input").hide();
                            } else {
                                webpg.jq("#keyexp-ondate")[0].checked = true;
                                webpg.jq("#keyexp-date-input").show();
                                webpg.jq('#keyexp-buttonset').children().blur();
                                webpg.jq("#keyexp-dialog").dialog({ 'height': 410 });
                            }
                            webpg.jq("#keyexp-buttonset").buttonset();
                            webpg.jq("#keyexp-ondate").change(function(){
                                webpg.jq("#keyexp-date-input").show();
                                webpg.jq("#keyexp-dialog").dialog({ 'height': 410 });
                                webpg.jq("#keyexp-dialog").dialog("refresh");
                            })
                            webpg.jq("#keyexp-never").change(function(){
                                webpg.jq("#keyexp-date-input").hide();
                                webpg.jq("#keyexp-dialog").dialog({ 'height': 190 });
                            })

                        },
                        'buttons': [
                            {
                                'text': _("Save"),
                                'click': function() {
                                    if (webpg.jq("#keyexp-never")[0].checked) {
                                        var new_expire = 0;
                                    } else {
                                        var expire = webpg.jq("#keyexp-date-input").datepicker("getDate");
                                        var expiration = new Date();
                                        expiration.setTime(expire);
                                        var today = new Date();
                                        today.setHours("0");
                                        today.setMinutes("0");
                                        today.setSeconds("1");
                                        today.setDate(today.getDate()+2);
                                        console.log(today);
                                        var one_day = 1000*60*60*24;
                                        var new_expire = Math.ceil((expiration.getTime()-today.getTime())/(one_day) + 0.5);
                                        if (new_expire < 1)
                                            new_expire = 1;
                                        console.log(new_expire);
                                    }
                                    // set to new expiration here;
                                    if (subkey_idx) {
                                        webpg.plugin.gpgSetSubkeyExpire(params[2], subkey_idx, new_expire);
                                    } else {
                                        webpg.plugin.gpgSetPubkeyExpire(params[2], new_expire);
                                    }
                                    webpg.jq(this).dialog("close");
                                    if (params[1] == "subkey") {
                                        params[1] = "private";
                                    }
                                    webpg.jq(this).dialog("close");
                                    webpg.keymanager.buildKeylistProxy(null, params[1], params[2], params[3], null);
                                },
                            }, {
                                'text': _("Cancel"),
                                'click': function(event,ui) {
                                    console.log("destroyed...");
                                    webpg.jq("#keyexp-date-input").datepicker('destroy');
                                    webpg.jq(this).dialog('destroy');
                                },
                            }
                        ]
                    }).parent().animate({"top": window.scrollY}, 1, function() {
                        webpg.jq(this).animate({"top": window.scrollY + webpg.jq(this).innerHeight()
                            / 3}, 1);
                    });
                    break;

                case "passphrase":
                    console.log(webpg.plugin.gpgChangePassphrase(params[2]));
                    refresh = false;
                    break;

                case "delete":
                    console.log(params);
                    webpg.jq("#delete-key-dialog-confirm").dialog({
                        'resizable': true,
                        'height': 168,
                        'modal': true,
                        'position': "top",
                        'close': function() {
                            webpg.jq("#delete-key-dialog-confirm").dialog("destroy");
                        },
                        'buttons': [
                        {
                            'text': _("Delete this key"),
                            'click': function() {
                                // Delete the Public Key
                                if (params[1] == "public") {
                                    result = webpg.plugin.gpgDeletePublicKey(params[2]);
                                }
                                if (params[1] == "private") {
                                    result = webpg.plugin.gpgDeletePrivateKey(params[2]);
                                }
                                if (params[1] == "subkey") {
                                    result = webpg.plugin.gpgDeletePrivateSubKey(params[2],
                                        parseInt(params[3]));
                                }
                                webpg.jq(this).dialog("close");

                                if (result && !result.error) {
                                    if (params[1] == "subkey") {
                                        // Override the keylist type param
                                        params[1] = "private";
                                    } else {
                                        // Remove the Key-ID from the params array, since it
                                        //  no longer exists
                                        params[2] = null;
                                    }
                                    webpg.keymanager.buildKeylistProxy(null, params[1], params[2], null, null);
                                }
                            }
                        }, {
                            'text': _("Cancel"),
                            'click': function() {
                                webpg.jq(this).dialog("close");
                            }
                        }
                    ]
                    }).parent().animate({"top": window.scrollY}, 1, function() {
                            webpg.jq(this).animate({"top": window.scrollY + webpg.jq(this).innerHeight()}, 1);
                        });
                    break;

                case "adduid":
                    webpg.jq("#adduid-dialog").dialog({
                        'resizable': true,
                        'height': 230,
                        'width': 550,
                        'modal': true,
                        'position': "top",
                        'buttons': [
                        {
                            'text': _("Create"),
                            'click': function() {
                                var form = webpg.jq(this).find("#adduid-form")[0];
                                if (!webpg.jq("#adduid-status").length) {
                                    webpg.jq(form).parent().before("<div id=\"adduid-status\"> </div>");
                                }
                                var error = "";
                                if (!form.uid_0_name.value){
                                    error += _("Name Required") + "<br>";
                                    webpg.jq(form.uid_0_name).addClass("ui-state-error");
                                }
                                if (form.uid_0_name.value.length < 5){
                                    error += _("UID Names must be at least 5 characters") + "<br>";
                                    webpg.jq(form.uid_0_name).addClass("ui-state-error");
                                }
                                if (!isNaN(form.uid_0_name.value[0])){
                                    error += _("UID Names cannot begin with a number") + "<br>";
                                    webpg.jq(form.uid_0_name).addClass("ui-state-error");
                                }
                                if (form.uid_0_email.value && !webpg.utils.
                                    isValidEmailAddress(form.uid_0_email.value)){
                                    error += _("Not a valid email address") + "<br>";
                                    webpg.jq(form.uid_0_email).addClass("ui-state-error");
                                } else {
                                    webpg.jq(form.uid_0_email).removeClass("ui-state-error");
                                }
                                if (error.length) {
                                    webpg.jq("#adduid-status").html(error)[0].style.display="block";
                                    return false;
                                }
                                webpg.keymanager.adduid_waiting = true;
                                webpg.jq("#adduid-dialog").dialog("option", "minHeight", 250);
                                webpg.jq("#adduid-status").html(error)[0].style.display="block";
                                var result = webpg.plugin.gpgAddUID(params[2], form.uid_0_name.value,
                                        form.uid_0_email.value, form.uid_0_comment.value);
                                if (result.error) {
                                    console.log(result);
                                    return
                                }
                                webpg.jq(this).dialog("close");
                                webpg.jq("#adduid-form")[0].reset();
                                webpg.jq("#adduid-dialog").dialog("destroy");
                                webpg.keymanager.buildKeylistProxy(null, params[1], params[2], null, null);
                            }
                        }, {
                            'text': _("Cancel"),
                            'click': function() {
                                webpg.jq("#adduid-dialog").dialog("close");
                                webpg.jq("#adduid-form")[0].reset();
                                webpg.jq("#adduid-dialog").dialog("destroy");
                            }
                        }
                    ]}).parent().animate({"top": window.scrollY}, 1, function() {
                            webpg.jq(this).animate({"top": window.scrollY + webpg.jq(this).innerHeight()
                                / 2}, 1);
                        });
                    break;

                case "addsubkey":
                    webpg.keymanager.genkey_refresh = false;
                    webpg.jq("#gensubkey-dialog").dialog({
                        'resizable': true,
                        'minHeight': 300,
                        'width': 300,
                        'modal': true,
                        'autoOpen': false,
                        'position': "top",
                        'buttons': [
                        {
                            'text': _("Create"),
                            'click': function() {
                                var form = webpg.jq(this).find("#gensubkey-form")[0];
                                form.key_id.value = params[2];
                                webpg.jq(form).parent().before("<div id=\"gensubkey-status\"> </div>");
                                var error = "";
                                webpg.keymanager.genkey_waiting = true;
                                if (webpg.utils.detectedBrowser['product'] == "chrome") {
                                    chrome.extension.onConnect.addListener(function(port) {
                                        port.onMessage.addListener(webpg.keymanager.progressMsg);
                                    });
                                }
                                webpg.jq("#gensubkey-form").find(".open").trigger("click");
                                console.log("going to create a subkey with the following details:" + '\n' +
                                    "Key ID:", form.key_id.value, " Sub Key:", form.gs_subKey_algo.value + 
                                      ' (' + form.gs_subKey_size.value + ')\n' + " sign_flag: " + form.sign.checked +
                                      " enc_flag: " + form.enc.checked + " auth_flag: " + form.auth.checked + "\n" +
                                    "expiration: Key will expire in " + form.key_expire.value + ' days');
                                webpg.jq("#gensubkey-dialog").dialog("option", "minHeight", 300);
                                webpg.jq("#gensubkey-status").html(error)[0].style.display="block";
                                webpg.jq("#gensubkey-status").html(_("Building key, please wait"));
                                webpg.jq("#gensubkey-status").after("<div id='gensubkey-status_detail' style=\"font-size: 12px; color:#fff;padding: 20px;\">This may take a long time (5 minutes or more) to complete depending on the selected options. Please be patient while the key is created. It is safe to close this window, key generation will continue in the background.<br><br><div id='gensubkey_progress' style='height:auto;display:block;'></div></div>");
                                webpg.jq(form)[0].style.display = "none";
                                webpg.jq("#gensubkey-dialog")[0].style.height = "20";
                                webpg.jq("#gensubkey-dialog")[0].style.display = "none";
                                var response = webpg.plugin.gpgGenSubKey(form.key_id.value,
                                    form.gs_subKey_algo.value,
                                    form.gs_subKey_size.value,
                                    form.key_expire.value,
                                    (form.sign.checked) ? 1 : 0,
                                    (form.enc.checked) ? 1 : 0,
                                    (form.auth.checked) ? 1 : 0
                                );
                                if (response == "queued") {
                                    webpg.jq("#gensubkey-dialog").dialog("option", "buttons", [{ 
                                        'text': _("Close"),
                                        'click': function() {
                                            webpg.jq("#gensubkey-dialog").dialog("close");
                                        }
                                    }]);
                                }
                            }
                        }, {
                            'text': _("Cancel"),
                            'click': function() {
                                webpg.jq("#gensubkey-dialog").dialog("close");
                                if (window.gensubkey_refresh)
                                    webpg.keymanager.buildKeylistProxy(null, 'private');
                            }
                        }
                    ]}).parent().animate({"top": window.scrollY}, 1, function() {
                            webpg.jq(this).animate({"top": window.scrollY + webpg.jq(this).innerHeight()
                                / 3}, 1);
                    });
                    webpg.jq("#subKey_flags").buttonset();
                    webpg.jq("#gensubkey-form").children('input').removeClass('input-error');
                    webpg.jq("#gensubkey-form")[0].reset();
                    webpg.jq('#gensubkey-form .subkey-algo').each(function(){
                        webpg.jq(this)[0].options.selectedIndex = webpg.jq(this)[0].options.length - 1;
                        webpg.jq(this).parent().find('.key-size')[0].children[0].disabled = true;
                        webpg.jq(webpg.jq(this).parent().find('.key-size')[0].children[0]).hide();
                    }).change(function(){
                        selectedIndex = webpg.jq(this)[0].options.selectedIndex;
                        if (selectedIndex == 0 || selectedIndex == 4) {
                            // DSA Selected
                            webpg.jq(this).parent().find('.key-size')[0].children[0].disabled = false;
                            webpg.jq(webpg.jq(this).parent().find('.key-size')[0].children[0]).show();
                            webpg.jq(this).parent().find('.key-size')[0].children[4].disabled = true;
                            webpg.jq(webpg.jq(this).parent().find('.key-size')[0].children[4]).hide();
                        } else if (selectedIndex == 1 || selectedIndex == 3 || selectedIndex == 5) {
                            // RSA Selected
                            webpg.jq(this).parent().find('.key-size')[0].children[0].disabled = true;
                            webpg.jq(webpg.jq(this).parent().find('.key-size')[0].children[0]).hide();
                            webpg.jq(this).parent().find('.key-size')[0].children[4].disabled = false;
                            webpg.jq(webpg.jq(this).parent().find('.key-size')[0].children[4]).show();
                        } else if (selectedIndex == 2) {
                            // ElGamal Selected
                            webpg.jq(this).parent().find('.key-size')[0].children[0].disabled = false;
                            webpg.jq(webpg.jq(this).parent().find('.key-size')[0].children[0]).show();
                            webpg.jq(this).parent().find('.key-size')[0].children[4].disabled = false;
                            webpg.jq(webpg.jq(this).parent().find('.key-size')[0].children[4]).show();
                        }
                        if (selectedIndex < 4) {
                            webpg.jq("#subKey_flags").hide();
                            webpg.jq("#gensubkey-dialog").dialog("option", "height", 240);
                        } else {
                            if (selectedIndex == 4) {
                                webpg.jq("#subKey_flags").find('#sign')[0].checked = true;
                                webpg.jq("#subKey_flags").find('#enc')[0].checked = false;
                                webpg.jq("#subKey_flags").find('#auth')[0].checked = false;
                                webpg.jq("#subKey_flags").find('#enc')[0].disabled = true;
                            } else {
                                webpg.jq("#subKey_flags").find('#sign')[0].checked = true;
                                webpg.jq("#subKey_flags").find('#enc')[0].checked = true;
                                webpg.jq("#subKey_flags").find('#auth')[0].checked = false;
                                webpg.jq("#subKey_flags").find('#enc')[0].disabled = false;
                            }
                            webpg.jq("#subKey_flags").show();
                            webpg.jq("#gensubkey-dialog").dialog("option", "height", 300);
                        }
                        webpg.jq("#subKey_flags").buttonset("refresh");
                    });
                    webpg.jq("#gensubkey-dialog").dialog('open');
                    webpg.jq("#gensubkey-form").find(".open").trigger("click");
                    break;

                case "export":
                    var export_result = webpg.plugin.gpgExportPublicKey(params[2]).result;
                    webpg.jq("#export-dialog-text").html(scrub(export_result));
                    webpg.jq("#export-dialog-copytext").html(scrub(export_result));
                    webpg.jq("#export-dialog").dialog({
                        'resizable': true,
                        'height': 230,
                        'width': 536,
                        'modal': true,
                        'position': "top",
                        'buttons': [
                        {
                            'text': _("Copy"),
                            'click': function() {
                                webpg.jq("#export-dialog-copytext")[0].select();
                                webpg.jq("#export-dialog-msg").html(
                                    webpg.utils.copyToClipboard(window, document)
                                );
                                webpg.jq("#export-dialog-msg")[0].style.display="block"
                            },
                        }, {
                            'text': _("Close"),
                            'click': function() {
                                webpg.jq("#export-dialog").dialog("destroy");
                                webpg.jq("#export-dialog-msg")[0].style.display="none"
                            }
                        }
                    ]}).parent().animate({"top": window.scrollY}, 1, function() {
                            webpg.jq(this).animate({"top": window.scrollY + webpg.jq(this).innerHeight()
                                / 2}, 1);
                        });
                    break;

                case "revoke":
                    webpg.jq("#revkey-confirm").find('#revkey-text').html(_("Please specify the revocation details") + " -<br/\><br/\>" +
                        "<label for='revkey-reason'>" + _("Reason") + ":</label>" +
                        "<select name='revkey-reason' id='revkey-reason' class='ui-add-hover ui-corner-all ui-widget ui-state-default'>" +
                        "<option value='0' class='ui-state-default'>" + _("No reason specified") + "</option>" +
                        "<option value='1' class='ui-state-default'>" + _("Key has been compromised") + "</option>" +
                        "<option value='2' class='ui-state-default'>" + _("Key is superseded") + "</option>" +
                        "<option value='2' class='ui-state-default'>" + _("Key is no longer used") + "</option>" +
                        "</select><br/\>" +
                        "<label for='revkey-desc'>" + _("Description") + ":</label>" +
                        "<input type='text' name='revkey-desc' id='revkey-desc' class='ui-corner-all ui-widget ui-state-default'/\>");
                    webpg.jq("#revkey-confirm").dialog({
                        'resizable': true,
                        'height': 250,
                        'width': 350,
                        'modal': true,
                        'autoOpen': false,
                        'position': "top",
                        'close': function() {
                            webpg.jq("#revkey-confirm").dialog("destroy");
                        },
                        'buttons': [
                        {
                            'text': _("Revoke"),
                            'click': function() {
                                var reason = webpg.jq('#revkey-reason')[0].value;
                                var desc = webpg.jq('#revkey-desc')[0].value;
                                console.log(params[2], params[3], reason, desc);
                                var revkey_result = webpg.plugin.gpgRevokeKey(params[2],
                                    parseInt(params[3]), parseInt(reason), desc);
                                webpg.keymanager.buildKeylistProxy(null, "private", params[2], params[3], null);
                                webpg.jq("#revkey-confirm").dialog("close");
                            }
                        }, {
                            'text': _("Cancel"),
                            'click': function() {
                                webpg.jq("#revkey-confirm").dialog("close");
                            }
                        }
                    ]}).parent().animate({"top": window.scrollY}, 1, function() {
                            webpg.jq(this).animate({"top": window.scrollY + webpg.jq(this).innerHeight()
                                / 2}, 1);
                        });
                    webpg.jq("#revkey-confirm").dialog('open');
                    break;

                case "publish":
                    webpg.jq("#export-dialog-copytext").hide();
                    webpg.jq("#export-dialog-text").text(_("Are you sure you want to Publish this key to the Keyserver") + "?");
                    webpg.jq("#export-dialog").dialog({
                        'resizable': true,
                        'height': 230,
                        'width': 536,
                        'modal': true,
                        'position': "top",
                        'buttons': [
                        {
                            'text': _("Publish"),
                            'id': "export-dialog-button-publish",
                            'click': function() {
                                webpg.jq("#export-dialog-text").text(_("Sending key to Keyserver"));
                                var res = webpg.plugin.gpgPublishPublicKey(params[2]);
                                if (typeof(res.result)=='undefined' || res.error == true) {
                                    var errText = _("There was a problem sending this key to the Keyserver");

                                    var keyserver = webpg.plugin.gpgGetPreference("keyserver");
                                    if (!keyserver.value) {
                                        errText += "<br/><br/>" + _("Error") + ":"
                                            + _("No Keyserver defined");
                                    } else {
                                        errText += "<br/><br/>" + _("Error") + ":"
                                            + _("Keyserver") + ":<br/>" +
                                            scrub(keyserver.value);
                                        webpg.jq("#export-dialog-button-publish").button(
                                            'option', 'label', _('Try Again')
                                            ).button("refresh");
                                    }
                                } else {
                                    var errText = _("Key Published to Keyserver");
                                    webpg.jq("#export-dialog-button-publish").button('option', 'label', _('Publish Again')).button("refresh");
                                }
                                webpg.jq("#export-dialog-text").html(errText);
                            },
                        }, {
                            'text': _("Close"),
                            'click': function() {
                                webpg.jq("#export-dialog").dialog("destroy");
                                webpg.jq("#export-dialog-msg")[0].style.display="none"
                            }
                        }
                    ]}).parent().animate({"top": window.scrollY}, 1, function() {
                            webpg.jq(this).animate({"top": window.scrollY + webpg.jq(this).innerHeight()
                                / 2}, 1);
                        });
                    webpg.jq("#ui-dialog-title-export-dialog").text(_("Publish to Keyserver"));
                    break;

                case "refresh":
                    var res = webpg.plugin.gpgImportExternalKey(params[2]);
                    var modified = false;
                    if (res.error) {
                        if (res.gpg_error_code == "16383")
                            res.error_string = _("Key not found on keyserver");
                    } else {
                        modified = res.imported ? true :
                            res.imported_rsa ? true :
                            res.new_revocations ? true :
                            res.new_signatures ? true :
                            res.new_sub_keys ? true :
                            res.new_user_ids ? true :
                            false;
                    }
                    refresh = modified;
                    break;

                default:
                    console.log("we don't know what to do with ourselves...");
                    alert("You attempted to activate " + params[0] +
                        ", but this is not yet implemented...");
                    break;
            }
            console.log(".*-key-option-button pressed..", params);
            if (refresh) {
                var default_key = webpg.preferences.default_key.get();
                webpg.background.webpg.secret_keys = webpg.plugin.getPrivateKeyList();
                for (var sKey in webpg.background.webpg.secret_keys)
                    webpg.background.webpg.secret_keys[sKey].default = (sKey == default_key);
                if (params[1] == "subkey")
                    params[1] = "private";
                webpg.keymanager.buildKeylistProxy(null, params[1], params[2], null, null);
            }
        }).parent().find('.ui-dialog-buttonpane').
            find(".ui-button-text").each(function(iter, src) {
                webpg.jq(src).text(webpg.jq(src).parent()[0].getAttribute("text"))
            }
        );
        webpg.jq('.uid-option-button').button().click(function(e){
            var params = this.id.split('-');
            var refresh = false;
            switch(params[0]) {
                case "delete":
                    webpg.jq( "#deluid-confirm" ).dialog({
                        'resizable': true,
                        'height': 180,
                        'modal': true,
                        'position': "top",
                        'close': function() {
                            webpg.jq("#deluid-confirm").dialog("destroy");
                        },
                        'buttons': [
                        {
                            'text': _("Delete this UID"),
                            'click': function() {
                                // Delete the Public Key
                                var uid_idx = parseInt(params[3]) + 1;
                                var result = webpg.plugin.gpgDeleteUID(params[2], uid_idx);
                                console.log(result, params[2], uid_idx);
                                webpg.jq(this).dialog("close");
                                // Remove the Key-ID from the params array, since it
                                //  no longer exists
                                if (!result.error) {
                                    params[3] = null;
                                    webpg.keymanager.buildKeylistProxy(null, params[1], params[2], null, null);
                                }
                            }
                        }, {
                            'text': _("Cancel"),
                            'click': function() {
                                webpg.jq(this).dialog("close");
                            }
                        }
                    ]}).parent().animate({"top": window.scrollY}, 1,
                        function() {
                            webpg.jq(this).animate({"top": window.scrollY + webpg.jq(this).innerHeight()
                                / 2}, 1);
                        });
                    break;

                case "primary":
                    refresh = true;
                    var uid_idx = parseInt(params[3]) + 1;
                    var result = webpg.plugin.gpgSetPrimaryUID(params[2], uid_idx);
                    params[3] = 0;
                    break;

                case "revoke":
                    webpg.jq("#revuid-confirm").find('#revuid-text').html(_("Please specify the revocation details") + " -<br/\><br/\>" +
                        "<label for='revuid-reason'>" + _("Reason") + ":</label>" +
                        "<select name='revuid-reason' id='revuid-reason' class='ui-add-hover ui-corner-all ui-widget ui-state-default'>" +
                        "<option value='0' class='ui-state-default'>" + _("No reason specified") + "</option>" +
                        "<option value='4' class='ui-state-default'>" + _("User ID is no longer valid") + "</option>" +
                        "</select><br/\>" +
                        "<label for='revuid-desc'>" + _("Description") + ":</label>" +
                        "<input type='text' name='revuid-desc' id='revuid-desc' class='ui-corner-all ui-widget ui-state-default'/\>");
                    
                    webpg.jq("#revuid-confirm").dialog({
                        'resizable': true,
                        'height': 250,
                        'width': 350,
                        'modal': true,
                        'autoOpen': false,
                        'position': top,
                        'close': function() {
                            webpg.jq("#revuid-confirm").dialog("destroy");
                        },
                        'buttons': [
                        {
                            'text': _("Revoke"),
                            'click': function() {
                                var reason = webpg.jq('#revuid-reason')[0].value;
                                var desc = webpg.jq('#revuid-desc')[0].value;
                                console.log(params[2], params[3], params[4], reason, desc);
                                var revuid_result = webpg.plugin.gpgRevokeUID(params[2],
                                    parseInt(params[3]) + 1, parseInt(reason), desc);
                                webpg.keymanager.buildKeylistProxy(null, params[1], params[2], null, params[3]);
                                webpg.jq("#revuid-confirm").dialog("close");
                            }
                        }, {
                            'text': _("Cancel"),
                            'click': function() {
                                webpg.jq("#revuid-confirm").dialog("close");
                            }
                        }
                    ]}).parent().animate({"top": window.scrollY}, 1, function() {
                            webpg.jq(this).animate({"top": window.scrollY + webpg.jq(this).innerHeight()
                                / 2}, 1);
                        });
                    webpg.jq("#revuid-confirm").dialog('open');
                    break;

                default:
                    console.log("we don't know what to do with ourselves...");
                    alert("You attempted to activate " + params[0] +
                        ", but this is not yet implemented...");
                    break;
            }
            console.log(".uid-option-button clicked..", params);
            if (refresh) {
                webpg.keymanager.buildKeylistProxy(null, params[1], params[2], null, params[3]);
            }
        });
        webpg.jq('.uid-option-button-sign').button().click(function(e){
            webpg.jq("#createsig-dialog").dialog({
                'resizable': true,
                'minHeight': 250,
                'width': 630,
                'modal': true,
                'autoOpen': false,
                'position': "top"
            }).parent().animate({"top": window.scrollY}, 1, function() {
                    webpg.jq(this).animate({"top": window.scrollY + webpg.jq(this).innerHeight()
                        / 3}, 1);
                });
            var params = this.id.split('-');
            var enabled_keys = webpg.preferences.enabled_keys.get();
            webpg.jq('#createsig-form').html("<p class='help-text'>" + _("Please select which of your keys to create the signature with") + ":</p>");
            if (type == "private")
                keylist = pkeylist;
            var current_signatures = keylist[params[2]].uids[params[3]].signatures;
            var cursig = [];
            for (sig in current_signatures) {
                cursig.push(current_signatures[sig].keyid);
            }
            if (!webpg.preferences.enabled_keys.length()) {
                if (JSON.stringify(pkeylist).length > 2) {
                    webpg.jq('#createsig-form').append(_("You have not enabled any keys for use with webpg") +
                        "; <a href='" + webpg.utils.resourcePath + "key_manager.html?auto_init=true&tab=0&helper=enable'>" +
                        _("please click here") + "</a> " + _("and select 1 or more keys for use with webpg"));
                } else {
                    webpg.jq('#createsig-form').append(_("You have not generated any keys") +
                        "; <a href='" + webpg.utils.resourcePath + "key_manager.html?auto_init=true&tab=0&helper=generate'>" +
                        _("please click here") + "</a> " + _("and generate a key to use with webpg"));
                }
            }
            for (idx in enabled_keys) {
                var key = enabled_keys[idx];
                var signed = (cursig.indexOf(key) != -1);
                var status = signed? "<div style='width: 28px; display: inline;text-align:right;'><img style='height: 14px; padding: 2px 2px 0 4px;' id='img_" + key + "' " +
                    "src='skin/images/badges/48x48/stock_signature.png' alt='" + _("Already signed with this key") + "'/\></div>" :
                    "<div style='width: 28px; display: inline;text-align:right;'><img style='display:none; height: 14px; padding: 2px 2px 0 4px;' id='img_" + key + "' " +
                    "src='skin/images/check.png' alt='" + _("Signature added using this key") + "'/\></div>";
                if (signed)
                    status += "<input style='display: none;' type='checkbox' id='sign_" + key + "' name='" + key + "' disabled/\>";
                else
                    status += "<input type='checkbox' id='sign_" + key + "' name='" + key + "'/\>";
                webpg.jq('#createsig-form').append(status + "<label for='sign_" + key + "' id='lbl-sign_" + key + "' class='help-text'>" + webpg.keymanager.pkeylist[key].name + " (" + key + ")</label><div id='lbl-sign-err_" + key + "' style='display: none;'></div><br/\>");
                if (webpg.preferences.enabled_keys.length() == 1 && signed) {
                    webpg.jq(webpg.jq("button", webpg.jq("#createsig-dialog").parent()).children()[1]).hide();
                }
            }
            var refresh = false;
            webpg.jq("#createsig-dialog").dialog({
                'position': "top",
                "buttons": [
                    {
                        'text': _("Sign"),
                        'click': function() {
                            var checked = webpg.jq("#createsig-form").children("input:checked");
                            var error = false;
                            for (item in checked) {
                                if (checked[item].type == "checkbox") {
                                    var sign_result = webpg.plugin.gpgSignUID(params[2], 
                                        parseInt(params[3]) + 1,
                                        checked[item].name, 1, 1, 1);
                                    error = (error || (sign_result['error'] && sign_result['gpg_error_code'] != 65)); // if this is true, there were errors, leave the dialog open
                                    if (sign_result['error'] && sign_result['gpg_error_code'] != 65) {
                                        webpg.jq('#img_' + checked[item].name)[0].src = "skin/images/cancel.png"
                                        lbl_sign_error = webpg.jq('#lbl-sign-err_' + checked[item].name)[0];
                                        lbl_sign_error.style.display = "inline";
                                        lbl_sign_error.style.color = "#f40";
                                        lbl_sign_error.style.margin = "0 0 0 20px";
                                        webpg.jq(lbl_sign_error).html(sign_result['error_string']);
                                        webpg.jq(webpg.jq("button", webpg.jq("#createsig-dialog").parent()).children()[0]).text("Close")
                                        webpg.jq(webpg.jq("button", webpg.jq("#createsig-dialog").parent()).children()[1]).text("Try again")
                                    } else {
                                        refresh = true; // the keys have changed, we should refresh on dialog close;
                                        webpg.jq('#img_' + checked[item].name)[0].src = "skin/images/check.png"
                                    }
                                    webpg.jq('#img_' + checked[item].name).show().next().hide();
                                }
                            }
                            console.log("should we refresh?", refresh? "yes":"no");
                            if (!error && refresh) {
                                webpg.jq("#createsig-dialog").dialog("destroy");
                                webpg.keymanager.buildKeylistProxy(null, params[1], params[2], null, params[3]);
                            }
                        }
                    }, {
                        'text': _("Cancel"),
                        'click': function() {
                            webpg.jq("#createsig-dialog").dialog("destroy");
                            if (refresh) {
                                webpg.keymanager.buildKeylistProxy(null, params[1], params[2], null, params[3]);
                            }
                        }
                    }
                ]
            }).parent().animate({"top": window.scrollY}, 1, function() {
                    webpg.jq(this).animate({"top": window.scrollY + webpg.jq(this).innerHeight()
                / 2}, 1)});
            if (webpg.preferences.enabled_keys.length() == 1 && cursig.indexOf(enabled_keys[0]) != -1) {
                webpg.jq("button", webpg.jq("#createsig-dialog").parent()).first().hide()
            }
            webpg.jq("#createsig-dialog").dialog('open');
        });
        if (!webpg.plugin.webpg_status.gpgconf_detected) {
            webpg.jq(".key-operation-button-publish").button({'disabled': true, 'label': _("Cannot Publish Keys without gpgconf utility installed")});
            webpg.jq('.uid-option-button-sign').button({'disabled': true, 'label': _("Cannot create signatures without gpgconf utility installed")});
        } else if (webpg.plugin.gpgGetPreference("keyserver").value && webpg.plugin.gpgGetPreference("keyserver").length < 1) {
            webpg.jq(".key-operation-button-publish").button({'disabled': true, 'label': _("Cannot Publish Keys without Keyserver configured")});
        }
        webpg.jq('.uid-option-button-sign.uid-revoked').button({'disabled': true, 'label': _("Cannot sign a revoked UID")});
        webpg.jq('.uid-option-button-primary.uid-revoked').button({'disabled': true, 'label': _("Cannot make a revoked UID primary")});
        webpg.jq('.uid-option-button-sign.key-expired').button({'disabled': true, 'label': _("Cannot sign an expired key")});
        webpg.jq('.revsig-button').button().click(function(e){
            var params = this.id.split('-');
            var calling_button = this;
            var sig_details = webpg.jq(calling_button).parent()[0].id.split('-');
            webpg.jq("#revsig-confirm").find('#revsig-text').html(_("Please specify the revocation details") + " -<br/\><br/\>" +
                "<label for='revsig-reason'>" + _("Reason") + ":</label>" +
                "<select name='revsig-reason' id='revsig-reason' class='ui-add-hover ui-corner-all ui-widget ui-state-default'>" +
                "<option value='0' class='ui-state-default'>" + _("No reason specified") + "</option>" +
                "<option value='4' class='ui-state-default'>" + _("User ID is no longer valid") + "</option>" +
                "</select><br/\>" +
                "<label for='revsig-desc'>" + _("Description") + ":</label>" +
                "<input type='text' name='revsig-desc' id='revsig-desc' class='ui-corner-all ui-widget ui-state-default'/\>");
            webpg.jq("#revsig-confirm").dialog("option",
                "buttons", [
                {
                    'text': _("Revoke"),
                    'click': function() {
                        var reason = webpg.jq('#revsig-reason')[0].value;
                        var desc = webpg.jq('#revsig-desc')[0].value;
                        console.log(params[2], params[3], params[4], reason, desc);
                        var revsig_result = webpg.plugin.gpgRevokeSignature(params[2],
                            parseInt(params[3]), parseInt(params[4]), parseInt(reason), desc);
                        //console.log('delete', delsig_result, params[2], parseInt(params[3]) + 1, parseInt(params[4]) + 1)
                        webpg.keymanager.buildKeylistProxy(null, params[1], params[2], null, params[3]);
                        webpg.jq("#revsig-confirm").dialog("close");
                    }
                }, {
                    'text': _("Cancel"),
                    'click': function() {
                        webpg.jq("#revsig-confirm").dialog("close");
                    }
                }                
            ]).parent().animate({"top": window.scrollY}, 1, function() {
                webpg.jq(this).animate({"top": window.scrollY + webpg.jq(this).innerHeight()
                / 3}, 1)});
            webpg.jq("#revsig-confirm").dialog('open');
        });
        webpg.jq("#revsig-confirm").dialog({
            'resizable': true,
            'height': 250,
            'width': 350,
            'modal': true,
            'autoOpen': false,
            'close': function() {
                webpg.jq("#revsig-confirm").dialog("destroy");
            },
            'buttons': [{
                'text': _('Revoke this Signature'),
                'click': function() {
                    webpg.jq(this).dialog('close');
                }
            }, {
                'text': _('Cancel'),
                'click': function() {
                    webpg.jq(this).dialog('close');
                }
            }]
        }).parent().animate({"top": window.scrollY}, 1, function() {
            webpg.jq(this).animate({"top": window.scrollY + webpg.jq(this).innerHeight()
                / 2}, 1);
        });

        webpg.jq('.delsig-button').button().click(function(e){
            var params = this.id.split('-');
            var calling_button = this;
            var sig_details = webpg.jq(calling_button).parent()[0].id.split('-');
            webpg.jq("#delsig-confirm").find('#delsig-text').html(_("Are you certain you would like to delete signature") + " " +
                sig_details[1] + " " + _("from this User ID") + "?");
            if (sig_details[1] in webpg.keymanager.pkeylist < 1) {
                webpg.jq("#delsig-confirm").find('#delsig-text').append("<br><br><span class='ui-icon ui-icon-alert' style='float:left; margin:0 7px 20px 0;'></span>" + _("This signature was made with a key that does not belong to you") + "; " + _("This action cannot be undone") + ".");
                webpg.jq("#delsig-confirm").dialog("option", "height", "240");
                webpg.jq("#delsig-confirm").dialog("option", "width", "400");
            }
            webpg.jq("#delsig-confirm").dialog("option",
                "buttons", [
                {
                    'text': _("Delete"),
                    'click': function() {
                        var delsig_result = webpg.plugin.
                            gpgDeleteUIDSign(params[2], parseInt(params[3]) + 1,
                            parseInt(params[4]) + 1);
                        webpg.keymanager.buildKeylistProxy(null, params[1], params[2], null, params[3]);
                        webpg.jq("#delsig-confirm").dialog("close");
                    }
                }, {
                    'text': _("Cancel"),
                    'click': function() {
                        webpg.jq("#delsig-confirm").dialog("close");
                    }
                }
            ])
            .parent().animate({"top": window.scrollY}, 1, function() {
                webpg.jq(this).animate({"top": window.scrollY + webpg.jq(this).innerHeight()
                    / 2}, 1);
            });
            webpg.jq("#delsig-confirm").dialog('open');
        });
        webpg.jq("#delsig-confirm").dialog({
            'resizable': true,
            'height': 200,
            'modal': true,
            'autoOpen': false,
            'position': "top",
            'buttons': [
                {
                    'text': _('Delete this Signature') + '?',
                    'click': function() {
                        webpg.jq(this).dialog('close');
                    }
                }, {
                    'text': _("Cancel"),
                    'click': function() {
                        webpg.jq(this).dialog('close');
                    }
                }
            ]
        }).parent().animate({"top": window.scrollY}, 1, function() {
            webpg.jq(this).animate({"top": window.scrollY + webpg.jq(this).innerHeight()}, 1);
        });

        webpg.jq('.public_keylist').click(function(e){
            e.stopImmediatePropagation()
            e.preventDefault();
            e.stopPropagation();
            if (this.className.search('active') > -1 && gpgauth_enabled) {
                webpg.jq("#dialog-modal").dialog({
                    'height': 140,
                    'modal': true,
                    'title': "Calculating Trust"
                }).children()[0].innerHTML = "Please wait while recalculate the trust for this item.";
                setTimeout( function() { refresh_trust(e.target, 'public') }, 300);
            }
        });

        webpg.jq('.enable-check').button().next().next().button({
            'text': false,
            'icons': {
                'primary': 'ui-icon-check'
            }
        }).click(function(e) {
            var keyid = this.id.substr(-16);
            webpg.preferences.default_key.set(keyid);
            for (var sKey in webpg.background.webpg.secret_keys)
                webpg.background.webpg.secret_keys[sKey].default = (sKey == keyid);
            var enable_element = webpg.jq('#check-' + this.id.substr(-16))[0];
            webpg.jq("#enable-private-" + keyid).click();
            //var enabled_keys = webpg.preferences.enabled_keys.get();
//            if (enabled_keys.indexOf(keyid) == -1) {
//                webpg.preferences.enabled_keys.add(keyid);
//                webpg.jq(enable_element).trigger('click');
//                webpg.jq(enable_element).next().html(webpg.jq(enable_element).next()[0].innerHTML.replace(_('Disabled'), _('Enabled')));
//                
//            }
        }).parent().buttonset();

        webpg.jq('.enable-check').next().hover(
            function(e){
                webpg.jq(this).parent().children('.keyoption-help-text').html(_("Enable this key for GnuPG operations"));
            },
            function(e){
                webpg.jq(this).parent().children('.keyoption-help-text').html("&nbsp;");
            }
        );
        webpg.jq('input.default-check').next().hover(
            function(e){
                var input = webpg.jq(this).prev()[0];
                if (input && input.checked) {
                    webpg.jq(this).parent().children('.keyoption-help-text').html(_("This is your default key"));
                } else {
                    webpg.jq(this).parent().children('.keyoption-help-text').html(_("Make this the default key for GnuPG operations"));
                }
            },
            function(e){
                webpg.jq(this).parent().children('.keyoption-help-text').html("&nbsp;");
            }
        );

        // Scroll to the open item, if any
        var openItem = false;
        var pos_offset = 32;
        if (openKey)
            openItem = "#" + openKey;
        if (openSubkey) {
            openItem = "#" + openKey + "-s" + openSubkey;
            pos_offset = 10;
        }
        if (openUID) {
            openItem = "#" + openKey + "-" + openUID;
            pos_offset = 10;
        }

        if (openItem) {
            var element = webpg.jq(openItem);
            if (element.length > 0) {
                var pos = element.offset().top - pos_offset;
                webpg.jq('html,body').animate({'scrollTop': pos}, 1);
            }
        }

        if (type == 'public') {
            // Setup the search input
            webpg.jq("#pubkey-search").unbind("change").bind("change", function(e) {
                // Sometimes the event is a duplicate, so check the
                //  data object for "original_value"
                if (webpg.jq(this).data("original_value") == this.value)
                    return
                // This is an original event, so set the data object
                //  "original_value"
                webpg.jq(this).data('original_value', this.value);
                // Set our keylist object to the current pubkeylist
                var keylist = webpg.keymanager.pubkeylist;
                // Retrieve the value of the serach field
                var val = e.target.value.toLowerCase();

                var nkeylist = webpg.utils.keylistTextSearch(val, keylist);

                if (this.value == "")
                    nkeylist = webpg.keymanager.pubkeylist;

                webpg.jq("#dialog-modal").dialog('option', 'modal', false)
                .dialog('open').animate({"top": window.scrollY}, 1,
                    function() {
                        webpg.jq('#dialog-msg').text(
                            (val.length > 0) ? _("Searching for") + " \"" + val
                            + "\"" : _("Please wait while we build the key list")
                        );
                        webpg.jq(this).animate({"top": window.scrollY +
                            webpg.jq(this).innerHeight() + 100}, 1,
                        function() {
                            webpg.keymanager.buildKeylist(
                                nkeylist, 'public');
                            webpg.jq("#dialog-modal").dialog('close');
                        }
                    )
                });
            })
        }
        if (window.navigator.platform.toLowerCase().indexOf("win") > -1) {
            webpg.jq("select").each(function() { this.style.backgroundImage = 'none'; });
        }
    },
    /* end buildKeylist */
}

webpg.jq(function(){
    if (webpg.utils.getParameterByName("auto_init") == "true")
        webpg.keymanager.init();
});
/* ]]> */
