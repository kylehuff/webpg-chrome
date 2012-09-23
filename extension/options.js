/* <![CDATA[ */
if (typeof(webpg)=='undefined') { webpg = {}; }

webpg.options = {

    init: function(browserWindow) {
        if (webpg.utils.detectedBrowser == "firefox" || webpg.utils.detectedBrowser == "thunderbird")
            webpg.plugin = browserWindow.plugin;
        else if (webpg.utils.detectedBrowser == "chrome")
            webpg.plugin = chrome.extension.getBackgroundPage().plugin;

        jQuery('#step-1').ready(function(){
            doSystemCheck();
        });
        
        function doSystemCheck() {
            if (webpg.utils.detectedBrowser == "chrome")
                pf = window.clientInformation.platform.substr(0,3);
            else
                pf = navigator.oscpu.substr(0,3);
            platform = "";
            if (pf == "Win") {
                platform = "-mswindows";
            }
            if (pf == "Mac") {
                platform = "-macosx";
            }
            if (webpg.plugin && webpg.plugin.valid) {
                webpg_status = webpg.plugin.webpg_status;
                errors = {
                    'NPAPI' : { 'error' : false, 'detail': "The WebPG NPAPI Plugin is valid; version " + webpg.plugin.version },
                    'libgpgme' : { 'error' : false, 'detail' : "It appears you have a working version of libgpgme; version " + webpg_status.gpgme_version },
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
                webpg.utils.log(errors['NPAPI']['detail']);
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
                item_result = jQuery("<div></div>", {
                    'class': "trust-level-desc" + extra_class
                }).append(jQuery("<span></span>", {
                        'class': "system-check",
                        'style': "margin-right: 8px"
                    }).append(jQuery("<img/>", {
                            'src': (errors[error]['error']) ?
                                "skin/images/cancel.png" : "skin/images/check.png"
                        })
                    )
                ).append(jQuery("<span></span>", {
                        'class': "trust-desc",
                        'html': (errors[error]['error'] && errors[error]['link']) ? 
                            errors[error]['detail'] + " - <a href=\"" + errors[error]['link'] + platform + "/\" target=\"new\">click here for help resolving this issue</a>" : errors[error]['detail']
                    })
                );
                jQuery('#status_result').append(item_result);
            }
            if (errors_found && (error == 'libgpgme' || error == 'NPAPI')) {
                // Hide the options for valid installations
                jQuery('#valid-options').hide();
            } else {
                // Only display the inline check if this is not the app version of webpg-chrome
                if ((webpg.utils.detectedBrowser == "chrome") &&
                    !chrome.app.getDetails().hasOwnProperty("content_scripts")){
                        jQuery('#enable-decorate-inline').hide();
                } else {
                    jQuery('#enable-decorate-inline-check')[0].checked = 
                        (webpg.preferences.decorate_inline.get() == 'true');
                }

                jQuery('#enable-encrypt-to-self-check')[0].checked = 
                    (webpg.preferences.encrypt_to_self.get());

                jQuery('#enable-gmail-integration-check')[0].checked = 
                    (webpg.preferences.gmail_integration.get() == 'true');

                jQuery('#enable-decorate-inline-check').button({
                    'label': (webpg.preferences.decorate_inline.get() == 'true') ? 'Enabled' : 'Disabled'
                    }).click(function(e) {
                        (webpg.preferences.decorate_inline.get() == 'true') ? webpg.preferences.decorate_inline.set(false) : webpg.preferences.decorate_inline.set(true);
                        status = (webpg.preferences.decorate_inline.get() == 'true') ? 'Enabled' : 'Disabled'
                        jQuery(this).button('option', 'label', status);
                        this.checked = (webpg.preferences.decorate_inline.get() == 'true');
                        jQuery(this).button('refresh');
                    }
                );

                jQuery('#enable-encrypt-to-self-check').button({
                    'label': (webpg.preferences.encrypt_to_self.get()) ? 'Enabled' : 'Disabled'
                    }).click(function(e) {
                        if (webpg.preferences.encrypt_to_self.get()) {
                            webpg.preferences.encrypt_to_self.set(false)
                            this.checked = false;
                            status = 'Disabled';
                        } else {
                            webpg.preferences.encrypt_to_self.set(true);
                            this.checked = true;
                            status = 'Enabled';
                        }
                        jQuery(this).button('option', 'label', status);
                        jQuery(this).button('refresh');
                    }
                );

                jQuery('#enable-gmail-integration-check').button({
                    'label': (webpg.preferences.gmail_integration.get() == 'true') ? 'Enabled' : 'Disabled'
                    }).click(function(e) {
                        if (webpg.preferences.gmail_integration.get() == 'false') {
                            alert("WebPG GMAIL integration is *VERY EXPERIMENTAL*;\nuse at own risk")
                        }

                        (webpg.preferences.gmail_integration.get() == 'true') ?
                            webpg.preferences.gmail_integration.set(false)
                            : webpg.preferences.gmail_integration.set(true);
                        status = (webpg.preferences.gmail_integration.get() == 'true') ? 'Enabled' : 'Disabled'
                        jQuery(this).button('option', 'label', status);
                        this.checked = (webpg.preferences.gmail_integration.get() == 'true');
                        jQuery(this).button('refresh');
                    }
                );
            }
        }
        
        jQuery('#close').button().click(function(e) { window.top.close(); });
    }
}

jQuery(function(){
    if (webpg.utils.getParameterByName("auto_init") == "true")
        webpg.options.init();
});
/* ]]> */
