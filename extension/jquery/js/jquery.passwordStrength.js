/*
    Copyright 2010 Kyle L. Huff - CURE|THE|ITCH
*/
jQuery.fn.passwordStrength = function(options) {
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

    $(this).after("<span style=\"width: 30%; height: 15px; display: inline-block; padding-left: 0.9em;\"><span id=\"passwordStrength-text\"> </span><span id=\"passwordStrength-meter\"> </span></span>");

    /* Observe Key Up event display password Strength Result */
    $(this).live('keyup', function() {
        var pass = $.trim($(this).val());
        $(this).removeClass('input-error');
        if (pass_repeat) {
            if ($(pass_repeat).val().length > 0){
                $(pass_repeat)[0].value = '';
                $(pass_repeat).next().html("&nbsp;");
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
                $(pass_repeat).next().html("&nbsp;");
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

        $(this).next().find("#passwordStrength-text").html(result).css(text_css);
        $(this).next().find("#passwordStrength-meter").html(result).css(meter_css);
    });

    if ($(pass_repeat)) {
        $(pass_repeat).after("<span style=\"display: inline-block; width: 30%; padding-left: 1em; font-size: 0.8em\"> </span>");
        $(pass_repeat).live('keyup', function() {
            var pass = $.trim($(element).val());
            var rpass = $.trim($(pass_repeat).val());
            if ($(element).next().find("#passwordStrength-text").html() == "Passphrases do not match") {
                $(element).trigger('keyup');
            }
            if (pass) {
                if (pass != rpass) {
                    $(pass_repeat).next().html("Passphrases do not match");
                } else {
                    $(pass_repeat).next().html("<img style=\"display:inline;float: left; top: 4px; position: relative; height:18px;\" src=\"images/check.png\"/>");
                }
            }
        });
    }

    return this;
};
