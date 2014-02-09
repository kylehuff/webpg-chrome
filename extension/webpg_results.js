/* <![CDATA[ */
if (typeof(webpg)=='undefined') { webpg = {}; }
// Enforce jQuery.noConflict if not already performed
if (typeof(jQuery)!='undefined') { webpg.jq = jQuery.noConflict(true); }

/*
   Class: webpg.inline_results
    This class implements the inline results iframe
*/
webpg.inline_results = {

    init: function() {
        var loc = (window.location.search.substring()) ?
            window.location.search.substring() :
            window.parent.location.search.substring();

        this.qs = {};

        loc.replace(
            new RegExp("([^?=&]+)(=([^&]*))?", "g"),
            function($0, $1, $2, $3) { webpg.inline_results.qs[$1] = $3; }
        );

        webpg.utils._onRequest.addListener(this.processRequest);
        window.addEventListener("message", this.receiveMessage, false);
        webpg.inline_results.mouseCount = 0;
        webpg.jq(window).bind("mouseover mousemove", function(event) {
            if (webpg.inline_results.mouseCount === 0) {
                var trustStatus = webpg.utils.getTrustStatus();
                document.querySelector('.webpg-results-trusted-hover').textContent = trustStatus;
                webpg.utils.setStatusBarText(trustStatus);
            }
            webpg.inline_results.mouseCount++;
            if (webpg.inline_results.mouseCount > 10)
                webpg.inline_results.mouseCount = 0;
        });
        webpg.jq(window).bind("mouseout",
            function(event) {
                document.querySelector('.webpg-results-trusted-hover').textContent = "";
                webpg.utils.setStatusBarText("");
            }
        );
    },

    /*
        Function: doResize
            Resizes the parent iframe by sending a request to the listener of
            the webpg.background object

        Parameters:
            scrollTop - <bool> Indicates if the parent window should scroll to the top of the frame
    */
    doResize: function(scrollTop) {
        if (webpg.utils.isRTL()) {
            webpg.jq(".signed_text_header").addClass("rtl");
            webpg.jq(".results-control").addClass("rtl");
            webpg.jq(".webpg-results-trusted-hover").addClass("rtl");
            webpg.jq(".signed_text").addClass("rtl");
            webpg.jq(".signature-box").addClass("rtl");
            webpg.jq(".footer").addClass("rtl");
            webpg.jq(".footer_icon").addClass("rtl");
        }
        var block_height = webpg.jq(".pgp_block_container")[0].scrollHeight;
        var body_height = document.body.scrollHeight;
        var height = webpg.jq(".pgp_block_container")[0].scrollHeight + webpg.jq("#footer")[0].scrollHeight + 40;
        height = (height < body_height) ? height : body_height;

        webpg.utils.sendRequest({
            'msg': 'sendtoiframe',
            'iframe_id': webpg.inline_results.qs.id,
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
    // TODO: Maybe move this to some place generic so we can use the same
    //  generator on the key manager
    createSignatureBox: function(sigObj, sigIdx) {
        sigObj.timestamp = parseInt(sigObj.timestamp, 10);
        sigObj.expiration = parseInt(sigObj.expiration, 10);
        var _ = webpg.utils.i18n.gettext,
            scrub = webpg.utils.escape,
            sig_keyid = sigObj.fingerprint.substr(-8),
            subkey_index = 0,
            key_name = sig_keyid,
            sigkey_url = null,
            email = null,
            key;

        if (sigObj.status != "NO_PUBKEY") {
            key = sigObj.public_key;
            for (var subkey in key.subkeys) {
                if (key.subkeys[subkey].subkey === sigObj.fingerprint) {
                    subkey_index = subkey;
                }
            }
            email = (key.uids[0].email.length > 1) ? "&lt;" + scrub(key.uids[0].email) + 
                "&gt;" : "(no email address provided)";
            sigkey_url = webpg.utils.resourcePath + "key_manager.html" +
                "?auto_init=true&tab=-1&openkey=" + sigObj.public_key.id + "&opensubkey=" + subkey_index;
            key_name = key.name;
        }
        var sig_class = "";
        var sig_image = "stock_signature.png";
        if (sigObj.status === "GOOD") {
            sig_image = "stock_signature-ok.png";
            sig_class = "sign-good";
        }
        if (sigObj.status === "BAD_SIG") {
            sig_image = "stock_signature-bad.png";
            sig_class = "sign-revoked";
        }
        var sig_box = "<div id='sig-" + sig_keyid + "-" + sigIdx + "' class='signature-box " + sig_class + "'>" +
            "<img src='skin/images/badges/48x48/" + sig_image + "'><div style='float:left;'><span class='signature-uid'>" +
            key_name + "</span>";

        if (sigkey_url)
            sig_box += "<span class='signature-keyid'>(<a id='" + sigkey_url +
                "' class='webpg-link'>" + sig_keyid + "</a>)</span>";

        sig_box += "<br/>";

        if (email)
            sig_box += "<span class='signature-email'>" + email + "</span><br/>";

        var date_created = (sigObj.timestamp === 0) ?
            _('Unknown') : new Date(sigObj.timestamp * 1000).toJSON().substring(0, 10);
        var date_expires = (sigObj.expiration === 0) ?
            _('Never') : new Date(sigObj.expiration * 1000).toJSON().substring(0, 10);
        sig_box += "<span class='signature-keyid'>" + _('Created') + ": " + date_created + "</span><br/>";
        sig_box += "<span class='signature-keyid'>" + _('Expires') + ": " + date_expires + "</span><br/>" +
            "<span class='signature-keyid'>" + _('Status') + ": " + sigObj.validity + "</span><br/>" +
            "<span class='signature-keyid'>" + _('Validity') + ": " + sigObj.status + "</span></div></div>";
        return sig_box;
    },

    receiveMessage: function(event) {
        webpg.inline_results.processRequest(event.data);
    },

    processRequest: function(request, sender, sendResponse) {
        var _ = webpg.utils.i18n.gettext;
        var scrub = webpg.utils.escape;
        if (request.target_id === webpg.inline_results.qs.id) {
            var icon = document.createElement("img");
            switch(request.block_type) {
                case webpg.constants.PGPBlocks.PGP_ENCRYPTED:
                    icon.src = "skin/images/badges/48x48/stock_encrypted.png";
                    webpg.jq(icon).addClass('footer_icon');
                    var gpg_error_code = request.verify_result.gpg_error_code;
                    webpg.jq('#header').html("<a name=\"" + scrub(webpg.inline_results.qs.id) + "\">" + _("PGP ENCRYPTED OR SIGNED MESSAGE") + "</a>");
                    webpg.jq('#footer').html("");
                    if (gpg_error_code === 58) {
                        webpg.jq('#footer').addClass("signature_bad_sig");
                        webpg.jq('#footer').html(_("UNABLE TO DECRYPT OR VERIFY THIS MESSAGE") + "<br/>");
                    }
                    if (request.verify_result.error) {
                        webpg.jq('#signature_text')[0].textContent = request.verify_result.original_text;
                    } else {
                        webpg.jq('#signature_text')[0].textContent = request.verify_result.data;
                    }
                    if (request.message_event === "manual" &&
                    request.verify_result.original_text.substr(0,5) === "-----") {
                        if (request.verify_result.signatures &&
                        request.verify_result.signatures.hasOwnProperty(0)) {
                            webpg.jq('#header').html("<a name=\"" + scrub(webpg.inline_results.qs.id) + "\">" + _("PGP ENCRYPTED AND SIGNED MESSAGE") + "</a>");
                            icon.src = "skin/images/badges/48x48/stock_decrypted-signature.png";
                            var sig_ok = true;
                            var sig_boxes = "<div class='signature-container'>";
                            for (var sig in request.verify_result.signatures) {
                                if (request.verify_result.signatures[sig].status != "GOOD") {
                                    sig_ok = false;
                                }
                                sig_boxes += webpg.inline_results.
                                    createSignatureBox(request.verify_result.
                                        signatures[sig], sig);
                            }
                            sig_boxes += "</div>";
                            webpg.jq('#signature_text').append(sig_boxes);
                            if (sig_ok) {
                                webpg.jq('#footer').addClass("signature_good");
                                icon.src = "skin/images/badges/48x48/stock_decrypted-signature-ok.png";
                            }
                        } else {
                            icon.src = "skin/images/badges/48x48/stock_decrypted.png";
                        }
                    }
                    webpg.jq('#footer').append(icon.outerHTML || new XMLSerializer().serializeToString(icon));
                    webpg.jq('#original_text')[0].textContent = request.verify_result.original_text;
                    webpg.jq('#clipboard_input')[0].textContent = request.verify_result.original_text;
                    webpg.jq('#original_text').hide();
                    if (gpg_error_code === 11 ||
                    gpg_error_code === 152) {
                        webpg.jq('#footer').addClass("signature_no_pubkey");
                        if (gpg_error_code === 152) {
                            webpg.jq('#footer').html(_("DECRYPTION FAILED") + "; " + _("NO SECRET KEY") + "<br/>");
                        }
                        if (gpg_error_code === 11) {
                            if (request.message_type === "encrypted_message" &&
                            request.message_event === "manual") {
                                webpg.jq('#footer').html(_("DECRYPTION FAILED") + "; " + _("BAD PASSPHRASE") + "<br/>");
                                if (request.noninline) {
                                    webpg.jq('#footer').append("<a class=\"decrypt_message\">" + _("DECRYPT THIS MESSAGE") + "</a> |");
                                }
                            } else {
                                webpg.jq('#footer').html("<a class=\"decrypt_message\">" + _("DECRYPT THIS MESSAGE") + "</a> | ");
                            }
                        }
                    } else if (!request.verify_result.error) {
                        webpg.jq('#footer').addClass("signature_good");
                    }
                    if (!request.verify_result.error
                    && request.verify_result.original_text.length >0) {
                         webpg.jq('#footer').append("<a class=\"original_text_link\">" + _("DISPLAY ORIGINAL") + "</a> | ");
                    }
                    webpg.jq('#footer').append("<a class=\"copy_to_clipboard\">" + _("COPY TO CLIPBOARD") + "</a>");
                    webpg.inline_results.doResize();
                    break;

                case webpg.constants.PGPBlocks.PGP_SIGNED_MSG:
                    webpg.inline_results.missingKeys = [];
                    if (request.verify_result.message_type === "detached_signature")
                        var title = "<a name=\"" + scrub(webpg.inline_results.qs.id) + "\">" + _("DETACHED PGP SIGNATURE") + "</a>";
                    else
                        var title = "<a name=\"" + scrub(webpg.inline_results.qs.id) + "\">" + _("PGP SIGNED MESSAGE") + "</a>";
                    webpg.jq('#header').html(title)
                    if (request.verify_result.error) {
                        webpg.jq('#signature_text')[0].textContent = request.verify_result.original_text;
                    } else {
                        webpg.jq('#signature_text').html(webpg.descript(request.verify_result.data));
                    }
                    webpg.jq('#clipboard_input')[0].textContent = request.verify_result.original_text;

                    gpg_error_code = request.verify_result.gpg_error_code;
                    if (gpg_error_code === 58) {
                        webpg.jq('#footer').addClass("signature_bad_sig");
                        icon.src = "skin/images/badges/48x48/stock_signature-bad.png";
                        webpg.jq(icon).addClass('footer_icon');
                        webpg.jq('#footer').html(icon.outerHTML || new XMLSerializer().serializeToString(icon));
                        webpg.jq('#footer').append(_("THE SIGNATURE ON THIS MESSAGE IS INVALID") + "; " + _("THE SIGNATURE MIGHT BE TAMPERED WITH") + "<br/>");
                        webpg.jq('#footer').append("<a class=\"copy_to_clipboard\">" + _("COPY TO CLIPBOARD") + "</a>");
                    } else {
                        webpg.jq('#footer').addClass("signature_bad_sig");
                    }
                    webpg.jq('#original_text').text(request.verify_result.original_text);
                    webpg.jq('#original_text').hide();
                    sig_boxes = "<div class='signature-container'>";
                    for (var sig in request.verify_result.signatures) {
                        sig_boxes += webpg.inline_results.
                            createSignatureBox(request.verify_result.
                                signatures[sig], sig);
                        if (request.verify_result.signatures[sig].status === "GOOD") {
                            icon.src = "skin/images/badges/48x48/stock_signature-ok.png";
                            webpg.jq(icon).addClass('footer_icon');
                            webpg.jq('#footer').addClass("signature_good");
                            webpg.jq('#footer').html(icon.outerHTML || new XMLSerializer().serializeToString(icon));
                            var key_id = request.verify_result.signatures[sig].fingerprint.substring(16, -1)
                            var sig_fp = request.verify_result.signatures[sig].fingerprint;
                            var public_key = request.verify_result.signatures[sig].public_key;
                            var sigkey_link = key_id;
                            if (public_key) {
                                for (var pubkey_subkey in public_key.subkeys) {
                                    if (sig_fp === public_key.subkeys[pubkey_subkey].subkey) {
                                        var sigkey_url = webpg.utils.resourcePath + "key_manager.html" +
                                            "?auto_init=true&tab=-1&openkey=" + scrub(public_key.id) + "&opensubkey=" +
                                            scrub(pubkey_subkey);
                                        sigkey_link = "<a id='" + sigkey_url + "' class='webpg-link'>" +
                                            public_key.id + "</a>";
                                    }
                                }
                            }
                            webpg.jq('#footer').append(_("THIS MESSAGE WAS SIGNED WITH KEY") + " " + sigkey_link + "<br/><a class=\"original_text_link\">" + _("DISPLAY ORIGINAL") + "</a> | ");
                            webpg.jq('#footer').append("<a class=\"copy_to_clipboard\">" + _("COPY TO CLIPBOARD") + "</a>");
                        }
                        if (request.verify_result.signatures[sig].status === "GOOD_EXPKEY") {
                            webpg.inline_results.missingKeys.push(request.verify_result.signatures[sig].fingerprint);
                            webpg.jq('#footer').addClass("signature_no_pubkey");
                            webpg.jq('#footer').html(_("THIS MESSAGE WAS SIGNED WITH AN EXPIRED PUBLIC KEY") + "<br/>");
                            webpg.jq('#footer').append("<a class=\"original_text_link\">" + _("DISPLAY ORIGINAL") + "</a> | ");
                            webpg.jq('#footer').append("<a class=\"copy_to_clipboard\">" + _("COPY TO CLIPBOARD") + "</a> | ");
                            webpg.jq('#footer').append("<a class=\"refresh_key_link\">" + _("Refresh from Keyserver") + "</a>");
                        }
                        if (request.verify_result.signatures[sig].status === "NO_PUBKEY") {
                            webpg.jq('#footer').addClass("signature_no_pubkey");
                            webpg.jq('#footer').html(_("THIS MESSAGE WAS SIGNED WITH A PUBLIC KEY NOT IN YOUR KEYRING") + "<br/>");
                            webpg.jq('#footer').append("<a class=\"original_text_link\">" + _("DISPLAY ORIGINAL") + "</a> | ");
                            webpg.inline_results.missingKeys.push(request.verify_result.signatures[sig].fingerprint);
                            webpg.jq('#footer').append("<a class=\"copy_to_clipboard\">" + _("COPY TO CLIPBOARD") + "</a> | ");
                            webpg.jq('#footer').append("<a class=\"refresh_key_link\">" + _("SEARCH FOR KEYS ON KEYSERVER") + "</a>");
                        }
                        if (request.verify_result.signatures[sig].status === "BAD_SIG") {
                            webpg.jq('#footer').addClass("signature_bad_sig");
                            icon.src = "skin/images/badges/48x48/stock_signature-bad.png";
                            webpg.jq(icon).addClass('footer_icon');
                            webpg.jq('#footer').html(icon.outerHTML || new XMLSerializer().serializeToString(icon));
                            webpg.jq('#footer').append(_("THE SIGNATURE ON THIS MESSAGE FAILED") + "; " + _("THE MESSAGE MAY BE TAMPERED WITH") + "<br/>");
                            webpg.jq('#footer').append("<a class=\"original_text_link\">" + _("DISPLAY ORIGINAL") + "</a> | ");
                            webpg.jq('#footer').append("<a class=\"copy_to_clipboard\">" + _("COPY TO CLIPBOARD") + "</a>");
                        }
                        if (document.location.hash.indexOf("searched") > -1)
                            webpg.jq(document.createTextNode(" | " + _("Key not found on keyserver")))
                                .insertBefore(webpg.jq('#footer').children().first());
                    }
                    sig_boxes += "</div>";
                    webpg.jq('#signature_text').append(sig_boxes);
                    webpg.jq('.refresh_key_link').click(function(){
                        webpg.utils.sendRequest({
                            "temp_context": true,
                            "external": true,
                            "key_array": webpg.inline_results.missingKeys,
                            "msg": "doKeyImport"
                        }, function(response) {
                            if (response.result.import_status.error)
                                window.location.href = "#searched";
                            window.location.reload();
                           }
                        );
                    });
                    webpg.inline_results.doResize();
                    webpg.jq('.webpg-link').click(function() {
                        webpg.utils.sendRequest({
                            'msg': "newtab",
                            'url': this.id,
                            }
                        );
                    });
                    break;

                case webpg.constants.PGPBlocks.PGP_KEY:
                    webpg.jq('#header').html("<a name=\"" + scrub(webpg.inline_results.qs.id) + "\">" + _("PGP PUBLIC KEY") + "</a>");
                    webpg.jq('#original_text').text(request.original_text);
                    webpg.jq('#clipboard_input')[0].value = request.original_text;
                    icon.src = "skin/images/badges/48x48/stock_keypair.png";
                    webpg.jq(icon).addClass('footer_icon');
                    webpg.jq('#footer').html(icon.outerHTML || new XMLSerializer().serializeToString(icon));
                    var get_key_response = null;
                    var import_status = null;
                    webpg.utils.sendRequest({
                        'msg': 'doKeyImport',
                        'data': request.original_text,
                        'temp_context': true,
                    },
                        function(response) {
                            var fpsi = {};
                            fpsi.keys_found = [];
                            fpsi.keys_imported = [];
                            import_status = response.result.import_status;
                            for (var imported in import_status.imports) {
                                if (import_status.imports[imported].fingerprint != "unknown"
                                && import_status.imports[imported].result === "Success") {
                                    key_id = import_status.imports[imported].fingerprint;
                                    webpg.utils.sendRequest({
                                        'msg': "getNamedKey",
                                        'key_id': key_id,
                                        'temp_context': true},
                                        function(get_key_response) {
                                            var key = get_key_response.result;
                                            fpsi.keys_found[fpsi.keys_found.length] = key;
                                            if (import_status.imports[imported].new_key){
                                                fpsi.keys_imported[fpsi.keys_imported.length] = key;
                                                webpg.utils.sendRequest({
                                                    'msg': 'deleteKey',
                                                    'key_type': "public_key",
                                                    'key_id': key_id,
                                                    'temp_context': true, }
                                                );
                                            }
                                            keyobj = fpsi.keys_found[0];
                                            if (keyobj.in_real_keyring) {
                                                var new_public_key = false;
                                                var keyobj = keyobj.real_keyring_item;
                                            } else {
                                                var new_public_key = true;
                                            }
                                            webpg.jq('#signature_text').html(_("Names/UIDs on Key") + ":");
                                            if (keyobj.revoked) {
                                                webpg.jq('#footer').addClass("signature_bad_sig");
                                                var float = webpg.utils.isRTL() ? 'left' : 'right';
                                                var justify = webpg.utils.isRTL() ? 'right' : 'left';
                                                webpg.jq('#signature_text').before(
                                                    webpg.jq("<span></span>", {
                                                        'style': "font-size: 100%;" +
                                                            "text-transform: uppercase;" +
                                                            "float:" + float + ";" +
                                                            justify + ": 20%;" +
                                                            "top: 40px;" +
                                                            "padding: 0 8px;" +
                                                            "z-index: 0;" +
                                                            "color: #000;" +
                                                            "opacity: 0.2;" +
                                                            "text-shadow: 1px 1px 0 #F00;" +
                                                            "transform:scale(2,2) rotate(12deg);" +
                                                            "-webkit-transform:scale(2,2);" +
                                                            "-moz-transform:scale(2,2);" +
                                                            "-ms-transform:scale(2,2);" +
                                                            "-o-transform:scale(2,2);" +
                                                            "-writing-mode: lr-tb;" +
                                                            "display:inline;" +
                                                            "position:absolute;",
                                                        'html': _('REVOKED')
                                                    })
                                                );
                                            }
                                            webpg.jq('#signature_text').append("<ul>");
                                            for (var uid in keyobj.uids) {
                                                uid_email = (keyobj.uids[uid].email.length > 1) ? "<a href=\"mailto:" + 
                                                    scrub(keyobj.uids[uid].email) + "\">" + scrub(keyobj.uids[uid].email) +
                                                    "</a>" : "";
                                                sig_class = "sig_class_normal";
                                                webpg.jq('#signature_text').append("<li>" + scrub(keyobj.uids[uid].uid) + 
                                                    " &lt;" + uid_email + "&gt;</li>");
                                            }
                                            webpg.jq('#signature_text').append("</ul>");
                                            webpg.jq('#signature_text').append("<br/>");
                                            key_algo = {}
                                            key_algo.abbr = "?"
                                            key_algo.name = keyobj.subkeys[0].algorithm_name;
                                            if (key_algo.name in webpg.constants.algoTypes) {
                                                key_algo.abbr = webpg.constants.algoTypes[key_algo.name];
                                            }
                                            webpg.jq('#header').append(" (" + scrub(keyobj.subkeys[0].size) + scrub(key_algo.abbr) + "/" + keyobj.fingerprint.substr(-8) + ")<br/>");
                                            created = new Date();
                                            created.setTime(keyobj.subkeys[0].created*1000);
//                                                expires = new Date();
//                                                expires.setTime(keyobj.subkeys[0].expires*1000);
                                            webpg.jq('#signature_text').append(_("Created") + ": " + created.toUTCString() + "<br/>");
                                            var expires = (keyobj.subkeys[0].expires === 0) ? 'Never' : new Date(keyobj.subkeys[0].expires * 1000).toUTCString();
                                            webpg.jq('#signature_text').append(_("Expires") + ": " + expires + "<br/>");
                                            webpg.jq('#footer').addClass("public_key");
                                            if (new_public_key) {
                                                webpg.jq('#footer').append(_("THIS KEY IS NOT IN YOUR KEYRING") + "<br/>");
                                            } else {
                                                key_url = webpg.utils.resourcePath + "key_manager.html" +
                                                    "?auto_init=true&tab=-1&openkey=" + keyobj.fingerprint.substr(-16);
                                                key_link = "(<a id='" + key_url +
                                                    "' class='webpg-link'>" + keyobj.fingerprint.substr(-8) + "</a>)";
                                                webpg.jq('#footer').append(_("THIS KEY IS IN YOUR KEYRING") + " " + key_link + "<br/>");
                                            }
                                            webpg.jq('#footer').append("<a class=\"original_text_link\">" + _("DISPLAY ORIGINAL") + "</a> | ");
                                            if (new_public_key) {
                                                // This is a key we don't already have, make import available
                                                webpg.jq('#footer').append("<a class=\"import_key_link\">" + _("IMPORT THIS KEY") + "</a> | ");
                                            } else {
                                                // This is a key we already have, make delete available
                                                webpg.jq('#footer').append("<a class=\"delete_key_link\" id=\"" + keyobj.fingerprint + "\">" + _("DELETE THIS KEY") + "</a> | ");
                                            }
                                            webpg.jq('#footer').append("<a class=\"copy_to_clipboard\">" + _("COPY TO CLIPBOARD") + "</a>");

                                            webpg.jq('.delete_key_link').click(function(){
                                                webpg.utils.sendRequest({
                                                    'msg': 'deleteKey',
                                                    'key_type': "public_key",
                                                    'key_id': this.id },
                                                    function(response) {
                                                        window.location.reload();
                                                    }
                                                );
                                            })
                                            webpg.jq('.webpg-link').click(function() {
                                                webpg.utils.sendRequest({
                                                    'msg': "newtab",
                                                    'url': this.id,
                                                    }
                                                );
                                            });
                                            webpg.jq('.original_text_link').off('click');
                                            webpg.jq('.original_text_link').click(function(){
                                                if (this.textContent === _("DISPLAY ORIGINAL")){
                                                    webpg.jq('#signature_text').hide();
                                                    webpg.jq('#original_text').show();
                                                    this.textContent = _("HIDE ORIGINAL");
                                                    webpg.inline_results.doResize();
                                                } else {
                                                    this.textContent = _("DISPLAY ORIGINAL");
                                                    webpg.jq('#signature_text').show();
                                                    webpg.jq('#original_text').hide();
                                                    webpg.inline_results.doResize(true);
                                                }
                                            });
                                            webpg.jq('.import_key_link').click(function(){
                                                console.log("import link clicked...");
                                                webpg.utils.sendRequest({
                                                    'msg': 'doKeyImport',
                                                    'data': request.original_text },
                                                    function(response) {
                                                        //TODO: this fails if the public keyring
                                                        //  is unwritable (bad path/permissions).
                                                        //  We should catch such events and act
                                                        //  accordingly. This is what the return
                                                        //  object looks like when it fails:
                                                        //    Object {result: Object}
                                                        //        result: Object
                                                        //            import_status: Object
                                                        //                considered: 0
                                                        //                imported: 0
                                                        //                imported_rsa: 0
                                                        //                imports: Object
                                                        //                    0: Object
                                                        //                        fingerprint: "unknown"
                                                        //                        new_key: false
                                                        //                new_revocations: 0
                                                        //                new_signatures: 0
                                                        //                new_sub_keys: 0
                                                        //                new_user_ids: 0
                                                        //                no_user_id: 0
                                                        //                not_imported: 0
                                                        //                secret_imported: 0
                                                        //                secret_read: 0
                                                        //                secret_unchanged: 0
                                                        window.location.reload();
                                                    }
                                                );
                                            })
                                            webpg.jq('.copy_to_clipboard').click(function(){
                                                webpg.jq('#clipboard_input')[0].select();
                                                var copyResult = webpg.utils.copyToClipboard(window, document, this);
                                            })
                                            if (webpg.jq('.original_text_link')[0].textContent === _("DISPLAY ORIGINAL"))
                                                webpg.inline_results.doResize();
                                        }
                                    )
                                } else {
                                    webpg.jq('#original_text')[0].textContent = request.original_text;
                                    webpg.jq('#signature_text')[0].textContent = request.original_text;
                                    webpg.jq('#footer').addClass("signature_no_pubkey");
                                    if (import_status.no_user_id > 0)
                                        webpg.jq("<span class='decrypt_status'>" + _("UNUSABLE KEY") + "; " + _("NO USER ID") + "<br/></span>").insertBefore(webpg.jq(webpg.jq('#footer')[0].firstChild));
                                    if (import_status.considered === 0)
                                        webpg.jq("<span class='decrypt_status'>" + _("UNUSABLE KEY") + "<br/></span>").insertBefore(webpg.jq(webpg.jq('#footer')[0].firstChild));
                                    webpg.jq('#footer').append("<a class=\"copy_to_clipboard\">" + _("COPY TO CLIPBOARD") + "</a>");
                                    webpg.inline_results.doResize();
                                }
                                webpg.jq('#original_text').hide();
                                webpg.inline_results.doResize();
                                webpg.jq('.import_key_link').off("click");
                                webpg.jq('.import_key_link').click(function(){
                                    console.log("import link clicked...");
                                    webpg.utils.sendRequest({
                                        'msg': 'doKeyImport',
                                        'data': request.original_text },
                                        function(response) {
                                            window.location.reload();
                                        }
                                    );
                                })
                                webpg.jq('.copy_to_clipboard').click(function(){
                                    webpg.jq('#clipboard_input')[0].select(); 
                                    var copyResult = webpg.utils.copyToClipboard(window, document, this);
                                })
                            }
                        }
                    );
                    break;

            } /* end switch */
            if (sendResponse) {
                sendResponse({'result': "done"});
            }
            webpg.jq('.original_text_link').off('click');
            webpg.jq('.original_text_link').click(function(){
                if (this.textContent === _("DISPLAY ORIGINAL")){
                    webpg.jq('#signature_text').hide();
                    webpg.jq('#original_text').show();
                    this.textContent = _("HIDE ORIGINAL");
                    webpg.inline_results.doResize();
                } else {
                    this.textContent = _("DISPLAY ORIGINAL");
                    webpg.jq('#signature_text').show();
                    webpg.jq('#original_text').hide();
                    webpg.inline_results.doResize(true);
                }
            });
            webpg.jq('.copy_to_clipboard').click(function(){
                webpg.jq('#clipboard_input')[0].select();
                var copyResult = webpg.utils.copyToClipboard(window, document, this);
            });
            webpg.jq('.decrypt_message').off("click");
            webpg.jq('.decrypt_message').click(function(){
                webpg.utils.sendRequest({
                    msg: 'decrypt',
                    data: webpg.jq('#clipboard_input')[0].value},
                    function(response) {
                        webpg.jq('.decrypt_status').remove();
                        if (response.result.error) {
                            if (response.result.gpg_error_code === 11
                            || response.result.gpg_error_code === 152) {
                                webpg.jq("<span class='decrypt_status'>" + _("DECRYPTION FAILED") + "; " + _("BAD PASSPHRASE") + "<br/></span>").insertBefore(webpg.jq(webpg.jq('#footer')[0].firstChild));
                            }
                        } else {
                            webpg.jq('#signature_text').html(webpg.descript(response.result.data));
                            if ((request.verify_result &&
                            request.verify_result.signatures &&
                            response.result.signatures.hasOwnProperty(0))
                            || (response.result.signatures
                            && response.result.signatures.hasOwnProperty(0))) {
                                webpg.jq('#header').html("<a name=\"" + scrub(webpg.inline_results.qs.id) + "\">" + _("PGP ENCRYPTED AND SIGNED MESSAGE") + "</a>");
                                icon.src = "skin/images/badges/48x48/stock_decrypted-signature.png";
                                var sig_ok = true;
                                sig_boxes = "<div class='signature-container'>";
                                for (var sig in response.result.signatures) {
                                    if (response.result.signatures[sig].status != "GOOD") {
                                        sig_ok = false;
                                    }
                                    sig_boxes += webpg.inline_results.
                                        createSignatureBox(response.result.
                                            signatures[sig], sig);
                                }
                                sig_boxes += "</div>";
                                webpg.jq('#signature_text').append(sig_boxes);
                                if (sig_ok) {
                                    webpg.jq('#footer').addClass("signature_good");
                                    icon.src = "skin/images/badges/48x48/stock_decrypted-signature-ok.png";
                                }
                            } else {
                                icon.src = "skin/images/badges/48x48/stock_decrypted.png";
                            }
                            webpg.jq(icon).addClass('footer_icon');
                            webpg.jq('#footer').html(icon.outerHTML || new XMLSerializer().serializeToString(icon));
                            webpg.jq('#footer').append("<a class=\"original_text_link\">" + _("DISPLAY ORIGINAL") + "</a> | ");
                            webpg.jq('#footer').append("<a class=\"copy_to_clipboard\">" + _("COPY TO CLIPBOARD") + "</a>");
                            webpg.jq('.original_text_link').off('click');
                            webpg.jq('.original_text_link').click(function(){
                                if (this.textContent === _("DISPLAY ORIGINAL")){
                                    webpg.jq('#signature_text').hide();
                                    webpg.jq('#original_text').show();
                                    this.textContent = _("HIDE ORIGINAL");
                                    webpg.inline_results.doResize()
                                } else {
                                    this.textContent = _("DISPLAY ORIGINAL");
                                    webpg.jq('#signature_text').show();
                                    webpg.jq('#original_text').hide();
                                    webpg.inline_results.doResize(true);
                                }
                            });
                            webpg.jq('.copy_to_clipboard').click(function(){
                                webpg.jq('#clipboard_input')[0].select();
                                var copyResult = webpg.utils.copyToClipboard(window, document, this);
                            })
                            webpg.jq('.webpg-link').click(function() {
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
            });
            webpg.inline_results.doResize(false);
            webpg.jq('.results-close-btn').find('a').off('click.webpg-link');
            webpg.jq('.results-close-btn').find('a').bind('click.webpg-link', function() {
                webpg.utils.sendRequest({
                    'msg': 'sendtoiframe',
                    'msg_to_pass': 'toggle',
                    'target_id': webpg.inline_results.qs.id,
                    'iframe_id': webpg.inline_results.qs.id
                });
            });
        }
    },
}

webpg.inline_results.init();
/* ]]> */
