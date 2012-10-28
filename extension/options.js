/* <![CDATA[ */
if (typeof(webpg)=='undefined') { webpg = {}; }

/*
    Class: webpg.options
        Provides the methods for the options page
*/
webpg.options = {

    /*
        Function: init
            Sets up the required references to webpg.background,
            and performs initial plugin tests

        Parameters:
            browserWindow - <window> The Window object housing firefoxOverlay.xul
            or thunderbirdOverlay.xul in Mozilla applications - not passed in Google Chrome
    */
    init: function(browserWindow) {
        if (webpg.utils.detectedBrowser['vendor'] == "mozilla")
            webpg.plugin = browserWindow.plugin;
        else if (webpg.utils.detectedBrowser['product'] == "chrome")
            webpg.plugin = chrome.extension.getBackgroundPage().plugin;

        jQuery('#step-1').ready(function(){
            doSystemCheck();
        });
        
        function doSystemCheck() {
            if (webpg.utils.detectedBrowser['product'] == "chrome")
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
                    'NPAPI' : { 'error' : false, 'detail': _("The WebPG NPAPI Plugin is valid") + "; version " + webpg.plugin.version },
                    'libgpgme' : { 'error' : false, 'detail' : _("libgpgme loaded successfully") + "; version " + webpg_status.gpgme_version },
                    'gpg_agent' : { 'error' : false, 'detail' : _("It appears you have a key-agent configured") },
                    'gpgconf' : { 'error' : false, 'detail' : _("gpgconf was detected") + "; " +  _("you can use the signature methods") },
                };

                if (!webpg_status.gpgme_valid) {
                    errors['libgpgme'] = {
                        'error': true,
                        'detail': _("libgpgme was unable to load") + "; " + _("libgpgme is required for operation"),
                        'link' : "http://gpgauth.org/projects/gpgauth-chrome/support-libgpgme",
                    }
                }

                if (!webpg_status.gpg_agent_info) {
                    errors['gpg_agent'] = {
                        'error': true,
                        'detail': _("You do not appear to have a key-agent configured") + " " + _("A working key-agent is required"),
                        'link' : "http://gpgauth.org/projects/gpgauth-chrome/support-libgpgme",
                    }
                }

                if (!webpg_status.gpgconf_detected) {
                    errors['gpgconf'] = {
                        'error': true,
                        'detail': _("gpgconf does not appear to be installed") + "; " + _("You will not be able to create signatures"),
                        'link' : "http://gpgauth.org/projects/gpgauth-chrome/support-gpgconf",
                    }
                }

            } else {
                errors = {
	            "NPAPI" : {
                        'error': true,
                        'detail': _("There was a problem loading the plugin") + "; " + _("the plugin might be incompatibly compiled for this architechture"),
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
                            errors[error]['detail'] + " - <a href=\"" + errors[error]['link'] + platform + "/\" target=\"new\">" + _("click here for help resolving this issue") + "</a>" : errors[error]['detail']
                    })
                );
                jQuery('#status_result').append(item_result);
            }
            if (errors_found && (error == 'libgpgme' || error == 'NPAPI')) {
                // Hide the options for valid installations
                jQuery('#valid-options').hide();
            } else {
                // Only display the inline check if this is not the app version of webpg-chrome
                // TODO: We probably don't want to show the "display inline" option for Thunderbird 
                if ((webpg.utils.detectedBrowser['product'] == "chrome") &&
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

                jQuery('#gmail-action-sign-check')[0].checked = 
                    (webpg.preferences.sign_gmail.get() == 'true');

                jQuery('#enable-decorate-inline-check').button({
                    'label': (webpg.preferences.decorate_inline.get() == 'true') ? _('Enabled') : _('Disabled')
                    }).click(function(e) {
                        (webpg.preferences.decorate_inline.get() == 'true') ? webpg.preferences.decorate_inline.set(false) : webpg.preferences.decorate_inline.set(true);
                        status = (webpg.preferences.decorate_inline.get() == 'true') ? _('Enabled') : _('Disabled')
                        jQuery(this).button('option', 'label', status);
                        this.checked = (webpg.preferences.decorate_inline.get() == 'true');
                        jQuery(this).button('refresh');
                    }
                );

                jQuery('#enable-encrypt-to-self-check').button({
                    'label': (webpg.preferences.encrypt_to_self.get()) ? _('Enabled') : _('Disabled')
                    }).click(function(e) {
                        if (webpg.preferences.encrypt_to_self.get()) {
                            webpg.preferences.encrypt_to_self.set(false)
                            this.checked = false;
                            status = _('Disabled');
                        } else {
                            webpg.preferences.encrypt_to_self.set(true);
                            this.checked = true;
                            status = _('Enabled');
                        }
                        jQuery(this).button('option', 'label', status);
                        jQuery(this).button('refresh');
                    }
                );

                jQuery('#enable-gmail-integration-check').button({
                    'label': (webpg.preferences.gmail_integration.get() == 'true') ? _('Enabled') : _('Disabled')
                    }).click(function(e) {
                        if (webpg.preferences.gmail_integration.get() == 'false') {
                            alert(_("WebPG GMAIL integration is EXPERIMENTAL") + "; " + _("use at your own risk"))
                        }

                        (webpg.preferences.gmail_integration.get() == 'true') ?
                            webpg.preferences.gmail_integration.set(false)
                            : webpg.preferences.gmail_integration.set(true);
                        status = (webpg.preferences.gmail_integration.get() == 'true') ? _('Enabled') : _('Disabled')
                        jQuery(this).button('option', 'label', status);
                        this.checked = (webpg.preferences.gmail_integration.get() == 'true');
                        jQuery(this).button('refresh');
                    }
                );

                jQuery('#gmail-action-sign-check').button({
                    'label': (webpg.preferences.sign_gmail.get() == 'true') ? _('Enabled') : _('Disabled')
                    }).click(function(e) {
                        (webpg.preferences.sign_gmail.get() == 'true') ?
                            webpg.preferences.sign_gmail.set(false)
                            : webpg.preferences.sign_gmail.set(true);
                        status = (webpg.preferences.sign_gmail.get() == 'true') ? _('Enabled') : _('Disabled')
                        jQuery(this).button('option', 'label', status);
                        this.checked = (webpg.preferences.sign_gmail.get() == 'true');
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
