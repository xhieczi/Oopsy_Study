import { useEffect, useRef } from "react";
import bg from "../assets/backgrounds/game-bg.jpeg";
import pipeImg from "../assets/pipes/pipe-bottom.png";

function GameCanvas({
  onCrash,
  onScore,
  birdImage,
  paused,
  pipeGap,
  pipeSpeed,
  playFlap,
}) {
  const canvasRef = useRef(null);
  const pausedRef = useRef(paused);
  const onScoreRef = useRef(onScore);
  const onCrashRef = useRef(onCrash);
  const playFlapRef = useRef(playFlap);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    onScoreRef.current = onScore;
    onCrashRef.current = onCrash;
    playFlapRef.current = playFlap;
  }, [onScore, onCrash, playFlap]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const characterImg = new Image();
    characterImg.src = birdImage;

    const bgImg = new Image();
    bgImg.src = bg;

    const pipeImage = new Image();
    pipeImage.src = pipeImg;

    let bgX = 0;
    let bird = { x: 120, y: 200, velocity: 0 };
    let pipes = [];
    let gravity = 0.4;
    let frame = 0;
    let gameRunning = true;
    let animationId;

    const pipeWidth = 65;
    const birdSize = 64;     
    const birdHitbox = 28;   

    function crash() {
      if (!gameRunning) return;
      gameRunning = false;
      onCrashRef.current();
    }

    function drawBackground() {
      if (!bgImg.complete) {
        ctx.fillStyle = "#cceeff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        return;
      }

      ctx.drawImage(bgImg, bgX, 0, canvas.width, canvas.height);
      ctx.drawImage(bgImg, bgX + canvas.width, 0, canvas.width, canvas.height);

      if (!pausedRef.current) {
        bgX -= 1;
      }

      if (bgX <= -canvas.width) {
        bgX = 0;
      }
    }

    function drawBird() {
      ctx.save();
      ctx.translate(bird.x, bird.y);
      ctx.rotate(Math.max(-0.35, Math.min(0.55, bird.velocity * 0.04)));

      if (characterImg.complete) {
        ctx.drawImage(
        characterImg,
        -birdSize / 2,
        -birdSize / 2,
        birdSize,
        birdSize
      );
      } else {
        ctx.fillStyle = "#ff77b2";
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    function drawPipe(x, y, width, height, isTop) {
      if (!pipeImage.complete) {
        ctx.fillStyle = "#5ec94f";
        ctx.fillRect(x, y, width, height);
        return;
      }

      ctx.save();

      if (isTop) {
        ctx.translate(x + width / 2, y + height / 2);
        ctx.scale(1, -1);
        ctx.drawImage(pipeImage, -width / 2, -height / 2, width, height);
      } else {
        ctx.drawImage(pipeImage, x, y, width, height);
      }

      ctx.restore();
    }

    function drawPipes() {
      pipes.forEach((pipe) => {
        const extend = 40;

        drawPipe(pipe.x, -extend, pipeWidth, pipe.top + extend, true);

        drawPipe(
          pipe.x,
          pipe.bottom,
          pipeWidth,
          canvas.height - pipe.bottom + extend,
          false
        );
      });
    }

    function createPipe() {
      const minTopHeight = 70;
      const maxTopHeight = canvas.height - pipeGap - 70;

      const top =
        Math.random() * (maxTopHeight - minTopHeight) + minTopHeight;

      pipes.push({
        x: canvas.width,
        top,
        bottom: top + pipeGap,
        passed: false,
      });
    }

    function updatePipes() {
      if (frame % 95 === 0) {
        createPipe();
      }

      pipes.forEach((pipe) => {
        pipe.x -= pipeSpeed;

        if (!pipe.passed && pipe.x + pipeWidth < bird.x) {
          pipe.passed = true;
          onScoreRef.current();
        }

        const hitPipe =
          bird.x + birdHitbox > pipe.x &&
          bird.x - birdHitbox < pipe.x + pipeWidth &&
          (bird.y - birdHitbox < pipe.top ||
            bird.y + birdHitbox > pipe.bottom);

        if (hitPipe) {
          crash();
        }
      });

      pipes = pipes.filter((pipe) => pipe.x + pipeWidth > -50);
    }

    function drawPausedText() {
      ctx.save();
      ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "white";
      ctx.font = "bold 32px Arial";
      ctx.textAlign = "center";
      ctx.fillText("Paused ⏸️", canvas.width / 2, canvas.height / 2);
      ctx.restore();
    }

    function update() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      drawBackground();

      if (!pausedRef.current) {
        bird.velocity += gravity;
        bird.y += bird.velocity;

        if (bird.y + birdHitbox > canvas.height || bird.y - birdHitbox < 0) {
          crash();
        }

        updatePipes();
        frame++;
      }

      drawPipes();
      drawBird();

      if (pausedRef.current) {
        drawPausedText();
      }

      if (gameRunning) {
        animationId = requestAnimationFrame(update);
      }
    }

    function flap() {
      if (gameRunning && !pausedRef.current) {
        bird.velocity = -7;

        if (playFlapRef.current) {
          playFlapRef.current();
        }
      }
    }

    function handleKeyDown(e) {
      if (e.code === "Space") {
        e.preventDefault();
        flap();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    canvas.addEventListener("click", flap);

    update();

    return () => {
      gameRunning = false;
      cancelAnimationFrame(animationId);
      window.removeEventListener("keydown", handleKeyDown);
      canvas.removeEventListener("click", flap);
    };
  }, [birdImage, pipeGap, pipeSpeed]);

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={400}
      style={{
        width: "100%",
        borderRadius: "20px",
      }}
    />
  );
}

export default GameCanvas;