import WebFontFile from "../webFontFile.js";

export const name = "slime";

const worldSize = 2000;

const colors = {
	"Red": ["e74c3c", "c0392b"],
	"Orange": ["e67e22", "d35400"],
	"Yellow": ["f1c40f", "f39c12"],
	"Green": ["2ecc71", "27ae60"],
	"Blue": ["3498db", "2980b9"],
	"Purple": ["9b59b6", "8e44ad"],
	"Pink": ["e78ae7", "b65fb6"],
}

// Orbs
let orbs = [];
const orbSpawnDelay = 500;
const orbRadius = 20;
let lastOrbSpawn;

let playerData;
let mouseX, mouseY;

function spawnOrb(scene) {
	const x = Math.random() * worldSize;
	const y = Math.random() * worldSize;

	const colorNames = Object.keys(colors);
  	const color = colors[colorNames[Math.floor(colorNames.length * Math.random())]][0];

	const orb = scene.add.circle(x, y, orbRadius, `0x${color}`);
	scene.orbsGroup.add(orb);
	orbs.push(orb);
}

function collectOrb(orb, scene) {
	if (orbs.includes(orb)) {
		// Delete orb
		orb.destroy();
		orbs = orbs.filter((obj) => { return obj != orb; });

		// Add score
		addScore(scene, 2);
	}
}

function addScore(scene, amount) {
	scene.score += amount;

	// grow player
	scene.player.radius = scene.score;
	scene.player.character.displayWidth = scene.score * 4;
	scene.player.character.displayHeight = scene.score * 4;
}

function mouseMove(event) {
	mouseX = event.clientX;
	mouseY = event.clientY;

	// Mobile touch
	if ((mouseX == null || mouseY == null) && event.targetTouches != null) {
		mouseX = event.targetTouches[0].clientX;
		mouseY = event.targetTouches[0].clientY;
	}
}

function hexToRgb(hex) {
	var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return result ? {
		r: parseInt(result[1], 16),
		g: parseInt(result[2], 16),
		b: parseInt(result[3], 16)
	} : null;
}

function changeImageColor(context, image, color) {
	const pixels = context.getImageData(0, 0, image.width, image.height);
	color = hexToRgb(color);

    for (let i = 0; i < pixels.data.length / 4; i++)
    {
        changePixelColor(pixels.data, i * 4, color);
    }

    context.putImageData(pixels, 0, 0);
}

function changePixelColor(data, index, color)
{
    data[index] = color.r;
    data[index + 1] = color.g;
    data[index + 2] = color.b;
}

const Slime = new Phaser.Class({Extends: Phaser.Scene,
	preload: function() {
		this.load.addFile(new WebFontFile(this.load, "Fredoka"));
		this.load.svg("character", `media/characters/${playerData.animal.toLowerCase()}.svg`);
	},

    create: function() {
		this.orbsGroup = this.add.group();

		// Add player
		this.score = 30;
		const playerColor = colors[playerData.color][0];

		const playerX = screen.width / 2;
		const playerY = screen.height / 2;

		this.player = this.add.circle(playerX, playerY, this.score, `0x${playerColor}`);
		this.player.setDepth(100);

		// Add player character (https://phaser.io/examples/v3/view/textures/edit-texture-silhouette)
		const originalTexture = this.textures.get("character").getSourceImage();
		const newTexture = this.textures.createCanvas("characterNew", originalTexture.width, originalTexture.height);

		const context = newTexture.getSourceImage().getContext("2d");
		context.drawImage(originalTexture, 0, 0);
		changeImageColor(context, originalTexture, colors[playerData.color][1]);

		this.player.character = this.add.image(playerX, playerY, "characterNew");
		this.player.character.setDepth(101);
		this.player.character.setOrigin(0.5, 0.5);

		this.player.character.image = originalTexture;
		this.player.character.context = context;

		this.player.character.displayWidth = this.score * 4;
		this.player.character.displayHeight = this.score * 4;

		// Add player name
		const playerName = playerData.name;
		this.player.nametag = this.add.text(playerX, playerY, playerName, {
			fontFamily: '"Fredoka"',
			fontSize: "32px",
			fill: "#000"
		});
		this.player.nametag.setOrigin(0.5, 1);
		this.player.nametag.setDepth(102);

		// Set up camera
		this.cameras.main.setBounds(0, 0, worldSize, worldSize);
		this.cameras.main.startFollow(this.player);
    },

	update: function(time, delta) {
		// Handle orb spawning
		if (lastOrbSpawn == null) {
			lastOrbSpawn = time;
		}

		if (time - lastOrbSpawn > orbSpawnDelay) {
			lastOrbSpawn = time;
			spawnOrb(this);
		}

		// Move player based on mouse position
		if (mouseX != null && mouseY != null) {
			const mouseOffsetX = parseInt(mouseX + this.cameras.main.scrollX) - parseInt(this.player.x);
			const mouseOffsetY = parseInt(mouseY + this.cameras.main.scrollY) - parseInt(this.player.y);

			const speed = Math.sqrt(this.score) / 1000;

			// Move player
			this.player.x += mouseOffsetX * speed;
			this.player.y += mouseOffsetY * speed;

			this.player.character.x = this.player.x;
			this.player.character.y = this.player.y;
		}

		// Collect orbs
		for (let i = 0; i < orbs.length; i++) {
			const orb = orbs[i];

			const horizontalDistance = this.player.x - orb.x;
			const verticalDistance = this.player.y - orb.y;

			const distance = Math.sqrt(horizontalDistance * horizontalDistance + verticalDistance * verticalDistance);

			if (distance < this.score * 1.5) {
				if (distance < this.score - orbRadius) {
					collectOrb(orb, this);
				} else {
					// Pull orb towards player
					const pullForce = Math.pow(1 - distance / 10000, 3);
					const speed = pullForce < 0 ? 0 : pullForce;

					const offsetX = this.player.x - orb.x;
					const offsetY = this.player.y - orb.y;

					orb.x += offsetX / 1000 * speed;
					orb.y += offsetY / 1000 * speed;
				}
			}
		}

		// Update player nametag position
		this.player.nametag.x = this.player.x;
		this.player.nametag.y = this.player.y - this.score - 20;
	},

});

export function start(player) {
	console.log("Starting slime");
	playerData = player;
	console.log(playerData);

	const config = {
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
		scene: [Slime],
		backgroundColor: "#fff",
	};
	
	const game = new Phaser.Game(config);

	window.addEventListener("mousemove", mouseMove);
	window.addEventListener("touchmove", mouseMove);

	// window.addEventListener("resize", () => {
	// 	game.width = screen.width;
	// 	game.height = screen.height;
	// });
}