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

  return {
    addCustomFields: addCustomFields,
    getSocketClasses: getSocketClasses,
    getSocketLinkClasses: getSocketLinkClasses
  }
}(util));
