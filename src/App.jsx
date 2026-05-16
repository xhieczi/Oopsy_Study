import { useState, useCallback, useEffect, useRef } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker?url";
import GameCanvas from "./components/GameCanvas";
import QuizModal from "./components/QuizModal";
import "./App.css";

import logo from "./assets/images/logo.jpeg";

import kittyImg from "./assets/images/kitty.png";
import melodyImg from "./assets/images/melody.png";
import kuromiImg from "./assets/images/kuromi.png";
import cinnamorollImg from "./assets/images/cinnamoroll.png";

import kittyBg from "./assets/backgrounds/kitty-bg.jpeg";
import melodyBg from "./assets/backgrounds/melody-bg.jpeg";
import kuromiBg from "./assets/backgrounds/kuromi-bg.jpeg";
import cinnamorollBg from "./assets/backgrounds/cinnamoroll-bg.jpeg";

import flapSound from "./assets/sounds/flap.mp3";
import hitSound from "./assets/sounds/hit.wav";
import pointSound from "./assets/sounds/point.wav";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

function App() {
  const [showStartScreen, setShowStartScreen] = useState(true);

  const [theme, setTheme] = useState("cinnamoroll");
  const [showQuiz, setShowQuiz] = useState(false);
  const [gameKey, setGameKey] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [difficulty, setDifficulty] = useState("medium");

  const [reviewerText, setReviewerText] = useState("");
  const [questions, setQuestions] = useState([]);
  const [questionQueue, setQuestionQueue] = useState([]);
  const [usedQuestionCount, setUsedQuestionCount] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [message, setMessage] = useState("Upload your reviewer first 💖");

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [coins, setCoins] = useState(0);
  const [bestScore, setBestScore] = useState(() => {
    return Number(localStorage.getItem("oopsyBestScore")) || 0;
  });

  const [reviveCountdown, setReviveCountdown] = useState(null);

  const flapAudio = useRef(new Audio(flapSound));
  const hitAudio = useRef(new Audio(hitSound));
  const pointAudio = useRef(new Audio(pointSound));

  const themeBackgrounds = {
    kitty: kittyBg,
    melody: melodyBg,
    kuromi: kuromiBg,
    cinnamoroll: cinnamorollBg,
  };

  const themeIcons = {
    kitty: kittyImg,
    melody: melodyImg,
    kuromi: kuromiImg,
    cinnamoroll: cinnamorollImg,
  };

  const difficultySettings = {
    easy: { pipeGap: 180, pipeSpeed: 2.4 },
    medium: { pipeGap: 155, pipeSpeed: 3 },
    hard: { pipeGap: 130, pipeSpeed: 3.6 },
  };

  useEffect(() => {
    document.body.style.backgroundImage = `url(${themeBackgrounds[theme]})`;
  }, [theme]);

  useEffect(() => {
    if (score > bestScore) {
      setBestScore(score);
      localStorage.setItem("oopsyBestScore", String(score));
    }
  }, [score, bestScore]);

  function playSound(audioRef) {
    if (muted) return;
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => {});
  }

  function shuffle(array) {
    return [...array].sort(() => Math.random() - 0.5);
  }

  async function readPdfFile(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = "";

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const pageText = content.items.map((item) => item.str).join(" ");
      fullText += pageText + "\n";
    }

    return fullText;
  }

  async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    setHasStarted(false);
    setShowQuiz(false);
    setQuestions([]);
    setQuestionQueue([]);
    setUsedQuestionCount(0);
    setCurrentQuestion(null);
    setFeedback("");
    setMessage("Reading your file... ✨");

    const fileName = file.name.toLowerCase();

    if (fileName.endsWith(".pdf")) {
      const text = await readPdfFile(file);
      setReviewerText(text);
      setMessage("PDF uploaded! Click Generate Questions ✨");
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      setReviewerText(e.target.result);
      setMessage("Reviewer uploaded! Click Generate Questions ✨");
    };

    reader.readAsText(file);
  }

  function generateQuestions() {
    setHasStarted(false);
    setShowQuiz(false);
    setCurrentQuestion(null);
    setFeedback("");
    setUsedQuestionCount(0);

    if (!reviewerText.trim()) {
      setMessage("Upload or paste your reviewer first 😭");
      return;
    }

    const sentences = reviewerText
      .split(/[.!?]/)
      .map((sentence) => sentence.trim())
      .filter((sentence) => sentence.length > 40);

    if (sentences.length === 0) {
      setMessage("Your reviewer needs longer sentences 😭");
      return;
    }

    const commonWords = [
      "about",
      "after",
      "again",
      "also",
      "because",
      "before",
      "being",
      "between",
      "could",
      "every",
      "first",
      "from",
      "have",
      "their",
      "there",
      "these",
      "those",
      "this",
      "through",
      "under",
      "using",
      "where",
      "which",
      "while",
      "would",
      "should",
      "important",
      "example",
      "different",
      "following",
    ];

    const allWords = reviewerText
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .split(/\s+/)
      .map((word) => word.trim())
      .filter(
        (word) =>
          word.length > 5 && !commonWords.includes(word.toLowerCase())
      );

    const uniqueWords = [...new Set(allWords)];
    const generated = [];

    sentences.forEach((sentence) => {
      const words = sentence
        .replace(/[^a-zA-Z0-9\s]/g, "")
        .split(/\s+/)
        .map((word) => word.trim())
        .filter(
          (word) =>
            word.length > 5 && !commonWords.includes(word.toLowerCase())
        );

      const answer = words[0];
      if (!answer) return;

      const shortSentence =
        sentence.length > 140 ? `${sentence.slice(0, 140)}...` : sentence;

      const wrongChoices = shuffle(
        uniqueWords.filter(
          (word) => word.toLowerCase() !== answer.toLowerCase()
        )
      ).slice(0, 3);

      while (wrongChoices.length < 3) {
        wrongChoices.push(["concept", "method", "process"][wrongChoices.length]);
      }

      const questionType = ["fill", "identify", "trueFalse"][
        Math.floor(Math.random() * 3)
      ];

      let questionObject;

      if (questionType === "fill") {
        const questionText = shortSentence.replace(
          new RegExp(answer, "i"),
          "_____"
        );

        questionObject = {
          question: `Fill in the blank: ${questionText}`,
          choices: shuffle([answer, ...wrongChoices]),
          answer,
        };
      }

      if (questionType === "identify") {
        questionObject = {
          question: `What term is described? "${shortSentence}"`,
          choices: shuffle([answer, ...wrongChoices]),
          answer,
        };
      }

      if (questionType === "trueFalse") {
        const isTrue = Math.random() > 0.5;
        let statement = shortSentence;

        if (!isTrue && uniqueWords.length > 0) {
          const replacementWord =
            uniqueWords[Math.floor(Math.random() * uniqueWords.length)];

          statement = shortSentence.replace(
            new RegExp(answer, "i"),
            replacementWord
          );
        }

        questionObject = {
          question: `True or False: "${statement}"`,
          choices: ["True", "False"],
          answer: isTrue ? "True" : "False",
        };
      }

      generated.push(questionObject);
    });

    if (generated.length === 0) {
      setMessage("Could not generate questions 😭");
      return;
    }

    const shuffledQuestions = shuffle(generated);

    setQuestions(shuffledQuestions);
    setQuestionQueue(shuffledQuestions);
    setMessage(`Generated ${shuffledQuestions.length} smart questions ✨`);
  }

  function startGame() {
    if (questions.length === 0) {
      setMessage("Generate questions first before starting 😭");
      return;
    }

    playSound(flapAudio);

    setScore(0);
    setLives(3);
    setCoins(0);
    setShowQuiz(false);
    setFeedback("");
    setIsPaused(false);
    setHasStarted(true);
    setUsedQuestionCount(0);
    setQuestionQueue(shuffle(questions));
    setReviveCountdown(null);
    setGameKey((prev) => prev + 1);
  }

  function restartGame() {
    if (questions.length === 0) return;

    playSound(flapAudio);

    setScore(0);
    setLives(3);
    setCoins(0);
    setShowQuiz(false);
    setFeedback("");
    setIsPaused(false);
    setHasStarted(true);
    setUsedQuestionCount(0);
    setQuestionQueue(shuffle(questions));
    setReviveCountdown(null);
    setGameKey((prev) => prev + 1);
  }

  function backToSetup() {
    setHasStarted(false);
    setLives(3);
    setScore(0);
    setCoins(0);
    setShowQuiz(false);
    setFeedback("");
    setIsPaused(false);
    setReviveCountdown(null);
    setMessage("Generate new questions or start again 💖");
  }

  function goToNextQuestion() {
    setQuestionQueue((prevQueue) => {
      let newQueue = [...prevQueue];

      if (newQueue.length === 0) {
        newQueue = shuffle(questions);
      }

      const nextQuestion = newQueue[0];

      if (!nextQuestion) return [];

      setCurrentQuestion(nextQuestion);
      setUsedQuestionCount((prev) => prev + 1);

      return newQueue.slice(1);
    });

    setFeedback("");
  }

  function beginReviveCountdown() {
    setShowQuiz(false);
    setFeedback("");
    setReviveCountdown(3);

    let count = 3;

    const timer = setInterval(() => {
      count -= 1;

      if (count === 0) {
        clearInterval(timer);
        setReviveCountdown("Go!");

        setTimeout(() => {
          setReviveCountdown(null);
          setGameKey((prev) => prev + 1);
        }, 500);
      } else {
        setReviveCountdown(count);
      }
    }, 700);
  }

  const handleScore = useCallback(() => {
    playSound(pointAudio);
    setScore((prev) => prev + 1);
    setCoins((prev) => prev + 2);
  }, [muted]);

  const handleCrash = useCallback(() => {
    if (questions.length === 0) return;

    playSound(hitAudio);

    setLives((prev) => Math.max(prev - 1, 0));

    setQuestionQueue((prevQueue) => {
      let newQueue = [...prevQueue];

      if (newQueue.length === 0) {
        newQueue = shuffle(questions);
      }

      const nextQuestion = newQueue[0];

      if (!nextQuestion) return [];

      setCurrentQuestion(nextQuestion);
      setUsedQuestionCount((prev) => prev + 1);

      return newQueue.slice(1);
    });

    setFeedback("");
    setShowQuiz(true);
  }, [questions, muted]);

  function handleAnswer(choice) {
    if (!currentQuestion) return;

    if (choice === currentQuestion.answer) {
      playSound(pointAudio);

      setFeedback("Correct! Get ready 💖");
      setCoins((prev) => prev + 10);

      setTimeout(() => {
        beginReviveCountdown();
      }, 700);
    } else {
      playSound(hitAudio);

      setFeedback("Wrong! Showing answer...");

      setTimeout(() => {
        goToNextQuestion();
      }, 1200);
    }
  }

  if (showStartScreen) {
    return (
      <div className="startScreen">
        <div className="startCard">
          <img src={logo} alt="Oopsy Study Logo" className="logo" />

          <h1>Oopsy Study 💖</h1>

          <p>Turn your reviewers into a game 🎮</p>

          <button
            className="startScreenButton"
            onClick={() => setShowStartScreen(false)}
          >
            Start ✨
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <main className={`app ${theme}`}>
        <section className="sidebar">
          {!hasStarted ? (
            <>
              <h1>Oopsy Study 💖</h1>

              <div className="appMessage">{message}</div>

              <div className="instructions">
                Press <b>Space</b> or <b>click</b> to flap. Crash and answer a
                quiz correctly to revive.
              </div>

              <label>Choose Theme</label>
              <div className="themePicker">
                <button
                  className={`themeCard ${
                    theme === "kitty" ? "activeTheme" : ""
                  }`}
                  onClick={() => setTheme("kitty")}
                >
                  <img src={kittyImg} alt="Hello Kitty" />
                  <span>Hello Kitty</span>
                </button>

                <button
                  className={`themeCard ${
                    theme === "melody" ? "activeTheme" : ""
                  }`}
                  onClick={() => setTheme("melody")}
                >
                  <img src={melodyImg} alt="My Melody" />
                  <span>My Melody</span>
                </button>

                <button
                  className={`themeCard ${
                    theme === "kuromi" ? "activeTheme" : ""
                  }`}
                  onClick={() => setTheme("kuromi")}
                >
                  <img src={kuromiImg} alt="Kuromi" />
                  <span>Kuromi</span>
                </button>

                <button
                  className={`themeCard ${
                    theme === "cinnamoroll" ? "activeTheme" : ""
                  }`}
                  onClick={() => setTheme("cinnamoroll")}
                >
                  <img src={cinnamorollImg} alt="Cinnamoroll" />
                  <span>Cinnamoroll</span>
                </button>
              </div>

              <label>Difficulty</label>
              <div className="difficultyPicker">
                <button
                  className={difficulty === "easy" ? "activeOption" : ""}
                  onClick={() => setDifficulty("easy")}
                >
                  Easy
                </button>

                <button
                  className={difficulty === "medium" ? "activeOption" : ""}
                  onClick={() => setDifficulty("medium")}
                >
                  Medium
                </button>

                <button
                  className={difficulty === "hard" ? "activeOption" : ""}
                  onClick={() => setDifficulty("hard")}
                >
                  Hard
                </button>
              </div>

              <label>Import reviewer file</label>
              <input
                type="file"
                accept=".txt,.pdf"
                onChange={handleFileUpload}
              />

              <label>Reviewer text</label>
              <textarea
                placeholder="Upload or paste your reviewer here..."
                value={reviewerText}
                onChange={(e) => {
                  setReviewerText(e.target.value);
                  setHasStarted(false);
                  setQuestions([]);
                  setQuestionQueue([]);
                  setUsedQuestionCount(0);
                  setCurrentQuestion(null);
                  setMessage("Reviewer edited. Generate questions again ✨");
                }}
              />

              <div className="buttonRow">
                <button onClick={generateQuestions}>
                  Generate Questions ✨
                </button>
                <button onClick={startGame}>Start Game 💖</button>
              </div>
            </>
          ) : (
            <div className="cleanSidebar">
              <h1>Oopsy Study 💖</h1>

              <div className="cleanCharacterBox">
                <img src={themeIcons[theme]} alt="Current character" />
              </div>

              <div className="cleanStatus">
                <p>Focus mode activated 🎮</p>
                <p>Keep flapping and answer to revive!</p>
              </div>

              <button onClick={backToSetup}>Back to Setup ✨</button>
            </div>
          )}
        </section>

        <section className="gameArea">
          <div className="stats">
            <span>Questions: {questions.length}</span>
            <span>Used: {usedQuestionCount}</span>
            <span>Score: {score}</span>
            <span>Best: {bestScore} 🏆</span>
            <span>Lives: {lives} 💖</span>
            <span>Coins: {coins} 🪙</span>
          </div>

          <div className="gameControls">
            <button onClick={() => setMuted((prev) => !prev)}>
              {muted ? "Unmute 🔊" : "Mute 🔇"}
            </button>

            {hasStarted && lives > 0 && !showQuiz && !reviveCountdown && (
              <button onClick={() => setIsPaused((prev) => !prev)}>
                {isPaused ? "Resume ▶️" : "Pause ⏸️"}
              </button>
            )}

            {hasStarted && <button onClick={restartGame}>Restart 🔁</button>}
          </div>

          {!hasStarted && lives > 0 && (
            <div className="gameBox">
              {questions.length === 0
                ? "Upload reviewer → Generate Questions ✨"
                : "Questions ready! Press Start Game 💖"}
            </div>
          )}

          {reviveCountdown && (
            <div className="countdownOverlay">
              <div className="countdownCard">{reviveCountdown}</div>
            </div>
          )}

          {hasStarted && !showQuiz && lives > 0 && !reviveCountdown && (
            <GameCanvas
              key={gameKey}
              onCrash={handleCrash}
              onScore={handleScore}
              birdImage={themeIcons[theme]}
              paused={isPaused}
              pipeGap={difficultySettings[difficulty].pipeGap}
              pipeSpeed={difficultySettings[difficulty].pipeSpeed}
              playFlap={() => playSound(flapAudio)}
            />
          )}

          {lives === 0 && (
            <div className="gameBox">
              <div className="gameOverCard">
                <h2>Game Over 😭</h2>

                <div className="finalStats">
                  <p>
                    Final Score: <b>{score}</b>
                  </p>
                  <p>
                    Best Score: <b>{bestScore}</b> 🏆
                  </p>
                  <p>
                    Coins Earned: <b>{coins}</b> 🪙
                  </p>
                  <p>
                    Questions Used: <b>{usedQuestionCount}</b>
                  </p>
                </div>

                <div className="gameOverButtons">
                  <button onClick={restartGame}>Restart Game 🔁</button>
                  <button onClick={backToSetup}>Back to Setup ✨</button>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>

      <QuizModal
        open={showQuiz}
        question={currentQuestion}
        onAnswer={handleAnswer}
        feedback={feedback}
        currentNumber={usedQuestionCount}
        totalQuestions={questions.length}
      />

      <div className="floatingChars">
        <img src={themeIcons[theme]} className="char" alt="Theme character" />
      </div>

      <div className={`themeParticles ${theme}`}>
        {[...Array(12)].map((_, index) => (
          <img
            key={index}
            src={themeIcons[theme]}
            className={`particle p${index}`}
            alt=""
          />
        ))}
      </div>

      <div className="sparkles">
        <span>✨</span>
        <span>💖</span>
        <span>⭐</span>
        <span>🌸</span>
        <span>✨</span>
      </div>
    </>
  );
}

export default App;