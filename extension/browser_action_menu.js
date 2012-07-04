/* <![CDATA[ */

var ext = chrome.extension.getBackgroundPage();

$(document).ready(function() {
    $('.menu-option').hover(
        function(){ 
            $(this).addClass("menu-option-over");
        },
        function(){
            $(this).removeClass("menu-option-over");
        }
    );
});

var MenuActions = {
    options: function(){
        console.log("options was selected");
        url = chrome.extension.getURL('options.html') + "?tab=0";
        chrome.tabs.create({ 'url': url });
        return false;
    },

    key_manager: function(){
        console.log("key mangager was selected");
        url = chrome.extension.getURL('key_manager.html') + "?tab=0";
        chrome.tabs.create({ 'url': url });
        return false;
    }
}

// Listen for the creation of the buttons and assign their methods
document.addEventListener('DOMContentLoaded', function () {
    document.getElementById("options-button").addEventListener('click', MenuActions.options);
    document.getElementById("key-manager-button").addEventListener('click', MenuActions.key_manager);
});


/* ]]> */
