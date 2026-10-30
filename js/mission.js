(function (root) {
  'use strict';

  const Core = root.MechCore;
  const Data = root.MechData;

  function weaponState(weapon) {
    return { weapon, ammo: weapon.mag, cooldown: 0, reloadLeft: 0, reloadTotal: 0 };
  }

  class Raid {
    constructor(app, seed, customMap) {
      this.app = app;
      this.map = customMap ? root.MechItems.normalizeMap(customMap) : Core.generateMap(seed);
      this.map.obstacles.forEach(function (obstacle, index) {
        const barrel = obstacle.kind === 'barrier' && obstacle.w < 60 && obstacle.h < 60;
        const type = obstacle.kind === 'rock' ? 'rock' : (barrel ? 'barrel' : obstacle.kind);
        const hp = { rock: 240, scrap: 120, barrier: 90, barrel: 45 }[type] || 100;
        obstacle.id = 'terrain-' + index; obstacle.terrainType = type;
        obstacle.maxHp = hp; obstacle.hp = hp; obstacle.destructible = true; obstacle.destroyed = false;
      });
      this.map.walls.forEach(function (wall, index) {
        const hp = 120 + Math.round(Math.min(60, Math.sqrt(wall.w * wall.w + wall.h * wall.h) * .25));
        wall.id = 'wall-' + index; wall.terrainType = 'wall';
        wall.maxHp = hp; wall.hp = hp; wall.destructible = true; wall.destroyed = false;
      });
      this.stats = Core.computeStats(app.profile);
      this.systems = Core.computeMechSystems(app.profile);
      this.stats.mechSpeed = this.systems.speed;
      this.stats.cooling = this.systems.cooling;
      this.stats.heatGain = this.systems.heatGain;
      this.player = {
        x: this.map.spawn.x, y: this.map.spawn.y, angle: 0,
        mode: 'mech', mechHp: this.stats.mechHp, infHp: this.stats.infHp,
        parts: this.systems.parts, heat: 0, overheated: false, dashCooldown: 0, dashTime: 0, flash: 0
      };
      const loadout = app.profile.loadout;
      this.weapons = {
        mech: [loadout.mechPrimary, loadout.mechSecondary].map(function (id) { return weaponState(Core.tunedWeapon(id, this.stats)); }, this),
        infantry: [loadout.infPrimary, loadout.infSecondary].map(function (id) { return weaponState(Core.tunedWeapon(id, this.stats)); }, this)
      };
      this.active = { mech: 0, infantry: 0 };
      this.parkedMech = null;
      this.camera = { x: 0, y: 0 };
      this.enemies = this.map.enemies.map(function (enemy, index) {
        const definition = root.MechItems.unitDefinition(enemy.type, app.profile);
        return Object.assign({}, enemy, definition, {
          id: index, maxHp: definition.hp, radius: (definition.model === 'drone' ? 18 : 10) * definition.scale,
          cooldown: Math.random(), angle: 0, dead: false, alert: false, strafe: index % 2 ? 1 : -1
        });
      });
      this.bullets = [];
      this.particles = [];
      this.burstQueue = [];
      this.lightning = [];
      this.debris = [];
      this.destroyedCount = 0;
      this.timeLeft = 300;
      this.elapsed = 0;
      this.extractProgress = 0;
      this.carried = [];
      this.gear = [];
      this.capacity = 12;
      this.carryValue = 0;
      this.salvage = 0;
      this.kills = 0;
      this.xp = 0;
      this.shots = 0;
      this.searchTarget = null;
      this.over = false;
      this.lastHudSecond = -1;
      this.updateCamera();
      this.app.clearFeed();
      this.buildPartHud();
      this.app.feed('已进入 <b>' + String(this.map.name).replace(/[<>&]/g, '') + '</b>，撤离信标已标记');
      this.app.feed('按 <b>F</b> 离机，建筑内部只能徒步进入');
      this.app.feed('爆炸可摧毁掩体和墙体，开辟单兵通道');
    }

    buildPartHud() {
      const container = this.app.ui.partStatus;
      container.innerHTML = '';
      Object.keys(this.player.parts).forEach(function (key) {
        const part = this.player.parts[key];
        const chip = document.createElement('div'); chip.className = 'part-chip';
        const title = document.createElement('div');
        const name = document.createElement('span'); name.textContent = part.name.replace('机甲', '');
        const armor = document.createElement('b'); armor.textContent = '甲 ' + part.armor;
        title.append(name, armor);
        const track = document.createElement('div'); track.className = 'part-track';
        const fill = document.createElement('i'); track.appendChild(fill);
        const hp = document.createElement('small'); hp.textContent = part.hp;
        chip.append(title, track, hp); container.appendChild(chip);
        chip._fill = fill; chip._hp = hp;
      }, this);
    }

    currentWeapon() {
      return this.weapons[this.player.mode][this.active[this.player.mode]];
    }

    currentHp() {
      return this.player.mode === 'mech' ? this.player.mechHp : this.player.infHp;
    }

    maxHp() {
      return this.player.mode === 'mech' ? this.stats.mechHp : this.stats.infHp;
    }

    carriedCount() {
      return this.carried.length + this.gear.length;
    }

    update(dt) {
      if (this.over) return;
      this.elapsed += dt;
      this.timeLeft = Math.max(0, this.timeLeft - dt);
      if (this.timeLeft <= 0) {
        this.finish(false, '封锁完成，行动信号已丢失');
        return;
      }
      const input = this.app.input;
      const player = this.player;
      player.flash = Math.max(0, player.flash - dt);
      player.dashCooldown = Math.max(0, player.dashCooldown - dt);
      player.dashTime = Math.max(0, player.dashTime - dt);
      const targetAngle = Math.atan2(input.mouse.y + this.camera.y - player.y, input.mouse.x + this.camera.x - player.x);
      if (player.mode === 'mech') {
        const difference = Math.atan2(Math.sin(targetAngle - player.angle), Math.cos(targetAngle - player.angle));
        let turnRate = this.systems.turnRate;
        if (player.parts.mechLegs.broken) turnRate *= .6;
        if (player.parts.mechReactor.broken) turnRate *= .7;
        const maxTurn = turnRate * Math.PI / 180 * dt;
        player.angle += Core.clamp(difference, -maxTurn, maxTurn);
      } else player.angle = targetAngle;

      if (input.pressed.has('Digit1')) this.switchWeapon(0);
      if (input.pressed.has('Digit2')) this.switchWeapon(1);
      if (input.pressed.has('KeyR')) this.reload();
      if (input.pressed.has('KeyF')) this.dismount();

      let moveX = (input.keys.has('KeyD') ? 1 : 0) - (input.keys.has('KeyA') ? 1 : 0);
      let moveY = (input.keys.has('KeyS') ? 1 : 0) - (input.keys.has('KeyW') ? 1 : 0);
      const length = Math.hypot(moveX, moveY) || 1;
      moveX /= length; moveY /= length;
      if (input.pressed.has('Space') && player.dashCooldown <= 0 && (moveX || moveY)) {
        player.dashTime = 0.17;
        player.dashCooldown = 3 * this.stats.dash;
        this.burst(player.x, player.y, '#9bd7c5', 7, 80);
      }
      let speed = player.mode === 'mech' ? this.stats.mechSpeed : this.stats.infSpeed;
      if (player.mode === 'mech' && player.parts.mechLegs.broken) speed *= .55;
      if (player.mode === 'mech' && player.parts.mechReactor.broken) speed *= .75;
      if (player.dashTime > 0) speed *= 3.4;
      Core.moveEntity(this.map, player, moveX * speed * dt, moveY * speed * dt, player.mode === 'mech' ? 34 : 9, player.mode === 'infantry');

      this.burstQueue.forEach(function (shot) { shot.delay -= dt; });
      this.burstQueue.filter(function (shot) { return shot.delay <= 0; }).forEach(function (shot) { this.spawnPlayerBullet(shot.weapon); }, this);
      this.burstQueue = this.burstQueue.filter(function (shot) { return shot.delay > 0; });
      this.weapons.mech.concat(this.weapons.infantry).forEach(function (state) {
        state.cooldown = Math.max(0, state.cooldown - dt);
        if (state.reloadLeft > 0) {
          state.reloadLeft -= dt;
          if (state.reloadLeft <= 0) {
            state.reloadLeft = 0;
            state.ammo = state.weapon.mag;
          }
        }
      });
      if (input.mouse.down && !this.app.isPointerOverUi()) this.firePlayer();
      const cooling = 23 * this.stats.cooling * (player.mode === 'mech' && player.parts.mechReactor.broken ? .45 : 1);
      player.heat = Math.max(0, player.heat - cooling * dt);
      if (player.overheated && player.heat <= 35) {
        player.overheated = false;
        this.app.feed('武器温度恢复，<b>火控解除锁定</b>');
      }

      if (player.mode === 'infantry' && input.pressed.has('KeyE') && this.nearParkedMech()) this.boardMech();
      this.updateInteraction(dt);
      this.updateEnemies(dt);
      this.updateBullets(dt);
      this.updateParticles(dt);

      const extractionDistance = Core.distance(player, this.map.extraction);
      if (extractionDistance < this.map.extraction.radius) {
        this.extractProgress += dt;
        if (this.extractProgress >= 3) {
          this.finish(true, '物资已安全送回格纳库');
          return;
        }
      } else {
        this.extractProgress = Math.max(0, this.extractProgress - dt * 2.5);
      }
      this.updateCamera();
      this.updateHud();
    }

    updateCamera() {
      this.camera.x = Core.clamp(this.player.x - this.app.renderer.width / 2, 0, Math.max(0, this.map.width - this.app.renderer.width));
      this.camera.y = Core.clamp(this.player.y - this.app.renderer.height / 2, 0, Math.max(0, this.map.height - this.app.renderer.height));
    }

    switchWeapon(index) {
      this.active[this.player.mode] = index;
      const state = this.currentWeapon();
      this.app.feed('切换至 <b>' + state.weapon.name + '</b>');
    }

    reload() {
      const state = this.currentWeapon();
      if (state.reloadLeft > 0 || state.ammo >= state.weapon.mag) return;
      state.reloadTotal = state.weapon.reload;
      state.reloadLeft = state.reloadTotal;
    }

    firePlayer() {
      const player = this.player;
      const state = this.currentWeapon();
      const weapon = state.weapon;
      if (state.cooldown > 0 || state.reloadLeft > 0 || (player.mode === 'mech' && player.overheated)) return;
      if (state.ammo <= 0) { this.reload(); return; }
      const burstCount = weapon.burst ? Math.min(weapon.burst, state.ammo) : 1;
      state.ammo -= burstCount;
      state.cooldown = weapon.rate;
      this.shots += burstCount;
      if (player.mode === 'mech') {
        player.heat = Math.min(100, player.heat + weapon.heat * this.stats.heatGain * (player.parts.mechReactor.broken ? 1.4 : 1));
        if (player.heat >= 100) {
          player.overheated = true;
          this.app.feed('<b>警告：</b>武器过热，火控暂时锁定');
        }
      }
      if (weapon.burst) {
        for (let i = 0; i < burstCount; i += 1) this.burstQueue.push({ delay: i * (weapon.burstDelay || .075), weapon });
      } else {
        for (let i = 0; i < weapon.pellets; i += 1) this.spawnPlayerBullet(weapon);
      }
      if (state.ammo <= 0) this.reload();
    }

    spawnPlayerBullet(weapon) {
      const player = this.player;
      const partSpread = player.mode === 'mech' && player.parts.mechHead.broken ? 1.65 : 1;
      const partDamage = player.mode === 'mech' && player.parts.mechArms.broken ? .7 : 1;
      const angle = player.angle + (Math.random() - .5) * weapon.spread * partSpread * 2;
      const muzzle = player.mode === 'mech' ? 48 : 23;
      const critical = Math.random() < this.stats.critChance + (weapon.critBonus || 0);
      this.bullets.push({
        x: player.x + Math.cos(angle) * muzzle, y: player.y + Math.sin(angle) * muzzle,
        vx: Math.cos(angle) * weapon.speed, vy: Math.sin(angle) * weapon.speed,
        life: (weapon.range || weapon.speed * 1.25) / weapon.speed, owner: 'player',
        damage: weapon.damage * partDamage * (critical ? 1.5 + this.stats.critDamage : 1),
        blast: weapon.blast ? weapon.blast * this.stats.blast : 0,
        color: critical ? '#fff2a8' : weapon.color, radius: critical ? 4 : 3, critical,
        chain: weapon.chain || 0, chainRange: weapon.chainRange || 0,
        pierce: weapon.pierce || 0, hitIds: [], lob: !!weapon.lob,
        z: weapon.lob ? 0 : undefined, vz: weapon.lob ? 260 : undefined, gravity: weapon.lob ? 520 : undefined
      });
      this.burst(player.x + Math.cos(player.angle) * 35, player.y + Math.sin(player.angle) * 35, weapon.color, 3, 45);
      this.app.sendFx({ kind: 'shot', x: player.x, y: player.y, angle: player.angle, color: weapon.color, seed: this.map.seed });
    }

    dismount() {
      const player = this.player;
      if (player.mode !== 'mech') return;
      this.parkedMech = { x: player.x, y: player.y, angle: player.angle, hp: player.mechHp, parts: player.parts, destroyed: false };
      player.mode = 'infantry';
      const offsets = [[52,0],[-52,0],[0,52],[0,-52]];
      for (let i = 0; i < offsets.length; i += 1) {
        const nx = player.x + offsets[i][0]; const ny = player.y + offsets[i][1];
        if (!Core.blocked(this.map, nx, ny, 9, true)) { player.x = nx; player.y = ny; break; }
      }
      player.infHp = Math.min(this.stats.infHp, player.infHp + this.stats.swapHeal);
      player.heat = 0; player.overheated = false;
      this.app.feed('已离机：<b>单兵模式</b>，靠近机甲按 E 登机');
    }

    nearParkedMech() {
      return this.parkedMech && !this.parkedMech.destroyed && Core.distance(this.player, this.parkedMech) < 90;
    }

    boardMech() {
      if (!this.nearParkedMech()) return;
      const player = this.player;
      player.x = this.parkedMech.x; player.y = this.parkedMech.y; player.angle = this.parkedMech.angle;
      player.mechHp = Math.min(this.stats.mechHp, this.parkedMech.hp + this.stats.swapHeal);
      player.parts = this.parkedMech.parts;
      player.mode = 'mech'; this.parkedMech = null; player.heat = 0;
      this.searchTarget = null;
      this.app.feed('神经链路连接：<b>机甲模式</b>');
    }

    emergencyEject() {
      const player = this.player;
      const wreck = { x: player.x, y: player.y, angle: player.angle, destroyed: true };
      this.parkedMech = wreck;
      player.mode = 'infantry'; player.mechHp = 0; player.heat = 0; player.overheated = false;
      const offsets = [[48,0],[-48,0],[0,48],[0,-48]];
      for (let i = 0; i < offsets.length; i += 1) {
        const nx = player.x + offsets[i][0]; const ny = player.y + offsets[i][1];
        if (!Core.blocked(this.map, nx, ny, 9, true)) { player.x = nx; player.y = ny; break; }
      }
      this.burst(wreck.x, wreck.y, '#ff9a62', 35, 230);
      this.app.toast('机甲损毁！已紧急弹射', true);
      this.app.feed('<b>机甲损毁</b>，徒步前往撤离点');
    }

    updateInteraction(dt) {
      const player = this.player;
      this.searchTarget = null;
      if (player.mode === 'infantry') {
        let nearest = null; let nearestDistance = 48;
        this.map.crates.forEach(function (crate) {
          if (crate.opened) return;
          const dist = Core.distance(player, crate);
          if (dist < nearestDistance) { nearest = crate; nearestDistance = dist; }
        });
        this.searchTarget = nearest;
        this.map.crates.forEach(function (crate) {
          if (crate !== nearest && !crate.opened) crate.progress = Math.max(0, crate.progress - dt * 2);
        });
        if (nearest && this.app.input.keys.has('KeyE') && !this.nearParkedMech() && this.carriedCount() < this.capacity) {
          nearest.progress += dt / 0.9;
          if (nearest.progress >= 1) this.openCrate(nearest);
        } else if (nearest) {
          nearest.progress = Math.max(0, nearest.progress - dt * 1.5);
        }
      }
    }

    openCrate(crate) {
      if (crate.opened || this.carriedCount() >= this.capacity) return;
      crate.opened = true; crate.progress = 1;
      const item = Core.rollLoot(this.map.seed + ':' + crate.id + ':' + this.app.profile.raids, this.stats.lootLuck);
      this.carried.push(item); this.carryValue += item.value;
      this.app.feed('获得 <b>' + item.name + '</b>　+' + item.value + ' 信用点', true);
      this.burst(crate.x, crate.y, item.color, 12, 95);
      if (this.carriedCount() < this.capacity && Math.random() < .62) {
        const gear = root.MechItems.generateItem(this.map.seed + ':gear:' + crate.id + ':' + this.app.profile.raids, this.app.profile.character.level, this.stats.lootLuck);
        this.gear.push(gear);
        this.app.feed('发现 ' + root.MechItems.rarities[gear.rarity].name + '装备 <b>' + String(gear.name).replace(/[<>&]/g, '') + '</b>', true);
        this.app.toast(root.MechItems.rarities[gear.rarity].name + ' · ' + gear.name);
        this.burst(crate.x, crate.y, gear.color, 18, 125);
      } else this.app.toast(item.name + '  +' + item.value);
    }

    updateEnemies(dt) {
      const player = this.player;
      const playerBuilding = Core.buildingAt(this.map, player.x, player.y);
      this.enemies.forEach(function (enemy) {
        if (enemy.dead) return;
        enemy.cooldown = Math.max(0, enemy.cooldown - dt);
        const dist = Core.distance(enemy, player);
        const sameBuilding = enemy.indoors && playerBuilding && playerBuilding.id === enemy.building;
        if (enemy.indoors && !sameBuilding) return;
        if (!enemy.indoors && player.mode === 'infantry' && playerBuilding) return;
        if (dist < 470) enemy.alert = true;
        if (!enemy.alert) return;
        enemy.angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
        const canEnter = enemy.model === 'raider';
        const sightBlocked = Core.lineBlocked(this.map, enemy.x, enemy.y, player.x, player.y, !canEnter);
        if (dist > 205 || sightBlocked) {
          let angle = enemy.angle;
          if (sightBlocked && dist > 260) angle += enemy.strafe * .45;
          Core.moveEntity(this.map, enemy, Math.cos(angle) * enemy.speed * dt, Math.sin(angle) * enemy.speed * dt, enemy.radius, canEnter);
        } else if (dist < 115) {
          Core.moveEntity(this.map, enemy, -Math.cos(enemy.angle) * enemy.speed * .45 * dt, -Math.sin(enemy.angle) * enemy.speed * .45 * dt, enemy.radius, canEnter);
        }
        if (dist < enemy.range && !sightBlocked && enemy.cooldown <= 0) {
          enemy.cooldown = enemy.fireRate * (.85 + Math.random() * .4);
          const angle = enemy.angle + (Math.random() - .5) * (enemy.model === 'drone' ? .08 : .12);
          const speed = enemy.model === 'drone' ? 580 : 690;
          this.bullets.push({
            x: enemy.x + Math.cos(angle) * 20, y: enemy.y + Math.sin(angle) * 20,
            vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
            life: 1.25, owner: 'enemy', damage: enemy.damage, blast: 0,
            color: '#ff8068', radius: 3
          });
        }
      }, this);
    }

    updateBullets(dt) {
      const active = [];
      this.bullets.forEach(function (bullet) {
        if (bullet.life <= 0) return;
        bullet.life -= dt;
        const travel = Math.hypot(bullet.vx, bullet.vy) * dt;
        const steps = Math.max(1, Math.ceil(travel / 11));
        let impacted = false;
        for (let step = 0; step < steps && !impacted; step += 1) {
          bullet.x += bullet.vx * dt / steps;
          bullet.y += bullet.vy * dt / steps;
          if (bullet.lob) {
            bullet.z += bullet.vz * dt / steps;
            bullet.vz -= bullet.gravity * dt / steps;
            if (bullet.z <= 0 && bullet.vz < 0) {
              impacted = true; this.impact(bullet, null); break;
            }
          } else if (Core.blocked(this.map, bullet.x, bullet.y, 2, true)) {
            impacted = true;
            this.impact(bullet, null);
            break;
          }
          if (!impacted && bullet.owner === 'player' && !bullet.lob) {
            for (let i = 0; i < this.enemies.length; i += 1) {
              const enemy = this.enemies[i];
              if (!enemy.dead && bullet.hitIds.indexOf(enemy.id) < 0 && Core.distance(bullet, enemy) < enemy.radius + bullet.radius) {
                this.impact(bullet, enemy);
                if (bullet.pierce > 0) { bullet.pierce -= 1; bullet.hitIds.push(enemy.id); continue; }
                impacted = true; break;
              }
            }
          } else if (!impacted && bullet.owner === 'enemy' && Core.distance(bullet, this.player) < (this.player.mode === 'mech' ? 34 : 10)) {
            impacted = true;
            this.damagePlayer(bullet.damage);
            this.burst(bullet.x, bullet.y, '#ef806d', 5, 70);
          }
        }
        if (!impacted && bullet.life > 0) active.push(bullet);
      }, this);
      this.bullets = active;
    }

    impact(bullet, directTarget) {
      if (bullet.owner === 'player') this.damageTerrain(bullet);
      if (directTarget && !bullet.blast) this.damageEnemy(directTarget, bullet.damage);
      if (directTarget && bullet.chain) this.chainLightning(directTarget, bullet);
      if (bullet.blast) {
        this.enemies.forEach(function (enemy) {
          if (enemy.dead) return;
          const dist = Core.distance(bullet, enemy);
          if (dist < bullet.blast) this.damageEnemy(enemy, bullet.damage * (1 - dist / bullet.blast * .45));
        }, this);
        this.burst(bullet.x, bullet.y, '#ff9b66', 22, 180);
      } else {
        this.burst(bullet.x, bullet.y, bullet.color, 5, 80);
      }
    }

    damageTerrain(bullet) {
      const targets = this.map.obstacles.concat(this.map.walls);
      targets.forEach(function (target) {
        if (!target.destructible || target.destroyed) return;
        if (bullet.blast) {
          if (!Core.circleRect(bullet.x, bullet.y, bullet.blast, target)) return;
          const center = { x: target.x + target.w / 2, y: target.y + target.h / 2 };
          const falloff = 1 - Math.min(1, Core.distance(center, bullet) / bullet.blast) * .5;
          this.hurtTerrain(target, bullet.damage * falloff);
        } else if (Core.circleRect(bullet.x, bullet.y, bullet.radius + 3, target)) {
          this.hurtTerrain(target, bullet.damage);
        }
      }, this);
    }

    hurtTerrain(target, amount) {
      if (target.destroyed) return;
      target.hp = Math.max(0, target.hp - amount);
      if (target.hp > 0) return;
      target.destroyed = true;
      this.destroyedCount += 1;
      const x = target.x + target.w / 2; const y = target.y + target.h / 2;
      const salvage = { rock: 35, scrap: 25, barrier: 15, barrel: 30, wall: 8 }[target.terrainType] || 10;
      this.salvage += salvage; this.carryValue += salvage;
      this.debris.push({ x, y, w: target.w, h: target.h, type: target.terrainType });
      this.burst(x, y, target.terrainType === 'rock' ? '#a69a80' : '#d58b61', target.terrainType === 'wall' ? 28 : 18, 155);
      if (this.destroyedCount <= 3 || this.destroyedCount % 5 === 0) {
        const names = { rock: '岩壁', scrap: '废墟', barrier: '路障', barrel: '油桶', wall: '建筑墙体' };
        this.app.feed((names[target.terrainType] || '掩体') + '已摧毁，回收合金 <b>+' + salvage + '</b>');
      }
    }

    chainLightning(origin, bullet) {
      const hit = [origin.id];
      let current = origin;
      for (let jump = 0; jump < bullet.chain; jump += 1) {
        let nearest = null; let nearestDistance = bullet.chainRange;
        this.enemies.forEach(function (enemy) {
          if (enemy.dead || hit.indexOf(enemy.id) >= 0) return;
          const dist = Core.distance(current, enemy);
          if (dist < nearestDistance) { nearest = enemy; nearestDistance = dist; }
        });
        if (!nearest) break;
        this.lightning.push({ x1: current.x, y1: current.y, x2: nearest.x, y2: nearest.y, life: .18, maxLife: .18, color: bullet.color });
        this.damageEnemy(nearest, bullet.damage * .6);
        this.burst(nearest.x, nearest.y, bullet.color, 6, 80);
        hit.push(nearest.id); current = nearest;
      }
    }

    damageEnemy(enemy, amount) {
      if (enemy.dead) return;
      enemy.hp -= amount; enemy.alert = true;
      if (enemy.hp <= 0) {
        enemy.dead = true; this.kills += 1; this.xp += enemy.xp || 20;
        const salvage = enemy.model === 'drone' ? 55 : 30;
        this.salvage += salvage; this.carryValue += salvage;
        this.burst(enemy.x, enemy.y, enemy.model === 'drone' ? '#e69766' : '#b5c1a5', 15, 130);
        if (this.carriedCount() < this.capacity && Math.random() < (enemy.model === 'drone' ? .2 : .13)) {
          const gear = root.MechItems.generateItem(this.map.seed + ':drop:' + enemy.id + ':' + this.kills, this.app.profile.character.level, this.stats.lootLuck);
          this.gear.push(gear);
          this.app.feed('敌人掉落 <b>' + String(gear.name).replace(/[<>&]/g, '') + '</b>', true);
          this.burst(enemy.x, enemy.y, gear.color, 16, 110);
        }
        if (this.kills === 1 || this.kills % 4 === 0) this.app.feed('威胁清除 <b>' + this.kills + '</b>　回收合金 +' + salvage);
      }
    }

    damagePlayer(amount, partId) {
      const player = this.player;
      let damage = amount;
      let hitPart = null;
      if (player.mode === 'mech') {
        const ids = Object.keys(player.parts);
        hitPart = player.parts[partId] || player.parts[ids[Math.floor(Math.random() * ids.length)]];
        const globalArmor = player.parts.mechArmor.broken ? 0 : this.stats.mechArmor;
        const partReduction = hitPart.broken ? 0 : hitPart.armor / (hitPart.armor + 180);
        damage *= .78 * (1 - globalArmor) * (1 - partReduction);
      } else damage *= 1 - this.stats.infArmor;
      if (player.dashTime > 0) damage *= .45;
      if (player.mode === 'mech') {
        player.mechHp -= damage;
        hitPart.hp = Math.max(0, hitPart.hp - damage);
        if (hitPart.hp <= 0 && !hitPart.broken) {
          hitPart.broken = true;
          this.app.feed('<b>' + hitPart.name + '损毁</b>，性能受到影响');
          this.app.toast(hitPart.name + '损毁', true);
          this.burst(player.x, player.y, '#ef8b68', 12, 100);
        }
      } else player.infHp -= damage;
      player.flash = .6;
      this.app.damageFlash();
      if (player.mode === 'mech' && (player.mechHp <= 0 || player.parts.mechTorso.broken)) this.emergencyEject();
      else if (player.mode === 'infantry' && player.infHp <= 0) this.finish(false, '驾驶员生命信号消失，携带物资遗失');
    }

    burst(x, y, color, count, speed) {
      for (let i = 0; i < count; i += 1) {
        const angle = Math.random() * Math.PI * 2;
        const velocity = speed * (.25 + Math.random() * .75);
        const life = .2 + Math.random() * .45;
        this.particles.push({ x, y, vx: Math.cos(angle) * velocity, vy: Math.sin(angle) * velocity, life, maxLife: life, size: 1 + Math.random() * 4, color });
      }
      if (this.particles.length > 400) this.particles.splice(0, this.particles.length - 400);
    }

    updateParticles(dt) {
      this.particles.forEach(function (p) {
        p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .94; p.vy *= .94;
      });
      this.particles = this.particles.filter(function (p) { return p.life > 0; });
      this.lightning.forEach(function (arc) { arc.life -= dt; });
      this.lightning = this.lightning.filter(function (arc) { return arc.life > 0; });
    }

    updateHud() {
      const ui = this.app.ui;
      const player = this.player;
      const hp = Math.max(0, Math.ceil(this.currentHp()));
      ui.healthFill.style.width = Math.max(0, this.currentHp() / this.maxHp() * 100) + '%';
      ui.healthFill.style.background = hp < this.maxHp() * .3 ? '#ef6f65' : '#82e6d8';
      ui.healthLabel.textContent = hp + '/' + this.maxHp();
      ui.formLabel.textContent = player.mode === 'mech' ? '机甲' : '单兵';
      ui.heatRow.classList.toggle('hidden', player.mode !== 'mech');
      ui.heatFill.style.width = player.heat + '%';
      ui.heatFill.style.background = player.overheated ? '#ef6f65' : '#efb76d';
      ui.heatLabel.textContent = Math.round(player.heat) + '%';
      ui.systemsStatus.classList.toggle('hidden', player.mode !== 'mech');
      ui.partStatus.classList.toggle('hidden', player.mode !== 'mech');
      if (player.mode === 'mech') {
        const systems = this.systems;
        ui.systemsStatus.textContent = '出力 ' + systems.powerUsed + '/' + systems.powerOutput + ' kW · 负重 ' + systems.weightUsed + '/' + systems.weightCapacity + ' t · 转向 ' + systems.turnRate + '°/s' + (systems.overloaded ? ' · 超载' : '') + (systems.powerShortage ? ' · 供电不足' : '');
        ui.systemsStatus.classList.toggle('warning', systems.overloaded || systems.powerShortage);
        Object.keys(player.parts).forEach(function (key, index) {
          const part = player.parts[key]; const chip = ui.partStatus.children[index];
          chip._fill.style.width = Math.max(0, part.hp / part.maxHp * 100) + '%';
          chip._hp.textContent = Math.ceil(part.hp) + '/' + part.maxHp;
          chip.classList.toggle('broken', part.broken);
        });
      }
      const state = this.currentWeapon();
      ui.weaponIndex.textContent = '0' + (this.active[player.mode] + 1);
      ui.weaponKind.textContent = this.active[player.mode] === 0 ? '主武器' : '副武器';
      ui.weaponName.textContent = state.weapon.name;
      ui.ammoLabel.textContent = state.ammo + ' / ' + state.weapon.mag;
      ui.reloadLabel.textContent = state.reloadLeft > 0 ? '装填中 ' + state.reloadLeft.toFixed(1) + 's' : (player.overheated ? '武器过热 · 等待冷却' : 'R 装填 · 1/2 切换');
      ui.carryValue.textContent = this.carryValue.toLocaleString();
      ui.carryItems.textContent = '背包 ' + this.carriedCount() + '/' + this.capacity + ' · 装备 ' + this.gear.length + (this.salvage ? ' · 合金 ' + this.salvage : '');
      const seconds = Math.ceil(this.timeLeft);
      ui.missionTime.textContent = String(Math.floor(seconds / 60)).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0');
      ui.missionTime.parentElement.classList.toggle('danger', seconds <= 60);
      ui.dashHud.querySelector('span').textContent = player.dashCooldown <= 0 ? '冲刺就绪' : '冷却 ' + player.dashCooldown.toFixed(1) + 's';

      const inside = Core.buildingAt(this.map, player.x, player.y);
      if (this.extractProgress > 0) {
        ui.objectiveText.textContent = '撤离认证中 ' + Math.round(this.extractProgress / 3 * 100) + '%';
        ui.objectiveSub.textContent = '保持在绿色撤离区域内';
      } else if (this.carriedCount() > 0) {
        ui.objectiveText.textContent = '物资已获取 · 前往绿色撤离信标';
        ui.objectiveSub.textContent = '也可继续搜索，撤离后物资与装备才会入账';
      } else {
        ui.objectiveText.textContent = '搜索物资并抵达撤离点';
        ui.objectiveSub.textContent = inside ? inside.label + ' · 按住 E 搜索容器' : '跟随绿色信标 · 建筑内需离机进入';
      }
      this.updatePrompt(inside);
    }

    updatePrompt(inside) {
      const prompt = this.app.ui.interactPrompt;
      const title = prompt.querySelector('strong');
      const subtitle = prompt.querySelector('span');
      const fill = prompt.querySelector('i');
      let show = false; let progress = this.extractProgress / 3;
      if (this.extractProgress > 0) {
        show = true; title.textContent = '撤离认证中'; subtitle.textContent = '停留 3 秒，不要离开信号区域';
      } else if (this.player.mode === 'infantry' && this.nearParkedMech()) {
        show = true; title.textContent = '[ E ] 登上机甲'; subtitle.textContent = '恢复重型武装与装甲防护'; progress = 0;
      } else if (this.searchTarget) {
        show = true; progress = this.searchTarget.progress;
        title.textContent = this.carriedCount() >= this.capacity ? '背包已满' : '[ E ] 按住搜索容器';
        subtitle.textContent = this.carriedCount() >= this.capacity ? '携带现有物资前往撤离点' : '可能发现带词缀装备 · 搜索需要 0.9 秒';
      } else if (this.player.mode === 'mech' && inside) {
        show = false;
      }
      prompt.classList.toggle('hidden', !show);
      if (show) fill.style.width = Core.clamp(progress, 0, 1) * 100 + '%';
    }

    finish(success, reason) {
      if (this.over) return;
      this.over = true;
      this.app.endRaid(this, success, reason);
    }
  }

  root.MechRaid = Raid;
})(typeof window !== 'undefined' ? window : globalThis);
