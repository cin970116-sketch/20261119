// ==========================================
// 1. 圖片資源與精靈圖動畫陣列宣告
// ==========================================
let bgImg;
let stopSheet, walkSheet, magicSheet, jumpSheet, effectSheet;

let stopAnimation = [];
let walkAnimation = [];
let magicAnimation = [];
let jumpAnimation = [];
let effectAnimation = [];

// 定義各個精靈圖的原始總寬度、總高度與總格數
const STOP_W = 1385, STOP_H = 212, STOP_FRAMES = 10;
const WALK_W = 1246, WALK_H = 198, WALK_FRAMES = 9;
const MAGIC_W = 1039, MAGIC_H = 146, MAGIC_FRAMES = 4;
const JUMP_W = 1502, JUMP_H = 188, JUMP_FRAMES = 11;
const EFFECT_W = 740, EFFECT_H = 19, EFFECT_FRAMES = 5;

// ==========================================
// 2. 角色狀態、物理與背景捲動變數
// ==========================================
let stopFrame = 0;
let walkFrame = 0;
let magicFrame = 0;
let jumpFrame = 0;

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

// 特效物件陣列
let effects = [];

// 載入狀態旗標
let loadErrors = [];

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

// ==========================================
// 3. 預載圖片
// ==========================================
function preload() {
  bgImg = loadImage(
    '背景/1.png',
    () => console.log('背景/1.png 載入成功'),
    () => {
      console.error('找不到 背景/1.png');
      loadErrors.push('背景/1.png');
    }
  );
  stopSheet = loadImage(
    '1/stop/stop.png',
    () => console.log('stop.png 載入成功'),
    () => console.error('找不到 1/stop/stop.png')
  );
  walkSheet = loadImage(
    '1/walk/walk.png',
    () => console.log('walk.png 載入成功'),
    () => console.error('找不到 1/walk/walk.png')
  );
  magicSheet = loadImage(
    '1/magic/magic.png',
    () => console.log('magic.png 載入成功'),
    () => console.error('找不到 1/magic/magic.png')
  );
  jumpSheet = loadImage(
    '1/jump/jump.png',
    () => console.log('jump.png 載入成功'),
    () => console.error('找不到 1/jump/jump.png')
  );
  effectSheet = loadImage(
    '1/特效/特效.png',
    () => console.log('特效.png 載入成功'),
    () => console.error('找不到 1/特效/特效.png')
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
}

// ==========================================
// 4. 主迴圈：背景捲動、物理、特效與角色繪製
// ==========================================
function draw() {
  background(255, 218, 224);

  const hasBg = bgImg && bgImg.width > 0 && bgImg.height > 0;
  const bgWidth = hasBg ? bgImg.width * (height / bgImg.height) : width;
  const totalBgWidth = bgWidth * 3;
  const maxScroll = Math.max(0, (totalBgWidth - width) / 2);
  const minScroll = -maxScroll;

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

  // --- 繪製三張串接背景（左、中、右）---
  if (hasBg) {
    push();
    imageMode(CENTER);
    const midX = width / 2 + bgOffsetX;
    image(bgImg, midX - bgWidth, height / 2, bgWidth, height);
    image(bgImg, midX, height / 2, bgWidth, height);
    image(bgImg, midX + bgWidth, height / 2, bgWidth, height);
    pop();
  } else {
    // 若背景圖未載入，畫出三段參考區塊方便確認捲動
    push();
    const midX = width / 2 + bgOffsetX;
    stroke(180);
    fill(255, 235, 240);
    rect(midX - bgWidth * 1.5, 0, bgWidth, height);
    fill(255, 218, 224);
    rect(midX - bgWidth * 0.5, 0, bgWidth, height);
    fill(245, 205, 215);
    rect(midX + bgWidth * 0.5, 0, bgWidth, height);
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

  // --- 3. 更新與繪製飛行特效 ---
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

  // --- 4. 繪製角色 1 ---
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
    // 備用方塊（僅在所有精靈圖都沒載到時顯示）
    fill(90, 140, 255);
    rectMode(CENTER);
    rect(0, 0, displayHeight * 0.7, displayHeight);
  }

  pop();

  // --- 5. 左上角提示（若有缺圖會直接顯示在畫面上） ---
  if (loadErrors.length > 0) {
    push();
    fill(0, 180);
    noStroke();
    rect(12, 12, 420, 34, 6);
    fill(255, 230, 120);
    textSize(14);
    textAlign(LEFT, CENTER);
    text('提示：請用 Live Server 開啟並確認圖片路徑（缺圖：' + loadErrors.join(', ') + '）', 22, 29);
    pop();
  }
}

// ==========================================
// 5. 鍵盤事件與視窗縮放
// ==========================================
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