// ==========================================
// 1. 圖片資源與精靈圖動畫陣列宣告
// ==========================================
let bgImg;
let cachedBgTiles = null;
let cachedBgKey = '';

let stopSheet, walkSheet, magicSheet, jumpSheet, effectSheet;
let char2StopSheet, char2FightSheet;

let stopAnimation = [];
let walkAnimation = [];
let magicAnimation = [];
let jumpAnimation = [];
let effectAnimation = [];
let char2StopAnimation = [];
let char2FightAnimation = [];

// 角色 1 與特效精靈圖參數
const STOP_W = 1385, STOP_H = 212, STOP_FRAMES = 10;
const WALK_W = 1246, WALK_H = 198, WALK_FRAMES = 9;
const MAGIC_W = 1039, MAGIC_H = 146, MAGIC_FRAMES = 4;
const JUMP_W = 1502, JUMP_H = 188, JUMP_FRAMES = 11;
const EFFECT_W = 740, EFFECT_H = 19, EFFECT_FRAMES = 5;

// 角色 2 精靈圖參數
const CHAR2_STOP_W = 787, CHAR2_STOP_H = 190, CHAR2_STOP_FRAMES = 9;
const CHAR2_FIGHT_W = 1871, CHAR2_FIGHT_H = 177, CHAR2_FIGHT_FRAMES = 14;

// ==========================================
// 2. 角色狀態、物理與背景捲動變數
// ==========================================
let stopFrame = 0;
let walkFrame = 0;
let magicFrame = 0;
let jumpFrame = 0;
let char2StopFrame = 0;
let char2FightFrame = 0;

let posX = 0;
let posY = 0;
let groundY = 0;
let velocityY = 0;
let gravity = 1.2;
let jumpForce = -20;
let speed = 8;
let facingRight = true;

// 背景捲動偏移量（0 代表中間那張背景對齊畫布中心）
let bgOffsetX = 0;

// 狀態控制變數
let isMagicPlaying = false;
let isJumping = false;

// 飛行特效物件陣列
let effects = [];

// 載入錯誤紀錄
let loadErrors = [];

// ==========================================
// 3. 數學選擇題與回饋特效（煙火 / 閃電）狀態
// ==========================================
let wasNearChar2 = false;
let quizData = null;          // { numA, numB, answer, options: [n1, n2, n3, n4], selectedIndex, isCorrect }
let quizOptionRects = [];     // 儲存四個選項按鈕的座標 { x, y, w, h, index }

let feedbackType = null;      // 'fireworks' | 'lightning' | null
let feedbackEndTime = 0;      // 特效結束時間戳記（millis() + 3000）

// 煙火粒子與火箭陣列
let fireworkRockets = [];
let fireworkParticles = [];
let nextFireworkSpawn = 0;

// 閃電光束陣列
let lightningBolts = [];
let nextLightningSpawn = 0;

// 安全切割精靈圖輔助函式
function sliceSpriteSheet(sheet, totalW, totalH, frames, targetArray, name) {
  if (!sheet || sheet.width <= 0 || sheet.height <= 0) {
    loadErrors.push(name);
    return;
  }
  const fw = sheet.width / frames;
  const fh = sheet.height;
  for (let i = 0; i < frames; i++) {
    targetArray.push(sheet.get(i * fw, 0, fw, fh));
  }
}

// 建立背景交界處羽化遮罩
function createSeamFeatherMask(tileW, tileH, featherWidth) {
  const w = Math.max(10, Math.round(tileW));
  const h = Math.max(10, Math.round(tileH));
  const fw = Math.min(Math.floor(w * 0.25), Math.max(12, Math.round(featherWidth)));

  const pg = createGraphics(w, h);
  pg.clear();
  const ctx = pg.drawingContext;

  const leftGrad = ctx.createLinearGradient(0, 0, fw, 0);
  leftGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
  leftGrad.addColorStop(1, 'rgba(255, 255, 255, 1)');

  const rightGrad = ctx.createLinearGradient(w - fw, 0, w, 0);
  rightGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  rightGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

  ctx.fillStyle = leftGrad;
  ctx.fillRect(0, 0, fw, h);

  ctx.fillStyle = 'rgba(255, 255, 255, 1)';
  ctx.fillRect(fw, 0, Math.max(0, w - fw * 2), h);

  ctx.fillStyle = rightGrad;
  ctx.fillRect(w - fw, 0, fw, h);

  return pg;
}

// 快取羽化後的背景圖塊，提升繪製效能
function getCachedBgTiles(img, tileW, tileH) {
  const w = Math.ceil(tileW);
  const h = Math.ceil(tileH);
  const key = `${w}x${h}`;
  if (cachedBgTiles && cachedBgKey === key) {
    return cachedBgTiles;
  }

  if (cachedBgTiles) {
    cachedBgTiles.normal.remove();
    cachedBgTiles.mirroredFeathered.remove();
  }

  const cropMarginX = Math.min(2, Math.floor(img.width * 0.01));
  const sx = cropMarginX;
  const sy = 0;
  const sw = Math.max(1, img.width - cropMarginX * 2);
  const sh = img.height;

  // 1. 正常底圖
  const normalPg = createGraphics(w, h);
  normalPg.imageMode(CENTER);
  normalPg.image(img, w / 2, h / 2, w, h, sx, sy, sw, sh);

  // 2. 鏡像 + 左右邊緣羽化圖塊
  const mirrorPg = createGraphics(w, h);
  mirrorPg.push();
  mirrorPg.imageMode(CENTER);
  mirrorPg.translate(w / 2, h / 2);
  mirrorPg.scale(-1, 1);
  mirrorPg.image(img, 0, 0, w, h, sx, sy, sw, sh);
  mirrorPg.pop();

  const featherW = Math.min(120, Math.floor(w * 0.14));
  const maskPg = createSeamFeatherMask(w, h, featherW);
  mirrorPg.drawingContext.globalCompositeOperation = 'destination-in';
  mirrorPg.image(maskPg, 0, 0, w, h);
  mirrorPg.drawingContext.globalCompositeOperation = 'source-over';
  maskPg.remove();

  cachedBgTiles = {
    normal: normalPg,
    mirroredFeathered: mirrorPg
  };
  cachedBgKey = key;
  return cachedBgTiles;
}

// ==========================================
// 4. 預載圖片
// ==========================================
function preload() {
  bgImg = loadImage(
    '背景/2.png',
    () => console.log('背景/2.png 載入成功'),
    () => {
      console.error('找不到 背景/2.png');
      loadErrors.push('背景/2.png');
    }
  );
  stopSheet = loadImage(
    '1/stop/stop.png',
    () => console.log('1/stop/stop.png 載入成功'),
    () => loadErrors.push('1/stop/stop.png')
  );
  walkSheet = loadImage(
    '1/walk/walk.png',
    () => console.log('1/walk/walk.png 載入成功'),
    () => loadErrors.push('1/walk/walk.png')
  );
  magicSheet = loadImage(
    '1/magic/magic.png',
    () => console.log('1/magic/magic.png 載入成功'),
    () => loadErrors.push('1/magic/magic.png')
  );
  jumpSheet = loadImage(
    '1/jump/jump.png',
    () => console.log('1/jump/jump.png 載入成功'),
    () => loadErrors.push('1/jump/jump.png')
  );
  effectSheet = loadImage(
    '1/特效/特效.png',
    () => console.log('1/特效/特效.png 載入成功'),
    () => loadErrors.push('1/特效/特效.png')
  );
  char2StopSheet = loadImage(
    '2/stop/stop.png',
    () => console.log('2/stop/stop.png 載入成功'),
    () => loadErrors.push('2/stop/stop.png')
  );
  char2FightSheet = loadImage(
    '2/fight/fight.png',
    () => console.log('2/fight/fight.png 載入成功'),
    () => loadErrors.push('2/fight/fight.png')
  );
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  frameRate(60);

  posX = width / 2;
  const displayHeight = height / 3;
  groundY = height - displayHeight / 2;
  posY = groundY;

  sliceSpriteSheet(stopSheet, STOP_W, STOP_H, STOP_FRAMES, stopAnimation, '1/stop/stop.png');
  sliceSpriteSheet(walkSheet, WALK_W, WALK_H, WALK_FRAMES, walkAnimation, '1/walk/walk.png');
  sliceSpriteSheet(magicSheet, MAGIC_W, MAGIC_H, MAGIC_FRAMES, magicAnimation, '1/magic/magic.png');
  sliceSpriteSheet(jumpSheet, JUMP_W, JUMP_H, JUMP_FRAMES, jumpAnimation, '1/jump/jump.png');
  sliceSpriteSheet(effectSheet, EFFECT_W, EFFECT_H, EFFECT_FRAMES, effectAnimation, '1/特效/特效.png');
  sliceSpriteSheet(
    char2StopSheet,
    CHAR2_STOP_W,
    CHAR2_STOP_H,
    CHAR2_STOP_FRAMES,
    char2StopAnimation,
    '2/stop/stop.png'
  );
  sliceSpriteSheet(
    char2FightSheet,
    CHAR2_FIGHT_W,
    CHAR2_FIGHT_H,
    CHAR2_FIGHT_FRAMES,
    char2FightAnimation,
    '2/fight/fight.png'
  );
}

// ==========================================
// 5. 數學加法題目生成與特效觸發函式
// ==========================================
function generateMathQuestion() {
  const numA = Math.floor(random(10, 50));
  const numB = Math.floor(random(10, 50));
  const answer = numA + numB;

  const optionSet = new Set([answer]);
  while (optionSet.size < 4) {
    // 產生接近正解的干擾選項（例如 ±1 ~ ±12，或個位數相同但十位數差 10）
    const offsetChoices = [-10, -5, -3, -2, -1, 1, 2, 3, 5, 10];
    const candidate = answer + random(offsetChoices);
    if (candidate > 0) {
      optionSet.add(candidate);
    }
  }

  const options = shuffle(Array.from(optionSet));
  quizData = {
    numA,
    numB,
    answer,
    options,
    selectedIndex: -1,
    isCorrect: null
  };
}

function triggerFireworksEffect() {
  feedbackType = 'fireworks';
  feedbackEndTime = millis() + 3000;
  fireworkRockets = [];
  fireworkParticles = [];
  nextFireworkSpawn = 0;
  // 立即發射兩發煙火
  spawnFireworkBurst(width * 0.3, height * 0.35);
  spawnFireworkBurst(width * 0.7, height * 0.3);
}

function triggerLightningEffect() {
  feedbackType = 'lightning';
  feedbackEndTime = millis() + 3000;
  lightningBolts = [];
  nextLightningSpawn = 0;
  spawnLightningBolt();
}

function spawnFireworkBurst(cx, cy) {
  const colors = [
    [255, 70, 90],
    [255, 200, 40],
    [60, 230, 140],
    [70, 190, 255],
    [210, 110, 255],
    [255, 130, 50]
  ];
  const baseCol = random(colors);
  const count = 55;
  for (let i = 0; i < count; i++) {
    const angle = (TWO_PI * i) / count + random(-0.08, 0.08);
    const spd = random(2.5, 8.5);
    fireworkParticles.push({
      x: cx,
      y: cy,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd,
      alpha: 255,
      size: random(4, 8),
      col: baseCol
    });
  }
}

function spawnLightningBolt() {
  const startX = random(width * 0.15, width * 0.85);
  let curX = startX;
  let curY = 0;
  const segments = [];
  const endY = height * random(0.65, 0.95);

  while (curY < endY) {
    const nextY = curY + random(25, 55);
    const nextX = curX + random(-45, 45);
    segments.push({ x1: curX, y1: curY, x2: nextX, y2: nextY });

    // 隨機產生分支閃電
    if (random() < 0.35) {
      let bx = nextX;
      let by = nextY;
      for (let b = 0; b < 3; b++) {
        const nbx = bx + random(-40, 40);
        const nby = by + random(20, 40);
        segments.push({ x1: bx, y1: by, x2: nbx, y2: nby, isBranch: true });
        bx = nbx;
        by = nby;
      }
    }

    curX = nextX;
    curY = nextY;
  }

  lightningBolts.push({
    segments,
    alpha: 255
  });
}

// ==========================================
// 6. 主迴圈：背景捲動、角色2互動、物理、特效、題目方框
// ==========================================
function draw() {
  background(255, 218, 224);

  const hasBg = bgImg && bgImg.width > 0 && bgImg.height > 0;
  const rawTileWidth = hasBg ? bgImg.width * (height / bgImg.height) : width;
  const featherOverlap = Math.min(120, Math.round(rawTileWidth * 0.14));
  const stepWidth = Math.max(100, rawTileWidth - featherOverlap);
  const totalBgWidth = stepWidth * 2 + rawTileWidth;
  const maxScroll = Math.max(0, (totalBgWidth - width) / 2);
  const minScroll = -maxScroll;

  bgOffsetX = Math.max(minScroll, Math.min(maxScroll, bgOffsetX));

  const displayHeight = height / 3;
  groundY = height - displayHeight / 2;
  if (!isJumping) {
    posY = groundY;
  }

  const walkFrameW = walkAnimation[0] ? walkAnimation[0].width : (WALK_W / WALK_FRAMES);
  const walkFrameH = walkAnimation[0] ? walkAnimation[0].height : WALK_H;
  const walkDisplayWidth = walkFrameW * (displayHeight / walkFrameH);
  const centerX = width / 2;

  // --- 1. 左右移動與背景捲動控制 ---
  if (!isMagicPlaying) {
    if (keyIsDown(RIGHT_ARROW)) {
      facingRight = true;

      if (posX < centerX) {
        posX = Math.min(centerX, posX + speed);
      } else if (bgOffsetX > minScroll) {
        bgOffsetX = Math.max(minScroll, bgOffsetX - speed);
      } else {
        if (posX < width - walkDisplayWidth / 2) {
          posX += speed;
        } else {
          posX = width - walkDisplayWidth / 2;
        }
      }
    } else if (keyIsDown(LEFT_ARROW)) {
      facingRight = false;

      if (posX > centerX) {
        posX = Math.max(centerX, posX - speed);
      } else if (bgOffsetX < maxScroll) {
        bgOffsetX = Math.min(maxScroll, bgOffsetX + speed);
      } else {
        if (posX > walkDisplayWidth / 2) {
          posX -= speed;
        } else {
          posX = walkDisplayWidth / 2;
        }
      }
    }
  }

  // --- 繪製三張無縫羽化串接背景（左、中、右）---
  const midX = width / 2 + bgOffsetX;
  const leftBgX = midX - stepWidth;
  const rightBgX = midX + stepWidth;

  if (hasBg) {
    const tiles = getCachedBgTiles(bgImg, rawTileWidth, height);
    push();
    imageMode(CENTER);
    image(tiles.normal, Math.round(midX), Math.round(height / 2));
    image(tiles.mirroredFeathered, Math.round(leftBgX), Math.round(height / 2));
    image(tiles.mirroredFeathered, Math.round(rightBgX), Math.round(height / 2));
    pop();
  } else {
    push();
    noStroke();
    fill(255, 235, 240);
    rect(Math.round(leftBgX - rawTileWidth / 2), 0, Math.ceil(rawTileWidth) + 1, height);
    fill(255, 218, 224);
    rect(Math.round(midX - rawTileWidth / 2), 0, Math.ceil(rawTileWidth) + 1, height);
    fill(245, 205, 215);
    rect(Math.round(rightBgX - rawTileWidth / 2), 0, Math.ceil(rawTileWidth) + 1, height);
    pop();
  }

  // --- 2. 跳躍與重力物理模擬 ---
  if (isJumping) {
    posY += velocityY;
    velocityY += gravity;

    if (posY >= groundY) {
      posY = groundY;
      isJumping = false;
      velocityY = 0;
      jumpFrame = 0;
    }
  }

  // --- 3. 繪製角色 2（位於最左邊背景圖的中央）---
  const char2X = leftBgX;
  const char2Y = groundY;
  const distanceToChar1 = Math.abs(posX - char2X);
  const aggroRange = displayHeight * 1.35;
  const isNearChar2 = distanceToChar1 <= aggroRange;
  const char2FaceLeft = posX < char2X;

  // 剛靠近角色 2 時生成一題數學加法選擇題
  if (isNearChar2 && !wasNearChar2) {
    generateMathQuestion();
  }
  wasNearChar2 = isNearChar2;

  push();
  translate(char2X, char2Y);
  if (char2FaceLeft) {
    scale(-1, 1);
  }
  imageMode(CENTER);

  if (isNearChar2 && char2FightAnimation.length > 0) {
    const fIndex = Math.floor(char2FightFrame) % char2FightAnimation.length;
    const fImg = char2FightAnimation[fIndex];
    const fWidth = fImg.width * (displayHeight / fImg.height);
    image(fImg, 0, 0, fWidth, displayHeight);
    char2FightFrame += 0.22;
  } else if (char2StopAnimation.length > 0) {
    const sIndex = Math.floor(char2StopFrame) % char2StopAnimation.length;
    const sImg = char2StopAnimation[sIndex];
    const sWidth = sImg.width * (displayHeight / sImg.height);
    image(sImg, 0, 0, sWidth, displayHeight);
    char2StopFrame += 0.14;
  } else {
    fill(220, 80, 110);
    rectMode(CENTER);
    rect(0, 0, displayHeight * 0.65, displayHeight);
  }
  pop();

  // --- 4. 更新與繪製飛行特效 ---
  const effectDisplayHeight = displayHeight / 3;
  const efSample = effectAnimation[0];
  const effectDisplayWidth = efSample
    ? efSample.width * (effectDisplayHeight / efSample.height)
    : (EFFECT_W / EFFECT_FRAMES) * (effectDisplayHeight / EFFECT_H);

  for (let i = effects.length - 1; i >= 0; i--) {
    const ef = effects[i];

    push();
    translate(ef.x, ef.y);
    if (!ef.facingRight) {
      scale(-1, 1);
    }
    imageMode(CENTER);

    if (effectAnimation.length > 0) {
      const eIndex = Math.floor(ef.frame) % effectAnimation.length;
      image(effectAnimation[eIndex], 0, 0, effectDisplayWidth, effectDisplayHeight);
    } else {
      fill(255, 220, 60);
      noStroke();
      ellipse(0, 0, effectDisplayWidth, effectDisplayHeight);
    }
    pop();

    ef.x += ef.facingRight ? 16 : -16;
    ef.frame += 0.25;

    if (ef.x > width + effectDisplayWidth || ef.x < -effectDisplayWidth) {
      effects.splice(i, 1);
    }
  }

  // --- 5. 繪製角色 1 ---
  push();
  translate(posX, posY);
  if (!facingRight) {
    scale(-1, 1);
  }
  imageMode(CENTER);

  let currentFrames = stopAnimation;
  let frameIndex = 0;
  let drawW = (STOP_W / STOP_FRAMES) * (displayHeight / STOP_H);

  if (isJumping && jumpAnimation.length > 0) {
    currentFrames = jumpAnimation;
    frameIndex = Math.min(Math.floor(jumpFrame), currentFrames.length - 1);
    const img = currentFrames[frameIndex];
    drawW = img.width * (displayHeight / img.height);
    image(img, 0, 0, drawW, displayHeight);

    jumpFrame += 0.3;
    if (jumpFrame >= currentFrames.length) {
      jumpFrame = currentFrames.length - 1;
    }
  } else if (isMagicPlaying && magicAnimation.length > 0) {
    currentFrames = magicAnimation;
    frameIndex = Math.min(Math.floor(magicFrame), currentFrames.length - 1);
    const img = currentFrames[frameIndex];
    drawW = img.width * (displayHeight / img.height);
    image(img, 0, 0, drawW, displayHeight);

    magicFrame += 0.25;
    if (magicFrame >= currentFrames.length) {
      magicFrame = 0;
      isMagicPlaying = false;
      effects.push({
        x: posX,
        y: posY,
        facingRight: facingRight,
        frame: 0
      });
    }
  } else if ((keyIsDown(RIGHT_ARROW) || keyIsDown(LEFT_ARROW)) && walkAnimation.length > 0) {
    currentFrames = walkAnimation;
    frameIndex = Math.floor(walkFrame) % currentFrames.length;
    const img = currentFrames[frameIndex];
    drawW = img.width * (displayHeight / img.height);
    image(img, 0, 0, drawW, displayHeight);
    walkFrame += 0.2;
  } else if (stopAnimation.length > 0) {
    currentFrames = stopAnimation;
    frameIndex = Math.floor(stopFrame) % currentFrames.length;
    const img = currentFrames[frameIndex];
    drawW = img.width * (displayHeight / img.height);
    image(img, 0, 0, drawW, displayHeight);
    stopFrame += 0.12;
  } else {
    fill(90, 140, 255);
    rectMode(CENTER);
    rect(0, 0, displayHeight * 0.7, displayHeight);
  }

  pop();

  // --- 6. 當角色 1 接近角色 2 時，繪製上方黃色數學選擇題方框 ---
  quizOptionRects = [];
  if (isNearChar2 && quizData) {
    drawMathQuizBox();
  }

  // --- 7. 更新與繪製 3 秒回饋特效（答對放煙火 / 答錯閃電） ---
  updateAndDrawFeedbackEffects();

  // --- 8. 左上角提示（若有缺圖會直接顯示在畫面上） ---
  if (loadErrors.length > 0) {
    push();
    fill(0, 180);
    noStroke();
    rect(12, 12, 460, 34, 6);
    fill(255, 230, 120);
    textSize(14);
    textAlign(LEFT, CENTER);
    text('提示：請用 Live Server 開啟並確認圖片路徑（缺圖：' + loadErrors.join(', ') + '）', 22, 29);
    pop();
  }
}

// ==========================================
// 7. 繪製黃色數學加法選擇題方框（寬 1/3、高 1/2、置頂置中）
// ==========================================
function drawMathQuizBox() {
  const boxW = width / 3;
  const boxH = height / 2;
  const boxX = width / 2 - boxW / 2; // 方框中間對準畫布中間
  const boxY = 12;                   // 方框上方靠近畫布上方

  push();
  // 透明度為 90% 的黃色方框（255 * 0.9 ≈ 230）
  fill(255, 235, 59, 230);
  stroke(210, 165, 0, 240);
  strokeWeight(3);
  rect(boxX, boxY, boxW, boxH, 16);

  // 標題列
  noStroke();
  fill(90, 60, 0);
  textAlign(CENTER, CENTER);
  const titleSize = Math.max(14, Math.min(22, boxW * 0.05));
  textSize(titleSize);
  textStyle(BOLD);
  text('數學挑戰題（請點選正確答案）', boxX + boxW / 2, boxY + boxH * 0.11);

  // 加法題目文字
  fill(30, 30, 30);
  const qSize = Math.max(22, Math.min(42, boxW * 0.11));
  textSize(qSize);
  text(`${quizData.numA}  +  ${quizData.numB}  =  ?`, boxX + boxW / 2, boxY + boxH * 0.27);

  // 四個選項按鈕（2x2 網格排列）
  const labels = ['A', 'B', 'C', 'D'];
  const gridTop = boxY + boxH * 0.40;
  const gridHeight = boxH * 0.44;
  const padX = boxW * 0.08;
  const gapX = boxW * 0.06;
  const gapY = gridHeight * 0.14;
  const btnW = (boxW - padX * 2 - gapX) / 2;
  const btnH = (gridHeight - gapY) / 2;

  for (let i = 0; i < 4; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const bx = boxX + padX + col * (btnW + gapX);
    const by = gridTop + row * (btnH + gapY);

    quizOptionRects.push({ x: bx, y: by, w: btnW, h: btnH, index: i });

    const isHovered =
      mouseX >= bx && mouseX <= bx + btnW && mouseY >= by && mouseY <= by + btnH;
    const isAnswered = quizData.selectedIndex !== -1;

    // 按鈕底色依作答狀態與滑鼠懸停變化
    if (isAnswered) {
      if (quizData.options[i] === quizData.answer) {
        fill(76, 175, 80, 245); // 正確答案顯示綠色
      } else if (i === quizData.selectedIndex) {
        fill(229, 57, 53, 245); // 選錯的按鈕顯示紅色
      } else {
        fill(255, 255, 255, 200);
      }
    } else if (isHovered) {
      fill(255, 249, 196, 255);
    } else {
      fill(255, 255, 255, 235);
    }

    stroke(180, 140, 0);
    strokeWeight(2);
    rect(bx, by, btnW, btnH, 10);

    // 按鈕文字
    noStroke();
    if (isAnswered && (quizData.options[i] === quizData.answer || i === quizData.selectedIndex)) {
      fill(255);
    } else {
      fill(40, 40, 40);
    }
    const btnTextSize = Math.max(16, Math.min(28, btnH * 0.45));
    textSize(btnTextSize);
    text(`${labels[i]}. ${quizData.options[i]}`, bx + btnW / 2, by + btnH / 2);
  }

  // 底部作答結果提示文字
  if (quizData.selectedIndex !== -1) {
    const msgSize = Math.max(14, Math.min(20, boxW * 0.048));
    textSize(msgSize);
    if (quizData.isCorrect) {
      fill(27, 94, 32);
      text('答對了！正在施放煙火慶祝...', boxX + boxW / 2, boxY + boxH * 0.92);
    } else {
      fill(183, 28, 28);
      text(`答錯了！正確答案是 ${quizData.answer}`, boxX + boxW / 2, boxY + boxH * 0.92);
    }
  }

  pop();
}

// ==========================================
// 8. 更新與繪製 3 秒煙火與閃電特效
// ==========================================
function updateAndDrawFeedbackEffects() {
  if (!feedbackType) return;

  const now = millis();
  if (now >= feedbackEndTime) {
    feedbackType = null;
    fireworkParticles = [];
    lightningBolts = [];
    // 若角色仍在角色 2 附近，3 秒特效結束後自動出下一題
    if (wasNearChar2) {
      generateMathQuestion();
    }
    return;
  }

  if (feedbackType === 'fireworks') {
    // 每隔約 380ms 隨機在畫布上半部施放新煙火
    if (now >= nextFireworkSpawn) {
      spawnFireworkBurst(random(width * 0.15, width * 0.85), random(height * 0.15, height * 0.55));
      nextFireworkSpawn = now + 380;
    }

    push();
    noStroke();
    for (let i = fireworkParticles.length - 1; i >= 0; i--) {
      const p = fireworkParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.12; // 煙火粒子重力下墜
      p.vx *= 0.98;
      p.alpha -= 4.5;

      if (p.alpha <= 0) {
        fireworkParticles.splice(i, 1);
        continue;
      }

      fill(p.col[0], p.col[1], p.col[2], p.alpha);
      ellipse(p.x, p.y, p.size, p.size);
    }
    pop();
  } else if (feedbackType === 'lightning') {
    // 每隔約 320ms 劈出一道新閃電
    if (now >= nextLightningSpawn) {
      spawnLightningBolt();
      nextLightningSpawn = now + 320;
    }

    push();
    // 閃電瞬間全螢幕微閃白光
    const latestBolt = lightningBolts[lightningBolts.length - 1];
    if (latestBolt && latestBolt.alpha > 190) {
      noStroke();
      fill(255, 255, 230, (latestBolt.alpha - 190) * 1.4);
      rect(0, 0, width, height);
    }

    for (let i = lightningBolts.length - 1; i >= 0; i--) {
      const bolt = lightningBolts[i];
      bolt.alpha -= 14;

      if (bolt.alpha <= 0) {
        lightningBolts.splice(i, 1);
        continue;
      }

      // 外層藍紫色電弧光暈
      stroke(140, 190, 255, bolt.alpha * 0.6);
      strokeWeight(10);
      for (const seg of bolt.segments) {
        if (!seg.isBranch) {
          line(seg.x1, seg.y1, seg.x2, seg.y2);
        }
      }

      // 內層亮白閃電核心
      stroke(255, 255, 220, bolt.alpha);
      strokeWeight(3.5);
      for (const seg of bolt.segments) {
        strokeWeight(seg.isBranch ? 2 : 4);
        line(seg.x1, seg.y1, seg.x2, seg.y2);
      }
    }
    pop();
  }
}

// ==========================================
// 9. 滑鼠點擊選項、鍵盤事件與視窗縮放
// ==========================================
function mousePressed() {
  if (!wasNearChar2 || !quizData || quizData.selectedIndex !== -1) {
    return;
  }

  for (const btn of quizOptionRects) {
    if (
      mouseX >= btn.x &&
      mouseX <= btn.x + btn.w &&
      mouseY >= btn.y &&
      mouseY <= btn.y + btn.h
    ) {
      quizData.selectedIndex = btn.index;
      quizData.isCorrect = quizData.options[btn.index] === quizData.answer;

      if (quizData.isCorrect) {
        triggerFireworksEffect();
      } else {
        triggerLightningEffect();
      }
      break;
    }
  }
}

function keyPressed() {
  if (keyCode === UP_ARROW && !isJumping && !isMagicPlaying) {
    isJumping = true;
    velocityY = jumpForce;
    jumpFrame = 0;
  }

  if ((key === ' ' || keyCode === 32) && !isMagicPlaying && !isJumping) {
    isMagicPlaying = true;
    magicFrame = 0;
  }

  if (
    keyCode === UP_ARROW ||
    keyCode === DOWN_ARROW ||
    keyCode === LEFT_ARROW ||
    keyCode === RIGHT_ARROW ||
    key === ' '
  ) {
    return false;
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}