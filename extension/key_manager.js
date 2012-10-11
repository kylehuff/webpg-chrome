/* <![CDATA[ */
if (typeof(webpg)=='undefined') { webpg = {}; }

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
        if (webpg.utils.detectedBrowser['vendor'] == "mozilla") {
            webpg.background = browserWindow;
            webpg.secret_keys = browserWindow.secret_keys;
        } else if (webpg.utils.detectedBrowser['product'] == "chrome") {
            webpg.background.plugin = chrome.extension.getBackgroundPage().plugin;
            webpg.secret_keys = webpg.background.secret_keys;
        }

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

        // Build the Private keylist on tab selection 
        jQuery('#tab-2-btn').click(function(){
            webpg.keymanager.buildKeylistProxy(
                null, 'private', null, null, null, true
            );
        });

        // Build the Public keylist on tab selection
        jQuery('#tab-3-btn').click(function(){
            webpg.keymanager.buildKeylistProxy(
                null, 'public', null, null, null, true
            );
        });

        var selected_tab = qs.tab ? qs.tab : 0;
        openKey = (qs.openkey)? qs.openkey : null;
        if (openKey) {
            if (openKey in webpg.secret_keys){
                selected_tab = 0;
            } else {
                selected_tab = 1;
            }
        }
        var openSubkey = (qs.opensubkey)? qs.opensubkey : null;
        var openUID = (qs.openuid)? qs.openuid : null;
        jQuery('#tabs').tabs({ selected: selected_tab });

        if (selected_tab == 0)
            webpg.keymanager.buildKeylistProxy(
                null, 'private', openKey, openSubkey, openUID, true
            );
        if (selected_tab == 1)
            webpg.keymanager.buildKeylistProxy(
                null, 'public', openKey, openSubkey, openUID, true
            );
        if (qs.strip) {
            jQuery("#header").remove();
            jQuery(document.getElementsByTagName("ul")[0]).remove();
        }
        jQuery('#close').button().click(function(e) { window.top.close(); });

        jQuery('ul.expand').each(function(){
            jQuery('li.trigger', this).filter(':first').addClass('top').end().filter(':not(.open)').next().hide();
            jQuery('li.trigger', this).click(function(){
                var height = (jQuery("#genkey-status").length > 0) ? jQuery("#genkey-status").height() : 0;
                if(jQuery(this).hasClass('open')) {
                    jQuery(this).removeClass('open').next().slideUp();
                    jQuery("#genkey-dialog").dialog("option", "minHeight", 300 + height);
                } else {
                    jQuery(this).parent().find('li.trigger').removeClass('open').next().filter(':visible').slideUp();
                    jQuery(this).addClass('open').next().slideDown(300, function() {
                        jQuery("#genkey-dialog").dialog("option", "minHeight",
                            jQuery("#genkey-dialog")[0].scrollHeight + jQuery('li.trigger').parent().parent().innerHeight()
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

        jQuery("#dialog-modal").dialog({
            height: 140,
            modal: true,
            autoOpen: true,
            title: "Building Key list"
        }).animate({"top": window.scrollY}, 1, function() {
            jQuery('#dialog-msg').text("Please wait while we build the key list.");
            jQuery(this).animate({"top": window.scrollY + jQuery(this).innerHeight() + 100}, 1,
            function() {
                webpg.keymanager.buildKeylist(
                    keyList, type, openKey,
                    openSubkey, openUID
                );
                jQuery("#dialog-modal").dialog('close');
                if (qs.helper) {
                    function bounce(elem_class, left, top, perpetual) {
                        var nleft = jQuery(jQuery(elem_class)[0]).parent().offset().left - left;
                        var ntop = jQuery(jQuery(elem_class)[0]).parent().offset().top - top;
                        jQuery("#error_help").parent().css('left', nleft).css('top', ntop).
                            effect("bounce", {times: 1, direction: 'up', distance: 8 }, 1200, function(){ if (perpetual) { bounce(elem_class, left, top, perpetual) } } )
                    }
                    var helper_arrow = document.createElement('div');
                    jQuery(helper_arrow).html('' +
                        '<div id="error_help" style="text-align: center; display: inline; text-shadow: #000 1px 1px 1px; color: #fff; font-size: 12px;">' +
                        '<div id="help_text" style="display: block; border-radius: 4px; -moz-border-radius: 4px; -webkit-border-radius: 4px; z-index: 10; padding: 8px 5px 8px 5px; margin-right: -5px; background-color: #ff6600; min-width: 130px;"></div>' +
                        '<span style="margin-left: 94px;"><img width="30px" src="skin/images/help_arrow.png"></span>' +
                        '</div>');
                    helper_arrow.style.position = 'absolute';
                    helper_arrow.style.zIndex = 1000;
                    jQuery(helper_arrow).css("max-width", "75%");
                    switch(qs.helper){
                        case 'enable':
                            jQuery(helper_arrow).find('#help_text').html("Click to enable key");
                            document.body.appendChild(helper_arrow);
                            jQuery('.enable-check').click(function() {
                                jQuery(helper_arrow).stop(true, true).stop(true, true).remove();
                                qs.helper = "";
                            });
                            bounce('.enable-check', 75, 45, true);
                            break;
                        case 'default':
                            jQuery(helper_arrow).find('#help_text').html("Click to set default key");
                            jQuery('.default-check').click(function() {
                                jQuery(helper_arrow).stop(true, true).stop(true, true).remove();
                                qs.helper = "";
                            });
                            document.body.appendChild(helper_arrow);
                            bounce('.default-check', 40, 45, true);
                            break;
                        case 'signuids':
                            jQuery(helper_arrow).find('#help_text').html("Below is a list of key IDs that represent the domains that this server key is valid for; please sign the domain IDs that you want to use with webpg.");
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
        var msg = (webpg.utils.detectedBrowser['vendor'] == "mozilla") ? evt.detail : evt;
        var dialog = (jQuery("#genkey-dialog").dialog("isOpen") == true) ?
            "#genkey" : (jQuery("#gensubkey-dialog").dialog("isOpen") == true) ?
            "#gensubkey" : null;
        if (dialog && msg.type == "progress") {
            var data = msg.data;
            if (!isNaN(data))
                data = String.fromCharCode(data);
            data += " ";
            jQuery(dialog + "_progress").append(data);
            var waitMsg = (msg.data == 43) ? "Generating Key..." : "Waiting for entropy...";
            jQuery(dialog + "-status").html("Building key, please wait.. [" + waitMsg + "]");
            if (data == "complete" || data == "complete ") {
                webpg.keymanager.genkey_refresh = true;
                webpg.keymanager.genkey_waiting = false;
                var gen_dialog = dialog + "-dialog";
                var new_pkeylist = webpg.background.plugin.getPrivateKeyList();
                var generated_key = (dialog == "#gensubkey") ?
                    jQuery(gen_dialog).find("#gensubkey-form")[0].key_id.value
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
                jQuery(dialog + "-status_detail").remove()
                jQuery(dialog + "-status").remove();
                jQuery(dialog + "-form")[0].reset();
                jQuery(dialog + "-form")[0].style.display="inline-block";
                jQuery(dialog + "-dialog").dialog("close");
            } else if (data.search("failed") > -1) {
                webpg.keymanager.genkey_waiting = false;
                jQuery(dialog + "-status").html("Generation " +
                    webpg.utils.escape(data));
                jQuery(dialog + "-dialog").dialog("option", "buttons", { 
                    "Close": function() {
                        if (dialog == "#gensubkey")
                             jQuery(dialog + "-dialog").dialog("option", "height", 320);
                        jQuery(dialog + "_progress").html("");
                        jQuery(dialog + "-status_detail").remove()
                        jQuery(dialog + "-status").remove();
                        jQuery(dialog + "-form")[0].reset();
                        jQuery(dialog + "-form")[0].style.display="inline-block";
                        jQuery(dialog + "-dialog").dialog("close");
                    }
                });

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
    buildKeylist: function(keyList, type, openKey, openSubkey, openUID){
        //console.log(keyList, type, openKey, openSubkey, openUID);

        if (type == 'public') {
            var keylist_element = document.getElementById('public_keylist');
        } else {
            var keylist_element = document.getElementById('private_keylist');
            var enabled_keys = webpg.preferences.enabled_keys.get();
        }

        if (!keyList) {
            if (type == 'public') {
                var find = jQuery("#pubkey-search")[0].value;
                if (find.length > 0) {
                    if (find.search(":") > -1) {
                        var keylist = webpg.background.plugin.getPublicKeyList();
                        jQuery("#pubkey-search")[0].value = '';
                    } else {
                        var keylist = webpg.background.plugin.getNamedKey(find);
                    }
                } else {
                    var keylist = webpg.background.plugin.getPublicKeyList();
                }

                if (!keylist) {
                    // if the parsing failed, create an empty keylist
                    var keylist = {};
                }
            }
            var pkeylist = webpg.background.plugin.getPrivateKeyList();

            if (!pkeylist) {
                // if the parsing failed, create an empty keylist
                var pkeylist = {};
            }
            webpg.keymanager.pkeylist = pkeylist;
            webpg.keymanager.pubkeylist = keylist;
        } else {
            var keylist = keyList;
            var pkeylist = {};
        }

        jQuery(keylist_element).html("<div class='ui-accordion-left'></div>");

        if (type == 'private') {
            // Create the key-generate button and dialog
            var genkey_div = document.createElement('div');
            genkey_div.style.padding = "8px 0 20px 0";
            var genkey_button = document.createElement('input');
            genkey_button.setAttribute('value', 'Generate New Key');
            genkey_button.setAttribute('type', 'button');
            jQuery(genkey_button).button().click(function(e){
                webpg.keymanager.genkey_refresh = false;
                jQuery("#genkey-dialog").dialog({
                    "position": "top",
                    "buttons": {
                        "Create": function() {
                            var form = jQuery(this).find("#genkey-form")[0];
                            jQuery(form).parent().before("<div id=\"genkey-status\"> </div>");
                            var error = "";
                            if (!form.uid_0_name.value){
                                error += "Name Required<br>";
                                jQuery(form.uid_0_name).addClass("ui-state-error");
                            }
                            if (form.uid_0_name.value.length < 5){
                                error += "UID Names must be at least 5 characters<br>";
                                jQuery(form.uid_0_name).addClass("ui-state-error");
                            } else {
                                jQuery(form.uid_0_name).removeClass("ui-state-error");
                            }
                            if (!isNaN(form.uid_0_name.value[0])){
                                error += "UID Names cannot begin with a number<br>";
                                jQuery(form.uid_0_name).addClass("ui-state-error");
                            } else {
                                jQuery(form.uid_0_name).removeClass("ui-state-error");
                            }
                            if (form.uid_0_email.value && !webpg.utils.
                                isValidEmailAddress(form.uid_0_email.value)){
                                error += "Not a valid email address<br>";
                                jQuery(form.uid_0_email).addClass("ui-state-error");
                            } else {
                                jQuery(form.uid_0_email).removeClass("ui-state-error");
                            }
                            if (form.passphrase.value != form.pass_repeat.value){
                                jQuery(form.passphrase).addClass("ui-state-error");
                                jQuery(form.pass_repeat).addClass("ui-state-error");
                                jQuery(form.passphrase).next()
                                    .find("#passwordStrength-text")
                                    .html("Passphrases do not match")
                                    .css({"color": "#f00"});
                                error += "Passphrases do not match<br>";
                            } else {
                                jQuery(form.passphrase).removeClass("ui-state-error");
                                jQuery(form.pass_repeat).removeClass("ui-state-error");
                            }
                            if (error.length) {
                                jQuery("#genkey-status").html(error)[0].style.display="block";
                                jQuery("#genkey-dialog").dialog("option", "minHeight", 350);
                                return false;
                            }
                            webpg.keymanager.genkey_waiting = true;
                            if (webpg.utils.detectedBrowser['product'] == "chrome") {
                                chrome.extension.onConnect.addListener(function(port) {
                                    port.onMessage.addListener(webpg.keymanager.progressMsg);
                                });
                            }
                            jQuery("#genkey-form").find(".open").trigger("click");
                            console.log("going to create a key with the following details:" + '\n' +
                                "Primary Key:", form.publicKey_algo.value + 
                                  ' (' + form.publicKey_size.value + ')\n' +
                                "Sub Key:", form.subKey_algo.value + 
                                  ' (' + form.subKey_size.value + ')\n' +
                                "name:", form.uid_0_name.value + '\n' +
                                "comment: ", form.uid_0_name.value + '\n' +
                                "email:", form.uid_0_email.value + '\n' +
                                "passphrase:", form.passphrase.value +  '\n' +
                                "expiration:", "Key will expire in " + form.key_expire.value + ' days');
                            jQuery("#genkey-dialog").dialog("option", "minHeight", 300);
                            jQuery("#genkey-status").html(error)[0].style.display="block";
                            jQuery("#genkey-status").html("Building key, please wait..");
                            jQuery("#genkey-status").after("<div id='genkey-status_detail' style=\"font-size: 12px; color:#fff;padding: 20px;\">This may take a long time (5 minutes or more) to complete depending on the selected options. Please be patient while the key is created. It is safe to close this window, key generation will continue in the background.<br><br><div id='genkey_progress' style='height:auto;display:block;'></div></div>");
                            jQuery(form)[0].style.display = "none";
                            jQuery("#genkey-dialog")[0].style.height = "20";
                            jQuery("#genkey-dialog")[0].style.display = "none";
                            response = webpg.background.plugin.gpgGenKey(form.publicKey_algo.value,
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
                                jQuery("#genkey-dialog").dialog("option", "buttons", { 
                                    "Close": function() {
                                        jQuery("#genkey-dialog").dialog("close");
                                    }
                                });
                            }
                        },
                        Cancel: function() {
                            jQuery("#genkey-dialog").dialog("close");
                            if (webpg.keymanager.genkey_refresh)
                                webpg.keymanager.buildKeylistProxy(null, 'private');
                        }
                    },
                }).parent().animate({"top": window.scrollY}, 1, function() {
                    jQuery(this).animate({"top": window.scrollY + jQuery(this).innerHeight()
                        / 3}, 1);
                });

                jQuery("#genkey-form").children('input').removeClass('input-error');
                jQuery("#genkey-form")[0].reset();
                jQuery('.key-algo').each(function(){
                    //jQuery(this)[0].options.selectedIndex = jQuery(this)[0].options.length - 1;
                    if (jQuery(this).parent().next().find('.key-size').length) {
                        jQuery(this).parent().next().find('.key-size')[0].children[0].disabled = true;
                        jQuery(jQuery(this).parent().next().find('.key-size')[0].children[0]).hide();
                    }
                }).change(function(){
                    if (jQuery(this)[0].options.selectedIndex == 0){
                        // DSA Selected
                        console.log("DSA");
                        jQuery(this).parent().next().find('.key-size')[0].children[0].disabled = false;
                        jQuery(jQuery(this).parent().next().find('.key-size')[0].children[0]).show();
                        jQuery(this).parent().next().find('.key-size')[0].children[4].disabled = true;
                        jQuery(jQuery(this).parent().next().find('.key-size')[0].children[4]).hide();
                        jQuery(this).parent().next().find('.key-size')[0].options.selectedIndex = 2;
                    } else if(jQuery(this)[0].options.selectedIndex == 1){
                        // RSA Selected
                        console.log("RSA");
                        jQuery(this).parent().next().find('.key-size')[0].children[0].disabled = true;
                        jQuery(jQuery(this).parent().next().find('.key-size')[0].children[0]).hide();
                        jQuery(this).parent().next().find('.key-size')[0].children[4].disabled = false;
                        jQuery(jQuery(this).parent().next().find('.key-size')[0].children[4]).show();
                        jQuery(this).parent().next().find('.key-size')[0].options.selectedIndex = 2;
                    } else {
                        // Elgamal Selected
                        console.log("Elgamal");
                        jQuery(this).parent().next().find('.key-size')[0].children[0].disabled = false;
                        jQuery(jQuery(this).parent().next().find('.key-size')[0].children[0]).show();
                        jQuery(this).parent().next().find('.key-size')[0].children[4].disabled = false;
                        jQuery(jQuery(this).parent().next().find('.key-size')[0].children[4]).show();
                        jQuery(this).parent().next().find('.key-size')[0].options.selectedIndex = 2;
                    }
                });
                jQuery("#genkey-dialog").dialog('open');
                jQuery("#genkey-form").find(".open").trigger("click");
            });
            jQuery("#genkey-dialog").dialog({
                resizable: true,
                minHeight: 300,
                width: 630,
                modal: true,
                autoOpen: false
            }).parent().animate({"top": window.scrollY}, 1, function() {
                jQuery(this).animate({"top": window.scrollY + jQuery(this).innerHeight()
                    / 3}, 1);
            });
            jQuery('.passphrase').passwordStrength("#pass_repeat");
            genkey_div.appendChild(genkey_button);
            document.getElementById('private_keylist').appendChild(genkey_div);
            // End key generation dialog
            webpg.keymanager.private_built = true;
        }

        var prev_key = null;
        var current_keylist = (type == 'public')? keylist : pkeylist;
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
                    jQuery(keyobj).addClass('invalid-key');
                keyobj.className += ' primary_key';
                var enabled = (enabled_keys.indexOf(key) != -1) ? 'checked' : '';
                var status_text = (enabled) ? "Enabled" : "Disabled";
                var default_key = (key == webpg.preferences.default_key.get()) ? 'checked' : '';
            }
            var status = "Valid";
            var keyobj = document.createElement('div');
            if (current_keylist[key].disabled) {
                jQuery(keyobj).addClass('disabled');
                status = "Disabled";
            }
            if (current_keylist[key].expired) {
                jQuery(keyobj).addClass('invalid-key');
                status = "Expired";
            }
            if (current_keylist[key].invalid) {
                jQuery(keyobj).addClass('invalid-key');
                status = "Invalid";
            }
            if (current_keylist[key].revoked) {
                jQuery(keyobj).addClass('invalid-key');
                status = "Revoked";
            }
            jQuery(keyobj).addClass('primary_key');
            if (key == openKey) {
                jQuery(keyobj).addClass('open_key');
                keyobj.setAttribute('id', 'open_key');
            }
            if (type == "public") {
                jQuery(keyobj).html("<h3 class='public_keylist'><a href='#' name='" + key + "'><span style='margin: 0;width: 50%'>" + current_keylist[key].name + "</span><span class='trust'></span></a></h3>");
            } else {
                jQuery(keyobj).html("<h3 class='private_keylist' style='height: 24px;'><a href='#' name='" + key + "'><span style='margin: 0;width: 50%;'>" + current_keylist[key].name + 
                    "&nbsp;&nbsp;-&nbsp;&nbsp;[0x" + key.substr(-8) + "]</span></a><span class='trust' style='z-index:1000; left: 4px; top:-30px;height:22px;'>" +
                    "<span class='keyoption-help-text' style=\"margin-right: 14px;\">&nbsp;</span>" +
                    "<input class='enable-check' id='check-" + key +"' type='checkbox' " + enabled + "/\><label class='enable-check-text' for='check-" + key + "' style='z-index:100;'>" + status_text + "</label><input class='default-check' type='radio' name='default_key' " +
                    " id='default-" + key + "' " + default_key + "/\><label class='default-check' style='z-index: 0; margin-left: 0px;' for='default-" + key + "'>Set as default</label></span></h3>");
            }
            keylist_element.appendChild(keyobj);
            jQuery(keyobj).find('.enable-check').click(function(e){
                var checked_id = this.id.split("-")[1];
                if (webpg.preferences.enabled_keys.has(checked_id) && 
                    checked_id == webpg.preferences.default_key.get()){
                    jQuery(this).next().addClass('ui-state-active');
                    return false
                }
                if (this.checked && !webpg.preferences.default_key.get()) {
                    jQuery(this).next().next().click();
                    jQuery(this).next().next().next().addClass('ui-state-active');
                }
                (this.checked) ? webpg.preferences.enabled_keys.add(this.id.split("-")[1]) :
                    webpg.preferences.enabled_keys.remove(this.id.split("-")[1]);
                (this.checked) ? jQuery(this).button('option', 'label', 'Enabled') :
                    jQuery(this).button('option', 'label', 'Disabled');
            });
            jQuery(keyobj).find('.default-check').click(function(e){
                var clicked_id = this.id.split("-")[1];
                if (clicked_id == webpg.preferences.default_key.get()) {
                    jQuery(this).parent().children('.keyoption-help-text').html("<span style=\"color:f6f;\">Cannot unset your default key</span>");
                }
            });
            current_keylist[key].nuids = 0;
            for (var uid in current_keylist[key].uids) {
                current_keylist[key].nuids += 1;
            }
            var uidlist = document.createElement('div');
            uidlist.setAttribute('class', 'uidlist');
            uidlist.setAttribute('id', key);
            var created_date = new Date(current_keylist[key].subkeys[0].created * 1000).toJSON().substring(0, 10);
            var expiry = (current_keylist[key].subkeys[0].expires == 0) ? 'Never' : new Date(current_keylist[key].subkeys[0].expires * 1000).toJSON();
            if (current_keylist[key].subkeys[0].expires > 0) {
                expiry = (Math.round(new Date().getTime()/1000.0) > current_keylist[key].subkeys[0].expires) ? "Expired [" + expiry.substring(0, 10) + "]" : expiry.substring(0, 10);
            }
            var options_list = [];
            var option = {};
            if (type == "private") {
                option = {
                    "command" : "trust",
                    "text" : "Trust Assignment",
                    "input_type" : "list",
                    "list_values" : ["Unknown", "Never", "Marginal", "Full", "Ultimate"]
                }
                options_list[options_list.length] = option;
                option = {
                    "command" : "expire",
                    "text" : "Change Expiration",
                    "input_type" : "calendar"
                }
                options_list[options_list.length] = option;
                option = {
                    "command" : "passphrase",
                    "text" : "Change Passphrase",
                    "input_type" : "button"
                }
                options_list[options_list.length] = option;
                option = {
                    "command" : "adduid",
                    "text" : "Add UID",
                    "input_type" : "dialog"
                }
                options_list[options_list.length] = option;
                option = {
                    "command" : "addsubkey",
                    "text" : "Add Subkey",
                    "input_type" : "dialog"
                }
                options_list[options_list.length] = option;
            } else {
                option = {
                    "command" : "trust",
                    "text" : "Trust Assignment",
                    "input_type" : "list",
                    "list_values" : ["Unknown", "Never", "Marginal", "Full", "Ultimate"]
                }
                options_list[options_list.length] = option;
            }
            var compiled_option_list = "";
            for (var option_i in options_list){
                option = options_list[option_i];
                switch(option.input_type) {
                    case "button":
                        compiled_option_list += "<span class='uid-options' style='font-size:12px;'><input class='" + 
                            type + "-key-option-button' id='" + option.command + "-" + type + "-" + key + 
                                "' type='button' value='" + option.text + "'/\></span>";
                        break;
                    case "dialog":
                        compiled_option_list += "<span class='uid-options' style='font-size:12px;'><input class='" + 
                            type + "-key-option-button' id='" + option.command + "-" + type + "-" + key + 
                                "' type='button' value='" + option.text + "'/\></span>";
                        break;
                    case "calendar":
                        compiled_option_list += "<span class='uid-options' style='font-size:12px;'><input class='" + 
                            type + "-key-option-button' id='" + option.command + "-" + type + "-" + key + 
                                "' type='button' value='" + option.text + "'/\></span>";
                        break;
                    case "list":
                        compiled_option_list += "<span class='uid-options' style='font-size:12px;'>" +
                            "<label for='" + option.command + "-" + type + "-" + key + 
                            "' style=\"display:block; clear:right; margin-top: -10px;\">" + option.text + "</label><select class='" + 
                            type + "-key-option-list ui-button ui-corner-all ui-button ui-widget ui-state-default' id='" + 
                            option.command + "-" + type + "-" + key + "' style=\"margin-right: 10px;\">"
                        for (var listitem in option.list_values) {
                            var owner_trust = current_keylist[key].owner_trust;
                            if (option.list_values[listitem].toLowerCase() == owner_trust) {
                                var selected = "selected";
                            } else {
                                var selected = "";
                            }
                            compiled_option_list += "<option class=\"ui-state-default\" value=\"" + 
                                option.list_values[listitem].toLowerCase() + "\" " + 
                                selected + ">" + option.list_values[listitem] + "</option>";
                        }
                        compiled_option_list += "</select></span>";
                        break;
                }
            }
            var keystatus = (current_keylist[key].disabled)? 'enable':'disable';
            var keystatus_text = (current_keylist[key].disabled)? 'Enable this Key':'Disable this Key';
            var key_option_button = "<span class='uid-options' style='font-size:12px;'><input class='" + 
                    type + "-key-option-button' id='" + keystatus + "-" + type + "-" + key + 
                        "' type='button' value='" + keystatus_text + "'/\></span>";
            var uidlist_innerHTML = "<div class='keydetails'><span class='dh'>Key Details</span><hr/\>" +
                "<span><h4>KeyID:</h4> 0x" + key.substr(-8) + "</span><span><h4>Key Created:</h4> " + 
                    created_date + "</span><span><h4>Expires:</h4> " + expiry +
                        "</span><span><h4>UIDs:</h4> " + current_keylist[key].nuids + "</span><br/\>" +
                "<h4>Fingerpint:</h4> " + current_keylist[key].fingerprint + "<br/\>" +
                "<span><h4>Status:</h4> " + status + "</span><span><h4>Key Algorithm:</h4> " +
                        current_keylist[key].subkeys[0].algorithm_name + "</span>" +
                "<span><h4>Validity:</h4> " + current_keylist[key].uids[0].validity + "</span>" +
                "<br/\>" +
                "<span class='dh'>Key Options</span><hr/\>" +
                compiled_option_list + "<br/\>" + 
                "<span class='dh'>Operations</span><hr/\>" +
                    key_option_button + 
                "<span class='uid-options' style='font-size:12px;'><input class='" + 
                            type + "-key-option-button' id='delete-" + type + "-" + key + 
                                "' type='button' value='Delete this Key'/\></span>";
            uidlist_innerHTML += "<span class='uid-options' style='font-size:12px;'><input class='" + 
                type + "-key-option-button' id='export-" + type + "-" + key + 
                    "' type='button' value='Export this Key'/\></span><br/\>" +
                "</div>";
            jQuery(uidlist).html(uidlist_innerHTML);
            var subkey_info = "<span class='dh'>Subkeys</span><hr/\>";
            for (var subkey in current_keylist[key].subkeys) {
                var skey = current_keylist[key].subkeys[subkey];
                var skey_status = "Valid";
                if (skey.disabled) {
                    skey_status = "Disabled";
                }
                if (skey.expired) {
                    skey_status = "Expired";
                }
                if (skey.invalid) {
                    skey_status = "Invalid";
                }
                if (skey.revoked) {
                    skey_status = "Revoked";
                }
                var created_date = new Date(skey.created * 1000).toJSON().substring(0, 10);
                var expiry = (skey.expires == 0) ? 'Never' : new Date(skey.expires * 1000).toJSON();
                if (skey.expires > 0) {
                    expiry = (Math.round(new Date().getTime()/1000.0) > skey.expires) ? "Expired" : expiry.substring(0, 10);
                }
                var extraClass = "";
                if (key == openKey && subkey == openSubkey) {
                    extraClass = " open_subkey";
                }
                if (skey.revoked) {
                    extraClass += " invalid-key";
                }
                if (skey_status == "Expired")
                    extraClass += " invalid-key";
                var flags = []
                var sign_flag = (skey.can_sign) ? flags.push("Sign") : "";
                var enc_flag = (skey.can_encrypt) ? flags.push("Encrypt") : "";
                var auth_flag = (skey.can_authenticate) ? flags.push("Authenticate") : "";
                subkey_info += "<div class=\"subkey" + extraClass + "\" id=\"" + 
                    key + '-s' + subkey + "\"><h4 class='subkeylist'><a href='#'>" +
                    "<span style='margin:0; width: 50%'>" + skey.size + 
                    webpg.constants.algoTypes[skey.algorithm_name] + "/" + skey.subkey.substr(-8) + 
                    "</span></a></h4><div class=\"subkey-info\">" +
                    "<div class='keydetails'><span class='dh'>Subkey Details</span><hr/\>" +
                    "<span><h4>KeyID:</h4> 0x" + skey.subkey.substr(-8) + "</span><span><h4>Key Created:</h4> " + 
                    created_date + "</span><span><h4>Expires:</h4> " + expiry + "</span>" +
                    "<br/\><h4>Fingerpint:</h4> " + skey.subkey + "<br/\>" +
                    "<span><h4>Status:</h4> " + skey_status + "</span><span><h4>Key Algorithm:</h4> " +
                    skey.algorithm_name + "</span><span><h4>Flags:</h4> " + flags.toString() + "</span>";
                if (type == "private") {
                    subkey_info += "<br/\>" +
                        "<span class='dh'>Key Options</span><hr/\>" +
                        "<span class='uid-options' style='font-size:12px;'><input class='" + 
                        "sub-key-option-button' id='expire-subkey-" + key + "-" + subkey + 
                        "' type='button' value='Change Expiration'/\></span>" +
                        "<br/\>" +
                        "<span class='dh'>Operations</span><hr/\>" +
                        "<span class='uid-options' style='font-size:12px;'><input class='" + 
                        "sub-key-option-button' id='delete-subkey-" + key + "-" + subkey + 
                        "' type='button' value='Delete this Subkey'/\></span>" +
                        "<span class='uid-options' style='font-size:12px;'><input class='" + 
                        "sub-key-option-button' id='revoke-subkey-" + key + "-" + subkey + 
                        "' type='button' value='Revoke this Subkey'/\></span>"
                }
                subkey_info += "</div></div></div>";
            }
            jQuery(uidlist).append(subkey_info);
            jQuery(uidlist).append("<br/\><span class='dh'>User IDs</span><hr/\>");
            for (var uid in current_keylist[key].uids) {
                var uidobj = document.createElement('div');
                uidobj.setAttribute('class', 'uid');
                uidobj.setAttribute('id', key + '-' + uid);
                if (key == openKey && uid == openUID)
                    jQuery(uidobj).addClass('open_uid');
                if (current_keylist[key].expired || current_keylist[key].uids[uid].revoked)
                    uidobj.className += ' invalid-key';
                var email = (current_keylist[key].uids[uid].email.length > 1) ? "  -  &lt;" + webpg.utils.escape(current_keylist[key].uids[uid].email) + "&gt;" :
                    "  - (no email address provided)";
                jQuery(uidobj).append("<h4 class='uidlist'><a href='#'><span style='margin:0; width: 50%'>" + current_keylist[key].uids[uid].uid + email + "</span><span class='trust' style='text-decoration: none;'></span></a></h4>");
                var signed = 0;
                var uidobjbody = document.createElement('div');
                var primary_button = "";
                var revoke_button = "";

                if (type == "private") {
                    if (uid != 0) {
                        primary_button = "<span class=\"uid-options\"><input class='uid-option-button uid-option-button-primary' id='primary-" +
                            type + "-" + key + "-" + uid + "' type='button' value='Make primary'/\></span>";
                    }
                    if (!current_keylist[key].uids[uid].revoked){
                        revoke_button = "<span class=\"uid-options\"><input class='uid-option-button uid-option-button-revoke' id='revoke-" +
                            type + "-" + key + "-" + uid + "' type='button' value='Revoke UID'/\></span>";
                    }
                }

                jQuery(uidobjbody).html("<div class=\"uid-options uid-options-line\"><span class='uid-options'><input class='uid-option-button-sign' id='sign-" + type + "-" + key + "-" + uid + "' type='button' value='Sign this UID'/\></span>" +
                    "<span class='uid-options'>" + primary_button + revoke_button + "<input class='uid-option-button' id='delete-" + type + "-" + key + "-" + uid +
                    "' type='button' value='Delete this UID'/\></span></div>");
                jQuery(uidobjbody).append("<br/\>");
                if (current_keylist[key].uids[uid].revoked) {
                    jQuery(uidobjbody).find('.uid-option-button-sign').addClass('uid-revoked');
                    jQuery(uidobjbody).find('.uid-option-button-primary').addClass('uid-revoked');
                }
                if (current_keylist[key].expired)
                    jQuery(uidobjbody).find('.uid-option-button-sign').addClass('key-expired');
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
                        status = " [REVOKED]";
                    } else if (sig_keyid in revocation_sig_ids) {
                        continue;
                    }
                    if (sig_keyid in current_keylist) {
                        if (sig_keyid in pkeylist) {
                            signed = 1;
                            if (!current_keylist[key].uids[uid].signatures[sig].revoked) {
                                rev_index += 1;
                            }
                        }
                        email = (current_keylist[sig_keyid].uids[0].email.length > 1) ? "&lt;" +
                            current_keylist[sig_keyid].uids[0].email + 
                            "&gt;" : "(no email address provided)"
                        var sig_class;
                        var sig_image;
                        if (current_keylist[key].uids[uid].signatures[sig].revoked) {
                            sig_class = " sig-revoked";
                            sig_image = "stock_signature-bad.png";
                        } else if (!current_keylist[key].uids[uid].signatures[sig].expired && !current_keylist[key].uids[uid].signatures[sig].invalid) {
                            sig_class = " sig-good";
                            sig_image = "stock_signature-ok.png";
                        } else {
                            sig_class = "";
                            sig_image = "stock_signature.png";
                        }
                        var sig_box = "<div id='sig-" + sig_keyid + "-" + sig + "' class='signature-box " + sig_class + "'>" +
                            "<img src='skin/images/badges/" + sig_image + "'>" + 
                            "<div style='float:left; clear:right;width:80%;'><span class='signature-uid'>" + 
                            current_keylist[sig_keyid].name + status + "</span><br/\><span class='signature-email'>" + 
                            email + "</span><br/\><span class='signature-keyid'>" + sig_keyid + "</span><br/\>";
                        var date_created = new Date(current_keylist[key].uids[uid].signatures[sig].created * 1000).toJSON();
                        var date_expires = (current_keylist[key].uids[uid].signatures[sig].expires == 0) ? 
                            'Never' : new Date(current_keylist[key].uids[uid].signatures[sig].expires * 1000).toJSON().substring(0, 10);
                        sig_box += "<span class='signature-keyid'>Created: " + date_created.substring(0, 10) + "</span><br/\>";
                        sig_box += "<span class='signature-keyid'>Expires: " + date_expires + "</span><br/\>"

                        sig_box += "<span class='signature-keyid'>";
                        if (sig_keyid == key) {
                            sig_box += "[self-signature]";
                        } else if (!current_keylist[key].uids[uid].signatures[sig].exportable) {
                            sig_box += "[local, non-exportable]";
                        } else {
                            sig_box += "[other signature]";
                        }
                        sig_box += "</span></div><br/\>";

                        if (signed && current_keylist[key].uids[uid].signatures[sig].exportable && key != sig_keyid
                            && !current_keylist[key].uids[uid].signatures[sig].revoked) {
                            sig_box += "<input type='button' class='revsig-button' id='revsig-" + type + "-" + 
                                key + "-" + uid + "-" + rev_index + "' value='Revoke'/\>";
                        }
                        sig_box += "<input type='button' class='delsig-button' id='delsig-" + type + "-" + key +
                            "-" + uid + "-" + sig + "' value='Delete'/\></div>";
                        jQuery(uidobjbody).append(sig_box);
                    } else {
                        sigs_not_in_keyring[sig] = current_keylist[key].uids[uid].signatures[sig];
                    }
                }
                uidobj.appendChild(uidobjbody);
                if (sigs_not_in_keyring.hasOwnProperty(0)) {
                    jQuery(uidobjbody).find(".uid-options-line").append(
                        "<span style='position:absolute;right:60px;color:#F11;margin-top:0px;'>*Signatures made with keys not found in<br/> your keyring are not displayed.</span>"
                    );
//                    console.log(sigs_not_in_keyring, key);
                }
                uidlist.appendChild(uidobj);
            }
            keyobj.appendChild(uidlist);
        }

        // This allows us to toggle the "Enable" and "Default" buttons without activating the accordion
        jQuery('.trust').click(function(e){
            e.stopPropagation();
        });
        var pKeyAcOptions = {
                                header: 'h3', alwaysOpen: false,
                                autoheight:false, clearStyle:true,
                                active: '.ui-accordion-left',
                                collapsible: true
                            }
        jQuery('#' + type + '_keylist').children('.primary_key').
            accordion(pKeyAcOptions).children();

        var subKeyAcOptions = {
                                header: 'h4.subkeylist', alwaysOpen: false,
                                autoheight:false, clearStyle:true,
                                active:'.ui-accordion-left',
                                collapsible: true
                              }

        jQuery(".uidlist").find('.subkey').accordion(subKeyAcOptions);

        var uidAcOptions = {
                                header: 'h4.uidlist', alwaysOpen: false,
                                autoheight:false, clearStyle:true,
                                active:'.ui-accordion-left',
                                collapsible: true
                            }

        jQuery(".uidlist").children('.uid').accordion(uidAcOptions);

        jQuery('#' + type + '_keylist').children('.open_key').
            accordion("activate", 0)
        jQuery('.open_uid').accordion('destroy').accordion().
            accordion("activate", 0).accordion("option", {collapsible: true});
        jQuery('.open_subkey').accordion('destroy').accordion().
            accordion("activate", 0).accordion("option", {collapsible: true});
        jQuery('.ui-add-hover').hover(
            function(){
                jQuery(this).addClass("ui-state-hover");
            },
            function(){
                jQuery(this).removeClass("ui-state-hover");
            }
        );
        jQuery('.private-key-option-list, .public-key-option-list').hover(
            function(){
                jQuery(this).addClass("ui-state-hover");
            },
            function(){
                jQuery(this).removeClass("ui-state-hover");
            }
        ).change(function(){
            params = this.id.split('-');
            switch(params[0]) {
                case "trust":
                    trust_value = this.options.selectedIndex + 1;
                    console.log(this.options.selectedIndex + 1)
                    result = webpg.background.plugin.gpgSetKeyTrust(params[2], trust_value);
                    if (result.error) {
                        console.log(result);
                        return
                    }
                    break;
                default:
                    console.log("we don't know what to do with ourselves...");
                    alert("You attempted to activate " + params[0] +
                        ", but this is not yet implemented...");
                    break;
            }
            console.log(".*-key-option-list changed..", params, trust_value, result);
            webpg.keymanager.buildKeylistProxy(null, params[1], params[2], null, null);
        });
        jQuery('.private-key-option-button, .public-key-option-button, .sub-key-option-button').button().click(function(e){
            var params = this.id.split('-');
            var refresh = false;

            switch(params[0]) {
                case "disable":
                    webpg.background.plugin.gpgDisableKey(params[2]);
                    refresh = true;
                    break;

                case "enable":
                    webpg.background.plugin.gpgEnableKey(params[2]);
                    refresh = true;
                    break;

                case "expire":
                    jQuery("#keyexp-dialog").dialog({
		                resizable: true,
		                height: 180,
		                modal: true,
		                position: "top",
                        open: function(event, ui) {
                            var key = webpg.background.plugin.getNamedKey(params[2])
                            jQuery("#keyexp-date-input").datepicker({
                                showButtonPanel: true,
                                minDate: "+1D",
                                maxDate: "+4096D",
                                changeMonth: true,
	                            changeYear: true
                            });
                            if (params.length > 3) {
                                subkey_idx = params[3];
                            } else {
                                subkey_idx = 0;
                            }
                            if (key[params[2]].subkeys[subkey_idx].expires == 0) {
                                jQuery("#keyexp-never")[0].checked = true;
                                jQuery("#keyexp-date-input").hide();
                            } else {
                                jQuery("#keyexp-ondate")[0].checked = true;
                                jQuery("#keyexp-date-input").show();
                                jQuery('#keyexp-buttonset').children().blur();
                                jQuery("#keyexp-dialog").dialog({ height: 390 })
                            }
                            jQuery("#keyexp-buttonset").buttonset();
                            jQuery("#keyexp-ondate").change(function(){
                                jQuery("#keyexp-date-input").show();
                                jQuery("#keyexp-dialog").dialog({ height: 390 })
                            })
                            jQuery("#keyexp-never").change(function(){
                                jQuery("#keyexp-date-input").hide();
                                jQuery("#keyexp-dialog").dialog({ height: 190 })
                            })

                        },
		                buttons: {
			                    "Save": function() {
                                    if (jQuery("#keyexp-never")[0].checked) {
                                        var new_expire = 0;
                                    } else {
                                        var expire = jQuery("#keyexp-date-input").datepicker("getDate");
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
                                        webpg.background.plugin.gpgSetSubkeyExpire(params[2], subkey_idx, new_expire);
                                    } else {
                                        webpg.background.plugin.gpgSetPubkeyExpire(params[2], new_expire);
                                    }
                                    jQuery(this).dialog("close");
                                    if (params[1] == "subkey") {
                                        params[1] = "private";
                                    }
                                    jQuery(this).dialog("close");
                                    webpg.keymanager.buildKeylistProxy(null, params[1], params[2], params[3], null);
			                    },
		                        "Cancel":function(event,ui) {
                                    console.log("destroyed...");
                                    jQuery("#keyexp-date-input").datepicker('destroy');
                                    jQuery(this).dialog('destroy');
                                },
			                },
	                }).parent().animate({"top": window.scrollY}, 1, function() {
                        jQuery(this).animate({"top": window.scrollY + jQuery(this).innerHeight()
                            / 3}, 1);
                    });
                    break;

                case "passphrase":
                    console.log(webpg.background.plugin.gpgChangePassphrase(params[2]));
                    refresh = false;
                    break;

                case "delete":
                    console.log(params);
                    jQuery("#delete-key-dialog-confirm").dialog({
		                resizable: true,
		                height:160,
		                modal: true,
		                position: "top",
		                close: function() {
                            jQuery("#delete-key-dialog-confirm").dialog("destroy");
                        },
		                buttons: {
			                "Delete this key": function() {
                                // Delete the Public Key
                                if (params[1] == "public") {
                                    result = webpg.background.plugin.gpgDeletePublicKey(params[2]);
                                }
                                if (params[1] == "private") {
                                    result = webpg.background.plugin.gpgDeletePrivateKey(params[2]);
                                }
                                if (params[1] == "subkey") {
                                    result = webpg.background.plugin.gpgDeletePrivateSubKey(params[2],
                                        parseInt(params[3]));
                                }
				                jQuery(this).dialog("close");

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
			                },
			                Cancel: function() {
				                jQuery(this).dialog("close");
			                }
		                }
	                }).parent().animate({"top": window.scrollY}, 1, function() {
                            jQuery(this).animate({"top": window.scrollY + jQuery(this).innerHeight()}, 1);
                        });
	                break;

	            case "adduid":
                    jQuery("#adduid-dialog").dialog({
		                resizable: true,
		                height: 230,
		                width: 550,
		                modal: true,
		                position: "top",
                        "buttons": { 
                            "Create": function() {
                                var form = jQuery(this).find("#adduid-form")[0];
                                if (!jQuery("#adduid-status").length) {
                                    jQuery(form).parent().before("<div id=\"adduid-status\"> </div>");
                                }
                                var error = "";
                                if (!form.uid_0_name.value){
                                    error += "Name Required<br>";
                                    jQuery(form.uid_0_name).addClass("ui-state-error");
                                }
                                if (form.uid_0_name.value.length < 5){
                                    error += "UID Names must be at least 5 characters long<br>";
                                    jQuery(form.uid_0_name).addClass("ui-state-error");
                                }
                                if (!isNaN(form.uid_0_name.value[0])){
                                    error += "UID Names cannot begin with a number<br>";
                                    jQuery(form.uid_0_name).addClass("ui-state-error");
                                }
                                if (form.uid_0_email.value && !webpg.utils.
                                    isValidEmailAddress(form.uid_0_email.value)){
                                    error += "Not a valid email address<br>";
                                    jQuery(form.uid_0_email).addClass("ui-state-error");
                                } else {
                                    jQuery(form.uid_0_email).removeClass("ui-state-error");
                                }
                                if (error.length) {
                                    jQuery("#adduid-status").html(error)[0].style.display="block";
                                    return false;
                                }
                                webpg.keymanager.adduid_waiting = true;
                                jQuery("#adduid-dialog").dialog("option", "minHeight", 250);
                                jQuery("#adduid-status").html(error)[0].style.display="block";
                                var result = webpg.background.plugin.gpgAddUID(params[2], form.uid_0_name.value,
                                        form.uid_0_email.value, form.uid_0_comment.value);
                                if (result.error) {
                                    console.log(result);
                                    return
                                }
                                jQuery(this).dialog("close");
                                jQuery("#adduid-form")[0].reset();
                                jQuery("#adduid-dialog").dialog("destroy");
                                webpg.keymanager.buildKeylistProxy(null, params[1], params[2], null, null);
                            },
                            Cancel: function() {
                                jQuery("#adduid-dialog").dialog("close");
                                jQuery("#adduid-form")[0].reset();
                                jQuery("#adduid-dialog").dialog("destroy");
                            }
                        },
                    }).parent().animate({"top": window.scrollY}, 1, function() {
                            jQuery(this).animate({"top": window.scrollY + jQuery(this).innerHeight()
                                / 2}, 1);
                        });
                    break;

                case "addsubkey":
                    webpg.keymanager.genkey_refresh = false;
                    jQuery("#gensubkey-dialog").dialog({
                        resizable: true,
                        minHeight: 300,
                        width: 300,
                        modal: true,
                        autoOpen: false,
                        position: "top",
                        "buttons": { 
                            "Create": function() {
                                var form = jQuery(this).find("#gensubkey-form")[0];
                                form.key_id.value = params[2];
                                jQuery(form).parent().before("<div id=\"gensubkey-status\"> </div>");
                                var error = "";
                                webpg.keymanager.genkey_waiting = true;
                                if (webpg.utils.detectedBrowser['product'] == "chrome") {
                                    chrome.extension.onConnect.addListener(function(port) {
                                        port.onMessage.addListener(webpg.keymanager.progressMsg);
                                    });
                                }
                                jQuery("#gensubkey-form").find(".open").trigger("click");
                                console.log("going to create a subkey with the following details:" + '\n' +
                                    "Key ID:", form.key_id.value, " Sub Key:", form.subKey_algo.value + 
                                      ' (' + form.subKey_size.value + ')\n' + " sign_flag: " + form.sign.checked +
                                      " enc_flag: " + form.enc.checked + " auth_flag: " + form.auth.checked + "\n" +
                                    "expiration: Key will expire in " + form.key_expire.value + ' days');
                                jQuery("#gensubkey-dialog").dialog("option", "minHeight", 300);
                                jQuery("#gensubkey-status").html(error)[0].style.display="block";
                                jQuery("#gensubkey-status").html("Building key, please wait..");
                                jQuery("#gensubkey-status").after("<div id='gensubkey-status_detail' style=\"font-size: 12px; color:#fff;padding: 20px;\">This may take a long time (5 minutes or more) to complete depending on the selected options. Please be patient while the key is created. It is safe to close this window, key generation will continue in the background.<br><br><div id='gensubkey_progress' style='height:auto;display:block;'></div></div>");
                                jQuery(form)[0].style.display = "none";
                                jQuery("#gensubkey-dialog")[0].style.height = "20";
                                jQuery("#gensubkey-dialog")[0].style.display = "none";
                                var response = webpg.background.plugin.gpgGenSubKey(form.key_id.value,
                                    form.subKey_algo.value,
                                    form.subKey_size.value,
                                    form.key_expire.value,
                                    (form.sign.checked) ? 1 : 0,
                                    (form.enc.checked) ? 1 : 0,
                                    (form.auth.checked) ? 1 : 0
                                );
                                if (response == "queued") {
                                    jQuery("#gensubkey-dialog").dialog("option", "buttons", { 
                                        "Close": function() {
                                            jQuery("#gensubkey-dialog").dialog("close");
                                        }
                                    });
                                }
                            },
                            Cancel: function() {
                                jQuery("#gensubkey-dialog").dialog("close");
                                if (window.gensubkey_refresh)
                                    webpg.keymanager.buildKeylistProxy(null, 'private');
                            }
                        },
                    }).parent().animate({"top": window.scrollY}, 1, function() {
                            jQuery(this).animate({"top": window.scrollY + jQuery(this).innerHeight()
                                / 3}, 1);
                        });
                    jQuery("#subKey_flags").buttonset();
                    jQuery("#gensubkey-form").children('input').removeClass('input-error');
                    jQuery("#gensubkey-form")[0].reset();
                    jQuery('#gensubkey-form .subkey-algo').each(function(){
                        jQuery(this)[0].options.selectedIndex = jQuery(this)[0].options.length - 1;
                        jQuery(this).parent().find('.key-size')[0].children[0].disabled = true;
                        jQuery(jQuery(this).parent().find('.key-size')[0].children[0]).hide();
                    }).change(function(){
                        selectedIndex = jQuery(this)[0].options.selectedIndex;
                        if (selectedIndex == 0 || selectedIndex == 4) {
                            // DSA Selected
                            jQuery(this).parent().find('.key-size')[0].children[0].disabled = false;
                            jQuery(jQuery(this).parent().find('.key-size')[0].children[0]).show();
                            jQuery(this).parent().find('.key-size')[0].children[4].disabled = true;
                            jQuery(jQuery(this).parent().find('.key-size')[0].children[4]).hide();
                        } else if (selectedIndex == 1 || selectedIndex == 3 || selectedIndex == 5) {
                            // RSA Selected
                            jQuery(this).parent().find('.key-size')[0].children[0].disabled = true;
                            jQuery(jQuery(this).parent().find('.key-size')[0].children[0]).hide();
                            jQuery(this).parent().find('.key-size')[0].children[4].disabled = false;
                            jQuery(jQuery(this).parent().find('.key-size')[0].children[4]).show();
                        } else if (selectedIndex == 2) {
                            // ElGamal Selected
                            jQuery(this).parent().find('.key-size')[0].children[0].disabled = false;
                            jQuery(jQuery(this).parent().find('.key-size')[0].children[0]).show();
                            jQuery(this).parent().find('.key-size')[0].children[4].disabled = false;
                            jQuery(jQuery(this).parent().find('.key-size')[0].children[4]).show();
                        }
                        if (selectedIndex < 4) {
                            jQuery("#subKey_flags").hide();
                            jQuery("#gensubkey-dialog").dialog("option", "height", 240);
                        } else {
                            if (selectedIndex == 4) {
                                jQuery("#subKey_flags").find('#sign')[0].checked = true;
                                jQuery("#subKey_flags").find('#enc')[0].checked = false;
                                jQuery("#subKey_flags").find('#auth')[0].checked = false;
                                jQuery("#subKey_flags").find('#enc')[0].disabled = true;
                            } else {
                                jQuery("#subKey_flags").find('#sign')[0].checked = true;
                                jQuery("#subKey_flags").find('#enc')[0].checked = true;
                                jQuery("#subKey_flags").find('#auth')[0].checked = false;
                                jQuery("#subKey_flags").find('#enc')[0].disabled = false;
                            }
                            jQuery("#subKey_flags").show();
                            jQuery("#gensubkey-dialog").dialog("option", "height", 300);
                        }
                        jQuery("#subKey_flags").buttonset("refresh");
                    });
                    jQuery("#gensubkey-dialog").dialog('open');
                    jQuery("#gensubkey-form").find(".open").trigger("click");
                    break;

                case "export":
                    var export_result = webpg.background.plugin.gpgExportPublicKey(params[2]).result;
                    jQuery("#export-dialog-text").html(webpg.utils.escape(export_result));
                    jQuery("#export-dialog-copytext").html(webpg.utils.escape(export_result));
                    jQuery("#export-dialog").dialog({
		                resizable: true,
		                height: 230,
		                width: 536,
		                modal: true,
		                position: "top",
                        "buttons": {
                            "Copy": function() {
                                jQuery("#export-dialog-copytext")[0].select();
                                jQuery("#export-dialog-msg").html(
                                    webpg.utils.copyToClipboard(window, document)
                                );
                                jQuery("#export-dialog-msg")[0].style.display="block"
                            },
                            "Close": function() {
                                jQuery("#export-dialog").dialog("destroy");
                                jQuery("#export-dialog-msg")[0].style.display="none"
                            }
                        }
                    }).parent().animate({"top": window.scrollY}, 1, function() {
                            jQuery(this).animate({"top": window.scrollY + jQuery(this).innerHeight()
                                / 2}, 1);
                        });
                    break;

                case "revoke":
                    jQuery("#revkey-confirm").find('#revkey-text').html("Please specify the revocation details -<br/\><br/\>" +
                        "<label for='revkey-reason'>Reason:</label>" +
                        "<select name='revkey-reason' id='revkey-reason' class='ui-add-hover ui-corner-all ui-widget ui-state-default'>" +
                        "<option value='0' class='ui-state-default'>No reason specified</option>" +
                        "<option value='1' class='ui-state-default'>Key has been compromised</option>" +
                        "<option value='2' class='ui-state-default'>Key is superseded</option>" +
                        "<option value='2' class='ui-state-default'>Key is no longer used</option>" +
                        "</select><br/\>" +
                        "<label for='revkey-desc'>Description:</label>" +
                        "<input type='text' name='revkey-desc' id='revkey-desc' class='ui-corner-all ui-widget ui-state-default'/\>");
                    jQuery("#revkey-confirm").dialog({
                        resizable: true,
                        height:250,
                        width: 350,
                        modal: true,
                        autoOpen: false,
                        position: "top",
                        close: function() {
                            jQuery("#revkey-confirm").dialog("destroy");
                        },
                        "buttons": {
                            "Revoke": function() {
                                var reason = jQuery('#revkey-reason')[0].value;
                                var desc = jQuery('#revkey-desc')[0].value;
                                console.log(params[2], params[3], reason, desc);
                                var revkey_result = webpg.background.plugin.gpgRevokeKey(params[2],
                                    parseInt(params[3]), parseInt(reason), desc);
                                webpg.keymanager.buildKeylistProxy(null, "private", params[2], params[3], null);
                                jQuery("#revkey-confirm").dialog("close");
                            },
                            "Cancel": function() {
                                jQuery("#revkey-confirm").dialog("close");
                            }
                        }
                    }).parent().animate({"top": window.scrollY}, 1, function() {
                            jQuery(this).animate({"top": window.scrollY + jQuery(this).innerHeight()
                                / 2}, 1);
                        });
                    jQuery("#revkey-confirm").dialog('open');
                    break;

                default:
                    console.log("we don't know what to do with ourselves...");
                    alert("You attempted to activate " + params[0] +
                        ", but this is not yet implemented...");
                    break;
            }
            console.log(".*-key-option-button pressed..", params);
            if (refresh) {
                if (params[1] == "subkey")
                    params[1] = "private";
                webpg.keymanager.buildKeylistProxy(null, params[1], params[2], null, null);
            }
        }).parent().find('.ui-dialog-buttonpane').
            find(".ui-button-text").each(function(iter, src) {
                jQuery(src).text(jQuery(src).parent()[0].getAttribute("text"))
            }
        );
        jQuery('.uid-option-button').button().click(function(e){
            var params = this.id.split('-');
            var refresh = false;
            switch(params[0]) {
                case "delete":
                    jQuery( "#deluid-confirm" ).dialog({
		                resizable: true,
		                height:180,
		                modal: true,
		                position: "top",
                        close: function() {
                            jQuery("#deluid-confirm").dialog("destroy");
                        },
		                buttons: {
			                "Delete this UID": function() {
                                // Delete the Public Key
                                var uid_idx = parseInt(params[3]) + 1;
                                var result = webpg.background.plugin.gpgDeleteUID(params[2], uid_idx);
                                console.log(result, params[2], uid_idx);
				                jQuery(this).dialog("close");
                                // Remove the Key-ID from the params array, since it
                                //  no longer exists
                                if (!result.error) {
                                    params[3] = null;
                                    webpg.keymanager.buildKeylistProxy(null, params[1], params[2], null, null);
                                }
			                },
			                Cancel: function() {
				                jQuery(this).dialog("close");
			                }
		                }
	                }).parent().animate({"top": window.scrollY}, 1,
	                    function() {
                            jQuery(this).animate({"top": window.scrollY + jQuery(this).innerHeight()
                                / 2}, 1);
                        });
                    break;

                case "primary":
                    refresh = true;
                    var uid_idx = parseInt(params[3]) + 1;
                    var result = webpg.background.plugin.gpgSetPrimaryUID(params[2], uid_idx);
                    params[3] = 0;
                    break;

                case "revoke":
                    jQuery("#revuid-confirm").find('#revuid-text').html("Please specify the revocation details -<br/\><br/\>" +
                        "<label for='revuid-reason'>Reason:</label>" +
                        "<select name='revuid-reason' id='revuid-reason' class='ui-add-hover ui-corner-all ui-widget ui-state-default'>" +
                        "<option value='0' class='ui-state-default'>No reason specified</option>" +
                        "<option value='4' class='ui-state-default'>User ID is no longer valid</option>" +
                        "</select><br/\>" +
                        "<label for='revuid-desc'>Description:</label>" +
                        "<input type='text' name='revuid-desc' id='revuid-desc' class='ui-corner-all ui-widget ui-state-default'/\>");
                    jQuery("#revuid-confirm").dialog({
                        resizable: true,
                        height:250,
                        width: 350,
                        modal: true,
                        autoOpen: false,
                        position: top,
                        close: function() {
                            jQuery("#revuid-confirm").dialog("destroy");
                        },
                        "buttons": {
                            "Revoke": function() {
                                var reason = jQuery('#revuid-reason')[0].value;
                                var desc = jQuery('#revuid-desc')[0].value;
                                console.log(params[2], params[3], params[4], reason, desc);
                                var revuid_result = webpg.background.plugin.gpgRevokeUID(params[2],
                                    parseInt(params[3]) + 1, parseInt(reason), desc);
                                webpg.keymanager.buildKeylistProxy(null, params[1], params[2], null, params[3]);
                                jQuery("#revuid-confirm").dialog("close");
                            },
                            "Cancel": function() {
                                jQuery("#revuid-confirm").dialog("close");
                            }
                        }
                    }).parent().animate({"top": window.scrollY}, 1, function() {
                            jQuery(this).animate({"top": window.scrollY + jQuery(this).innerHeight()
                                / 2}, 1);
                        });
                    jQuery("#revuid-confirm").dialog('open');
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
        jQuery('.uid-option-button-sign').button().click(function(e){
            jQuery("#createsig-dialog").dialog({
                resizable: true,
                minHeight: 250,
                width: 630,
                modal: true,
                autoOpen: false,
                position: "top"
            }).parent().animate({"top": window.scrollY}, 1, function() {
                    jQuery(this).animate({"top": window.scrollY + jQuery(this).innerHeight()
                        / 3}, 1);
                });
            var params = this.id.split('-');
            var enabled_keys = webpg.preferences.enabled_keys.get();
            jQuery('#createsig-form').html("<p class='help-text'>Please select which of your keys to create the signature with:</p>");
            if (type == "private")
                keylist = pkeylist;
            var current_signatures = keylist[params[2]].uids[params[3]].signatures;
            var cursig = [];
            for (sig in current_signatures) {
                cursig.push(current_signatures[sig].keyid);
            }
            if (!webpg.preferences.enabled_keys.length()) {
                jQuery('#createsig-form').append("You have not enabled any keys for use with webpg; <a href='" + webpg.utils.resourcePath + "key_manager.html?tab=0&helper=enable'>please click here</a> and select 1 or more keys for use with webpg.");
            }
            for (idx in enabled_keys) {
                var key = enabled_keys[idx];
                var signed = (cursig.indexOf(key) != -1);
                var status = signed? "<div style='width: 28px; display: inline;text-align:right;'><img style='height: 14px; padding: 2px 2px 0 4px;' id='img_" + key + "' " +
                    "src='skin/images/badges/stock_signature.png' alt='Already signed with this key'/\></div>" :
                    "<div style='width: 28px; display: inline;text-align:right;'><img style='display:none; height: 14px; padding: 2px 2px 0 4px;' id='img_" + key + "' " +
                    "src='skin/images/check.png' alt='Signature added using this key'/\></div>";
                if (signed)
                    status += "<input style='display: none;' type='checkbox' id='sign_" + key + "' name='" + key + "' disabled/\>";
                else
                    status += "<input type='checkbox' id='sign_" + key + "' name='" + key + "'/\>";
                jQuery('#createsig-form').append(status + "<label for='sign_" + key + "' id='lbl-sign_" + key + "' class='help-text'>" + webpg.keymanager.pkeylist[key].name + " (" + key + ")</label><div id='lbl-sign-err_" + key + "' style='display: none;'></div><br/\>");
                if (webpg.preferences.enabled_keys.length() == 1 && signed) {
                    jQuery(jQuery("button", jQuery("#createsig-dialog").parent()).children()[1]).hide();
                }
            }
            var refresh = false;
            jQuery("#createsig-dialog").dialog({
                position: "top",
                "buttons": {
                    " Sign ": function() {
                        var checked = jQuery("#createsig-form").children("input:checked");
                        var error = false;
                        for (item in checked) {
                            if (checked[item].type == "checkbox") {
                                var sign_result = webpg.background.plugin.gpgSignUID(params[2], 
                                    parseInt(params[3]) + 1,
                                    checked[item].name, 1, 1, 1);
                                error = (error || (sign_result['error'] && sign_result['gpg_error_code'] != 65)); // if this is true, there were errors, leave the dialog open
                                if (sign_result['error'] && sign_result['gpg_error_code'] != 65) {
                                    jQuery('#img_' + checked[item].name)[0].src = "skin/images/cancel.png"
                                    lbl_sign_error = jQuery('#lbl-sign-err_' + checked[item].name)[0];
                                    lbl_sign_error.style.display = "inline";
                                    lbl_sign_error.style.color = "#f40";
                                    lbl_sign_error.style.margin = "0 0 0 20px";
                                    jQuery(lbl_sign_error).html(sign_result['error_string']);
                                    jQuery(jQuery("button", jQuery("#createsig-dialog").parent()).children()[0]).text("Close")
                                    jQuery(jQuery("button", jQuery("#createsig-dialog").parent()).children()[1]).text("Try again")
                                } else {
                                    refresh = true; // the keys have changed, we should refresh on dialog close;
                                    jQuery('#img_' + checked[item].name)[0].src = "skin/images/check.png"
                                }
                                jQuery('#img_' + checked[item].name).show().next().hide();
                            }
                        }
                        console.log("should we refresh?", refresh? "yes":"no");
                        if (!error && refresh) {
                            jQuery("#createsig-dialog").dialog("destroy");
                            webpg.keymanager.buildKeylistProxy(null, params[1], params[2], null, params[3]);
                        }
                    },
                    "Cancel": function() {
                        jQuery("#createsig-dialog").dialog("destroy");
                        if (refresh) {
                            webpg.keymanager.buildKeylistProxy(null, params[1], params[2], null, params[3]);
                        }
                    },
                }
            }).parent().animate({"top": window.scrollY}, 1, function() {
                    jQuery(this).animate({"top": window.scrollY + jQuery(this).innerHeight()
                / 2}, 1)});
            if (webpg.preferences.enabled_keys.length() == 1 && cursig.indexOf(enabled_keys[0]) != -1) {
                jQuery(jQuery("button", jQuery("#createsig-dialog").parent()).children()[1]).hide();
            }
            jQuery("#createsig-dialog").dialog('open');
        });
        if (!webpg.background.plugin.webpg_status.gpgconf_detected) {
            jQuery('.uid-option-button-sign').button({disabled: true, label: "Cannot create signatures without gpgconf utility installed"});
        }
        jQuery('.uid-option-button-sign.uid-revoked').button({disabled: true, label: "Cannot sign a revoked UID"});
        jQuery('.uid-option-button-primary.uid-revoked').button({disabled: true, label: "Cannot make a revoked UID primary"});
        jQuery('.uid-option-button-sign.key-expired').button({disabled: true, label: "Cannot sign an expired key"});
        jQuery('.revsig-button').button().click(function(e){
            var params = this.id.split('-');
            var calling_button = this;
            var sig_details = jQuery(calling_button).parent()[0].id.split('-');
            jQuery("#revsig-confirm").find('#revsig-text').html("Please specify the revocation details -<br/\><br/\>" +
                "<label for='revsig-reason'>Reason:</label>" +
                "<select name='revsig-reason' id='revsig-reason' class='ui-add-hover ui-corner-all ui-widget ui-state-default'>" +
                "<option value='0' class='ui-state-default'>No reason specified</option>" +
                "<option value='4' class='ui-state-default'>User ID is no longer valid</option>" +
                "</select><br/\>" +
                "<label for='revsig-desc'>Description:</label>" +
                "<input type='text' name='revsig-desc' id='revsig-desc' class='ui-corner-all ui-widget ui-state-default'/\>");
            jQuery("#revsig-confirm").dialog("option",
                "buttons", {
                    "Revoke": function() {
                        var reason = jQuery('#revsig-reason')[0].value;
                        var desc = jQuery('#revsig-desc')[0].value;
                        console.log(params[2], params[3], params[4], reason, desc);
                        var revsig_result = webpg.background.plugin.gpgRevokeSignature(params[2],
                            parseInt(params[3]), parseInt(params[4]), parseInt(reason), desc);
                        //console.log('delete', delsig_result, params[2], parseInt(params[3]) + 1, parseInt(params[4]) + 1)
                        webpg.keymanager.buildKeylistProxy(null, params[1], params[2], null, params[3]);
                        jQuery("#revsig-confirm").dialog("close");
                    },
                    "Cancel": function() {
                        jQuery("#revsig-confirm").dialog("close");
                    }
                }
            ).parent().animate({"top": window.scrollY}, 1, function() {
                jQuery(this).animate({"top": window.scrollY + jQuery(this).innerHeight()
                / 3}, 1)});
            jQuery("#revsig-confirm").dialog('open');
        });
        jQuery("#revsig-confirm").dialog({
            resizable: true,
            height:250,
            width: 350,
            modal: true,
            autoOpen: false,
            close: function() {
                jQuery("#revsig-confirm").dialog("destroy");
            },
            buttons: {
                'Revoke this Signature?': function() {
                    jQuery(this).dialog('close');
                },
                Cancel: function() {
                    jQuery(this).dialog('close');
                }
            }
        }).parent().animate({"top": window.scrollY}, 1, function() {
            jQuery(this).animate({"top": window.scrollY + jQuery(this).innerHeight()
                / 2}, 1);
        });

        jQuery('.delsig-button').button().click(function(e){
            var params = this.id.split('-');
            var calling_button = this;
            var sig_details = jQuery(calling_button).parent()[0].id.split('-');
            jQuery("#delsig-confirm").find('#delsig-text').html("Are you certain you would like to delete signature " +
                sig_details[1] + " from this User id?");
            if (sig_details[1] in webpg.keymanager.pkeylist < 1) {
                jQuery("#delsig-confirm").find('#delsig-text').append("<br><br><span class='ui-icon ui-icon-alert' style='float:left; margin:0 7px 20px 0;'></span>This signature was made with a key that does not belong to you; This action cannot be undone without refreshing the keylist from a remote source.");
                jQuery("#delsig-confirm").dialog("option", "height", "240");
                jQuery("#delsig-confirm").dialog("option", "width", "400");
            }
            jQuery("#delsig-confirm").dialog("option", "buttons", { "Delete":
                function() {
                    var delsig_result = webpg.background.plugin.
                        gpgDeleteUIDSign(params[2], parseInt(params[3]) + 1,
                        parseInt(params[4]) + 1);
                    webpg.keymanager.buildKeylistProxy(null, params[1], params[2], null, params[3]);
                    jQuery("#delsig-confirm").dialog("close");
                },
                Cancel: function() {
                    jQuery("#delsig-confirm").dialog("close");
                }
            }).parent().animate({"top": window.scrollY}, 1, function() {
                jQuery(this).animate({"top": window.scrollY + jQuery(this).innerHeight()
                    / 2}, 1);
            });
            jQuery("#delsig-confirm").dialog('open');
        });
        jQuery("#delsig-confirm").dialog({
            resizable: true,
            height:200,
            modal: true,
            autoOpen: false,
            position: "top",
            buttons: {
                'Delete this Signature?': function() {
                    jQuery(this).dialog('close');
                },
                Cancel: function() {
                    jQuery(this).dialog('close');
                }
            }
        }).parent().animate({"top": window.scrollY}, 1, function() {
            jQuery(this).animate({"top": window.scrollY + jQuery(this).innerHeight()}, 1);
        });

        jQuery('.enable-check').button().next().next().button({
            text: false,
            icons: {
                primary: 'ui-icon-check'
            }
        }).click(function(e) {
            var keyid = this.id.substr(-16);
            webpg.preferences.default_key.set(keyid);
            var enable_element = jQuery('#check-' + this.id.substr(-16))[0];
            var enabled_keys = webpg.preferences.enabled_keys.get();
            if (enabled_keys.indexOf(keyid) == -1) {
                webpg.preferences.enabled_keys.add(keyid);
                jQuery(enable_element).trigger('click');
                jQuery(enable_element).next().html(jQuery(enable_element).next()[0].innerHTML.replace('Disabled', 'Enabled'));
            }
        }).parent().buttonset();

        jQuery('.enable-check').next().hover(
            function(e){
                jQuery(this).parent().children('.keyoption-help-text').html("Enable this key for signing");
            },
            function(e){
                jQuery(this).parent().children('.keyoption-help-text').html("&nbsp;");
            }
        );
        jQuery('input.default-check').next().hover(
            function(e){
                var input = jQuery(this).prev()[0];
                if (input && input.checked) {
                    jQuery(this).parent().children('.keyoption-help-text').html("This is your default key");
                } else {
                    jQuery(this).parent().children('.keyoption-help-text').html("Make this the default key for encryption operations");
                }
            },
            function(e){
                jQuery(this).parent().children('.keyoption-help-text').html("&nbsp;");
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
            var element = jQuery(openItem);
            if (element.length > 0) {
                var pos = element.offset().top - pos_offset;
                jQuery('html,body').animate({scrollTop: pos}, 1);
            }
        }

        if (type == 'public') {
            // Setup the search input
            jQuery("#pubkey-search").unbind("change").bind("change", function(e) {
                // Sometimes the event is a duplicate, so check the
                //  data object for "original_value"
                if (jQuery(this).data("original_value") == this.value)
                    return
                // This is an original event, so set the data object
                //  "original_value"
                jQuery(this).data('original_value', this.value);
                // Set our keylist object to the current pubkeylist
                var keylist = webpg.keymanager.pubkeylist;
                // Retrieve the value of the serach field
                var val = e.target.value;
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
                    var keyobjStr = JSON.stringify(keyobj);
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
                    
                jQuery("#dialog-modal").dialog('option', 'modal', false)
                .dialog('open').animate({"top": window.scrollY}, 1,
                    function() {
                        jQuery('#dialog-msg').text(
                            (val.length > 0) ? "Searching for \"" + val
                            + "\"" : "Please wait while we build the key list."
                        );
                        jQuery(this).animate({"top": window.scrollY +
                            jQuery(this).innerHeight() + 100}, 1,
                        function() {
                            webpg.keymanager.buildKeylist(
                                nkeylist, 'public');
                            jQuery("#dialog-modal").dialog('close');
                        }
                    )
                });
            })
        }

    },
    /* end buildKeylist */
}

jQuery(function(){
    if (webpg.utils.getParameterByName("auto_init") == "true")
        webpg.keymanager.init();
});
/* ]]> */
