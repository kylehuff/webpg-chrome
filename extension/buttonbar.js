/* <![CDATA[ */
if (typeof(webpg)=='undefined') { webpg = {}; }
// Enforce jQuery.noConflict if not already performed
if (typeof(jQuery)!='undefined') webpg.jq = jQuery.noConflict(true);

webpg.jq(function() {
    var _ = webpg.utils.i18n.gettext;
    var href = window.location.href;
    var page = (href.indexOf('key_manager.html') > 0) ? 'keymanager' :
               (href.indexOf('options.html') > 0) ? 'options' :
               (href.indexOf('about.html') > 0) ? 'about' :
               (href.indexOf('userdocs.html') > 0) ? 'docs' : '_unknown';

    webpg.jq('#genkeybutton')
      .button({
        'icons': {
          'primary':'ui-icon-key'
        },
      })
      .val((page === 'keymanager') ? _("Generate New Key") : _("Key Manager"))
      .click(function(e) {
        if (page !== 'keymanager') {
          window.location = webpg.utils.resourcePath + 'key_manager.html';
        } else {
          webpg.jq("#genkey-dialog").dialog({
            'resizable': true,
            'minHeight': 300,
            'width': 630,
            'modal': true,
            "buttons": [{
              'text': _("Create"),
              'click': function() {
                var form = webpg.jq("#genkey-form")[0];
                webpg.jq(form).parent().before("<div id=\"genkey-status\"> </div>");
                var error = "";
                if (!form.uid_0_name.value){
                  error += _("Name Required") + "<br>";
                  webpg.jq(form.uid_0_name).addClass("ui-state-error");
                }
                else if (form.uid_0_name.value.length < 5){
                  error += _("UID Names must be at least 5 characters") + "<br>";
                  webpg.jq(form.uid_0_name).addClass("ui-state-error");
                }
                else if (!isNaN(form.uid_0_name.value[0])){
                  error += _("UID Names cannot begin with a number") + "<br>";
                  webpg.jq(form.uid_0_name).addClass("ui-state-error");
                } else {
                  webpg.jq(form.uid_0_name).removeClass("ui-state-error");
                }
                if (form.uid_0_email.value && !webpg.utils.
                  isValidEmailAddress(form.uid_0_email.value)){
                  error += _("Not a valid email address") + "<br>";
                  webpg.jq(form.uid_0_email).addClass("ui-state-error");
                } else {
                  webpg.jq(form.uid_0_email).removeClass("ui-state-error");
                }
                if (form.passphrase.value != form.pass_repeat.value){
                  webpg.jq(form.passphrase).addClass("ui-state-error");
                  webpg.jq(form.pass_repeat).addClass("ui-state-error");
                  webpg.jq(form.passphrase).next()
                    .find("#passwordStrength-text")
                    .html(_("Passphrases do not match"))
                    .css({"color": "#f00"});
                  error += _("Passphrases do not match") + "<br>";
                } else {
                  webpg.jq(form.passphrase).removeClass("ui-state-error");
                  webpg.jq(form.pass_repeat).removeClass("ui-state-error");
                }
                if (error.length) {
                  webpg.jq("#genkey-status").html(error)[0].style.display="block";
                  webpg.jq("#genkey-dialog").dialog("option", "minHeight", 350);
                  return false;
                }
                webpg.keymanager.genkey_waiting = true;
                if (webpg.utils.detectedBrowser.product === "chrome") {
                  chrome.extension.onConnect.addListener(function(port) {
                    port.onMessage.addListener(webpg.keymanager.progressMsg);
                  });
                }
                webpg.jq("#genkey-form").find(".open").trigger("click");
                webpg.jq("#genkey-dialog").dialog("option", "minHeight", 300);
                webpg.jq("#genkey-status").html(error)[0].style.display="block";
                webpg.jq("#genkey-status").html(_("Building key, please wait"));
                webpg.jq("#genkey-status").after("<div id='genkey-status_detail' style=\"font-size: 12px; color:#fff;padding: 20px;\">" + _("This may take a long time (5 minutes or more) to complete") + ". " + _("Please be patient while the key is created") + ". " + _("It is safe to close this window") + ", " + _("key generation will continue in the background") + ".<br><br><div id='genkey_progress' style='height:auto;display:block;'></div></div>");
                webpg.jq(form)[0].style.display = "none";
                webpg.jq("#genkey-dialog")[0].style.height = "20";
                webpg.jq("#genkey-dialog")[0].style.display = "none";
                response = webpg.plugin.gpgGenKey(form.publicKey_algo.value,
                  form.publicKey_size.value,
                  form.subKey_algo.value,
                  form.subKey_size.value,
                  form.uid_0_name.value,
                  form.uid_0_comment.value,
                  form.uid_0_email.value,
                  form.key_expire.value,
                  form.passphrase.value
                );
                if (response === "queued") {
                  webpg.jq("#genkey-dialog").dialog("option", "buttons", [{ 
                    'text': _("Close"),
                    'click': function() {
                      webpg.jq("#genkey-dialog").dialog("close");
                    }
                  }]);
                }
              }
            }, {
              'text': _("Cancel"),
              'click': function() {
                webpg.jq("#genkey-dialog").dialog("destroy");
              }
            }]
          });

          webpg.jq("#genkey-form").children('input').removeClass('input-error');
          webpg.jq("#genkey-form")[0].reset();
          webpg.jq('.key-algo').each(function(){
            //webpg.jq(this)[0].options.selectedIndex = webpg.jq(this)[0].options.length - 1;
            if (webpg.jq(this).parent().next().find('.key-size').length) {
              webpg.jq(this).parent().next().find('.key-size')[0].children[0].disabled = true;
              webpg.jq(webpg.jq(this).parent().next().find('.key-size')[0].children[0]).hide();
            }
          }).change(function(){
            if (webpg.jq(this)[0].options.selectedIndex === 0){
              // DSA Selected
              webpg.jq(this).parent().next().find('.key-size')[0].children[0].disabled = false;
              webpg.jq(webpg.jq(this).parent().next().find('.key-size')[0].children[0]).show();
              webpg.jq(this).parent().next().find('.key-size')[0].children[4].disabled = true;
              webpg.jq(webpg.jq(this).parent().next().find('.key-size')[0].children[4]).hide();
              webpg.jq(this).parent().next().find('.key-size')[0].options.selectedIndex = 2;
            } else if(webpg.jq(this)[0].options.selectedIndex === 1){
              // RSA Selected
              webpg.jq(this).parent().next().find('.key-size')[0].children[0].disabled = true;
              webpg.jq(webpg.jq(this).parent().next().find('.key-size')[0].children[0]).hide();
              webpg.jq(this).parent().next().find('.key-size')[0].children[4].disabled = false;
              webpg.jq(webpg.jq(this).parent().next().find('.key-size')[0].children[4]).show();
              webpg.jq(this).parent().next().find('.key-size')[0].options.selectedIndex = 2;
            } else {
              // Elgamal Selected
              webpg.jq(this).parent().next().find('.key-size')[0].children[0].disabled = false;
              webpg.jq(webpg.jq(this).parent().next().find('.key-size')[0].children[0]).show();
              webpg.jq(this).parent().next().find('.key-size')[0].children[4].disabled = false;
              webpg.jq(webpg.jq(this).parent().next().find('.key-size')[0].children[4]).show();
              webpg.jq(this).parent().next().find('.key-size')[0].options.selectedIndex = 2;
            }
          });
          webpg.jq("#genkey-form").find(".open").trigger("click");
          webpg.jq('.passphrase').passwordStrength("#pass_repeat");
        }
        webpg.jq(this).blur();
      });

    webpg.jq('#importbutton')
      .button({
        'icons': {
          'primary':'ui-icon-note'
        },
      })
      .val(_("Import from File"))
      .click(function(e) {
        webpg.jq("#importkey-dialog").dialog({
          'resizable': true,
          'height': 230,
          'width': 550,
          'modal': true,
          'buttons': [{
            'text': _("Import"),
            'click': function() {
              //console.log(params, webpg.jq(this).find("#importkey_name")[0].value);
              var f = webpg.jq(this).find("#importkey_name")[0].files.item(0);
              var reader = new FileReader();
              var attempt = 0;
              reader.onload = (function(theFile) {
                return function(e) {
                  if (e.target.result.substr(0,15) != "-----BEGIN PGP")
                    e.target.error = true;
                  if (e.target.error) {
                    webpg.jq("#import-list").html("<ul><li><strong><span class='error-text' style='padding-right:12px;'>" + 
                      _("Error") + ":</span>" + 
                      _("There was an error parsing this PGP file") + 
                      "</strong></li></ul>"
                    );
                    return false;
                  }
                  var result = {'error': true};
                  result = webpg.plugin.gpgImportKey(e.target.result);
                  if (result.considered < 1) {
                    console.log(result);
                    msg = ["<ul><li><strong><span class='error-text' style='padding-right:12px;'>", 
                      _("Error"), ":</span>", _("There was an error importing any keys in this file"),
                      "</strong></li>"];
                    msg.push("</ul>");
                    webpg.jq("#import-list").html(msg.join(''));
                  } else {
                    webpg.jq("#importkey_name")[0].value = '';
                    webpg.jq("#importkey-dialog").dialog("destroy");
                    webpg.private_scope.search();
                    webpg.private_scope.$apply();
                    webpg.public_scope.search();
                    webpg.public_scope.$apply();
                  }
                };
              })(f);
              reader.readAsBinaryString(f);
            },
            'id': 'importkey_button'
          }, {
            'text': _("Cancel"),
            'click': function() {
              webpg.jq(this).find("#importkey_name")[0].value = "";
              webpg.jq("#importkey-dialog").dialog("destroy");
            }
          }
        ]})
        .parent()
          .animate({"opacity": 1.0}, 1, function() {
            webpg.jq("#importkey_button").attr("disabled", true);
            webpg.jq(this).find("#import-list").html("<ul><li><strong>" + 
              _("Please use the button above to open a key file (.asc/.txt)") + 
              "</strong></li></ul>"
            );
            webpg.jq(this).find("#importkey_name")[0].addEventListener('change', function(e) {
              var files = e.target.files; // FileList object

              // files is a FileList of File objects. List some properties.
              var f = files[0];
              if (files.length === 1) {
                msg = ['<li>', (f.type || 'n/a'), ' - ', f.size, ' bytes</li>'];
                webpg.jq("#importkey_button").attr("disabled", false);
              }
              webpg.jq(this).parent().find('#import-list').html('<ul>' + msg.join('') + '</ul>');
            }, false);
          });
        webpg.jq(this).blur();
      });

    webpg.jq('#optionsbutton')
      .button({
        'icons': {
          'primary':'ui-icon-wrench'
        },
      })
      .val(_("Options"))
      .click(function(e) {
        window.location = webpg.utils.resourcePath + "options.html?auto_init=true";
        webpg.jq(this).blur();
      });

    webpg.jq('#aboutbutton')
      .button({
        'icons': {
          'primary':'ui-icon-info'
        },
      })
      .val(_("About WebPG"))
      .click(function(e) {
        window.location = webpg.utils.resourcePath + "about.html?auto_init=true";
        webpg.jq(this).blur();
      });

    webpg.jq('#docsbutton')
      .button({
        'icons': {
          'primary':'ui-icon-help'
        },
      })
      .val(_("User Guide"))
      .click(function(e) {
        window.location = webpg.utils.resourcePath + "userdocs.html";
        webpg.jq(this).blur();
      });

    webpg.jq("#webpg-buttonbar")
      .mouseleave(
        function(e) {
          webpg.jq(this)
            .find(".ui-button-text")
              .text("")
              .css({'padding-right': '0'});
        }
      )
      .find("button")
        .mouseenter(
          function(e) {
            webpg.jq(this)
              .find(".ui-button-text")
                .text(this.value)
                .css({'padding-right': '6px'});
          }
        );

    // Hide the currently active page-button
    webpg.jq("#" + page + "button")
      .hide();
});
/* ]]> */
