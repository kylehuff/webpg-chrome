/* <![CDATA[ */
if (typeof(webpg)=='undefined') { var webpg = {}; }
// Enforce jQuery.noConflict if not already performed
if (typeof(jQuery)!='undefined') { webpg.jq = jQuery.noConflict(true); }

"use strict"

/**
  @class webpg.keymanager
    The keymanager class provides all of the setup and functions for the WebPG
    Key Manager.

*/
webpg.keymanager = angular.module("webpg.keymanager", [])
  .controller('keymanagerCtrl', function($scope) {
    var _ = webpg.utils.i18n.gettext;
    if (webpg.utils.detectedBrowser.vendor === "mozilla") {
      webpg.background = webpg.utils.mozilla.getChromeWindow();
      webpg.plugin = webpg.background.webpg.plugin;
    } else if (webpg.utils.detectedBrowser.product === "chrome") {
      webpg.plugin = webpg.background.webpg.plugin;
    }

    webpg.secret_keycount = webpg.background.webpg.secret_keycount;
    webpg.current_seckey = 0;
    if (webpg.secret_keys === undefined)
      webpg.secret_keys = {};
    if (webpg.public_keys === undefined)
      webpg.public_keys = {};
    webpg.default_key = webpg.preferences.default_key.get();

    if (webpg.secret_keys.hasOwnProperty(webpg.default_key))
      webpg.secret_keys[webpg.default_key].default = true;

    if (webpg.utils.detectedBrowser.product === "chrome") {
      chrome.extension.onConnect.addListener(function(port) {
        port.onMessage.addListener(function(data) {
          webpg.keymanager.keylistprogress(data, port);
          delete data;
        });
      });
    }

    webpg.plugin.getPrivateKeyList(false, true);

    webpg.utils.extension.version(function(version) {
      webpg.jq("#webpg-info-version-string").text(
        _("Version") + ": " + webpg.utils.escape(version)
      );
    });

    /*
      Global Variable: webpg.keymanager.qs
      Stores the items found in the query string
      Type: <dict>
    */
    // Define a global variable to store the location query string
    webpg.keymanager.qs = {};

    // Assign the location.search value for the appropriate
    //  window to a local variable. window.location for normal
    //  windows, and window.parent.location for iframes that are
    //  loaded from XUL in Firefox
    var loc = (window.location.search.substring()) ?
        window.location.search.substring() :
        window.parent.location.search.substring();

    // Populate the global var "webpg.keymanager.qs" with the values
    loc.replace(
        new RegExp("([^?=&]+)(=([^&]*))?", "g"),
        function($0, $1, $2, $3) { webpg.keymanager.qs[$1] = $3; }
    );
    /**
      @property port a chrome port object
    */

    /**
      @method keylistprogress
        Listens for threaded keylist progress events

      @param {Event} evt The event object
      @param {Object} [port] The port (only available in chrome/chromium)

      @extends webpg.keymanager
    */
    webpg.keymanager.keylistprogress = function(evt, port) {
      var _ = webpg.utils.i18n.gettext,
          key;
      var data = (webpg.utils.detectedBrowser.vendor === "mozilla") ? evt.detail : evt;
      if (data.type == "key") {
        key = JSON.parse(data.data);
        if (key.secret === true) {
          webpg.current_seckey++;
          webpg.jq("#private_progressbar")
            .progressbar({'value':(webpg.current_seckey/webpg.secret_keycount)*100})
            .css({'display': 'inline-block', 'margin-right':'-200px'})
            .find('.progress-label')
              .text(_("Loading keys") + "... [" + key.id + "]");
          if (webpg.default_key !== null && key.id === webpg.default_key)
            key.default = true;
          webpg.secret_keys[key.id] = key;
//          webpg.private_scope.search(webpg.private_scope.currentPage);
//          webpg.private_scope.$apply();
        } else {
          webpg.jq("#public_progressbar")
            .progressbar({'value': Math.floor(Math.random() * 100)})
            .css({'display': 'inline-block'})
            .find('.progress-label')
              .text(_("Loading keys") + "... [" + key.id + "]");
          webpg.public_keys[key.id] = key;
          webpg.public_scope.currentItem++;
          if (webpg.public_scope.currentItem >= webpg.public_scope.itemsPerPage) {
            webpg.public_scope.search(webpg.public_scope.currentPage);
            webpg.public_scope.$apply();
            webpg.public_scope.currentItem = 0;
          }
        }
      } else {
        if (port)
          port.disconnect();
        if (webpg.current_seckey/webpg.secret_keycount >= 1) {
          webpg.jq("#private_progressbar").css({'display': 'none'});
          webpg.current_seckey = 0;
          webpg.seckeylist_built = true;
        } else {
          webpg.jq("#public_progressbar").css({'display': 'none'});
          webpg.pubkeylist_built = true;
        }
        webpg.background.webpg.secret_keys = webpg.secret_keys;
        webpg.private_scope.search(webpg.private_scope.currentPage);
        webpg.private_scope.$apply();
        webpg.public_scope.search(webpg.public_scope.currentPage);
        webpg.public_scope.$apply();
      }
      delete data, evt, key;
    }

    /**
      @method progressMsg
        Listens for key generation progress events

      @param {Event} evt The event object

      @extends webpg.keymanager
    */
    webpg.keymanager.progressMsg = function(evt) {
      var _ = webpg.utils.i18n.gettext;
      var msg = (webpg.utils.detectedBrowser.vendor === "mozilla") ? evt.detail : evt;

      var dialog = (webpg.jq("#genkey-dialog").dialog({'autoOpen': false}).dialog("isOpen") === true) ?
        "#genkey" : (webpg.jq("#gensubkey-dialog").dialog({'autoOpen': false}).dialog("isOpen") === true) ?
        "#gensubkey" : null;

      if (dialog && msg.type === "progress") {
        var data = msg.data;
        if (!isNaN(data))
          data = String.fromCharCode(data);
        data += " ";
        var waitMsg = (msg.data === 43) ? _("Generating Key") : _("Waiting for entropy");
        webpg.jq(".progress-label").text(waitMsg);
        webpg.jq(dialog + "-status").text(_("Building key") + " " + _("please wait") + " [" + waitMsg + "]");
        if (data === "complete" || data === "complete ") {
          webpg.keymanager.genkey_refresh = true;
          webpg.keymanager.genkey_waiting = false;
          var gen_dialog = dialog + "-dialog";
          var new_pkeylist = webpg.plugin.getPrivateKeyList(true);
          var generated_key = (dialog === "#gensubkey") ?
              webpg.jq(gen_dialog).find("#gensubkey-form")[0].key_id.value
                  : null;
          if (dialog === "#genkey") {
            for (var key in new_pkeylist) {
              if (webpg.secret_keys.hasOwnProperty(key.id) === false) {
                generated_key = key;
                break;
              }
            }
          }
          var subkey_index = (dialog === "#gensubkey") ? 0 : null;
          webpg.secret_keys = new_pkeylist;
          webpg.jq(dialog + "-status_detail").remove();
          webpg.jq(dialog + "-status").remove();
          webpg.jq(dialog + "-form")[0].reset();
          webpg.jq(dialog + "-form")[0].style.display="inline-block";
          webpg.jq(dialog + "-dialog").dialog("destroy");
          webpg.private_scope.search(webpg.private_scope.currentPage);
          webpg.private_scope.$apply();
        } else if (data.search("failed") > -1) {
          webpg.keymanager.genkey_waiting = false;
          webpg.jq(dialog + "-status").html("Generation " +
            webpg.utils.escape(data));
          webpg.jq(dialog + "-dialog").dialog("option", "buttons", [{
            'text': _("Close"),
            'click': function() {
              if (dialog === "#gensubkey")
                 webpg.jq(dialog + "-dialog").dialog("option", "height", 320);
              webpg.jq(dialog + "_progress").html("");
              webpg.jq(dialog + "-status_detail").remove();
              webpg.jq(dialog + "-status").remove();
              webpg.jq(dialog + "-form")[0].reset();
              webpg.jq(dialog + "-form")[0].style.display="inline-block";
              webpg.jq(dialog + "-dialog").dialog("close");
            }
          }]);
        }
      }
      delete evt, msg;
    }

    webpg.jq('#tab-privatekeys')
      .text(_("Private Keys"))
      .click(function() {
        if (webpg.seckeylist_built !== true)
          webpg.plugin.getPrivateKeyList(false, true);
        webpg.private_scope.search(webpg.private_scope.currentPage);
        webpg.private_scope.$apply();
      });

    webpg.jq('#tab-publickeys')
      .text(_("Public Keys"))
      .click(function() {
        if (webpg.pubkeylist_built !== true)
          webpg.plugin.getPublicKeyList(true, true);
        webpg.public_scope.search(webpg.public_scope.currentPage);
        webpg.public_scope.$apply();
      });

    webpg.jq('#tab-search').text(_("Search Keyserver"));
    webpg.jq('.pubkey-search-lbl').text(_("Search/Filter") + ": ");
    webpg.jq('#keyserver-search-lbl').text(_("Search for Keys on Keyserver") + ": ");
    webpg.jq("label[for=uid_0_name]", "#genkey-form").text(_("Your Name") + ":");
    webpg.jq("label[for=uid_0_email]", "#genkey-form").text(_("Your Email") + ":");
    webpg.jq("label[for=uid_0_comment]", "#genkey-form").text(_("Comment") + ":");
    webpg.jq("#passphrase").click(function(e) {
      webpg.jq(this).removeClass('input-error');
    });
    webpg.jq("label[for=passphrase]", "#genkey-form").text(_("Passphrase") + ":");
    webpg.jq("#pass_repeat").click(function(e) {
      webpg.jq(this).removeClass('input-error');
    });
    webpg.jq("label[for=pass_repeat]", "#genkey-form").text(_("Repeat Passphrase") + ":");
    webpg.jq(".trigger", "#genkey-form").find("strong").text(_("Advanced Options"));
    webpg.jq("label[for=publicKey_algo]", "#genkey-form").text(_("Public Key Algorithm"));
    webpg.jq("label[for=publicKey_size]", "#genkey-form").text(_("Public Key Size"));
    webpg.jq("label[for=subKey_algo]", "#genkey-form").text(_("Private Key Algorithm"));
    webpg.jq("label[for=subKey_size]", "#genkey-form").text(_("Private Key Size"));
    webpg.jq("label[for=key_expire]", "#genkey-form").text(_("Expire in") + " ");
    webpg.jq("option", "#key_expire, #gs_key_expire").each(function(e){
      switch(this.value) {
        case "0":
          this.textContent = _("Never");
          break;
        case "30":
          this.textContent = _("n30 days");
          break;
        case "90":
          this.textContent = _("n90 days");
          break;
        case "365":
          this.textContent = _("n1 year");
          break;
      }
    });
    webpg.jq("strong", "#gensubkey-form").first(_("Subkey Options"));
    webpg.jq("label[for=gs_subKey_algo]", "#genkey-form").text(_("Private Key Algorithm"));
    webpg.jq("option", "#gs_subKey_algo").each(function(e){
      switch(this.value) {
        case "3":
          this.textContent = "DSA (" + _("Sign only").toLowerCase() + ")";
          break;
        case "4":
          this.textContent = "RSA (" + _("Sign only").toLowerCase() + ")";
          break;
        case "5":
          this.textContent = "Elgamal (" + _("encrypt only").toLowerCase() + ")";
          break;
        case "6":
          this.textContent = "RSA (" + _("encrypt only").toLowerCase() + ")";
          break;
        case "7":
          this.textContent = "DSA (" + _("set your own capabilities").toLowerCase() + ")";
          break;
        case "8":
          this.textContent = "RSA (" + _("set your own capabilities").toLowerCase() + ")";
          break;
      }
    });
    var inputsToLabel = webpg.jq("input", "#subKey_flags");
    for (var inputElem in inputsToLabel) {
      var input = inputsToLabel[inputElem];
      if (input.id !== undefined) {
        webpg.jq(input).next()[0].textContent = (input.id === "subkey-sign-flag") ? _("Sign") :
          (input.id === "subkey-enc-flag") ? _("Encrypt") :
          (input.id === "subkey-auth-flag") ? _("Authenticate") : "";
      }
    }
    webpg.jq("label[for=gs_subKey_size]", "#genkey-form").text(_("Private Key Size"));
    webpg.jq("label[for=gs_key_expire]", "#genkey-form").text(_("Expire in") + " ");
    webpg.jq("#au-uid_0_name").click(function(e) {
      webpg.jq(this).removeClass('ui-state-error');
    });
    webpg.jq("label[for=au-uid_0_name]", "#adduid-form").text(_("Your Name") + ":");
    webpg.jq("#au-uid_0_email").click(function(e) {
      webpg.jq(this).removeClass('ui-state-error');
    });
    webpg.jq("label[for=au-uid_0_email]", "#adduid-form").text(_("Your Email") + ":");
    webpg.jq("#au-uid_0_comment").click(function(e) {
      webpg.jq(this).removeClass('ui-state-error');
    });
    webpg.jq("label[for=au-uid_0_comment]", "#adduid-form").text(_("Comment") + ":");

    webpg.jq("#revkey-confirm").attr("title", _("Revoke this Key") + "?");
    webpg.jq("#revuid-confirm").attr("title", _("Revoke this UID") + "?");
    webpg.jq("#revsig-confirm").attr("title", _("Revoke this Signature") + "?");
    webpg.jq("#delsig-confirm").attr("title", _("Delete this Signature") + "?");
    webpg.jq("#deluid-confirm").attr("title", _("Delete this UID") + "?");
    webpg.jq("#delphoto-confirm").attr("title", _("Delete this UID") + "?");
    webpg.jq("#delete-key-dialog-confirm").attr("title", _("Delete this Key") + "?");
    webpg.jq("#delete-key-confirm-text").text(_("This key will be permanently deleted") +
        ". " + _("Are you sure") + "?");
    webpg.jq("#keyexp-dialog").attr("title", _("Change Expiration"));
    webpg.jq("#createsig-dialog").attr("title", _("Sign this UID"));
    webpg.jq("#genkey-dialog, #gensubkey-dialog").attr("title", _("Key Details"));
    webpg.jq("#export-dialog").attr("title", _("Export Public Key"));
    webpg.jq("#adduid-dialog").attr("title", _("Add UID"));

    webpg.jq('#revkey-text').text(_("Are you sure you wish to revoke this Key") + "?");
    webpg.jq('#revuid-text').text(_("Are you sure you wish to revoke this UID") + "?");
    webpg.jq('#revsig-text').text(_("Are you sure you wish to revoke this Signature") + "?");
    webpg.jq('#delsig-text').text(_("Are you sure you wish to delete this Signature") + "?");
    webpg.jq('#deluid-text').text(_("Are you sure you want to permanently delete this UID") + "?");
    webpg.jq('#delphoto-text').text(_("Are you sure you want to permanently delete this Photo") + "?");
    webpg.jq('#keyexp-text').text(_("New Expiration Date") + ":");
    webpg.jq('#keyexp-never').button({"label": _("Never Expire")});
    webpg.jq('#keyexp-ondate').button({"label": _("Expiration Date")});

    webpg.jq('ul.expand').each(function(){
      webpg.jq('li.trigger', this).filter(':first').addClass('top').end().filter(':not(.open)').next().hide();
      webpg.jq('li.trigger', this).click(function(){
        var height = (webpg.jq("#genkey-status").length > 0) ? webpg.jq("#genkey-status").height() : 0;
        if(webpg.jq(this).hasClass('open')) {
          webpg.jq(this).removeClass('open').next().slideUp();
          webpg.jq("#genkey-dialog").dialog("option", "minHeight", 300 + height);
        } else {
          webpg.jq(this).parent().find('li.trigger').removeClass('open').next().filter(':visible').slideUp();
          webpg.jq(this).addClass('open').next().slideDown(300, function() {
            webpg.jq("#genkey-dialog").dialog("option", "minHeight",
              webpg.jq("#genkey-dialog")[0].scrollHeight + webpg.jq('li.trigger').parent().parent().innerHeight()
            );
          });
        }
      });
    });

    /**
      @method keyaction
        Decides the correct action to perform based on the keyaction button clicked

      @param {Event} e The event object

      @extends webpg.keymanager
    */
    webpg.keymanager.keyaction = function(e) {
      var params = webpg.jq(this).parent()[0].id.split('-'),
          refresh = false,
          scrub = webpg.utils.escape,
          _ = webpg.utils.i18n.gettext;

      switch(params[0]) {
        case "disable":
          if (params[1] === "private") {
            webpg.jq('#enable-' + params[2]).click();
          } else {
            webpg.plugin.gpgDisableKey(params[2]);
            refresh = true;
          }
          break;

        case "enable":
          if (params[1] === "private") {
            webpg.jq('#enable-' + params[2]).click();
          } else {
            webpg.plugin.gpgEnableKey(params[2]);
            refresh = true;
          }
          break;

        case "expire":
          webpg.jq("#keyexp-dialog").dialog({
            'resizable': true,
            'height': 410,
            'modal': true,
            'open': function(event, ui) {
              var key = webpg.plugin.getNamedKey(params[2]);
              webpg.jq("#keyexp-date-input").datepicker({
                'showButtonPanel': true,
                'minDate': "+1D",
                'maxDate': "+4096D",
                'changeMonth': true,
                'changeYear': true
              });
              if (params.length > 3) {
                  subkey_idx = params[3];
              } else {
                  subkey_idx = 0;
              }
              if (parseInt(key.subkeys[subkey_idx].expires, 10) === 0) {
                  webpg.jq("#keyexp-never")[0].checked = true;
                  webpg.jq("#keyexp-date-input").hide();
                  webpg.jq("#keyexp-dialog").dialog({ 'height': 190 });
              } else {
                  webpg.jq("#keyexp-ondate")[0].checked = true;
                  webpg.jq("#keyexp-date-input").show();
                  webpg.jq('#keyexp-buttonset').children().blur();
                  webpg.jq("#keyexp-dialog").dialog({ 'height': 410 });
              }
              webpg.jq("#keyexp-buttonset").buttonset();
              webpg.jq("#keyexp-ondate").change(function(){
                  webpg.jq("#keyexp-date-input").show();
                  webpg.jq("#keyexp-dialog").dialog({ 'height': 410 });
              });
              webpg.jq("#keyexp-never").change(function(){
                  webpg.jq("#keyexp-date-input").hide();
                  webpg.jq("#keyexp-dialog").dialog({ 'height': 190 });
              });
            },
            'buttons': [{
              'text': _("Save"),
              'click': function() {
                var new_expire;
                if (webpg.jq("#keyexp-never")[0].checked) {
                  new_expire = 0;
                } else {
                  var expire = webpg.jq("#keyexp-date-input").datepicker("getDate");
                  var expiration = new Date();
                  expiration.setTime(expire);
                  var today = new Date();
                  today.setHours("0");
                  today.setMinutes("0");
                  today.setSeconds("1");
                  today.setDate(today.getDate()+2);
                  var one_day = 1000*60*60*24;
                  new_expire = Math.ceil((expiration.getTime()-today.getTime())/(one_day) + 1.5);
                  if (new_expire < 1)
                    new_expire = 1;
                }
                // set to new expiration here;
                if (subkey_idx > 0) {
                  webpg.plugin.gpgSetSubkeyExpire(params[2], subkey_idx, new_expire);
                } else {
                  webpg.plugin.gpgSetPubkeyExpire(params[2], new_expire);
                }
                webpg.jq(this).dialog("destroy");
                webpg.secret_keys[params[2]] = webpg.plugin.getNamedKey(params[2]);
                if (params[1] === 'private')
                  webpg.secret_keys[params[2]].secret = true;
                webpg.private_scope.search(webpg.private_scope.currentPage);
                webpg.private_scope.$apply();
                if (params[1] === "subkey") {
                  params[1] = "private";
                }
              }
            }, {
              'text': _("Cancel"),
              'click': function(event,ui) {
                webpg.jq("#keyexp-date-input").datepicker('destroy');
                webpg.jq(this).dialog('destroy');
              }
            }]
          });
          break;

        case "passphrase":
          webpg.plugin.gpgChangePassphrase(params[2]);
          refresh = false;
          break;

        case "delete":
          webpg.jq("#delete-key-dialog-confirm").dialog({
            'resizable': true,
            'height': 168,
            'modal': true,
            'close': function() {
                webpg.jq("#delete-key-dialog-confirm").dialog("destroy");
            },
            'buttons': [
            {
              'text': _("Delete this key"),
              'click': function() {
                // Delete the Public Key
                if (params[1] === "public")
                  result = webpg.plugin.gpgDeletePublicKey(params[2]);
                if (params[1] === "private")
                  result = webpg.plugin.gpgDeletePrivateKey(params[2]);
                if (params[1] === "subkey")
                  result = webpg.plugin.gpgDeletePrivateSubKey(params[2],
                    parseInt(params[3], 10));
                webpg.jq(this).dialog("close");

                if (result && !result.error) {
                  if (params[1] === "public") {
                    delete webpg.public_keys[params[2]];
                    webpg.public_scope.search(webpg.public_scope.currentPage);
                    webpg.public_scope.$apply();
                  } else {
                    if (params[1] === "private")
                      delete webpg.secret_keys[params[2]];
                    else if (params[1] === "subkey") {
                      if (webpg.secret_keys.hasOwnProperty(params[2]))
                        delete webpg.secret_keys[params[2]].subkeys[params[3]];
                      if (webpg.public_keys.hasOwnProperty(params[2]))
                        delete webpg.public_keys[params[2]].subkeys[params[3]];
                    }
                    webpg.private_scope.search(webpg.private_scope.currentPage);
                    webpg.private_scope.$apply();
                  }
                }
              }
              }, {
                'text': _("Cancel"),
                'click': function() {
                  webpg.jq(this).dialog("close");
                }
              }
            ]
          });
          break;

        case "adduid":
          webpg.jq("#adduid-dialog").dialog({
            'resizable': true,
            'height': 230,
            'width': 550,
            'modal': true,
            'buttons': [
            {
              'text': _("Create"),
              'click': function() {
                var form = webpg.jq(this).find("#adduid-form")[0];
                if (!webpg.jq("#adduid-status").length) {
                  webpg.jq(form).parent().before("<div id=\"adduid-status\"> </div>");
                }
                var error = [];
                if (!form.uid_0_name.value){
                  error.push(_("Name Required"), "<br>");
                  webpg.jq(form.uid_0_name).addClass("ui-state-error");
                }
                if (form.uid_0_name.value.length < 5){
                  error.push(_("UID Names must be at least 5 characters"), "<br>");
                  webpg.jq(form.uid_0_name).addClass("ui-state-error");
                }
                if (!isNaN(form.uid_0_name.value[0])){
                  error.push(_("UID Names cannot begin with a number"), "<br>");
                  webpg.jq(form.uid_0_name).addClass("ui-state-error");
                }
                if (form.uid_0_email.value && !webpg.utils.
                  isValidEmailAddress(form.uid_0_email.value)){
                  error.push(_("Not a valid email address"), "<br>");
                  webpg.jq(form.uid_0_email).addClass("ui-state-error");
                } else {
                  webpg.jq(form.uid_0_email).removeClass("ui-state-error");
                }
                if (error.length) {
                  webpg.jq("#adduid-status").html(error.join(''))[0].style.display="block";
                  return false;
                }
                webpg.keymanager.adduid_waiting = true;
                webpg.jq("#adduid-dialog").dialog("option", "minHeight", 250);
                webpg.jq("#adduid-status").html(error)[0].style.display="block";
                var result = webpg.plugin.gpgAddUID(params[2], form.uid_0_name.value,
                  form.uid_0_email.value, form.uid_0_comment.value);
                if (result.error) {
                  console.log(result);
                  return;
                }
                webpg.jq(this).dialog("close");
                webpg.jq("#adduid-form")[0].reset();
                webpg.jq("#adduid-dialog").dialog("destroy");
              }
              }, {
                'text': _("Cancel"),
                'click': function() {
                  webpg.jq("#adduid-dialog").dialog("close");
                  webpg.jq("#adduid-form")[0].reset();
                  webpg.jq("#adduid-dialog").dialog("destroy");
                }
              }
            ]
          });
          break;

        case "addsubkey":
          webpg.jq("#gensubkey-dialog").dialog({
            'resizable': true,
            'minHeight': 300,
            'draggable': true,
            'width': 300,
            'modal': true,
            'autoOpen': false,
            'buttons': [{
              'text': _("Create"),
              'click': function() {
                var form = webpg.jq(this).find("#gensubkey-form")[0];
                form.key_id.value = params[2];
                webpg.jq(form).parent().before("<div id=\"gensubkey-status\"> </div>");
                var error = "";
                webpg.keymanager.genkey_waiting = true;
                if (webpg.utils.detectedBrowser.product === "chrome") {
                  chrome.extension.onConnect.addListener(function(port) {
                    port.onMessage.addListener(webpg.keymanager.progressMsg);
                  })
                }
                webpg.jq("#gensubkey-form").find(".open").trigger("click");
                webpg.jq("#gensubkey-dialog").dialog("option", "minHeight", 300);
                webpg.jq("#gensubkey-status").html(error)[0].style.display="block";
                webpg.jq("#gensubkey-status").html(_("Building key, please wait"));
                webpg.jq("#gensubkey-status").after("<div id='gensubkey-status_detail' style=\"font-size: 12px; color:#fff;padding: 20px;\">This may take a long time (5 minutes or more) to complete depending on the selected options. Please be patient while the key is created. It is safe to close this window, key generation will continue in the background.<br><br><div id='gensubkey_progress' style='height:auto;display:block;'><div class='progress-label'></div></div></div>");
                webpg.jq(form)[0].style.display = "none";
                webpg.jq("#gensubkey_progress").progressbar({'value': false});
                webpg.jq("#gensubkey-dialog")[0].style.height = "20";
                webpg.jq("#gensubkey-dialog")[0].style.display = "none";
                var response = webpg.plugin.gpgGenSubKey(form.key_id.value,
                  form.gs_subKey_algo.value,
                  form.gs_subKey_size.value,
                  form.key_expire.value,
                  (form['subkey-sign-flag'].checked) ? 1 : 0,
                  (form['subkey-enc-flag'].checked) ? 1 : 0,
                  (form['subkey-auth-flag'].checked) ? 1 : 0
                );
                if (response === "queued") {
                  webpg.jq("#gensubkey-dialog").dialog("option", "buttons", [{
                    'text': _("Close"),
                    'click': function() {
                      webpg.jq("#gensubkey-dialog").dialog("close");
                    }
                  }]);
                }
              }
            }, {
              'text': _("Cancel"),
              'click': function() {
                webpg.jq("#gensubkey-dialog").dialog("close");
                webpg.jq("#gensubkey-dialog").dialog("destroy");
              }
            }]
          });
          webpg.jq("#subKey_flags").buttonset();
          webpg.jq("#gensubkey-form").children('input').removeClass('input-error');
          webpg.jq("#gensubkey-form")[0].reset();
          webpg.jq('#gensubkey-form .subkey-algo').each(function(){
            webpg.jq(this)[0].options.selectedIndex = webpg.jq(this)[0].options.length - 1;
            webpg.jq(this).parent().find('.key-size')[0].children[0].disabled = true;
            webpg.jq(webpg.jq(this).parent().find('.key-size')[0].children[0]).hide();
          }).change(function(){
            selectedIndex = webpg.jq(this)[0].options.selectedIndex;
            if (selectedIndex === 0 || selectedIndex === 4) {
              // DSA Selected
              webpg.jq(this).parent().find('.key-size')[0].children[0].disabled = false;
              webpg.jq(webpg.jq(this).parent().find('.key-size')[0].children[0]).show();
              webpg.jq(this).parent().find('.key-size')[0].children[4].disabled = true;
              webpg.jq(webpg.jq(this).parent().find('.key-size')[0].children[4]).hide();
            } else if (selectedIndex === 1 || selectedIndex === 3 || selectedIndex === 5) {
              // RSA Selected
              webpg.jq(this).parent().find('.key-size')[0].children[0].disabled = true;
              webpg.jq(webpg.jq(this).parent().find('.key-size')[0].children[0]).hide();
              webpg.jq(this).parent().find('.key-size')[0].children[4].disabled = false;
              webpg.jq(webpg.jq(this).parent().find('.key-size')[0].children[4]).show();
            } else if (selectedIndex === 2) {
              // ElGamal Selected
              webpg.jq(this).parent().find('.key-size')[0].children[0].disabled = false;
              webpg.jq(webpg.jq(this).parent().find('.key-size')[0].children[0]).show();
              webpg.jq(this).parent().find('.key-size')[0].children[4].disabled = false;
              webpg.jq(webpg.jq(this).parent().find('.key-size')[0].children[4]).show();
            }
            if (selectedIndex < 4) {
              webpg.jq("#subKey_flags").hide();
              webpg.jq("#gensubkey-dialog").dialog("option", "height", 240);
            } else {
              if (selectedIndex === 4) {
                webpg.jq("#subKey_flags").find('#subkey-sign-flag')[0].checked = true;
                webpg.jq("#subKey_flags").find('#subkey-enc-flag')[0].checked = false;
                webpg.jq("#subKey_flags").find('#subkey-auth-flag')[0].checked = false;
              } else {
                webpg.jq("#subKey_flags").find('#subkey-sign-flag')[0].checked = true;
                webpg.jq("#subKey_flags").find('#subkey-enc-flag')[0].checked = true;
                webpg.jq("#subKey_flags").find('#subkey-auth-flag')[0].checked = false;
              }
              webpg.jq("#subKey_flags").show();
              webpg.jq("#gensubkey-dialog").dialog("option", "height", 300);
            }
            webpg.jq("#subKey_flags").buttonset("refresh");
          });
          webpg.jq("#gensubkey-dialog").dialog('open');
          webpg.jq("#gensubkey-form").find(".open").trigger("click");
          break;

        case "addphoto":
          webpg.jq("#addphoto-dialog").dialog({
            'resizable': true,
            'height': 230,
            'draggable': true,
            'width': 550,
            'modal': true,
            'buttons': [{
              'text': _("Add"),
              'click': function() {
                var f = webpg.jq(this).find("#ap-photo_name")[0].files.item(0);
                var reader = new FileReader();
                var attempt = 0;
                reader.onload = (function(theFile) {
                  return function(e) {
                    if (e.target.error) {
                      webpg.jq("#list").html("<ul><li><strong><span class='error-text' style='padding-right:12px;'>" +
                        _("Error") + ":</span>" +
                        _("There was an error parsing this image file") +
                        "</strong></li></ul>"
                      );
                      return false;
                    }
                    var result64 = btoa(e.target.result);
                    var result = {'error': true};
                    // We need to loop this a few times, because it often
                    //  fails for no apparent reason.
                    while (result.error === true && attempt < 3) {
                      result = webpg.plugin.gpgAddPhoto(params[2], f.name, result64);
                      attempt++;
                    }
                    if (result.error === true) {
                      msg = ["<ul><li><strong><span class='error-text' style='padding-right:12px;'>",
                        _("Error"), ":</span>", _("There was an error adding this image file"),
                        "</strong></li>"];
                      if (result.gpg_error_code === 1)
                        msg.push("<li>", _("It is possible the image contains EXIF data"),
                            "</li>");
                      else
                        msg.push("<li>", result.error_string, "</li>");
                      msg.push("</ul>");
                      webpg.jq("#list").html(msg.join(''));
                    } else {
                      webpg.jq("#ap-photo_name")[0].value = '';
                      webpg.jq("#addphoto-dialog").dialog("destroy");
                      if (params[1] === "public") {
                        webpg.public_scope.search(webpg.public_scope.currentPage);
                        webpg.public_scope.$apply();
                      } else {
                        webpg.private_scope.search(webpg.private_scope.currentPage);
                        webpg.private_scope.$apply();
                      }
                    }
                  };
                })(f);
                reader.readAsBinaryString(f);
              },
              'id': 'ap-add_button'
            }, {
              'text': _("Cancel"),
              'click': function() {
                webpg.jq(this).find("#ap-photo_name")[0].value = "";
                webpg.jq("#addphoto-dialog").dialog("destroy");
              }
            }]
          }).parent().animate({"opacity": 1.0}, 1, function() {
            webpg.jq("#ap-add_button").attr("disabled", true);
            webpg.jq(this).find("#list").html("<ul><li><strong>" +
              _("Please use the button above to select a JPEG (.jpg/.jpeg) photo") +
              "</strong></li></ul>"
            );
            webpg.jq(this).find("#ap-photo_name")[0].addEventListener('change', function(e) {
              var files = e.target.files; // FileList object

              // files is a FileList of File objects. List some properties.
              var f = files[0];
              if (files.length === 1) {
                if (f.type != "image/jpeg") {
                  e.target.value = "";
                  msg = ['<li class="error-text"><strong>', _("Only JPEG image files are supported"), '</li>'];
                } else {
                  msg = ['<li>', (f.type || 'n/a'), ' - ', f.size, ' bytes</li>'];
                  if (f.size > 6144)
                    msg.push("<li style='padding-right:8px;'><strong><span class='error-text'>",
                      _("WARNING"), "</span>: ", parseFloat(f.size / 1000).toFixed(1), " kB ",
                      _("is quite large"), ". ", _("Consider using a smaller image"), "</li>");
                  webpg.jq("#ap-add_button").attr("disabled", false);
                }
              } else {
               msg = ['<li class="error-text"><strong>', _("Only one image can be added"), '</li>'];
              }
              webpg.jq(this).parent().find('#list').html('<ul>' + msg.join('') + '</ul>');
            }, false);
          });
          break;

        case "export":
          var export_result = webpg.plugin.gpgExportPublicKey(params[2]).result;
          webpg.jq("#export-dialog-text").html(scrub(export_result));
          webpg.jq("#export-dialog-copytext").html(scrub(export_result));
          webpg.jq("#export-dialog").dialog({
            'resizable': true,
            'height': 'auto',
            'maxHeight': window.innerHeight - 75 || document.documentElement.clientHeight - 75,
            'width': 536,
            'modal': true,
            'buttons': [{
              'text': _("Copy"),
              'click': function() {
                webpg.jq("#export-dialog-copytext")[0].select();
                webpg.jq("#export-dialog-msg").html(
                  webpg.utils.copyToClipboard(window, document).msg
                );
                webpg.jq("#export-dialog-msg")[0].style.display="block";
              }
            }, {
              'text': _("Close"),
              'click': function() {
                webpg.jq("#export-dialog").dialog("destroy");
                webpg.jq("#export-dialog-msg")[0].style.display="none";
              }
            }]
          });
          break;

        case "revoke":
          webpg.jq("#revkey-confirm").find('#revkey-text').html(_("Please specify the revocation details") + " -<br/><br/>" +
            "<label for='revkey-reason'>" + _("Reason") + ":</label>" +
            "<select name='revkey-reason' id='revkey-reason' class='ui-add-hover ui-corner-all ui-widget ui-state-default'>" +
            "<option value='0' class='ui-state-default'>" + _("No reason specified") + "</option>" +
            "<option value='1' class='ui-state-default'>" + _("Key has been compromised") + "</option>" +
            "<option value='2' class='ui-state-default'>" + _("Key is superseded") + "</option>" +
            "<option value='2' class='ui-state-default'>" + _("Key is no longer used") + "</option>" +
            "</select><br/>" +
            "<label for='revkey-desc'>" + _("Description") + ":</label>" +
            "<input type='text' name='revkey-desc' id='revkey-desc' class='ui-corner-all ui-widget ui-state-default'/>");

          webpg.jq("#revkey-confirm").dialog({
            'resizable': true,
            'height': 250,
            'width': 350,
            'modal': true,
            'autoOpen': false,
            'close': function() {
              webpg.jq("#revkey-confirm").dialog("destroy");
            },
            'buttons': [{
              'text': _("Revoke"),
              'click': function() {
                var reason = webpg.jq('#revkey-reason')[0].value;
                var desc = webpg.jq('#revkey-desc')[0].value;
                var revkey_result = webpg.plugin.gpgRevokeKey(params[2],
                    parseInt(params[3], 10), parseInt(reason, 10), desc);
                webpg.secret_keys = webpg.plugin.getPrivateKeyList(false, true);
                webpg.private_scope.search(webpg.private_scope.currentPage);
                webpg.private_scope.$apply();
                webpg.jq("#revkey-confirm").dialog("close");
              }
            }, {
              'text': _("Cancel"),
              'click': function() {
                webpg.jq("#revkey-confirm").dialog("close");
              }
            }]
          });
          webpg.jq("#revkey-confirm").dialog('open');
          break;

        case "publish":
          webpg.jq("#export-dialog-copytext").hide();
          webpg.jq("#export-dialog-text").text(_("Are you sure you want to Publish this key to the Keyserver") + "?");
          webpg.jq("#export-dialog").dialog({
            'resizable': true,
            'height': 230,
            'width': 536,
            'modal': true,
            'buttons': [{
                'text': _("Publish"),
                'id': "export-dialog-button-publish",
                'click': function() {
                  webpg.jq("#export-dialog-text").text(_("Sending key to Keyserver"));
                  var res = webpg.plugin.gpgPublishPublicKey(params[2]),
                    errText;
                  if (typeof(res.result)=='undefined' || res.error === true) {
                    errText = _("There was a problem sending this key to the Keyserver");

                    var keyserver = webpg.plugin.gpgGetPreference("keyserver");
                    if (!keyserver.value) {
                      errText += "<br/><br/>" + _("Error") + ":" +
                        _("No Keyserver defined");
                    } else {
                      errText += "<br/><br/>" + _("Error") + ":" +
                        _("Keyserver") + ":<br/>" +
                        scrub(keyserver.value);
                      webpg.jq("#export-dialog-button-publish").button(
                        'option', 'label', _('Try Again')
                      ).button("refresh");
                    }
                  } else {
                    errText = _("Key Published to Keyserver");
                    webpg.jq("#export-dialog-button-publish").button('option', 'label', _('Publish Again')).button("refresh");
                  }
                  webpg.jq("#export-dialog-text").html(errText);
                }
              }, {
                  'text': _("Close"),
                  'click': function() {
                      webpg.jq("#export-dialog").dialog("destroy");
                      webpg.jq("#export-dialog-msg")[0].style.display="none";
                  }
              }]
            });
            webpg.jq("#ui-dialog-title-export-dialog").text(_("Publish to Keyserver"));
            break;

        case "refresh":
          var res = webpg.plugin.gpgImportExternalKey(params[2]);
          var modified = false;
          if (res.error) {
            if (res.gpg_error_code === 16383)
              res.error_string = _("Key not found on keyserver");
          } else {
            modified = res.imported ? true :
              res.imported_rsa ? true :
              res.new_revocations ? true :
              res.new_signatures ? true :
              res.new_sub_keys ? true :
              res.new_user_ids ? true :
              false;
          }
          refresh = modified;
          break;

        case "deleteuid":
            webpg.jq( "#deluid-confirm" ).dialog({
                'resizable': true,
                'height': 180,
                'modal': true,
                'close': function() {
                    webpg.jq("#deluid-confirm").dialog("destroy");
                },
                'buttons': [
                {
                    'text': _("Delete this UID"),
                    'click': function() {
                        // Delete the Public Key
                        var uid_idx = parseInt(params[3], 10) + 1;
                        var result = webpg.plugin.gpgDeleteUID(params[2], uid_idx);
                        webpg.jq(this).dialog("close");
                        // Remove the Key-ID from the params array, since it
                        //  no longer exists
                        if (!result.error) {
                            if (params[1] === 'private') {
                              delete webpg.secret_keys[params[2]].uids[uid_idx];
                              webpg.private_scope.search();
                              webpg.private_scope.$apply();
                            }

                            delete webpg.public_keys[params[2]].uids[params[3]];
                            webpg.public_scope.search();
                            webpg.public_scope.$apply();
                        } else {
                          console.log(result);
                        }
                    }
                }, {
                    'text': _("Cancel"),
                    'click': function() {
                        webpg.jq(this).dialog("close");
                    }
                }
            ]});
            break;

        case "primaryuid":
            refresh = true;
            var uid_idx = parseInt(params[3], 10) + 1;
            var result = webpg.plugin.gpgSetPrimaryUID(params[2], uid_idx);
            params[3] = 0;
            break;

        case "revokeuid":
            webpg.jq("#revuid-confirm").find('#revuid-text').html(_("Please specify the revocation details") + " -<br/><br/>" +
                "<label for='revuid-reason'>" + _("Reason") + ":</label>" +
                "<select name='revuid-reason' id='revuid-reason' class='ui-add-hover ui-corner-all ui-widget ui-state-default'>" +
                "<option value='0' class='ui-state-default'>" + _("No reason specified") + "</option>" +
                "<option value='4' class='ui-state-default'>" + _("User ID is no longer valid") + "</option>" +
                "</select><br/>" +
                "<label for='revuid-desc'>" + _("Description") + ":</label>" +
                "<input type='text' name='revuid-desc' id='revuid-desc' class='ui-corner-all ui-widget ui-state-default'/>");

            webpg.jq("#revuid-confirm").dialog({
                'resizable': true,
                'height': 250,
                'width': 350,
                'modal': true,
                'autoOpen': false,
                'close': function() {
                    webpg.jq("#revuid-confirm").dialog("destroy");
                },
                'buttons': [
                {
                    'text': _("Revoke"),
                    'click': function() {
                        var reason = webpg.jq('#revuid-reason')[0].value;
                        var desc = webpg.jq('#revuid-desc')[0].value;
                        var revuid_result = webpg.plugin.gpgRevokeUID(params[2],
                            parseInt(params[3], 10) + 1, parseInt(reason, 10), desc);
                        if (params[1] === 'private') {
                          webpg.secret_keys = webpg.plugin.getPrivateKeyList(false, true);
                          webpg.private_scope.search(webpg.private_scope.currentPage);
                          webpg.private_scope.$apply();
                        }
                        webpg.public_keys[params[2]] = webpg.plugin.getNamedKey(params[2], false);
                        webpg.public_keys[params[2]].secret = false;
                        webpg.public_scope.search(webpg.public_scope.currentPage);
                        webpg.public_scope.$apply();
                        webpg.jq("#revuid-confirm").dialog("close");
                    }
                }, {
                    'text': _("Cancel"),
                    'click': function() {
                        webpg.jq("#revuid-confirm").dialog("close");
                    }
                }
            ]});
            webpg.jq("#revuid-confirm").dialog('open');
            break;

        case "signuid":
           webpg.jq("#createsig-dialog").dialog({
                'resizable': true,
                'minHeight': 250,
                'width': 630,
                'modal': true,
                'autoOpen': false
            });
            var params = this.parentElement.id.split('-');
            var enabled_keys = webpg.preferences.enabled_keys.get();
            webpg.jq('#createsig-form').html("<p class='help-text'>" + _("Please select which of your keys to create the signature with") + ":</p>");
            if (params[1] === "private")
                var keylist = webpg.secret_keys;
            else
                var keylist = webpg.public_keys;
            var current_signatures = keylist[params[2]].uids[params[3]].signatures;
            var cursig = [];
            for (var sig in current_signatures) {
                cursig.push(current_signatures[sig].keyid);
            }
            if (!webpg.preferences.enabled_keys.length()) {
                if (JSON.stringify(webpg.secret_keys).length > 2) {
                    webpg.jq('#createsig-form').append(_("You have not enabled any keys for use with webpg") +
                        "; <a href='" + webpg.utils.resourcePath + "key_manager.html?auto_init=true&tab=0&helper=enable'>" +
                        _("please click here") + "</a> " + _("and select 1 or more keys for use with webpg"));
                } else {
                    webpg.jq('#createsig-form').append(_("You have not generated any keys") +
                        "; <a href='" + webpg.utils.resourcePath + "key_manager.html?auto_init=true&tab=0&helper=generate'>" +
                        _("please click here") + "</a> " + _("and generate a key to use with webpg"));
                }
            }
            for (var key in webpg.secret_keys) {
                if (webpg.secret_keys[key].disabled === true ||
                webpg.secret_keys[key].expired === true)
                    continue;
                var signed = (cursig.indexOf(key) != -1);
                var status = [];
                if (signed)
                    status.push("<div style='width: 28px; display: inline;text-align:right;'>",
                        "<img style='height: 14px; padding: 2px 2px 0 4px;' id='img_", key, "' ",
                        "src='../skin/images/badges/48x48/stock_signature.png' alt='",
                        _("Already signed with this key"), "'/></div>");
                else
                    status.push("<div style='width: 28px; display: inline;text-align:right;'>",
                        "<img style='display:none; height: 14px; padding: 2px 2px 0 4px;' id='img_",
                        key, "' src='../skin/images/check.png' alt='", _("Signature added using this key"), "'/></div>");
                if (signed)
                    status.push("<input style='display: none;' type='checkbox' id='sign_", key, "' name='", key, "' disabled/>");
                else
                    status.push("<input type='checkbox' id='sign_", key, "' name='", key, "'/>");
                status.push("<label for='sign_", key, "' id='lbl-sign_",key, "' class='help-text'>",
                    webpg.secret_keys[key].name, " (", key, ")", "</label><div id='lbl-sign-err_",
                    key, "' style='display: none;'></div><br/>");
                webpg.jq('#createsig-form').append(status.join(''));
                if (webpg.preferences.enabled_keys.length() === 1 && signed) {
                    webpg.jq(webpg.jq("button", webpg.jq("#createsig-dialog").parent()).children()[1]).hide();
                }
            }
            var refresh = false;
            webpg.jq("#createsig-dialog").dialog({
              "buttons": [{
                'text': _("Sign"),
                'click': function() {
                  var checked = webpg.jq("#createsig-form").children("input:checked");
                  var error = false;
                  for (var item in checked) {
                   if (checked[item].type === "checkbox") {
                    var sign_result = webpg.plugin.gpgSignUID(params[2],
                      parseInt(params[3], 10) + 1,
                      checked[item].name, 1, 1, 1);
                    error = (error || (sign_result.error && sign_result.gpg_error_code != 65)); // if this is true, there were errors, leave the dialog open
                    if (sign_result.error && sign_result.gpg_error_code != 65) {
                      webpg.jq('#img_' + checked[item].name)[0].src = "../skin/images/cancel.png";
                      lbl_sign_error = webpg.jq('#lbl-sign-err_' + checked[item].name)[0];
                      lbl_sign_error.style.display = "inline";
                      lbl_sign_error.style.color = "#f40";
                      lbl_sign_error.style.margin = "0 0 0 20px";
                      webpg.jq(lbl_sign_error).html(sign_result.error_string);
                      webpg.jq(webpg.jq("button", webpg.jq("#createsig-dialog").parent()).children()[0]).text("Close");
                      webpg.jq(webpg.jq("button", webpg.jq("#createsig-dialog").parent()).children()[1]).text("Try again");
                    } else {
                      refresh = true;
                      if (params[1] === 'private') {
                        webpg.secret_keys = webpg.plugin.getPrivateKeyList(false, true);
                        webpg.private_scope.search();
                        webpg.private_scope.$apply();
                      }
                      webpg.public_keys[params[2]] = webpg.plugin.getNamedKey(params[2]);
                      webpg.public_keys[params[2]].secret = false;
                      webpg.public_scope.search();
                      webpg.public_scope.$apply();
                      webpg.jq('#img_' + checked[item].name)[0].src = "../skin/images/check.png";
                      }
                      webpg.jq('#img_' + checked[item].name).show().next().hide();
                    }
                  }
                  if (!error && refresh)
                    webpg.jq("#createsig-dialog").dialog("destroy");
                }
              }, {
                'text': _("Cancel"),
                'click': function() {
                  webpg.jq("#createsig-dialog").dialog("destroy");
                }
              }]
            });
            if (webpg.preferences.enabled_keys.length() === 1 && cursig.indexOf(enabled_keys[0]) != -1) {
                webpg.jq("button", webpg.jq("#createsig-dialog").parent()).first().hide();
            }
            webpg.jq("#createsig-dialog").dialog('open');
            break;

        case "delphoto":
          break;

        default:
          console.log("we don't know what to do with ourselves...");
          alert("You attempted to activate " + params[0] +
            ", but this is not yet implemented...");
          break;
      }
      console.log(".*-key-option-button pressed..", params);
      if (refresh) {
        if (params[1] === 'private') {
          webpg.secret_keys = webpg.plugin.getPrivateKeyList(false, true);
          webpg.private_scope.search(webpg.private_scope.currentPage);
          webpg.private_scope.$apply();
        } else {
          webpg.public_keys[params[2]] = webpg.plugin.getNamedKey(params[2], false);
          webpg.public_keys[params[2]].secret = false;
          webpg.public_scope.search(webpg.public_scope.currentPage);
          webpg.public_scope.$apply();
        }
      }
    };

    /**
      @event change
        tied to the keyserver-search input box

      @param {Event} e The event object

      @extends webpg.keymanager
    */
    webpg.jq("#keyserver-search").unbind("change").bind("change", function(e) {
      // Sometimes the event is a duplicate, so check the
      //  data object for "original_value"
      if (webpg.jq(this).data("original_value") === this.value)
          return;
      // This is an original event, so set the data object
      //  "original_value"
      webpg.jq(this).data('original_value', this.value);
      // Set our keylist object to the current pubkeylist
      var keylist = webpg.public_keys;
      // Retrieve the value of the serach field
      var val = e.target.value.toLowerCase();

      webpg.jq("#dialog-modal").dialog()
        .animate({"opacity": 1.0}, 1,
          function() {
            webpg.jq('#dialog-msg').text(
              (val.length > 0) ? _("Searching for") + " \"" + val +
              "\"" : _("Please wait while we build the key list")
            );
            var result = webpg.plugin.getExternalKey(val);
            if (Object.keys(result).length === 0) {
              result = {
                'UNDEFINED': {
                  'name': _("Search string too ambiguous or not found on server")
                }
              };
            }

            var keyd = webpg.jq(webpg.jq("<div>", {'class': 'signature-box2'}));
            for (var xkey in result) {
              if (!xkey)
                continue;

              // Check if this key is already in our keyring, skip if it is
              var proceed = true;
              Object.keys(webpg.public_keys).map(function(id) {
                if (id.search(xkey) > -1) {
                  proceed = false;
                  return;
                }
              });

              if (!proceed)
                continue;

              extraclass = (result[xkey].expired || result[xkey].invalid || result[xkey].revoked) ? ' invalid-key' : '';

              if (result[xkey].name.length < 1)
                result[xkey].name = result[xkey].email;

              keyd.append(
                webpg.jq("<span>", {
                  'class': 'signature-box' + extraclass,
                  'css': {
                    'display': 'block',
                    'padding-right': '34px'
                  }
                })
                .append(
                  webpg.jq("<span>", {
                    'class': 'keydetails',
                    'html': "<a style='color:#000;'>" + result[xkey].name + "</a>",
                    'css': {
                      'color':'#000',
                      'font-size': '150%',
                      'width': '100%',
                      'left': '0'
                    }
                  }),
                  webpg.jq("<span>", {
                    'class': 'uid-options uid-options-line',
                    'html': (xkey != "UNDEFINED") ? _("KeyID") + ": 0x" + xkey : ""
                  }),
                  webpg.jq("<span>", {
                    'class': 'uid-options uid-options-line',
                    'html': function() {
                      var uidlist = _("UIDs") + "<ul>";
                      for (var uid in result[xkey].uids) {
                        uidlist += "<li>";
                        if (result[xkey].uids[uid].uid.length > 1)
                          uidlist += result[xkey].uids[uid].uid + " - ";
                        if (result[xkey].uids[uid].email.length > 1)
                          uidlist += result[xkey].uids[uid].email;
                        uidlist += "</li>";
                      }
                      uidlist += "</ul>";
                      return uidlist;
                    }
                  })
                )
                .append(
                  webpg.jq("<span>", {
                    'class': 'link_class',
                    'html': (xkey != "UNDEFINED") ? "<hr><a class='import-link' id='import-" + xkey + "' href='#'>" + _("IMPORT") + "</a>" : "",
                    'css': {
                      'color':'#000',
                      'font-size': '150%',
                      'text-transform': 'uppercase',
                      'width': '100%',
                      'left': '0'
                    }
                  })
                )
              );
            }
            webpg.jq("#import-body").html(keyd);
            webpg.jq("#import-body .import-link").click(function(e){
              var import_result = webpg.plugin.gpgImportExternalKey(this.id.split("-")[1]);
              if (import_result.considered === 1 && import_result.imported === 1)
                webpg.jq(this).parent().parent().remove();
            }).css({ 'color': '#000'});
            webpg.jq("#dialog-modal:ui-dialog").dialog('destroy');
        }
      );
    });
  })
  .directive('keymanagerTabs', function($document) {
    return {
      restrict: 'A',
      link: function(scope, elm, attrs) {
        var _ = webpg.utils.i18n.gettext,
            selected_tab = (webpg.keymanager.qs.tab && webpg.keymanager.qs.tab > -1) ? webpg.keymanager.qs.tab : 0,
            selected_tab = parseInt(selected_tab, 10);
        scope.openkey = webpg.keymanager.qs.openkey;
        scope.opensubkey = parseInt(webpg.keymanager.qs.opensubkey, 10);
        webpg.jq(elm[0]).tabs({'active': selected_tab, 'selected': selected_tab});
        if (selected_tab == 1)
          webpg.plugin.getPublicKeyList(true, true);
      }
    };
  })
  .directive('keylistAccordion', function($document) {
    return {
      restrict: 'AC',
      link: function(scope, elm, attrs) {
        var _ = webpg.utils.i18n.gettext,
            scrub = webpg.utils.escape,
            keytype = scope.key.secret? 'private' : 'public';

        var jqueryElm = webpg.jq(elm);

        // Set the primary key accoridion options
        var pKeyAcOptions = {
          'header': 'h3', 'alwaysOpen': false,
          'autoheight': false, 'clearStyle': true,
          'active': false,
          'collapsible': true
        };
        // Create the primary key accordion
        jqueryElm.accordion(pKeyAcOptions);

        if (scope.openkey === scope.key.id)
          jqueryElm.accordion({'active': 0});

        // Fix the aria-controls (otherwise aria-controls contains "{{ key.id }}"
        jqueryElm.find('h3.keylist')
          .attr('aria-controls', 'primary_' +
            (scope.key.secret? 'seckey' : 'pubkey') + '-' + scope.key.id
          )

        // Fetch entire key from public keylist when expanded
        jqueryElm.on("accordionactivate", function(e) {
          if (jqueryElm.accordion("option", "active") === false)
            return;

          var key,
              uid,
              sig;

          // If this key is a secret key, we aready have the entire key
          if (scope.$parent.ktype === 'private')
            key = scope.key;
          else // Fetch the entire key
            key = webpg.plugin.getNamedKey(scope.key.id);

          var photo_info = webpg.plugin.gpgGetPhotoInfo(key.id);
          key.photos_provided = photo_info.photos_provided;
          key.photos = photo_info.photos;

          if (Object.keys(key).length > 0) {
            for (uid in key.uids) {
              key.uids[uid].missing_signatures = [];
              key.uids[uid].revoked_signatures = [];

              for (sig in key.uids[uid].signatures) {
                if (Object.keys(webpg.public_keys).indexOf(key.uids[uid].signatures[sig].keyid) === -1) {
                  key.uids[uid].missing_signatures.push(key.uids[uid].signatures[sig].keyid);
                  if (!key.secret)
                    delete key.uids[uid].signatures[sig];
                } else {
                  if (key.uids[uid].signatures[sig] && key.uids[uid].signatures[sig].revoked === true) {
                    key.uids[uid].revoked_signatures.push(key.uids[uid].signatures[sig].keyid);
                  } else if (key.uids[uid].revoked_signatures.indexOf(key.uids[uid].signatures[sig].keyid) !== -1) {
                    delete key.uids[uid].signatures[sig];
                  }
                }
              }
            }

            if (scope.$parent.ktype === 'private')
              webpg.secret_keys[scope.key.id] = key;

            webpg.public_keys[scope.key.id] = key;

          }

          if (key.photos_provided > 0 && webpg.jq(e.target).hasClass("photo") === false) {
            // When a primary key accordion header is clicked open, do the
            //  following mess to get the associated image(s).
            //  This would be a bit in depth for code comments, see the following
            //  link for details about this process -
            //  https://github.com/kylehuff/webpg-npapi/wiki/Photo-Support#displaying-photos
            webpg.utils.extension.extensionURI(function(path) {
              if (window.navigator.platform.toLowerCase().indexOf("win") > -1)
                path += "skin\\images\\key_photos\\";
              else
                path += "skin/images/key_photos/";
              var count = key.photos_provided;
              var index = key.nuids;
              var photo_viewer = [];
              var batch_name = "WEBPG_" + new Date().getTime() + ".bat";
              if (window.navigator.platform.toLowerCase().indexOf("win") > -1)
                photo_viewer.push("cmd /V:ON /E:ON /C @SETLOCAL & @ECHO OFF & ",
                  "echo @SETLOCAL ENABLEEXTENSIONS ENABLEDELAYEDEXPANSION>!TEMP!\\", batch_name, " & ",
                  "echo @ECHO OFF>>!TEMP!\\", batch_name, " & ",
                  "echo :START>>!TEMP!\\", batch_name, " & ",
                  "echo   set \"FILEPATH=%%%1\">>!TEMP!\\", batch_name, " & ",
                  "echo   set \"FILEPATH=!FILEPATH:~1,-1!\">>!TEMP!\\", batch_name, " & ",
                  "echo   set \"INDEX=%%%2\">>!TEMP!\\", batch_name, " & ",
                  "echo   set \"PCOUNT=%%%3\">>!TEMP!\\", batch_name, " & ",
                  "echo   set \"TEMPFILE=%%%4\">>!TEMP!\\", batch_name, " & ",
                  "echo   set \"KEYID=%%%5\">>!TEMP!\\", batch_name, " & ",
                  "echo   set \"BASEFILENAME=!FILEPATH!\\!KEYID!\">>!TEMP!\\", batch_name, " & ",
                  "echo   IF NOT EXIST \"!FILEPATH!\\.\" (>>!TEMP!\\", batch_name, " & ",
                  "echo     mkdir \"!FILEPATH!\"^>null>>!TEMP!\\", batch_name, " & ",
                  "echo   )>>!TEMP!\\", batch_name, " & ",
                  "echo   IF EXIST \"!BASEFILENAME!-*.jpg\" (>>!TEMP!\\", batch_name, " & ",
                  "echo     del /Q \"!BASEFILENAME!-*.jpg\"^>null>>!TEMP!\\", batch_name, " & ",
                  "echo   )>>!TEMP!\\", batch_name, " & ",
                  "echo   copy \"!TEMPFILE!\" \"!BASEFILENAME!-latest.jpg\"^>null>>!TEMP!\\", batch_name, " & ",
                  "echo   set \"CUR=0\">>!TEMP!\\", batch_name, " & ",
                  "echo   GOTO :LOOP>>!TEMP!\\", batch_name, " & ",
                  "echo :LOOP>>!TEMP!\\", batch_name, " & ",
                  "echo   IF NOT EXIST \"!BASEFILENAME!-!CUR!-*.j\" (>>!TEMP!\\", batch_name, " & ",
                  "echo     GOTO :END>>!TEMP!\\", batch_name, " & ",
                  "echo   ) ELSE (>>!TEMP!\\", batch_name, " & ",
                  "echo     set /A \"CUR+=1\">>!TEMP!\\", batch_name, " & ",
                  "echo     GOTO :LOOP>>!TEMP!\\", batch_name, " & ",
                  "echo   )>>!TEMP!\\", batch_name, " & ",
                  "echo   GOTO :END>>!TEMP!\\", batch_name, " & ",
                  "echo :END>>!TEMP!\\", batch_name, " & ",
                  "echo   set /A \"POSITION=!PCOUNT!+!CUR!\">>!TEMP!\\", batch_name, " & ",
                  "echo   copy \"!BASEFILENAME!-latest.jpg\" \"!BASEFILENAME!-!CUR!-!POSITION!.j\"^>null>>!TEMP!\\", batch_name, " & ",
                  "echo   set /A \"FIN=!CUR!+!INDEX!\">>!TEMP!\\", batch_name, " & ",
                  "echo   IF !FIN! equ !PCOUNT! (>>!TEMP!\\", batch_name, " & ",
                  "echo     rename \"!BASEFILENAME!-*.j\" \"*.jpg\"^>null>>!TEMP!\\", batch_name, " & ",
                  "echo   )>>!TEMP!\\", batch_name, " & ",
                  "!TEMP!\\", batch_name, " \"", path, "\" ", index, " ", count, " \"%i\" %K & del /Q !TEMP!\\", batch_name);
              else
                photo_viewer.push("FILENAME=", path, "%K; ",
                  "if [ ! -d '", path, "' ]; then mkdir '",
                  path, "'; fi; rm -f $FILENAME-*.jpg; cat > $FILENAME-latest.jpg",
                  "; CUR=`ls ", path, " | awk 'BEGIN { count=0; } $1 ~ /",
                  scope.key.id, ".*?j$/ { count++; } END { print count }'`; ",
                  "cp $FILENAME-latest.jpg ", path, "%K-$CUR-$((",
                  (index + 1), " + $CUR)).j; if [ $CUR -ge ", (count - 1),
                  " ]; then for file in ", path, "*.j; do mv $file ${file}pg; done; fi;");

              webpg.plugin.setTempGPGOption("photo-viewer",
                '"' + photo_viewer.join('') + '"');
              webpg.plugin.gpgShowPhoto(scope.key.id);
              webpg.plugin.restoreGPGConfig();

              jqueryElm.find('.keyphoto')
                .first()
                  .attr('src', '../skin/images/key_photos/' + scope.key.id + '-latest.jpg?' + new Date().getTime());

            });

            webpg.jq('.photo-option-button-delete')
              .button()
                .click(function(e){
                  e.preventDefault();
                  var params = this.parentElement.id.split('-');
                  webpg.jq("#delphoto-confirm").dialog({
                    'resizable': true,
                    'height': 180,
                    'modal': true,
                    'close': function() {
                      webpg.jq("#delphoto-confirm").dialog("destroy");
                    },
                    'buttons': [
                    {
                      'text': _("Delete this Photo"),
                      'click': function() {
                        // Delete the Photo
                        var uid_idx = parseInt(params[3], 10) +
                          webpg.public_keys[params[2]].nuids + 1;
                        var result = webpg.plugin.gpgDeleteUID(params[2], uid_idx);
                        console.log(result);
                        webpg.jq(this).dialog("close");
                        if (!result.error) {
                          if (params[1] === 'private') {
                            delete webpg.secret_keys[params[2]].photos[uid_idx];
                            webpg.secret_keys[params[2]].photos_provided--;
                            webpg.private_scope.search();
                            webpg.private_scope.$apply();
                          }

                          delete webpg.public_keys[params[2]].photos[params[3]];
                          webpg.public_keys[params[2]].photos_provided--;
                          webpg.public_scope.search();
                          webpg.public_scope.$apply();
                        }
                      }
                    }, {
                      'text': _("Cancel"),
                      'click': function() {
                        webpg.jq(this).dialog("close");
                      }
                    }
                  ]});
              });
          }

          if (key.photos_provided > 0) {
            webpg.jq(this).find('img.photo_img').each(function(e) {
              webpg.jq(this).attr('src',
                '../skin/images/key_photos/' + scrub(this.parentElement.id.split('photo-')[1]) + '.jpg?' + new Date().getTime());
            });
          }

          scope.search();
          scope.$apply();
        });

        // This allows us to toggle the "Enable" and "Default" buttons without activating the accordion
        jqueryElm.find('.trust').click(function(e) {
          e.stopPropagation();
        });

      }
    }
  })
  .directive('subkeyAccordion', function() {
    return {
      restrict: 'AC',
      link: function(scope, elm, attrs) {

        var jqueryElm = webpg.jq(elm);

        var subKeyAcOptions = {
                                'header': 'h4.subkeylist', 'alwaysOpen': false,
                                'autoheight': false, 'clearStyle': true,
                                'active': '.ui-accordion-left',
                                'collapsible': true
                              };

        jqueryElm.accordion(subKeyAcOptions);

        if (scope.openkey === scope.key.id && scope.opensubkey === scope.$index)
          jqueryElm.accordion({'active': 0});

        // Fix the aria-controls (otherwise aria-controls contains "{{ key.id }}"
        jqueryElm.find('h4.subkeylist').attr('aria-controls',
          scope.subkey.subkey.substr(-16) + '-s' + scope.$index + '-header');

      }
    }
  })
  .directive('uidAccordion', function() {
    return {
      restrict: 'AC',
      link: function(scope, elm, attrs) {

        var jqueryElm = webpg.jq(elm);

        var uidAcOptions = {
                                'header': 'h4.uidlist', 'alwaysOpen': false,
                                'autoheight': false, 'clearStyle': true,
                                'active':'.ui-accordion-left',
                                'collapsible': true
                            };
        // Create the UID accordion
        jqueryElm.accordion(uidAcOptions);
      }
    }
  })
  .directive('photoAccordion', function() {
    return {
      restrict: 'AC',
      link: function(scope, elm, attrs) {

        var _ = webpg.utils.i18n.gettext;
        var jqueryElm = webpg.jq(elm);
        var photoAcOptions = {
                    'header': 'h4.photolist', 'alwaysOpen': false,
                    'autoheight': false, 'clearStyle': true,
                    'active':'.ui-accordion-left',
                    'collapsible': true
                  };

        webpg.jq(".photolist").children('.photo').accordion(photoAcOptions);
      }
    }
  })
  .directive('primarykey', function($document) {
    var _ = webpg.utils.i18n.gettext;
    return {
      restrict: 'E',
      replace: true,
      template: '\
          <span class="keylist-accordion">\
            <h3 class="keylist" style="height:16px;" id="primary_{{ktype? \'private\' : \'public\'}}key-{{key.id}}">\
              <a href="#" name="{{key.id}}">\
                <span class="uid-line">[{{key.id.substr(-8)}}] {{key.name}}</span>\
                <span>{{key.email}}</span>\
              </a>\
              <span class="trust" style="float:right;">\
                <span class="keyoption-help-text">&nbsp;</span>\
                <div class="private-key-buttons" ng-if="ktype===\'private\'" ng-init="opt=secret"></div>\
              </span>\
            </h3>\
            <div class="uidlist" id="{{key.id}}">\
              <div class="keydetails">\
                <img class="keyphoto" ng-show="key.photos_provided > 0" src=""/>\
                <span class="dh keydetails">' + _("Key Details") + '</span>\
                <hr/>\
                <span class="keydetails">\
                  <h4>' + _("KeyID") + ':</h4> {{key.id.substr(-8)}}\
                </span>\
                <span class="keydetails">\
                  <h4>' + _("Key Created") + ': {{key.subkeys[0].created | date}}</h4>\
                </span>\
                <span class="keydetails">\
                  <h4>' + _("Expires") + ': {{key.expired? (' + _("Expired") + ') + (" [" + (key.subkeys[0].expires | date) + "]") : (key.subkeys[0].expires | date)}}</h4>\
                </span>\
                <span class="keydetails">\
                  <h4>' + _("User IDs") + ': {{key.nuids}}</h4>\
                </span>\
                <br/>\
                <span class="keydetails">\
                  <h4>' + _("Fingerprint") + ': {{key.fingerprint}}</h4>\
                </span>\
                <br/>\
                <span class="keydetails">\
                  <h4>' + _("Status") + ': {{key.expired? "' + _("Expired") + '": key.revoked? "' + _("Revoked") + '": key.invalid? "' + _("Invalid") + '": key.disabled? "' + _("Disabled") + '": "' + _("Valid") + '"}}</h4>\
                </span>\
                <span class="keydetails">\
                  <h4>' + _("Key Algorithm") + ': {{key.subkeys[0].algorithm_name}}</h4>\
                </span>\
                <span class="keydetails">\
                  <h4>' + _("Validity") + ': {{key.uids[0].validity}}</h4>\
                </span>\
                <br/>\
                <span class="dh keydetails">' + _("Key Options") + '</span>\
                <hr/>\
                <keyoption-select ng-attr-stype="trust"></keyoption-select>\
                <keyoption-select ng-attr-stype="group"></keyoption-select>\
\
                <keyoption-button ng-attr-stype="expire" ng-if="key.secret" id="expire-private-{{key.id}}"></keyoption-button>\
                <keyoption-button ng-attr-stype="passphrase" ng-if="key.secret" id="passphrase-private-{{key.id}}"></keyoption-button>\
                <keyoption-button ng-attr-stype="addsubkey" ng-if="key.secret" id="addsubkey-private-{{key.id}}"></keyoption-button>\
                <keyoption-button ng-attr-stype="adduid" ng-if="key.secret" id="adduid-private-{{key.id}}"></keyoption-button>\
                <keyoption-button ng-attr-stype="addphoto" ng-if="key.secret" id="addphoto-private-{{key.id}}"></keyoption-button>\
\
                <br/>\
                <span class="dh keydetails">' + _("Operations") + '</span>\
                <hr/>\
                <keyoption-button ng-attr-stype="disable" ng-show="!key.disabled" id="disable-{{key.secret? \'private\':\'public\'}}-{{key.id}}"></keyoption-button>\
                <keyoption-button ng-attr-stype="enable" ng-show="key.disabled" id="enable-{{key.secret? \'private\':\'public\'}}-{{key.id}}"></keyoption-button>\
                <keyoption-button ng-attr-stype="delete" id="delete-{{key.secret? \'private\':\'public\'}}-{{key.id}}"></keyoption-button>\
                <keyoption-button ng-attr-stype="export" id="export-{{key.secret? \'private\':\'public\'}}-{{key.id}}"></keyoption-button>\
                <keyoption-button ng-attr-stype="refresh" id="refresh-{{key.secret? \'private\':\'public\'}}-{{key.id}}"></keyoption-button>\
                <keyoption-button ng-attr-stype="publish" ng-if="key.secret" id="publish-private-{{key.id}}"></keyoption-button>\
\
              </div>\
\
              <span class="dh">' + _("Subkeys") + '</span>\
              <hr/>\
\
              <div class="subkey subkey-accordion" id="{{subkey.subkey.substr(-16)}}-s{{$index}}" ng-class="[subkey.revoked?\'invalid-key\':subkey.expired?\'invalid-key\':subkey.disabled?\'invalid-key\':\'\',(openkey===key.id)? (opensubkey===$index)?\'opensubkey\':\'\':\'\']" ng-repeat="subkey in key.subkeys track by $index">\
                <h4 class="subkeylist" id="{{subkey.subkey.substr(-16)}}-s{{$index}}-header-0">\
                  <a href="#"><span style="margin:0; width:50%">{{subkey.size}}{{subkey.algorithm_name | algorithm_abv}}/{{subkey.subkey.substr(-8)}}</span></a>\
                </h4>\
                <div class="subkey-info" id="{{subkey.subkey.substr(-16)}}-s{{$index}}-panel-0">\
                  <div class="keydetails">\
                    <span class="dh">' + _("Subkey Details") + '</span>\
                    <hr/>\
                    <span class="keydetails">\
                      <h4>' + _("KeyID") + '</h4>\
                      {{subkey.subkey.substr(-8)}}\
                    </span>\
                    <span class="keydetails">\
                      <h4>' + _("Key Created") + '</h4>\
                      {{subkey.created | date}}\
                    </span>\
                    <span class="keydetails">\
                      <h4>' + _("Expires") + '</h4>\
                      {{subkey.expired? "' + _("Expired") + '" + (" [" + (subkey.expires | date) + "]") : (subkey.expires | date)}}\
                    </span>\
                    <br/>\
                    <span class="keydetails">\
                      <h4>' + _("Fingerprint") + '</h4>\
                      {{subkey.subkey}}\
                    </span>\
                    <br/>\
                    <span class="keydetails">\
                      <h4>' + _("Status") + '</h4>\
                      {{subkey.expired? "' + _("Expired") + '" : subkey.revoked? "' + _("Revoked") + '": subkey.invalid? "' + _("Invalid") + '": subkey.disabled? "' + _("Disabled") + '": "' + _("Valid") + '"}}\
                    </span>\
                    <span class="keydetails">\
                      <h4>' + _("Key Algorithm") + '</h4>\
                      {{subkey.algorithm_name}}\
                    </span>\
                    <span class="keydetails">\
                      <h4>' + _("Flags") + '</h4>\
                      {{subkey | flags_list}}\
                    </span>\
                    <br/>\
                    <span class="dh" ng-if="key.secret">' + _("Key Options") + '</span>\
                    <hr ng-if="key.secret"/>\
                    <span ng-if="key.secret">\
                      <keyoption-button ng-attr-stype="expire" ng-if="key.secret" class="subkey-option-button" id="expire-subkey-{{key.id}}-{{$index}}"></keyoption-button>\
                    </span>\
                    <br/>\
                    <span class="dh">' + _("Key Operations") + '</span>\
                    <hr/>\
                    <span>\
                      <keyoption-button ng-attr-stype="delete" class="subkey-option-button" id="delete-subkey-{{key.id}}-{{$index}}"></keyoption-button>\
                      <keyoption-button ng-attr-stype="revokekey" ng-if="key.secret" class="subkey-option-button" id="revoke-subkey-{{key.id}}-{{$index}}"></keyoption-button>\
                    </span>\
                  </div>\
                </div>\
              </div>\
              \
              <br/>\
              <span class="dh">' + _("User IDs") + '</span>\
              <hr/>\
              <div class="uid uid-accordion" ng-class="uid.revoked?\'invalid-key\':\'\'" id="{{key.id}}-{{$index}}" ng-repeat="uid in key.uids track by $index">\
                <h4 class="uidlist" id="{{key.id}}-u{{$index}}">\
                  <a href="#"><span style="margin:0; width: 50%;">{{uid.uid}} - {{uid.email}}</span></a>\
                </h4>\
                <div class="uid-info">\
                  <div class="uid-options uid-options-line">\
                    <span class="uid-options">\
                      <keyoption-button ng-if="!uid.revoked" ng-attr-stype="sign-uid" id="signuid-{{key.secret? \'private\':\'public\'}}-{{key.id}}-{{$index}}"></keyoption-button>\
                      <keyoption-button ng-if="uid.revoked" ng-attr-stype="sign-uid" ng-attr-disabled="true" class="ui-state-disabled" id="signuid-{{key.secret? \'private\':\'public\'}}-{{key.id}}-{{$index}}"></keyoption-button>\
                    </span>\
                    <span class="uid-options">\
                      <keyoption-button ng-attr-stype="delete-uid" id="deleteuid-{{key.secret? \'private\':\'public\'}}-{{key.id}}-{{$index}}"></keyoption-button>\
                    </span>\
                    <span class="uid-options" ng-if="key.secret && !uid.revoked">\
                      <keyoption-button ng-attr-stype="revoke-uid" ng-attr-revoked="{{uid.revoked}}" id="revokeuid-{{key.secret? \'private\':\'public\'}}-{{key.id}}-{{$index}}"></keyoption-button>\
                    </span>\
                    <span class="uid-options" ng-if="key.secret && !uid.revoked">\
                      <keyoption-button ng-attr-stype="primary-uid" id="primaryuid-{{key.secret? \'private\':\'public\'}}-{{key.id}}-{{$index}}"></keyoption-button>\
                    </span>\
                    <span class="missing-signature-text" ng-if="uid.missing_signatures">* ' + _("Signatures made with keys not in your keyring are omitted") + '.</span>\
                  </div>\
                  <br style="clear:both"/>\
                  <div id="sig-{{key.id}}-{{$index}}" ng-repeat="sig in uid.signatures track by $index" class="signature-box" ng-class="sig.revoked? \'sig-revoked\': sig.invalid? \'sig-invalid\' : \'sig-good\'">\
                    <img src="../skin/images/menumask.png" width="0" height="0"/>\
                    <div class="signature-text-box">\
                      <span class="signature-uid" ng-if="sig.revoked===true">{{sig.name}} [' + _("Revoked") + ']</span>\
                      <span class="signature-uid" ng-if="sig.revoked===false">{{sig.name}}</span>\
                      <span class="signature-email">&lt;{{sig.email? sig.email : "' + _("no email address provided") + '"}}&gt;</span>\
                      <span class="signature-keyid">{{sig.keyid}}</span>\
                      <span class="signature-keyid">' + _("Created") + ': {{sig.created | date}}</span>\
                      <span class="signature-keyid">' + _("Expires") + ': {{sig.expires | date}}</span>\
                      <span ng-if="sig.keyid===key.id">[self-signature]</span>\
                      <span ng-if="!sig.exportable">[local, non-exportable]</span>\
                      <span ng-if="(sig.exportable)? sig.keyid!==key.id? true:false:false">[other signature]</span>\
                    </div>\
                    <delsig-button></delsig-button>\
                  </div>\
                </div>\
              </div>\
              \
              <br/>\
              <span class="photo" ng-show="key.photos_provided > 0">\
                <span class="dh">' + _("User Photos") + '</span><hr/>\
              </span>\
              <div class="photolist" ng-show="key.photos_provided > 0">\
                <div class="photo photo-accordion" id="{{key.id}}-p{{$index}}" ng-show="key.photos_provided > 0" ng-repeat="photo in key.photos track by $index">\
                  <h4 class="photolist">\
                    <a href="#"><span style="margin:0; width:50%;">' + _("User Photo") + ' {{$index}}</span></a>\
                  </h4>\
                  <div class="photo-info">\
                    <div class="uid-options uid-options-line">\
                      <span class="uid-options">\
                        <keyoption-button ng-attr-stype="delphoto" id="delphoto-{{key.secret? \'private\':\'public\'}}-{{key.id}}-{{$index}}"></keyoption-button>\
                      </span>\
                    </div>\
                    <br/>\
                    <div class="photo_img" id="photo-{{key.id}}-{{$index}}-{{photo.absolute_index}}">\
                      <img class="photo_img" src="../skin/images/menumask.png"/>\
                    </div>\
                  </div>\
                </div>\
              </div>\
\
            </div>\
          </span>'
    }
  })
  .directive('privateKeyButtons', function($document) {
    return {
      restrict: 'CE',
      replace: true,
      template: "<span>" +
                  "<input class='enable-check' type='checkbox' name='enable-{{key.id}}' id='enable-{{key.id}}' ng-checked='!key.disabled' />" +
                  "<label class='enable-check' for='enable-{{key.id}}'>&nbsp;</label>" +
                  "<input class='default-check' type='radio' name='default_check' id='default-{{key.id}}' ng-checked='key.default===true'/>" +
                  "<label class='default-check' for='default-{{key.id}}'>Set Default Key</label>" +
                "</span>",
      link: function(scope, elm, attrs) {
        var _ = webpg.utils.i18n.gettext;

        var jqueryElm = webpg.jq(elm);
        jqueryElm
          .children()
            .first()
              .attr('checked', (scope.key.disabled===false))
              .next()
              .hover(
                function(e){
                  webpg.jq(this).parent().parent().children('.keyoption-help-text').html(_("Enable this key for GnuPG operations"));
                },
                function(e){
                  webpg.jq(this).parent().parent().children('.keyoption-help-text').html("&nbsp;");
                }
              )
              .next()
                .button({
                  'text': false,
                  'icons': {
                      'primary': 'ui-icon-check'
                  }
                })
              .next()
                .hover(
                    function(e){
                      var input = webpg.jq(this).prev()[0];
                      if (input && input.checked) {
                        webpg.jq(this).parent().parent().children('.keyoption-help-text').html(_("This is your default key"));
                      } else {
                        webpg.jq(this).parent().parent().children('.keyoption-help-text').html(_("Make this the default key for GnuPG operations"));
                      }
                    },
                    function(e){
                      webpg.jq(this).parent().parent().children('.keyoption-help-text').html("&nbsp;");
                    }
                  )

        jqueryElm
          .children()
            .first()
              .button({
                'label': (scope.key.disabled===false) ? _('Enabled'):_('Disabled'),
                'checked': (!scope.key.disabled),
              }).click(function(e) {
                var checked_id = this.id.split("-")[1];
                if (webpg.secret_keys[checked_id].disabled !== true &&
                  checked_id === webpg.preferences.default_key.get()) {
                  webpg.jq(this).next().addClass('ui-state-active');
                  webpg.jq(this).parent().parent().children('.keyoption-help-text').html("<span style=\"color:f6f;\">" + _("Cannot unset your default key") + "</span>");
                  return false;
                }
                if (this.checked && !webpg.preferences.default_key.get()) {
                  webpg.jq(this).next().next().click();
                  webpg.jq(this).next().next().next().addClass('ui-state-active');
                }
                if (this.checked === true) {
                  webpg.preferences.enabled_keys.add(checked_id);
                  webpg.jq("#enable-private-" + checked_id).click();
                  webpg.plugin.gpgEnableKey(checked_id);
                } else {
                  webpg.preferences.enabled_keys.remove(checked_id);
                  webpg.jq("#disable-private-" + checked_id).click();
                  webpg.plugin.gpgDisableKey(checked_id);
                }
                scope.key.disabled = (this.checked === false);
                webpg.private_scope.search(webpg.private_scope.currentPage);
                webpg.private_scope.$apply();
                (this.checked) ? webpg.jq(this).button('option', 'label', _('Enabled')) :
                    webpg.jq(this).button('option', 'label', _('Disabled'));
              })
              .next()
              .next()
                .click(function(e) {
                  var keyid = this.id.split("-")[1];
                  webpg.preferences.default_key.set(keyid);
                  webpg.default_key = keyid;
                  webpg.secret_keys[keyid].default = true;
                  for (var sKey in webpg.secret_keys)
                    webpg.secret_keys[sKey].default = (sKey === keyid);
                  var enable_element = webpg.jq('#check-' + this.id.substr(-16))[0];
                  webpg.jq("#enable-private-" + keyid).click();
                })
              .parent()
                .buttonset();
      }
    };
  })
  .directive('keyoptionSelect', function($document) {
    return {
      restrict: 'E',
      replace: true,
      template: "<span class='uid-options select'>" +
                  "<label></label>" +
                  "<select class='ui-button ui-corner-all ui-button ui-widget ui-state-default' style='text-align:left;'></select>" +
                "</span>",
      link: function(scope, elm, attrs) {
        var _ = webpg.utils.i18n.gettext;
        var jqueryElm = webpg.jq(elm);
        var keytype = scope.key.secret? 'private' : 'public';
        if (attrs.stype == "trust") {
          jqueryElm
            .children()
              .first()
                .prop('for', 'trust-' + keytype + '-' + scope.key.id)
                .prop('textContent', _('Trust Assignment'))
              .next()
                .hover(
                  function(){
                    webpg.jq(this).addClass("ui-state-hover");
                  },
                  function(){
                    webpg.jq(this).removeClass("ui-state-hover");
                  }
                )
                .prop('id', 'trust-' + keytype + '-' + scope.key.id)
                .append(webpg.jq("<option>", {'value': 'unknown', 'class': 'ui-state-default', 'text': _('Unknown')}))
                .append(webpg.jq("<option>", {'value': 'never', 'class': 'ui-state-default', 'text': _('Never')}))
                .append(webpg.jq("<option>", {'value': 'marginal', 'class': 'ui-state-default', 'text': _('Marginal')}))
                .append(webpg.jq("<option>", {'value': 'full', 'class': 'ui-state-default', 'text': _('Full')}))
                .append(webpg.jq("<option>", {'value': 'ultimate', 'class': 'ui-state-default', 'text': _('ultimate')}))
                .find("option[value='" + scope.key.owner_trust + "']")
                  .prop('selected', true);
        } else if (attrs.stype == "group") {
          var existing_groups = webpg.preferences.group.get_group_names();
          jqueryElm
            .children()
              .first()
                .prop('for', 'group-' + keytype + '-' + scope.key.id)
                .prop('textContent', _('Group Assignment'))
              .next()
                .prop('id', 'group-' + keytype + '-' + scope.key.id)
                .prop('name', 'group-' + keytype + '-' + scope.key.id)
                .prop('multiple', true);

          var current_group_assignment = webpg.preferences.group.get_groups_for_key(scope.key.id);
          for (var opt in existing_groups) {
            jqueryElm
              .children()
                .first()
                .next()
                  .append(
                    webpg.jq("<option>", {
                        'value': existing_groups[opt],
                        'text': existing_groups[opt],
                        'selected': (current_group_assignment.indexOf(existing_groups[opt]) !== -1)}
                    )
                  );
          }

          jqueryElm
            .children()
              .first()
              .next()
                .multiselect({
                  'header': _("Select group(s) below"),
                  'noneSelectedText': _("None Selected"),
                  'selectedList': 3,
                  position: {
                    my: 'center',
                    at: 'center'
                  }
                })
                .on("multiselectclick", function(event, ui) {
                  var keyid = event.originalEvent.target.id.split("-")[4],
                      group = ui.value;
                  if (ui.checked) {
                    webpg.preferences.group.add(group, keyid);
                    if (event.originalEvent.target.nextSibling.textContent !== group) {
                      var control = webpg.jq('#' + 'group-' + keytype + '-' +
                        scope.key.id);
                      var btnNew = webpg.jq("<option>", {
                        'name': 'newgroup',
                        'value': event.originalEvent.target.value,
                        'text': event.originalEvent.target.value,
                        'selected': true,
                        'class': 'ui-corner-all'
                      })
                      btnNew.appendTo(control);

                      event.originalEvent.target.nextSibling.textContent = group;
                      control
                        .multiselect("refresh")
                        .multiselectfilter("updateCache")
                        .multiselectfilter("reset");
                    }
                  } else {
                    webpg.preferences.group.remove(group, keyid);
                  }
                })
                .multiselectfilter({
                  'label': '',
                  'placeholder': _("Filter or Create New"),
                  'autoReset': true,
                  'filter': function(event, matches) {
                    var control = webpg.jq('#' + 'group-' + keytype + '-' + scope.key.id);
                    if((!matches || !matches.length) && event.originalEvent !== undefined) {
                      control.find("option[name='createNewGroup']").remove();
                      var btnNew = webpg.jq("<option>", {
                        'name': 'createNewGroup',
                        'value': event.originalEvent.target.value,
                        'text': _("Create new group") + " \"" + event.originalEvent.target.value + "\"",
                        'class': 'ui-corner-all'
                      })
                      btnNew.appendTo(control);
                      control.multiselect('refresh');
                      control.multiselectfilter("updateCache");
                    } else {
                      if (matches && control.find("option[name='createNewGroup']").length > 0) {
                        control.find("option[name='createNewGroup']").remove();
                        control.multiselect('refresh');
                        control.multiselectfilter("updateCache");
                      }
                    }
                  }
                })
                .bind("multiselectopen", function() {
                  webpg.jq(this).find("option[name='createNewGroup']").remove();
                  webpg.jq(this).multiselect('refresh');
                  webpg.jq(this).multiselectfilter("updateCache");
                });
        }
      }
    }
  })
  .directive('keyoptionButton', function($document) {
    return {
      restrict: 'E',
      replace: true,
      template: "<span class='uid-options button'>" +
                  "<input type='button' style='text-align:left;'></input>" +
                "</span>",
      link: function(scope, elm, attrs) {
        var _ = webpg.utils.i18n.gettext,
            jqueryElm = webpg.jq(elm),
            label,
            addClass = "";

        if (attrs.stype === 'expire')
          label = _("Change Expiration");
        if (attrs.stype === 'passphrase')
          label = _("Change Passphrase");
        if (attrs.stype === 'addsubkey')
          label = _("Add Subkey");
        if (attrs.stype === 'adduid')
          label = _("Add UID");
        if (attrs.stype === 'addphoto')
          label = _("Add Photo");
        if (attrs.stype === 'disable')
          label = _("Disable this key");
        if (attrs.stype === 'enable')
          label = _("Enable this key");
        if (attrs.stype === 'delete')
          label = _("Delete this key");
        if (attrs.stype === 'deletesubkey')
          label = _("Delete this Subkey");
        if (attrs.stype === 'export')
          label = _("Export this key");
        if (attrs.stype === 'refresh')
          label = _("Refresh from Keyserver");
        if (attrs.stype === 'publish')
          label = _("Publish to Keyserver");
        if (attrs.stype === 'sign-uid')
          label = (scope.uid.revoked===true) ?
            _("Cannot sign a revoked UID") : _("Sign this UID");
        if (attrs.stype === 'delete-uid')
          label = _("Delete this UID");
        if (attrs.stype === 'revokekey')
          label = _("Revoke this key");
        if (attrs.stype === 'revoke-uid')
          label = _("Revoke UID");
        if (attrs.stype === 'primary-uid')
          label = (attrs.disabled) ?
            _("Cannot make a revoked UID primary") : _("Make Primary");
        if (attrs.stype === 'delphoto') {
          label = _("Delete this Photo");
          addClass = "photo-option-button-delete";
        }


        jqueryElm
          .children()
            .first()
                .button({'label': label});

        jqueryElm
          .children()
            .first()
              .addClass(addClass)
              .on('click', webpg.keymanager.keyaction);

        if (attrs.disabled)
          jqueryElm
            .children()
              .first()
              .prop('disabled', 'disabled');
      }
    }
  })
  .directive("delsigButton", function($document) {
    var _ = webpg.utils.i18n.gettext;
    return {
      restrict: 'E',
      replace: true,
      template: "<input type=\"button\" class=\"deslsig-button ui-button ui-widget ui-state-default ui-corner-all\" id=\"delsig-{{key.secret? 'private':'public'}}-{{key.id}}-{{$parent.$index}}-{{$index}}\" value=\"" + _("Delete") + "\"\/>",
      link: function(scope, elm, attrs) {
        var jqueryElm = webpg.jq(elm);
        jqueryElm
          .button()
          .on('click', function(e) {
            var params = this.id.split("-");
            if (Object.keys(webpg.secret_keys).indexOf(scope.sig.keyid) === -1) {
                webpg.jq("#delsig-confirm").find('#delsig-text').append("<br><br><span class='ui-icon ui-icon-alert' style='float:left; margin:0 7px 20px 0;'></span>" + _("This signature was made with a key that does not belong to you") + "; " + _("This action cannot be undone") + ".");
                webpg.jq("#delsig-confirm").dialog("option", "height", "240");
                webpg.jq("#delsig-confirm").dialog("option", "width", "400");
            }
            webpg.jq("#delsig-confirm").dialog("option",
                "buttons", [
                {
                    'text': _("Delete"),
                    'click': function() {
                        var delsig_result = webpg.plugin.
                            gpgDeleteUIDSign(params[2], parseInt(params[3], 10) + 1,
                            parseInt(params[4], 10) + 1);
                        if (params[1] === 'private') {
                          webpg.secret_keys = webpg.plugin.getPrivateKeyList(false, true);
                          webpg.private_scope.search(webpg.private_scope.currentPage);
                          webpg.private_scope.$apply();
                        }
                        webpg.public_keys[params[2]] = webpg.plugin.getNamedKey(params[2], false);
                        webpg.public_scope.search(webpg.public_scope.currentPage);
                        webpg.public_scope.$apply();
                        webpg.jq("#delsig-confirm").dialog("close");
                    }
                }, {
                    'text': _("Cancel"),
                    'click': function() {
                        webpg.jq("#delsig-confirm").dialog("close");
                    }
                }
            ]);
            webpg.jq("#delsig-confirm").dialog('open');
          });
        webpg.jq("#delsig-confirm").dialog({
            'resizable': true,
            'height': 200,
            'modal': true,
            'autoOpen': false,
            'buttons': [
                {
                    'text': _('Delete this Signature') + '?',
                    'click': function() {
                        webpg.jq(this).dialog('close');
                    }
                }, {
                    'text': _("Cancel"),
                    'click': function() {
                        webpg.jq(this).dialog('close');
                    }
                }
            ]
        });
      }
    }
  })
  .controller('keylistCtrl', ['$scope', '$filter', function($scope, $filter) {
    if ($scope.type === 'private') {
      $scope.ktype = 'private';
      $scope.sortingOrder = ['default', 'name', 'email', 'id'];
      webpg.private_scope = $scope;
    } else if ($scope.type === 'public') {
      $scope.ktype = 'public';
      $scope.sortingOrder = ['name', 'email', 'id'];
      webpg.public_scope = $scope;
      webpg.public_scope.currentItem = 0;
    }

//    $scope.public_list = Object.keys(webpg.public_keys);

    $scope.reverse = false;
    $scope.filteredItems = [];
    $scope.groupedItems = [];
    $scope.itemsPerPage = 16;
    $scope.pagedItems = [];
    $scope.currentPage = 0;

    var searchMatch = function (haystack, needle) {
      if (!needle) {
        return true;
      }
      return haystack.toLowerCase().indexOf(needle.toLowerCase()) !== -1;
    };

    // init the filtered items
    $scope.search = function (page) {
      var array = [],
          key,
          tkey;

      if ($scope.ktype === 'private') {
        for(key in webpg.secret_keys) {
          array.push(webpg.secret_keys[key]);
        }
      } else {
        for(key in webpg.public_keys) {
          array.push(webpg.public_keys[key]);
        }
      }

      $scope.filteredItems = $filter('filter')(array, function (item) {
        if (searchMatch(JSON.stringify(item).replace(/\"/g, ""), $scope.query))
          return true;
        return false;
      });

      // take care of the sorting order
      if ($scope.sortingOrder !== '') {
        $scope.filteredItems = $filter('orderBy')($scope.filteredItems, $scope.sortingOrder, $scope.reverse);
      }

      $scope.currentPage = page || 0;
      // now group by pages
      $scope.groupToPages();
    };

    // calculate page in place
    $scope.groupToPages = function () {
      $scope.pagedItems = [];

      for (var i = 0; i < $scope.filteredItems.length; i++) {
        if (i % $scope.itemsPerPage === 0) {
          $scope.pagedItems[Math.floor(i / $scope.itemsPerPage)] = [ $scope.filteredItems[i] ];
        } else {
          $scope.pagedItems[Math.floor(i / $scope.itemsPerPage)].push($scope.filteredItems[i]);
        }
      }
    };

    $scope.range = function (start, end) {
      var ret = [];
      if (!end) {
        end = start;
        start = 0;
      }
      for (var i = start; i < end; i++) {
        ret.push(i);
      }
      return ret;
    };

    $scope.prevPage = function () {
      if ($scope.currentPage > 0) {
        $scope.currentPage--;
      }
    };

    $scope.nextPage = function () {
      if ($scope.currentPage < $scope.pagedItems.length - 1) {
        $scope.currentPage++;
      }
    };

    $scope.setPage = function () {
      $scope.currentPage = this.n;
    };

    // process the data for display
    $scope.search();

    // change sorting order
    $scope.sort_by = function(newSortingOrder) {
      if ($scope.sortingOrder == newSortingOrder)
        $scope.reverse = !$scope.reverse;

      $scope.sortingOrder = newSortingOrder;
    };
  }])
  .filter('date', function() {
    return function(date) {
      var _ = webpg.utils.i18n.gettext;
      if (date === "0")
        return _('Never');

      var d = new Date(parseInt(date, 10) * 1000).toJSON();
      if (d)
        return d.substring(0, 10);
      else
        return date;
    };
  })
//  .filter('gettext', function() {
//    return function(string) {
//      return webpg.utils.i18n.gettext(string);
//    };
//  })
  .filter('algorithm_abv', function() {
    return function(algo) {
      if (algo === "RSA" || algo == "DSA")
        return algo.substr(0, 1);
      else
        return "g";
    };
  })
  .filter('flags_list', function() {
    return function(skey) {
      var _ = webpg.utils.i18n.gettext,
          flags = [],
          flag;

      if (skey.can_sign)
        flags.push(_("Sign"));
      if (skey.can_encrypt)
        flags.push(_("Encrypt"));
      if (skey.can_authenticate)
        flags.push(_("Authenticate"));
      if (skey.can_certify)
        flags.push(_("Certify"));

      return flags.toString().replace(/\,/g, ", ");
    };
  });
