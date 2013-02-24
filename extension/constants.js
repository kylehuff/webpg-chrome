/* <![CDATA[ */
if (typeof(webpg)=='undefined') { webpg = {}; }

/*
    Class: webpg.constants
        Holds all of the contant variables required between pages
*/
webpg.constants = {

    debug: {
        LOG: true
    },

    /*
       Constants: ff_prefTypes - Mozilla preference value type
       
        webpg.constants.ff_prefTypes.string - A string value
        webpg.constants.ff_prefTypes.number - A number value
        webpg.constants.ff_prefTypes.boolean - A bool value
    */
    ff_prefTypes: {
        "string": 32, // PREF_STRING
        "number": 64, // PREF_INT
        "boolean": 128 // PREF_BOOL
    },

    /*
       Constants: overlayActions - Actions available to the overlay
       
        webpg.constants.overlayActions.SIGN - 'SIGN'
        webpg.constants.overlayActions.PSIGN - 'PLAINSIGN'
        webpg.constants.overlayActions.WSIGN - 'WRAPSIGN'
        webpg.constants.overlayActions.VERIF - 'VERIF'
        webpg.constants.overlayActions.CRYPT - 'CRYPT'
        webpg.constants.overlayActions.SYMCRYPT - 'SYMCRYPT'
        webpg.constants.overlayActions.CRYPTSIGN - 'CRYPTSIGN'
        webpg.constants.overlayActions.DECRYPT - 'DECRYPT'
        webpg.constants.overlayActions.IMPORT - 'IMPORT'
        webpg.constants.overlayActions.EXPORT - 'EXPORT'
        webpg.constants.overlayActions.MANAGER - 'MANAGER'
        webpg.constants.overlayActions.OPTS - 'OPTS'
        webpg.constants.overlayActions.EDITOR - 'EDITOR'
        webpg.constants.overlayActions.ABOUT - 'ABOUT'
    */
    overlayActions: {
        SIGN: 'SIGN',
        PSIGN: 'PLAINSIGN',
        WSIGN: 'WRAPSIGN',
        VERIF: 'VERIF',
        CRYPT: 'CRYPT',
        SYMCRYPT: 'SYMCRYPT',
        CRYPTSIGN: 'CRYPTSIGN',
        DECRYPT: 'DECRYPT',
        IMPORT: 'IMPORT',
        EXPORT: 'EXPORT',
        MANAGER: 'MANAGER',
        OPTS: 'OPTS',
        EDITOR: 'EDITOR',
        ABOUT: 'ABOUT',
    },

    /*
       Constants: PGPTags - Types of PGP start and end tags
       
        webpg.constants.PGPTags.PGP_DATA_BEGIN - The start of a PGP block
        webpg.constants.PGPTags.PGP_KEY_BEGIN - The start of a PGP Public Key block
        webpg.constants.PGPTags.PGP_KEY_END - The end of a PGP Public Key block
        webpg.constants.PGPTags.PGP_PKEY_BEGIN - The start of a PGP Private Key block
        webpg.constants.PGPTags.PGP_PKEY_END - The end of a PGP Private Key block
        webpg.constants.PGPTags.PGP_SIGNED_MSG_BEGIN - The start of a PGP Signed message block
        webpg.constants.PGPTags.PGP_SIGNATURE_BEGIN - The start of a PGP Signature block
        webpg.constants.PGPTags.PGP_SIGNATURE_END - The end of a PGP Signature block or Signed message block
        webpg.constants.PGPTags.PGP_ENCRYPTED_BEGIN - The start of a PGP Encrypted message block
        webpg.constants.PGPTags.PGP_ENCRYPTED_END - The end of a PGP Encrypted message block
    */
    PGPTags: {
        PGP_DATA_BEGIN: "-----BEGIN PGP",
	    PGP_KEY_BEGIN: "-----BEGIN PGP PUBLIC KEY BLOCK-----",
	    PGP_KEY_END: "-----END PGP PUBLIC KEY BLOCK-----",
	    PGP_PKEY_BEGIN: "-----BEGIN PGP PRIVATE KEY BLOCK-----",
	    PGP_PKEY_END: "-----END PGP PRIVATE KEY BLOCK-----",
	    PGP_SIGNED_MSG_BEGIN: "-----BEGIN PGP SIGNED MESSAGE-----",
	    PGP_SIGNATURE_BEGIN: "-----BEGIN PGP SIGNATURE-----",
	    PGP_SIGNATURE_END: "-----END PGP SIGNATURE-----",
	    PGP_ENCRYPTED_BEGIN: "-----BEGIN PGP MESSAGE-----",
	    PGP_ENCRYPTED_END: "-----END PGP MESSAGE-----"
    },

    /*
       Constants: PGPBlocks - Types of PGP blocks
       
        webpg.constants.PGPBlocks.PGP_KEY - A PGP Public Key
        webpg.constants.PGPBlocks.PGP_PKEY - A PGP Private Key
        webpg.constants.PGPBlocks.PGP_SIGNED_MSG - A PGP Signed message
        webpg.constants.PGPBlocks.PGP_SIGNATURE - A PGP Signature
        webpg.constants.PGPBlocks.PGP_ENCRYPTED - A PGP Encrypted message
    */
    PGPBlocks: {
        PGP_KEY: 1,
        PGP_PKEY: 2,
        PGP_SIGNED_MSG: 3,
        PGP_SIGNATURE: 4,
        PGP_ENCRYPTED: 5,
    },

    /*
       Constants: algoTypes - Types of key algorithms
       
        webpg.constants.algoTypes.PGP_KEY - A PGP Public Key
        webpg.constants.algoTypes.RSA - RSA algorithm
        webpg.constants.algoTypes.DSA - DSA algorithm
        webpg.constants.algoTypes.ELG-E - ElGamal algorithm
    */
    algoTypes: {
        "RSA": "R",
        "DSA": "D",
        "ELG-E": "g",
    }
}
/* ]]> */
