/* <![CDATA[ */
// Enforce jQuery.noConflict if not already performed
if (typeof(jQuery)!='undefined') { var jq = jQuery.noConflict(true); }

jq(document).ready(function() {
    jq('.menu-option').hover(
        function(){ 
            jq(this).addClass("menu-option-over");
        },
        function(){
            jq(this).removeClass("menu-option-over");
        }
    );
});

var _ = webpg.utils.i18n.gettext;

var menuActions = {
    options: function(){
        console.log("options was selected");
        url = chrome.extension.getURL('options.html') + "?auto_init=true&tab=0";
        chrome.tabs.create({ 'url': url });
        return false;
    },

    key_manager: function(){
        console.log("key mangager was selected");
        url = chrome.extension.getURL('key_manager.html') + "?auto_init=true&tab=0";
        chrome.tabs.create({ 'url': url });
        return false;
    },

    about: function(){
        console.log("about was selected");
        url = chrome.extension.getURL('about.html');
        chrome.tabs.create({ 'url': url });
        return false;
    }
}

// Listen for the creation of the buttons and assign their methods
document.addEventListener('DOMContentLoaded', function () {
    jq("#options-button").text(_("Options"))[0].addEventListener('click', menuActions.options);
    jq("#key-manager-button").text(_("Key Manager"))[0].addEventListener('click', menuActions.key_manager);
    jq("#about-button").text(_("About WebPG"))[0].addEventListener('click', menuActions.about);
});


/* ]]> */
