(function (root) {
  'use strict';

  const images = {};
  const lootIcons = {
    '武器零件': 'weaponParts', '医疗凝胶': 'medGel', '工业芯片': 'chip',
    '核燃料棒': 'fuel', '军用黑匣子': 'blackbox', '旧世遗物': 'relic'
  };

  function svgIcon(path, label, className) {
    const container = document.createElement('span');
    container.className = 'asset-icon' + (className ? ' ' + className : '');
    container.setAttribute('role', 'img');
    if (label) container.setAttribute('aria-label', label);
    container.innerHTML = '<svg viewBox="0 0 64 64" aria-hidden="true"><use href="' + path + '"></use></svg>';
    return container;
  }

  function equipment(slot, name) {
    return svgIcon('assets/equipment.svg#' + slot, name || '装备', 'item-icon');
  }

  function weapon(id, name) {
    return svgIcon('assets/weapons.svg#' + id, name || '武器', 'weapon-art');
  }

  function loot(name) {
    return svgIcon('assets/loot.svg#' + (lootIcons[name] || 'weaponParts'), name || '物资', 'loot-art');
  }

  function portrait(seed, name) {
    const hash = root.MechCore ? root.MechCore.hashSeed(seed) : String(seed).length;
    return svgIcon('assets/pilots.svg#pilot-' + hash % 4, name || '驾驶员', 'pilot-art');
  }

  function image(name) {
    if (typeof Image === 'undefined') return null;
    if (!images[name]) {
      const sprite = new Image();
      sprite.src = 'assets/sprites/' + name + '.svg';
      images[name] = sprite;
    }
    return images[name];
  }

  function ready(name) {
    const sprite = image(name);
    return !!(sprite && sprite.complete && sprite.naturalWidth > 0);
  }

  function getImage(name) { return image(name); }

  root.MechAssets = { svgIcon, equipment, weapon, loot, portrait, ready, getImage };
})(typeof window !== 'undefined' ? window : globalThis);
