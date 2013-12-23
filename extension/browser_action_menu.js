/* <![CDATA[ */
if (typeof(webpg)=='undefined') { webpg = {}; }
// Enforce jQuery.noConflict if not already performed
if (typeof(jQuery)!='undefined') { webpg.jq = jQuery.noConflict(true); }

webpg.jq(document).ready(function() {
    webpg.jq('.menu-option').hover(
        function(){ 
            webpg.jq(this).addClass("menu-option-over");
        },
        function(){
            webpg.jq(this).removeClass("menu-option-over");
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
};

// Listen for the creation of the buttons and assign their methods
document.addEventListener('DOMContentLoaded', function () {
    webpg.jq("#options-button").find('span').text(_("Options")).bind('click', menuActions.options)
        .append("<img src=\"skin/images/badges/32x32/webpg.png\"/>");
    webpg.jq("#key-manager-button").find('span').text(_("Key Manager")).bind('click', menuActions.key_manager)
        .append("<img style='padding-left:12px; padding-right: 8px;' src=\"skin/images/badges/32x32/stock_keypair.png\"/>");
    webpg.jq("#about-button").find('span').text(_("About WebPG")).bind('click', menuActions.about)
        .append("<img src=\"skin/images/badges/32x32/about.png\"/>");
});


/* ]]> */
