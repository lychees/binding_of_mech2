(function (root) {
  'use strict';

  const TAU = Math.PI * 2;
  const models = ['redDragon', 'ironGolem', 'bebeDragon', 'fierceFire', 'toxicSpider', 'whirlwind', 'thor', 'redFlame', 'landen', 'odin'];

  function polygon(ctx, points, fill, stroke) {
    ctx.beginPath(); ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i][0], points[i][1]);
    ctx.closePath(); if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
  }

  function tracks(ctx, x, y, w, h) {
    ctx.fillStyle = '#162522'; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#66796d'; ctx.lineWidth = 2; ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
    ctx.fillStyle = '#46594f';
    for (let tx = x + 6; tx < x + w - 5; tx += 15) ctx.fillRect(tx, y + 5, 8, h - 10);
    ctx.fillStyle = '#a88c55'; ctx.fillRect(x + 7, y + h - 5, w - 14, 2);
  }

  function hull(ctx, color, width, y) {
    const half = width / 2;
    polygon(ctx, [[-half + 12,y - 31],[half - 18,y - 31],[half,y - 12],[half - 8,y],[-half + 4,y],[-half,y - 13]], color, '#93a79b');
    polygon(ctx, [[-half + 20,y - 26],[half - 30,y - 26],[half - 21,y - 14],[-half + 14,y - 14]], '#2a403c', '#536e64');
  }

  function cannon(ctx, x, y, length, width, accent) {
    ctx.fillStyle = '#1a2b29'; ctx.fillRect(x, y - width / 2, length, width);
    ctx.fillStyle = '#647d70'; ctx.fillRect(x + 6, y - width / 2 + 2, length - 12, 3);
    ctx.fillStyle = accent || '#a4c1af'; ctx.fillRect(x + length - 7, y - width / 2 - 1, 7, width + 2);
  }

  function missileRack(ctx, x, y, columns, rows, spacing) {
    const w = columns * spacing + 12; const h = rows * spacing + 12;
    ctx.fillStyle = '#233835'; ctx.fillRect(x - w / 2, y - h / 2, w, h);
    ctx.strokeStyle = '#6c8276'; ctx.lineWidth = 2; ctx.strokeRect(x - w / 2 + 2, y - h / 2 + 2, w - 4, h - 4);
    for (let row = 0; row < rows; row += 1) for (let col = 0; col < columns; col += 1) {
      ctx.fillStyle = '#101d1d'; ctx.beginPath(); ctx.arc(x + (col - (columns - 1) / 2) * spacing, y + (row - (rows - 1) / 2) * spacing, spacing * .3, 0, TAU); ctx.fill();
      ctx.fillStyle = '#d39a62'; ctx.beginPath(); ctx.arc(x + (col - (columns - 1) / 2) * spacing, y + (row - (rows - 1) / 2) * spacing, spacing * .12, 0, TAU); ctx.fill();
    }
  }

  function turbine(ctx, x, y, radius) {
    ctx.fillStyle = '#1a302d'; ctx.beginPath(); ctx.ellipse(x, y, radius, radius * .48, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#829e91'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, y, radius - 5, radius * .48 - 4, 0, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#82e6d8'; ctx.fillRect(x - radius + 9, y - 1, radius * 2 - 18, 3);
  }

  function spiderLegs(ctx) {
    ctx.strokeStyle = '#586f60'; ctx.lineWidth = 10; ctx.lineCap = 'round';
    [[-45,-56,-105,-37,-128,-4],[45,-56,105,-37,128,-4],[-38,-42,-84,-14,-94,3],[38,-42,84,-14,94,3]].forEach(function (points) {
      ctx.beginPath(); ctx.moveTo(points[0], points[1]); ctx.lineTo(points[2], points[3]); ctx.lineTo(points[4], points[5]); ctx.stroke();
    });
    ctx.fillStyle = '#23372f'; ctx.fillRect(-145,-5,32,8); ctx.fillRect(113,-5,32,8); ctx.fillRect(-108,-2,27,7); ctx.fillRect(81,-2,27,7);
  }

  function drawHangar(ctx, model, color, time) {
    ctx.fillStyle = '#050b0d'; ctx.beginPath(); ctx.ellipse(0, 3, model === 'whirlwind' ? 102 : 125, 13, 0, 0, TAU); ctx.fill();
    if (model === 'whirlwind') ctx.translate(0, Math.sin(time * 3) * 3 - 8);
    if (model === 'toxicSpider') spiderLegs(ctx);
    else if (model !== 'whirlwind') { tracks(ctx,-104,-43,83,43); tracks(ctx,21,-43,83,43); }

    if (model === 'redDragon') {
      hull(ctx,color,190,-42);
      polygon(ctx, [[-68,-76],[-120,-116],[-100,-65]], '#633a32', '#c57d60'); polygon(ctx, [[50,-78],[112,-118],[93,-62]], '#633a32', '#c57d60');
      polygon(ctx, [[-54,-81],[-18,-115],[40,-106],[66,-77],[35,-54],[-37,-57]], color, '#b08d75');
      polygon(ctx, [[-24,-108],[-42,-145],[-8,-116]], '#76503e', '#d6a06c'); polygon(ctx, [[25,-105],[43,-137],[43,-99]], '#76503e', '#d6a06c');
      cannon(ctx,43,-83,116,16,'#ff9a62'); ctx.fillStyle = '#ff9a62'; ctx.fillRect(-23,-88,37,4);
    } else if (model === 'ironGolem') {
      hull(ctx,color,172,-40);
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(-7,-79,56,Math.PI,TAU); ctx.fill(); ctx.strokeStyle = '#9baca0'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#263d39'; ctx.beginPath(); ctx.arc(-7,-77,35,0,TAU); ctx.fill();
      ctx.fillStyle = '#9ff1d9'; ctx.beginPath(); ctx.arc(-7,-77,12,0,TAU); ctx.fill();
      cannon(ctx,36,-72,72,13); ctx.fillStyle = '#627c6e'; ctx.fillRect(-11,-144,6,22);
    } else if (model === 'bebeDragon') {
      hull(ctx,color,196,-43);
      missileRack(ctx,-60,-105,2,3,23); missileRack(ctx,46,-105,2,3,23);
      polygon(ctx, [[-30,-64],[0,-48],[32,-66],[22,-26],[0,-12],[-23,-28]], '#5c4c39', '#b99c67');
      ctx.fillStyle = '#a5b8a0'; ctx.fillRect(-7,-155,10,22);
    } else if (model === 'fierceFire') {
      hull(ctx,color,184,-43);
      polygon(ctx, [[-56,-79],[-31,-109],[34,-109],[61,-79],[42,-57],[-42,-57]], color, '#93a79b');
      missileRack(ctx,-65,-93,3,1,18); missileRack(ctx,58,-93,3,1,18);
      cannon(ctx,35,-85,103,13); ctx.fillStyle = '#a9c1af'; ctx.fillRect(-3,-134,6,25);
    } else if (model === 'toxicSpider') {
      ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(0,-68,79,49,0,0,TAU); ctx.fill();
      ctx.strokeStyle = '#94a894'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0,-68,79,49,0,0,TAU); ctx.stroke();
      polygon(ctx, [[-62,-72],[-37,-105],[33,-105],[66,-72],[39,-44],[-39,-44]], '#2b4139', '#617b68');
      cannon(ctx,35,-84,111,19,'#d5ef8b');
      for (let i = 0; i < 4; i += 1) { ctx.fillStyle = '#d5ef8b'; ctx.beginPath(); ctx.arc(-24 + i * 15,-105,4,0,TAU); ctx.fill(); }
    } else if (model === 'whirlwind') {
      polygon(ctx, [[-112,-40],[-65,-83],[54,-87],[112,-44],[66,-20],[-64,-20]], color, '#91b1a5');
      polygon(ctx, [[-52,-84],[-17,-119],[44,-103],[61,-77]], '#29453f', '#769a8c');
      turbine(ctx,-93,-26,42); turbine(ctx,91,-26,42); turbine(ctx,-50,-103,24); turbine(ctx,58,-105,24);
      cannon(ctx,39,-91,94,10,'#8cf5ff'); ctx.fillStyle = '#82e6d8'; ctx.fillRect(-33,-80,42,3);
    } else if (model === 'thor') {
      hull(ctx,color,218,-45);
      missileRack(ctx,-66,-97,3,2,21); missileRack(ctx,61,-97,3,2,21);
      polygon(ctx, [[-43,-68],[43,-68],[53,-45],[-52,-45]], '#52695d', '#98aa98');
      cannon(ctx,28,-74,72,19); ctx.fillStyle = '#7c8f7d'; ctx.fillRect(-47,-126,94,9);
    } else if (model === 'redFlame') {
      hull(ctx,color,180,-42);
      ctx.fillStyle = '#784936'; ctx.fillRect(-93,-110,30,62); ctx.fillRect(-54,-110,30,62);
      ctx.fillStyle = '#b66b47'; ctx.fillRect(-88,-103,20,46); ctx.fillRect(-49,-103,20,46);
      polygon(ctx, [[-20,-91],[19,-112],[62,-93],[56,-61],[-14,-59]], color, '#b99a79');
      cannon(ctx,46,-88,105,23,'#ff9b58');
      polygon(ctx, [[145,-98],[185,-89],[157,-76],[181,-63],[143,-69]], '#ff9b58', '#ffd08a');
    } else if (model === 'landen') {
      hull(ctx,color,202,-45);
      polygon(ctx, [[-61,-82],[-33,-117],[37,-117],[64,-82],[42,-53],[-43,-53]], color, '#9a9fc0');
      cannon(ctx,27,-97,139,13,'#c98af0'); cannon(ctx,31,-72,126,12,'#c98af0');
      polygon(ctx, [[-24,-119],[0,-143],[25,-119],[15,-98],[-15,-98]], '#3a4a50', '#aaa4cf');
      ctx.fillStyle = '#d9a4ff'; ctx.fillRect(-12,-122,24,4);
    } else if (model === 'odin') {
      hull(ctx,color,186,-43);
      polygon(ctx, [[-55,-77],[-116,-124],[-93,-60]], '#3c5550', '#91b4aa'); polygon(ctx, [[49,-79],[111,-124],[91,-60]], '#3c5550', '#91b4aa');
      polygon(ctx, [[-48,-82],[-20,-116],[33,-112],[59,-79],[36,-53],[-35,-55]], color, '#93aaa0');
      cannon(ctx,31,-96,129,11,'#82e6d8'); cannon(ctx,38,-72,119,10,'#82e6d8');
      ctx.strokeStyle = '#9ff1d9'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(-6,-77,24,0,TAU); ctx.stroke();
      ctx.fillStyle = '#d6b86c'; ctx.fillRect(-5,-145,7,29);
    }
  }

  function topTracks(ctx) {
    ctx.fillStyle = '#1a2926'; ctx.fillRect(-37,-29,13,59); ctx.fillRect(24,-29,13,59);
    ctx.fillStyle = '#52665a'; for (let y = -24; y < 27; y += 10) { ctx.fillRect(-36,y,11,4); ctx.fillRect(25,y,11,4); }
  }

  function topHull(ctx, color) {
    polygon(ctx, [[-25,-29],[20,-29],[31,-11],[27,29],[-25,29],[-31,0]], color, '#9aafa2');
    polygon(ctx, [[-17,-18],[15,-18],[21,-5],[17,17],[-17,17],[-21,0]], '#2a423c', '#5f7c6d');
  }

  function topGun(ctx, x, y, length, width, color) {
    ctx.fillStyle = '#172927'; ctx.fillRect(x - width / 2, y - length, width, length);
    ctx.fillStyle = color || '#a4c1af'; ctx.fillRect(x - width / 2 - 1, y - length - 4, width + 2, 7);
  }

  function drawTopdown(ctx, x, y, angle, color, scale, enemy, parked, model, time) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.scale(scale, scale); ctx.globalAlpha = parked ? .72 : 1;
    ctx.fillStyle = 'rgba(0,0,0,.32)'; ctx.beginPath(); ctx.ellipse(5,9,39,29,0,0,TAU); ctx.fill();
    if (model === 'whirlwind') ctx.translate(0, Math.sin(time * 4) * 2 - 3);
    if (model !== 'whirlwind' && model !== 'toxicSpider') topTracks(ctx);
    if (model === 'toxicSpider') {
      ctx.strokeStyle = '#607c70'; ctx.lineWidth = 7; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-20,-15); ctx.lineTo(-48,-29); ctx.stroke(); ctx.beginPath(); ctx.moveTo(20,-15); ctx.lineTo(48,-29); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-20,14); ctx.lineTo(-48,30); ctx.stroke(); ctx.beginPath(); ctx.moveTo(20,14); ctx.lineTo(48,30); ctx.stroke();
    }
    topHull(ctx,color);
    if (model === 'redDragon') {
      polygon(ctx, [[-20,-21],[-48,-43],[-37,-4]], '#683a33', '#cf8065'); polygon(ctx, [[20,-21],[48,-43],[37,-4]], '#683a33', '#cf8065');
      topGun(ctx,0,-15,49,10,'#ff9a62'); ctx.fillStyle = '#ff9a62'; ctx.fillRect(-10,-20,20,3);
    } else if (model === 'ironGolem') {
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0,-2,23,0,TAU); ctx.fill(); ctx.strokeStyle = '#a1b3a5'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#233b37'; ctx.beginPath(); ctx.arc(0,-2,14,0,TAU); ctx.fill(); ctx.fillStyle = '#9ff1d9'; ctx.beginPath(); ctx.arc(0,-2,6,0,TAU); ctx.fill();
      topGun(ctx,14,-13,31,8);
    } else if (model === 'bebeDragon') {
      ctx.fillStyle = '#233835'; ctx.fillRect(-34,-31,18,31); ctx.fillRect(16,-31,18,31);
      ctx.fillStyle = '#d39a62'; for (let i = 0; i < 3; i += 1) { ctx.fillRect(-29,-26 + i * 10,7,6); ctx.fillRect(21,-26 + i * 10,7,6); }
      polygon(ctx, [[-9,8],[0,26],[9,8],[6,31],[0,38],[-6,31]], '#66523c', '#c3a46d');
    } else if (model === 'fierceFire') {
      topGun(ctx,0,-15,46,9);
      ctx.fillStyle = '#d09b63'; for (let i = 0; i < 3; i += 1) { ctx.fillRect(-32 + i * 7,-23,5,14); ctx.fillRect(13 + i * 7,-23,5,14); }
    } else if (model === 'toxicSpider') {
      ctx.fillStyle = '#2b443a'; ctx.beginPath(); ctx.ellipse(0,0,25,29,0,0,TAU); ctx.fill();
      topGun(ctx,0,-16,47,11,'#d5ef8b');
      for (let i = 0; i < 4; i += 1) { ctx.fillStyle = '#d5ef8b'; ctx.beginPath(); ctx.arc(-12 + i * 8,-17,2.5,0,TAU); ctx.fill(); }
    } else if (model === 'whirlwind') {
      polygon(ctx, [[-36,-18],[-19,-36],[22,-33],[38,-9],[24,22],[-24,22]], color, '#91b1a5');
      turbine(ctx,-32,10,18); turbine(ctx,32,10,18); topGun(ctx,0,-23,42,7,'#8cf5ff');
    } else if (model === 'thor') {
      ctx.fillStyle = '#233835'; ctx.fillRect(-39,-31,20,30); ctx.fillRect(19,-31,20,30);
      ctx.fillStyle = '#d09b63'; for (let i = 0; i < 3; i += 1) { ctx.fillRect(-34 + i * 7,-25,5,7); ctx.fillRect(21 + i * 7,-25,5,7); }
      topGun(ctx,0,-14,32,12);
    } else if (model === 'redFlame') {
      ctx.fillStyle = '#a96545'; ctx.fillRect(-37,0,12,29); ctx.fillRect(25,0,12,29);
      topGun(ctx,0,-16,48,13,'#ff9b58'); polygon(ctx, [[-6,-61],[0,-76],[6,-61],[0,-67]], '#ff9b58', '#ffd08a');
    } else if (model === 'landen') {
      topGun(ctx,-11,-12,56,8,'#c98af0'); topGun(ctx,11,-12,50,8,'#c98af0');
      polygon(ctx, [[-13,-23],[0,-37],[13,-23],[8,-10],[-8,-10]], '#3b4c51', '#aaa4cf');
    } else if (model === 'odin') {
      polygon(ctx, [[-20,-19],[-45,-39],[-33,-2]], '#3c5550', '#91b4aa'); polygon(ctx, [[20,-19],[45,-39],[33,-2]], '#3c5550', '#91b4aa');
      topGun(ctx,-10,-13,51,7,'#82e6d8'); topGun(ctx,10,-13,46,7,'#82e6d8');
      ctx.strokeStyle = '#9ff1d9'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0,0,15,0,TAU); ctx.stroke();
    }
    if (enemy) { ctx.fillStyle = '#ff866b'; ctx.fillRect(-8,-17,16,3); }
    ctx.restore();
  }

  root.MechLegacyModels = {
    isLegacy: function (model) { return models.indexOf(model) >= 0; },
    drawHangar, drawTopdown
  };
})(typeof window !== 'undefined' ? window : globalThis);
