'use strict';

class Random {
	// 再現可能な乱数を使用したいので、乱数クラスを定義する。
	// https://sbfl.net/blog/2017/06/01/javascript-reproducible-random/
	constructor(seed = 88675123) {
	  this.x = 123456789;
	  this.y = 362436069;
	  this.z = 521288629;
	  this.w = seed;
	}
	
	next() {
	  let t;
   
	  t = this.x ^ (this.x << 11);
	  this.x = this.y; this.y = this.z; this.z = this.w;
	  return this.w = (this.w ^ (this.w >>> 19)) ^ (t ^ (t >>> 8)); 
	}
	
	nextInt(min, max) {
	  const r = Math.abs(this.next());
	  return min + (r % (max + 1 - min));
	}
  }

class Vec2 {
	constructor(x, y) {
		this.x = x;
		this.y = y;
	}

	get length() {
		return Math.sqrt(x*x+y*y);
	}

	add(v) {
		this.x += v.x;
		this.y += v.y;
	}

	addPt(x, y) {
		this.x += x;
		this.y += y;
	}

	multiply(a) {
		this.x *= a;
		this.y *= a;
	}

	dot(v) {
		return (this.x*v.x + this.y*v.y);
	}
}

class Rectangle {
    constructor(x, y, w, h) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
    }

    hitTest(other) {
        const horizontal = (other.x < this.x + this.w) &&
            (this.x < other.x + other.w);
        const vertical = (other.y < this.y + this.h) &&
            (this.y < other.y + other.h);
        return (horizontal && vertical);
    }
}


class GameEvent {
	constructor(target) {
		this.target = target;
	}
}

class EventDispatcher {
    constructor() {
        this._eventListeners = {};
    }

    addEventListener(type, callback) {
        if(this._eventListeners[type] == undefined) {
            this._eventListeners[type] = [];
        }

        this._eventListeners[type].push(callback);
	}
	
	removeEventListener(type, callback) {
		this._eventListeners[type] = this._eventListeners[type].filter(n => n != callback);
	}

    dispatchEvent(type, event) {
        const listeners = this._eventListeners[type];
        if(listeners != undefined) listeners.forEach((callback) => callback(event));
    }
}

class Sprite  {
	constructor(image, rect) {
		this.image = image;
		this.rect = rect;
	}
}

class GameObject extends EventDispatcher {
	constructor(sprite) {
		super();
		this.sprite = sprite;
	}

	render(target) {
        const context = target.getContext('2d');
        const rect = this.sprite.rect;
		let p = VectoV(PostoW(rect.x, rect.y));
        context.drawImage(this.sprite.image,
            p.x, p.y,
            rect.w, rect.h);
	}

	isOutOfBounds(boundRect) {
        const horizontal = (boundRect.x > this.x + this.w) ||
            (this.x > boundRect.x + boundRect.w);
        const vertical = (boundRect.y > this.y + this.h) ||
            (this.y > boundRect.y + boundRect.h);
        return (horizontal && vertical);
	}

	get x() {
		return this.sprite.rect.x;
	}

	set x(value) {
		this.sprite.rect.x = value;
	}

	get y() {
		return this.sprite.rect.y;
	}

	set y(value) {
		this.sprite.rect.y = value;
	}
}

class Chara extends GameObject {
	constructor(sprite) {
		super(sprite);
		this.dir = new Vec2(0, 0);
		this.move = new Vec2(0, 0);
		this.accel = new Vec2(0, 0);	// 厳密には、加速度自体より、加速度分を加算している速度ベクトル。
	}

	render(target) {
        const context = target.getContext('2d');
        const rect = this.sprite.rect;
		let p = VectoV(PostoW(rect.x, rect.y));
			
		if (this.dir.x > 0) {
			context.scale(-1,1);
			context.drawImage(this.sprite.image, -(p.x+rect.w), p.y, rect.w, rect.h);
			context.scale(-1,1);
		}
		else {
			context.drawImage(this.sprite.image, p.x, p.y, rect.w, rect.h);
		}
	}
}