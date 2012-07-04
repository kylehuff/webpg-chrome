/* <![CDATA[ */

var ext = chrome.extension.getBackgroundPage();

$(function(){
    // Only display the inline check if this is not the app version of webpg-chrome
    if (chrome.app.getDetails().hasOwnProperty("content_scripts")){
        $('#enable-decorate-inline-check')[0].checked = 
            (window.ext.webpg_prefs.decorate_inline.get() == 'true');
    } else {
        $('#enable-decorate-inline').hide();
    }

    $('#enable-encrypt-to-self-check')[0].checked = 
        (window.ext.webpg_prefs.encrypt_to_self.get());

    $('#setup_link')[0].href = chrome.extension.getURL('druid.html');

    $('#enable-decorate-inline-check').button({
        'label': (window.ext.webpg_prefs.decorate_inline.get() == 'true') ? 'Enabled' : 'Disabled'
        }).click(function(e) {
            (window.ext.webpg_prefs.decorate_inline.get() == 'true') ? window.ext.webpg_prefs.decorate_inline.set(false) : ext.webpg_prefs.decorate_inline.set(true);
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
                ext.webpg_prefs.encrypt_to_self.set(true);
                this.checked = true;
                status = 'Enabled';
            }
            $(this).button('option', 'label', status);
            $(this).button('refresh');
        }
    );

    $('#close').button().click(function(e) { window.close(); });

});
/* ]]> */
