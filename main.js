'use strict';


const TILE_SIZE = 24;
const HOLD_SIZE = TILE_SIZE * 0.6;
const NEXT_SIZE = HOLD_SIZE;
const NUM_TILE_X = 10;
const NUM_TILE_Y = 21;
const NEXT_COUNT = 3;
const TIMEMAX = 1000;
const CLEAR_WAIT = 180;
const SCREEN_WIDTH = 512;
const SCREEN_HEIGHT = 640;
const BOARD_OFFSET = new Vec2(34*4, 16*4);
const HOLD_OFFSET = new Vec2(9*4, 32*4);
const NEXT_OFFSET = new Vec2(104*4, 24*4);
const NEXT_YSIZE = 20*4;
const SCORE_OFFSET = new Vec2(64*4, 144*4);
const SCORE_SIZE = 8*4;


let canvas;
let context;
let audiocontext;
let BGM_source;		// BGMは一つの音楽だけになるよう管理するため

let gamepads = {};
let keys = {"Up":false, "Left":false, "Right":false, "Down":false, "A":false, "B":false, "C":false };
let keys_frame = {};

let time;
let phase;

let rand;

// テトリス関係
let board;
let next_stack;
let nums = [0, 1, 2, 3, 4, 5, 6];
let score;
let len_counter;
let hold;
let can_hold;
let currentMino;
let previousMino;
let mino_destination;		// あまり使わないので、長めの変数名

// ミノを表すクラス
// dir:0-3 North, East, South, Westの順となる。
// type:0-6 t, s, z, l, j, i, oミノの順となる
// x,y:テトリスボード上の座標
class Mino {
	constructor(t) {
		this.type = t;
		this.dir = 0;
		this.x = 3;
		this.y = 0;
	}

	static getMino(type) {
		switch (type) {
			case 0:	// t
				return [ 
					[false, true,  false],
					[true,  true,  true ],
					[false, false, false]
				];
			case 1: // s
				return [ 
					[false, true,  true ],
					[true,  true,  false],
					[false, false, false]
				];
			case 2: // z
				return [ 
					[true,  true,  false],
					[false, true,  true ],
					[false, false, false]
				];
			case 3: //l
				return [ 
					[false, false, true ],
					[true,  true,  true ],
					[false, false, false]
				];
			case 4: // j
				return [ 
					[true,  false, false],
					[true,  true,  true ],
					[false, false, false]
				];
			case 5: // i
				return [ 
					[false, false, false, false],
					[true,  true,  true,  true ],
					[false, false, false, false],
					[false, false, false, false]
				];
			case 6: // o 初期位置を考えると、この定義が良い
				return [ 
					[false, true,  true,  false],
					[false, true,  true,  false],
				];
		}
	}

	copy(mino) {
		this.type = mino.type;
		this.dir = mino.dir;
		this.x = mino.x;
		this.y = mino.y;
	}
	
	get pattern() {
		let tmp = Mino.getMino(this.type);
		// 方向：Northやミノ：Oは回転不要
		if (this.dir != 0 && this.type != 6) {
			let pat = new Array(tmp.length);
			for(let i = 0; i < tmp.length; i++) {
				pat[i] = new Array(tmp[0].length).fill(0);
			}
			for (let y=0; y<tmp.length; y++) {
				for (let x=0; x<tmp[0].length; x++) {
					switch (this.dir) {
						case 1:
							pat[y][x] = tmp[tmp.length-1 - x][y];
							break;
						case 2:
							pat[y][x] = tmp[tmp.length-1 - y][tmp[0].length-1 - x];
							break;
							case 3:
							pat[y][x] = tmp[x][tmp[0].length-1 - y];
							break;
					}
				}
			}
			return pat;
		}
		else {
			return tmp;
		}
	}
}

function checkMino(board, mino, dx, dy) {
	let tmp = mino.pattern;
	for (let y=0; y<tmp.length; y++) {
		for (let x=0; x<tmp[0].length; x++) {
			if (tmp[y][x]) {
				if (mino.x + x + dx < 0 || mino.x + x + dx >= NUM_TILE_X 
					|| mino.y + y + dy < 0 || mino.y + y + dy >= NUM_TILE_Y-1) return false;
				if (board[mino.y + y + dy][mino.x + x + dx] != 0) return false;
			}
		}
	}
	return true;
}


function fixMino() {
	// この場所にミノを固定できるかの判定は、とりあえず省いておく。
	let tmp = currentMino.pattern;
	for (let y=0; y<tmp.length; y++) {
		for (let x=0; x<tmp[0].length; x++) {
			if (tmp[y][x]) {
				board[currentMino.y + y][currentMino.x + x] = 1;
			}
		}
	}

	// ラインの消去
	let erased = 0;
	for (let y=0; y<NUM_TILE_Y; y++) {
		for (let x=0; x<NUM_TILE_X; x++) {
			if (board[y][x] == 0) break;

			if (x == NUM_TILE_X-1) {
				for (let x2=0; x2<NUM_TILE_X; x2++) {
					for (let y2=y-1; y2>=0; y2--) {
							board[y2+1][x2] = board[y2][x2];
					}
					board[0][x2] = 0;
				}
				score+=100;
				
				erased++;
			}
		}
	}

	if (erased > 0) {
		if (len_counter <= 8) {
			if (len_counter == 0 && erased == 4) playSound(Asset.sounds["tetris"]);
			else playSound(Asset.sounds["delete"+len_counter]);
		}
		else playSound(Asset.sounds["delete10"]);
		len_counter++;
	}
	else len_counter = 0;
	setMino();
	can_hold = true;
}

function setMino(next=-1) {
	if (currentMino != null) {
		previousMino.copy(currentMino);
	}
	else {
		previousMino = new Mino(0);
	}
	
	if (next == -1) {
		while (next_stack.length <= NEXT_COUNT) {
			next_stack.push((nums.splice(rand.nextInt(0, nums.length-1), 1))[0]);
			if (nums.length == 0) nums = [0, 1, 2, 3, 4, 5, 6 ];
		}
		console.log(next_stack);
		currentMino = new Mino(next_stack.shift());
	}
	else {
		currentMino = new Mino(next);
	}

	if (!checkMino(board, currentMino, 0, 0)) {
		audiocontext.suspend();
		boardInit();
	}
}

//
// アセット関係
//

let Asset = {};
Asset.assets = [
	{ type: 'image', name: 'background', src: 'assets/tetris_BG.bmp' },
	{ type: 'image', name: 'minos', src: 'assets/tetrimino_all.png' },
	{ type: 'image', name: 'numbers', src: 'assets/number.png' },
	{ type: 'sound', name: 'main1', src: 'assets/main_slow.mp3' },
	{ type: 'sound', name: 'move_l', src: 'assets/move_left.mp3' },
	{ type: 'sound', name: 'move_r', src: 'assets/move_right.mp3' },
	{ type: 'sound', name: 'harddrop', src: 'assets/harddrop.mp3' },
	{ type: 'sound', name: 'delete1', src: 'assets/delete1.mp3' },
	{ type: 'sound', name: 'rot_r', src: 'assets/rot_right.mp3' },
	{ type: 'sound', name: 'rot_l', src: 'assets/rot_left.mp3' },
	{ type: 'sound', name: 'hold', src: 'assets/hold.mp3' },
	{ type: 'sound', name: 'tetris', src: 'assets/tetris.mp3' },
	{ type: 'sound', name: 'delete0', src: 'assets/delete0.mp3' },
	{ type: 'sound', name: 'delete1', src: 'assets/delete1.mp3' },
	{ type: 'sound', name: 'delete2', src: 'assets/delete2.mp3' },
	{ type: 'sound', name: 'delete3', src: 'assets/delete3.mp3' },
	{ type: 'sound', name: 'delete4', src: 'assets/delete4.mp3' },
	{ type: 'sound', name: 'delete5', src: 'assets/delete5.mp3' },
	{ type: 'sound', name: 'delete6', src: 'assets/delete6.mp3' },
	{ type: 'sound', name: 'delete7', src: 'assets/delete7.mp3' },
	{ type: 'sound', name: 'delete8', src: 'assets/delete8.mp3' },
	{ type: 'sound', name: 'delete10', src: 'assets/delete10.mp3' },
	// back to backをさらに追加予定
];

Asset.images = {};
Asset.sounds = {};

Asset.loadAssets = function(onComplete) {
	let total = Asset.assets.length;
	let loadCount = 0;

	let onLoad = function() {
		loadCount++;
		if (loadCount >= total) {
			onComplete();
		}
	};

	Asset.assets.forEach(function(asset) {
		switch (asset.type) {
			case 'image':
				Asset._loadImage(asset, onLoad);
				break;
			case 'sound':
				Asset._loadSound(asset, onLoad);
				break;
		}
	});
};

Asset._loadImage = function(asset, onLoad) {
	let image = new Image();
	image.src = asset.src;
	image.onload = onLoad;
	Asset.images[asset.name] = image;
}

Asset._loadSound = function (asset, onLoad) {
	const request = new XMLHttpRequest();
	request.open('GET', asset.src, true);
	request.responseType = 'arraybuffer';
	
	request.onload = () => {
		audiocontext.decodeAudioData(request.response, (buffer) => {
			Asset.sounds[asset.name] = buffer;
			onLoad();
		})
	};
	request.send();
}

function playSound(buffer, is_loop = false) {
	audiocontext.resume();
	let source = audiocontext.createBufferSource();
	source.buffer = buffer;
	source.connect(audiocontext.destination);
	source.loop = is_loop;
	source.start(0);
}

function playBGM(buffer, is_loop = false) {
	if (BGM_source != null) {
		BGM_source.stop(0);
	}
	BGM_source = audiocontext.createBufferSource();
	BGM_source.buffer = buffer;
	BGM_source.connect(audiocontext.destination);
	BGM_source.loop = is_loop;
	BGM_source.start(0);
	audiocontext.resume();
}

function playSound_Volume(buffer, volume, is_loop = false) {
	let source = audiocontext.createBufferSource();
	let gainNode = audiocontext.createGain();
	source.buffer = buffer;
	source.connect(gainNode);
	gainNode.connect(audiocontext.destination);
	gainNode.gain.value = volume;
	source.loop = is_loop;
	source.start(0);
}


window.addEventListener('load', init);
const eventName = typeof document.ontouchend !== 'undefined' ? 'touchend' : 'mouseup';
document.addEventListener(eventName, initAudioContext);
function initAudioContext(){
	document.removeEventListener(eventName, initAudioContext);

	try {
		window.AudioContext = (window.AudioContext || window.webkitAudioContext);
		audiocontext = new AudioContext();
	}
	catch(e) {
		alert('Web Audio API is not supported in this browser');
	}
	
	Asset.loadAssets(function() {
		audiocontext.resume();
		boardInit();

		requestAnimationFrame(update);
	});
}

//
// キー入力関係
//

window.addEventListener('keydown', function(event) {
	if (event.defaultPrevented || Object.keys(gamepads).length > 0) {
		return;
	}

	switch(event.code) {
		case "KeyS":
		case "ArrowDown":
			keys["Down"] = true;
			break;

		case "KeyW":
		case "ArrowUp":
			keys["Up"] = true;
			break;

		case "KeyA":
		case "ArrowLeft":
			keys["Left"] = true;
			break;

		case "KeyD":
		case "ArrowRight":
			keys["Right"] = true;
			break;

		case "KeyX":
			keys["A"] = true;
			break;

		case "KeyZ":
			keys["B"] = true;
			break;

		case "Space":
			keys["C"] = true;
			break;
	}

	event.preventDefault();
}, true);


window.addEventListener('keyup', function(event) {
	if (event.defaultPrevented || Object.keys(gamepads).length > 0) {
		return;
	}

	switch(event.code) {
		case "KeyS":
		case "ArrowDown":
			keys["Down"] = false;
			break;

		case "KeyW":
		case "ArrowUp":
			keys["Up"] = false;
			break;

		case "KeyA":
		case "ArrowLeft":
			keys["Left"] = false;
			break;

		case "KeyD":
		case "ArrowRight":
			keys["Right"] = false;
			break;

		case "KeyX":
			keys["A"] = false;
			break;

		case "KeyZ":
			keys["B"] = false;
			break;

		case "Space":
			keys["C"] = false;
			break;
	}

	event.preventDefault();
}, true);


function gamepadHandler(event, connecting) {
	let gamepad = event.gamepad;

	if (connecting) {
		console.log("Pad %d connected", gamepad.index);
		gamepads[gamepad.index] = gamepad;
	}
	else {
		delete gamepads[gamepad.index];
	}
}

window.addEventListener("gamepadconnected", function(e) { gamepadHandler(e, true); }, false);
window.addEventListener("gamepaddisconnected", function(e) { gamepadHandler(e, false); }, false);

function checkGamepadInput() {
	let pads = navigator.getGamepads ? navigator.getGamepads() :
	(navigator.webkitGetGamepads ? navigator.webkitGetGamepads : []);
	
	keys["Up"] = pads[0].axes[1] < -0.95;
	keys["Down"] = pads[0].axes[1] > 0.7;
	keys["Left"] = pads[0].axes[0] < -0.3;
	keys["Right"] = pads[0].axes[0] > 0.3;
	keys["A"] = pads[0].buttons[1].pressed;
	keys["B"] = pads[0].buttons[0].pressed;
	keys["C"] = pads[0].buttons[5].pressed;
}

function updateKeyFrame() {
	for (const key in keys) {
		if (keys[key] > 0) {
			if (keys_frame[key] < 0) keys_frame[key] = 0;
			keys_frame[key]++;
		}
		else {
			if (keys_frame[key] > 0) keys_frame[key] = 0;
			keys_frame[key]--;
		}
	}
}

//
// 以下、ゲーム処理部
//

function init() {
	canvas = document.getElementById('maincanvas');
	canvas.width = SCREEN_WIDTH;
	canvas.height = SCREEN_HEIGHT;
	context = canvas.getContext('2d');
	context.imageSmoothingEnabled = false;					// ドット絵をカクカクに描画するための設定
	
	context.fillStyle = "white";
	context.font = "36px sans-serif";
	context.fillText("TETRIS Web", SCREEN_WIDTH*0.275, SCREEN_HEIGHT*0.3);
	context.font = "30px sans-serif";
	context.fillText("Click to start", SCREEN_WIDTH*0.30, SCREEN_HEIGHT*0.65);
	for (const key in keys) {
		keys_frame[key] = 0;
	}
}

function boardInit() {
	time = 0;
	phase = 0;
	score = 0;
	can_hold = true;
	next_stack = new Array();
	hold = -1;
	rand = new Random((new Date()).getMilliseconds());

	// 一段多く確保することで、直感に反さずに済む(溢れを許容できる)
	board = Array(NUM_TILE_Y);
	for (let y = 0; y < board.length; y++) {
		board[y] = Array(NUM_TILE_X).fill(0);
	}

	setMino();
	playBGM(Asset.sounds['main1'], true);
}

function update() {
	requestAnimationFrame(update);
	updateKeyFrame();
	if (Object.keys(gamepads).length > 0) {
		checkGamepadInput();
	}

	time++;

	if (time % 60 == 0 || (keys["Down"] && time % 5 == 0 )) {
		// 固定作業
		if (checkMino(board, currentMino, 0, 1)) {
			currentMino.y++;
			
		} else {
			fixMino();
			return;
		}
	}

	for (let y=1; y < NUM_TILE_Y; y++) {
		if (!checkMino(board, currentMino, 0, y)) {
			mino_destination = currentMino.y +  y - 1;
			if (keys_frame["Up"] == 1 && (!keys["Left"] && !keys["Right"])) {
				currentMino.y = mino_destination;
				playSound(Asset.sounds['harddrop'], false);
				fixMino();
				return;		
			}
			break;
		}
	}
	
	
	if (keys_frame["Left"] == 1
	|| (keys_frame["Left"] > 11 && keys_frame["Left"] % 6 == 0)
	|| (keys_frame["Left"] > 19 && keys_frame["Left"] % 2 == 0)) {
		if (checkMino(board, currentMino, -1, 0)) {
			currentMino.x--;
			playSound(Asset.sounds['move_l'], false);
		}
	}
	if (keys_frame["Right"] == 1 
		|| (keys_frame["Right"] > 7 && keys_frame["Right"] % 8 == 0)
		|| (keys_frame["Right"] > 17 && keys_frame["Right"] % 2 == 0)) {
		if (checkMino(board, currentMino, 1, 0)) {
			currentMino.x++;
			playSound(Asset.sounds['move_r'], false);
		}
	}
	if (keys_frame["A"] == 1) {
		currentMino.dir = (currentMino.dir+1) % 4;
		if (!checkMino(board, currentMino, 0, 0)) {
			currentMino.dir = (currentMino.dir+3) % 4;
		}
		else {
			playSound(Asset.sounds['rot_r'], false);
		}
	}
	if (keys_frame["B"] == 1) {
		currentMino.dir = (currentMino.dir+3) % 4;
		if (!checkMino(board, currentMino, 0, 0)) {
			currentMino.dir = (currentMino.dir+1) % 4;
		}
		else {
			playSound(Asset.sounds['rot_l'], false);
		}
	}
	if (keys_frame["C"] == 1 && can_hold) {
		can_hold = false;
		let tmp = hold;
		hold = currentMino.type;
		setMino(tmp);
		playSound(Asset.sounds['hold'], false);
	}

	document.getElementById("debug").innerHTML = currentMino.x + ", " + currentMino.y;

	// 普通の代入だと、currentMinoを変えたときにpreviousMinoも変わってしまう。
	previousMino.copy(currentMino);
	render();
}

function render() {
	let tmpx, tmpy;
	let tmp;
	context.clearRect(0, 0, canvas.width, canvas.height);

	context.drawImage(Asset.images['background'], 0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

	// ボードの描画
	for (let y=0; y<NUM_TILE_Y; y++) {
		for (let x=0; x<NUM_TILE_X; x++) {
			context.strokeStyle = "rgba(255,255,255,0.3)"
			if (y > 0 && y < NUM_TILE_Y - 1) { 
				context.beginPath();
				context.moveTo(BOARD_OFFSET.x + x*TILE_SIZE, BOARD_OFFSET.y + y*TILE_SIZE);
				context.lineTo(BOARD_OFFSET.x + (x+1)*TILE_SIZE, BOARD_OFFSET.y + y*TILE_SIZE);
				context.stroke();
			}

			if (x > 0 && y < NUM_TILE_Y-1) { 
				context.beginPath();
				context.moveTo(BOARD_OFFSET.x + x*TILE_SIZE, BOARD_OFFSET.y + y*TILE_SIZE);
				context.lineTo(BOARD_OFFSET.x + x*TILE_SIZE, BOARD_OFFSET.y + (y+1)*TILE_SIZE);
				context.stroke();
			}

			if (board[y][x] != 0) {
				// 固定したミノはわかりやすく色を変えておきます。
				context.drawImage(Asset.images['minos'], 0, 6, 6, 6, 
						BOARD_OFFSET.x + x*TILE_SIZE, BOARD_OFFSET.y + y*TILE_SIZE, TILE_SIZE, TILE_SIZE);
			}

			if (currentMino != null) {
				tmpx = x - currentMino.x;
				tmpy = y - currentMino.y;
				if (tmpx >= 0 && tmpx < currentMino.pattern[0].length
						&& tmpy >= 0 && tmpy < currentMino.pattern.length) {
					if (currentMino.pattern[tmpy][tmpx]) {
						context.globalAlpha = 0.3;
						context.drawImage(Asset.images['minos'], 0, 0, 6, 6, 
						BOARD_OFFSET.x + x*TILE_SIZE, BOARD_OFFSET.y + (mino_destination + tmpy)*TILE_SIZE, TILE_SIZE, TILE_SIZE);
						context.globalAlpha = 1;

					}

					if (currentMino.pattern[tmpy][tmpx]) {
						context.drawImage(Asset.images['minos'], 0, 0, 6, 6, 
						BOARD_OFFSET.x + x*TILE_SIZE, BOARD_OFFSET.y + y*TILE_SIZE, TILE_SIZE, TILE_SIZE);
					}
				}
			}
		}
	}

	// nextの描画
	for (let i=0; i<NEXT_COUNT; i++) {
		let n_pat = Mino.getMino(next_stack[i]);

		for (let tmpy=0; tmpy<n_pat.length; tmpy++) {
			for (let tmpx=0; tmpx<n_pat[0].length; tmpx++) {
				if (tmpx >= 0 && tmpx < n_pat[0].length
						&& tmpy >= 0 && tmpy < n_pat.length) {
					if (n_pat[tmpy][tmpx]) {
						context.drawImage(Asset.images['minos'], 6, 0, 6, 6, 
						NEXT_OFFSET.x + tmpx*NEXT_SIZE, NEXT_OFFSET.y + i * NEXT_YSIZE + tmpy*NEXT_SIZE, NEXT_SIZE, NEXT_SIZE);
					}
				}
			}
		}

	}

	tmp = score;
	for (let i=6; ; i--) {
		context.drawImage(Asset.images['numbers'], (tmp%10)*8, 0, 8, 8, 
		SCORE_OFFSET.x + i * SCORE_SIZE, SCORE_OFFSET.y, SCORE_SIZE, SCORE_SIZE);
		
		tmp = Math.floor(tmp/10);
		if (tmp == 0) break;
	}

	// holdの描画
	if (hold != -1) {
		let h_pat = Mino.getMino(hold);

		for (let tmpy=0; tmpy<h_pat.length; tmpy++) {
			for (let tmpx=0; tmpx<h_pat[0].length; tmpx++) {
				if (tmpx >= 0 && tmpx < h_pat[0].length
						&& tmpy >= 0 && tmpy < h_pat.length) {
					if (h_pat[tmpy][tmpx]) {
						context.drawImage(Asset.images['minos'], 6, 0, 6, 6, 
						HOLD_OFFSET.x + tmpx*HOLD_SIZE, HOLD_OFFSET.y + tmpy*HOLD_SIZE, HOLD_SIZE, HOLD_SIZE);
					}
				}
			}
		}
	}
}
