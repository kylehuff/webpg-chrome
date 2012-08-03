/* <![CDATA[ */

var ext = chrome.extension.getBackgroundPage();

$(function(){

    $('#step-1').ready(function(){
        doSystemCheck();
    });
    
    function doSystemCheck() {
        pf = window.clientInformation.platform.substr(0,3);
        platform = "";
        if (pf == "Win") {
            platform = "-mswindows";
        }
        if (pf == "Mac") {
            platform = "-macosx";
        }
        if (window.ext.plugin && window.ext.plugin.valid) {
            webpg_status = window.ext.plugin.webpg_status;
            errors = {
                'NPAPI' : { 'error' : false, 'detail': "The NPAPI Plugin is valid." },
                'libgpgme' : { 'error' : false, 'detail' : "It appears you have a working version of libgpgme; we have detected version: " + webpg_status.gpgme_version },
                'gpg_agent' : { 'error' : false, 'detail' : "It appears you have a key-agent configured" },
                'gpgconf' : { 'error' : false, 'detail' : "gpgconf was detected; you can use the signature methods" },
            };

            if (!webpg_status.gpgme_valid) {
                errors['libgpgme'] = {
                    'error': true,
                    'detail': "You do not appear to have libgpgme; libgpgme is required.",
                    'link' : "http://gpgauth.org/projects/gpgauth-chrome/support-libgpgme",
                }
            }

            if (!webpg_status.gpg_agent_info) {
                errors['gpg_agent'] = {
                    'error': true,
                    'detail': "You do not appear to have a key-agent configured. A working key-agent is required",
                    'link' : "http://gpgauth.org/projects/gpgauth-chrome/support-libgpgme",
                }
            }

            if (!webpg_status.gpgconf_detected) {
                errors['gpgconf'] = {
                    'error': true,
                    'detail': "gpgconf does not appear to be installed; You will not be able to create signatures",
                    'link' : "http://gpgauth.org/projects/gpgauth-chrome/support-gpgconf",
                }
            }

        } else {
            errors = {
	        "NPAPI" : {
                    'error': true,
                    'detail': "There was a problem loading the plugin; the issue might be caused by the plugin being incompatibly compiled for this architechture.",
                    'link' : null,
                }
            }
            console.log(errors['NPAPI']['detail']);
        }
        errors_found = false;
        for (error in errors) {
            if (errors[error]['error']) {
                document.getElementById('system-good').style.display = 'none';
                document.getElementById('system-error').style.display = 'block';
                errors_found = true;
            }
            extra_class = (errors[error]['error'] && error != 'gpgconf') ? ' error' : '';
            extra_class = (errors[error]['error'] && error == 'gpgconf') ? ' warning' : extra_class;
            item_result = "<div class=\"trust-level-desc" + extra_class + "\">" +
                    "<span class=\"system-check\" style=\"margin-right:8px;\"><img src='images/";
            if (errors[error]['error']) {
                item_result += 'cancel.png';
            } else {
                item_result += 'check.png';
            }
            item_result += "'></span>" +
                    "<span class=\"trust-desc\">" + errors[error]['detail'];
            if (errors[error]['error'] && errors[error]['link']) item_result += " - <a href=\"" + errors[error]['link'] + platform + "/\" target=\"new\">click here for help resolving this issue</a>";
            item_result += "</span>";
            document.getElementById('status_result').innerHTML += item_result;
        }
        if (errors_found && (error == 'libgpgme' || error == 'NPAPI')) {
            // Hide the options for valid installations
            $('#valid-options').hide();
        } else {
            // Only display the inline check if this is not the app version of webpg-chrome
            if (chrome.app.getDetails().hasOwnProperty("content_scripts")){
                $('#enable-decorate-inline-check')[0].checked = 
                    (window.ext.webpg_prefs.decorate_inline.get() == 'true');
            } else {
                $('#enable-decorate-inline').hide();
            }

            $('#enable-encrypt-to-self-check')[0].checked = 
                (window.ext.webpg_prefs.encrypt_to_self.get());

            $('#setup_link')[0].href = chrome.extension.getURL('options.html');

            $('#enable-decorate-inline-check').button({
                'label': (window.ext.webpg_prefs.decorate_inline.get() == 'true') ? 'Enabled' : 'Disabled'
                }).click(function(e) {
                    (window.ext.webpg_prefs.decorate_inline.get() == 'true') ? window.ext.webpg_prefs.decorate_inline.set(false) : window.ext.webpg_prefs.decorate_inline.set(true);
                    status = (window.ext.webpg_prefs.decorate_inline.get() == 'true') ? 'Enabled' : 'Disabled'
                    $(this).button('option', 'label', status);
                    this.checked = (window.ext.webpg_prefs.decorate_inline.get() == 'true');
                    $(this).button('refresh');
                }
            );

            $('#enable-encrypt-to-self-check').button({
                'label': (window.ext.webpg_prefs.encrypt_to_self.get()) ? 'Enabled' : 'Disabled'
                }).click(function(e) {
                    if (window.ext.webpg_prefs.encrypt_to_self.get()) {
                        window.ext.webpg_prefs.encrypt_to_self.set(false)
                        this.checked = false;
                        status = 'Disabled';
                    } else {
                        window.ext.webpg_prefs.encrypt_to_self.set(true);
                        this.checked = true;
                        status = 'Enabled';
                    }
                    $(this).button('option', 'label', status);
                    $(this).button('refresh');
                }
            );
        }
    }
    
    $('#close').button().click(function(e) { window.close(); });

});
/* ]]> */
