/*
    Copyright 2010 Kyle L. Huff - CURE|THE|ITCH
*/
if (typeof(webpg)=='undefined') { webpg = {}; }
if (typeof(jQuery)!='undefined') { webpg.jq = jQuery.noConflict(true); }

webpg.jq.fn.passwordStrength = function(options) {
    var element = this;
    var pass_repeat = options;

    var text_css = {
        'font-size': '0.8em',
        'color': '#F00',
        'line-height': '2px',
        'float': 'left',
        'position': 'absolute'
    };
    var meter_css = {
        'border': '1px solid white',
        'font-size': '1px',
        'height': '8px',
        'width': '0px',
        'float': 'left',
        'margin-top': '10px',
        'position': 'relative',
        'z-index': '-1',
        'visibility': 'hidden'
    }

    webpg.jq(this).after("<span style=\"width: 30%; height: 15px; display: inline-block; padding-left: 0.9em;\"><span id=\"passwordStrength-text\"> </span><span id=\"passwordStrength-meter\"> </span></span>");

    /* Observe Key Up event display password Strength Result */
    webpg.jq(this).on('keyup', function() {
        var pass = webpg.jq.trim(webpg.jq(this).val());
        webpg.jq(this).removeClass('input-error');
        if (pass_repeat) {
            if (webpg.jq(pass_repeat).val().length > 0){
                webpg.jq(pass_repeat)[0].value = '';
                webpg.jq(pass_repeat).next().html("&nbsp;");
            }
        }
        

        var numericTest = /[0-9]/;
        var lowerCaseAlphaTest = /[a-z]/;
        var upperCaseAlphaTest = /[A-Z]/;
        var symbolsTest = /[.,!@#$%^&*()}{:<>|]/;
        var score = 0;
        var result;

        if (numericTest.test(pass)) {
            score++;
        }
        if (lowerCaseAlphaTest.test(pass)) {
            score++;
        }
        if (upperCaseAlphaTest.test(pass)) {
            score + 3;
        }
        if (symbolsTest.test(pass)) {
            score++;
        }

        if (pass.length == 0) {
            result = "";
            meter_css['width'] = "0px"
            if (pass_repeat) {
                webpg.jq(pass_repeat).next().html("&nbsp;");
            }
        }
        else if (score * pass.length < 8) {
            result = "Very Weak";
            text_css['color'] = "#f00";
            meter_css['width'] = "5%";
            meter_css['background-color'] = "#f00";
            meter_css['visibility'] = "visible";
        }
        else if (score * pass.length < 16) {
            result = "Weak";
            text_css['color'] = "#c06";
            meter_css['width'] = "25%";
            meter_css['background-color'] = "#c06";
            meter_css['visibility'] = "visible";
        }
        else if (score * pass.length < 24) {
            result = "Average";
            text_css['color'] = "#f60";
            meter_css['width'] = "50%";
            meter_css['background-color'] = "#f60";
            meter_css['visibility'] = "visible";
        }
        else if (score * pass.length < 40) {
            result = "Strong";
            text_css['color'] = "#3c0";
            meter_css['width'] = "75%";
            meter_css['background-color'] = "#3c0";
            meter_css['visibility'] = "visible";
        }
        else  {
            result = "Very Strong";
            text_css['color'] = "#3f0";
            meter_css['width'] = "95%";
            meter_css['background-color'] = "#3f0";
            meter_css['visibility'] = "visible";
        }

        webpg.jq(this).next().find("#passwordStrength-text").html(result).css(text_css);
        webpg.jq(this).next().find("#passwordStrength-meter").html(result).css(meter_css);
    });

    if (webpg.jq(pass_repeat)) {
        webpg.jq(pass_repeat).after("<span style=\"display: inline-block; width: 30%; padding-left: 1em; font-size: 0.8em\"> </span>");
        webpg.jq(pass_repeat).on('keyup', function() {
            var pass = webpg.jq.trim(webpg.jq(element).val());
            var rpass = webpg.jq.trim(webpg.jq(pass_repeat).val());
            if (webpg.jq(element).next().find("#passwordStrength-text").html() == "Passphrases do not match") {
                webpg.jq(element).trigger('keyup');
            }
            if (pass) {
                if (pass != rpass) {
                    webpg.jq(pass_repeat).next().html("Passphrases do not match");
                } else {
                    webpg.jq(pass_repeat).next().html("<img style=\"display:inline;float: left; top: 4px; position: relative; height:18px;\" src=\"skin/images/check.png\"/>");
                }
            }
        });
    }

    return this;
};
