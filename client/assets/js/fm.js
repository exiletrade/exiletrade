
/*
 * Entry point, takes in items and adds
 */
function fm_process(item) {
	var rarity = item.attributes.rarity;
	if (rarity == "Magic" || rarity == "Rare") {
		fm_processExplicitMods(item);
	}
	//console.trace('running fm.js');
	return 'success';
}

function fm_processExplicitMods(item) {
	var name = item.info.fullName;
	//console.trace('name: ' + name);
	var forgottenMods = item.forgottenMods;

	// our affixes map has plural fields & other mismatches
	var baseType = item.attributes.itemType.toLowerCase();
	var equipType = item.attributes.equipType;
	if (['body', 'boots', 'gloves', 'sword', 'axe', 'mace'].indexOf(baseType) == -1) {
		baseType = baseType + 's';
	}
	if (baseType == 'body') {
		baseType = 'chests';
	}
	if (baseType == 'sword' && equipType == 'One Handed Melee Weapon') {
		baseType = 'onehandswordsandaxes';
	}
	if (baseType == 'axe' && equipType == 'One Handed Melee Weapon') {
		baseType = 'onehandswordsandaxes';
	}
	if (baseType == 'mace' && equipType == 'One Handed Melee Weapon') {
		baseType = 'onehandmaces';
	}
	if (baseType == 'sword' && equipType == 'Two Handed Melee Weapon') {
		baseType = 'twohandswordsandaxes';
	}
	if (baseType == 'axe' && equipType == 'Two Handed Melee Weapon') {
		baseType = 'twohandswordsandaxes';
	}
	if (baseType == 'mace' && equipType == 'Two Handed Melee Weapon') {
		baseType = 'twohandmaces';
	}

	//console.trace('basetype: ' + baseType)
	if (!baseType) {
		return;
	}

	for (var idx in forgottenMods) {
		var mod = forgottenMods[idx];
		var affix = affixesLookup(baseType, mod.name, mod.value);
		var maxTier = affixMaxLookUp(baseType, mod.name);
		if (affix) {
			//logger.info('affix found:' + affix.mod + ' tier: ' + affix.tier + ' maxTier: ' + maxTier);
			mod.affix = affix.affix; // == 'Prefix' ? 'P' : 'S';
			mod.tier = affix.tier;
			mod.maxTier = maxTier;

			//var affixLabel = affix.affix == 'Prefix' ? '[prefix]' : '[suffix]';
			//var tierLabel = '[T' + affix.tier + '/T' + maxTier +']';
			//var valueLabel = mod.value;
			//var modNameLabel = mod.name;
			//if(modNameLabel.startsWith('#')) modNameLabel = modNameLabel.substring(1);
			//mod.forgottenMod = affixLabel + tierLabel + ' ' + valueLabel + ' ' + modNameLabel;
		} else {
			// console.error('Cannot determine the forgotten mod for explicit mod: ' + mod.name + ' mod value: ' + mod.value);
			// hybrids will show up if you uncomment this
		}
	}
}

function affixesLookup(baseType, modName, modValue) {
	if (typeof modValue === 'object') {
		modValue = modValue.avg;
	}

	// extra # at the beginning
	//if(modName.startsWith('#')) modName = modName.substring(1)
	for (var idx in affixes) {
		var affix = affixes[idx];
		var baseTypeFlag = affix[baseType];
		// print(baseTypeFlag + ':' + modName + ' = ' + affix.mod);
		if (baseTypeFlag && baseTypeFlag.indexOf('Yes') != -1 && affix.mod == modName) {
			// logger.info('modValue:' + modValue + ' affix.minvalue: ' + affix.minvalue + ' affix.maxvalue: ' + affix.maxvalue);
			if (affix.minvalue <= modValue && affix.maxvalue >= modValue) {
				return affix;
			}
		}
	}
	return null;
}
function affixMaxLookUp(baseType, modName) {
	// extra # at the beginning
	//if(modName.startsWith('#')) modName = modName.substring(1)
	var maxTier = 0;
	for (var idx in affixes) {
		affix = affixes[idx];
		baseTypeFlag = affix[baseType];
		// print(baseTypeFlag + ':' + modName + ' = ' + affix.mod);
		if (baseTypeFlag && baseTypeFlag.indexOf('Yes') != -1 && affix.mod == modName) {
			if (maxTier < affix.tier) { maxTier = affix.tier; }
		} else {
			if (maxTier > 0) {
				return maxTier;
			}
		}
	}
	return maxTier;
}

function determineBaseType(name) {
	for (var base in baseTypes) {
		if (name.indexOf(base) != -1) {
			return baseTypes[base];
		}
	}
	return null;
}

