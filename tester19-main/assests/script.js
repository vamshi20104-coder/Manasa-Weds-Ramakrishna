
<script>

/* =========================================================
   ALWAYS START INVITATION FROM HERO AFTER REFRESH
   Prevent the browser from restoring the previous scroll
   position (e.g. Countdown / Venue / Gallery) on reload.
   ========================================================= */
if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}

window.scrollTo(0, 0);

window.addEventListener("pageshow", () => {
  window.scrollTo(0, 0);
});


/* =========================================================
   WEDDING MUSIC
   Playback starts from the invitation's intro click so that
   browser autoplay restrictions are handled reliably.
   Music is silent during the intro and fades in as Hero starts.
   ========================================================= */
const weddingMusic = document.getElementById("weddingMusic");
const musicToggle = document.getElementById("musicToggle");
const musicIcon = musicToggle ? musicToggle.querySelector(".music-icon") : null;

let musicEnabled = true;
let musicStarted = false;

function updateMusicButton() {
  if (!musicToggle) return;

  musicToggle.classList.toggle("is-off", !musicEnabled);
  musicToggle.setAttribute("aria-pressed", String(musicEnabled));
  const musicActionLabel = musicEnabled
    ? "Turn wedding music off"
    : "Turn wedding music on";

  musicToggle.setAttribute("aria-label", musicActionLabel);
  musicToggle.setAttribute("title", musicActionLabel);

}

function showMusicButton() {
  if (musicToggle) musicToggle.classList.add("visible");
}

function startWeddingMusic() {
  if (!weddingMusic || !musicEnabled) return;

  // This call happens directly from the user's intro click.
  weddingMusic.volume = 0;

  const playPromise = weddingMusic.play();

  if (playPromise && typeof playPromise.then === "function") {
    playPromise.then(() => {
      musicStarted = true;
    }).catch(() => {
      musicStarted = false;
    });
  } else {
    musicStarted = true;
  }
}

function fadeMusicIn(duration = 1200, targetVolume = 0.65) {
  if (!weddingMusic || !musicEnabled || !musicStarted) return;

  const startVolume = weddingMusic.volume;
  const startTime = performance.now();

  function step(now) {
    if (!weddingMusic || !musicEnabled) return;

    const progress = Math.min(1, (now - startTime) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);

    weddingMusic.volume =
      startVolume + (targetVolume - startVolume) * eased;

    if (progress < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

function turnMusicOff() {
  musicEnabled = false;

  if (weddingMusic) {
    weddingMusic.pause();
    weddingMusic.volume = 0;
  }

  updateMusicButton();
}

function turnMusicOn() {
  musicEnabled = true;

  if (!weddingMusic) {
    updateMusicButton();
    return;
  }

  weddingMusic.volume = 0;

  const playPromise = weddingMusic.play();

  if (playPromise && typeof playPromise.then === "function") {
    playPromise.then(() => {
      musicStarted = true;
      fadeMusicIn(700, 0.65);
    }).catch(() => {
      musicStarted = false;
    });
  } else {
    musicStarted = true;
    fadeMusicIn(700, 0.65);
  }

  updateMusicButton();
}

updateMusicButton();

if (musicToggle) {
  musicToggle.addEventListener("click", (event) => {
    // Prevent the button from triggering the intro click handler.
    event.stopPropagation();

    if (musicEnabled) {
      turnMusicOff();
    } else {
      turnMusicOn();
    }
  });
}

// START EVERYTHING ONLY AFTER INTRO
const intro = document.getElementById("intro");



intro.addEventListener("click", () => {

  // Start music from the same user gesture that opens the invitation.
  // Volume stays at zero until the Hero section appears.
  startWeddingMusic();

  // Step 1: hands move
  intro.classList.add("active");

  // Step 2: after hands meet
  setTimeout(() => {
    intro.classList.add("hide");

    // Music control appears with the Hero.
    showMusicButton();

    // Fade the music in smoothly as the Hero begins.
    fadeMusicIn(1200, 0.65);

    // START HERO ANIMATION HERE ONLY
    document.querySelector(".hero").classList.add("loaded");

    // START PARALLAX AFTER HERO ANIMATION
    setTimeout(() => {
      smoothParallax();
    }, 800);

    // Start the continuous, gentle auto-scroll from the Hero.
    // The delay lets the Hero animation settle before movement begins.
    smoothAutoScroll.start(900);

  }, 1400);

});

/* =========================================================
   PREMIUM CONTINUOUS AUTO-SCROLL
   ========================================================= */
/* =========================================================
   PREMIUM CONTINUOUS AUTO-SCROLL
   Smooth startup + smooth continuous movement
   Manual scrolling remains smooth
   ========================================================= */

const smoothAutoScroll = (() => {

  let running = false;
  let rafId = null;
  let lastTime = 0;
  let position = 0;
  let startTimer = null;
  let resumeTimer = null;

  /* Auto-scroll speed */
  const SPEED = 40;

  const root = document.documentElement;

  function maxScroll() {
    return Math.max(
      0,
      document.documentElement.scrollHeight - window.innerHeight
    );
  }

  /* -----------------------------------------
     Restore normal manual smooth scrolling
     ----------------------------------------- */
  function restoreSmoothScroll() {
    root.style.scrollBehavior = "smooth";
  }

  /* -----------------------------------------
     Disable CSS smooth behavior while the
     RAF auto-scroll is running.
     This prevents the two systems fighting.
     ----------------------------------------- */
  function prepareAutoScroll() {
    root.style.scrollBehavior = "auto";
  }

  /* -----------------------------------------
     STOP
     ----------------------------------------- */
  function stop() {

    running = false;
    lastTime = 0;

    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }

    if (startTimer !== null) {
      clearTimeout(startTimer);
      startTimer = null;
    }

    if (resumeTimer !== null) {
      clearTimeout(resumeTimer);
      resumeTimer = null;
    }

    restoreSmoothScroll();
  }

  /* -----------------------------------------
     AUTO-SCROLL FRAME
     ----------------------------------------- */
  function frame(now) {

    if (!running) return;

    if (!lastTime) {
      lastTime = now;
    }

    /*
      Prevent a large jump if the browser
      temporarily pauses the animation.
    */
    const elapsed = Math.min(32, now - lastTime);
    lastTime = now;

    const bottom = maxScroll();

    if (bottom <= 0) {
      rafId = requestAnimationFrame(frame);
      return;
    }

    /*
      If user manually moved the page,
      immediately synchronize our position.
    */
    if (Math.abs(window.scrollY - position) > 3) {
      position = window.scrollY;
    }

    /*
      Smooth constant movement.
    */
    position += SPEED * elapsed / 1000;

    if (position >= bottom) {
      window.scrollTo({
        top: bottom,
        left: 0,
        behavior: "auto"
      });

      stop();
      return;
    }

    /*
      IMPORTANT:
      behavior:auto + temporary CSS scrollBehavior:auto
      prevents CSS smooth scrolling from fighting
      against the requestAnimationFrame movement.
    */
    window.scrollTo({
      top: position,
      left: 0,
      behavior: "auto"
    });

    rafId = requestAnimationFrame(frame);
  }

  /* -----------------------------------------
     START
     ----------------------------------------- */
  function start(delay = 900) {

    if (startTimer !== null) {
      clearTimeout(startTimer);
    }

    if (resumeTimer !== null) {
      clearTimeout(resumeTimer);
      resumeTimer = null;
    }

    startTimer = setTimeout(() => {

      startTimer = null;

      /*
        Make absolutely sure we start from the
        current Hero position.
      */
      prepareAutoScroll();

      position = window.scrollY;
      lastTime = 0;

      /*
        Wait for one browser paint so the Hero,
        intro fade and layout are fully settled.
      */
      requestAnimationFrame(() => {

        requestAnimationFrame(() => {

          if (maxScroll() <= 0) {
            /*
              Page is still calculating its height.
              Try once again shortly instead of
              recursively fighting the page.
            */
            startTimer = setTimeout(() => {
              start(0);
            }, 300);

            return;
          }

          position = window.scrollY;
          lastTime = performance.now();
          running = true;

          if (rafId !== null) {
            cancelAnimationFrame(rafId);
          }

          rafId = requestAnimationFrame(frame);

        });

      });

    }, delay);
  }

  /* -----------------------------------------
     MANUAL SCROLL PAUSE
     ----------------------------------------- */
  function pauseForManualScroll() {

    if (!running) return;

    running = false;
    lastTime = 0;

    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }

    /*
      Immediately restore normal smooth scrolling
      for the user's manual movement.
    */
    restoreSmoothScroll();

    if (resumeTimer !== null) {
      clearTimeout(resumeTimer);
    }

    /*
      Resume after the user stops manually scrolling.
    */
    resumeTimer = setTimeout(() => {

      if (window.scrollY < maxScroll() - 2) {

        prepareAutoScroll();

        position = window.scrollY;
        lastTime = performance.now();
        running = true;

        rafId = requestAnimationFrame(frame);
      }

    }, 3000);
  }

  /* -----------------------------------------
     USER INPUT
     ----------------------------------------- */

  window.addEventListener(
    "wheel",
    pauseForManualScroll,
    { passive: true }
  );

  window.addEventListener(
    "touchstart",
    pauseForManualScroll,
    { passive: true }
  );

  window.addEventListener(
    "keydown",
    event => {

      if (
        [
          "ArrowDown",
          "ArrowUp",
          "PageDown",
          "PageUp",
          "Home",
          "End",
          " "
        ].includes(event.key)
      ) {
        pauseForManualScroll();
      }

    }
  );

  return {
    start,
    stop
  };

})();

/* =========================
   WEDDING COUNTDOWN — MUHURTHAM
   ========================= */

/*
  The countdown is tied directly to the Muhurtham shown above:
  05 September 2027 at 10:45 AM IST (India Standard Time).

  Using an ISO timestamp with +05:30 makes the target unambiguous
  even if the invitation is opened on a device in another timezone.
*/
const muhurthamDate = new Date("2027-09-05T10:45:00+05:30").getTime();

const daysEl = document.getElementById("days");
const hoursEl = document.getElementById("hours");
const minutesEl = document.getElementById("minutes");
const secondsEl = document.getElementById("seconds");
const countdownWrapper = document.querySelector(".countdown-wrapper");

let countdownTimer = null;
let countdownFinished = false;

function updateCountdown() {
  const distance = muhurthamDate - Date.now();

  /* Muhurtham time reached */
  if (distance <= 0) {
    daysEl.textContent = "00";
    hoursEl.textContent = "00";
    minutesEl.textContent = "00";
    secondsEl.textContent = "00";

    if (!countdownFinished && countdownWrapper) {
      countdownFinished = true;
      countdownWrapper.innerHTML =
        '<div style="width:100%; font-size:1.5rem; font-weight:700; color:#8B0000;">Muhurtham Has Begun! ❤️</div>';
    }

    if (countdownTimer !== null) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
    return;
  }

  const totalSeconds = Math.floor(distance / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  /* Keep every unit synchronized and visually consistent */
  daysEl.textContent = String(days).padStart(2, "0");
  hoursEl.textContent = String(hours).padStart(2, "0");
  minutesEl.textContent = String(minutes).padStart(2, "0");
  secondsEl.textContent = String(seconds).padStart(2, "0");
}

/* Update immediately, then refresh every second */
updateCountdown();

if (!countdownFinished) {
  countdownTimer = setInterval(updateCountdown, 1000);
}


let scrollY = 0;

window.addEventListener("scroll", () => {
  scrollY = window.scrollY;
});

function smoothParallax() {

  // HERO
  document.querySelector(".layer1").style.transform =
    `translateY(${scrollY * 0.2}px)`;

  document.querySelector(".layer2").style.transform =
    `translateY(${scrollY * 0.4}px)`;

  document.querySelector(".layer3").style.transform =
    `translateY(${scrollY * 0.6}px)`;

  document.querySelector(".hero-text").style.transform =
    `translateY(${scrollY * 0.3}px)`;


  // MUHURTHAM (🔥 smoother now)
const muhurtham = document.querySelector(".muhurtham");
const mTop = muhurtham.offsetTop;
const mDistance = scrollY - mTop;

if (mDistance > -500 && mDistance < window.innerHeight + 500) {

  // background slow (depth)
  document.querySelector(".m-layer1").style.transform =
    `translateY(${mDistance * 0.05}px)`;

  // god image medium
 document.querySelector(".m-layer2").style.transform =
  `translateY(${mDistance * 0.35}px)`;

  // banana leaves faster (front layer)
  document.querySelector(".m-layer3").style.transform =
    `translateY(${mDistance * 0.3}px)`;

  // text slight movement
  document.querySelector(".muhurtham-content").style.transform =
    `translateY(${mDistance * 0.08}px)`;
}


  // VENUE
  const venue = document.querySelector(".venue-section");
  const venueTop = venue.offsetTop;
  const distance = scrollY - venueTop;

  if (distance > -500 && distance < window.innerHeight + 500) {

    document.querySelector(".banana-img").style.transform =
      `translateY(${distance * -0.1}px)`;

    document.querySelector(".temple-img").style.transform =
      `translateY(${distance * 0.2}px)`;

    document.querySelector(".venue-content").style.transform =
      `translateY(${distance * 0.12}px)`;
  }

  requestAnimationFrame(smoothParallax);
}

// EVENTS PARALLAX
const events = document.querySelector(".events-section");
const eTop = events.offsetTop;
const eDistance = scrollY - eTop;

if (eDistance > -500 && eDistance < window.innerHeight + 500) {

  document.querySelector(".e-layer1").style.transform =
    `translateY(${eDistance * 0.05}px)`;

  document.querySelector(".e-layer2").style.transform =
    `translateY(${eDistance * 0.2}px)`;

  document.querySelector(".events-content").style.transform =
    `translateY(${eDistance * 0.1}px)`;
}


const reveals = document.querySelectorAll(".reveal");

function revealOnScroll() {
  const windowHeight = window.innerHeight;

  reveals.forEach(el => {
    const elementTop = el.getBoundingClientRect().top;

    if (elementTop < windowHeight - 100) {
      el.classList.add("active");
    }
  });
}

window.addEventListener("scroll", revealOnScroll);

// CAROUSEL

  const track = document.querySelector('.carousel-track');
  const slides = document.querySelectorAll('.carousel-track img');
  const dotsContainer = document.querySelector('.carousel-dots');
  const carousel = document.querySelector('.carousel');

  let index = 0;

  // Clear existing dots to prevent duplicates on reload
  dotsContainer.innerHTML = '';

  // Create indicator dots dynamically
  slides.forEach((_, i) => {
    const dot = document.createElement('span');
    if (i === 0) dot.classList.add('active');
    dotsContainer.appendChild(dot);

    dot.addEventListener('click', () => {
      index = i;
      updateCarousel();
    });
  });

  const dots = document.querySelectorAll('.carousel-dots span');

  function updateCarousel() {
    track.style.transform = `translateX(-${index * 100}%)`;
    dots.forEach(dot => dot.classList.remove('active'));
    if (dots[index]) {
      dots[index].classList.add('active');
    }
  }

  // Auto slide every 2.5 seconds
  let autoSlide = setInterval(() => {
    index = (index + 1) % slides.length;
    updateCarousel();
  }, 2500);

  // Pause auto-slide on touch/hover
  carousel.addEventListener('mouseenter', () => clearInterval(autoSlide));
  carousel.addEventListener('mouseleave', () => {
    autoSlide = setInterval(() => {
      index = (index + 1) % slides.length;
      updateCarousel();
    }, 2500);
  });

  // Touch Swipe Gesture logic
  let startX = 0;
  let endX = 0;

  carousel.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
  }, { passive: true });

  carousel.addEventListener('touchmove', (e) => {
    endX = e.touches[0].clientX;
  }, { passive: true });

  carousel.addEventListener('touchend', () => {
    const threshold = 50; // Minimum swipe distance in px
    if (startX && endX) {
      if (startX - endX > threshold) {
        // Swiped Left -> Next Slide
        index = (index + 1) % slides.length;
      } else if (endX - startX > threshold) {
        // Swiped Right -> Previous Slide
        index = (index - 1 + slides.length) % slides.length;
      }
      updateCarousel();
    }
    // Reset touch coordinates
    startX = 0;
    endX = 0;
  });
  
document.querySelectorAll(".scratch-layer").forEach(function(canvas) {
  var ctx = canvas.getContext("2d");
  var card = canvas.closest(".event-card");
  var scratching = false;
  var strokes = 0;
  var revealed = false;

  function drawCover() {
    var rect = card.getBoundingClientRect();
    var dpr = window.devicePixelRatio || 1;

    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    canvas.style.width = rect.width + "px";
    canvas.style.height = rect.height + "px";

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var gradient = ctx.createLinearGradient(0, 0, rect.width, rect.height);
    gradient.addColorStop(0, "#fff8df");
    gradient.addColorStop(0.5, "#dfbd65");
    gradient.addColorStop(1, "#fff0c5");

    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, rect.width, rect.height);

    ctx.strokeStyle = "rgba(139, 0, 0, 0.35)";
    ctx.lineWidth = 2;
    ctx.strokeRect(8, 8, rect.width - 16, rect.height - 16);

    ctx.fillStyle = "#8b0000";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 15px Georgia";
    ctx.fillText("✿ Scratch to Reveal ✿", rect.width / 2, rect.height / 2 - 8);

    ctx.font = "12px Georgia";
    ctx.fillText("A special moment awaits", rect.width / 2, rect.height / 2 + 16);
  }

  function eraseAt(event) {
    var rect = canvas.getBoundingClientRect();
    var x = event.clientX - rect.left;
    var y = event.clientY - rect.top;

    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, 23, 0, Math.PI * 2);
    ctx.fill();

    strokes++;

    if (strokes % 6 === 0) {
      dropFlowers(5);
    }

    if (strokes >= 36 && !revealed) {
      revealed = true;
      canvas.classList.add("scratched");
      dropFlowers(35);
    }
  }

  canvas.addEventListener("pointerdown", function(event) {
    if (revealed) return;

    scratching = true;
    canvas.setPointerCapture(event.pointerId);
    eraseAt(event);
    dropFlowers(8);
  });

  canvas.addEventListener("pointermove", function(event) {
    if (!scratching || revealed) return;
    eraseAt(event);
  });

  function stopScratching() {
    scratching = false;
  }

  canvas.addEventListener("pointerup", stopScratching);
  canvas.addEventListener("pointercancel", stopScratching);
  canvas.addEventListener("lostpointercapture", stopScratching);

  drawCover();

  if ("ResizeObserver" in window) {
    var observer = new ResizeObserver(function() {
      if (!revealed) drawCover();
    });
    observer.observe(card);
  } else {
    window.addEventListener("resize", function() {
      if (!revealed) drawCover();
    });
  }
});

function dropFlowers(count) {
  var flowers = ["🌸", "🌺", "🌼", "🌷", "🌸"];

  for (var i = 0; i < count; i++) {
    var petal = document.createElement("span");
    petal.className = "flower-petal";
    petal.textContent = flowers[Math.floor(Math.random() * flowers.length)];

    petal.style.left = Math.random() * 100 + "vw";
    petal.style.fontSize = (14 + Math.random() * 18) + "px";
    petal.style.setProperty("--drift", (Math.random() * 180 - 90) + "px");
    petal.style.setProperty("--spin", (Math.random() * 720 - 360) + "deg");
    petal.style.animationDuration = (3 + Math.random() * 3) + "s";

    document.body.appendChild(petal);

    petal.addEventListener("animationend", function() {
      this.remove();
    });
  }
}
const eventCards = Array.from(
    document.querySelectorAll(".events-grid .event-card")
);

let completedCards = 0;
let sequenceStarted = false;
let autoAdvanceTimer = null;

function dropFlowers(card, amount) {
    const rect = card.getBoundingClientRect();

    for (let i = 0; i < amount; i++) {
        const flower = document.createElement("span");

        flower.className = "flower-petal";
        flower.textContent = ["🌸", "🌼", "🌺", "🌷"][
            Math.floor(Math.random() * 4)
        ];

        flower.style.left =
            Math.random() * window.innerWidth + "px";

        flower.style.fontSize =
            (14 + Math.random() * 15) + "px";

        flower.style.animationDuration =
            (2.5 + Math.random() * 3) + "s";

        flower.style.setProperty(
            "--drift",
            (Math.random() * 180 - 90) + "px"
        );

        flower.style.setProperty(
            "--rotation",
            (Math.random() * 720 - 360) + "deg"
        );

        document.body.appendChild(flower);

        flower.addEventListener("animationend", function () {
            flower.remove();
        });
    }
}

function playCelebrationSound() {
    try {
        const AudioContextClass =
            window.AudioContext || window.webkitAudioContext;

        if (!AudioContextClass) return;

        const audio = new AudioContextClass();
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();

        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(660, audio.currentTime);
        oscillator.frequency.setValueAtTime(880, audio.currentTime + 0.12);

        gain.gain.setValueAtTime(0.0001, audio.currentTime);
        gain.gain.exponentialRampToValueAtTime(
            0.12,
            audio.currentTime + 0.03
        );
        gain.gain.exponentialRampToValueAtTime(
            0.0001,
            audio.currentTime + 0.5
        );

        oscillator.connect(gain);
        gain.connect(audio.destination);

        oscillator.start();
        oscillator.stop(audio.currentTime + 0.5);

        oscillator.onended = function () {
            audio.close();
        };
    } catch (error) {
        // Sound is optional if the browser blocks audio.
    }
}

function scrollToCard(card) {
    const top =
        window.scrollY +
        card.getBoundingClientRect().top -
        80;

    window.scrollTo({
        top: Math.max(0, top),
        behavior: "smooth"
    });
}

function celebrateAllCards() {
    const lastCard = eventCards[eventCards.length - 1];

    dropFlowers(lastCard, 100);

    if (navigator.vibrate) {
        navigator.vibrate([100, 60, 180, 60, 250]);
    }

    playCelebrationSound();
}

function completeScratch(card, canvas) {
    if (card.dataset.scratchComplete === "true") return;

    card.dataset.scratchComplete = "true";
    completedCards++;

    canvas.style.transition = "opacity 0.5s ease";
    canvas.style.opacity = "0";
    canvas.style.pointerEvents = "none";

    dropFlowers(card, 15);

    if (completedCards === eventCards.length) {
        celebrateAllCards();
        clearTimeout(autoAdvanceTimer);
        return;
    }

    const currentIndex = eventCards.indexOf(card);
    const nextCard = eventCards[currentIndex + 1];

    clearTimeout(autoAdvanceTimer);

    autoAdvanceTimer = setTimeout(function () {
        if (nextCard) {
            scrollToCard(nextCard);
        }
    }, 1400);
}

function setupScratchCard(card) {
    let canvas = card.querySelector(".scratch-layer");

    if (!canvas) {
        canvas = document.createElement("canvas");
        canvas.className = "scratch-layer";
        card.prepend(canvas);
    }

    const context = canvas.getContext("2d");

    let isScratching = false;
    let lastX = 0;
    let lastY = 0;
    let checkCounter = 0;

    function drawCover() {
        const rect = card.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        canvas.width = Math.max(1, Math.round(rect.width * dpr));
        canvas.height = Math.max(1, Math.round(rect.height * dpr));

        canvas.style.width = rect.width + "px";
        canvas.style.height = rect.height + "px";

        context.setTransform(dpr, 0, 0, dpr, 0, 0);

        const gradient = context.createLinearGradient(
            0, 0, rect.width, rect.height
        );

        gradient.addColorStop(0, "#f8e5a8");
        gradient.addColorStop(0.5, "#d2a84c");
        gradient.addColorStop(1, "#f5dfa0");

        context.globalCompositeOperation = "source-over";
        context.fillStyle = gradient;
        context.fillRect(0, 0, rect.width, rect.height);

        context.fillStyle = "#67491b";
        context.textAlign = "center";
        context.textBaseline = "middle";

        const fontSize = Math.max(
            14,
            Math.min(22, rect.width * 0.055)
        );

        context.font = `600 ${fontSize}px Georgia`;
        context.fillText(
            "✿  SCRATCH TO REVEAL  ✿",
            rect.width / 2,
            rect.height / 2
        );

        context.globalCompositeOperation = "destination-out";
    }

    function scratch(event) {
        if (!isScratching) return;
        if (card.dataset.scratchComplete === "true") return;

        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        context.beginPath();
        context.moveTo(lastX, lastY);
        context.lineTo(x, y);
        context.lineWidth = 36;
        context.lineCap = "round";
        context.lineJoin = "round";
        context.stroke();

        context.beginPath();
        context.arc(x, y, 18, 0, Math.PI * 2);
        context.fill();

        lastX = x;
        lastY = y;

        checkCounter++;

        if (checkCounter % 8 === 0) {
            checkScratchProgress();
        }
    }

    function checkScratchProgress() {
        if (card.dataset.scratchComplete === "true") return;

        const pixels = context.getImageData(
            0, 0, canvas.width, canvas.height
        ).data;

        let transparentPixels = 0;
        const totalPixels = pixels.length / 4;
        const sampleStep = 32;

        for (let i = 3; i < pixels.length; i += 4 * sampleStep) {
            if (pixels[i] < 80) {
                transparentPixels++;
            }
        }

        const sampledTotal = Math.ceil(totalPixels / sampleStep);
        const clearedRatio = transparentPixels / sampledTotal;

        if (clearedRatio >= 0.38) {
            completeScratch(card, canvas);
        }
    }

    canvas.addEventListener("pointerdown", function (event) {
        if (card.dataset.scratchComplete === "true") return;

        isScratching = true;
        canvas.setPointerCapture(event.pointerId);

        const rect = canvas.getBoundingClientRect();

        lastX = event.clientX - rect.left;
        lastY = event.clientY - rect.top;

        scratch(event);
    });

    canvas.addEventListener("pointermove", scratch);

    function stopScratching() {
        if (!isScratching) return;

        isScratching = false;
        checkScratchProgress();
    }

    canvas.addEventListener("pointerup", stopScratching);
    canvas.addEventListener("pointercancel", stopScratching);
    canvas.addEventListener("lostpointercapture", stopScratching);

    drawCover();

    if ("ResizeObserver" in window) {
        const observer = new ResizeObserver(function () {
            if (card.dataset.scratchComplete !== "true") {
                drawCover();
            }
        });

        observer.observe(card);
    } else {
        window.addEventListener("resize", function () {
            if (card.dataset.scratchComplete !== "true") {
                drawCover();
            }
        });
    }
}

eventCards.forEach(setupScratchCard);

if (eventCards.length > 0) {
    window.addEventListener("load", function () {
        if (sequenceStarted) return;

        sequenceStarted = true;

        setTimeout(function () {
            if (completedCards === 0) {
                scrollToCard(eventCards[0]);
            }
        }, 1800);
    });
}