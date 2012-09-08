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
        if (webpg.utils.detectedBrowser == "firefox" || webpg.utils.detectedBrowser == "thunderbird") {
            webpg.background = browserWindow;
            webpg.secret_keys = browserWindow.secret_keys;
        } else if (webpg.utils.detectedBrowser == "chrome") {
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
        $('#tab-2-btn').click(function(){
            webpg.keymanager.buildKeylistProxy(
                null, 'private', null, null, null, true
            );
        });

        // Build the Public keylist on tab selection
        $('#tab-3-btn').click(function(){
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
        $('#tabs').tabs({ selected: selected_tab });

        if (selected_tab == 0)
            webpg.keymanager.buildKeylistProxy(
                null, 'private', openKey, openSubkey, openUID, true
            );
        if (selected_tab == 1)
            webpg.keymanager.buildKeylistProxy(
                null, 'public', openKey, openSubkey, openUID, true
            );
        if (qs.strip) {
            $("#header").remove();
            $(document.getElementsByTagName("ul")[0]).remove();
        }
        $('#close').button().click(function(e) { window.top.close(); });

        $('ul.expand').each(function(){
            $('li.trigger', this).filter(':first').addClass('top').end().filter(':not(.open)').next().hide();
            $('li.trigger', this).click(function(){
                var height = ($("#genkey-status").length > 0) ? $("#genkey-status").height() : 0;
                if($(this).hasClass('open')) {
                    $(this).removeClass('open').next().slideUp();
                    $("#genkey-dialog").dialog("option", "minHeight", 300 + height);
                } else {
                    $(this).parent().find('li.trigger').removeClass('open').next().filter(':visible').slideUp();
                    $(this).addClass('open').next().slideDown(300, function() {
                        $("#genkey-dialog").dialog("option", "minHeight",
                            $("#genkey-dialog")[0].scrollHeight + $('li.trigger').parent().parent().innerHeight()
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

        $("#dialog-modal").dialog({
            height: 140,
            modal: true,
            autoOpen: true,
            title: "Building Key list"
        }).animate({"top": window.scrollY}, 1, function() {
            $('#dialog-msg').text("Please wait while we build the key list.");
            $(this).animate({"top": window.scrollY + $(this).innerHeight() + 100}, 1,
            function() {
                webpg.keymanager.buildKeylist(
                    keyList, type, openKey,
                    openSubkey, openUID
                );
                $("#dialog-modal").dialog('close');
                if (qs.helper) {
                    function bounce(elem_class, left, top, perpetual) {
                        var nleft = $($(elem_class)[0]).parent().offset().left - left;
                        var ntop = $($(elem_class)[0]).parent().offset().top - top;
                        $("#error_help").parent().css('left', nleft).css('top', ntop).
                            effect("bounce", {times: 1, direction: 'up', distance: 8 }, 1200, function(){ if (perpetual) { bounce(elem_class, left, top, perpetual) } } )
                    }
                    var helper_arrow = document.createElement('div');
                    $(helper_arrow).html('' +
                        '<div id="error_help" style="text-align: center; display: inline; text-shadow: #000 1px 1px 1px; color: #fff; font-size: 12px;">' +
                        '<div id="help_text" style="display: block; border-radius: 4px; -moz-border-radius: 4px; -webkit-border-radius: 4px; z-index: 10; padding: 8px 5px 8px 5px; margin-right: -5px; background-color: #ff6600; min-width: 130px;"></div>' +
                        '<span style="margin-left: 94px;"><img width="30px" src="skin/images/help_arrow.png"></span>' +
                        '</div>');
                    helper_arrow.style.position = 'absolute';
                    helper_arrow.style.zIndex = 1000;
                    $(helper_arrow).css("max-width", "75%");
                    switch(qs.helper){
                        case 'enable':
                            $(helper_arrow).find('#help_text').html("Click to enable key");
                            document.body.appendChild(helper_arrow);
                            $('.enable-check').click(function() { $(helper_arrow).stop(true, true).stop(true, true).hide(); });
                            bounce('.enable-check', 75, 45, true);
                            break;
                        case 'default':
                            $(helper_arrow).find('#help_text').html("Click to set default key");
                            $('.default-check').click(function() { $(helper_arrow).stop(true, true).stop(true, true).hide(); });
                            document.body.appendChild(helper_arrow);
                            bounce('.default-check', 40, 45, true);
                            break;
                        case 'signuids':
                            $(helper_arrow).find('#help_text').html("Below is a list of key IDs that represent the domains that this server key is valid for; please sign the domain IDs that you want to use with webpg.");
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
        var msg = (webpg.utils.detectedBrowser == "firefox" || webpg.utils.detectedBrowser == "thunderbird") ? evt.detail : evt;
        var dialog = ($("#genkey-dialog").dialog("isOpen") == true) ?
            "#genkey" : ($("#gensubkey-dialog").dialog("isOpen") == true) ?
            "#gensubkey" : null;
        if (dialog && msg.type == "progress") {
            var data = msg.data;
            if (!isNaN(data))
                data = String.fromCharCode(data);
            data += " ";
            $(dialog + "_progress").append(data);
            var waitMsg = (msg.data == 43) ? "Generating Key..." : "Waiting for entropy...";
            $(dialog + "-status").html("Building key, please wait.. [" + waitMsg + "]");
            if (data == "complete" || data == "complete ") {
                webpg.keymanager.genkey_refresh = true;
                webpg.keymanager.genkey_waiting = false;
                var gen_dialog = dialog + "-dialog";
                var new_pkeylist = webpg.background.plugin.getPrivateKeyList();
                var generated_key = (dialog == "#gensubkey") ?
                    $(gen_dialog).find("#gensubkey-form")[0].key_id.value
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
                $(dialog + "-status_detail").remove()
                $(dialog + "-status").remove();
                $(dialog + "-form")[0].reset();
                $(dialog + "-form")[0].style.display="inline-block";
                $(dialog + "-dialog").dialog("close");
            } else if (data.search("failed") > -1) {
                webpg.keymanager.genkey_waiting = false;
                $(dialog + "-status").html("Generation " + data);
                $(dialog + "-dialog").dialog("option", "buttons", { 
                    "Close": function() {
                        if (dialog == "#gensubkey")
                             $(dialog + "-dialog").dialog("option", "height", 320);
                        $(dialog + "_progress").html("");
                        $(dialog + "-status_detail").remove()
                        $(dialog + "-status").remove();
                        $(dialog + "-form")[0].reset();
                        $(dialog + "-form")[0].style.display="inline-block";
                        $(dialog + "-dialog").dialog("close");
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
                var find = $("#pubkey-search")[0].value;
                if (find.length > 0) {
                    if (find.search(":") > -1) {
                        var keylist = webpg.background.plugin.getPublicKeyList();
                        $("#pubkey-search")[0].value = '';
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

        $(keylist_element).html("<div class='ui-accordion-left'></div>");

        if (type == 'private') {
            // Create the key-generate button and dialog
            var genkey_div = document.createElement('div');
            genkey_div.style.padding = "8px 0 20px 0";
            var genkey_button = document.createElement('input');
            genkey_button.setAttribute('value', 'Generate New Key');
            genkey_button.setAttribute('type', 'button');
            $(genkey_button).button().click(function(e){
                webpg.keymanager.genkey_refresh = false;
                $("#genkey-dialog").dialog({
                    "position": "top",
                    "buttons": {
                        "Create": function() {
                            var form = $(this).find("#genkey-form")[0];
                            $(form).parent().before("<div id=\"genkey-status\"> </div>");
                            var error = "";
                            if (!form.uid_0_name.value){
                                error += "Name Required<br>";
                                $(form.uid_0_name).addClass("ui-state-error");
                            }
                            if (form.uid_0_name.value.length < 5){
                                error += "UID Names must be at least 5 characters<br>";
                                $(form.uid_0_name).addClass("ui-state-error");
                            } else {
                                $(form.uid_0_name).removeClass("ui-state-error");
                            }
                            if (!isNaN(form.uid_0_name.value[0])){
                                error += "UID Names cannot begin with a number<br>";
                                $(form.uid_0_name).addClass("ui-state-error");
                            } else {
                                $(form.uid_0_name).removeClass("ui-state-error");
                            }
                            if (form.uid_0_email.value && !webpg.utils.
                                isValidEmailAddress(form.uid_0_email.value)){
                                error += "Not a valid email address<br>";
                                $(form.uid_0_email).addClass("ui-state-error");
                            } else {
                                $(form.uid_0_email).removeClass("ui-state-error");
                            }
                            if (form.passphrase.value != form.pass_repeat.value){
                                $(form.passphrase).addClass("ui-state-error");
                                $(form.pass_repeat).addClass("ui-state-error");
                                $(form.passphrase).next()
                                    .find("#passwordStrength-text")
                                    .html("Passphrases do not match")
                                    .css({"color": "#f00"});
                                error += "Passphrases do not match<br>";
                            } else {
                                $(form.passphrase).removeClass("ui-state-error");
                                $(form.pass_repeat).removeClass("ui-state-error");
                            }
                            if (error.length) {
                                $("#genkey-status").html(error)[0].style.display="block";
                                $("#genkey-dialog").dialog("option", "minHeight", 350);
                                return false;
                            }
                            webpg.keymanager.genkey_waiting = true;
                            if (webpg.utils.detectedBrowser == "chrome") {
                                chrome.extension.onConnect.addListener(function(port) {
                                    port.onMessage.addListener(webpg.keymanager.progressMsg);
                                });
                            }
                            $("#genkey-form").find(".open").trigger("click");
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
                            $("#genkey-dialog").dialog("option", "minHeight", 300);
                            $("#genkey-status").html(error)[0].style.display="block";
                            $("#genkey-status").html("Building key, please wait..");
                            $("#genkey-status").after("<div id='genkey-status_detail' style=\"font-size: 12px; color:#fff;padding: 20px;\">This may take a long time (5 minutes or more) to complete depending on the selected options. Please be patient while the key is created. It is safe to close this window, key generation will continue in the background.<br><br><div id='genkey_progress' style='height:auto;display:block;'></div></div>");
                            $(form)[0].style.display = "none";
                            $("#genkey-dialog")[0].style.height = "20";
                            $("#genkey-dialog")[0].style.display = "none";
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
                                $("#genkey-dialog").dialog("option", "buttons", { 
                                    "Close": function() {
                                        $("#genkey-dialog").dialog("close");
                                    }
                                });
                            }
                        },
                        Cancel: function() {
                            $("#genkey-dialog").dialog("close");
                            if (webpg.keymanager.genkey_refresh)
                                webpg.keymanager.buildKeylistProxy(null, 'private');
                        }
                    },
                }).parent().animate({"top": window.scrollY}, 1, function() {
                    $(this).animate({"top": window.scrollY + $(this).innerHeight()
                        / 3}, 1);
                });

                $("#genkey-form").children('input').removeClass('input-error');
                $("#genkey-form")[0].reset();
                $('.key-algo').each(function(){
                    //$(this)[0].options.selectedIndex = $(this)[0].options.length - 1;
                    if ($(this).parent().next().find('.key-size').length) {
                        $(this).parent().next().find('.key-size')[0].children[0].disabled = true;
                        $($(this).parent().next().find('.key-size')[0].children[0]).hide();
                    }
                }).change(function(){
                    if ($(this)[0].options.selectedIndex == 0){
                        // DSA Selected
                        console.log("DSA");
                        $(this).parent().next().find('.key-size')[0].children[0].disabled = false;
                        $($(this).parent().next().find('.key-size')[0].children[0]).show();
                        $(this).parent().next().find('.key-size')[0].children[4].disabled = true;
                        $($(this).parent().next().find('.key-size')[0].children[4]).hide();
                        $(this).parent().next().find('.key-size')[0].options.selectedIndex = 2;
                    } else if($(this)[0].options.selectedIndex == 1){
                        // RSA Selected
                        console.log("RSA");
                        $(this).parent().next().find('.key-size')[0].children[0].disabled = true;
                        $($(this).parent().next().find('.key-size')[0].children[0]).hide();
                        $(this).parent().next().find('.key-size')[0].children[4].disabled = false;
                        $($(this).parent().next().find('.key-size')[0].children[4]).show();
                        $(this).parent().next().find('.key-size')[0].options.selectedIndex = 2;
                    } else {
                        // Elgamal Selected
                        console.log("Elgamal");
                        $(this).parent().next().find('.key-size')[0].children[0].disabled = false;
                        $($(this).parent().next().find('.key-size')[0].children[0]).show();
                        $(this).parent().next().find('.key-size')[0].children[4].disabled = false;
                        $($(this).parent().next().find('.key-size')[0].children[4]).show();
                        $(this).parent().next().find('.key-size')[0].options.selectedIndex = 2;
                    }
                });
                $("#genkey-dialog").dialog('open');
                $("#genkey-form").find(".open").trigger("click");
            });
            $("#genkey-dialog").dialog({
                resizable: true,
                minHeight: 300,
                width: 630,
                modal: true,
                autoOpen: false
            }).parent().animate({"top": window.scrollY}, 1, function() {
                $(this).animate({"top": window.scrollY + $(this).innerHeight()
                    / 3}, 1);
            });
            $('.passphrase').passwordStrength("#pass_repeat");
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
                    $(keyobj).addClass('invalid-key');
                keyobj.className += ' primary_key';
                var enabled = (enabled_keys.indexOf(key) != -1) ? 'checked' : '';
                var status_text = (enabled) ? "Enabled" : "Disabled";
                var default_key = (key == webpg.preferences.default_key.get()) ? 'checked' : '';
            }
            var status = "Valid";
            var keyobj = document.createElement('div');
            if (current_keylist[key].disabled) {
                $(keyobj).addClass('disabled');
                status = "Disabled";
            }
            if (current_keylist[key].expired) {
                $(keyobj).addClass('invalid-key');
                status = "Expired";
            }
            if (current_keylist[key].invalid) {
                $(keyobj).addClass('invalid-key');
                status = "Invalid";
            }
            if (current_keylist[key].revoked) {
                $(keyobj).addClass('invalid-key');
                status = "Revoked";
            }
            $(keyobj).addClass('primary_key');
            if (key == openKey) {
                $(keyobj).addClass('open_key');
                keyobj.setAttribute('id', 'open_key');
            }
            if (type == "public") {
                $(keyobj).html("<h3 class='public_keylist'><a href='#' name='" + key + "'><span style='margin: 0;width: 50%'>" + current_keylist[key].name + "</span><span class='trust'></span></a></h3>");
            } else {
                $(keyobj).html("<h3 class='private_keylist' style='height: 24px;'><a href='#' name='" + key + "'><span style='margin: 0;width: 50%;'>" + current_keylist[key].name + 
                    "&nbsp;&nbsp;-&nbsp;&nbsp;[0x" + key.substr(-8) + "]</span></a><span class='trust' style='z-index:1000; left: 4px; top:-30px;height:22px;'>" +
                    "<span class='keyoption-help-text' style=\"margin-right: 14px;\">&nbsp;</span>" +
                    "<input class='enable-check' id='check-" + key +"' type='checkbox' " + enabled + "/\><label class='enable-check-text' for='check-" + key + "' style='z-index:100;'>" + status_text + "</label><input class='default-check' type='radio' name='default_key' " +
                    " id='default-" + key + "' " + default_key + "/\><label class='default-check' style='z-index: 0; margin-left: 0px;' for='default-" + key + "'>Set as default</label></span></h3>");
            }
            keylist_element.appendChild(keyobj);
            $(keyobj).find('.enable-check').click(function(e){
                var checked_id = this.id.split("-")[1];
                if (webpg.preferences.enabled_keys.has(checked_id) && 
                    checked_id == webpg.preferences.default_key.get()){
                    $(this).next().addClass('ui-state-active');
                    return false
                }
                if (this.checked && !webpg.preferences.default_key.get()) {
                    $(this).next().next().click();
                    $(this).next().next().next().addClass('ui-state-active');
                }
                (this.checked) ? webpg.preferences.enabled_keys.add(this.id.split("-")[1]) :
                    webpg.preferences.enabled_keys.remove(this.id.split("-")[1]);
                (this.checked) ? $(this).button('option', 'label', 'Enabled') :
                    $(this).button('option', 'label', 'Disabled');
            });
            $(keyobj).find('.default-check').click(function(e){
                var clicked_id = this.id.split("-")[1];
                if (clicked_id == webpg.preferences.default_key.get()) {
                    $(this).parent().children('.keyoption-help-text').html("<span style=\"color:f6f;\">Cannot unset your default key</span>");
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
            $(uidlist).html(uidlist_innerHTML);
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
            $(uidlist).append(subkey_info);
            $(uidlist).append("<br/\><span class='dh'>User IDs</span><hr/\>");
            for (var uid in current_keylist[key].uids) {
                var uidobj = document.createElement('div');
                uidobj.setAttribute('class', 'uid');
                uidobj.setAttribute('id', key + '-' + uid);
                if (key == openKey && uid == openUID)
                    $(uidobj).addClass('open_uid');
                if (current_keylist[key].expired || current_keylist[key].uids[uid].revoked)
                    uidobj.className += ' invalid-key';
                var email = (current_keylist[key].uids[uid].email.length > 1) ? "  -  &lt;" + current_keylist[key].uids[uid].email + "&gt;" :
                    "  - (no email address provided)";
                $(uidobj).append("<h4 class='uidlist'><a href='#'><span style='margin:0; width: 50%'>" + current_keylist[key].uids[uid].uid + email + "</span><span class='trust' style='text-decoration: none;'></span></a></h4>");
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

                $(uidobjbody).html("<div class=\"uid-options uid-options-line\"><span class='uid-options'><input class='uid-option-button-sign' id='sign-" + type + "-" + key + "-" + uid + "' type='button' value='Sign this UID'/\></span>" +
                    "<span class='uid-options'>" + primary_button + revoke_button + "<input class='uid-option-button' id='delete-" + type + "-" + key + "-" + uid +
                    "' type='button' value='Delete this UID'/\></span></div>");
                $(uidobjbody).append("<br/\>");
                if (current_keylist[key].uids[uid].revoked) {
                    $(uidobjbody).find('.uid-option-button-sign').addClass('uid-revoked');
                    $(uidobjbody).find('.uid-option-button-primary').addClass('uid-revoked');
                }
                if (current_keylist[key].expired)
                    $(uidobjbody).find('.uid-option-button-sign').addClass('key-expired');
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
                        $(uidobjbody).append(sig_box);
                    } else {
                        sigs_not_in_keyring[sig] = current_keylist[key].uids[uid].signatures[sig];
                    }
                }
                uidobj.appendChild(uidobjbody);
                if (sigs_not_in_keyring.hasOwnProperty(0)) {
                    $(uidobjbody).find(".uid-options-line").append(
                        "<span style='position:absolute;right:60px;color:#F11;margin-top:8px;'>*Signatures made with keys that are not in your keyring are not displated.</span>"
                    );
//                    console.log(sigs_not_in_keyring, key);
                }
                uidlist.appendChild(uidobj);
            }
            keyobj.appendChild(uidlist);
        }

        // This allows us to toggle the "Enable" and "Default" buttons without activating the accordion
        $('.trust').click(function(e){
            e.stopPropagation();
        });
        var pKeyAcOptions = {
                                header: 'h3', alwaysOpen: false,
                                autoheight:false, clearStyle:true,
                                active: '.ui-accordion-left',
                                collapsible: true
                            }
        $('#' + type + '_keylist').children('.primary_key').
            accordion(pKeyAcOptions).children();

        var subKeyAcOptions = {
                                header: 'h4.subkeylist', alwaysOpen: false,
                                autoheight:false, clearStyle:true,
                                active:'.ui-accordion-left',
                                collapsible: true
                              }

        $(".uidlist").find('.subkey').accordion(subKeyAcOptions);

        var uidAcOptions = {
                                header: 'h4.uidlist', alwaysOpen: false,
                                autoheight:false, clearStyle:true,
                                active:'.ui-accordion-left',
                                collapsible: true
                            }

        $(".uidlist").children('.uid').accordion(uidAcOptions);

        $('#' + type + '_keylist').children('.open_key').
            accordion("activate", 0)
        $('.open_uid').accordion('destroy').accordion().
            accordion("activate", 0).accordion("option", {collapsible: true});
        $('.open_subkey').accordion('destroy').accordion().
            accordion("activate", 0).accordion("option", {collapsible: true});
        $('.ui-add-hover').hover(
            function(){
                $(this).addClass("ui-state-hover");
            },
            function(){
                $(this).removeClass("ui-state-hover");
            }
        );
        $('.private-key-option-list, .public-key-option-list').hover(
            function(){
                $(this).addClass("ui-state-hover");
            },
            function(){
                $(this).removeClass("ui-state-hover");
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
        $('.private-key-option-button, .public-key-option-button, .sub-key-option-button').button().click(function(e){
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
                    $("#keyexp-dialog").dialog({
		                resizable: true,
		                height: 180,
		                modal: true,
		                position: "top",
                        open: function(event, ui) {
                            var key = webpg.background.plugin.getNamedKey(params[2])
                            $("#keyexp-date-input").datepicker({
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
                                $("#keyexp-never")[0].checked = true;
                                $("#keyexp-date-input").hide();
                            } else {
                                $("#keyexp-ondate")[0].checked = true;
                                $("#keyexp-date-input").show();
                                $('#keyexp-buttonset').children().blur();
                                $("#keyexp-dialog").dialog({ height: 390 })
                            }
                            $("#keyexp-buttonset").buttonset();
                            $("#keyexp-ondate").change(function(){
                                $("#keyexp-date-input").show();
                                $("#keyexp-dialog").dialog({ height: 390 })
                            })
                            $("#keyexp-never").change(function(){
                                $("#keyexp-date-input").hide();
                                $("#keyexp-dialog").dialog({ height: 190 })
                            })

                        },
		                buttons: {
			                    "Save": function() {
                                    if ($("#keyexp-never")[0].checked) {
                                        var new_expire = 0;
                                    } else {
                                        var expire = $("#keyexp-date-input").datepicker("getDate");
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
                                    $(this).dialog("close");
                                    if (params[1] == "subkey") {
                                        params[1] = "private";
                                    }
                                    $(this).dialog("close");
                                    webpg.keymanager.buildKeylistProxy(null, params[1], params[2], params[3], null);
			                    },
		                        "Cancel":function(event,ui) {
                                    console.log("destroyed...");
                                    $("#keyexp-date-input").datepicker('destroy');
                                    $(this).dialog('destroy');
                                },
			                },
	                }).parent().animate({"top": window.scrollY}, 1, function() {
                        $(this).animate({"top": window.scrollY + $(this).innerHeight()
                            / 3}, 1);
                    });
                    break;

                case "passphrase":
                    console.log(webpg.background.plugin.gpgChangePassphrase(params[2]));
                    refresh = false;
                    break;

                case "delete":
                    console.log(params);
                    $("#delete-key-dialog-confirm").dialog({
		                resizable: true,
		                height:160,
		                modal: true,
		                position: "top",
		                close: function() {
                            $("#delete-key-dialog-confirm").dialog("destroy");
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
				                $(this).dialog("close");

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
				                $(this).dialog("close");
			                }
		                }
	                }).parent().animate({"top": window.scrollY}, 1, function() {
                            $(this).animate({"top": window.scrollY + $(this).innerHeight()}, 1);
                        });
	                break;

	            case "adduid":
                    $("#adduid-dialog").dialog({
		                resizable: true,
		                height: 230,
		                width: 550,
		                modal: true,
		                position: "top",
                        "buttons": { 
                            "Create": function() {
                                var form = $(this).find("#adduid-form")[0];
                                if (!$("#adduid-status").length) {
                                    $(form).parent().before("<div id=\"adduid-status\"> </div>");
                                }
                                var error = "";
                                if (!form.uid_0_name.value){
                                    error += "Name Required<br>";
                                    $(form.uid_0_name).addClass("ui-state-error");
                                }
                                if (form.uid_0_name.value.length < 5){
                                    error += "UID Names must be at least 5 characters long<br>";
                                    $(form.uid_0_name).addClass("ui-state-error");
                                }
                                if (!isNaN(form.uid_0_name.value[0])){
                                    error += "UID Names cannot begin with a number<br>";
                                    $(form.uid_0_name).addClass("ui-state-error");
                                }
                                if (form.uid_0_email.value && !webpg.utils.
                                    isValidEmailAddress(form.uid_0_email.value)){
                                    error += "Not a valid email address<br>";
                                    $(form.uid_0_email).addClass("ui-state-error");
                                } else {
                                    $(form.uid_0_email).removeClass("ui-state-error");
                                }
                                if (error.length) {
                                    $("#adduid-status").html(error)[0].style.display="block";
                                    return false;
                                }
                                webpg.keymanager.adduid_waiting = true;
                                $("#adduid-dialog").dialog("option", "minHeight", 250);
                                $("#adduid-status").html(error)[0].style.display="block";
                                var result = webpg.background.plugin.gpgAddUID(params[2], form.uid_0_name.value,
                                        form.uid_0_email.value, form.uid_0_comment.value);
                                if (result.error) {
                                    console.log(result);
                                    return
                                }
                                $(this).dialog("close");
                                $("#adduid-form")[0].reset();
                                $("#adduid-dialog").dialog("destroy");
                                webpg.keymanager.buildKeylistProxy(null, params[1], params[2], null, null);
                            },
                            Cancel: function() {
                                $("#adduid-dialog").dialog("close");
                                $("#adduid-form")[0].reset();
                                $("#adduid-dialog").dialog("destroy");
                            }
                        },
                    }).parent().animate({"top": window.scrollY}, 1, function() {
                            $(this).animate({"top": window.scrollY + $(this).innerHeight()
                                / 2}, 1);
                        });
                    break;

                case "addsubkey":
                    webpg.keymanager.genkey_refresh = false;
                    $("#gensubkey-dialog").dialog({
                        resizable: true,
                        minHeight: 300,
                        width: 300,
                        modal: true,
                        autoOpen: false,
                        position: "top",
                        "buttons": { 
                            "Create": function() {
                                var form = $(this).find("#gensubkey-form")[0];
                                form.key_id.value = params[2];
                                $(form).parent().before("<div id=\"gensubkey-status\"> </div>");
                                var error = "";
                                webpg.keymanager.genkey_waiting = true;
                                if (webpg.utils.detectedBrowser == "chrome") {
                                    chrome.extension.onConnect.addListener(function(port) {
                                        port.onMessage.addListener(webpg.keymanager.progressMsg);
                                    });
                                }
                                $("#gensubkey-form").find(".open").trigger("click");
                                console.log("going to create a subkey with the following details:" + '\n' +
                                    "Key ID:", form.key_id.value, " Sub Key:", form.subKey_algo.value + 
                                      ' (' + form.subKey_size.value + ')\n' + " sign_flag: " + form.sign.checked +
                                      " enc_flag: " + form.enc.checked + " auth_flag: " + form.auth.checked + "\n" +
                                    "expiration: Key will expire in " + form.key_expire.value + ' days');
                                $("#gensubkey-dialog").dialog("option", "minHeight", 300);
                                $("#gensubkey-status").html(error)[0].style.display="block";
                                $("#gensubkey-status").html("Building key, please wait..");
                                $("#gensubkey-status").after("<div id='gensubkey-status_detail' style=\"font-size: 12px; color:#fff;padding: 20px;\">This may take a long time (5 minutes or more) to complete depending on the selected options. Please be patient while the key is created. It is safe to close this window, key generation will continue in the background.<br><br><div id='gensubkey_progress' style='height:auto;display:block;'></div></div>");
                                $(form)[0].style.display = "none";
                                $("#gensubkey-dialog")[0].style.height = "20";
                                $("#gensubkey-dialog")[0].style.display = "none";
                                var response = webpg.background.plugin.gpgGenSubKey(form.key_id.value,
                                    form.subKey_algo.value,
                                    form.subKey_size.value,
                                    form.key_expire.value,
                                    (form.sign.checked) ? 1 : 0,
                                    (form.enc.checked) ? 1 : 0,
                                    (form.auth.checked) ? 1 : 0
                                );
                                if (response == "queued") {
                                    $("#gensubkey-dialog").dialog("option", "buttons", { 
                                        "Close": function() {
                                            $("#gensubkey-dialog").dialog("close");
                                        }
                                    });
                                }
                            },
                            Cancel: function() {
                                $("#gensubkey-dialog").dialog("close");
                                if (window.gensubkey_refresh)
                                    webpg.keymanager.buildKeylistProxy(null, 'private');
                            }
                        },
                    }).parent().animate({"top": window.scrollY}, 1, function() {
                            $(this).animate({"top": window.scrollY + $(this).innerHeight()
                                / 3}, 1);
                        });
                    $("#subKey_flags").buttonset();
                    $("#gensubkey-form").children('input').removeClass('input-error');
                    $("#gensubkey-form")[0].reset();
                    $('#gensubkey-form .subkey-algo').each(function(){
                        $(this)[0].options.selectedIndex = $(this)[0].options.length - 1;
                        $(this).parent().find('.key-size')[0].children[0].disabled = true;
                        $($(this).parent().find('.key-size')[0].children[0]).hide();
                    }).change(function(){
                        selectedIndex = $(this)[0].options.selectedIndex;
                        if (selectedIndex == 0 || selectedIndex == 4) {
                            // DSA Selected
                            $(this).parent().find('.key-size')[0].children[0].disabled = false;
                            $($(this).parent().find('.key-size')[0].children[0]).show();
                            $(this).parent().find('.key-size')[0].children[4].disabled = true;
                            $($(this).parent().find('.key-size')[0].children[4]).hide();
                        } else if (selectedIndex == 1 || selectedIndex == 3 || selectedIndex == 5) {
                            // RSA Selected
                            $(this).parent().find('.key-size')[0].children[0].disabled = true;
                            $($(this).parent().find('.key-size')[0].children[0]).hide();
                            $(this).parent().find('.key-size')[0].children[4].disabled = false;
                            $($(this).parent().find('.key-size')[0].children[4]).show();
                        } else if (selectedIndex == 2) {
                            // ElGamal Selected
                            $(this).parent().find('.key-size')[0].children[0].disabled = false;
                            $($(this).parent().find('.key-size')[0].children[0]).show();
                            $(this).parent().find('.key-size')[0].children[4].disabled = false;
                            $($(this).parent().find('.key-size')[0].children[4]).show();
                        }
                        if (selectedIndex < 4) {
                            $("#subKey_flags").hide();
                            $("#gensubkey-dialog").dialog("option", "height", 240);
                        } else {
                            if (selectedIndex == 4) {
                                $("#subKey_flags").find('#sign')[0].checked = true;
                                $("#subKey_flags").find('#enc')[0].checked = false;
                                $("#subKey_flags").find('#auth')[0].checked = false;
                                $("#subKey_flags").find('#enc')[0].disabled = true;
                            } else {
                                $("#subKey_flags").find('#sign')[0].checked = true;
                                $("#subKey_flags").find('#enc')[0].checked = true;
                                $("#subKey_flags").find('#auth')[0].checked = false;
                                $("#subKey_flags").find('#enc')[0].disabled = false;
                            }
                            $("#subKey_flags").show();
                            $("#gensubkey-dialog").dialog("option", "height", 300);
                        }
                        $("#subKey_flags").buttonset("refresh");
                    });
                    $("#gensubkey-dialog").dialog('open');
                    $("#gensubkey-form").find(".open").trigger("click");
                    break;

                case "export":
                    var export_result = webpg.background.plugin.gpgExportPublicKey(params[2]).result;
                    $("#export-dialog-text").html(export_result);
                    $("#export-dialog-copytext").html(export_result);
                    $("#export-dialog").dialog({
		                resizable: true,
		                height: 230,
		                width: 536,
		                modal: true,
		                position: "top",
                        "buttons": {
                            "Copy": function() {
                                $("#export-dialog-copytext")[0].select();
                                $("#export-dialog-msg").html(
                                    webpg.utils.copyToClipboard(window, document)
                                );
                                $("#export-dialog-msg")[0].style.display="block"
                            },
                            "Close": function() {
                                $("#export-dialog").dialog("destroy");
                                $("#export-dialog-msg")[0].style.display="none"
                            }
                        }
                    }).parent().animate({"top": window.scrollY}, 1, function() {
                            $(this).animate({"top": window.scrollY + $(this).innerHeight()
                                / 2}, 1);
                        });
                    break;

                case "revoke":
                    options = "Please specify the revocation details -<br/\><br/\>" +
                        "<label for='revkey-reason'>Reason:</label>" +
                        "<select name='revkey-reason' id='revkey-reason' class='ui-add-hover ui-corner-all ui-widget ui-state-default'>" +
                        "<option value='0' class='ui-state-default'>No reason specified</option>" +
                        "<option value='1' class='ui-state-default'>Key has been compromised</option>" +
                        "<option value='2' class='ui-state-default'>Key is superseded</option>" +
                        "<option value='2' class='ui-state-default'>Key is no longer used</option>" +
                        "</select><br/\>" +
                        "<label for='revkey-desc'>Description:</label>" +
                        "<input type='text' name='revkey-desc' id='revkey-desc' class='ui-corner-all ui-widget ui-state-default'/\>";
                    $("#revkey-confirm").find('#revkey-text').html(options);
                    $("#revkey-confirm").dialog({
                        resizable: true,
                        height:250,
                        width: 350,
                        modal: true,
                        autoOpen: false,
                        position: "top",
                        close: function() {
                            $("#revkey-confirm").dialog("destroy");
                        },
                        "buttons": {
                            "Revoke": function() {
                                var reason = $('#revkey-reason')[0].value;
                                var desc = $('#revkey-desc')[0].value;
                                console.log(params[2], params[3], reason, desc);
                                var revkey_result = webpg.background.plugin.gpgRevokeKey(params[2],
                                    parseInt(params[3]), parseInt(reason), desc);
                                webpg.keymanager.buildKeylistProxy(null, "private", params[2], params[3], null);
                                $("#revkey-confirm").dialog("close");
                            },
                            "Cancel": function() {
                                $("#revkey-confirm").dialog("close");
                            }
                        }
                    }).parent().animate({"top": window.scrollY}, 1, function() {
                            $(this).animate({"top": window.scrollY + $(this).innerHeight()
                                / 2}, 1);
                        });
                    $("#revkey-confirm").dialog('open');
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
                $(src).text($(src).parent()[0].getAttribute("text"))
            }
        );
        $('.uid-option-button').button().click(function(e){
            var params = this.id.split('-');
            var refresh = false;
            switch(params[0]) {
                case "delete":
                    $( "#deluid-confirm" ).dialog({
		                resizable: true,
		                height:180,
		                modal: true,
		                position: "top",
                        close: function() {
                            $("#deluid-confirm").dialog("destroy");
                        },
		                buttons: {
			                "Delete this UID": function() {
                                // Delete the Public Key
                                var uid_idx = parseInt(params[3]) + 1;
                                var result = webpg.background.plugin.gpgDeleteUID(params[2], uid_idx);
                                console.log(result, params[2], uid_idx);
				                $(this).dialog("close");
                                // Remove the Key-ID from the params array, since it
                                //  no longer exists
                                if (!result.error) {
                                    params[3] = null;
                                    webpg.keymanager.buildKeylistProxy(null, params[1], params[2], null, null);
                                }
			                },
			                Cancel: function() {
				                $(this).dialog("close");
			                }
		                }
	                }).parent().animate({"top": window.scrollY}, 1,
	                    function() {
                            $(this).animate({"top": window.scrollY + $(this).innerHeight()
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
                    options = "Please specify the revocation details -<br/\><br/\>" +
                        "<label for='revuid-reason'>Reason:</label>" +
                        "<select name='revuid-reason' id='revuid-reason' class='ui-add-hover ui-corner-all ui-widget ui-state-default'>" +
                        "<option value='0' class='ui-state-default'>No reason specified</option>" +
                        "<option value='4' class='ui-state-default'>User ID is no longer valid</option>" +
                        "</select><br/\>" +
                        "<label for='revuid-desc'>Description:</label>" +
                        "<input type='text' name='revuid-desc' id='revuid-desc' class='ui-corner-all ui-widget ui-state-default'/\>";
                    $("#revuid-confirm").find('#revuid-text').html(options);
                    $("#revuid-confirm").dialog({
                        resizable: true,
                        height:250,
                        width: 350,
                        modal: true,
                        autoOpen: false,
                        position: top,
                        close: function() {
                            $("#revuid-confirm").dialog("destroy");
                        },
                        "buttons": {
                            "Revoke": function() {
                                var reason = $('#revuid-reason')[0].value;
                                var desc = $('#revuid-desc')[0].value;
                                console.log(params[2], params[3], params[4], reason, desc);
                                var revuid_result = webpg.background.plugin.gpgRevokeUID(params[2],
                                    parseInt(params[3]) + 1, parseInt(reason), desc);
                                webpg.keymanager.buildKeylistProxy(null, params[1], params[2], null, params[3]);
                                $("#revuid-confirm").dialog("close");
                            },
                            "Cancel": function() {
                                $("#revuid-confirm").dialog("close");
                            }
                        }
                    }).parent().animate({"top": window.scrollY}, 1, function() {
                            $(this).animate({"top": window.scrollY + $(this).innerHeight()
                                / 2}, 1);
                        });
                    $("#revuid-confirm").dialog('open');
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
        $('.uid-option-button-sign').button().click(function(e){
            $("#createsig-dialog").dialog({
                resizable: true,
                minHeight: 250,
                width: 630,
                modal: true,
                autoOpen: false,
                position: "top"
            }).parent().animate({"top": window.scrollY}, 1, function() {
                    $(this).animate({"top": window.scrollY + $(this).innerHeight()
                        / 3}, 1);
                });
            var params = this.id.split('-');
            var enabled_keys = webpg.preferences.enabled_keys.get();
            $('#createsig-form').html("<p class='help-text'>Please select which of your keys to create the signature with:</p>");
            if (type == "private")
                keylist = pkeylist;
            var current_signatures = keylist[params[2]].uids[params[3]].signatures;
            var cursig = [];
            for (sig in current_signatures) {
                cursig.push(current_signatures[sig].keyid);
            }
            if (!webpg.preferences.enabled_keys.length()) {
                $('#createsig-form').append("You have not enabled any keys for use with webpg; <a href='" + webpg.utils.resourcePath + "key_manager.html?tab=0&helper=enable'>please click here</a> and select 1 or more keys for use with webpg.");
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
                $('#createsig-form').append(status + "<label for='sign_" + key + "' id='lbl-sign_" + key + "' class='help-text'>" + pkeylist[key].name + " (" + key + ")</label><div id='lbl-sign-err_" + key + "' style='display: none;'></div><br/\>");
                if (webpg.preferences.enabled_keys.length() == 1 && signed) {
                    $($("button", $("#createsig-dialog").parent()).children()[1]).hide();
                }
            }
            var refresh = false;
            $("#createsig-dialog").dialog({
                position: "top",
                "buttons": {
                    " Sign ": function() {
                        var checked = $("#createsig-form").children("input:checked");
                        var error = false;
                        for (item in checked) {
                            if (checked[item].type == "checkbox") {
                                var sign_result = webpg.background.plugin.gpgSignUID(params[2], 
                                    parseInt(params[3]) + 1,
                                    checked[item].name, 1, 1, 1);
                                error = (error || (sign_result['error'] && sign_result['gpg_error_code'] != 65)); // if this is true, there were errors, leave the dialog open
                                if (sign_result['error'] && sign_result['gpg_error_code'] != 65) {
                                    $('#img_' + checked[item].name)[0].src = "skin/images/cancel.png"
                                    lbl_sign_error = $('#lbl-sign-err_' + checked[item].name)[0];
                                    lbl_sign_error.style.display = "inline";
                                    lbl_sign_error.style.color = "#f40";
                                    lbl_sign_error.style.margin = "0 0 0 20px";
                                    $(lbl_sign_error).html(sign_result['error_string']);
                                    $($("button", $("#createsig-dialog").parent()).children()[0]).text("Close")
                                    $($("button", $("#createsig-dialog").parent()).children()[1]).text("Try again")
                                } else {
                                    refresh = true; // the keys have changed, we should refresh on dialog close;
                                    $('#img_' + checked[item].name)[0].src = "skin/images/check.png"
                                }
                                $('#img_' + checked[item].name).show().next().hide();
                            }
                        }
                        console.log("should we refresh?", refresh? "yes":"no");
                        if (!error && refresh) {
                            $("#createsig-dialog").dialog("destroy");
                            webpg.keymanager.buildKeylistProxy(null, params[1], params[2], null, params[3]);
                        }
                    },
                    "Cancel": function() {
                        $("#createsig-dialog").dialog("destroy");
                        if (refresh) {
                            webpg.keymanager.buildKeylistProxy(null, params[1], params[2], null, params[3]);
                        }
                    },
                }
            }).parent().animate({"top": window.scrollY}, 1, function() {
                    $(this).animate({"top": window.scrollY + $(this).innerHeight()
                / 2}, 1)});
            if (webpg.preferences.enabled_keys.length() == 1 && cursig.indexOf(enabled_keys[0]) != -1) {
                $($("button", $("#createsig-dialog").parent()).children()[1]).hide();
            }
            $("#createsig-dialog").dialog('open');
        });
        if (!webpg.background.plugin.webpg_status.gpgconf_detected) {
            $('.uid-option-button-sign').button({disabled: true, label: "Cannot create signatures without gpgconf utility installed"});
        }
        $('.uid-option-button-sign.uid-revoked').button({disabled: true, label: "Cannot sign a revoked UID"});
        $('.uid-option-button-primary.uid-revoked').button({disabled: true, label: "Cannot make a revoked UID primary"});
        $('.uid-option-button-sign.key-expired').button({disabled: true, label: "Cannot sign an expired key"});
        $('.revsig-button').button().click(function(e){
            var params = this.id.split('-');
            var calling_button = this;
            var sig_details = $(calling_button).parent()[0].id.split('-');
            var options = "Please specify the revocation details -<br/\><br/\>" +
                "<label for='revsig-reason'>Reason:</label>" +
                "<select name='revsig-reason' id='revsig-reason' class='ui-add-hover ui-corner-all ui-widget ui-state-default'>" +
                "<option value='0' class='ui-state-default'>No reason specified</option>" +
                "<option value='4' class='ui-state-default'>User ID is no longer valid</option>" +
                "</select><br/\>" +
                "<label for='revsig-desc'>Description:</label>" +
                "<input type='text' name='revsig-desc' id='revsig-desc' class='ui-corner-all ui-widget ui-state-default'/\>";
            $("#revsig-confirm").find('#revsig-text').html(options);
            $("#revsig-confirm").dialog("option",
                "buttons", {
                    "Revoke": function() {
                        var reason = $('#revsig-reason')[0].value;
                        var desc = $('#revsig-desc')[0].value;
                        console.log(params[2], params[3], params[4], reason, desc);
                        var revsig_result = webpg.background.plugin.gpgRevokeSignature(params[2],
                            parseInt(params[3]), parseInt(params[4]), parseInt(reason), desc);
                        //console.log('delete', delsig_result, params[2], parseInt(params[3]) + 1, parseInt(params[4]) + 1)
                        webpg.keymanager.buildKeylistProxy(null, params[1], params[2], null, params[3]);
                        $("#revsig-confirm").dialog("close");
                    },
                    "Cancel": function() {
                        $("#revsig-confirm").dialog("close");
                    }
                }
            ).parent().animate({"top": window.scrollY}, 1, function() {
                $(this).animate({"top": window.scrollY + $(this).innerHeight()
                / 3}, 1)});
            $("#revsig-confirm").dialog('open');
        });
        $("#revsig-confirm").dialog({
            resizable: true,
            height:250,
            width: 350,
            modal: true,
            autoOpen: false,
            close: function() {
                $("#revsig-confirm").dialog("destroy");
            },
            buttons: {
                'Revoke this Signature?': function() {
                    $(this).dialog('close');
                },
                Cancel: function() {
                    $(this).dialog('close');
                }
            }
        }).parent().animate({"top": window.scrollY}, 1, function() {
            $(this).animate({"top": window.scrollY + $(this).innerHeight()
                / 2}, 1);
        });

        $('.delsig-button').button().click(function(e){
            var params = this.id.split('-');
            var calling_button = this;
            var sig_details = $(calling_button).parent()[0].id.split('-');
            $("#delsig-confirm").find('#delsig-text').html("Are you certain you would like to delete signature " +
                sig_details[1] + " from this User id?");
            if (sig_details[1] in pkeylist < 1) {
                $("#delsig-confirm").find('#delsig-text').append("<br><br><span class='ui-icon ui-icon-alert' style='float:left; margin:0 7px 20px 0;'></span>This signature was made with a key that does not belong to you; This action cannot be undone without refreshing the keylist from a remote source.");
                $("#delsig-confirm").dialog("option", "height", "240");
                $("#delsig-confirm").dialog("option", "width", "400");
            }
            $("#delsig-confirm").dialog("option", "buttons", { "Delete":
                function() {
                    var delsig_result = webpg.background.plugin.
                        gpgDeleteUIDSign(params[2], parseInt(params[3]) + 1,
                        parseInt(params[4]) + 1);
                    webpg.keymanager.buildKeylistProxy(null, params[1], params[2], null, params[3]);
                    $("#delsig-confirm").dialog("close");
                },
                Cancel: function() {
                    $("#delsig-confirm").dialog("close");
                }
            }).parent().animate({"top": window.scrollY}, 1, function() {
                $(this).animate({"top": window.scrollY + $(this).innerHeight()
                    / 2}, 1);
            });
            $("#delsig-confirm").dialog('open');
        });
        $("#delsig-confirm").dialog({
            resizable: true,
            height:200,
            modal: true,
            autoOpen: false,
            position: "top",
            buttons: {
                'Delete this Signature?': function() {
                    $(this).dialog('close');
                },
                Cancel: function() {
                    $(this).dialog('close');
                }
            }
        }).parent().animate({"top": window.scrollY}, 1, function() {
            $(this).animate({"top": window.scrollY + $(this).innerHeight()}, 1);
        });

        $('.enable-check').button().next().next().button({
            text: false,
            icons: {
                primary: 'ui-icon-check'
            }
        }).click(function(e) {
            var keyid = this.id.substr(-16);
            webpg.preferences.default_key.set(keyid);
            var enable_element = $('#check-' + this.id.substr(-16))[0];
            var enabled_keys = webpg.preferences.enabled_keys.get();
            if (enabled_keys.indexOf(keyid) == -1) {
                webpg.preferences.enabled_keys.add(keyid);
                $(enable_element).trigger('click');
                $(enable_element).next().html($(enable_element).next()[0].innerHTML.replace('Disabled', 'Enabled'));
            }
        }).parent().buttonset();

        $('.enable-check').next().hover(
            function(e){
                $(this).parent().children('.keyoption-help-text').html("Enable this key for signing");
            },
            function(e){
                $(this).parent().children('.keyoption-help-text').html("&nbsp;");
            }
        );
        $('input.default-check').next().hover(
            function(e){
                var input = $(this).prev()[0];
                if (input && input.checked) {
                    $(this).parent().children('.keyoption-help-text').html("This is your default key");
                } else {
                    $(this).parent().children('.keyoption-help-text').html("Make this the default key for encryption operations");
                }
            },
            function(e){
                $(this).parent().children('.keyoption-help-text').html("&nbsp;");
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
            var element = $(openItem);
            if (element.length > 0) {
                var pos = element.offset().top - pos_offset;
                $('html,body').animate({scrollTop: pos}, 1);
            }
        }

        if (type == 'public') {
            // Setup the search input
            $("#pubkey-search").unbind("change").bind("change", function(e) {
                // Sometimes the event is a duplicate, so check the
                //  data object for "original_value"
                if ($(this).data("original_value") == this.value)
                    return
                // This is an original event, so set the data object
                //  "original_value"
                $(this).data('original_value', this.value);
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
                    
                $("#dialog-modal").dialog('option', 'modal', false)
                .dialog('open').animate({"top": window.scrollY}, 1,
                    function() {
                        $('#dialog-msg').text(
                            (val.length > 0) ? "Searching for \"" + val
                            + "\"" : "Please wait while we build the key list."
                        );
                        $(this).animate({"top": window.scrollY +
                            $(this).innerHeight() + 100}, 1,
                        function() {
                            webpg.keymanager.buildKeylist(
                                nkeylist, 'public');
                            $("#dialog-modal").dialog('close');
                        }
                    )
                });
            })
        }

    },
    /* end buildKeylist */
}

$(function(){
    if (webpg.utils.getParameterByName("auto_init") == "true")
        webpg.keymanager.init();
});
/* ]]> */
