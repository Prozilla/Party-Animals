export const name = "slime";

let orbs = [];
const orbSpawnDelay = 1000;
const orbRadius = 20;
let lastOrbSpawn;

let mouseX, mouseY;

function spawnOrb(scene) {
	const x = Math.random() * screen.width;
	const y = Math.random() * screen.height;

	const orb = scene.add.circle(x, y, orbRadius, "#000");
	orbs.push(orb);
}

function collectOrb(orb, scene) {
	if (orbs.includes(orb)) {
		// Delete orb
		orb.destroy();
		orbs = orbs.filter((obj) => { return obj != orb; });

		// Add score
		scene.score += 3;
		scene.player.radius = scene.score;
	}
}

const Slime = new Phaser.Class({Extends: Phaser.Scene,
    create: function() {
		this.score = 30;
		this.player = this.add.circle(400, 200, this.score, "#000");
    },

	update: function(time, delta) {
		if (lastOrbSpawn == null) {
			lastOrbSpawn = time;
		}

		if (time - lastOrbSpawn > orbSpawnDelay) {
			lastOrbSpawn = time;
			spawnOrb(this);
		}

		if (mouseX != null && mouseY != null) {
			// Move player based on mouse position
			const mouseOffsetX = parseInt(mouseX) - parseInt(this.player.x);
			const mouseOffsetY = parseInt(mouseY) - parseInt(this.player.y);

			const speed = this.score / 3000;

			this.player.x += mouseOffsetX * speed;
			this.player.y += mouseOffsetY * speed;
		}

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
	},

});

export function start() {
	console.log("Starting slime");

	const config = {
		type: "auto",
		width: screen.width,
		height: screen.height,
		physics: {
			default: "arcade",
			arcade: {
				gravity: { y: 300 },
				debug: false
			}
		},
		scene: [Slime],
		backgroundColor: "#fff",
	};
	
	const game = new Phaser.Game(config);

	window.addEventListener("mousemove", (event) => {
		mouseX = event.clientX;
		mouseY = event.clientY;
	});
}