export const colors = {
	"Red": ["e74c3c", "c0392b"],
	"Orange": ["e67e22", "d35400"],
	"Yellow": ["f1c40f", "f39c12"],
	"Green": ["2ecc71", "27ae60"],
	"Blue": ["3498db", "2980b9"],
	"Purple": ["9b59b6", "8e44ad"],
	"Pink": ["e78ae7", "b65fb6"],
}

export class Util {
	hexToRgb(hex) {
		var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
		return result ? {
			r: parseInt(result[1], 16),
			g: parseInt(result[2], 16),
			b: parseInt(result[3], 16)
		} : null;
	}
	
	// https://phaser.io/examples/v3/view/textures/edit-texture-silhouette
	generateColoredImage(scene, imageName, color) {
		const image = scene.textures.get(imageName).getSourceImage();

		const id = this.generateId(10);
		const newTexture = scene.textures.createCanvas(id, image.width, image.height);

		const context = newTexture.getSourceImage().getContext("2d", {willReadFrequently: true});
		context.drawImage(image, 0, 0);

		const pixels = context.getImageData(0, 0, image.width, image.height);
		color = this.hexToRgb(color);
	
		for (let i = 0; i < pixels.data.length / 4; i++)
		{
			this.changePixelColor(pixels.data, i * 4, color);
		}
	
		context.putImageData(pixels, 0, 0);

		return id;
	}
	
	changePixelColor(data, index, color)
	{
		data[index] = color.r;
		data[index + 1] = color.g;
		data[index + 2] = color.b;
	}

	clampValue(value, min, max) {
		return value < min ? min : value > max ? max : value;
	}
	
	randomRange(min, max) {
		min = Math.ceil(min);
		max = Math.floor(max);
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}

	randomFromArray(items) {
		return items[Math.floor(Math.random() * items.length)];
	}
	
	randomPosition(minX, minY, maxX, maxY) {
		return {
			x: this.randomRange(minX, maxX),
			y: this.randomRange(minY, maxX)
		}
	}
	
	calculateDistance(position1, position2) {
		const horizontalDistance = position1.x - position2.x;
		const verticalDistance = position1.y - position2.y;
	
		return Math.sqrt(horizontalDistance * horizontalDistance + verticalDistance * verticalDistance);
	}
	
	moveTowards(x, y, targetX, targetY, factor) {
		const vector = {x: targetX - x, y: targetY - y};
	
		const magnitude = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
		const direction = {x: vector.x / magnitude, y: vector.y / magnitude};
	
		return {x: x + direction.x * factor, y: y + direction.y * factor};
	}
	
	generateId(size) {
		var result = "";
		var characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
		var charactersCount = characters.length;
	
		for ( var i = 0; i < size; i++ ) {
			result += characters.charAt(Math.floor(Math.random() * charactersCount));
		}
	
	   return result;
	}
}