(function (root) {
  'use strict';

  function hashSeed(value) {
    const text = String(value == null ? '' : value);
    let hash = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function randomFrom(seed) {
    let state = hashSeed(seed) || 0x6d2b79f5;
    return function () {
      state += 0x6d2b79f5;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function circleRect(x, y, radius, rect) {
    const nearestX = clamp(x, rect.x, rect.x + rect.w);
    const nearestY = clamp(y, rect.y, rect.y + rect.h);
    const dx = x - nearestX;
    const dy = y - nearestY;
    return dx * dx + dy * dy < radius * radius;
  }

  function pointRect(x, y, rect) {
    return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
  }

  function segmentRect(x1, y1, x2, y2, rect) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    let low = 0;
    let high = 1;
    const checks = [
      [-dx, x1 - rect.x], [dx, rect.x + rect.w - x1],
      [-dy, y1 - rect.y], [dy, rect.y + rect.h - y1]
    ];
    for (let i = 0; i < checks.length; i += 1) {
      const p = checks[i][0];
      const q = checks[i][1];
      if (p === 0) {
        if (q < 0) return false;
      } else {
        const ratio = q / p;
        if (p < 0) {
          if (ratio > high) return false;
          low = Math.max(low, ratio);
        } else {
          if (ratio < low) return false;
          high = Math.min(high, ratio);
        }
      }
    }
    return true;
  }

  function wallWithDoor(x, y, length, horizontal, doorCenter, doorWidth) {
    const thickness = 16;
    const start = Math.max(0, doorCenter - doorWidth / 2);
    const end = Math.min(length, doorCenter + doorWidth / 2);
    const walls = [];
    if (horizontal) {
      if (start > 0) walls.push({ x, y, w: start, h: thickness });
      if (end < length) walls.push({ x: x + end, y, w: length - end, h: thickness });
    } else {
      if (start > 0) walls.push({ x, y, w: thickness, h: start });
      if (end < length) walls.push({ x, y: y + end, w: thickness, h: length - end });
    }
    return walls;
  }

  function makeBuilding(x, y, w, h, id, rand) {
    const walls = [];
    walls.push({ x, y, w, h: 16 });
    walls.push.apply(walls, wallWithDoor(x, y + h - 16, w, true, w * (0.35 + rand() * 0.3), 76));
    walls.push({ x, y, w: 16, h });
    walls.push.apply(walls, wallWithDoor(x + w - 16, y, h, false, h * 0.55, 72));
    const splitX = x + w * (0.46 + rand() * 0.12);
    walls.push.apply(walls, wallWithDoor(splitX, y + 16, h - 32, false, h * (0.35 + rand() * 0.25), 66));
    return {
      id, x, y, w, h, walls,
      tint: ['#263b40', '#303d43', '#354047', '#293e3d'][Math.floor(rand() * 4)],
      label: ['仓库', '研究站', '居住舱', '加工间', '中继站'][Math.floor(rand() * 5)] + '-' + String(id + 1).padStart(2, '0')
    };
  }

  function generateMap(seed) {
    const rand = randomFrom(seed);
    const width = 2600;
    const height = 1800;
    const map = {
      seed: String(seed), width, height,
      name: ['灰烬工业区', '沉没港', '白塔废墟', '锈蚀盆地'][Math.floor(rand() * 4)],
      spawn: { x: 150, y: 900 },
      extraction: { x: 2420, y: 760 + rand() * 280, radius: 105 },
      buildings: [], walls: [], obstacles: [], crates: [], enemies: [], decals: []
    };

    const slots = [
      [390, 190], [940, 150], [1530, 220], [2020, 170],
      [430, 1170], [1020, 1200], [1610, 1130], [2140, 1200]
    ];
    for (let i = slots.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rand() * (i + 1));
      const temp = slots[i]; slots[i] = slots[j]; slots[j] = temp;
    }
    const buildingCount = 5 + Math.floor(rand() * 3);
    for (let i = 0; i < buildingCount; i += 1) {
      const slot = slots[i];
      const w = 320 + Math.floor(rand() * 70);
      const h = 290 + Math.floor(rand() * 100);
      const x = slot[0] + Math.floor(rand() * 50 - 25);
      const y = slot[1] + Math.floor(rand() * 45 - 22);
      const building = makeBuilding(x, y, w, h, i, rand);
      map.buildings.push(building);
      map.walls.push.apply(map.walls, building.walls);
      const crateCount = 2 + Math.floor(rand() * 2);
      for (let c = 0; c < crateCount; c += 1) {
        const leftRoom = c % 2 === 0;
        map.crates.push({
          id: 'c' + i + '-' + c,
          x: x + (leftRoom ? w * 0.25 : w * 0.76) + rand() * 25 - 12,
          y: y + 65 + rand() * (h - 135),
          opened: false, progress: 0, indoors: true, building: i
        });
      }
      if (rand() > 0.3) {
        map.enemies.push({
          x: x + w * 0.72, y: y + h * 0.35,
          type: 'raider', indoors: true, building: i
        });
      }
    }

    for (let i = 0; i < 22; i += 1) {
      const horizontal = rand() > 0.5;
      const obstacle = {
        x: 300 + rand() * (width - 600), y: 180 + rand() * (height - 360),
        w: horizontal ? 60 + rand() * 80 : 28 + rand() * 30,
        h: horizontal ? 28 + rand() * 30 : 60 + rand() * 80,
        kind: rand() > 0.66 ? 'rock' : (rand() > 0.45 ? 'barrier' : 'scrap')
      };
      const nearRoad = Math.abs(obstacle.y + obstacle.h / 2 - 900) < 170;
      const nearSpawn = Math.hypot(obstacle.x - 150, obstacle.y - 900) < 240;
      const nearExtract = Math.hypot(obstacle.x - map.extraction.x, obstacle.y - map.extraction.y) < 190;
      const insideBuilding = map.buildings.some(function (b) {
        return obstacle.x < b.x + b.w + 30 && obstacle.x + obstacle.w > b.x - 30 &&
          obstacle.y < b.y + b.h + 30 && obstacle.y + obstacle.h > b.y - 30;
      });
      if (!nearRoad && !nearSpawn && !nearExtract && !insideBuilding) map.obstacles.push(obstacle);
    }

    const enemyCount = 15 + Math.floor(rand() * 7);
    for (let i = 0; i < enemyCount; i += 1) {
      let x = 0; let y = 0; let valid = false;
      for (let attempt = 0; attempt < 30 && !valid; attempt += 1) {
        x = 480 + rand() * 1800;
        y = 120 + rand() * 1560;
        valid = !map.buildings.some(function (b) { return pointRect(x, y, b); }) &&
          !map.obstacles.some(function (o) { return circleRect(x, y, 28, o); }) &&
          Math.hypot(x - map.extraction.x, y - map.extraction.y) > 130;
      }
      if (valid) map.enemies.push({ x, y, type: rand() > 0.72 ? 'drone' : 'raider', indoors: false });
    }

    for (let i = 0; i < 5; i += 1) {
      map.crates.push({
        id: 'field-' + i, x: 550 + rand() * 1650, y: 790 + rand() * 220,
        opened: false, progress: 0, indoors: false, building: -1
      });
    }
    for (let i = 0; i < 180; i += 1) {
      map.decals.push({ x: rand() * width, y: rand() * height, r: 2 + rand() * 10, tone: rand() });
    }
    return map;
  }

  function collidersFor(map, canEnterBuildings) {
    const colliders = map.obstacles.filter(function (obstacle) { return !obstacle.destroyed; });
    if (canEnterBuildings) {
      colliders.push.apply(colliders, map.walls.filter(function (wall) { return !wall.destroyed; }));
    } else {
      colliders.push.apply(colliders, map.buildings);
    }
    return colliders;
  }

  function blocked(map, x, y, radius, canEnterBuildings) {
    if (x < radius || y < radius || x > map.width - radius || y > map.height - radius) return true;
    const colliders = collidersFor(map, canEnterBuildings);
    for (let i = 0; i < colliders.length; i += 1) {
      if (circleRect(x, y, radius, colliders[i])) return true;
    }
    return false;
  }

  function moveEntity(map, entity, dx, dy, radius, canEnterBuildings) {
    let moved = false;
    const nextX = clamp(entity.x + dx, radius, map.width - radius);
    if (!blocked(map, nextX, entity.y, radius, canEnterBuildings)) {
      entity.x = nextX; moved = moved || Math.abs(dx) > 0.001;
    }
    const nextY = clamp(entity.y + dy, radius, map.height - radius);
    if (!blocked(map, entity.x, nextY, radius, canEnterBuildings)) {
      entity.y = nextY; moved = moved || Math.abs(dy) > 0.001;
    }
    return moved;
  }

  function lineBlocked(map, x1, y1, x2, y2, outdoorsOnly) {
    const activeObstacles = map.obstacles.filter(function (obstacle) { return !obstacle.destroyed; });
    const activeWalls = map.walls.filter(function (wall) { return !wall.destroyed; });
    const colliders = outdoorsOnly ? activeObstacles.concat(map.buildings) : activeObstacles.concat(activeWalls);
    for (let i = 0; i < colliders.length; i += 1) {
      if (segmentRect(x1, y1, x2, y2, colliders[i])) return true;
    }
    return false;
  }

  function buildingAt(map, x, y) {
    for (let i = 0; i < map.buildings.length; i += 1) {
      if (pointRect(x, y, map.buildings[i])) return map.buildings[i];
    }
    return null;
  }

  function computeStats(profile) {
    const loadout = profile.loadout;
    const activeMods = loadout.mechMods.concat(loadout.infMods).map(function (id) {
      return root.MechData.mods[id];
    }).filter(Boolean);
    const stats = {
      mechHp: 340, mechSpeed: 172, infHp: 100, infSpeed: 220,
      heatGain: 1, cooling: 1, mechDamage: 1, infDamage: 1,
      reload: 1, magazine: 1, spread: 1, fireRate: 1, dash: 1, swapHeal: 0,
      mechArmor: 0, infArmor: 0, critChance: 0, critDamage: 0, lootLuck: 0, blast: 1
    };
    activeMods.forEach(function (mod) {
      Object.keys(mod.effects).forEach(function (key) {
        if (['mechHp', 'infHp', 'swapHeal'].indexOf(key) >= 0) stats[key] += mod.effects[key];
        else stats[key] *= 1 + mod.effects[key];
      });
    });
    const equipped = profile.equipped || {};
    Object.keys(equipped).forEach(function (slot) {
      const item = equipped[slot];
      if (!item || !item.affixes) return;
      Object.keys(item.affixes).forEach(function (key) {
        if (stats[key] === undefined) return;
        const value = Number(item.affixes[key]) || 0;
        if (['mechHp', 'infHp', 'swapHeal', 'mechArmor', 'infArmor', 'critChance', 'critDamage', 'lootLuck'].indexOf(key) >= 0) stats[key] += value;
        else stats[key] *= 1 + value;
      });
    });
    const character = profile.character || { attributes: {} };
    const attributes = character.attributes || {};
    stats.infDamage *= 1 + (attributes.might || 0) * .02;
    stats.infSpeed *= 1 + (attributes.agility || 0) * .012;
    stats.critChance += (attributes.agility || 0) * .005;
    stats.infHp += (attributes.fortitude || 0) * 8;
    stats.mechHp += (attributes.fortitude || 0) * 5;
    stats.mechDamage *= 1 + (attributes.interface || 0) * .02;
    stats.cooling *= 1 + (attributes.interface || 0) * .02;
    const frame = root.MechItems && root.MechItems.chassis[profile.mech && profile.mech.chassis];
    if (frame) {
      stats.mechHp *= frame.hp; stats.mechSpeed *= frame.speed; stats.mechDamage *= frame.damage;
      stats.cooling *= frame.cooling || 1; stats.heatGain *= frame.heatGain || 1;
      stats.mechArmor += frame.armor || 0; stats.critChance += frame.crit || 0;
      stats.dash *= frame.dash || 1; stats.spread *= frame.spread || 1; stats.blast *= frame.blast || 1;
    }
    stats.mechHp = Math.max(100, Math.round(stats.mechHp));
    stats.infHp = Math.max(50, Math.round(stats.infHp));
    stats.mechArmor = clamp(stats.mechArmor, 0, .65);
    stats.infArmor = clamp(stats.infArmor, 0, .65);
    stats.critChance = clamp(stats.critChance, 0, .75);
    return stats;
  }

  function computeMechSystems(profile) {
    const items = root.MechItems;
    const frame = items.chassis[profile.mech && profile.mech.chassis] || items.chassis.assault;
    const stats = computeStats(profile);
    const equipped = profile.equipped || {};
    const weaponSystem = {
      autocannon: { power: 95, weight: 1.1 }, rockets: { power: 145, weight: 1.7 },
      railgun: { power: 270, weight: 2.5 }, laser: { power: 225, weight: 1.5 },
      flak: { power: 130, weight: 1.3 }, plasma: { power: 280, weight: 2.2 },
      arc: { power: 300, weight: 1.8 }, mortar: { power: 240, weight: 3.2 },
      minigun: { power: 190, weight: 2 }, blade: { power: 80, weight: .7 }
    };
    const modSystem = {
      composite: { power: 0, weight: 1.4 }, actuator: { power: 55, weight: .4 },
      coolant: { power: 45, weight: .6 }, accelerator: { power: 65, weight: .3 },
      servo: { power: 35, weight: .4 }, reactor: { power: -170, weight: .8 }
    };
    const slotWeight = { mechHead: .35, mechTorso: 1.2, mechArms: .8, mechLegs: 1.1, mechReactor: 1, mechArmor: 1.3 };
    const partShare = { mechHead: .12, mechTorso: .28, mechArms: .16, mechLegs: .18, mechReactor: .14, mechArmor: .12 };
    const partArmor = { mechHead: 12, mechTorso: 20, mechArms: 14, mechLegs: 16, mechReactor: 10, mechArmor: 30 };
    let output = frame.power; let powerUsed = frame.draw; let capacity = frame.capacity; let weightUsed = frame.weight;
    [profile.loadout.mechPrimary, profile.loadout.mechSecondary].forEach(function (id) {
      const system = weaponSystem[id] || { power: 100, weight: 1 };
      powerUsed += system.power; weightUsed += system.weight;
    });
    profile.loadout.mechMods.forEach(function (id) {
      const system = modSystem[id] || { power: 25, weight: .3 };
      powerUsed += system.power; weightUsed += system.weight;
    });
    Object.keys(partShare).forEach(function (slot) {
      const item = equipped[slot];
      if (!item) return;
      const affixes = item.affixes || {};
      const rarity = items.rarities[item.rarity] || items.rarities.common;
      output += Number(affixes.powerOutput) || 0;
      capacity += Number(affixes.weightCapacity) || 0;
      powerUsed += 12 + rarity.score * 7 + (slot === 'mechHead' ? 24 : 0);
      weightUsed += slotWeight[slot] * (1 + rarity.score * .12);
      if (slot === 'mechReactor') { output += 90 + rarity.score * 45; capacity += .4 + rarity.score * .2; }
    });
    output = Math.max(100, output); capacity = Math.max(1, capacity);
    const powerRatio = powerUsed / output;
    const weightRatio = weightUsed / capacity;
    const powerPenalty = clamp(1 - Math.max(0, powerRatio - 1) * .75, .5, 1);
    const weightPenalty = clamp(1 - Math.max(0, weightRatio - 1) * .7, .45, 1);
    const parts = {};
    Object.keys(partShare).forEach(function (slot) {
      const item = equipped[slot]; const affixes = item && item.affixes ? item.affixes : {};
      const durability = Math.round(stats.mechHp * partShare[slot] + (Number(affixes.partDurability) || 0) + (Number(affixes.mechHp) || 0) * .25);
      const armor = Math.round((partArmor[slot] + (frame.armor || 0) * 150 + (Number(affixes.partArmor) || 0) + (Number(affixes.mechArmor) || 0) * 200) * 10) / 10;
      parts[slot] = { id: slot, name: items.slots[slot].name, hp: durability, maxHp: durability, armor, broken: false };
    });
    return {
      powerOutput: Math.round(output), powerUsed: Math.round(powerUsed), powerFree: Math.round(output - powerUsed), powerRatio,
      weightCapacity: Math.round(capacity * 10) / 10, weightUsed: Math.round(weightUsed * 10) / 10,
      weightFree: Math.round((capacity - weightUsed) * 10) / 10, weightRatio,
      speed: Math.round(stats.mechSpeed * powerPenalty * weightPenalty),
      turnRate: Math.round(frame.turn * weightPenalty * (.7 + powerPenalty * .3)),
      cooling: stats.cooling * powerPenalty, heatGain: stats.heatGain * (1 + Math.max(0, powerRatio - 1) * .8),
      overloaded: weightRatio > 1, powerShortage: powerRatio > 1, parts
    };
  }

  function tunedWeapon(id, stats) {
    const base = root.MechData.weapons[id];
    const weapon = Object.assign({}, base);
    const infantry = weapon.kind === 'infantry';
    weapon.damage *= infantry ? stats.infDamage : stats.mechDamage;
    weapon.reload *= stats.reload;
    weapon.mag = Math.max(1, Math.round(weapon.mag * stats.magazine));
    weapon.spread *= stats.spread;
    weapon.rate *= stats.fireRate;
    return weapon;
  }

  function rollLoot(seed, luck) {
    const rand = randomFrom(seed);
    const roll = Math.pow(rand(), 1.45 - (luck || 0) * 0.1);
    const index = Math.min(root.MechData.loot.length - 1, Math.floor(roll * root.MechData.loot.length));
    return Object.assign({}, root.MechData.loot[index], { id: Math.floor(rand() * 1e9) });
  }

  root.MechCore = {
    hashSeed, randomFrom, clamp, distance, circleRect, pointRect, segmentRect,
    generateMap, createBuilding: makeBuilding, blocked, moveEntity, lineBlocked,
    buildingAt, computeStats, computeMechSystems, tunedWeapon, rollLoot
  };
})(typeof window !== 'undefined' ? window : globalThis);
