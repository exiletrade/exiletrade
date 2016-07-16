var itemutil = (function (util) {

  function modToDisplay(value, mod) {
  	if (typeof value === 'number') {
  		mod = mod.replace('#', value);
  	} else if (typeof value === "object") {
  		var valstr = value.min + '-' + value.max + ' (' + value.avg + ')';
  		mod = mod.replace('#-#', valstr);
  	} else if (typeof value === "boolean") {
  		mod = mod;
  	} else {
  		util.out("Mod value is neither a number or an object, maybe ExileTools has a recent change? mod = " +
  		mod + ", value = " + value, 'error');
  	}
  	return mod;
  }

  /*
  * Add custom fields to the item object
  * */
  function addCustomFields(item) {
    if (item.mods) {
      createForgottenMods(item);
    }
    if (item.mods) {
      createImplicitMods(item);
    }
    if (item.mods) {
      createCraftedMods(item);
    }
    if (item.mods) {
      createEnchantMods(item);
    }
    if (item.shop) {
      var added = new Date(item.shop.added);
      var updated = new Date(item.shop.updated);
      var modified = new Date(item.shop.modified);
      item.shop.addedHuman = util.prettyDate(added);
      item.shop.updatedHuman = util.prettyDate(updated);
      item.shop.modifiedHuman = util.prettyDate(modified);
    }
  }

  function createForgottenMods(item) {
    var itemTypeKey = util.firstKey(item.mods);
    var explicits = item.mods[itemTypeKey].explicit;
    var forgottenMods = $.map(explicits, function (propertyValue, modKey) {
      // for mods that have ranged values like 'Adds #-# Physical Damage', we need to sort on avg field
      var keyExtraSuffix = (typeof propertyValue === "object" && propertyValue.avg) ? ".avg" : "";
      return {
        display: modToDisplay(propertyValue, modKey),
        key: 'mods.' + itemTypeKey + '.explicit.' + modKey + keyExtraSuffix,
        name: modKey,
        value: propertyValue,
        css: getModCssClasses(modKey)
      };
    });
    item.forgottenMods = forgottenMods;
    // we call on fm.js to do it's awesome work
    fm.fm_process(item);
  }

  function createImplicitMods(item) {
    var itemTypeKey = util.firstKey(item.mods);
    var implicits = item.mods[itemTypeKey].implicit;
    var implicitMods = $.map(implicits, function (propertyValue, modKey) {
      // for mods that have ranged values like 'Adds #-# Physical Damage', we need to sort on avg field
      var keyExtraSuffix = (typeof propertyValue === "object" && propertyValue.avg) ? ".avg" : "";
      return {
        display: modToDisplay(propertyValue, modKey),
        key: 'mods.' + itemTypeKey + '.implicit.' + modKey + keyExtraSuffix
      };
    });
    item.implicitMods = implicitMods;
  }

  function createEnchantMods(item) {
    var enchant = item.enchantMods;
    if (!enchant) {
      return;
    }
    var enchantMods = $.map(enchant, function (propertyValue, modKey) {
      return {
        display: modToDisplay(propertyValue, modKey),
        key: 'enchantMods.' + modKey
      };
    });
    item.enchantMods = enchantMods;
  }

  function createCraftedMods(item) {
    var itemTypeKey = util.firstKey(item.mods);
    var crafteds = item.mods[itemTypeKey].crafted;
    item.craftedMods = $.map(crafteds, function (propertyValue, modKey) {
      // for mods that have ranged values like 'Adds #-# Physical Damage', we need to sort on avg field
      var keyExtraSuffix = (typeof propertyValue === "object" && propertyValue.avg) ? ".avg" : "";
      return {
        display: modToDisplay(propertyValue, modKey),
        key: 'mods.' + itemTypeKey + '.crafted.' + modKey + keyExtraSuffix
      };
    });
  }

  /*
  * Get CSS Classes for element resistances
  * */
  function getModCssClasses(mod) {
    var css = "";
    if (mod.indexOf("Resistance") > -1) {
      if (mod.indexOf("Cold") > -1) {
        css = "mod-cold-res";
      }
      else if (mod.indexOf("Fire") > -1) {
        css = "mod-fire-res";
      }
      else if (mod.indexOf("Lightning") > -1) {
        css = "mod-lightning-res";
      }
      else if (mod.indexOf("Chaos") > -1) {
        css = "mod-chaos-res";
      }
    }
    if (mod.indexOf("Damage") > -1) {
      if (mod.indexOf("Cold") > -1) {
        css = "mod-cold-dmg";
      }
      else if (mod.indexOf("Fire") > -1) {
        css = "mod-fire-dmg";
      }
      else if (mod.indexOf("Lightning") > -1) {
        css = "mod-lightning-dmg";
      }
      else if (mod.indexOf("Chaos") > -1) {
        css = "mod-chaos-dmg";
      }
    }
    else if (mod.indexOf("to maximum Life") > -1) {
      css = "mod-life";
    }
    else if (mod.indexOf("to maximum Mana") > -1) {
      css = "mod-mana";
    }
    return css;
  }

  /*
   * Get CSS Classes for item sockets
   */
  function getSocketClasses(x) {
    if (typeof x == "undefined") {
      return [];
    }
    var sockets = [];
    var colors = x.split('-').join('').split('');
    for (var i = 0; i < colors.length; i++) {
      var cssClasses;
      switch (i) {
        case 0 :
          cssClasses = 'socketLeft';
          break;
        case 1 :
          cssClasses = 'socketRight';
          break;
        case 2 :
          cssClasses = 'socketRight middle';
          break;
        case 3 :
          cssClasses = 'socketLeft middle';
          break;
        case 4 :
          cssClasses = 'socketLeft bottom';
          break;
        case 5 :
          cssClasses = 'socketRight bottom';
          break;
      }
      switch (colors[i]) {
        case 'W' :
          cssClasses += ' socketWhite';
          break;
        case 'R' :
          cssClasses += ' socketRed';
          break;
        case 'G' :
          cssClasses += ' socketGreen';
          break;
        case 'B' :
          cssClasses += ' socketBlue';
          break;
      }
      sockets[i] = cssClasses;
    }
    return sockets;
  };

  /*
  * Get CSS classes for item socket links
  * */
  function getSocketLinkClasses(x) {
    if (typeof x == "undefined") {
      return [];
    }
    var groups = x.split('-');
    var pointer = 0;
    var pos = [];

    for (var i = 0; i < groups.length; i++) {
      var count = groups[i].length - 1;

      try {
        pointer += groups[i - 1].length;
      } catch (err) {
      }

      if (count > 0) {
        for (var j = 0; j < count; j++) {
          var cssClasses;
          switch (pointer + j) {
            case 0 :
              cssClasses = 'socketLinkCenter';
              break;
            case 1 :
              cssClasses = 'socketLinkRight';
              break;
            case 2 :
              cssClasses = 'socketLinkCenter middle';
              break;
            case 3 :
              cssClasses = 'socketLinkLeft middle';
              break;
            case 4 :
              cssClasses = 'socketLinkCenter bottom';
              break;
          }
          pos.push(cssClasses);
        }
      }
    }
    return pos;
  };

  function cleanCurrency(str) {
    if (typeof str === 'undefined') {
      return;
    }

    var validTerms = [
      "perandus",     //0
      "regal", 		//1
      "augmentation",	//2
      "wisdom", 		//3
      "portal", 		//4
      "alchemy", 		//5
      "mirror", 		//6
      "blessed", 		//7
      "whetstone",	//8
      "scrap", 		//9
      "vaal",			//10
      "bauble", 		//11
      "chaos", 		//12
      "chisel", 		//13
      "chromatic",	//14
      "divine", 		//15
      "exalted", 		//16
      "transmutation",//17
      "scouring",		//18
      "regret",		//19
      "fusing", 		//20
      "prism", 		//21
      "jeweller",		//22
      "alteration", 	//23
      "chance",		//24
      "unknown",		//25
      "silver",	    //26
      "prophecy"	    //26
    ];

    str =  str.replace(/[^\w\s]/gi, '').replace(/[0-9]/g, '').toLowerCase();

    var currencyMap = new Map([
      ["unknown shekel", validTerms[0]],
      ["unknown shekels", validTerms[0]],
      ["unknown pc", validTerms[0]],
      ["unknown p", validTerms[0]],
      ["unknown perandus", validTerms[0]],
      ["unknown perandus coin", validTerms[0]],
      ["unknown perandus coins", validTerms[0]],
      ["unknown peranduscoins", validTerms[0]],
      ["unknown pcoins", validTerms[0]],
      ["unknown pcoin", validTerms[0]],
      ["unknown per", validTerms[0]],
      ["unknown reg", validTerms[1]],
      ["unknown exa", validTerms[16]],
      ["unknown fuse", validTerms[20]],
      ["unknown alt", validTerms[23]],
      ["unknown aug", validTerms[2]],
      ["unknown jewel", validTerms[22]],
      ["jewellers", validTerms[22]],
      ["jewellers orb", validTerms[22]],
      ["unknown cartographer", validTerms[13]],
      ["unknown scour", validTerms[18]],
      ["unknown gemcutter", validTerms[21]],
      ["unknown transmute", validTerms[17]],
      ["unknown x", validTerms[16]],
      ["unknown chaoss", validTerms[12]],
      ["unknown caos", validTerms[12]],
      ["unknown chao", validTerms[12]],
      ["unknown alch", validTerms[5]],
      ["perandus coin", validTerms[0]],
      ["silver coin", validTerms[26]],
      ["unknown silver coin", validTerms[26]],
      ["unknown sc", validTerms[26]],
      ["unknown silver", validTerms[26]],
      ["unknown silvercoin", validTerms[26]],
      ["unknown silvercoins", validTerms[26]],
      ["unknown silver coins", validTerms[26]]
    ]);

    var result = currencyMap.get(str);
    if (!result) {result = str;}

    return result;
  };

  function copyWhisperToClipboard(item) {
    var message = item._source.shop.defaultMessage;
    var seller = item._source.shop.lastCharacterName;
    var itemName = item._source.info.fullName;
    var league = item._source.attributes.league;
    var stashTab = item._source.shop.stash.stashName;
    var x = item._source.shop.stash.xLocation;
    var y = item._source.shop.stash.yLocation;

    if (message === undefined) {
      message = '@' + seller + " Hi, I'd like to buy your " + itemName + ' in ' + league + ' (Stash-Tab: "' +
        stashTab + '" [x' + x + ',y' + y + '])' + ', my offer is : ';
    } else {
      //removing the "Unknown" tag from currency
      var n = message.indexOf('Unknown (');
      if (n > -1) {
        message = message.replace('Unknown ', '');
      }
    }
    return message;
  };

  return {
    addCustomFields: addCustomFields,
    getSocketClasses: getSocketClasses,
    getSocketLinkClasses: getSocketLinkClasses,
    cleanCurrency: cleanCurrency,
    copyWhisperToClipboard: copyWhisperToClipboard
  }
}(util));
