// https://codepen.io/n33kos/pen/gjVQwv

const canvas = document.querySelector("#confetti");
const context = canvas.getContext("2d");
const root = document.querySelector(":root");

let renderingConfetti = false;

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let cx = context.canvas.width/2;
let cy = context.canvas.height/2;

let confetti = [];
const confettiCount = 200;
const gravity = 0.5;
const terminalVelocity = 5;
const drag = 0.1;

const colors = [
	getComputedStyle(root).getPropertyValue("--red-a").trim(),
	getComputedStyle(root).getPropertyValue("--orange-a").trim(),
	getComputedStyle(root).getPropertyValue("--yellow-a").trim(),
	getComputedStyle(root).getPropertyValue("--green-a").trim(),
	getComputedStyle(root).getPropertyValue("--blue-a").trim(),
	getComputedStyle(root).getPropertyValue("--purple-a").trim(),
	getComputedStyle(root).getPropertyValue("--pink-a").trim(),
];

const resizeCanvas = () => {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	cx = context.canvas.width / 2;
	cy = context.canvas.height / 2;
}

const randomRange = (min, max) => Math.random() * (max - min) + min;

function initConfetti() {
	for (let i = 0; i < confettiCount; i++) {
		confetti.push({
			color: colors[Math.floor(randomRange(0, colors.length))],
			dimensions: {
				x: randomRange(10, 20),
				y: randomRange(10, 30),
			},
			position: {
				x: randomRange(0, canvas.width),
				y: canvas.height - 1,
			},
			rotation: randomRange(0, 2 * Math.PI),
			scale: {
				x: 1,
				y: 1,
			},
			velocity: {
				x: randomRange(-25, 25),
				y: randomRange(0, -0.0575 * window.innerHeight),
			},
		});
	}
}

function renderConfetti() {
	if (!renderingConfetti)
		return;

	context.clearRect(0, 0, canvas.width, canvas.height);

	confetti.forEach((confetto, index) => {
		let width = (confetto.dimensions.x * confetto.scale.x);
		let height = (confetto.dimensions.y * confetto.scale.y);
		
		// Move canvas to position and rotate
		context.translate(confetto.position.x, confetto.position.y);
		context.rotate(confetto.rotation);
		
		// Apply forces to velocity
		confetto.velocity.x -= confetto.velocity.x * drag;
		confetto.velocity.y = Math.min(confetto.velocity.y + gravity, terminalVelocity);
		confetto.velocity.x += Math.random() > 0.5 ? Math.random() : -Math.random();
		
		// Set position
		confetto.position.x += confetto.velocity.x;
		confetto.position.y += confetto.velocity.y;
		
		// Delete confetti when out of frame
		if (confetto.position.y >= canvas.height) confetti.splice(index, 1);

		// Loop confetto x position
		if (confetto.position.x > canvas.width) confetto.position.x = 0;
		if (confetto.position.x < 0) confetto.position.x = canvas.width;

		// Spin confetto by scaling y
		confetto.scale.y = Math.cos(confetto.position.y * 0.1);
		context.fillStyle = confetto.color;
		
		// Draw confetto
		context.fillRect(-width / 2, -height / 2, width, height);
		
		// Reset transform matrix
		context.setTransform(1, 0, 0, 1, 0, 0);
	});

	window.requestAnimationFrame(renderConfetti);
}

function startConfetti() {
	initConfetti();

	renderingConfetti = true;
	renderConfetti();
}

function stopConfetti() {
	renderingConfetti = false;
	confetti = [];
}

window.addEventListener("resize", function () {
	resizeCanvas();
});