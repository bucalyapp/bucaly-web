const { createCanvas } = require('canvas');
const fs = require('fs');

function drawIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const r = size * 0.25; // border radius

  // Rounded square background with teal gradient
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(size - r, 0);
  ctx.quadraticCurveTo(size, 0, size, r);
  ctx.lineTo(size, size - r);
  ctx.quadraticCurveTo(size, size, size - r, size);
  ctx.lineTo(r, size);
  ctx.quadraticCurveTo(0, size, 0, size - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();

  const bg = ctx.createLinearGradient(0, 0, size, size);
  bg.addColorStop(0, '#00bfab');
  bg.addColorStop(1, '#007d70');
  ctx.fillStyle = bg;
  ctx.fill();

  // Inner highlight top edge
  ctx.save();
  ctx.clip();
  const shine = ctx.createLinearGradient(0, 0, 0, size * 0.4);
  shine.addColorStop(0, 'rgba(255,255,255,0.28)');
  shine.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = shine;
  ctx.fillRect(0, 0, size, size);
  ctx.restore();

  // Draw tooth shape scaled to canvas
  const s = size / 80; // SVG viewBox is 0 0 80 80
  ctx.save();
  ctx.scale(s, s);

  // Tooth drop shadow
  ctx.shadowColor = 'rgba(0,50,44,0.5)';
  ctx.shadowBlur = 5 * (size / 80);
  ctx.shadowOffsetY = 6 * (size / 80);

  // Tooth path (from SVG)
  // Draw tooth using moveTo/bezierCurveTo
  function toothPath(c) {
    c.beginPath();
    c.moveTo(18,56);
    c.bezierCurveTo(18,56,16,46,14,36);
    c.bezierCurveTo(12,26,12,18,18,14);
    c.bezierCurveTo(22,10,28,10,32,10);
    c.bezierCurveTo(36,10,40,10,40,10);
    c.bezierCurveTo(40,10,44,10,48,10);
    c.bezierCurveTo(52,10,58,10,62,14);
    c.bezierCurveTo(68,18,68,26,66,36);
    c.bezierCurveTo(64,46,62,56,62,56);
    c.bezierCurveTo(62,60,60,64,57,64);
    c.bezierCurveTo(54,64,52,60,50,54);
    c.bezierCurveTo(48,48,46,44,40,44);
    c.bezierCurveTo(34,44,32,48,30,54);
    c.bezierCurveTo(28,60,26,64,23,64);
    c.bezierCurveTo(20,64,18,60,18,56);
    c.closePath();
  }

  // Base tooth gradient (radial, bright center)
  ctx.shadowColor = 'rgba(0,50,44,0.5)';
  ctx.shadowBlur = 5;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 6;
  const tg = ctx.createRadialGradient(42, 30, 2, 42, 30, 35);
  tg.addColorStop(0, '#ffffff');
  tg.addColorStop(0.7, '#ffffff');
  tg.addColorStop(1, '#e0f5f3');
  ctx.fillStyle = tg;
  toothPath(ctx);
  ctx.fill();
  ctx.shadowColor = 'transparent';

  // Gloss ellipse upper-left
  ctx.save();
  ctx.translate(30, 19);
  ctx.rotate(-30 * Math.PI / 180);
  ctx.beginPath();
  ctx.ellipse(0, 0, 10, 6, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fill();
  ctx.restore();

  // Second small gloss
  ctx.save();
  ctx.translate(23, 27);
  ctx.rotate(-30 * Math.PI / 180);
  ctx.beginPath();
  ctx.ellipse(0, 0, 4, 2.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fill();
  ctx.restore();

  ctx.restore();

  return canvas.toBuffer('image/png');
}

fs.writeFileSync('icon-192.png', drawIcon(192));
fs.writeFileSync('icon-512.png', drawIcon(512));
console.log('Icons generated: icon-192.png, icon-512.png');
