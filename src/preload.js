const {
	contextBridge,
	ipcRenderer
} = require("electron");

let id = 0;
let ctx;
let ctxHelper;
let helper;
let vid;
let h = 500;
let w = 500;
ipcRenderer.on('setSource', async (event, sourceId) => {
	console.error("Source set successfully");
	id = sourceId
	helper = document.getElementById('screenshot-canvas');
	ctxHelper = helper.getContext('2d');
	drawFrame();
});

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
	"api", {
	send: (channel, canvas, video) => {
		// whitelist channels
		let validChannels = ["toMain"];
		if (validChannels.includes(channel)) {
			ctx = canvas.getContext('2d');
			vid = video;
			console.error("Ctx set successfully");
			//ipcRenderer.send(channel, data);
		}
	},
	receive: (channel, func) => {
		let validChannels = ["fromMain"];
		if (validChannels.includes(channel)) {
			// Deliberately strip event as it includes `sender` 
			ipcRenderer.on(channel, (event, ...args) => {
				func(...args);
			});
		}
	},
	resize: (width, height) => {
		w = width;
		h = height;
	}
}
);

async function drawFrame() {
	const stream = await navigator.mediaDevices.getUserMedia({
		audio: false,
		video: {
			mandatory: {
				chromeMediaSource: 'desktop',
				chromeMediaSourceId: id,
				minWidth: 1280,
				maxWidth: 10000,
				minHeight: 720,
				maxHeight: 4000
			}
		}
	});
	handleStream(stream);
	setTimeout(drawFrame(), 1000 / 30)
}

function handleStream(stream) {
	vid.srcObject = stream
	vid.onloadedmetadata = function (e) {
		vid.play()
		helper.width = this.videoWidth;
		helper.height = this.videoHeight;
		ctxHelper.drawImage(vid, 0, 0, this.videoWidth, this.videoHeight)

		const imageData = ctxHelper.getImageData(0, 32, this.videoWidth, this.videoHeight);
		const data = imageData.data;
		for (let i = 0; i < data.length; i += 4) {
			let colour = getColour(data[i], data[i + 1], data[i + 2]);
			data[i] = colour[0];
			data[i + 1] = colour[1];
			data[i + 2] = colour[2];
		}
		helper.height -= 32;
		ctxHelper.putImageData(imageData, 0, 0);



		ctx.drawImage(helper, 0, 0, w, h);
	}
	console.error(getColour(15, 235, 124));
}

function getColour(r, g, b) {
	let closestDifference = 100000000000;
	let closestColour = [0, 0, 0];
	for (colour of default_palette) {
		let dr = colour[0] - r;
		let dg = colour[1] - g;
		let db = colour[2] - b;
		let difference = dr * dr + dg * dg + db * db;
		if (difference < closestDifference) {
			closestDifference = difference;
			closestColour[0] = colour[0];
			closestColour[1] = colour[1];
			closestColour[2] = colour[2];
		}
	}

	return closestColour;
}

const default_palette = [
	[0, 0, 0], // Black
	[128, 128, 128], // Dark Gray
	[128, 0, 0], // Dark Red
	[128, 128, 0], // Pea Green
	[0, 128, 0], // Dark Green
	[0, 128, 128], // Slate
	[0, 0, 128], // Dark Blue
	[128, 0, 128], // Lavender
	[128, 128, 64], //
	[0, 64, 64], //
	[0, 128, 255], //
	[0, 64, 128], //
	[64, 0, 255], //
	[128, 64, 0], //
	[255, 255, 255], // White
	[192, 192, 192], // Light Gray
	[255, 0, 0], // Bright Red
	[255, 255, 0], // Yellow
	[0, 255, 0], // Bright Green
	[0, 255, 255], // Cyan
	[0, 0, 255], // Bright Blue
	[255, 0, 255], // Magenta
	[255, 255, 128], //
	[0, 255, 128], //
	[128, 255, 255], //
	[128, 128, 255], //
	[255, 0, 128], //
	[255, 128, 64], //
];
