'use strict';


const TILE_SIZE = 24;
const NUM_TILE_X = 10;
const NUM_TILE_Y = 21;
const TIMEMAX = 1000;
const CLEAR_WAIT = 180;
const SCREEN_WIDTH = 512;
const SCREEN_HEIGHT = 640;
const BOARD_OFFSET = new Vec2(34*4, 16*4);


let canvas;
let context;
let audiocontext;

let gamepads = {};
let keys = {"Up":false, "Left":false, "Right":false, "Down":false, "A":false, "B":false };
let keys_frame = {};

let time;
let phase;
let num_present;

// テトリス関係
let board;
let currentMino;
let previousMino;

// ミノを表すクラス
// dir:0-3 North, East, South, Westの順となる。
// type:0-6 t, s, z, l, j, i, oミノの順となる
// x,y:テトリスボード上の座標
class Mino {
	constructor(t) {
		this.type = t;
		this.dir = 0;
		this.x = 4;
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
					[false, false, false, false],
					[false, true,  true,  false],
					[false, true,  true,  false],
					[false, false, false, false]
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

//
// アセット関係
//

let Asset = {};
Asset.assets = [
	{ type: 'image', name: 'background', src: 'assets/tetris_BG.bmp' },
	{ type: 'image', name: 'minos', src: 'assets/tetrimino_all.png' },
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

function playSound(buffer) {
	let source = audiocontext.createBufferSource();
	source.buffer = buffer;
	source.connect(audiocontext.destination);
	source.start(0);
}


window.addEventListener('load', init);
const eventName = typeof document.ontouchend !== 'undefined' ? 'touchend' : 'mouseup';
document.addEventListener(eventName, initAudioContext);
function initAudioContext(){
	document.removeEventListener(eventName, initAudioContext);
	audiocontext.resume();
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
	
	keys["Up"] = pads[0].axes[1] < -0.25;
	keys["Down"] = pads[0].axes[1] > 0.25;
	keys["Left"] = pads[0].axes[0] < -0.25;
	keys["Right"] = pads[0].axes[0] > 0.25;
	keys["A"] = pads[0].buttons[1].pressed;
	keys["B"] = pads[0].buttons[0].pressed;
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


	try {
		window.AudioContext = (window.AudioContext || window.webkitAudioContext);
		audiocontext = new AudioContext();
	}
	catch(e) {
		alert('Web Audio API is not supported in this browser');
	}

	
	Asset.loadAssets(function() {
		requestAnimationFrame(update);
	});
	boardInit();

	for (const key in keys) {
		keys_frame[key] = 0;
	}
}

function boardInit() {
	time = 0;
	phase = 0;

	// 一段多く確保することで、直感に反さずに済む(溢れを許容できる)
	board = Array(NUM_TILE_Y);
	for (let y = 0; y < board.length; y++) {
		board[y] = Array(NUM_TILE_X).fill(0);
	}

	currentMino = new Mino(0);
}

function update() {
	requestAnimationFrame(update);
	updateKeyFrame();
	if (Object.keys(gamepads).length > 0) {
		checkGamepadInput();
	}

	time++;

	if (time % 60 == 0 || (keys["Down"] && time % 10 == 0 )) {
		// 固定作業
		if (checkMino(board, currentMino, 0, 1)) {
			currentMino.y++;
			
		} else {
			let tmp = currentMino.pattern;
			for (let y=0; y<tmp.length; y++) {
				for (let x=0; x<tmp[0].length; x++) {
					if (tmp[y][x]) board[currentMino.y + y][currentMino.x + x] = 1;
				}
			}

			previousMino.copy(currentMino);
			currentMino = new Mino((currentMino.type+1)%7);
			return;
		}
	}

	if (keys_frame["Left"] == 1) {
		if (checkMino(board, currentMino, -1, 0)) {
			currentMino.x--;
		}
	}
	if (keys_frame["Right"] == 1) {
		if (checkMino(board, currentMino, 1, 0)) {
			currentMino.x++;
		}
	}
	if (keys_frame["A"] == 1) {
		currentMino.dir = (currentMino.dir+1) % 4;
		if (!checkMino(board, currentMino, 0, 0)) {
			currentMino.dir = (currentMino.dir+3) % 4;
		}
	}
	if (keys_frame["B"] == 1) {
		currentMino.dir = (currentMino.dir+3) % 4;
		if (!checkMino(board, currentMino, 0, 0)) {
			currentMino.dir = (currentMino.dir+1) % 4;
		}
	}

	document.getElementById("debug").innerHTML = currentMino.x + ", " + currentMino.y;

	if (previousMino == undefined) {
		previousMino = new Mino(0);
	}
	// 普通の代入だと、currentMinoを変えたときにpreviousMinoも変わってしまう。
	previousMino.copy(currentMino);
	render();
}

function render() {
	let tmpx;
	let tmpy;
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
						context.drawImage(Asset.images['minos'], 0, 0, 6, 6, 
						BOARD_OFFSET.x + x*TILE_SIZE, BOARD_OFFSET.y + y*TILE_SIZE, TILE_SIZE, TILE_SIZE);
					}
				}
			}
		}
	}
}
