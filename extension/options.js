/* <![CDATA[ */
if (typeof(webpg)=='undefined') { webpg = {}; }
// Enforce jQuery.noConflict if not already performed
if (typeof(jQuery)!='undefined') { var jq = jQuery.noConflict(true); }

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
        var _ = webpg.utils.i18n.gettext;
        document.title = _("WebPG Options");
        document.dir = (webpg.utils.isRTL() ? 'rtl' : 'ltr');
        if (webpg.utils.detectedBrowser['vendor'] == "mozilla")
            webpg.plugin = browserWindow.webpg.plugin;
        else if (webpg.utils.detectedBrowser['product'] == "chrome")
            webpg.plugin = chrome.extension.getBackgroundPage().webpg.plugin;

        jq('#step-1').ready(function(){
            doSystemCheck();
        });

        function doSystemCheck() {
            var _ = webpg.utils.i18n.gettext;
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
//  No longer used; GPGME is statically linked in webpg-npapi
//                if (!webpg_status.gpgme_valid) {
//                    errors['libgpgme'] = {
//                        'error': true,
//                        'detail': _("libgpgme was unable to load") + "; " + _("libgpgme is required for operation"),
//                        'link' : "http://gpgauth.org/projects/gpgauth-chrome/support-libgpgme",
//                    }
//                }

                if (!webpg_status.gpg_agent_info) {
                    errors['gpg_agent'] = {
                        'error': true,
                        'detail': _("You do not appear to have a key-agent configured") + " " + _("A working key-agent is required"),
                        'link' : "http://gpgauth.org/projects/gpgauth-chrome/gpgagent",
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
                jq('#valid-options').hide();
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
                item_result = jq("<div></div>", {
                    'class': "trust-level-desc" + extra_class
                }).append(jq("<span></span>", {
                        'class': "system-check",
                        'style': "margin-right: 8px"
                    }).append(jq("<img/>", {
                            'src': (errors[error]['error']) ?
                                "skin/images/cancel.png" : "skin/images/check.png"
                        })
                    )
                ).append(jq("<span></span>", {
                        'class': "trust-desc",
                        'html': (errors[error]['error'] && errors[error]['link']) ? 
                            errors[error]['detail'] + " - <a href=\"" + errors[error]['link'] + platform + "/\" target=\"new\">" + _("click here for help resolving this issue") + "</a>" : errors[error]['detail']
                    })
                );
                if (errors_found)
                    jq('#status_result').append(item_result);
            }
            if (errors_found && (error == 'libgpgme' || error == 'NPAPI')) {
                // Hide the options for invalid installations
                jq('#valid-options').hide();
            } else {
                // Only display the inline check if this is not the app version of webpg-chrome.
                // and don't show the "display inline" or "GMAIL integration"
                //  options in Thunderbird
                if (webpg.utils.detectedBrowser['product'] == "thunderbird") {
                    jq('#enable-decorate-inline').hide();
                    jq("#enable-gmail-integration").hide();
                    jq("#gmail-action-sign").hide();
                }

                if ((webpg.utils.detectedBrowser['product'] == "chrome") &&
                    !chrome.app.getDetails().hasOwnProperty("content_scripts")){
                        jq('#enable-decorate-inline').hide();
                } else {
                    jq('#enable-decorate-inline-check')[0].checked = 
                        (webpg.preferences.decorate_inline.get() == 'true');
                }

                jq(".webpg-options-title").first().text(_("WebPG Options"));

                jq("#enable-decorate-inline").find(".webpg-options-text").
                    text(_("Enable Inline formatting of PGP Messages and Keys"));

                jq("#enable-encrypt-to-self").find(".webpg-options-text").
                    text(_("Always encrypt to your default key in addition to the recipient"));

                jq("#enable-gmail-integration").find(".webpg-options-text").
                    text(_("Enable WebPG GMAIL integration") + " [" + _("EXPERIMENTAL") + "]");

                jq("#gmail-action-sign").find(".webpg-options-text").
                    text(_("Sign outgoing messages in GMAIL"));

                jq("#advanced-options-link").text(_("Advanced Options"));

                jq("#gnupg-path-select").find(".webpg-options-text").
                    text(_("GnuPG home directory"));

                jq("#gnupg-path-select").find("input:button").val(_("Save"))

                jq("#gnupg-binary-select").find(".webpg-options-text").
                    text(_("GnuPG binary") + " (i.e. /usr/bin/gpg)");

                jq("#gnupg-binary-select").find("input:button").val(_("Save"));

                jq("#gnupg-keyserver-select").find(".webpg-options-text").
                    text(_("Keyserver") + " (i.e. hkp://subkeys.pgp.net)");

                jq("#gnupg-keyserver-select").find("input:button").val(_("Save"));

                jq("#system-good").find(".trust-desc").text(_("Your system appears to be configured correctly for WebPG"));

                jq("#system-error").find(".trust-desc").text(_("There is a problem with your configuration"));

                jq('#enable-encrypt-to-self-check')[0].checked = 
                    (webpg.preferences.encrypt_to_self.get());

                jq('#enable-gmail-integration-check')[0].checked = 
                    (webpg.preferences.gmail_integration.get() == 'true');

                jq('#gmail-action-sign-check')[0].checked = 
                    (webpg.preferences.sign_gmail.get() == 'true');

                jq('#enable-decorate-inline-check').button({
                    'label': (webpg.preferences.decorate_inline.get() == 'true') ? _('Enabled') : _('Disabled')
                    }).click(function(e) {
                        (webpg.preferences.decorate_inline.get() == 'true') ? webpg.preferences.decorate_inline.set(false) : webpg.preferences.decorate_inline.set(true);
                        status = (webpg.preferences.decorate_inline.get() == 'true') ? _('Enabled') : _('Disabled')
                        jq(this).button('option', 'label', status);
                        this.checked = (webpg.preferences.decorate_inline.get() == 'true');
                        jq(this).button('refresh');
                    }
                );

                jq('#enable-encrypt-to-self-check').button({
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
                        jq(this).button('option', 'label', status);
                        jq(this).button('refresh');
                    }
                );

                jq('#enable-gmail-integration-check').button({
                    'label': (webpg.preferences.gmail_integration.get() == 'true') ? _('Enabled') : _('Disabled')
                    }).click(function(e) {
                        if (webpg.preferences.gmail_integration.get() == null ||
                            webpg.preferences.gmail_integration.get() == 'false') {
                            alert(_("WebPG GMAIL integration is EXPERIMENTAL") + "; " + _("use at your own risk"))
                        }

                        (webpg.preferences.gmail_integration.get() == 'true') ?
                            webpg.preferences.gmail_integration.set(false)
                            : webpg.preferences.gmail_integration.set(true);
                        status = (webpg.preferences.gmail_integration.get() == 'true') ? _('Enabled') : _('Disabled')
                        jq(this).button('option', 'label', status);
                        this.checked = (webpg.preferences.gmail_integration.get() == 'true');
                        jq(this).button('refresh');
                    }
                );

                jq('#gmail-action-sign-check').button({
                    'label': (webpg.preferences.sign_gmail.get() == 'true') ? _('Enabled') : _('Disabled')
                    }).click(function(e) {
                        (webpg.preferences.sign_gmail.get() == 'true') ?
                            webpg.preferences.sign_gmail.set(false)
                            : webpg.preferences.sign_gmail.set(true);
                        status = (webpg.preferences.sign_gmail.get() == 'true') ? _('Enabled') : _('Disabled')
                        jq(this).button('option', 'label', status);
                        this.checked = (webpg.preferences.sign_gmail.get() == 'true');
                        jq(this).button('refresh');
                    }
                );

                jq("#gnupg-path-save").button().click(function(e){
                    webpg.preferences.gnupghome.set(jq("#gnupg-path-input")[0].value);
                    jq(this).hide();
                });

                jq("#gnupg-path-input").each(function() {
                    // Save current value of element
                    jq(this).data('oldVal', jq(this).val());

                    // Look for changes in the value
                    jq(this).bind("change propertychange keyup input paste", function(event){
                        // If value has changed...
                        if (jq(this).data('oldVal') != jq(this).val()) {
                            // Updated stored value
                            jq(this).data('oldVal', jq(this).val());

                            // Show save dialog
                            if (jq(this).val() != webpg.preferences.gnupghome.get())
                                jq("#gnupg-path-save").show();
                            else
                                jq("#gnupg-path-save").hide();
                        }
                    })
                })[0].value = webpg.preferences.gnupghome.get();

                jq("#gnupg-path-input")[0].dir = "ltr";

                jq("#gnupg-binary-save").button().click(function(e){
                    webpg.preferences.gnupgbin.set(jq("#gnupg-binary-input")[0].value);
                    jq(this).hide();
                });

                jq("#gnupg-binary-input").each(function() {
                    // Save current value of element
                    jq(this).data('oldVal', jq(this).val());

                    // Look for changes in the value
                    jq(this).bind("change propertychange keyup input paste", function(event){
                        // If value has changed...
                        if (jq(this).data('oldVal') != jq(this).val()) {
                            // Updated stored value
                            jq(this).data('oldVal', jq(this).val());

                            // Show save dialog
                            if (jq(this).val() != webpg.preferences.gnupgbin.get())
                                jq("#gnupg-binary-save").show();
                            else
                                jq("#gnupg-binary-save").hide();
                        }
                    })
                })[0].value = webpg.preferences.gnupgbin.get();

                jq("#gnupg-binary-input")[0].dir = "ltr";

                jq("#gnupg-keyserver-save").button().click(function(e){
                    webpg.plugin.gpgSetPreference("keyserver", jq("#gnupg-keyserver-input")[0].value);
                    jq(this).hide();
                });

                jq("#gnupg-keyserver-input").each(function() {
                    // Save current value of element
                    jq(this).data('oldVal', jq(this).val());

                    // Look for changes in the value
                    jq(this).bind("change propertychange keyup input paste", function(event){
                        // If value has changed...
                        if (jq(this).data('oldVal') != jq(this).val()) {
                            // Updated stored value
                            jq(this).data('oldVal', jq(this).val());

                            // Show save dialog
                            if (jq(this).val() != webpg.plugin.gpgGetPreference("keyserver").value)
                                jq("#gnupg-keyserver-save").show();
                            else
                                jq("#gnupg-keyserver-save").hide();
                        }
                    })
                })[0].value = webpg.plugin.gpgGetPreference("keyserver").value;

                jq("#gnupg-keyserver-input")[0].dir = "ltr";

                jq("#advanced-options-link").click(function(e){
                    jq("#advanced-options").toggle("slide");
                });
            }
        }

        if (webpg.utils.detectedBrowser['vendor'] == "mozilla")
            jq('#window_functions').hide();

        jq('#close').button().button("option", "label", _("Finished"))
            .click(function(e) { window.top.close(); });
    }
}

jq(function(){
    if (webpg.utils.getParameterByName("auto_init") == "true")
        webpg.options.init();
});
/* ]]> */
