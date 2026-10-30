(function (root) {
  'use strict';

  const TAU = Math.PI * 2;

  function polygon(ctx, points, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i][0], points[i][1]);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
  }

  class Renderer {
    constructor(canvas, minimap) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.minimap = minimap;
      this.mapCtx = minimap.getContext('2d');
      this.width = 0;
      this.height = 0;
      this.dpr = 1;
      this.resize();
    }

    resize() {
      this.dpr = Math.min(2, window.devicePixelRatio || 1);
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.canvas.width = Math.round(this.width * this.dpr);
      this.canvas.height = Math.round(this.height * this.dpr);
      this.canvas.style.width = this.width + 'px';
      this.canvas.style.height = this.height + 'px';
    }

    begin() {
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.ctx.imageSmoothingEnabled = true;
      this.ctx.lineWidth = 1;
    }

    drawHangar(profile, tab, players, time) {
      const ctx = this.ctx;
      const w = this.width;
      const h = this.height;
      this.begin();
      const background = ctx.createLinearGradient(0, 0, 0, h);
      background.addColorStop(0, '#071013');
      background.addColorStop(0.55, '#14262a');
      background.addColorStop(1, '#091215');
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, w, h);

      const horizon = h * 0.48;
      ctx.fillStyle = '#101f23';
      ctx.fillRect(0, 65, w, horizon - 65);
      for (let x = 0; x < w; x += 185) {
        ctx.fillStyle = '#091316';
        ctx.fillRect(x, 66, 18, horizon - 66);
        ctx.fillStyle = '#24373a';
        ctx.fillRect(x + 18, 66, 2, horizon - 66);
      }
      ctx.fillStyle = '#26383a';
      ctx.fillRect(0, horizon - 10, w, 10);
      ctx.fillStyle = '#0c171a';
      ctx.fillRect(0, horizon, w, h - horizon);

      ctx.strokeStyle = 'rgba(86,128,127,.17)';
      for (let i = -10; i <= 10; i += 1) {
        ctx.beginPath(); ctx.moveTo(w / 2 + i * 60, horizon); ctx.lineTo(w / 2 + i * 180, h); ctx.stroke();
      }
      for (let y = horizon + 20; y < h; y += 42) {
        const spread = (y - horizon) / (h - horizon);
        ctx.globalAlpha = 0.3 + spread * 0.4;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
      ctx.globalAlpha = 1;

      const centerX = w / 2;
      const floorY = Math.min(h - 150, horizon + 270);
      ctx.save();
      ctx.translate(centerX, floorY - 4);
      ctx.scale(1, 0.24);
      ctx.beginPath(); ctx.arc(0, 0, 180, 0, TAU); ctx.fillStyle = '#050c0e'; ctx.fill();
      ctx.lineWidth = 5; ctx.strokeStyle = '#30494a'; ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 145, 0, TAU); ctx.lineWidth = 2; ctx.strokeStyle = '#a9854e'; ctx.setLineDash([30, 18]); ctx.stroke();
      ctx.restore(); ctx.setLineDash([]);

      ctx.fillStyle = '#1b2b2e';
      ctx.fillRect(centerX - 220, 125, 16, floorY - 130);
      ctx.fillRect(centerX + 204, 125, 16, floorY - 130);
      ctx.fillStyle = '#2c4041';
      ctx.fillRect(centerX - 225, 125, 445, 14);
      ctx.fillStyle = '#c39a55';
      for (let x = centerX - 215; x < centerX + 205; x += 40) ctx.fillRect(x, 129, 18, 4);
      ctx.strokeStyle = '#334a4a';
      ctx.beginPath(); ctx.moveTo(centerX - 170, 140); ctx.lineTo(centerX - 170, 220); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(centerX + 170, 140); ctx.lineTo(centerX + 170, 220); ctx.stroke();

      const remotePlayers = players.filter(function (p) { return !p.local; }).slice(0, 3);
      remotePlayers.forEach(function (player, index) {
        const rx = centerX + (index - 1) * 160 - 150;
        ctx.globalAlpha = 0.24;
        this.drawHangarMech(rx, floorY - 8, 0.42, player.color || '#70958e', time + index);
        ctx.globalAlpha = 1;
      }, this);

      const frame = root.MechItems.chassis[profile.mech.chassis];
      const baseScale = Math.max(0.72, Math.min(1.14, h / 800));
      const scale = baseScale * frame.scale;
      if (tab === 'mech') {
        this.drawHangarMech(centerX, floorY, scale, profile.mech.paint, time, frame.model);
      } else {
        ctx.globalAlpha = 0.2;
        this.drawHangarMech(centerX + 60, floorY, scale * 0.94, profile.mech.paint, time, frame.model);
        ctx.globalAlpha = 1;
        this.drawHangarInfantry(centerX - 65, floorY, baseScale * .62, '#82e6d8', time);
      }

      const light = ctx.createRadialGradient(centerX, floorY - 200, 10, centerX, floorY - 200, 350);
      light.addColorStop(0, 'rgba(153,220,201,.08)'); light.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = light; ctx.fillRect(centerX - 360, 80, 720, floorY);
      ctx.fillStyle = 'rgba(5,12,14,.35)'; ctx.fillRect(0, h - 74, w, 74);
    }

    drawHangarMech(x, floorY, scale, color, time, model) {
      const ctx = this.ctx;
      ctx.save();
      ctx.translate(x, floorY + Math.sin(time * 1.5) * 1.5);
      ctx.scale(scale, scale);
      ctx.lineWidth = 2;
      if (root.MechLegacyModels && root.MechLegacyModels.isLegacy(model)) {
        root.MechLegacyModels.drawHangar(ctx, model, color, time);
        ctx.restore();
        return;
      }
      ctx.fillStyle = '#050b0d';
      ctx.beginPath(); ctx.ellipse(0, 3, 92, 14, 0, 0, TAU); ctx.fill();

      polygon(ctx, [[-66,-135],[-28,-140],[-20,-80],[-32,-24],[-43,-5],[-83,-5],[-80,-20],[-62,-29]], '#243b3d', '#425c59');
      polygon(ctx, [[28,-140],[66,-135],[62,-29],[80,-20],[83,-5],[43,-5],[32,-24],[20,-80]], '#243b3d', '#425c59');
      polygon(ctx, [[-74,-21],[-35,-21],[-31,-4],[-86,-4]], '#17282b');
      polygon(ctx, [[35,-21],[74,-21],[86,-4],[31,-4]], '#17282b');
      ctx.fillStyle = '#a9854e'; ctx.fillRect(-67, -58, 24, 4); ctx.fillRect(43, -58, 24, 4);
      ctx.fillStyle = '#111e21'; ctx.fillRect(-58, -110, 22, 44); ctx.fillRect(36, -110, 22, 44);
      ctx.fillStyle = '#47625e'; ctx.fillRect(-54, -107, 14, 33); ctx.fillRect(40, -107, 14, 33);

      polygon(ctx, [[-67,-246],[-40,-270],[40,-270],[67,-246],[59,-151],[34,-125],[-34,-125],[-59,-151]], color, '#8aa099');
      polygon(ctx, [[-48,-239],[-27,-257],[27,-257],[48,-239],[39,-171],[0,-151],[-39,-171]], '#304a49');
      polygon(ctx, [[-28,-239],[28,-239],[34,-203],[0,-183],[-34,-203]], '#132629', '#4f716b');
      ctx.fillStyle = '#87e6d3'; ctx.fillRect(-18, -228, 36, 5);
      ctx.fillStyle = 'rgba(126,230,210,.24)'; ctx.fillRect(-14, -217, 28, 20);
      ctx.fillStyle = '#d5aa60'; ctx.fillRect(-4, -164, 8, 17);
      ctx.fillStyle = '#1a2c2e'; ctx.fillRect(-44, -193, 9, 36); ctx.fillRect(35, -193, 9, 36);
      ctx.fillStyle = '#8ea69c'; ctx.font = 'bold 11px monospace'; ctx.fillText('04', -43, -249);
      ctx.fillStyle = '#b5c6b8'; ctx.font = '7px monospace'; ctx.fillText('MX', 24, -249);

      polygon(ctx, [[-66,-249],[-106,-241],[-122,-210],[-109,-177],[-71,-185],[-56,-218]], '#48645f', '#789188');
      polygon(ctx, [[66,-249],[106,-241],[122,-210],[109,-177],[71,-185],[56,-218]], '#48645f', '#789188');
      polygon(ctx, [[-112,-207],[-135,-193],[-127,-116],[-100,-108],[-82,-127],[-88,-183]], '#2c4645', '#58736c');
      polygon(ctx, [[112,-207],[136,-193],[145,-130],[126,-112],[102,-127],[88,-183]], '#2c4645', '#58736c');
      ctx.fillStyle = '#101f22'; ctx.fillRect(-127, -174, 28, 38); ctx.fillRect(106, -177, 31, 48);
      ctx.fillStyle = '#b18d55'; ctx.fillRect(-120, -165, 14, 4); ctx.fillRect(112, -167, 18, 4);
      polygon(ctx, [[-128,-116],[-105,-110],[-108,-82],[-133,-88]], '#17282a');
      polygon(ctx, [[126,-116],[145,-130],[148,-93],[130,-84]], '#17282a');
      ctx.fillStyle = '#111d20'; ctx.fillRect(128, -151, 43, 17); ctx.fillRect(158, -147, 35, 9);
      ctx.fillStyle = '#67847a'; ctx.fillRect(137, -148, 20, 4);

      ctx.fillStyle = '#273e3f'; ctx.fillRect(-52, -291, 104, 29);
      polygon(ctx, [[-31,-302],[28,-302],[40,-284],[27,-268],[-27,-268],[-40,-284]], '#395552', '#718b81');
      ctx.fillStyle = '#0d1d20'; ctx.fillRect(-26, -289, 52, 10);
      ctx.fillStyle = '#9ff1d9'; ctx.fillRect(-17, -286, 34, 3);
      ctx.fillStyle = '#a8844e'; ctx.fillRect(-46, -307, 5, 29);
      ctx.fillStyle = '#6d8b80'; ctx.fillRect(38, -316, 3, 23);
      ctx.fillStyle = '#efb76d'; ctx.beginPath(); ctx.arc(39.5, -317, 2 + Math.sin(time * 3) * .5, 0, TAU); ctx.fill();
      this.drawHangarDesign(model || 'assault', color);
      ctx.restore();
    }

    drawHangarDesign(model, color) {
      const ctx = this.ctx;
      if (model === 'scout') {
        polygon(ctx, [[-51,-280],[-72,-318],[-54,-309],[-35,-283]], '#56756d', '#9ab1a4');
        ctx.fillStyle = '#1a2d2d'; ctx.fillRect(-78,-74,15,42); ctx.fillRect(63,-74,15,42);
        ctx.fillStyle = '#82e6d8'; ctx.fillRect(-76,-39,11,3); ctx.fillRect(65,-39,11,3);
      } else if (model === 'bastion') {
        polygon(ctx, [[-126,-248],[-91,-269],[-60,-252],[-69,-214],[-116,-210]], '#455c58', '#91a198');
        polygon(ctx, [[126,-248],[91,-269],[60,-252],[69,-214],[116,-210]], '#455c58', '#91a198');
        ctx.fillStyle = '#263a39'; ctx.fillRect(-52,-189,104,24); ctx.fillStyle = '#87988b'; ctx.fillRect(-45,-184,90,4);
      } else if (model === 'ronin') {
        polygon(ctx, [[-118,-222],[-151,-190],[-164,-102],[-143,-91],[-119,-174]], '#3e5953', '#91a99b');
        ctx.fillStyle = '#172827'; ctx.fillRect(-157,-104,10,35);
        polygon(ctx, [[-162,-72],[-146,-72],[-153,40],[-169,66],[-173,36]], '#a8c5ba', '#e1eee3');
        ctx.fillStyle = '#e7b869'; ctx.fillRect(-164,-78,22,5);
        polygon(ctx, [[62,-270],[98,-292],[91,-254]], '#7d6650', '#c1a77b');
      } else if (model === 'artillery') {
        ctx.fillStyle = '#263b3a'; ctx.fillRect(-133,-310,70,62); ctx.fillRect(63,-310,70,62);
        ctx.fillStyle = '#61776b'; ctx.fillRect(-128,-305,60,51); ctx.fillRect(68,-305,60,51);
        for (let side = -1; side <= 1; side += 2) {
          for (let row = 0; row < 2; row += 1) for (let col = 0; col < 3; col += 1) {
            ctx.fillStyle = '#101d1e'; ctx.beginPath(); ctx.arc(side * 98 + (col - 1) * 17, -293 + row * 23, 6, 0, TAU); ctx.fill();
            ctx.fillStyle = '#d08d5b'; ctx.beginPath(); ctx.arc(side * 98 + (col - 1) * 17, -293 + row * 23, 2, 0, TAU); ctx.fill();
          }
        }
      } else if (model === 'aegis') {
        polygon(ctx, [[-178,-277],[-122,-266],[-111,-91],[-151,-39],[-190,-70],[-196,-220]], '#314a48', '#91aaa0');
        polygon(ctx, [[-169,-250],[-134,-244],[-128,-106],[-153,-67],[-177,-87],[-181,-211]], '#1a302f', '#637f75');
        ctx.fillStyle = '#82e6d8'; ctx.fillRect(-158,-231,5,135); ctx.fillStyle = '#c4a563'; ctx.fillRect(-174,-158,37,5);
        polygon(ctx, [[68,-273],[121,-261],[133,-207],[94,-193],[62,-224]], '#4b625a', '#9baca0');
      } else if (model === 'spectre') {
        polygon(ctx, [[-56,-262],[-135,-284],[-105,-235],[-62,-214]], '#263c3c', '#718c86');
        polygon(ctx, [[56,-262],[135,-284],[105,-235],[62,-214]], '#263c3c', '#718c86');
        polygon(ctx, [[-35,-307],[0,-329],[35,-307],[23,-283],[-23,-283]], '#243b3c', '#74968f');
        ctx.fillStyle = '#d28df0'; ctx.fillRect(-25,-295,50,3);
        ctx.fillStyle = '#142726'; ctx.fillRect(-55,-153,12,92); ctx.fillRect(43,-153,12,92);
      } else if (model === 'mantis') {
        ctx.strokeStyle = '#68847a'; ctx.lineWidth = 13; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-48,-142); ctx.lineTo(-112,-91); ctx.lineTo(-139,-17); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(48,-142); ctx.lineTo(112,-91); ctx.lineTo(139,-17); ctx.stroke();
        ctx.fillStyle = '#263d3a'; ctx.fillRect(-157,-15,37,10); ctx.fillRect(120,-15,37,10);
        polygon(ctx, [[-117,-198],[-170,-161],[-154,-143],[-102,-173]], '#4d6b61', '#9aaf9e');
        polygon(ctx, [[117,-198],[170,-161],[154,-143],[102,-173]], '#4d6b61', '#9aaf9e');
        ctx.fillStyle = '#c6a763'; ctx.fillRect(-7,-329,14,30);
      } else if (model === 'longbow') {
        ctx.fillStyle = '#1a2c2c'; ctx.fillRect(85,-228,67,30); ctx.fillRect(135,-217,82,12);
        ctx.fillStyle = '#70887d'; ctx.fillRect(143,-214,73,4); ctx.fillStyle = '#b9d9ca'; ctx.fillRect(211,-216,10,8);
        ctx.fillStyle = '#2b4340'; ctx.fillRect(92,-253,32,20); ctx.fillStyle = '#8cf5ff'; ctx.fillRect(99,-248,18,5);
        polygon(ctx, [[-62,-269],[-95,-305],[-83,-257]], '#536c63', '#9aafa2');
      } else if (model === 'redDragon') {
        polygon(ctx, [[-61,-262],[-161,-309],[-132,-239],[-72,-195]], '#5f3632', '#c47b61');
        polygon(ctx, [[61,-262],[161,-309],[132,-239],[72,-195]], '#5f3632', '#c47b61');
        polygon(ctx, [[-28,-301],[-50,-338],[-12,-312]], '#80513f', '#e0a16f'); polygon(ctx, [[28,-301],[50,-338],[12,-312]], '#80513f', '#e0a16f');
        ctx.fillStyle = '#ff9a62'; ctx.fillRect(-22,-286,44,4);
      } else if (model === 'ironGolem') {
        ctx.strokeStyle = '#81948a'; ctx.lineWidth = 13; ctx.beginPath(); ctx.arc(0,-207,55,0,TAU); ctx.stroke();
        ctx.fillStyle = '#243a38'; ctx.beginPath(); ctx.arc(0,-207,38,0,TAU); ctx.fill();
        ctx.fillStyle = '#9ff1d9'; ctx.beginPath(); ctx.arc(0,-207,13,0,TAU); ctx.fill();
        ctx.fillStyle = '#536b62'; ctx.beginPath(); ctx.arc(-103,-226,27,0,TAU); ctx.fill(); ctx.beginPath(); ctx.arc(103,-226,27,0,TAU); ctx.fill();
      } else if (model === 'bebeDragon') {
        ctx.fillStyle = '#303f3c'; ctx.fillRect(-120,-322,48,76); ctx.fillRect(72,-322,48,76);
        for (let side = -1; side <= 1; side += 2) for (let i = 0; i < 3; i += 1) {
          ctx.fillStyle = '#131f20'; ctx.beginPath(); ctx.arc(side * 96,-307+i*23,8,0,TAU); ctx.fill();
          ctx.fillStyle = '#d69b63'; ctx.beginPath(); ctx.arc(side * 96,-307+i*23,3,0,TAU); ctx.fill();
        }
        polygon(ctx, [[-40,-159],[0,-125],[40,-159],[29,-105],[0,-78],[-29,-105]], '#574a3a', '#b59665');
      } else if (model === 'fierceFire') {
        ctx.fillStyle = '#2b403d'; ctx.fillRect(-133,-260,65,35); ctx.fillRect(68,-260,65,35);
        for (let side = -1; side <= 1; side += 2) for (let i = 0; i < 3; i += 1) {
          ctx.fillStyle = '#d09b63'; ctx.fillRect(side * 100-22+i*16,-252,9,19);
        }
        ctx.fillStyle = '#a9c1af'; ctx.fillRect(-4,-333,8,30);
      } else if (model === 'toxicSpider') {
        ctx.strokeStyle = '#637d70'; ctx.lineWidth = 12; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-44,-142); ctx.lineTo(-121,-90); ctx.lineTo(-145,-12); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(44,-142); ctx.lineTo(121,-90); ctx.lineTo(145,-12); ctx.stroke();
        ctx.fillStyle = '#263d37'; ctx.beginPath(); ctx.ellipse(0,-205,72,82,0,0,TAU); ctx.fill();
        ctx.strokeStyle = '#8b9f8e'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0,-205,72,82,0,0,TAU); ctx.stroke();
        for (let i = 0; i < 4; i += 1) { ctx.fillStyle = '#d5ef8b'; ctx.beginPath(); ctx.arc(-20+i*13,-286,4,0,TAU); ctx.fill(); }
        ctx.fillStyle = '#233832'; ctx.fillRect(-163,-14,38,10); ctx.fillRect(125,-14,38,10);
      } else if (model === 'whirlwind') {
        ctx.fillStyle = '#203735'; ctx.beginPath(); ctx.ellipse(-65,-18,43,18,0,0,TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(65,-18,43,18,0,0,TAU); ctx.fill();
        ctx.strokeStyle = '#8aa79b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(-65,-18,34,12,0,0,TAU); ctx.stroke(); ctx.beginPath(); ctx.ellipse(65,-18,34,12,0,0,TAU); ctx.stroke();
        ctx.fillStyle = '#82e6d8'; ctx.fillRect(-91,-20,52,3); ctx.fillRect(39,-20,52,3);
        polygon(ctx, [[-72,-251],[-130,-269],[-102,-230]], '#34534e', '#8ca9a0'); polygon(ctx, [[72,-251],[130,-269],[102,-230]], '#34534e', '#8ca9a0');
      } else if (model === 'thor') {
        ctx.fillStyle = '#263a38'; ctx.fillRect(-143,-288,72,55); ctx.fillRect(71,-288,72,55);
        for (let side = -1; side <= 1; side += 2) for (let i = 0; i < 6; i += 1) {
          ctx.fillStyle = '#101e1e'; ctx.fillRect(side * 107-24+(i%3)*18,-278+Math.floor(i/3)*22,12,15);
          ctx.fillStyle = '#d09b63'; ctx.fillRect(side * 107-21+(i%3)*18,-275+Math.floor(i/3)*22,6,8);
        }
        ctx.fillStyle = '#72877a'; ctx.fillRect(-57,-182,114,13);
      } else if (model === 'redFlame') {
        ctx.fillStyle = '#593c32'; ctx.fillRect(-148,-227,32,100); ctx.fillRect(116,-227,32,100);
        ctx.fillStyle = '#a96545'; ctx.fillRect(-143,-217,22,77); ctx.fillRect(121,-217,22,77);
        ctx.strokeStyle = '#d48b55'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-127,-140); ctx.lineTo(-64,-178); ctx.stroke(); ctx.beginPath(); ctx.moveTo(127,-140); ctx.lineTo(64,-178); ctx.stroke();
        polygon(ctx, [[166,-159],[220,-145],[181,-131],[214,-111],[165,-121]], '#ff9b58', '#ffd08a');
        ctx.fillStyle = '#ffcf75'; ctx.fillRect(-22,-288,44,4);
      } else if (model === 'landen') {
        ctx.fillStyle = '#203332'; ctx.fillRect(-167,-238,61,34); ctx.fillRect(106,-238,61,34);
        ctx.fillStyle = '#657d74'; ctx.fillRect(-183,-230,64,16); ctx.fillRect(119,-230,64,16);
        ctx.fillStyle = '#c98af0'; ctx.fillRect(-188,-227,16,9); ctx.fillRect(172,-227,16,9);
        polygon(ctx, [[-37,-315],[0,-335],[37,-315],[23,-287],[-23,-287]], '#3b4c51', '#9b9fd1');
        ctx.fillStyle = '#d9a4ff'; ctx.fillRect(-18,-306,36,4);
      } else if (model === 'odin') {
        polygon(ctx, [[-57,-260],[-131,-304],[-106,-223]], '#3b5150', '#91b4aa'); polygon(ctx, [[57,-260],[131,-304],[106,-223]], '#3b5150', '#91b4aa');
        ctx.fillStyle = '#1d3333'; ctx.fillRect(-171,-222,67,20); ctx.fillRect(104,-222,67,20);
        ctx.fillStyle = '#82e6d8'; ctx.fillRect(-178,-218,18,12); ctx.fillRect(160,-218,18,12);
        ctx.strokeStyle = '#9ff1d9'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0,-205,33,0,TAU); ctx.stroke();
        ctx.fillStyle = '#d6b86c'; ctx.fillRect(-4,-338,8,34);
      }
    }

    drawHangarInfantry(x, floorY, scale, color, time) {
      const ctx = this.ctx;
      ctx.save(); ctx.translate(x, floorY); ctx.scale(scale, scale);
      ctx.fillStyle = '#050b0d'; ctx.beginPath(); ctx.ellipse(0, 0, 32, 8, 0, 0, TAU); ctx.fill();
      polygon(ctx, [[-23,-70],[-4,-70],[-7,-9],[-13,0],[-30,0],[-25,-13]], '#263f3e');
      polygon(ctx, [[4,-70],[23,-70],[25,-13],[30,0],[13,0],[7,-9]], '#263f3e');
      polygon(ctx, [[-30,-143],[-20,-157],[20,-157],[30,-143],[24,-69],[-24,-69]], '#46625b', '#7d998d');
      polygon(ctx, [[-22,-134],[22,-134],[17,-93],[-17,-93]], '#263d3b');
      ctx.fillStyle = '#b5d6c8'; ctx.fillRect(-13, -121, 26, 3);
      ctx.fillStyle = '#182c2d'; ctx.fillRect(-35, -140, 13, 56); ctx.fillRect(22, -140, 13, 56);
      polygon(ctx, [[-23,-178],[-12,-190],[12,-190],[23,-178],[18,-151],[-18,-151]], '#314c48', '#7c978b');
      ctx.fillStyle = '#0e2224'; ctx.fillRect(-17, -176, 34, 13);
      ctx.fillStyle = color; ctx.fillRect(-13, -172, 26, 3);
      ctx.save(); ctx.translate(14, -114); ctx.rotate(-0.35 + Math.sin(time) * .01);
      ctx.fillStyle = '#172729'; ctx.fillRect(-6, -6, 65, 13); ctx.fillRect(43, -3, 36, 6);
      ctx.fillStyle = '#6f8b7e'; ctx.fillRect(3, -4, 28, 3); ctx.restore();
      ctx.restore();
    }

    drawMission(raid, remotes, time) {
      const ctx = this.ctx;
      const w = this.width;
      const h = this.height;
      const map = raid.map;
      const player = raid.player;
      this.begin();
      ctx.fillStyle = '#111c1e'; ctx.fillRect(0, 0, w, h);
      const camera = raid.camera;
      ctx.save(); ctx.translate(-camera.x, -camera.y);
      ctx.fillStyle = '#182527'; ctx.fillRect(0, 0, map.width, map.height);

      const grid = 80;
      const startX = Math.floor(camera.x / grid) * grid;
      const startY = Math.floor(camera.y / grid) * grid;
      ctx.strokeStyle = 'rgba(104,137,132,.08)';
      for (let x = Math.max(0, startX); x < Math.min(map.width, camera.x + w + grid); x += grid) {
        ctx.beginPath(); ctx.moveTo(x, Math.max(0, camera.y)); ctx.lineTo(x, Math.min(map.height, camera.y + h)); ctx.stroke();
      }
      for (let y = Math.max(0, startY); y < Math.min(map.height, camera.y + h + grid); y += grid) {
        ctx.beginPath(); ctx.moveTo(Math.max(0, camera.x), y); ctx.lineTo(Math.min(map.width, camera.x + w), y); ctx.stroke();
      }
      ctx.fillStyle = '#202e2f'; ctx.fillRect(0, 790, map.width, 220);
      ctx.fillStyle = '#3b4240'; ctx.fillRect(0, 794, map.width, 3); ctx.fillRect(0, 1003, map.width, 3);
      ctx.fillStyle = '#756e52';
      for (let x = 0; x < map.width; x += 105) ctx.fillRect(x, 897, 50, 4);
      map.decals.forEach(function (d) {
        if (d.x < camera.x - 20 || d.x > camera.x + w + 20 || d.y < camera.y - 20 || d.y > camera.y + h + 20) return;
        ctx.globalAlpha = 0.13 + d.tone * 0.1; ctx.fillStyle = d.tone > .5 ? '#89a19a' : '#050e10';
        ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, TAU); ctx.fill();
      });
      ctx.globalAlpha = 1;

      this.drawExtraction(map.extraction, time);
      raid.debris.forEach(function (piece) {
        ctx.globalAlpha = .5; ctx.fillStyle = piece.type === 'wall' ? '#29332f' : '#171f1d';
        ctx.beginPath(); ctx.ellipse(piece.x, piece.y, Math.max(12, piece.w * .55), Math.max(6, piece.h * .45), 0, 0, TAU); ctx.fill();
        ctx.globalAlpha = .75; ctx.fillStyle = piece.type === 'rock' ? '#615c4e' : '#4b5147';
        for (let i = 0; i < 5; i += 1) ctx.fillRect(piece.x - 13 + i * 6, piece.y - 5 + (i % 2) * 7, 7, 5);
      });
      ctx.globalAlpha = 1;
      const inside = player.mode === 'infantry' ? root.MechCore.buildingAt(map, player.x, player.y) : null;
      map.buildings.forEach(function (building) { this.drawBuilding(building, inside && inside.id === building.id); }, this);

      map.obstacles.forEach(function (o) {
        if (o.destroyed) return;
        const spriteName = o.kind === 'rock' ? 'rock' : (o.kind === 'scrap' ? 'scrap' : (o.w < 60 && o.h < 60 ? 'barrel' : 'barrier'));
        if (root.MechAssets.ready(spriteName)) {
          ctx.drawImage(root.MechAssets.getImage(spriteName), o.x - 7, o.y - 7, o.w + 14, o.h + 14);
          this.drawObjectDamage(o);
          return;
        }
        ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(o.x + 7, o.y + 8, o.w, o.h);
        ctx.fillStyle = o.kind === 'rock' ? '#514e43' : (o.kind === 'scrap' ? '#354442' : '#4b5148'); ctx.fillRect(o.x, o.y, o.w, o.h);
        ctx.strokeStyle = '#657066'; ctx.strokeRect(o.x + 2, o.y + 2, o.w - 4, o.h - 4);
        ctx.fillStyle = '#b39255';
        if (o.kind === 'barrier') for (let x = o.x + 6; x < o.x + o.w - 6; x += 23) ctx.fillRect(x, o.y + 4, 9, 3);
        this.drawObjectDamage(o);
      }, this);

      map.crates.forEach(function (crate) {
        if (crate.indoors && (!inside || inside.id !== crate.building)) return;
        if (!crate.opened && root.MechAssets.ready('crate')) {
          ctx.globalAlpha = .18 + Math.sin(time * 3 + crate.x) * .08; ctx.fillStyle = '#f2cf75'; ctx.fillRect(crate.x - 21, crate.y - 20, 42, 42); ctx.globalAlpha = 1;
          ctx.drawImage(root.MechAssets.getImage('crate'), crate.x - 21, crate.y - 21, 42, 42);
          return;
        }
        ctx.fillStyle = crate.opened ? '#263331' : '#675c3e'; ctx.fillRect(crate.x - 14, crate.y - 11, 28, 22);
        ctx.strokeStyle = crate.opened ? '#52615b' : '#c6a968'; ctx.strokeRect(crate.x - 14, crate.y - 11, 28, 22);
        ctx.fillStyle = crate.opened ? '#182321' : '#dbc177'; ctx.fillRect(crate.x - 2, crate.y - 11, 4, 22);
        if (!crate.opened) { ctx.globalAlpha = .25 + Math.sin(time * 3 + crate.x) * .12; ctx.fillStyle = '#f2cf75'; ctx.fillRect(crate.x - 20, crate.y - 18, 40, 36); ctx.globalAlpha = 1; }
      });

      if (raid.parkedMech && !raid.parkedMech.destroyed) {
        this.drawMechUnit(raid.parkedMech.x, raid.parkedMech.y, raid.parkedMech.angle, raid.app.profile.mech.paint, root.MechItems.chassis[raid.app.profile.mech.chassis].scale, false, true, root.MechItems.chassis[raid.app.profile.mech.chassis].model);
        ctx.strokeStyle = 'rgba(130,230,216,.3)'; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.arc(raid.parkedMech.x, raid.parkedMech.y, 32 + Math.sin(time * 2) * 2, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      }

      raid.enemies.forEach(function (enemy) {
        if (enemy.dead || (enemy.indoors && (!inside || inside.id !== enemy.building))) return;
        const spriteName = enemy.model === 'drone' ? 'drone' : 'raider';
        if (!enemy.custom && root.MechAssets.ready(spriteName)) {
          const size = enemy.model === 'drone' ? 58 : 48;
          ctx.save(); ctx.translate(enemy.x, enemy.y + (enemy.model === 'drone' ? Math.sin(time * 5 + enemy.x) * 2 : 0));
          ctx.rotate(enemy.angle + Math.PI / 2); ctx.scale(enemy.scale, enemy.scale);
          ctx.drawImage(root.MechAssets.getImage(spriteName), -size / 2, -size / 2, size, size); ctx.restore();
        } else if (enemy.model === 'drone') this.drawDrone(enemy, time);
        else this.drawInfantryUnit(enemy.x, enemy.y, enemy.angle, enemy.color, enemy.scale, true);
        if (enemy.hp < enemy.maxHp) {
          ctx.fillStyle = '#160e0e'; ctx.fillRect(enemy.x - 17, enemy.y - 27, 34, 3);
          ctx.fillStyle = '#d56b5d'; ctx.fillRect(enemy.x - 17, enemy.y - 27, 34 * Math.max(0, enemy.hp / enemy.maxHp), 3);
        }
      }, this);

      remotes.forEach(function (remote) {
        if (remote.state.status !== 'raid' || remote.state.seed !== map.seed) return;
        const x = Number(remote.state.x) || 0; const y = Number(remote.state.y) || 0;
        if (remote.state.mode === 'mech') this.drawMechUnit(x, y, remote.state.angle || 0, remote.color || '#82e6d8', 1, false, false);
        else this.drawInfantryUnit(x, y, remote.state.angle || 0, remote.color || '#82e6d8', 1, false);
        ctx.font = '9px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = remote.color || '#82e6d8'; ctx.fillText(remote.name, x, y - 32); ctx.textAlign = 'left';
      }, this);

      const playerFrame = root.MechItems.chassis[raid.app.profile.mech.chassis];
      if (player.mode === 'mech') this.drawMechUnit(player.x, player.y, player.angle, raid.app.profile.mech.paint, playerFrame.scale, false, false, playerFrame.model);
      else this.drawInfantryUnit(player.x, player.y, player.angle, '#9fe3cb', 1, false);

      raid.bullets.forEach(function (bullet) {
        const height = (bullet.z || 0) * .35;
        ctx.strokeStyle = bullet.color; ctx.lineWidth = bullet.owner === 'enemy' ? 2 : 2.5;
        ctx.globalAlpha = .85; ctx.beginPath(); ctx.moveTo(bullet.x - bullet.vx * .018, bullet.y - bullet.vy * .018 - height); ctx.lineTo(bullet.x, bullet.y - height); ctx.stroke();
        if (bullet.lob) { ctx.globalAlpha = .25; ctx.fillStyle = '#050b0d'; ctx.beginPath(); ctx.ellipse(bullet.x, bullet.y, 6, 3, 0, 0, TAU); ctx.fill(); }
      });
      raid.lightning.forEach(function (arc) {
        ctx.globalAlpha = Math.max(0, arc.life / arc.maxLife); ctx.strokeStyle = arc.color; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(arc.x1, arc.y1); ctx.lineTo(arc.x2, arc.y2); ctx.stroke();
      });
      ctx.globalAlpha = 1;
      raid.particles.forEach(function (p) {
        ctx.globalAlpha = Math.max(0, p.life / p.maxLife); ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      });
      ctx.globalAlpha = 1;
      ctx.restore();

      this.drawExtractionMarker(raid);
      this.drawMinimap(raid, remotes);
      if (player.flash > 0) {
        ctx.fillStyle = 'rgba(239,90,75,' + Math.min(.18, player.flash * .2) + ')'; ctx.fillRect(0, 0, w, h);
      }
    }

    drawObjectDamage(object) {
      if (object.hp === undefined || object.hp >= object.maxHp) return;
      const ctx = this.ctx; const cx = object.x + object.w / 2; const cy = object.y + object.h / 2;
      ctx.strokeStyle = '#1a211d'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(cx - 10, cy - 7); ctx.lineTo(cx - 2, cy); ctx.lineTo(cx - 8, cy + 9);
      ctx.moveTo(cx - 2, cy); ctx.lineTo(cx + 10, cy - 6); ctx.moveTo(cx - 2, cy); ctx.lineTo(cx + 8, cy + 8); ctx.stroke();
      if (object.hp < object.maxHp * .7) {
        ctx.fillStyle = '#121a17'; ctx.fillRect(object.x, object.y - 7, object.w, 3);
        ctx.fillStyle = '#d49a61'; ctx.fillRect(object.x, object.y - 7, object.w * Math.max(0, object.hp / object.maxHp), 3);
      }
    }

    drawBuilding(b, reveal) {
      const ctx = this.ctx;
      ctx.fillStyle = '#111c1e'; ctx.fillRect(b.x - 9, b.y - 9, b.w + 18, b.h + 18);
      ctx.fillStyle = '#283635'; ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = 'rgba(149,176,161,.1)';
      for (let x = b.x + 40; x < b.x + b.w; x += 40) { ctx.beginPath(); ctx.moveTo(x, b.y); ctx.lineTo(x, b.y + b.h); ctx.stroke(); }
      for (let y = b.y + 40; y < b.y + b.h; y += 40) { ctx.beginPath(); ctx.moveTo(b.x, y); ctx.lineTo(b.x + b.w, y); ctx.stroke(); }
      ctx.globalAlpha = reveal ? 0.15 : 0.92;
      ctx.fillStyle = b.tint; ctx.fillRect(b.x + 7, b.y + 7, b.w - 14, b.h - 14);
      ctx.strokeStyle = '#49605d'; ctx.lineWidth = 2; ctx.strokeRect(b.x + 15, b.y + 15, b.w - 30, b.h - 30);
      ctx.fillStyle = '#18282a';
      for (let x = b.x + 28; x < b.x + b.w - 20; x += 65) ctx.fillRect(x, b.y + 23, 36, 12);
      ctx.globalAlpha = 1;
      b.walls.forEach(function (wall) {
        if (wall.destroyed) return;
        ctx.fillStyle = '#0c1719'; ctx.fillRect(wall.x + 4, wall.y + 5, wall.w, wall.h);
        ctx.fillStyle = '#53635b'; ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
        ctx.fillStyle = '#738075'; ctx.fillRect(wall.x, wall.y, wall.w, 3);
        this.drawObjectDamage(wall);
      }, this);
      ctx.fillStyle = reveal ? '#a4d8c5' : '#728b83'; ctx.font = '9px monospace'; ctx.fillText(b.label, b.x + 22, b.y + 51);
      if (reveal) {
        ctx.fillStyle = '#82e6d8'; ctx.font = '8px sans-serif'; ctx.fillText('内部信号已连接', b.x + 22, b.y + 66);
      }
    }

    drawExtraction(extraction, time) {
      const ctx = this.ctx;
      const pulse = 1 + Math.sin(time * 2) * .05;
      ctx.save(); ctx.translate(extraction.x, extraction.y);
      ctx.globalAlpha = .13; ctx.fillStyle = '#8ef0a0'; ctx.beginPath(); ctx.arc(0, 0, extraction.radius * pulse, 0, TAU); ctx.fill();
      ctx.globalAlpha = .8; ctx.strokeStyle = '#91e5a0'; ctx.lineWidth = 2; ctx.setLineDash([14, 10]); ctx.beginPath(); ctx.arc(0, 0, extraction.radius, time * .25, time * .25 + TAU); ctx.stroke(); ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      if (root.MechAssets.ready('extraction')) ctx.drawImage(root.MechAssets.getImage('extraction'), -24, -72, 48, 72);
      else {
        ctx.fillStyle = '#9ce6a4'; ctx.fillRect(-2, -52, 4, 55);
        polygon(ctx, [[2,-51],[30,-41],[2,-31]], '#9ce6a4');
      }
      ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center'; ctx.fillText('EXFIL', 0, 19); ctx.textAlign = 'left'; ctx.restore();
    }

    drawExtractionMarker(raid) {
      const ctx = this.ctx;
      const ex = raid.map.extraction;
      const sx = ex.x - raid.camera.x;
      const sy = ex.y - raid.camera.y;
      if (sx > 50 && sx < this.width - 50 && sy > 90 && sy < this.height - 60) return;
      const x = root.MechCore.clamp(sx, 60, this.width - 60);
      const y = root.MechCore.clamp(sy, 105, this.height - 75);
      const angle = Math.atan2(sy - y, sx - x);
      ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.fillStyle = '#9be38d';
      polygon(ctx, [[13,0],[-8,-8],[-8,8]], '#9be38d'); ctx.rotate(-angle);
      ctx.font = '9px monospace'; ctx.textAlign = 'center'; ctx.fillText(Math.round(root.MechCore.distance(raid.player, ex) / 10) + 'm', 0, 23); ctx.restore(); ctx.textAlign = 'left';
    }

    drawMechUnit(x, y, angle, color, scale, enemy, parked, model, time) {
      const ctx = this.ctx;
      if (root.MechLegacyModels && root.MechLegacyModels.isLegacy(model)) {
        root.MechLegacyModels.drawTopdown(ctx, x, y, angle + Math.PI / 2, color, scale * 1.55, enemy, parked, model, time || 0);
        return;
      }
      const design = model || 'assault';
      ctx.save(); ctx.translate(x, y); ctx.rotate(angle + Math.PI / 2); ctx.scale(scale * 1.55, scale * 1.55);
      ctx.globalAlpha = parked ? .72 : 1;
      ctx.fillStyle = 'rgba(0,0,0,.32)'; ctx.beginPath(); ctx.ellipse(5, 8, 27, 20, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#233634'; ctx.fillRect(-24, -16, 12, 34); ctx.fillRect(12, -16, 12, 34);
      ctx.fillStyle = '#536c62'; ctx.fillRect(-25, -13, 10, 10); ctx.fillRect(15, -13, 10, 10); ctx.fillRect(-25, 8, 10, 10); ctx.fillRect(15, 8, 10, 10);
      if (design === 'mantis' || design === 'toxicSpider') {
        ctx.strokeStyle = '#607c70'; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.moveTo(-20,-8); ctx.lineTo(-40,20); ctx.stroke(); ctx.beginPath(); ctx.moveTo(20,-8); ctx.lineTo(40,20); ctx.stroke();
      }
      polygon(ctx, [[-18,-20],[18,-20],[24,-7],[18,18],[-18,18],[-24,-7]], color, '#a0b3a5');
      ctx.fillStyle = '#2b4540'; ctx.fillRect(-13, -12, 26, 23);
      ctx.fillStyle = enemy ? '#ff8b68' : (design === 'spectre' ? '#d28df0' : '#a0f1d8'); ctx.fillRect(-9, -16, 18, 4);
      ctx.fillStyle = '#172a29'; ctx.fillRect(-34, -13, 10, 30); ctx.fillRect(24, -13, 10, 30);
      ctx.fillStyle = '#53685e'; ctx.fillRect(-4, -40, 8, 35); ctx.fillRect(-2, -51, 4, 14);
      ctx.fillStyle = '#c0a365'; ctx.fillRect(-19, 13, 7, 3); ctx.fillRect(12, 13, 7, 3);
      if (design === 'artillery') {
        ctx.fillStyle = '#253b38'; ctx.fillRect(-39,-28,16,20); ctx.fillRect(23,-28,16,20);
        ctx.fillStyle = '#d08d5b'; ctx.fillRect(-35,-24,3,3); ctx.fillRect(-29,-24,3,3); ctx.fillRect(27,-24,3,3); ctx.fillRect(33,-24,3,3);
      } else if (design === 'aegis') {
        polygon(ctx, [[-49,-29],[-34,-25],[-34,24],[-49,32],[-57,19],[-57,-19]], '#243e3b', '#9aafa2');
        ctx.fillStyle = '#82e6d8'; ctx.fillRect(-48,-18,3,36);
      } else if (design === 'ronin') {
        polygon(ctx, [[-41,-2],[-34,-4],[-42,42],[-50,51],[-49,34]], '#b9d2c5', '#eef7ed');
      } else if (design === 'spectre') {
        polygon(ctx, [[-16,-21],[-42,-33],[-29,-8]], '#263e3b', '#78958b'); polygon(ctx, [[16,-21],[42,-33],[29,-8]], '#263e3b', '#78958b');
      } else if (design === 'longbow') {
        ctx.fillStyle = '#1a2c2b'; ctx.fillRect(-5,-72,10,45); ctx.fillStyle = '#8cf5ff'; ctx.fillRect(-2,-76,4,9);
      } else if (design === 'bastion') {
        ctx.fillStyle = '#4b625a'; ctx.fillRect(-40,-24,14,16); ctx.fillRect(26,-24,14,16);
      } else if (design === 'scout') {
        ctx.fillStyle = '#82e6d8'; ctx.fillRect(-29,14,5,3); ctx.fillRect(24,14,5,3);
      } else if (design === 'redDragon') {
        polygon(ctx, [[-15,-20],[-48,-37],[-35,-5]], '#6b3b34', '#cf8065'); polygon(ctx, [[15,-20],[48,-37],[35,-5]], '#6b3b34', '#cf8065');
        ctx.fillStyle = '#ff9a62'; ctx.fillRect(-11,-22,22,3);
      } else if (design === 'ironGolem') {
        ctx.strokeStyle = '#8ba196'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0,0,19,0,TAU); ctx.stroke();
        ctx.fillStyle = '#9ff1d9'; ctx.beginPath(); ctx.arc(0,0,6,0,TAU); ctx.fill();
      } else if (design === 'bebeDragon') {
        ctx.fillStyle = '#2a3d39'; ctx.fillRect(-42,-33,16,24); ctx.fillRect(26,-33,16,24);
        ctx.fillStyle = '#d69b63'; ctx.fillRect(-37,-28,5,5); ctx.fillRect(32,-28,5,5);
        polygon(ctx, [[-12,8],[0,25],[12,8],[8,28],[0,36],[-8,28]], '#68533d', '#c5a36b');
      } else if (design === 'fierceFire') {
        ctx.fillStyle = '#d09b63'; ctx.fillRect(-36,-25,5,16); ctx.fillRect(-27,-25,5,16); ctx.fillRect(22,-25,5,16); ctx.fillRect(31,-25,5,16);
      } else if (design === 'toxicSpider') {
        ctx.fillStyle = '#2a4139'; ctx.beginPath(); ctx.ellipse(0,0,25,29,0,0,TAU); ctx.fill();
        for (let i = 0; i < 4; i += 1) { ctx.fillStyle = '#d5ef8b'; ctx.beginPath(); ctx.arc(-12+i*8,-19,2.5,0,TAU); ctx.fill(); }
      } else if (design === 'whirlwind') {
        ctx.fillStyle = '#25433e'; ctx.beginPath(); ctx.ellipse(-29,10,18,10,0,0,TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(29,10,18,10,0,0,TAU); ctx.fill();
        ctx.fillStyle = '#82e6d8'; ctx.fillRect(-40,9,22,2); ctx.fillRect(18,9,22,2);
      } else if (design === 'thor') {
        ctx.fillStyle = '#263c38'; ctx.fillRect(-43,-30,18,23); ctx.fillRect(25,-30,18,23);
        ctx.fillStyle = '#d09b63'; ctx.fillRect(-38,-25,4,5); ctx.fillRect(-30,-25,4,5); ctx.fillRect(30,-25,4,5); ctx.fillRect(38,-25,4,5);
      } else if (design === 'redFlame') {
        ctx.fillStyle = '#a96545'; ctx.fillRect(-42,-14,11,31); ctx.fillRect(31,-14,11,31);
        polygon(ctx, [[-5,-48],[0,-67],[5,-48],[0,-54]], '#ff9b58', '#ffd08a');
      } else if (design === 'landen') {
        ctx.fillStyle = '#657d74'; ctx.fillRect(-43,-40,12,41); ctx.fillRect(31,-40,12,41);
        ctx.fillStyle = '#c98af0'; ctx.fillRect(-43,-44,12,7); ctx.fillRect(31,-44,12,7);
      } else if (design === 'odin') {
        polygon(ctx, [[-17,-20],[-43,-36],[-32,-3]], '#3b5150', '#91b4aa'); polygon(ctx, [[17,-20],[43,-36],[32,-3]], '#3b5150', '#91b4aa');
        ctx.strokeStyle = '#9ff1d9'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0,0,16,0,TAU); ctx.stroke();
      }
      ctx.restore();
    }

    drawInfantryUnit(x, y, angle, color, scale, enemy) {
      const ctx = this.ctx;
      ctx.save(); ctx.translate(x, y); ctx.rotate(angle + Math.PI / 2); ctx.scale(scale, scale);
      ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(3, 5, 12, 9, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#253936'; ctx.fillRect(-9, -5, 5, 17); ctx.fillRect(4, -5, 5, 17);
      polygon(ctx, [[-9,-10],[9,-10],[11,5],[6,12],[-6,12],[-11,5]], color, '#9aab9d');
      ctx.fillStyle = '#1b2e2c'; ctx.beginPath(); ctx.arc(0, -10, 7, 0, TAU); ctx.fill();
      ctx.fillStyle = enemy ? '#ff866b' : '#a3f1d6'; ctx.fillRect(-4, -14, 8, 2);
      ctx.fillStyle = '#172927'; ctx.fillRect(6, -24, 4, 30); ctx.fillRect(4, -26, 8, 8);
      ctx.restore();
    }

    drawDrone(enemy, time) {
      const ctx = this.ctx;
      ctx.save(); ctx.translate(enemy.x, enemy.y + Math.sin(time * 5 + enemy.x) * 3); ctx.rotate(enemy.angle); ctx.scale(enemy.scale || 1, enemy.scale || 1);
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(5, 13, 21, 8, 0, 0, TAU); ctx.fill();
      polygon(ctx, [[-21,-7],[-8,-15],[14,-11],[23,0],[12,12],[-12,12],[-23,3]], enemy.color || '#704f46', '#b07962');
      ctx.fillStyle = '#242d2b'; ctx.fillRect(-30, -4, 12, 7); ctx.fillRect(19, -4, 12, 7);
      ctx.fillStyle = '#ff8567'; ctx.beginPath(); ctx.arc(9, 0, 4, 0, TAU); ctx.fill();
      ctx.fillStyle = '#303a35'; ctx.fillRect(-4, 8, 8, 15); ctx.restore();
    }

    drawMinimap(raid, remotes) {
      const ctx = this.mapCtx;
      const w = this.minimap.width; const h = this.minimap.height;
      const map = raid.map; const sx = w / map.width; const sy = h / map.height;
      ctx.fillStyle = '#081416'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#1b3031'; ctx.fillRect(0, 790 * sy, w, 220 * sy);
      map.buildings.forEach(function (b) { ctx.fillStyle = '#39514e'; ctx.fillRect(b.x * sx, b.y * sy, b.w * sx, b.h * sy); });
      raid.enemies.forEach(function (e) {
        if (e.dead) return; ctx.fillStyle = '#c56d5c'; ctx.fillRect(e.x * sx - 1, e.y * sy - 1, 2, 2);
      });
      remotes.forEach(function (r) {
        if (r.state.status !== 'raid' || r.state.seed !== map.seed) return;
        ctx.fillStyle = r.color || '#82e6d8'; ctx.fillRect((Number(r.state.x) || 0) * sx - 1, (Number(r.state.y) || 0) * sy - 1, 3, 3);
      });
      ctx.fillStyle = '#92e49a'; ctx.beginPath(); ctx.arc(map.extraction.x * sx, map.extraction.y * sy, 4, 0, TAU); ctx.fill();
      ctx.save(); ctx.translate(raid.player.x * sx, raid.player.y * sy); ctx.rotate(raid.player.angle);
      polygon(ctx, [[5,0],[-4,-3],[-4,3]], '#e5f5e9'); ctx.restore();
      ctx.strokeStyle = 'rgba(130,230,216,.12)'; ctx.strokeRect(raid.camera.x * sx, raid.camera.y * sy, this.width * sx, this.height * sy);
    }
  }

  root.MechRenderer = Renderer;
})(typeof window !== 'undefined' ? window : globalThis);
