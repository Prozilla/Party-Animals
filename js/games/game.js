import WebFontFile from "../webFontFile.js";

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
	
	changeImageColor(context, image, color) {
		context.willReadFrequently = true;
		const pixels = context.getImageData(0, 0, image.width, image.height);
		color = this.hexToRgb(color);
	
		for (let i = 0; i < pixels.data.length / 4; i++)
		{
			this.changePixelColor(pixels.data, i * 4, color);
		}
	
		context.putImageData(pixels, 0, 0);
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

export const gameConfig = {
	type: Phaser.CANVAS,
	scale: {
		mode: Phaser.Scale.RESIZE,
		width: screen.width,
		height: screen.height
	},
	physics: {
		default: "arcade",
		arcade: {
			gravity: { y: 300 },
			debug: false
		}
	},
	dom: {
		createContainer: true
	},
}

// TO DO: create player class for all players
// export class Player {
	
// }

export class GameScene extends Phaser.Scene {
	constructor(title, currentPlayers, playerId, currentHostId, currentPartyCode, debugMode, worldSize, startingScore, speedMultiplier) {
		super();

		console.log("Launching game: " + title);

		this.title = title;
		this.worldSize = worldSize;
		this.startingScore = startingScore;
		this.speedMultiplier = speedMultiplier;

		this.members = JSON.parse(JSON.stringify(currentPlayers));
		this.players = currentPlayers;
		this.playerGameObjects = {};

		this.playerData = this.players[playerId];
		this.hostId = currentHostId;
		this.partyCode = currentPartyCode;

		if (debugMode)
			this.allowEndGame = false;
		
		window.addEventListener("mousemove", (event) => {this.updateMouse(event)});
		window.addEventListener("touchmove", (event) => {this.updateMouse(event)});
	}

	preload() {
		this.load.addFile(new WebFontFile(this.load, "Fredoka"));

		Object.keys(this.players).forEach((key) => {
			const player = this.players[key];
			this.load.svg(player.id, `media/characters/${player.animal.toLowerCase()}.svg`);
		});
	}

	create() {
		this.gameDataRef = firebase.database().ref(`parties/${this.partyCode}/gameData`);
		this.playersRef = this.gameDataRef.child("players");
	
		if (this.hostId == this.playerData.id) {
			for (const key of Object.keys(this.players)) {
				const position = util.randomPosition(0, 0, this.worldSize, this.worldSize);
				const player = this.players[key];
	
				player.x = position.x;
				player.y = position.y;
				player.score = this.startingScore;
				player.isDead = false;
			}
	
			this.gameDataRef.set({
				name: this.title,
				players: this.players,
			});
	
			this.gameDataRef.onDisconnect().remove();
		}
	
		this.playersRef.on("value", (snapshot) => {
			if (snapshot.val() == null)
				return;

			this.players = snapshot.val();
			this.playerData = this.players[this.playerData.id];
	
			let totalPlayers = 0;
			let alivePlayers = 0;
			let lastAlivePlayer;
	
			Object.keys(this.players).forEach((key) => {
				const player = this.players[key];
				const gameObject = this.playerGameObjects[key];
	
				if (gameObject != null) {
					// Update position
					gameObject.x = player.x;
					gameObject.y = player.y;
					gameObject.character.x = player.x;
					gameObject.character.y = player.y;
	
					// Update score
					gameObject.score = player.score;
					gameObject.radius = player.score;
					gameObject.character.displayWidth = player.score * 4;
					gameObject.character.displayHeight = player.score * 4;
	
					// Set depth based on score
					gameObject.setDepth(player.score + 100);
					gameObject.character.setDepth(player.score + 101);
					gameObject.nametag.setDepth(player.score + 102);
	
					// Update nametag position
					gameObject.nametag.x = player.x;
					gameObject.nametag.y = player.y - player.score - 20;
	
					totalPlayers++;
	
					// Hide dead players
					if (player.isDead) {
						gameObject.visible = false;
						gameObject.character.visible = false;
						gameObject.nametag.visible = false;
					} else {
						alivePlayers++;
						lastAlivePlayer = player;
					}
				}
			});
	
			if (alivePlayers < 2 && totalPlayers > 0) {
				this.end(lastAlivePlayer);
			}
		});
	
		this.playerRef = this.playersRef.child(this.playerData.id);

		Object.keys(this.players).forEach((key) => {
			const player = this.players[key];

			// Add player
			const playerColor = colors[player.color][0];

			const gameObject = this.add.circle(player.x, player.y, player.score, `0x${playerColor}`);
			gameObject.setDepth(100);

			this.playerGameObjects[player.id] = gameObject;

			// Add player character (https://phaser.io/examples/v3/view/textures/edit-texture-silhouette)
			const originalTexture = this.textures.get(player.id).getSourceImage();
			const newTexture = this.textures.createCanvas(player.id + "_new", originalTexture.width, originalTexture.height); // Using player id because texture keys must be unique

			const context = newTexture.getSourceImage().getContext("2d");
			context.drawImage(originalTexture, 0, 0);
			util.changeImageColor(context, originalTexture, colors[player.color][1]);

			gameObject.character = this.add.image(player.x, player.y, player.id + "_new");
			gameObject.character.setDepth(101);
			gameObject.character.setOrigin(0.5, 0.5);

			gameObject.character.image = originalTexture;
			gameObject.character.context = context;

			gameObject.character.displayWidth = player.score * 4;
			gameObject.character.displayHeight = player.score * 4;

			// Add player name
			gameObject.nametag = this.add.text(player.x, player.y, player.name, {
				fontFamily: '"Fredoka"',
				fontSize: "32px",
				fill: "#000"
			});

			gameObject.nametag.setOrigin(0.5, 1);
			gameObject.nametag.setDepth(102);
		});

		// Set up camera
		this.cameras.main.startFollow(this.playerGameObjects[this.playerData.id]);
	}

	updateMouse(event) {
		this.mouseX = event.clientX;
		this.mouseY = event.clientY;
	
		// Mobile touch
		if ((this.mouseX == null || this.mouseY == null) && event.targetTouches != null) {
			this.mouseX = event.targetTouches[0].clientX;
			this.mouseY = event.targetTouches[0].clientY;
		}
	}

	update(time, delta) {
		// Move player based on mouse position
		if (this.mouseX != null && this.mouseY != null) {
			const worldMouseX = parseInt(this.mouseX + this.cameras.main.scrollX);
			const worldMouseY = parseInt(this.mouseY + this.cameras.main.scrollY);

			const distance = util.calculateDistance(this.playerData, {x: worldMouseX, y: worldMouseY});
			let factor = util.clampValue(screen.width > screen.height ? distance / (screen.height / 4) : distance / (screen.width / 4), 0, 1);

			const a = 250;
			const b = a / 3 + 40;
			const speed =  a / (this.playerData.score - this.startingScore + b) * this.speedMultiplier * delta;

			const newPosition = util.moveTowards(this.playerData.x, this.playerData.y, worldMouseX, worldMouseY, factor * speed);

			// Move player
			let x = newPosition.x;
			let y = newPosition.y;

			// Clamp position
			x = util.clampValue(x, 0 + this.playerData.score / 2, this.worldSize - this.playerData.score / 2);
			y = util.clampValue(y, 0 + this.playerData.score / 2, this.worldSize - this.playerData.score / 2);

			if (parseInt(x) && parseInt(y))
				this.playerRef.update({x, y});
		}
	}

	end(winner) {
		if (this.allowEndGame) {
			// Remove event listeners
			this.playersRef.off("value");
	
			// Give a point to the winner
			const winnerRef = firebase.database().ref(`parties/${this.partyCode}/members/${winner.id}`);
			winnerRef.update({
				score: this.members[winner.id].score + 1
			});
	
			// Delete game data
			this.gameDataRef.remove();
	
			this.sys.game.destroy(true);
		}
	}

	addScore(amount) {
		if (!parseInt(amount))
			return;

		this.playerRef.update({
			score: this.playerData.score + amount
		});
	}
	
	killPlayer(player) {
		const playerRef = firebase.database().ref(`parties/${this.partyCode}/gameData/players/${player.id}`);
		playerRef.update({
			isDead: true
		});
	
		this.addScore(player.score / 2);
	}	

}

const util = new Util();