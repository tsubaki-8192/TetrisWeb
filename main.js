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
let keys = {};

let time;
let phase;
let num_present;

// テトリス関係
let board;

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
	
	get pattern() {
		let tmp = Mino.getMino(this.type);
		// 方向：Northやミノ：Oは回転不要
		if (this.dir != 0 && this.type != 6) {
			let pat = new Array(tmp.length);
			for(let i = 0; i < tmp.length; y++) {
				pat[i] = new Array(tmp[0].length).fill(0);
			}
			for (y=0; y<tmp.length; y++) {
				for (x=0; x<tmp[0].length; x++) {
					switch (dir) {
						case 1:
							pat = tmp[tmp.length-1 - x][y];
							break;
						case 2:
							pat = tmp[tmp.length-1 - y][tmp[0].length-1 - x];
							break;
							case 3:
							pat = tmp[x][tmp[0].length-1 - y];
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
			keys["Down"]++;
			break;

		case "KeyW":
		case "ArrowUp":
			keys["Up"]++;
			break;

		case "KeyA":
		case "ArrowLeft":
			keys["Left"]++;
			break;

		case "KeyD":
		case "ArrowRight":
			keys["Right"]++;
			break;

		case "KeyZ":
			keys["Jump"]++;
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
			keys["Down"] = 0;
			break;

		case "KeyW":
		case "ArrowUp":
			keys["Up"] = 0;
			break;

		case "KeyA":
		case "ArrowLeft":
			keys["Left"] = 0;
			break;

		case "KeyD":
		case "ArrowRight":
			keys["Right"] = 0;
			break;

		case "KeyZ":
			keys["Jump"] = 0;
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
	
	keys["Up"] = (pads[0].axes[1] < -0.25 ? keys["Up"]+1 : 0);
	keys["Down"] = (pads[0].axes[1] > 0.25) ? keys["Down"]+1 : 0;
	keys["Left"] = (pads[0].axes[0] < -0.25 ? keys["Left"]+1 : 0);
	keys["Right"] = (pads[0].axes[0] > 0.25 ? keys["Right"]+1 : 0);
	keys["Jump"] = pads[0].buttons[0].pressed ? keys["Jump"]+1 : 0;
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
}

function boardInit() {
	time = 0;
	phase = 0;

	// 一段多く確保することで、直感に反さずに済む(溢れを許容できる)
	board = Array(NUM_TILE_X*NUM_TILE_Y);
}

function update() {
	requestAnimationFrame(update);
	if (Object.keys(gamepads).length > 0) {
		checkGamepadInput();
	}

	time++;

	render();
}


function render() {
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
		}
	}
}
