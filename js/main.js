function randomFromArray(array) {
	return array[Math.floor(Math.random() * array.length)];
}

(function init() {
	firebase.auth().signInAnonymously();
})();