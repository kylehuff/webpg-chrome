/* <![CDATA[ */
if (typeof(webpg)=='undefined') { webpg = {}; }

/*
   Class: webpg.inline_results
    This class implements the inline results iframe
*/
webpg.inline_results = {

    init: function() {
        var loc = (window.location.search.substring()) ?
            window.location.search.substring() :
            window.parent.location.search.substring();

        qs = {};

        loc.replace(
            new RegExp("([^?=&]+)(=([^&]*))?", "g"),
            function($0, $1, $2, $3) { qs[$1] = $3; }
        );

        webpg.utils.onRequest.addListener(this.processRequest);
        window.addEventListener("message", this.receiveMessage, false);
    },

    /*
        Function: doResize
            Resizes the parent iframe by sending a request to the listener of
            the webpg.background object

        Parameters:
            scrollTop - <bool> Indicates if the parent window should scroll to the top of the frame
    */
    doResize: function(scrollTop) {
        var block_height = $(".pgp_block_container")[0].scrollHeight;
        var body_height = document.body.scrollHeight;
        var height = $(".pgp_block_container")[0].scrollHeight + $("#footer")[0].scrollHeight + 40;
        height = (height < body_height) ? height : body_height;

        webpg.utils.sendRequest({
            'msg': 'sendtoiframe',
            'iframe_id': qs.id,
            'width': null,
            'height': height,
            'scrollTop': scrollTop
        });
    },

    /*
        Function: createSignatureBox
            Creates an HTML element with information concerning a signature

        Parameters:
            sigObj - <obj> An object with information about a signature
            sigIdx - <int> The index of the signature within the keyring
    */
    createSignatureBox: function(sigObj, sigIdx) {
        var sig_keyid = sigObj.fingerprint.substr(-8);
        var subkey_index = 0;
        var key_name = sig_keyid;
        var sigkey_url = null;
        var email = null;
        if (sigObj.status != "NO_PUBKEY") {
            for (pubkey in sigObj.public_key) {
                var key = sigObj.public_key[pubkey];
                for (subkey in key.subkeys) {
                    if (key.subkeys[subkey].subkey == sigObj.fingerprint) {
                        subkey_index = subkey;
                    }
                }
            }
            email = (key.uids[0].email.length > 1) ? "&lt;" + key.uids[0].email + 
                "&gt;" : "(no email address provided)";
            sigkey_url = webpg.utils.resourcePath + "key_manager.html" +
                "?auto_init=true&tab=-1&openkey=" + pubkey + "&opensubkey=" + subkey_index;
            key_name = key.name;
        }
        var sig_class = "";
        var sig_image = "stock_signature.png";
        if (sigObj.status == "GOOD") {
            sig_image = "stock_signature-ok.png";
            sig_class = "sign-good"
        }
        if (sigObj.status == "BAD_SIG") {
            sig_image = "stock_signature-bad.png";
            sig_class = "sign-revoked";
        }
        var sig_box = "<div id='sig-" + sig_keyid + "-" + sigIdx + "' class='signature-box " + sig_class + "'>" +
            "<img src='skin/images/badges/" + sig_image + "'><div style='float:left;'><span class='signature-uid'>" +
            key_name + "</span>";

        if (sigkey_url)
            sig_box += "<span class='signature-keyid'>(<a href='#' id='" + sigkey_url +
                "' class='webpg-link'>" + sig_keyid + "</a>)</span>";

        sig_box += "<br/\>";

        if (email)
            sig_box += "<span class='signature-email'>" + email + "</span><br/\>";

        var date_created = new Date(sigObj.timestamp * 1000).toJSON();
        var date_expires = (sigObj.expiration == 0) ? 
            'Never' : new Date(sigObj.expiration * 1000).toJSON().substring(0, 10);
        sig_box += "<span class='signature-keyid'>Created: " + date_created.substring(0, 10) + "</span><br/\>";
        sig_box += "<span class='signature-keyid'>Expires: " + date_expires + "</span><br/\>" +
            "<span class='signature-keyid'>Status: " + sigObj.validity + "</span><br/\>" +
            "<span class='signature-keyid'>Validity: " + sigObj.status + "</span></div></div>";
        return sig_box;
    },

    receiveMessage: function(event) {
        webpg.inline_results.processRequest(event.data);
    },

    processRequest: function(request, sender, sendResponse) {
        if (request.target_id == qs.id) {
            icon = document.createElement("img");
            switch(request.block_type) {
                case webpg.constants.PGPBlocks.PGP_ENCRYPTED:
                    icon.src = "skin/images/badges/stock_encrypted.png";
                    $(icon).addClass('footer_icon');

                    gpg_error_code = request.verify_result.gpg_error_code;
                    if (gpg_error_code == "58") {
                        $('#header')[0].innerHTML = "<a name=\"" + qs.id + "\">PGP ENCRYPTED OR SIGNED MESSAGE</a>";
                        $('#footer').addClass("signature_bad_sig");
                        $('#footer')[0].innerHTML = "UNABLE TO DECRYPT OR VERIFY THIS MESSAGE<br/\>";
                    } else {
                        $('#header')[0].innerHTML += "<a name=\"" + qs.id + "\">PGP ENCRYPTED MESSAGE</a>";
                    }
                    if (request.verify_result.error) {
                        $('#signature_text')[0].innerHTML = request.verify_result.original_text;
                    } else {
                        $('#signature_text')[0].innerHTML = request.verify_result.data;
                    }
                    if (request.message_event == "manual" && request.verify_result.original_text.substr(0,5) == "-----") {
                        if (request.verify_result.signatures && request.verify_result.signatures.hasOwnProperty(0)) {
                            $('#header')[0].innerHTML = "<a name=\"" + qs.id + "\">PGP ENCRYPTED AND SIGNED MESSAGE</a>";
                            icon.src = "skin/images/badges/stock_decrypted-signature.png";
                            sig_ok = true;
                            sig_boxes = "<div class='signature-container'>";
                            for (sig in request.verify_result.signatures) {
                                if (request.verify_result.signatures[sig].status != "GOOD") {
                                    sig_ok = false;
                                }
                                sig_boxes += webpg.inline_results.
                                    createSignatureBox(request.verify_result.
                                        signatures[sig], sig);
                            }
                            sig_boxes += "</div>";
                            $('#signature_text')[0].innerHTML += sig_boxes;
                            if (sig_ok) {
                                $('#footer').addClass("signature_good");
                                icon.src = "skin/images/badges/stock_decrypted-signature-ok.png";
                            }
                        } else {
                            icon.src = "skin/images/badges/stock_decrypted.png";
                        }
                    }
                    $('#footer')[0].innerHTML += icon.outerHTML;
                    $('#original_text').text(request.verify_result.original_text);
                    $('#clipboard_input')[0].value = request.verify_result.original_text;
                    $('#original_text').hide();
                    if (gpg_error_code == "11" || gpg_error_code == "152") {
                        $('#footer').addClass("signature_no_pubkey");
                        if (gpg_error_code == "152") {
                            $('#footer')[0].innerHTML = "DECRYPTION FAILED; NO SECRET KEY<br/\>";
                        }
                        if (gpg_error_code == "11") {
                            if (request.message_type == "encrypted_message" && request.message_event == "manual") {
                                $('#footer')[0].innerHTML = "DECRYPTION FAILED; BAD PASSPHRASE <br/\>";
                                if (request.noninline) {
                                    $('#footer')[0].innerHTML += "<a class=\"decrypt_message\" href=\"#" + qs.id + "\"\">DECRYPT THIS MESSAGE</a> |";
                                }
                            } else {
                                $('#footer')[0].innerHTML += "<a class=\"decrypt_message\" href=\"#" + qs.id + "\"\">DECRYPT THIS MESSAGE</a> | ";
                            }
                        }
                    } else if (!request.verify_result.error) {
                        $('#footer').addClass("signature_good");
                    }
                    if (!request.verify_result.error && request.verify_result.original_text.length >0) {
                         $('#footer')[0].innerHTML += "<a class=\"original_text_link\" href=\"#" + qs.id + "\">DISPLAY ORIGINAL</a> | ";
                    }
                    $('#footer')[0].innerHTML += "<a class=\"copy_to_clipboard\" href=\"#\">COPY TO CLIPBOARD</a>";
                    webpg.inline_results.doResize();
                    break;

                case webpg.constants.PGPBlocks.PGP_SIGNED_MSG:
                    if (request.verify_result.message_type == "detached_signature")
                        var title = "<a name=\"" + qs.id + "\">DETACHED PGP SIGNATURE</a>";
                    else
                        var title = "<a name=\"" + qs.id + "\">PGP SIGNED MESSAGE</a>";
                    $('#header')[0].innerHTML = title
                    if (request.verify_result.error) {
                        $('#signature_text')[0].innerHTML = request.verify_result.original_text;
                    } else {
                        $('#signature_text')[0].innerHTML = request.verify_result.data;
                    }
                    $('#clipboard_input')[0].value = request.verify_result.original_text;

                    gpg_error_code = request.verify_result.gpg_error_code;
                    if (gpg_error_code == "58") {
                        $('#footer').addClass("signature_bad_sig");
                        icon.src = "skin/images/badges/stock_signature-bad.png";
                        $(icon).addClass('footer_icon');
                        $('#footer')[0].innerHTML = icon.outerHTML;
                        $('#footer')[0].innerHTML += "THE SIGNATURE ON THIS MESSAGE IS INVALID; THE SIGNATURE MIGHT BE TAMPERED WITH<br/\>";
                        $('#footer')[0].innerHTML += "<a class=\"copy_to_clipboard\" href=\"#\">COPY TO CLIPBOARD</a>";
                    } else {
                        $('#footer').addClass("signature_bad_sig");
                    }
                    $('#original_text').text(request.verify_result.original_text);
                    $('#original_text').hide();
                    for (sig in request.verify_result.signatures) {
                        sig_boxes = "<div class='signature-container'>";
                        for (sig in request.verify_result.signatures) {
                            sig_boxes += webpg.inline_results.
                                createSignatureBox(request.verify_result.
                                    signatures[sig], sig);
                        }
                        sig_boxes += "</div>";
                        $('#signature_text')[0].innerHTML += sig_boxes;
                        if (request.verify_result.signatures[sig].status == "GOOD") {
                            icon.src = "skin/images/badges/stock_signature-ok.png";
                            $(icon).addClass('footer_icon');
                            $('#footer').addClass("signature_good");
                            $('#footer')[0].innerHTML = icon.outerHTML;
                            key_id = request.verify_result.signatures[sig].fingerprint.substring(16, -1)
                            sig_fp = request.verify_result.signatures[sig].fingerprint;
                            public_keys = request.verify_result.signatures[sig].public_key;
                            sigkey_link = key_id;
                            if (public_keys) {
                                for (pubkey in public_keys) {
                                    for (pubkey_subkey in public_keys[pubkey].subkeys) {
                                        if (sig_fp == public_keys[pubkey].subkeys[pubkey_subkey].subkey) {
                                            sigkey_url = webpg.utils.resourcePath + "key_manager.html" +
                                                "?auto_init=true&tab=-1&openkey=" + pubkey + "&opensubkey=" +
                                                pubkey_subkey;
                                            sigkey_link = "<a href='#;' id='" + sigkey_url + "' class='webpg-link'>" +
                                                pubkey + "</a>";
                                        }
                                    }
                                }
                            }
                            $('#footer')[0].innerHTML += "THIS MESSAGE WAS SIGNED WITH KEY " + sigkey_link + "<br/\><a class=\"original_text_link\" href=\"#" + qs.id + "\">DISPLAY ORIGINAL</a> | ";
                            $('#footer')[0].innerHTML += "<a class=\"copy_to_clipboard\" href=\"#\">COPY TO CLIPBOARD</a>";
                        }
                        if (request.verify_result.signatures[sig].status == "GOOD_EXPKEY") {
                            $('#footer').addClass("signature_no_pubkey");
                            $('#footer')[0].innerHTML = "THIS MESSAGE WAS SIGNED WITH AN EXPIRED PUBLIC KEY<br/\>";
                            $('#footer')[0].innerHTML += "<a class=\"original_text_link\" href=\"#" + qs.id + "\">DISPLAY ORIGINAL</a> | ";
                            $('#footer')[0].innerHTML += "<a class=\"copy_to_clipboard\" href=\"#\">COPY TO CLIPBOARD</a> | ";
//                            $('#footer')[0].innerHTML += "<a href=\"#\">TRY TO FETCH RENEWED KEY</a>";
                        }
                        if (request.verify_result.signatures[sig].status == "NO_PUBKEY") {
                            $('#footer').addClass("signature_no_pubkey");
                            $('#footer')[0].innerHTML = "THIS MESSAGE WAS SIGNED WITH A PUBLIC KEY NOT IN YOUR KEYRING<br/\>";
                            $('#footer')[0].innerHTML += "<a class=\"original_text_link\" href=\"#" + qs.id + "\">DISPLAY ORIGINAL</a> | ";
                            $('#footer')[0].innerHTML += "<a class=\"copy_to_clipboard\" href=\"#\">COPY TO CLIPBOARD</a> | ";
//                            $('#footer')[0].innerHTML += "<a href=\"#\">TRY TO FETCH MISSING KEY</a>";
                        }
                        if (request.verify_result.signatures[sig].status == "BAD_SIG") {
                            $('#footer').addClass("signature_bad_sig");
                            icon.src = "skin/images/badges/stock_signature-bad.png";
                            $(icon).addClass('footer_icon');
                            $('#footer')[0].innerHTML = icon.outerHTML;
                            $('#footer')[0].innerHTML += "THE SIGNATURE ON THIS MESSAGE FAILED; THE MESSAGE MAY BE TAMPERED WITH<br/\>";
                            $('#footer')[0].innerHTML += "<a class=\"original_text_link\" href=\"#" + qs.id + "\">DISPLAY ORIGINAL</a> | ";
                            $('#footer')[0].innerHTML += "<a class=\"copy_to_clipboard\" href=\"#\">COPY TO CLIPBOARD</a>";
                        }
                    }
                    webpg.inline_results.doResize();
                    $('.webpg-link').click(function() {
                        webpg.utils.sendRequest({
                            'msg': "newtab",
                            'url': this.id,
                            }
                        );
                    });
                    break;

                case webpg.constants.PGPBlocks.PGP_KEY:
                    $('#header')[0].innerHTML = "<a name=\"" + qs.id + "\">PGP PUBLIC KEY</a>";
                    $('#original_text').text(request.original_text);
                    $('#clipboard_input')[0].value = request.original_text;
                    icon.src = "skin/images/badges/stock_keypair.png";
                    $(icon).addClass('footer_icon');
                    $('#footer')[0].innerHTML = icon.outerHTML;
                    var get_key_response = null;
                    import_status = null;
                    webpg.utils.sendRequest({
                        msg: 'doKeyImport',
                        data: request.original_text,
                        temp_context: true,
                    },
                        function(response) {
                            var fpsi = {};
                            fpsi.keys_found = [];
                            fpsi.keys_imported = [];
                            var import_status = response.result.import_status;
                            for (imported in import_status.imports) {
                                if (import_status.imports[imported].fingerprint != "unknown" &&
                                    import_status.imports[imported].result == "Success") {
                                    key_id = import_status.imports[imported].fingerprint;
                                    webpg.utils.sendRequest({
                                        msg: "getNamedKey",
                                        "key_id": key_id,
                                        temp_context: true},
                                        function(get_key_response) {
                                            key = get_key_response.result;
                                            fpsi.keys_found[fpsi.keys_found.length] = key;
                                            if (import_status.imports[imported].new_key){
                                                fpsi.keys_imported[fpsi.keys_imported.length] = key;
                                                webpg.utils.sendRequest({
                                                    msg: 'deleteKey',
                                                    key_type: "public_key",
                                                    key_id: key_id,
                                                    temp_context: true, }
                                                );
                                            }
                                            for (key in fpsi.keys_found[0]) {
                                                keyobj = fpsi.keys_found[0][key];
                                                if (keyobj.in_real_keyring) {
                                                    new_public_key = false;
                                                    keyobj = keyobj.real_keyring_item;
                                                } else {
                                                    new_public_key = true;
                                                }
<!--                                                email = (keyobj.email.length > 1) ? "&lt;<a href=\"mailto:" + keyobj.email + "\">" + keyobj.email +-->
<!--                                                    "</a>&gt;" : "no email address provided";-->
<!--                                                $('#signature_text')[0].innerHTML = "<span class=\"uid_line\">" + keyobj.name + " " + email + "</span>";-->
                                                $('#signature_text')[0].innerHTML = "Names/UIDs on Key:"
                                                $('#signature_text')[0].innerHTML += "<ul>";
                                                for (uid in keyobj.uids) {
                                                    uid_email = (keyobj.uids[uid].email.length > 1) ? "<a href=\"mailto:" + 
                                                        keyobj.uids[uid].email + "\">" + keyobj.uids[uid].email +
                                                        "</a>" : "";
                                                    sig_class = "sig_class_normal";
                                                    $('#signature_text')[0].innerHTML += "<li>" + keyobj.uids[uid].uid + 
                                                        " &lt;" + uid_email + "&gt;</li>";
                                                }
                                                $('#signature_text')[0].innerHTML += "</ul>";
                                                $('#signature_text')[0].innerHTML += "<br/\>";
                                                key_algo = {}
                                                key_algo.abbr = "?"
                                                key_algo.name = keyobj.subkeys[0].algorithm_name;
                                                if (key_algo.name in webpg.constants.algoTypes) {
                                                    key_algo.abbr = webpg.constants.algoTypes[key_algo.name];
                                                }
                                                $('#header')[0].innerHTML += " (" + keyobj.subkeys[0].size + key_algo.abbr + "/" + keyobj.fingerprint.substr(-8) + ")<br/\>";
                                                created = new Date();
                                                created.setTime(keyobj.subkeys[0].created*1000);
                                                expires = new Date();
                                                expires.setTime(keyobj.subkeys[0].expires*1000);
                                                $('#signature_text')[0].innerHTML += "Created: " + created.toUTCString() + "<br/\>";
                                                $('#signature_text')[0].innerHTML += "Expires: " + expires.toUTCString() + "<br/\>";
                                                $('#footer').addClass("public_key");
                                                if (new_public_key) {
                                                    $('#footer')[0].innerHTML += "THIS KEY IS NOT IN YOUR KEYRING<br/\>";
                                                } else {
                                                    key_url = webpg.utils.resourcePath + "key_manager.html" +
                                                        "?auto_init=true&tab=-1&openkey=" + keyobj.fingerprint.substr(-16);
                                                    key_link = "(<a href='#' id='" + key_url +
                                                        "' class='webpg-link'>" + keyobj.fingerprint.substr(-8) + "</a>)";
                                                    $('#footer')[0].innerHTML += "THIS KEY " + key_link + " IS IN YOUR KEYRING<br/\>";
                                                }
                                                $('#footer')[0].innerHTML += "<a class=\"original_text_link\" href=\"#" + qs.id + "\">DISPLAY ORIGINAL</a> | ";
                                                if (new_public_key) {
                                                    // This is a key we don't already have, make import available
                                                    $('#footer')[0].innerHTML += "<a class=\"import_key_link\" href=\"#\">IMPORT THIS KEY</a> | ";
                                                } else {
                                                    // This is a key we already have, make delete available
                                                    $('#footer')[0].innerHTML += "<a class=\"delete_key_link\" href=\"#\" id=\"" + keyobj.fingerprint + "\">DELETE THIS KEY</a> | ";
                                                }
                                                $('#footer')[0].innerHTML += "<a class=\"copy_to_clipboard\" href=\"#\">COPY TO CLIPBOARD</a>";

                                                $('.delete_key_link').click(function(){
                                                    webpg.utils.sendRequest({
                                                        msg: 'deleteKey',
                                                        key_type: "public_key",
                                                        key_id: this.id },
                                                        function(response) {
                                                            window.location.reload();
                                                        }
                                                    );
                                                })
                                                $('.webpg-link').click(function() {
                                                    webpg.utils.sendRequest({
                                                        'msg': "newtab",
                                                        'url': this.id,
                                                        }
                                                    );
                                                });
                                                $('.original_text_link').off('click');
                                                $('.original_text_link').click(function(){
                                                    if (this.innerHTML == "DISPLAY ORIGINAL"){
                                                        $('#signature_text').hide();
                                                        $('#original_text').show();
                                                        this.innerHTML = "HIDE ORIGINAL";
                                                        webpg.inline_results.doResize();
                                                    } else {
                                                        this.innerHTML = "DISPLAY ORIGINAL";
                                                        $('#signature_text').show();
                                                        $('#original_text').hide();
                                                        webpg.inline_results.doResize(true)
                                                    }
                                                });
                                                $('.import_key_link').click(function(){
                                                    console.log("import link clicked...");
                                                    webpg.utils.sendRequest({
                                                        msg: 'doKeyImport',
                                                        data: request.original_text },
                                                        function(response) {
                                                            window.location.reload();
                                                        }
                                                    );
                                                })
                                                $('.copy_to_clipboard').click(function(){
                                                    $('#clipboard_input')[0].select();
                                                    console.log(webpg.utils.copyToClipboard(window, document));
                                                })
                                                if ($('.original_text_link')[0].innerHTML == "DISPLAY ORIGINAL")
                                                    webpg.inline_results.doResize();
                                            }
                                        }
                                    )
                                } else {
                                    $('#original_text')[0].innerHTML = request.original_text;
                                    $('#signature_text')[0].innerHTML = request.original_text;
                                    $('#footer').addClass("signature_no_pubkey");
                                    if (import_status.no_user_id > 0)
                                        $("<span class='decrypt_status'>UNUSABLE KEY; NO USER ID<br/\></span>").insertBefore($($('#footer')[0].firstChild));
                                    $('#footer')[0].innerHTML += "<a class=\"import_key_link\" href=\"#\">IMPORT THIS KEY</a> | ";
                                    $('#footer')[0].innerHTML += "<a class=\"copy_to_clipboard\" href=\"#\">COPY TO CLIPBOARD</a>";
                                }
                                $('#original_text').hide();
                                webpg.inline_results.doResize();
                                $('.import_key_link').click(function(){
                                    console.log("import link clicked...");
                                    webpg.utils.sendRequest({
                                        msg: 'doKeyImport',
                                        data: request.original_text },
                                        function(response) {
                                            window.location.reload();
                                        }
                                    );
                                })
                                $('.copy_to_clipboard').click(function(){
                                    $('#clipboard_input')[0].select(); 
                                    console.log(webpg.utils.copyToClipboard(window, document));
                                })
                            }
                        }
                    );
                    break;

            } /* end switch */
            if (sendResponse) {
                sendResponse({'result': "done"});
            }
            $('.original_text_link').off('click');
            $('.original_text_link').click(function(){
                if (this.innerHTML == "DISPLAY ORIGINAL"){
                    $('#signature_text').hide();
                    $('#original_text').show();
                    this.innerHTML = "HIDE ORIGINAL";
                    webpg.inline_results.doResize()
                } else {
                    this.innerHTML = "DISPLAY ORIGINAL";
                    $('#signature_text').show();
                    $('#original_text').hide();
                    webpg.inline_results.doResize(true)
                }
            });
            $('.copy_to_clipboard').click(function(){
                $('#clipboard_input')[0].select();
                console.log(webpg.utils.copyToClipboard(window, document));
            })
            $('.decrypt_message').click(function(){
                webpg.utils.sendRequest({
                    msg: 'decrypt',
                    data: $('#clipboard_input')[0].value},
                    function(response) {
                        $('.decrypt_status').remove();
                        if (response.result.error) {
                            if (response.result.gpg_error_code == "11" || response.result.gpg_error_code == "152") {
                                $("<span class='decrypt_status'>DECRYPTION FAILED; BAD PASSPHRASE<br/\></span>").insertBefore($($('#footer')[0].firstChild));
                            }
                        } else {
                            $('#signature_text')[0].innerHTML = response.result.data;
                            if ((request.verify_result.signatures && response.result.signatures.hasOwnProperty(0)) ||
                            (response.result.signatures && response.result.signatures.hasOwnProperty(0))) {
                                $('#header')[0].innerHTML = "<a name=\"" + qs.id + "\">PGP ENCRYPTED AND SIGNED MESSAGE</a>";
                                icon.src = "skin/images/badges/stock_decrypted-signature.png";
                                sig_ok = true;
                                sig_boxes = "<div class='signature-container'>";
                                for (sig in response.result.signatures) {
                                    if (response.result.signatures[sig].status != "GOOD") {
                                        sig_ok = false;
                                    }
                                    sig_boxes += webpg.inline_results.
                                        createSignatureBox(response.result.
                                            signatures[sig], sig);
                                }
                                sig_boxes += "</div>";
                                $('#signature_text')[0].innerHTML += sig_boxes;
                                if (sig_ok) {
                                    $('#footer').addClass("signature_good");
                                    icon.src = "skin/images/badges/stock_decrypted-signature-ok.png";
                                }
                            } else {
                                icon.src = "skin/images/badges/stock_decrypted.png";
                            }
                            $(icon).addClass('footer_icon');
                            $('#footer')[0].innerHTML = icon.outerHTML;
                            $('#footer')[0].innerHTML += "<a class=\"original_text_link\" href=\"#" + qs.id + "\">DISPLAY ORIGINAL</a> | ";
                            $('#footer')[0].innerHTML += "<a class=\"copy_to_clipboard\" href=\"#\">COPY TO CLIPBOARD</a>";
                            $('.original_text_link').off('click');
                            $('.original_text_link').click(function(){
                                if (this.innerHTML == "DISPLAY ORIGINAL"){
                                    $('#signature_text').hide();
                                    $('#original_text').show();
                                    this.innerHTML = "HIDE ORIGINAL";
                                    webpg.inline_results.doResize()
                                } else {
                                    this.innerHTML = "DISPLAY ORIGINAL";
                                    $('#signature_text').show();
                                    $('#original_text').hide();
                                    webpg.inline_results.doResize(true)
                                }
                            });
                            $('.copy_to_clipboard').click(function(){
                                $('#clipboard_input')[0].select();
                                console.log(webpg.utils.copyToClipboard(window, document));
                            })
                            $('.webpg-link').click(function() {
                                webpg.utils.sendRequest({
                                    'msg': "newtab",
                                    'url': this.id,
                                    }
                                );
                            });
                            webpg.inline_results.doResize();
                        }
                    }
                );
                webpg.inline_results.doResize();
            })
        }
    },
}

webpg.inline_results.init();
/* ]]> */
