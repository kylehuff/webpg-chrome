#!/bin/bash

# Creates required locale files for the webpg extension project (firefox/chrome)
# Requirements:
#   pybabel
#   gettext

BUGSADDR=webpg-translations@webpg.org
ORGANIZATION=CURETHEITCH
AUTHOR="Kyle L. Huff"
SRCDIR=extension
PODIR=po
POTFILE=webpg.pot
FFEXT=false
if [ -a "chrome.manifest" ]; then
    FFEXT=true
fi

# Obtain the project version number and set the locale directory
if ${FFEXT:=true}; then
    PROJECT=webpg-firefox
    LOCALEDIR="locale"
    VERSION=`sed -n 's/.*em\:version\=\"\(.*\)\"/\1/p' install.rdf`
else
    PROJECT=webpg-chrome
    LOCALEDIR="extension/_locales"
    VERSION=`sed -n 's/.*\"version\"\:.\"\(.*\)\",.*/\1/p' extension/manifest.json`
fi

LOCALES=('ar' 'bg' 'ca' 'ca' 'cs' 'da' 'de' 'el' 'en' 'en_GB' 'en_US' 'es' 'es_419' 'et' 'fi' 'fil' 'fr' 'he' 'hi' 'hr' 'hu' 'id' 'it' 'ja' 'ko' 'lt' 'lv' 'nl' 'np' 'pl' 'pt_BR' 'pt_PT' 'ro' 'ru' 'sk' 'sl' 'sr' 'sv' 'th' 'tr' 'uk' 'vi' 'zh_CN' 'zh_TW')

# Extract the translatable strings from the source files
pybabel extract -F webpg-babel.cfg --copyright-holder=$ORGANIZATION --msgid-bugs-address=$BUGSADDR --project=$PROJECT --version=$VERSION $SRCDIR > $PODIR/$POTFILE

if ${FFEXT:=true}; then
    # Extract the translatable strings from the XUL files
    gawk 'match($0, /label=\"&(.*)\;\"/, a) {if (!x[a[1]]++) printf("#: %s:%d\nmsgid \"%s\"\nmsgstr \"\"\n\n", FILENAME, NR, a[1])}' extension/XULContent/firefoxOverlay.xul extension/XULContent/options.xul extension/XULContent/thunderbird/composeOverlay.xul extension/XULContent/thunderbird/thunderbirdOverlay.xul >> $PODIR/$POTFILE
else
    # Extract the translatable strings from the chrome manifest.json file
    gawk 'match($0, /__MSG_(.*)__/, a) {printf("#: %s:%d\nmsgid \"%s\"\nmsgstr \"\"\n\n", FILENAME, NR, a[1])}' extension/manifest.json >> $PODIR/$POTFILE
fi

# Iterate through the configured locales and create the necessary files
for locale in "${LOCALES[@]}"
do
    if [ -f $PODIR/$locale.po ]; then
        echo "Updating locale: $locale"
        msgmerge --update --no-fuzzy-matching --backup=off $PODIR/$locale.po $PODIR/$POTFILE
    else
        echo "Creating new locale: $locale"
        msginit --no-fuzzy-matching --no-translator -l $locale -i $PODIR/$POTFILE -o $PODIR/$locale.po
    fi
done

if ${FFEXT:=true}; then
    # Create the firefox i18n locale files in DTN format
    for locale in "${LOCALES[@]}"
    do
        if [ -f $PODIR/$locale.po ]; then
            if [ ! -d "$LOCALEDIR/$locale" ]; then
                mkdir -p $LOCALEDIR/$locale
            fi
            echo "Creating $LOCALEDIR/$locale/webpg.dtd"
            gawk 'BEGIN{ FS="\n"; RS="";} match($0, /msgid.*(\"(.*)\")$/, b) && match(b[0], /msgid.*(\"(.*)\")(\n)?msgstr.*(\".*\")(\n)?/, a) { if (a[2]!="") printf("<!ENTITY %s %s>\n", gensub(/[^\"|^a-Z|^0-9|^\.]/, "_", "g", a[2]), a[4]) }' $PODIR/$locale.po > $LOCALEDIR/$locale/webpg.dtd
            echo "Creating $LOCALEDIR/$locale/webpg.properties"
            gawk 'BEGIN{ FS="\n"; RS="";} match($0, /msgid.*(\"(.*)\")$/, b) && match(b[0], /msgid.*(\"(.*)\")(\n)?msgstr.*(\"(.*)\")(\n)?/, a) { if (a[2]!="") printf("%s=%s\n", gensub(/[^\"|^a-Z|^0-9|^\.]/, "_", "g", a[2]), a[5]) }' $PODIR/$locale.po > $LOCALEDIR/$locale/webpg.properties
        fi
    done
else
    # Create the chrome i18n locale files in JSON format [i.e. _locales/en_US/messages.json]
    for locale in "${LOCALES[@]}"
    do
        if [ -f $PODIR/$locale.po ]; then
            if [ ! -d "$LOCALEDIR/$locale" ]; then
                mkdir -p $LOCALEDIR/$locale
            fi
            echo "Creating $LOCALEDIR/$locale/messages.json"
            echo -e "{" > $LOCALEDIR/$locale/messages.json
            gawk 'BEGIN{ FS="\n"; RS=""; } match($0, /msgid.*(\"(.*)\")$/, b) && match(b[0], /msgid.*(\"(.*)\")(\n)?msgstr.*(\"(.*)\")(\n)?/, a) { if (a[2]!="") printf("\t\"%s\": {\n\t\t\"message\": %s\n\t},\n", gensub(/[^\"|^a-Z|^0-9]/, "_", "g", a[2]), a[4]) }' $PODIR/$locale.po >> $LOCALEDIR/$locale/messages.json
            echo -e "\t\"empty_end\": {\n\t\t\"message\": \"N/A\",\n\t\t\"description\": \"Just an empty item to mark our end; No need to translate.\"\n\t}\n}" >> $LOCALEDIR/$locale/messages.json
        fi
    done
fi

# Create the file POTFILES.in
echo "Creating POTFILES.in"
echo -e "# List of source files containing translatable strings." > $PODIR/POTFILES.in
gawk 'BEGIN{ FS="\n"; RS="";} match($1, /#: (.*[:])/, a) split(a[1], x, ":") {print x[1]}' $PODIR/$POTFILE | awk '!($0 in x){x[$0];print}' | sort >> $PODIR/POTFILES.in
echo ".. done."

