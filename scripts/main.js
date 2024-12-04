let rows = 5;
let rowEls = [];
let rowWrapperEls = [];
let pointersActive = new Array(5).fill(false);
let letterElementsPerRow = new Array(5);
let rowPositions = new Array(5).fill(0);
let rowOffsets = new Array(5).fill(0);
let rowTargetPositions = new Array(5).fill(0);
let rowChanged = new Array(5).fill(false);
let maxLettersPerRow = 10;
let letters = new Array(rows);
let gameFinished = false;
let won = false;
let correctWords = [];
let beadWidth = 0;
let beadGap = 0;
let gameSeed = "";
let beadRowMaxWidth = 0;
let leftButtons = [];
let rightButtons = [];
let pointsText;
let totalPoints = 0;
let wordsFound = 0;
let pointsAchieved = 0;
let wordContainer;
let progressBar;
let foundWordsWrapper;
let foundWordsButton;

let gameWeights = {
	maxPerRow: 7,
	visible: 5,
	fiveLetter: 2,
	fourLetterTop: 1,
	fourLetterBottom: 1,
	fourLetterMostUnique: 2,
	pointsFromFiveLetter: 5,
	pointsFromFourLetter: 3,
	pointsFromThreeLetter: 1,
};
let allFoundWords = [];
let animatingCorrectWords = false;

function generateRows() {
	// first, generate five letter words and add them to the list. these are going to be the words that are the basis of the whole operation
	// we prioritize five letter words that do not have duplicate letters with what is already in each row
	for (let i = 0; i < rows; i++) {
		letters[i] = new Array();
	}
	let totalFiveLetterWords = gameWeights.fiveLetter;
	let totalFourLetterWords =
		gameWeights.fourLetterTop +
		gameWeights.fourLetterBottom +
		gameWeights.fourLetterMostUnique;
	let totalThreeLetterWords = 0;
	correctWords = [];

	for (let i = 0; i < gameWeights.fiveLetter; i++) {
		let word = DTGCore.randomArrayElement(fiveLetter);
		if (correctWords.includes(word)) {
			i--;
			continue;
		}
		//iterate through the letters in the word and add them to the array
		for (let j = 0; j < word.length; j++) {
			if (!letters[j].includes(word[j])) letters[j].push(word[j]);
		}
		correctWords.push(word);
	}
	//now we generate the 4 letter words. for each 4 letter word we generate,
	// we will also generate a "score" for it, that indicates how well it fits within the rest
	// of the letters. we want to add 4 letter words that share letters in common, but also have unique letters
	// but we will only ever add the words to the list in either the top or bottom position (because there are max 5 rows)
	// because of this, we will calculate two scores for each word, one for the top and bottom
	// we will then sort this array twice, once in descending based on top score and again in descending in bottom score
	// we will add max 2 from top and 2 from bottom, and then we will add one "wildcard" word that has max unique value

	let iteratedUponFourLetterWords = [];
	let fourLetterWordsList = [];
	let maxIteratedFourLetterWords = 40;
	for (let i = 0; i < maxIteratedFourLetterWords; i++) {
		let word = DTGCore.randomArrayElement(fourLetter);
		if (iteratedUponFourLetterWords.includes(word)) {
			i--;
			continue;
		}
		let topScore = 0;
		let bottomScore = 0;
		for (let j = 0; j < word.length; j++) {
			if (letters[j].includes(word[j])) {
				topScore++;
			}
			if (letters[j + 1].includes(word[j])) {
				bottomScore++;
			}
		}
		iteratedUponFourLetterWords.push(word);
		fourLetterWordsList.push({ word, topScore, bottomScore });
	}
	let fourLetterTop = [...fourLetterWordsList];
	fourLetterTop.sort((a, b) => b.topScore - a.topScore);
	for (let i = 0; i < gameWeights.fourLetterTop; i++) {
		let word = fourLetterTop[0].word;
		//first, check to make sure that this word isnt "in" another word "e.g." bake and baker
		let existCheck = false;
		for (let j = 0; j < correctWords.length; j++) {
			if (correctWords[j].includes(word)) {
				existCheck = true;
				break;
			}
		}
		if (existCheck) {
			fourLetterTop.shift();
			i--;
			continue;
		}

		//now add the word to the list
		for (let j = 0; j < word.length; j++) {
			if (!letters[j].includes(word[j])) letters[j].push(word[j]);
		}
		correctWords.push(word);
	}
	let fourLetterBottom = [...fourLetterWordsList];
	fourLetterBottom.sort((a, b) => b.bottomScore - a.bottomScore);
	for (let i = 0; i < gameWeights.fourLetterBottom; i++) {
		let word = fourLetterBottom[0].word;
		//first, check to make sure that this word isnt "in" another word "e.g." bake and baker
		let existCheck = false;
		for (let j = 0; j < correctWords.length; j++) {
			if (correctWords[j].includes(word)) {
				existCheck = true;
				break;
			}
		}
		if (existCheck) {
			fourLetterBottom.shift();
			i--;
			continue;
		}

		//now add the word to the list
		for (let j = 0; j < word.length; j++) {
			if (!letters[j + 1].includes(word[j])) letters[j + 1].push(word[j]);
		}
		correctWords.push(word);
	}
	let fourLetterMostUnique = [...fourLetterWordsList];
	fourLetterMostUnique.sort(
		(a, b) => a.topScore + a.bottomScore - b.topScore - b.bottomScore
	);
	for (let i = 0; i < gameWeights.fourLetterMostUnique; i++) {
		let word = fourLetterMostUnique[0].word;
		//first, check to make sure that this word isnt "in" another word "e.g." bake and baker
		let existCheck = false;
		for (let j = 0; j < correctWords.length; j++) {
			if (correctWords[j].includes(word)) {
				existCheck = true;
				break;
			}
		}
		if (existCheck) {
			fourLetterMostUnique.shift();
			i--;
			continue;
		}

		//now add the word to the list
		for (let j = 0; j < word.length; j++) {
			if (!letters[j + (i % 2)].includes(word[j]))
				letters[j + (i % 2)].push(word[j]);
		}
		correctWords.push(word);
	}

	//at this point, we can calculate the capacity of each row. for the three letter words,
	// we want to use them to fill up the lowest capacity rows with unique letters
	let capacity = new Array(rows).fill(0);
	for (let i = 0; i < rows; i++) {
		capacity[i] = gameWeights.maxPerRow - letters[i].length;
	}
	//now we can generate an array that contains the indices of each row, sorted by capacity
	let sortedCapacity = [...capacity];
	sortedCapacity.sort((a, b) => a - b);
	let rowIndicesByCapacity = new Array(rows);
	let tmpCapacity = [...capacity];
	for (let i = 0; i < sortedCapacity.length; i++) {
		let cap = sortedCapacity[i];
		let idx = tmpCapacity.indexOf(cap);
		rowIndicesByCapacity[i] = idx;
		tmpCapacity[idx] = -1;
	}
	//now, we lets just focus on filling the row which is almost full with three letter words that have the most uniqueness across all rows
	let iteratedUponThreeLetterWords = [];
	let actualIterations = 0;
	let maxIterations = 100;
	for (let i = 0; i < capacity[rowIndicesByCapacity[0]]; i++) {
		actualIterations++;
		if (actualIterations > maxIterations) break;
		let actualRowIndex = Math.min(rowIndicesByCapacity[0], 2); // because we only have 5 rows, and the words are 3 letters long, prevents overflow
		let word = DTGCore.randomArrayElement(threeLetter);
		if (iteratedUponThreeLetterWords.includes(word)) {
			i--;
			continue;
		}
		iteratedUponThreeLetterWords.push(word);
		let existCheck = false;
		for (let j = 0; j < correctWords.length; j++) {
			if (correctWords[j].includes(word)) {
				existCheck = true;
				break;
			}
		}
		if (existCheck) {
			i--;
			continue;
		}
		//now we must only add this word if it is ENTIRELY UNIQUE
		let unique = true;
		for (let j = 0; j < word.length; j++) {
			if (letters[actualRowIndex + j].includes(word[j])) {
				unique = false;
				break;
			}
		}
		if (!unique) {
			i--;
			continue;
		}
		for (let j = 0; j < word.length; j++) {
			letters[actualRowIndex + j].push(word[j]);
		}
		totalThreeLetterWords++;
		correctWords.push(word);
	}

	//now, for each row, we will fill the rest of the capacity with random letters
	for (let i = 0; i < rows; i++) {
		capacity[i] = gameWeights.maxPerRow - letters[i].length;
	}
	for (let i = 0; i < rows; i++) {
		for (let j = 0; j < capacity[i]; j++) {
			let letter = DTGCore.randomArrayElement("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
			if (letters[i].includes(letter)) {
				j--;
				continue;
			}
			letters[i].push(letter);
		}
	}
	//lastly, we will shuffle the letters in each row
	for (let i = 0; i < rows; i++) {
		shuffle(letters[i]);
	}

	//now, we need to go through all our letters and add words that are real solutions but were not generated by us.
	// we will add them to the list of correct words, and then we will print out the board

	//TODO: this is really messy nested loops, try and make this prettier
	//five letters
	for (let c = 0; c < maxLettersPerRow; c++) {
		for (let cc = 0; cc < maxLettersPerRow; cc++) {
			for (let ccc = 0; ccc < maxLettersPerRow; ccc++) {
				for (let cccc = 0; cccc < maxLettersPerRow; cccc++) {
					for (let ccccc = 0; ccccc < maxLettersPerRow; ccccc++) {
						let word =
							letters[0][c] +
							letters[1][cc] +
							letters[2][ccc] +
							letters[3][cccc] +
							letters[4][ccccc];
						if (fiveLetter.includes(word) && !correctWords.includes(word)) {
							correctWords.push(word);
							totalFiveLetterWords++;
						}
					}
				}
			}
		}
	}
	//four letters
	for (let r = 0; r < 2; r++) {
		for (let c = 0; c < maxLettersPerRow; c++) {
			for (let cc = 0; cc < maxLettersPerRow; cc++) {
				for (let ccc = 0; ccc < maxLettersPerRow; ccc++) {
					for (let cccc = 0; cccc < maxLettersPerRow; cccc++) {
						let word =
							letters[r][c] +
							letters[r + 1][cc] +
							letters[r + 2][ccc] +
							letters[r + 3][cccc];
						if (fourLetter.includes(word) && !correctWords.includes(word)) {
							correctWords.push(word);
							totalFourLetterWords++;
						}
					}
				}
			}
		}
	}
	//three letters
	for (let r = 0; r < 3; r++) {
		for (let c = 0; c < maxLettersPerRow; c++) {
			for (let cc = 0; cc < maxLettersPerRow; cc++) {
				for (let ccc = 0; ccc < maxLettersPerRow; ccc++) {
					let word = letters[r][c] + letters[r + 1][cc] + letters[r + 2][ccc];
					if (threeLetter.includes(word) && !correctWords.includes(word)) {
						correctWords.push(word);
						totalThreeLetterWords++;
					}
				}
			}
		}
	}

	console.log(
		"Total words generated: " +
			(totalFiveLetterWords + totalFourLetterWords + totalThreeLetterWords)
	);
	console.log("Five letter words: " + totalFiveLetterWords);
	console.log("Four letter words: " + totalFourLetterWords);
	console.log("Three letter words: " + totalThreeLetterWords);

	totalPoints =
		totalFiveLetterWords * gameWeights.pointsFromFiveLetter +
		totalFourLetterWords * gameWeights.pointsFromFourLetter +
		totalThreeLetterWords * gameWeights.pointsFromThreeLetter;

	console.log(correctWords);
	letters.forEach((e) => {
		console.log(e.join(""));
	});
}
const root = document.documentElement;

function init() {
	gameSeed = new Intl.DateTimeFormat("en-US", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(new Date());
	gameSplash = document.getElementById("splash");
	splashDate = document.getElementById("splash-date");
	window.DTGCore = new DTGameCore(gameSplash, splashDate);
	console.log("generating");
	generateRows();
	console.log("generated");
	const styles = getComputedStyle(root);
	timerText = document.getElementById("elapsed-text");
	beadWidth = parseInt(styles.getPropertyValue("--bead-size"));
	beadGap = parseInt(styles.getPropertyValue("--bead-horizontal-gap"));
	beadRowMaxWidth =
		beadWidth * gameWeights.maxPerRow + beadGap * gameWeights.maxPerRow;
	let rowFadeWrapper = document.getElementById("row-fade-wrapper");
	let leftButtonWrapper = document.getElementById("left-buttons");
	let rightButtonWrapper = document.getElementById("right-buttons");
	pointsText = document.getElementById("points-text");
	pointsText.innerHTML = `${pointsAchieved}/${totalPoints} pts`;
	progressBar = document.getElementById("progress-bar");
	progressBar.style.width = `${(pointsAchieved / totalPoints) * 100}%`;
	window.addEventListener("resize", onResize);
	wordContainer = document.getElementById("word-container");
	foundWordsWrapper = document.getElementById("found-words");
	foundWordsButton = document.getElementById("found-words-button");

	let savedData = loadData("beads-today");
	if (savedData != null && savedData.date == gameSeed) {
		wordsFound = savedData.amountOfWordsFound;
		pointsAchieved = savedData.pointsAchieved;
		allFoundWords = savedData.wordsFound;
		gameFinished = savedData.complete;
		won = savedData.won;
		timerValue = savedData.timeElapsed;
		document.getElementById("game-tagline").innerText = "You've already started searching today. What else can you find?"
		document.getElementById("game-action-button").innerText = "Continue"
		updateUIWithSaveData();
	}
	updateStats();

	for (let i = 0; i < rows; i++) {
		let leftButton = document.createElement("button");
		leftButton.innerHTML = `<i class="ti ti-chevron-left"></i>`;
		leftButtonWrapper.appendChild(leftButton);
		leftButton.onclick = function () {
			incrementRow(i, -1);
		};
		leftButtons.push(leftButton);
		let rightButton = document.createElement("button");
		rightButton.innerHTML = `<i class="ti ti-chevron-right"></i>`;
		rightButtonWrapper.appendChild(rightButton);
		rightButton.onclick = function () {
			incrementRow(i, 1);
		};
		rightButtons.push(rightButton);

		let wrapper = document.createElement("div");
		wrapper.classList.add("row-wrapper");
		wrapper.id = "row-wrapper-" + (i + 1);
		rowFadeWrapper.appendChild(wrapper);
		let row = document.createElement("div");
		row.classList.add("row-inner");
		row.id = "row-" + (i + 1);
		wrapper.appendChild(row);

		wrapper.addEventListener(
			"pointerdown",
			function (e) {
				onPointerDown(e, i);
			},
			{ passive: false }
		);
		document.addEventListener(
			"pointerup",
			function (e) {
				onPointerUp(e, i);
			},
			{ passive: false }
		);
		document.addEventListener(
			"pointermove",
			function (e) {
				onPointerMove(e, i);
			},
			{ passive: false }
		);

		rowEls.push(row);
		rowWrapperEls.push(wrapper);
		letterElementsPerRow[i] = new Array(gameWeights.maxPerRow);
		for (let j = 0; j < gameWeights.maxPerRow; j++) {
			letterElementsPerRow[i][j] = new Array(3);
		}
		for (let c = 0; c < 3; c++) {
			//iterate through this 3 times to make dummy copies before and after
			for (let j = 0; j < gameWeights.maxPerRow; j++) {
				let letter = document.createElement("div");
				letter.classList.add("letter");
				letter.innerHTML = letters[i][j];
				row.appendChild(letter);
				letterElementsPerRow[i][j][c] = letter;
			}
		}
	}
}

let prevMousePositionX = 0;

function onPointerDown(e, i) {
	e.preventDefault();
	if (animatingCorrectWords) return;
	pointersActive[i] = true;
	prevMousePositionX = e.clientX;
	rowChanged[i] = true;
}

function onPointerUp(e, i) {
	e.preventDefault();
	pointersActive[i] = false;
	if (!rowChanged[i]) return;
	rowChanged[i] = false;
	//now, we need to snap the row to the nearest bead
	rowTargetPositions[i] =
		Math.round(rowPositions[i] / (beadWidth + beadGap)) * (beadWidth + beadGap);
	rowOffsets[i] = -1 * Math.round(rowPositions[i] / (beadWidth + beadGap));
	beginPositionLerp(i);
	calculateWins();
}

function onPointerMove(e, i) {
	if (!pointersActive[i]) return;
	e.preventDefault();
	rowPositions[i] += e.clientX - prevMousePositionX;
	if (rowPositions[i] > beadRowMaxWidth / 2) {
		rowPositions[i] -= beadRowMaxWidth;
	}
	if (rowPositions[i] < -beadRowMaxWidth / 2) {
		rowPositions[i] += beadRowMaxWidth;
	}

	rowEls[i].style.transform = `translateX(${rowPositions[i]}px)`;
	prevMousePositionX = e.clientX;
}

function incrementRow(i, c) {
	if (animatingCorrectWords) return;
	rowOffsets[i] -= c;
	rowTargetPositions[i] = rowOffsets[i] * (beadWidth + beadGap) * -1;

	if (rowOffsets[i] > gameWeights.maxPerRow / 2) {
		rowOffsets[i] -= gameWeights.maxPerRow;
	}
	if (rowOffsets[i] < -gameWeights.maxPerRow / 2) {
		rowOffsets[i] += gameWeights.maxPerRow;
	}

	if (rowTargetPositions[i] > beadRowMaxWidth / 2) {
		rowPositions[i] -= beadRowMaxWidth;
		rowTargetPositions[i] -= beadRowMaxWidth;
	}
	if (rowTargetPositions[i] < -beadRowMaxWidth / 2) {
		rowPositions[i] += beadRowMaxWidth;
		rowTargetPositions[i] += beadRowMaxWidth;
	}
	beginPositionLerp(i);
	calculateWins();
}

function beginPositionLerp(i) {
	let start = rowPositions[i];
	let end = rowTargetPositions[i];
	let duration = 0.2;
	let startTime = performance.now();
	function lerp() {
		let currentTime = performance.now();
		let timeElapsed = (currentTime - startTime) / 1000;
		let newPosition = easeInOutQuad(timeElapsed, start, end - start, duration);
		rowEls[i].style.transform = `translateX(${newPosition}px)`;
		if (timeElapsed < duration) {
			requestAnimationFrame(lerp);
		} else {
			rowPositions[i] = rowTargetPositions[i];
		}
	}
	requestAnimationFrame(lerp);
}

function calculateWins() {
	let visibleLetters = new Array(rows);
	let spacesAlreadyChecked = new Array(rows);
	for (let i = 0; i < rows; i++) {
		spacesAlreadyChecked[i] = new Array(gameWeights.maxPerRow).fill(false);
	}

	for (let r = 0; r < rows; r++) {
		for (let i = rowOffsets[r]; i < rowOffsets[r] + gameWeights.visible; i++) {
			let idx = i + (gameWeights.maxPerRow - gameWeights.visible) / 2;
			if (idx < 0) idx += gameWeights.maxPerRow;
			if (idx >= gameWeights.maxPerRow) idx -= gameWeights.maxPerRow;
			visibleLetters[r] = visibleLetters[r] || [];
			visibleLetters[r].push(letters[r][idx]);
		}
	}
	//now we need to check if visible letters contain any of our correct words
	let correctWordsFound = [];
	let correctWordLocations = [];
	//first, five letters are easiest
	for (let i = 0; i < gameWeights.visible; i++) {
		let word =
			visibleLetters[0][i] +
			visibleLetters[1][i] +
			visibleLetters[2][i] +
			visibleLetters[3][i] +
			visibleLetters[4][i];
		if (correctWords.includes(word) && !allFoundWords.includes(word)) {
			spacesAlreadyChecked[0][i] = true;
			spacesAlreadyChecked[1][i] = true;
			spacesAlreadyChecked[2][i] = true;
			spacesAlreadyChecked[3][i] = true;
			spacesAlreadyChecked[4][i] = true;
			correctWordsFound.push(word);
			wordsFound++;
			correctWordLocations.push({ word, row: 0, col: i, length: 5 });
		}
	}
	//now, four letters
	for (let r = 0; r < 2; r++) {
		for (let i = 0; i < gameWeights.visible; i++) {
			let word =
				visibleLetters[r][i] +
				visibleLetters[r + 1][i] +
				visibleLetters[r + 2][i] +
				visibleLetters[r + 3][i];
			//because we can have four letter words which are "sub" words of a five letter word, such as bake and baker, we need to make sure that at least one of the spaces hasnt already been checked as won
			if (
				correctWords.includes(word) &&
				!allFoundWords.includes(word) &&
				!spacesAlreadyChecked[r][i] &&
				!spacesAlreadyChecked[r + 1][i] &&
				!spacesAlreadyChecked[r + 2][i] &&
				!spacesAlreadyChecked[r + 3][i]
			) {
				spacesAlreadyChecked[r][i] = true;
				spacesAlreadyChecked[r + 1][i] = true;
				spacesAlreadyChecked[r + 2][i] = true;
				spacesAlreadyChecked[r + 3][i] = true;

				correctWordsFound.push(word);
				wordsFound++;
				correctWordLocations.push({ word, row: r, col: i, length: 4 });
			}
		}
	}
	//now, three letters
	for (let r = 0; r < 3; r++) {
		for (let i = 0; i < gameWeights.visible; i++) {
			let word =
				visibleLetters[r][i] +
				visibleLetters[r + 1][i] +
				visibleLetters[r + 2][i];
			//because a three letter word can be a sub of a four or five letter word, BUT can still be a unique word (consider flage is a column, where flag and age are two valid words), we need to see if at the very least one of the spaces has not been already checked
			if (
				correctWords.includes(word) &&
				!allFoundWords.includes(word) &&
				(!spacesAlreadyChecked[r][i] ||
					!spacesAlreadyChecked[r + 1][i] ||
					!spacesAlreadyChecked[r + 2][i])
			) {
				correctWordsFound.push(word);
				wordsFound++;
				correctWordLocations.push({ word, row: r, col: i, length: 3 });
			}
		}
	}
	//now, we need to add the words to the list of all found words
	correctWordsFound.forEach((e) => {
		allFoundWords.push(e);
	});
	console.log(correctWordsFound);
	console.log(correctWordLocations);

	postCorrectnessCheck(correctWordLocations);
}
let letterDuration = 200; //mseconds, needs to be the same as the animation in css
let letterOffset = 100; //mseconds
let wordHangDuration = 1000; //mseconds
let wordSeparation = 500; //mseconds

function postCorrectnessCheck(locations) {
	if (locations.length === 0) return;
	animatingCorrectWords = true;
	leftButtons.forEach((e) => (e.disabled = true));
	rightButtons.forEach((e) => (e.disabled = true));
	let totalDuration = 0;
	locations.forEach((e, i) => {
		setTimeout(() => {
			switch (e.length) {
				case 5:
					pointsAchieved += gameWeights.pointsFromFiveLetter;
					break;
				case 4:
					pointsAchieved += gameWeights.pointsFromFourLetter;
					break;
				case 3:
					pointsAchieved += gameWeights.pointsFromThreeLetter;
					break;
			}
			pointsText.innerHTML = `${pointsAchieved}/${totalPoints} pts`;
			progressBar.style.width = `${(pointsAchieved / totalPoints) * 100}%`;
			startCorrectWordAnimation(e);
		}, totalDuration + i * (wordSeparation + wordHangDuration));
		totalDuration += (e.length - 1) * letterOffset + letterDuration;
	});
	setTimeout(() => {
		animatingCorrectWords = false;
		leftButtons.forEach((e) => (e.disabled = false));
		rightButtons.forEach((e) => (e.disabled = false));
		saveGameProgress();
		saveGameToHistory();
		if (pointsAchieved >= totalPoints) gameWin();
	}, totalDuration + (wordHangDuration + wordSeparation) * locations.length);
}

function startCorrectWordAnimation(location) {
	let row = location.row;
	let col = location.col;
	let length = location.length;
	wordContainer.innerHTML = "";
	let wordEl = document.createElement("div");
	wordEl.classList.add("correct-word");
	wordEl.innerHTML = location.word;
	wordContainer.appendChild(wordEl);
	let ptsEl = document.createElement("div");
	ptsEl.classList.add("awarded-points");
	ptsEl.innerHTML = `+${
		length === 5
			? gameWeights.pointsFromFiveLetter
			: length === 4
			? gameWeights.pointsFromFourLetter
			: gameWeights.pointsFromThreeLetter
	}pts`;
	wordContainer.appendChild(ptsEl);
	let foundWord = document.createElement("p");
	foundWord.innerText = location.word;
	foundWordsWrapper.appendChild(foundWord);
	updateStats();

	for (let i = 0; i < length; i++) {
		let c = col + 1 + rowOffsets[row + i];
		if (c >= gameWeights.maxPerRow) c -= gameWeights.maxPerRow;
		if (c < 0) c += gameWeights.maxPerRow;
		for (let j = 0; j < 3; j++) {
			let letter = letterElementsPerRow[row + i][c][j];
			// letter.style.animation = `letter-correct ${letterDuration}ms ease-in-out ${i * letterOffset}ms 1 forwards`;
			letter.classList.add("letter-correct");
			letter.style.transitionDelay = `${i * letterOffset}ms`;
		}
	}
	setTimeout(() => {
		wordEl.classList.add("fade-out");
		ptsEl.classList.add("fade-out");
		for (let i = 0; i < length; i++) {
			let c = col + 1 + rowOffsets[row + i];
			if (c >= gameWeights.maxPerRow) c -= gameWeights.maxPerRow;
			if (c < 0) c += gameWeights.maxPerRow;
			for (let j = 0; j < 3; j++) {
				let letter = letterElementsPerRow[row + i][c][j];
				letter.style.transitionDelay = `0ms`;
				letter.classList.remove("letter-correct");
			}
		}
	}, (length - 1) * letterOffset + letterDuration + wordHangDuration);
}

function shuffleRows() {
	if (animatingCorrectWords) return;
	animatingCorrectWords = true;

	for (let i = 0; i < rows; i++) {
		for (let j = 0; j < gameWeights.maxPerRow; j++) {
			for (let k = 0; k < 3; k++) {
				letterElementsPerRow[i][j][k].style.transitionDelay = `${
					Math.random() * 200
				}ms`;
				letterElementsPerRow[i][j][k].classList.add("letter-hide-letter");
			}
		}
	}
	setTimeout(() => {
		for (let i = 0; i < rows; i++) {
			shuffle(letters[i]);

			rowOffsets[i] = 0;
			rowTargetPositions[i] = 0;
			rowPositions[i] = 0;
			rowEls[i].style.transform = `translateX(${0}px)`;
			for (let j = 0; j < gameWeights.maxPerRow; j++) {
				for (let k = 0; k < 3; k++) {
					letterElementsPerRow[i][j][k].classList.remove("letter-hide-letter");
					letterElementsPerRow[i][j][k].innerHTML = letters[i][j];
				}
			}
		}
		setTimeout(() => {
			for (let i = 0; i < rows; i++) {
				for (let j = 0; j < gameWeights.maxPerRow; j++) {
					for (let k = 0; k < 3; k++) {
						letterElementsPerRow[i][j][k].style.transitionDelay = "0ms";
					}
				}
			}
			animatingCorrectWords = false;
		}, 400);
	}, 400);
}
function toggleViewFoundWords() {
	foundWordsWrapper.classList.toggle("visible");
	foundWordsButton.classList.toggle("active");
}

function easeInOutQuad(t, b, c, d) {
	t /= d / 2;
	if (t < 1) return (c / 2) * t * t + b;
	t--;
	return (-c / 2) * (t * (t - 2) - 1) + b;
}

function shuffle(array) {
	let currentIndex = array.length;

	// While there remain elements to shuffle...
	while (currentIndex != 0) {
		// Pick a remaining element...
		let randomIndex = Math.floor(DTGCore.randomFloat() * currentIndex);
		currentIndex--;

		// And swap it with the current element.
		[array[currentIndex], array[randomIndex]] = [
			array[randomIndex],
			array[currentIndex],
		];
	}
}

function gameWin() {
	gameFinished = true;
	won = true;
	saveGameProgress();
	saveGameToHistory();
}

function onResize() {
	const styles = getComputedStyle(root);
	beadWidth = parseInt(styles.getPropertyValue("--bead-size"));
	beadGap = parseInt(styles.getPropertyValue("--bead-horizontal-gap"));
	beadRowMaxWidth =
		beadWidth * gameWeights.maxPerRow + beadGap * gameWeights.maxPerRow;

	for (let i = 0; i < rows; i++) {
		rowPositions[i] = rowTargetPositions[i] =
			rowOffsets[i] * (beadWidth + beadGap) * -1;
		rowEls[i].style.transform = `translateX(${rowTargetPositions[i]}px)`;
	}
}
let timerText;
let timerInterval;
let timerValue = 0; //in seconds
function startTimer() {
	incrementTimer();
}
function incrementTimer() {
	timerValue += 1;
	let minutes = Math.floor(timerValue / 60);
	let seconds = timerValue % 60;
	let minutesString = minutes < 10 ? "0" + minutes : minutes;
	let secondsString = seconds < 10 ? "0" + seconds : seconds;
	timerText.innerText = `${minutesString}:${secondsString}`;

	setTimeout(() => {
		incrementTimer();
	}, 1000);
}

function saveGameProgress() {
	let gameObject = {
		amountOfWordsFound: wordsFound,
		wordsFound: allFoundWords,
		pointsAchieved: pointsAchieved,
		complete: gameFinished,
		won: won,
		timeElapsed: timerValue,
		date: gameSeed,
	};
	saveData("beads-today", gameObject);
	
	console.log("Game Progress Saved");
}

function saveGameToHistory() {
	let history = loadData("beads-history") ?? [];
	//if there is history for today, update that history, otherwise add to the list
	let found = false;
	history.forEach((e) => {
		if (e.date == gameSeed && !found) {
			e.wordsFound = wordsFound;
			found = true;
			return;
		}
	});
	if (!found) {
		history.push({ date: gameSeed, wordsFound: wordsFound });
	}
	saveData("beads-history", history);
	updateStats();
}

function saveData(id, data) {
	localStorage.setItem(id, JSON.stringify(data));
}

function loadData(id) {
	return JSON.parse(localStorage.getItem(id));
}

function updateUIWithSaveData() {
	let data = loadData("beads-today");
	if (data == null) return;
	pointsText.innerHTML = `${pointsAchieved}/${totalPoints} pts`;
	progressBar.style.width = `${(pointsAchieved / totalPoints) * 100}%`;
	let minutes = Math.floor(timerValue / 60);
	let seconds = timerValue % 60;
	let minutesString = minutes < 10 ? "0" + minutes : minutes;
	let secondsString = seconds < 10 ? "0" + seconds : seconds;
	timerText.innerText = `${minutesString}:${secondsString}`;
	data.wordsFound.forEach((w) => {
		let foundWord = document.createElement("p");
		foundWord.innerText = w;
		foundWordsWrapper.appendChild(foundWord);
	});
}

function updateStats() {
	let stats = loadData("beads-history");
	document.getElementById("total-plays").innerText = stats?.length ?? 0;
	let totalWords = 0;
	stats?.forEach((e) => {
		totalWords += e.wordsFound;
	});
	document.getElementById("total-words").innerText = totalWords;
}

function startGame() {
	DTGCore.hideSplashScreen();
	setTimeout(() => {
		startTimer();
	}, 500);
}

init();
