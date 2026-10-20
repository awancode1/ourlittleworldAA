"use strict";
const $ = (s) => document.querySelector(s),
  $$ = (s) => [...document.querySelectorAll(s)];
/* Animasi opsional. Konten tetap terlihat jika JavaScript/observer gagal. */
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
let manualStill = false;
function applyMotion() {
  const off = manualStill || reduced.matches;
  document.documentElement.classList.toggle("still", off);
  document.documentElement.classList.toggle(
    "motion-enabled",
    !off && "IntersectionObserver" in window,
  );
  $("#motionToggle").textContent = off ? "Animasi: nonaktif" : "Animasi: aktif";
  $("#motionToggle").setAttribute("aria-pressed", String(off));
}
if ("IntersectionObserver" in window) {
  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("visible");
          obs.unobserve(e.target);
        }
      });
    },
    { threshold: 0.08 },
  );
  $$(".reveal").forEach((el) => obs.observe(el));
}
applyMotion();
$("#motionToggle").addEventListener("click", () => {
  manualStill = !manualStill;
  applyMotion();
});
if (reduced.addEventListener) reduced.addEventListener("change", applyMotion);
/* Menu mobile: keyboard, Escape, dan reset ketika lebar layar berubah. */
const mobile = window.matchMedia("(max-width:650px)"),
  menu = $(".menu-toggle"),
  nav = $("#navigation");
function setMenu(open) {
  nav.hidden = mobile.matches && !open;
  menu.setAttribute("aria-expanded", String(mobile.matches && open));
  menu.textContent = open ? "Tutup bab" : "Daftar bab";
}
setMenu(false);
menu.addEventListener("click", () =>
  setMenu(menu.getAttribute("aria-expanded") !== "true"),
);
nav
  .querySelectorAll("a")
  .forEach((a) => a.addEventListener("click", () => setMenu(false)));
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && menu.getAttribute("aria-expanded") === "true") {
    setMenu(false);
    menu.focus();
  }
});
if (mobile.addEventListener)
  mobile.addEventListener("change", () => setMenu(false));
/* Progress baca, tidak mengunci scroll. */
let scheduled = false;
function updateProgress() {
  const distance = document.documentElement.scrollHeight - innerHeight;
  $("#progress").style.width =
    (distance > 0
      ? Math.max(0, Math.min(100, (scrollY / distance) * 100))
      : 0) + "%";
  scheduled = false;
}
addEventListener(
  "scroll",
  () => {
    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(updateProgress);
    }
  },
  { passive: true },
);
addEventListener("resize", updateProgress);
addEventListener("load", updateProgress);
updateProgress();
/* Hari kalender berdasarkan zona Asia/Makassar (Praya), bukan durasi 24 jam. */
function updateDays() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Makassar",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(new Date());
  const values = Object.fromEntries(
    parts
      .filter((p) => p.type !== "literal")
      .map((p) => [p.type, Number(p.value)]),
  );
  const elapsed = Math.floor(
    (Date.UTC(values.year, values.month - 1, values.day) -
      Date.UTC(2026, 9, 10)) /
      86400000,
  );
  $("#days").textContent = Math.max(0, elapsed);
  if (elapsed < 0)
    $("#daysLabel").textContent = "menunggu 10 Oktober 2026 · Muhajirin, Praya";
}
updateDays();
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) updateDays();
});
/* Surat. */
let letterOpenTimer = null,
  letterClosingTimer = null,
  letterReadingFrame = null,
  letterObserver = null,
  readingStatic = false;
const letterParagraphs = [
  ...$("#letterContent").querySelectorAll(":scope > p"),
];
letterParagraphs.forEach((p, i) => {
  p.classList.add("letter-paragraph");
  p.style.setProperty("--paragraph-order", i);
});
function updateLetterRead() {
  letterReadingFrame = null;
  if ($("#letterContent").hidden) return;
  const r = $("#letterContent").getBoundingClientRect(),
    distance = Math.max(1, r.height - innerHeight * 0.55),
    fraction = Math.max(
      0,
      Math.min(1, (innerHeight * 0.35 - r.top) / distance),
    );
  $("#letterReadingBar").style.width = fraction * 100 + "%";
  $("#letterReadingStatus").textContent =
    fraction > 0.97
      ? "Sampai sini dulu, Bub. — Awan"
      : "Surat untuk Arief · " + Math.round(fraction * 100) + "% dibaca";
}
function observeLetter() {
  if (letterObserver) letterObserver.disconnect();
  if (
    readingStatic ||
    document.documentElement.classList.contains("still") ||
    !("IntersectionObserver" in window)
  ) {
    letterParagraphs.forEach((p) => p.classList.add("paragraph-visible"));
    return;
  }
  letterObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("paragraph-visible");
          letterObserver.unobserve(e.target);
        }
      });
    },
    { threshold: 0.08, rootMargin: "0px 0px -7% 0px" },
  );
  letterParagraphs.forEach((p) => letterObserver.observe(p));
}
function toggleLetter(open) {
  clearTimeout(letterOpenTimer);
  clearTimeout(letterClosingTimer);
  const envelope = $("#openLetter"),
    paper = $("#letterContent"),
    noMotion = document.documentElement.classList.contains("still");
  envelope.classList.remove("resealing");
  if (open) {
    envelope.setAttribute("aria-expanded", "true");
    envelope.querySelector(".envelope-caption").textContent =
      "namamu di sini, ceritaku di dalam";
    paper.classList.remove("letter-closing", "paper-settled", "reading-open");
    envelope.classList.add("opening-letter");
    letterOpenTimer = setTimeout(
      () => {
        paper.hidden = false;
        paper.classList.add("reading-open");
        letterParagraphs.forEach((p) =>
          p.classList.remove("paragraph-visible"),
        );
        observeLetter();
        paper.setAttribute("tabindex", "-1");
        paper.focus({ preventScroll: true });
        paper.scrollIntoView({
          behavior: noMotion ? "auto" : "smooth",
          block: "start",
        });
        updateLetterRead();
        envelope.classList.remove("opening-letter");
      },
      noMotion ? 0 : 1350,
    );
  } else {
    envelope.classList.remove("opening-letter");
    if (letterObserver) letterObserver.disconnect();
    if (!paper.hidden) paper.classList.add("letter-closing");
    letterClosingTimer = setTimeout(
      () => {
        paper.hidden = true;
        paper.classList.remove(
          "reading-open",
          "letter-closing",
          "paper-settled",
        );
        envelope.setAttribute("aria-expanded", "false");
        envelope.querySelector(".envelope-caption").textContent =
          "disimpan baik-baik. boleh dibuka lagi.";
        envelope.classList.add("resealing");
        envelope.focus({ preventScroll: true });
        envelope.scrollIntoView({
          block: "center",
          behavior: noMotion ? "auto" : "smooth",
        });
      },
      noMotion ? 0 : 820,
    );
  }
}
$("#openLetter").addEventListener("click", () =>
  toggleLetter($("#openLetter").getAttribute("aria-expanded") !== "true"),
);
$("#closeLetter").addEventListener("click", () => toggleLetter(false));
$("#letterEffects").addEventListener("click", () => {
  readingStatic = !readingStatic;
  $("#letterContent").classList.toggle("reading-static", readingStatic);
  $("#letterEffects").setAttribute("aria-pressed", String(readingStatic));
  $("#letterEffects").textContent = readingStatic
    ? "Efek baca nonaktif"
    : "Baca tanpa efek";
  observeLetter();
});
addEventListener(
  "scroll",
  () => {
    if (!letterReadingFrame && !$("#letterContent").hidden)
      letterReadingFrame = requestAnimationFrame(updateLetterRead);
  },
  { passive: true },
);
addEventListener("resize", updateLetterRead);
new MutationObserver(() => {
  if (document.documentElement.classList.contains("still"))
    letterParagraphs.forEach((p) => p.classList.add("paragraph-visible"));
}).observe(document.documentElement, {
  attributes: true,
  attributeFilter: ["class"],
});
/* Dua belas alasan, reveal per kartu. */
const reasons = [
  "Aku seneng banget bisa kenal kamu.",
  "Aku masih penasaran sama banyak hal tentang kamu.",
  "Cerita random kamu aja aku mau dengerin.",
  "Aku juga mau belajar ngerti kamu, bukan maunya dimengerti terus.",
  "Aku pengin kita bisa jujur, nggak perlu pura-pura baik-baik aja.",
  "Hal kecil aja pengin aku nikmatin bareng kamu.",
  "Kalau kamu mau cerita, aku pengin jadi orang yang kamu cari.",
  "Kalau ada yang belum aku ngerti, ajarin aku yaa, dan sebaliknya.",
  "Aku masih mau punya banyak cerita bareng kamu.",
  "Kamu jadi diri kamu aja, aku juga belajar jadi diri aku sendiri.",
  "Aku seneng bisa kenal kamu lebih jauh, pelan-pelan aja.",
  "Aku nggak mau cuma bilang sayang, aku juga mau buktiin.",
];
reasons.forEach((text, i) => {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "reason";
  b.setAttribute("aria-pressed", "false");
  b.setAttribute("aria-label", "Buka alasan " + (i + 1));
  const n = document.createElement("span");
  n.className = "reason-num";
  n.textContent = "TAKE " + String(i + 1).padStart(2, "0");
  const icon = document.createElement("span");
  icon.className = "reason-icon";
  icon.textContent = "A";
  icon.setAttribute("aria-hidden", "true");
  const answer = document.createElement("span");
  answer.className = "reason-answer";
  answer.textContent = text;
  answer.hidden = true;
  const prompt = document.createElement("span");
  prompt.className = "reason-prompt";
  prompt.textContent = "tap to reveal";
  b.append(n, icon, answer, prompt);
  b.addEventListener("click", () => {
    const open = b.getAttribute("aria-pressed") !== "true";
    b.setAttribute("aria-pressed", String(open));
    b.setAttribute(
      "aria-label",
      open ? text + ". Ketuk untuk menutup." : "Buka alasan " + (i + 1),
    );
    icon.hidden = open;
    answer.hidden = !open;
    prompt.textContent = open ? "tap to close" : "tap to reveal";
  });
  $("#reasonsGrid").append(b);
});
const extras = [
  "Aku pengin hal-hal sederhana bareng kamu terasa cukup.",
  "Aku mau tetap menghargai kamu, bahkan saat kita beda pendapat.",
  "Aku pengin kita punya ruang bercerita tanpa takut dihakimi.",
  "Aku mau hubungan ini terus dirawat sama-sama.",
  "Aku ingin mengenal Arief lebih jauh, pelan-pelan.",
];
let extraIndex = 0;
$("#moreReason").addEventListener("click", () => {
  $("#extraReason").textContent = extras[extraIndex++ % extras.length];
});
/* Pemutar dimuat setelah diminta, tanpa autoplay atau klaim audio palsu. */

/* ID video dipertahankan dari file sumber; ketersediaan belum diverifikasi. */
const songs = [
  {
    title: "Panasea",
    artist: "Rumah Sakit",
    id: "WxkJVvSgCGk",
    videos: ["WxkJVvSgCGk", "b1ACXHuMmAc"],
  },
  {
    title: "Reckoner",
    artist: "Radiohead",
    id: "pYHEpDnvVPk",
    videos: ["pYHEpDnvVPk", "9wCJPm19XYQ", "_uofQD-N6UI"],
  },
  {
    title: "Terbelah Dua",
    artist: "Supple",
    id: "sgD6WLe34lw",
    videos: ["sgD6WLe34lw"],
  },
  {
    title: "Baile Inolvidable",
    artist: "Bad Bunny",
    id: "a1Femq4NPxs",
    videos: ["a1Femq4NPxs"],
  },
  {
    title: "505",
    artist: "Arctic Monkeys",
    id: "CKI8iQTgZKU",
    videos: ["CKI8iQTgZKU", "MrmPDUvKyLs"],
  },
  {
    title: "HOT",
    artist: "LE SSERAFIM",
    id: "r9AEGPB6qIU",
    videos: ["r9AEGPB6qIU"],
  },
  {
    title: "You’ll Be in My Heart",
    artist: "NIKI",
    id: "o9Gx1lSJ7DU",
    videos: ["o9Gx1lSJ7DU"],
  },
  {
    title: "What You Want",
    artist: "CORTIS",
    id: "e2OpbOv_JiQ",
    videos: ["e2OpbOv_JiQ"],
  },
  {
    title: "Ditto",
    artist: "NewJeans",
    id: "pSUydWEqKwE",
    videos: ["pSUydWEqKwE"],
  },
  {
    title: "About You",
    artist: "The 1975",
    id: "tGv7CUutzqU",
    videos: ["tGv7CUutzqU"],
  },
  {
    title: "Stay a Little Longer",
    artist: "ROSÉ",
    id: "vHvOYQ0hbBA",
    videos: ["vHvOYQ0hbBA"],
  },
  {
    title: "The Cure",
    artist: "Olivia Rodrigo",
    id: "B402rKl4bUg",
    videos: ["B402rKl4bUg"],
  },
];
/* Satu player untuk seluruh antrean. Tidak ada navigasi ke YouTube. */
let ytPlayer = null,
  ytReady = false,
  musicPlaying = false,
  currentTrack = 0,
  shuffleOn = false,
  repeatOne = false,
  playerOpen = false,
  pendingPlay = false,
  seekDragging = false,
  playerPoll = null,
  apiPromise = null,
  requestSerial = 0,
  playBlockedTimer = null,
  loadTimer = null;
const failedTracks = new Set();
const videoVersions = songs.map(() => 0);
function updateVersionButton() {
  const b = $("#musicVersion");
  b.disabled = songs[currentTrack].videos.length < 2;
  b.textContent = b.disabled
    ? "Belum ada versi alternatif"
    : "Coba versi lain (" +
      (videoVersions[currentTrack] + 1) +
      "/" +
      songs[currentTrack].videos.length +
      ")";
}
function tryAlternative() {
  const song = songs[currentTrack];
  if (videoVersions[currentTrack] + 1 >= song.videos.length) return false;
  videoVersions[currentTrack]++;
  song.id = song.videos[videoVersions[currentTrack]];
  failedTracks.delete(currentTrack);
  selectTrack(currentTrack, true);
  return true;
}
$("#musicVersion").addEventListener("click", () => {
  if (!tryAlternative()) {
    videoVersions[currentTrack] = 0;
    songs[currentTrack].id = songs[currentTrack].videos[0];
    selectTrack(currentTrack, true);
  }
});
updateVersionButton();
function formatTime(t) {
  const s = Math.max(0, Math.floor(Number(t) || 0));
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
}
function updateTrackButtons() {
  [...$("#tracklist").querySelectorAll(".track")].forEach((b, i) => {
    const chosen = i === currentTrack;
    b.setAttribute("aria-pressed", String(chosen));
    b.classList.toggle("is-active", chosen);
    b.classList.toggle("is-playing", chosen && musicPlaying);
    b.querySelector(".track-action").textContent = failedTracks.has(i)
      ? "TERBATAS"
      : chosen
        ? musicPlaying
          ? "DIPUTAR"
          : "DIPILIH"
        : "PUTAR";
  });
}
function setMusicState(on, status) {
  musicPlaying = on;
  $("#playlist").classList.toggle("is-playing", on);
  $("#discState").textContent =
    "TRACK " +
    String(currentTrack + 1).padStart(2, "0") +
    " · " +
    (on ? "NOW PLAYING" : "SIAP DIPUTAR");
  $("#musicPlay").setAttribute(
    "aria-label",
    (on ? "Jeda " : "Putar ") + songs[currentTrack].title,
  );
  $("#musicPlay").innerHTML = on
    ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zm7 0h4v14h-4z" fill="currentColor"/></svg>'
    : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>';
  if (status) $("#playerStatus").textContent = status;
  updateTrackButtons();
}
function setMetadata() {
  updateVersionButton();
  const song = songs[currentTrack];
  $("#nowPlayingTitle").textContent = song.title;
  $("#nowPlayingArtist").textContent = song.artist;
  $("#transportTitle").textContent = song.title;
  $("#musicSeek").setAttribute("aria-label", "Posisi lagu " + song.title);
  const label = $(".record-label b");
  label.textContent = song.title;
  label.classList.remove("is-swapping");
  $(".music-info").classList.remove("changing");
  requestAnimationFrame(() => {
    label.classList.add("is-swapping");
    $(".music-info").classList.add("changing");
  });
  $("#musicSeek").value = 0;
  $("#elapsed").textContent = "0:00";
  $("#duration").textContent = "0:00";
  $("#musicSeek").disabled = true;
  updateTrackButtons();
}
function updateMusicTime() {
  if (!ytReady || document.hidden) return;
  try {
    const d = ytPlayer.getDuration() || 0,
      t = ytPlayer.getCurrentTime() || 0;
    $("#elapsed").textContent = formatTime(t);
    $("#duration").textContent = formatTime(d);
    if (!seekDragging) $("#musicSeek").value = d ? (t / d) * 1000 : 0;
    $("#musicSeek").disabled = d <= 0;
    $("#musicSeek").setAttribute(
      "aria-valuetext",
      formatTime(t) + " dari " + formatTime(d),
    );
  } catch {}
}
function showPlayer(open) {
  playerOpen = open;
  $("#openPlayer").setAttribute("aria-expanded", String(open));
  $("#openPlayer").textContent = open
    ? "Sembunyikan pemutar"
    : "Buka pemutar musik";
  $("#videoWrap").hidden = !open;
  $("#soundControls").hidden = !open;
}
function nextIndex(direction = 1) {
  const pool = songs
    .map((_, i) => i)
    .filter((i) => i !== currentTrack && !failedTracks.has(i));
  if (shuffleOn && pool.length)
    return pool[Math.floor(Math.random() * pool.length)];
  for (let step = 1; step <= songs.length; step++) {
    const i =
      (currentTrack + direction * step + songs.length * 2) % songs.length;
    if (!failedTracks.has(i)) return i;
  }
  return currentTrack;
}
function playbackWatchdog() {
  clearTimeout(playBlockedTimer);
  playBlockedTimer = setTimeout(() => {
    if (pendingPlay && !musicPlaying) {
      pendingPlay = false;
      setMusicState(
        false,
        "Ketuk play pada video di bawah untuk mengizinkan suara — tetap di halaman ini.",
      );
    }
  }, 9000);
}
function loadYouTubeAPI() {
  if (window.YT && typeof window.YT.Player === "function")
    return Promise.resolve();
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(
      () =>
        finish(
          new Error(
            "Koneksi YouTube terlalu lama. Periksa jaringan lalu ketuk lagunya lagi.",
          ),
        ),
      20000,
    );
    function finish(error) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearInterval(check);
      if (error) {
        apiPromise = null;
        reject(error);
      } else resolve();
    }
    const check = setInterval(() => {
      if (window.YT && typeof window.YT.Player === "function") finish();
    }, 100);
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previous === "function") {
        try {
          previous();
        } catch {}
      }
      finish();
    };
    let tag = document.querySelector("script[data-yt-api]");
    if (!tag) {
      tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      tag.dataset.ytApi = "true";
      document.head.append(tag);
    }
    tag.onerror = () => {
      tag.remove();
      finish(
        new Error(
          "Pemutar diblokir jaringan. Periksa koneksi atau pemblokir konten, lalu coba lagi.",
        ),
      );
    };
  });
  return apiPromise;
}
function mountPlayer() {
  if (ytPlayer) return;
  const vars = { playsinline: 1, rel: 0, controls: 1, autoplay: 0 };
  if (location.protocol === "https:" || location.protocol === "http:")
    vars.origin = location.origin;
  ytPlayer = new YT.Player("video", {
    host: "https://www.youtube.com",
    width: "100%",
    height: "100%",
    videoId: songs[currentTrack].id,
    playerVars: vars,
    events: {
      onReady: () => {
        clearTimeout(loadTimer);
        ytReady = true;
        $("#musicPlay").disabled = false;
        $("#musicMute").disabled = false;
        const frame = ytPlayer.getIframe();
        frame.title = "Pemutar musik Awan & Arief";
        frame.setAttribute(
          "allow",
          "autoplay; encrypted-media; picture-in-picture; fullscreen",
        );
        frame.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
        clearInterval(playerPoll);
        playerPoll = setInterval(updateMusicTime, 500);
        if (pendingPlay) {
          ytPlayer.loadVideoById(songs[currentTrack].id);
          playbackWatchdog();
        } else ytPlayer.cueVideoById(songs[currentTrack].id);
      },
      onStateChange: (e) => {
        const data = ytPlayer.getVideoData();
        if (!data.video_id || data.video_id !== songs[currentTrack].id) return;
        if (e.data === 1) {
          pendingPlay = false;
          clearTimeout(playBlockedTimer);
          failedTracks.delete(currentTrack);
          setMusicState(true, "Sedang diputar · " + songs[currentTrack].artist);
        } else if (e.data === 2) {
          pendingPlay = false;
          setMusicState(false, "Dijeda · tekan play untuk lanjut");
        } else if (e.data === 3)
          setMusicState(false, "Menyiapkan " + songs[currentTrack].title + "…");
        else if (e.data === 0) {
          if (!musicPlaying) return;
          setMusicState(false, "Selesai");
          if (repeatOne) selectTrack(currentTrack, true);
          else selectTrack(nextIndex(), true);
        } else if (e.data === 5)
          setMusicState(false, "Siap · tekan play untuk mulai");
        updateMusicTime();
      },
      onAutoplayBlocked: () => {
        pendingPlay = false;
        clearTimeout(playBlockedTimer);
        showPlayer(true);
        setMusicState(
          false,
          "Browser meminta izin suara. Ketuk play pada video di bawah, tanpa keluar dari website.",
        );
      },
      onError: (e) => {
        pendingPlay = false;
        clearTimeout(playBlockedTimer);
        if ([100, 101, 150].includes(e.data) && tryAlternative()) return;
        const restriction = e.data === 101 || e.data === 150;
        failedTracks.add(currentTrack);
        setMusicState(
          false,
          restriction
            ? "Video ini tidak diizinkan pemiliknya untuk diputar di website lain. Pilih lagu lain; tidak ada pengalihan."
            : e.data === 153
              ? "YouTube memerlukan website HTTP/HTTPS dengan identitas situs yang valid. Jangan buka lewat file lokal."
              : "Video tidak tersedia atau tautannya sudah berubah. Pilih lagu lain.",
        );
        $("#musicSeek").disabled = true;
      },
    },
  });
  loadTimer = setTimeout(() => {
    if (!ytReady) {
      try {
        ytPlayer.destroy();
      } catch {}
      ytPlayer = null;
      $("#videoWrap").innerHTML = '<div id="video"></div>';
      setMusicState(
        false,
        "Pemutar belum tersambung. Periksa jaringan, lalu ketuk lagunya lagi.",
      );
    }
  }, 20000);
}
async function selectTrack(index, play = true) {
  if (index < 0 || index >= songs.length) return;
  if (typeof stopFinaleAudio === "function") stopFinaleAudio(true);
  const serial = ++requestSerial;
  clearTimeout(playBlockedTimer);
  currentTrack = index;
  pendingPlay = play;
  showPlayer(true);
  setMetadata();
  setMusicState(false, "Menyiapkan " + songs[index].title + "…");
  $("#musicPlay").disabled = false;
  try {
    if (ytReady) {
      if (play) {
        ytPlayer.loadVideoById(songs[index].id);
        playbackWatchdog();
      } else ytPlayer.cueVideoById(songs[index].id);
      return;
    }
    await loadYouTubeAPI();
    if (serial !== requestSerial) return;
    mountPlayer();
  } catch (error) {
    if (serial === requestSerial) {
      pendingPlay = false;
      setMusicState(false, error.message || "Koneksi terganggu. Coba lagi.");
    }
  }
}
$("#openPlayer").addEventListener("click", () => {
  if (playerOpen) showPlayer(false);
  else if (ytReady) showPlayer(true);
  else selectTrack(currentTrack, true);
});
$("#musicPlay").addEventListener("click", () => {
  if (!ytReady) {
    selectTrack(currentTrack, true);
    return;
  }
  if (musicPlaying) {
    pendingPlay = false;
    ytPlayer.pauseVideo();
  } else {
    pendingPlay = true;
    ytPlayer.playVideo();
    playbackWatchdog();
  }
});
$("#musicNext").addEventListener("click", () => selectTrack(nextIndex(), true));
$("#musicPrevious").addEventListener("click", () =>
  selectTrack(nextIndex(-1), true),
);
$("#musicShuffle").addEventListener("click", () => {
  shuffleOn = !shuffleOn;
  $("#musicShuffle").setAttribute("aria-pressed", String(shuffleOn));
  $("#musicShuffle").textContent = shuffleOn ? "Acak: aktif" : "Acak: mati";
});
$("#musicRepeat").addEventListener("click", () => {
  repeatOne = !repeatOne;
  $("#musicRepeat").setAttribute("aria-pressed", String(repeatOne));
  $("#musicRepeat").textContent = repeatOne
    ? "Ulang satu: aktif"
    : "Ulang satu: mati";
});
$("#musicMute").addEventListener("click", () => {
  if (!ytReady) return;
  const muted = ytPlayer.isMuted();
  if (muted) ytPlayer.unMute();
  else ytPlayer.mute();
  $("#musicMute").setAttribute("aria-pressed", String(!muted));
  $("#musicMute").textContent = muted ? "Suara" : "Senyap";
});
$("#musicSeek").addEventListener("input", () => {
  seekDragging = true;
  if (ytReady)
    $("#elapsed").textContent = formatTime(
      (Number($("#musicSeek").value) / 1000) * ytPlayer.getDuration(),
    );
});
$("#musicSeek").addEventListener("change", () => {
  if (ytReady) {
    const d = ytPlayer.getDuration();
    if (d > 0)
      ytPlayer.seekTo((Number($("#musicSeek").value) / 1000) * d, true);
  }
  seekDragging = false;
});
$("#musicSeek").addEventListener("pointercancel", () => {
  seekDragging = false;
});
document.addEventListener("visibilitychange", () => {
  clearInterval(playerPoll);
  playerPoll = null;
  if (!document.hidden && ytReady) {
    updateMusicTime();
    playerPoll = setInterval(updateMusicTime, 500);
  }
});
songs.forEach((song, i) => {
  const row = document.createElement("div");
  row.className = "playlist-entry";
  const b = document.createElement("button");
  b.type = "button";
  b.className = "track";
  b.setAttribute("aria-pressed", String(i === 0));
  b.setAttribute("aria-label", "Putar " + song.title + " oleh " + song.artist);
  const n = document.createElement("span");
  n.textContent = String(i + 1).padStart(2, "0");
  const info = document.createElement("div"),
    name = document.createElement("b"),
    artist = document.createElement("small");
  name.textContent = song.title;
  artist.className = "by";
  artist.textContent = song.artist;
  info.append(name, artist);
  const state = document.createElement("span");
  state.className = "track-action";
  state.textContent = i === 0 ? "DIPILIH" : "PUTAR";
  b.append(n, info, state);
  b.addEventListener("click", () => {
    if (i === currentTrack && ytReady) {
      showPlayer(true);
      if (musicPlaying) ytPlayer.pauseVideo();
      else {
        pendingPlay = true;
        ytPlayer.playVideo();
        playbackWatchdog();
      }
    } else selectTrack(i, true);
  });
  row.append(b);
  $("#tracklist").append(row);
});
/* Pemanasan API saja; tidak memuat video atau suara sebelum klik. */
if ("IntersectionObserver" in window) {
  const warm = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        loadYouTubeAPI().catch(() => {});
        warm.disconnect();
      }
    },
    { rootMargin: "400px" },
  );
  warm.observe($("#playlist"));
}

/* Tab yang dapat dioperasikan dengan keyboard. */
const tabs = $$("[role=tab]");
function selectTab(tab, focus = false) {
  tabs.forEach((t) => {
    const on = t === tab;
    t.setAttribute("aria-selected", String(on));
    t.tabIndex = on ? 0 : -1;
    $("#" + t.getAttribute("aria-controls")).hidden = !on;
  });
  if (focus) tab.focus();
}
tabs.forEach((tab, i) => {
  tab.addEventListener("click", () => selectTab(tab));
  tab.addEventListener("keydown", (e) => {
    let n;
    if (e.key === "ArrowRight") n = (i + 1) % tabs.length;
    if (e.key === "ArrowLeft") n = (i - 1 + tabs.length) % tabs.length;
    if (e.key === "Home") n = 0;
    if (e.key === "End") n = tabs.length - 1;
    if (n !== undefined) {
      e.preventDefault();
      selectTab(tabs[n], true);
    }
  });
});
/* Kuis: tanggal dan tempat sudah dikoreksi. */
const questions = [
  {
    q: "Kita pertama kali kenal lewat mana?",
    o: ["Instagram", "Telegram", "WhatsApp", "Facebook"],
    a: 1,
    note: "Dari Telegram. Dari sini obrolan kita dimulai.",
  },
  {
    q: "Kapan pertama kali kita ketemu langsung?",
    o: [
      "17 Oktober 2026",
      "10 September 2026",
      "10 Oktober 2026",
      "17 September 2026",
    ],
    a: 2,
    note: "10 Oktober 2026. Tanggal yang kita simpan baik-baik.",
  },
  {
    q: "Di mana kita pertama kali bertemu?",
    o: ["Pantai", "Muhajirin, Praya", "Kampus", "Kafe"],
    a: 1,
    note: "Muhajirin, Praya. Akhirnya bukan cuma nama di layar.",
  },
  {
    q: "Apa makanan favorit Bubub?",
    o: ["Pizza", "Sushi", "Burger", "Mie ayam"],
    a: 3,
    note: "Mie ayam. Ini catatan penting.",
  },
  {
    q: "Lagu pertama di playlist ini?",
    o: [
      "Reckoner — Radiohead",
      "505 — Arctic Monkeys",
      "Panasea — Rumah Sakit",
      "Terbelah Dua — Supple",
    ],
    a: 2,
    note: "Panasea dari Rumah Sakit jadi pilihan pertama.",
  },
];
let qi = 0,
  score = 0,
  answered = false;
function renderQ(focus = false) {
  const q = questions[qi];
  answered = false;
  $("#question").textContent = q.q;
  $("#quizProgress").textContent = qi + 1 + " / " + questions.length;
  $("#quizBar").value = qi + 1;
  $("#feedback").textContent = "";
  $("#nextQuestion").disabled = true;
  $("#nextQuestion").textContent =
    qi === questions.length - 1 ? "Lihat hasil" : "Lanjut";
  $("#options").replaceChildren();
  q.o.forEach((text, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "option";
    b.textContent = String.fromCharCode(65 + i) + ". " + text;
    b.addEventListener("click", () => {
      if (answered) return;
      answered = true;
      const right = i === q.a;
      if (right) score++;
      [...$("#options").children].forEach((item, j) => {
        item.disabled = true;
        if (j === q.a) item.classList.add("correct");
      });
      if (!right) b.classList.add("wrong");
      $("#feedback").textContent =
        (right ? "Betul, Bub. " : "Belum tepat, nggak apa-apa. ") + q.note;
      $("#nextQuestion").disabled = false;
      $("#nextQuestion").focus({ preventScroll: true });
    });
    $("#options").append(b);
  });
  if (focus) $("#question").focus({ preventScroll: true });
}
$("#nextQuestion").addEventListener("click", () => {
  if (!answered) return;
  if (qi < questions.length - 1) {
    qi++;
    renderQ(true);
  } else {
    $("#quizPlay").hidden = true;
    $("#quizResult").hidden = false;
    $("#score").textContent = score + "/" + questions.length;
    $("#restartQuiz").focus({ preventScroll: true });
  }
});
$("#restartQuiz").addEventListener("click", () => {
  qi = 0;
  score = 0;
  $("#quizPlay").hidden = false;
  $("#quizResult").hidden = true;
  renderQ(true);
});
renderQ();
/* Memory game: aman ketika tombol reset ditekan selama kartu tertunda. */
const words = ["Awan", "Arief", "Praya", "Telegram", "Panasea", "Mie ayam"];
let first = null,
  locked = false,
  moves = 0,
  pairs = 0,
  pairTimer;
function shuffle(items) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function matchStats() {
  $("#matchStats").textContent = moves + " langkah · " + pairs + "/6 pasangan";
}
function revealCard(card, on) {
  card.classList.toggle("revealed", on);
  card.setAttribute("aria-pressed", String(on));
  card.setAttribute(
    "aria-label",
    on
      ? "Kartu " + card.dataset.position + ": " + card.dataset.word
      : "Buka kartu " + card.dataset.position,
  );
}
function resetMemory() {
  clearTimeout(pairTimer);
  first = null;
  locked = false;
  moves = 0;
  pairs = 0;
  matchStats();
  $("#matchMessage").textContent = "Pilih kartu pertamamu.";
  $("#matchGrid").replaceChildren();
  shuffle([...words, ...words]).forEach((word, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "match-card";
    b.dataset.word = word;
    b.dataset.position = i + 1;
    b.setAttribute("aria-label", "Buka kartu " + (i + 1));
    b.setAttribute("aria-pressed", "false");
    const face = document.createElement("span");
    face.className = "face";
    face.textContent = word;
    face.setAttribute("aria-hidden", "true");
    b.append(face);
    b.addEventListener("click", () => {
      if (locked || b === first || b.classList.contains("matched")) return;
      revealCard(b, true);
      if (!first) {
        first = b;
        $("#matchMessage").textContent =
          "Kamu membuka " + word + ". Cari pasangannya.";
        return;
      }
      moves++;
      const prev = first;
      first = null;
      if (prev.dataset.word === word) {
        pairs++;
        [prev, b].forEach((c) => {
          c.classList.add("matched");
          c.setAttribute("aria-disabled", "true");
          c.setAttribute(
            "aria-label",
            "Pasangan " + word + ", sudah ditemukan",
          );
        });
        matchStats();
        $("#matchMessage").textContent =
          pairs === 6
            ? "Semua ketemu dalam " + moves + " langkah. Good job, Bub!"
            : "Pasangan " + word + " ketemu.";
        return;
      }
      locked = true;
      matchStats();
      $("#matchMessage").textContent =
        prev.dataset.word +
        " dan " +
        word +
        ", belum cocok. Ingat posisinya ya.";
      pairTimer = setTimeout(() => {
        revealCard(prev, false);
        revealCard(b, false);
        locked = false;
        $("#matchMessage").textContent = "Coba dua kartu lagi.";
      }, 1200);
    });
    $("#matchGrid").append(b);
  });
}
$("#restartMatch").addEventListener("click", resetMemory);
resetMemory();
/* Ide kencan tanpa pengulangan langsung; clipboard memiliki pesan fallback. */
const ideas = [
  {
    tag: "FOOD SCENE",
    title: "Misi mie ayam.",
    text: "Cari mie ayam, duduk santai, lalu kasih nilai kuah dan toppingnya. Nggak perlu buru-buru pulang.",
  },
  {
    tag: "SLOW SCENE",
    title: "Sore tanpa agenda.",
    text: "Jalan sebentar di tempat yang nyaman buat kita berdua. HP disimpan dulu, gantian cerita soal hari ini.",
  },
  {
    tag: "LONG-DISTANCE SCENE",
    title: "Satu album, dua tempat.",
    text: "Pilih satu album, mulai di waktu yang sama, lalu kirim bagian lagu yang paling disukai.",
  },
  {
    tag: "PHOTO SCENE",
    title: "Lima foto, satu sore.",
    text: "Masing-masing ambil lima foto hal sederhana. Setelahnya, ceritain kenapa objek itu yang dipilih.",
  },
  {
    tag: "RAINY SCENE",
    title: "Telepon dan minuman hangat.",
    text: "Bikin minuman masing-masing, terus telepon sebentar. Nggak harus ada topik penting.",
  },
  {
    tag: "FUTURE SCENE",
    title: "Surat untuk bulan depan.",
    text: "Tulis pesan pendek, simpan, lalu sepakati tanggal buat membacanya bareng.",
  },
  {
    tag: "SNACK SCENE",
    title: "Jajan pilihan kamu.",
    text: "Gantian pilih satu jajanan favorit. Ceritain juga kenapa jajanan itu disukai.",
  },
  {
    tag: "DIALOGUE SCENE",
    title: "Tiga pertanyaan baru.",
    text: "Gantian cerita tentang hal kecil yang bikin senang, tempat yang pengin didatangi, dan satu kenangan masa kecil.",
  },
];
let currentIdea = -1;
$("#randomDate").addEventListener("click", () => {
  const choices = ideas.map((_, i) => i).filter((i) => i !== currentIdea);
  currentIdea = choices[Math.floor(Math.random() * choices.length)];
  const idea = ideas[currentIdea];
  $("#dateCategory").textContent = idea.tag;
  $("#dateTitle").textContent = idea.title;
  $("#dateDescription").textContent = idea.text;
  $("#copyDate").disabled = false;
  $("#randomDate").textContent = "Coba adegan lain";
  $("#copyStatus").textContent = "";
});
$("#copyDate").addEventListener("click", async () => {
  if (currentIdea < 0) return;
  const idea = ideas[currentIdea];
  try {
    if (!navigator.clipboard || !window.isSecureContext)
      throw new Error("Unavailable");
    await navigator.clipboard.writeText(
      "Bub, kapan-kapan yuk: " + idea.title + " " + idea.text,
    );
    $("#copyStatus").textContent = "Rencana tersalin. Tinggal kirim ke chat.";
  } catch {
    $("#copyStatus").textContent =
      "Salin otomatis tidak tersedia. Kamu bisa menyalin teks rencananya langsung.";
  }
});
/* Piano langsung: tidak memakai YouTube atau menyembunyikan video. */
let secretTimer = null,
  secretCloseTimer = null,
  audioFadeFrame = null,
  audioIntent = 0;
const finaleAudio = $("#finaleAudio");
let finaleWantsAudio = false,
  localAudioTried = false;
const remotePiano =
  "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Heartwarming.mp3";
function setFinaleAudioUI(on, message) {
  const button = $("#finaleAudioToggle");
  button.setAttribute("aria-pressed", String(on));
  button.textContent = on ? "Matikan musik" : "Nyalakan musik";
  if (message) $("#finaleAudioStatus").textContent = message;
}
function fadeFinaleVolume(target, duration, done) {
  if (audioFadeFrame !== null) {
    cancelAnimationFrame(audioFadeFrame);
    audioFadeFrame = null;
  }
  const from = finaleAudio.volume,
    start = performance.now();
  function tick(now) {
    const p = Math.min(1, (now - start) / Math.max(1, duration));
    try {
      finaleAudio.volume = from + (target - from) * (p * p * (3 - 2 * p));
    } catch {}
    if (p < 1) audioFadeFrame = requestAnimationFrame(tick);
    else {
      audioFadeFrame = null;
      if (done) done();
    }
  }
  audioFadeFrame = requestAnimationFrame(tick);
}
async function startFinaleAudio() {
  const intent = ++audioIntent;
  finaleWantsAudio = true;
  if (audioFadeFrame !== null) {
    cancelAnimationFrame(audioFadeFrame);
    audioFadeFrame = null;
  }
  /* Stop the playlist before starting this separate audio source. */
  pendingPlay = false;
  clearTimeout(playBlockedTimer);
  if (ytReady && ytPlayer) {
    try {
      ytPlayer.pauseVideo();
    } catch {}
  }
  setMusicState(false, "Dijeda untuk membaca pesan terakhir");
  try {
    finaleAudio.volume = 0;
    setFinaleAudioUI(false, "Menyiapkan piano…");
    await finaleAudio.play();
    if (intent !== audioIntent || !finaleWantsAudio) {
      if (!finaleWantsAudio) finaleAudio.pause();
      return;
    }
    setFinaleAudioUI(true, "Piano menemani. Baca pelan-pelan, Bub.");
    fadeFinaleVolume(0.25, 1600);
  } catch (error) {
    if (intent !== audioIntent) return;
    if (error.name === "AbortError") return;
    setFinaleAudioUI(
      false,
      error.name === "NotAllowedError"
        ? "Ketuk Nyalakan musik untuk mengizinkan suara."
        : "Audio belum tersedia. Jika tetap gagal, simpan Heartwarming.mp3 di folder yang sama dengan HTML.",
    );
  }
}
function stopFinaleAudio(immediate = false) {
  ++audioIntent;
  finaleWantsAudio = false;
  setFinaleAudioUI(false, "Musik dijeda.");
  if (immediate) {
    if (audioFadeFrame !== null) {
      cancelAnimationFrame(audioFadeFrame);
      audioFadeFrame = null;
    }
    finaleAudio.pause();
    try {
      finaleAudio.volume = 0;
    } catch {}
  } else fadeFinaleVolume(0, 600, () => finaleAudio.pause());
}
$("#finaleAudioToggle").addEventListener("click", () => {
  if (!finaleAudio.paused && finaleWantsAudio) stopFinaleAudio();
  else startFinaleAudio();
});
finaleAudio.addEventListener("error", () => {
  if (!localAudioTried) {
    localAudioTried = true;
    finaleAudio.src = "Heartwarming.mp3";
    finaleAudio.load();
    if (finaleWantsAudio) startFinaleAudio();
    return;
  }
  setFinaleAudioUI(
    false,
    "Audio gagal dimuat. Unduh Heartwarming.mp3 dari situs Kevin MacLeod dan letakkan bersama index.html, lalu ketuk Nyalakan musik.",
  );
});
finaleAudio.addEventListener("waiting", () => {
  if (finaleWantsAudio) $("#finaleAudioStatus").textContent = "Memuat audio…";
});
finaleAudio.addEventListener("playing", () => {
  if (!finaleWantsAudio) {
    finaleAudio.pause();
    return;
  }
  setFinaleAudioUI(true, "Piano menemani. Baca pelan-pelan, Bub.");
});
/* Avoid keeping an active fade loop running in a background tab. */
document.addEventListener("visibilitychange", () => {
  if (document.hidden && finaleWantsAudio) stopFinaleAudio(true);
});
function setSecret(open) {
  clearTimeout(secretCloseTimer);
  clearTimeout(secretTimer);
  const panel = $("#secret"),
    trigger = $("#openSecret"),
    noMotion = motionOff();
  trigger.setAttribute("aria-expanded", String(open));
  trigger.textContent = open
    ? "Simpan pesannya dulu"
    : "Tampilkan pesan terakhir";
  if (open) {
    panel.classList.remove("secret-closing", "secret-opening");
    panel.hidden = false;
    $("#finale").classList.add("secret-is-open");
    [...panel.querySelectorAll(".secret-reading-copy > p")].forEach((p, i) => {
      p.hidden = false;
      p.classList.add("secret-paragraph");
      p.style.setProperty("--secret-order", i);
    });
    /* Called during the opening click, not after the animation finishes. */
    startFinaleAudio();
    requestAnimationFrame(() => {
      panel.classList.add("secret-opening");
      panel.focus({ preventScroll: true });
      panel.scrollIntoView({
        behavior: noMotion ? "auto" : "smooth",
        block: "start",
      });
    });
  } else {
    $("#finale").classList.remove("secret-is-open");
    panel.classList.remove("secret-opening");
    stopFinaleAudio(noMotion);
    if (!noMotion) panel.classList.add("secret-closing");
    secretCloseTimer = setTimeout(
      () => {
        panel.hidden = true;
        panel.classList.remove("secret-closing");
        trigger.focus({ preventScroll: true });
        trigger.scrollIntoView({
          behavior: noMotion ? "auto" : "smooth",
          block: "center",
        });
      },
      noMotion ? 0 : 650,
    );
  }
}
$("#openSecret").addEventListener("click", () =>
  setSecret($("#openSecret").getAttribute("aria-expanded") !== "true"),
);
$("#closeSecret").addEventListener("click", () => setSecret(false));
/* Personal detail: two different bowls, the same table. */
questions.push({
  q: "Kalau Arief pesan mie ayam, Awan pilih apa?",
  o: ["Bakso", "Pizza", "Sushi", "Burger"],
  a: 0,
  note: "Mie ayam buat Arief, bakso buat Awan. Satu meja, dua favorit.",
});
$("#quizBar").max = questions.length;
renderQ();
ideas.push({
  tag: "TWO BOWLS, ONE TABLE",
  title: "Mie ayam kamu, bakso aku.",
  text: "Cari tempat yang punya dua-duanya. Arief pesan mie ayam, Awan pesan bakso. Makan pelan-pelan, lalu lanjut ngobrol tanpa buru-buru.",
});

/* Satu loop partikel, maksimal 30fps; berhenti saat tab tersembunyi. */
const canvas = $("#atmosphere"),
  ctx = canvas.getContext("2d");
let ambientFrame = null,
  lastAmbient = 0,
  ambientW = innerWidth,
  ambientH = innerHeight,
  stars = [];
const finePointer = window.matchMedia("(hover:hover) and (pointer:fine)");
function motionOff() {
  return (
    document.documentElement.classList.contains("still") || reduced.matches
  );
}
function resizeAtmosphere() {
  ambientW = innerWidth;
  ambientH = innerHeight;
  const dpr = Math.min(devicePixelRatio || 1, 1.5);
  canvas.width = Math.floor(ambientW * dpr);
  canvas.height = Math.floor(ambientH * dpr);
  if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  stars = Array.from({ length: ambientW < 650 ? 16 : 34 }, () => ({
    x: Math.random() * ambientW,
    y: Math.random() * ambientH,
    r: 0.5 + Math.random(),
    speed: 0.07 + Math.random() * 0.16,
    phase: Math.random() * Math.PI * 2,
  }));
}
function ambientTick(time) {
  ambientFrame = null;
  if (document.hidden || motionOff() || !ctx) return;
  if (time - lastAmbient >= 33) {
    lastAmbient = time;
    ctx.clearRect(0, 0, ambientW, ambientH);
    for (const star of stars) {
      star.y -= star.speed;
      if (star.y < -5) {
        star.y = ambientH + 5;
        star.x = Math.random() * ambientW;
      }
      const alpha = 0.12 + (Math.sin(time * 0.0007 + star.phase) + 1) * 0.17;
      ctx.fillStyle = "rgba(235,189,207," + alpha + ")";
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ambientFrame = requestAnimationFrame(ambientTick);
}
function syncAmbient() {
  if (ambientFrame !== null) {
    cancelAnimationFrame(ambientFrame);
    ambientFrame = null;
  }
  if (motionOff() || document.hidden) {
    if (ctx) ctx.clearRect(0, 0, ambientW, ambientH);
    $$(".scene,.reason").forEach((el) => el.style.removeProperty("transform"));
    $(".cursor-aura").style.opacity = "0";
    if (motionOff()) $$(".burst-particle").forEach((p) => p.remove());
    return;
  }
  if (ctx) ambientFrame = requestAnimationFrame(ambientTick);
}
resizeAtmosphere();
addEventListener("resize", resizeAtmosphere);
document.addEventListener("visibilitychange", syncAmbient);
new MutationObserver(syncAmbient).observe(document.documentElement, {
  attributes: true,
  attributeFilter: ["class"],
});
syncAmbient();
/* Cahaya pointer tidak mengganti kursor bawaan. */
let pointerFrame = null,
  px = 0,
  py = 0;
document.addEventListener(
  "pointermove",
  (e) => {
    if (!finePointer.matches || motionOff()) return;
    px = e.clientX;
    py = e.clientY;
    if (pointerFrame !== null) return;
    pointerFrame = requestAnimationFrame(() => {
      pointerFrame = null;
      const aura = $(".cursor-aura");
      aura.style.opacity = "1";
      aura.style.transform = "translate(" + px + "px," + py + "px)";
      if (scrollY < innerHeight)
        $("#home").style.setProperty(
          "--hero-x",
          (px / innerWidth - 0.5) * 35 + "px",
        );
    });
  },
  { passive: true },
);
document.documentElement.addEventListener("pointerleave", () => {
  $(".cursor-aura").style.opacity = "0";
});
$$(".reason,.scene").forEach((card) => {
  card.addEventListener("pointermove", (e) => {
    if (!finePointer.matches || motionOff()) return;
    const r = card.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5,
      y = (e.clientY - r.top) / r.height - 0.5;
    card.style.transform =
      "perspective(900px) rotateX(" +
      -y * 4 +
      "deg) rotateY(" +
      x * 5 +
      "deg) translateY(-3px)";
  });
  card.addEventListener("pointerleave", () =>
    card.style.removeProperty("transform"),
  );
});
let chapterScheduled = false;
function updateChapterMotion() {
  chapterScheduled = false;
  const height = innerHeight;
  $$(".chapter").forEach((section) => {
    const r = section.getBoundingClientRect(),
      f = Math.max(0, Math.min(1, (height - r.top) / (height + r.height)));
    section.style.setProperty("--chapter-fill", f * 100 + "%");
  });
  const quote = $(".quote-scene"),
    r = quote.getBoundingClientRect(),
    f = Math.max(0, Math.min(1, (height - r.top) / (height + r.height)));
  if (!motionOff()) {
    quote.style.setProperty("--scroll-shift", (f - 0.5) * 80 + "px");
    quote.style.setProperty("--quote-line", Math.min(1, f * 2));
  }
}
addEventListener(
  "scroll",
  () => {
    if (!chapterScheduled) {
      chapterScheduled = true;
      requestAnimationFrame(updateChapterMotion);
    }
  },
  { passive: true },
);
addEventListener("resize", updateChapterMotion);
updateChapterMotion();
if ("IntersectionObserver" in window) {
  const chapterObserver = new IntersectionObserver(
    (entries) => {
      const visible = entries.filter((e) => e.isIntersecting);
      if (!visible.length) return;
      const target = visible.sort(
        (a, b) => b.intersectionRatio - a.intersectionRatio,
      )[0].target.id;
      $$(".chapter-dock a").forEach((a) => {
        if (a.hash === "#" + target) a.setAttribute("aria-current", "location");
        else a.removeAttribute("aria-current");
      });
    },
    { rootMargin: "-15% 0px -50% 0px", threshold: [0, 0.1, 0.4] },
  );
  $$("main>section[id]").forEach((s) => chapterObserver.observe(s));
}
function burst(x, y) {
  if (motionOff()) return;
  const count = innerWidth < 650 ? 9 : 16;
  for (let i = 0; i < count; i++) {
    const p = document.createElement("i");
    p.className = "burst-particle";
    p.style.left = x + "px";
    p.style.top = y + "px";
    const a = (Math.PI * 2 * i) / count,
      d = 25 + Math.random() * 65;
    p.style.setProperty("--dx", Math.cos(a) * d + "px");
    p.style.setProperty("--dy", Math.sin(a) * d + "px");
    p.style.background = i % 3 === 0 ? "#f0dac4" : "#d7a4b0";
    document.body.append(p);
    setTimeout(() => p.remove(), 1200);
  }
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b || b.disabled || motionOff()) return;
  if (b.matches(".pill,.transport-play,.option")) {
    b.classList.add("ripple-host");
    const r = b.getBoundingClientRect(),
      ripple = document.createElement("span");
    ripple.className = "button-ripple";
    ripple.setAttribute("aria-hidden", "true");
    const size = Math.max(r.width, r.height) * 2;
    ripple.style.width = ripple.style.height = size + "px";
    ripple.style.left = (e.detail ? e.clientX - r.left : r.width / 2) + "px";
    ripple.style.top = (e.detail ? e.clientY - r.top : r.height / 2) + "px";
    b.append(ripple);
    setTimeout(() => ripple.remove(), 750);
  }
  if (b.id === "openSecret" && b.getAttribute("aria-expanded") === "true") {
    const r = b.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2);
  }
  if (b.id === "moreReason") {
    const group = $(".more-reason");
    group.classList.remove("updated");
    requestAnimationFrame(() => group.classList.add("updated"));
  }
  if (b.id === "randomDate") {
    const ticket = $(".date-ticket");
    ticket.classList.remove("changed");
    requestAnimationFrame(() => ticket.classList.add("changed"));
  }
  if (
    b.classList.contains("match-card") &&
    b.classList.contains("matched") &&
    $("#matchStats").textContent.includes("6/6")
  ) {
    const r = b.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2);
  }
});

/* Mouvement surat: pointer halus, tanpa sensor perangkat atau scroll paksa. */
(() => {
  const envelope = $("#openLetter"),
    paper = $("#letterContent");
  let frame = null,
    point = null;
  function clear(el) {
    ["--letter-rx", "--letter-ry", "--paper-rx", "--paper-ry"].forEach((key) =>
      el.style.removeProperty(key),
    );
  }
  function move(e) {
    if (!finePointer.matches || motionOff() || e.currentTarget.hidden) return;
    point = { el: e.currentTarget, x: e.clientX, y: e.clientY };
    if (frame !== null) return;
    frame = requestAnimationFrame(() => {
      frame = null;
      if (!point || motionOff()) return;
      const { el, x, y } = point,
        r = el.getBoundingClientRect();
      if (el === envelope && el.getAttribute("aria-expanded") === "true")
        return;
      const nx = Math.max(-0.5, Math.min(0.5, (x - r.left) / r.width - 0.5)),
        ny = Math.max(-0.5, Math.min(0.5, (y - r.top) / r.height - 0.5)),
        prefix = el === envelope ? "--letter-" : "--paper-",
        amount = el === envelope ? 9 : 2;
      el.style.setProperty(prefix + "rx", -ny * amount + "deg");
      el.style.setProperty(prefix + "ry", nx * amount + "deg");
    });
  }
  for (const el of [envelope, paper]) {
    el.addEventListener("pointermove", move, { passive: true });
    el.addEventListener("pointerleave", () => {
      point = null;
      clear(el);
    });
  }
  paper.addEventListener("animationend", (e) => {
    if (
      e.target === paper &&
      (e.animationName === "paper-cinematic-entry" ||
        e.animationName === "keepsake-unfold")
    )
      paper.classList.add("paper-settled");
  });
  new MutationObserver(() => {
    if (paper.hidden) paper.classList.remove("paper-settled");
  }).observe(paper, { attributes: true, attributeFilter: ["hidden"] });
  new MutationObserver(() => {
    if (motionOff()) {
      clear(envelope);
      clear(paper);
    }
  }).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
})();

/* V9 bonus chapters. All personal copy and cartoon artwork live in HTML. */
(() => {
  const moodButtons = [...document.querySelectorAll("[data-mood]")],
    moodPanels = [...document.querySelectorAll(".mood-letter")];
  let moodCloseTimer = null,
    moodVersion = 0;
  function closeMood(id) {
    const panel = document.getElementById("mood-" + id),
      button = moodButtons.find((b) => b.dataset.mood === id);
    if (!panel || !button) return;
    clearTimeout(moodCloseTimer);
    const version = ++moodVersion;
    button.setAttribute("aria-expanded", "false");
    panel.classList.add("is-closing");
    moodCloseTimer = setTimeout(
      () => {
        if (version !== moodVersion) return;
        panel.hidden = true;
        panel.classList.remove("is-closing");
        button.focus({ preventScroll: true });
        button.scrollIntoView({
          block: "nearest",
          behavior: motionOff() ? "auto" : "smooth",
        });
      },
      motionOff() ? 0 : 450,
    );
  }
  moodButtons.forEach((button) =>
    button.addEventListener("click", () => {
      const id = button.dataset.mood,
        panel = document.getElementById("mood-" + id),
        wasOpen = button.getAttribute("aria-expanded") === "true";
      if (wasOpen) {
        closeMood(id);
        return;
      }
      ++moodVersion;
      clearTimeout(moodCloseTimer);
      moodButtons.forEach((b) =>
        b.setAttribute("aria-expanded", String(b === button)),
      );
      moodPanels.forEach((p) => {
        p.hidden = p !== panel;
        p.classList.remove("is-closing");
      });
      panel.focus({ preventScroll: true });
      panel.scrollIntoView({
        block: "start",
        behavior: motionOff() ? "auto" : "smooth",
      });
    }),
  );
  document
    .querySelectorAll("[data-close-mood]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        closeMood(button.dataset.closeMood),
      ),
    );
  const bowls = [...document.querySelectorAll(".food-bowl")],
    message = document.getElementById("bowlMessage"),
    status = document.querySelector(".bowl-progress");
  bowls.forEach((button) =>
    button.addEventListener("click", () => {
      const picked = button.getAttribute("aria-pressed") !== "true";
      button.setAttribute("aria-pressed", String(picked));
      button.querySelector("small").textContent = picked
        ? "sudah dipesan"
        : "ketuk mangkuknya";
      const count = bowls.filter(
        (b) => b.getAttribute("aria-pressed") === "true",
      ).length;
      status.textContent =
        count === 2
          ? "Dua pesanan lengkap · satu meja buat kita"
          : count === 1
            ? "Satu pesanan masuk · satu mangkuk lagi, Bub"
            : "Belum ada pesanan · ketuk kedua mangkuk";
      message.hidden = count !== 2;
    }),
  );
  document.querySelectorAll(".memory-polaroid").forEach((button) => {
    const front = button.querySelector(".polaroid-front"),
      back = button.querySelector(".polaroid-back"),
      title = front.querySelector("strong").textContent;
    front.setAttribute("aria-hidden", "false");
    back.setAttribute("aria-hidden", "true");
    button.addEventListener("click", () => {
      const flipped = button.getAttribute("aria-pressed") !== "true";
      button.setAttribute("aria-pressed", String(flipped));
      button.setAttribute(
        "aria-label",
        (flipped ? "Kembalikan ilustrasi: " : "Balik kartu: ") + title,
      );
      front.setAttribute("aria-hidden", String(flipped));
      back.setAttribute("aria-hidden", String(!flipped));
    });
  });
  const nextButton = document.getElementById("nextMemoryCard"),
    invite = document.getElementById("nextMemoryInvite");
  let nextCloseTimer = null;
  function toggleNext(open) {
    clearTimeout(nextCloseTimer);
    nextButton.setAttribute("aria-expanded", String(open));
    if (open) {
      invite.classList.remove("is-closing");
      invite.hidden = false;
      invite.focus({ preventScroll: true });
      invite.scrollIntoView({
        block: "start",
        behavior: motionOff() ? "auto" : "smooth",
      });
    } else {
      invite.classList.add("is-closing");
      nextCloseTimer = setTimeout(
        () => {
          invite.hidden = true;
          invite.classList.remove("is-closing");
          nextButton.focus({ preventScroll: true });
          nextButton.scrollIntoView({
            block: "center",
            behavior: motionOff() ? "auto" : "smooth",
          });
        },
        motionOff() ? 0 : 450,
      );
    }
  }
  nextButton.addEventListener("click", () =>
    toggleNext(nextButton.getAttribute("aria-expanded") !== "true"),
  );
  document
    .getElementById("closeNextMemory")
    .addEventListener("click", () => toggleNext(false));
})();

/* Additional sunset scene + local-only bottle. */
(() => {
  const frame = document.querySelector(".aa-beach-frame");
  if (!frame) return;
  const dusk = document.getElementById("aa-dusk"),
    night = document.getElementById("aa-night");
  function mode(isNight) {
    frame.dataset.night = String(isNight);
    night.setAttribute("aria-pressed", String(isNight));
    dusk.setAttribute("aria-pressed", String(!isNight));
    document.getElementById("aa-scene-label").textContent = isNight
      ? "19:12 · belum ingin pulang."
      : "17:48 · tinggal sebentar lagi.";
  }
  dusk.addEventListener("click", () => mode(false));
  night.addEventListener("click", () => mode(true));
  const pause = document.getElementById("aa-pause");
  pause.addEventListener("click", () => {
    const paused = frame.classList.toggle("aa-paused");
    pause.setAttribute("aria-pressed", String(paused));
    pause.textContent = paused ? "Lanjutkan adegan" : "Jeda adegan";
  });
  const note = document.getElementById("aa-note"),
    status = document.getElementById("aa-note-status"),
    key = "awan_arief_beach_bottle_v1";
  try {
    note.value = localStorage.getItem(key) || "";
    if (note.value) status.textContent = "Pesan tersimpanmu sudah kembali.";
  } catch (e) {
    status.textContent =
      "Penyimpanan browser tidak tersedia. Pesan masih bisa ditulis untuk sesi ini.";
  }
  document.getElementById("aa-bottle-form").addEventListener("submit", (e) => {
    e.preventDefault();
    if (!note.value.trim()) {
      status.textContent = "Tulis pesan kecil dulu, yaa.";
      note.focus();
      return;
    }
    try {
      localStorage.setItem(key, note.value);
      status.textContent =
        "Pesan disimpan di browser ini. Sampai senja berikutnya.";
    } catch (e) {
      status.textContent =
        "Pesan belum tersimpan. Browser tidak mengizinkan penyimpanan.";
    }
  });
  document.getElementById("aa-delete").addEventListener("click", () => {
    try {
      localStorage.removeItem(key);
      note.value = "";
      status.textContent = "Pesan di browser ini sudah dihapus.";
    } catch (e) {
      status.textContent = "Pesan belum bisa dihapus dari penyimpanan browser.";
    }
  });
})();

/* Prepare the supplied artwork; preserve existing transparency, otherwise remove
   only edge-connected background matching corner samples. Never remove white clothing. */
(() => {
  const targets = [...document.querySelectorAll(".aa-final-image")];
  if (!targets.length) return;
  const status = document.getElementById("aa-cutout-status"),
    img = new Image();
  img.crossOrigin = "anonymous";
  function fail() {
    if (status) {
      status.hidden = false;
      status.textContent =
        "Gambar belum berhasil dimuat. Periksa koneksi lalu muat ulang halaman.";
    }
  }
  img.onerror = fail;
  img.onload = () => {
    try {
      const w = img.naturalWidth,
        h = img.naturalHeight,
        canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) throw Error("Canvas unavailable");
      ctx.drawImage(img, 0, 0);
      const pixels = ctx.getImageData(0, 0, w, h),
        p = pixels.data,
        n = w * h;
      const sample = [0, w - 1, (h - 1) * w, n - 1].map((i) => [
        p[i * 4],
        p[i * 4 + 1],
        p[i * 4 + 2],
        p[i * 4 + 3],
      ]);
      if (!sample.some((v) => v[3] < 20)) {
        const seen = new Uint8Array(n),
          q = new Int32Array(n);
        let a = 0,
          b = 0;
        function background(i) {
          const k = i * 4;
          return (
            p[k + 3] < 10 ||
            sample.some(
              (s) =>
                Math.max(
                  Math.abs(p[k] - s[0]),
                  Math.abs(p[k + 1] - s[1]),
                  Math.abs(p[k + 2] - s[2]),
                ) < 32,
            )
          );
        }
        function push(i) {
          if (i < 0 || i >= n || seen[i]) return;
          seen[i] = 1;
          if (background(i)) q[b++] = i;
        }
        for (let x = 0; x < w; x++) {
          push(x);
          push((h - 1) * w + x);
        }
        for (let y = 0; y < h; y++) {
          push(y * w);
          push(y * w + w - 1);
        }
        while (a < b) {
          const i = q[a++],
            x = i % w;
          p[i * 4 + 3] = 0;
          if (x) push(i - 1);
          if (x < w - 1) push(i + 1);
          if (i >= w) push(i - w);
          if (i < n - w) push(i + w);
        }
        ctx.putImageData(pixels, 0, 0);
      }
      const url = canvas.toDataURL("image/png");
      targets.forEach((t) => {
        t.setAttribute("href", url);
        t.classList.remove("aa-image-loading");
      });
      document.querySelector(".aa-final-art")?.classList.add("aa-ready");
      if (status) status.hidden = true;
    } catch (e) {
      fail();
    }
  };
  img.src = targets[0].getAttribute("href");
})();

/* Four optional experiences. Original story and still artwork are preserved. */
(() => {
  const frame = document.querySelector(".aa-beach-frame");
  if (!frame) return;
  const status = document.getElementById("aa-ocean-status");
  /* Locally synthesized surf; no network audio dependency or autoplay. */
  let audio = null,
    wanted = false,
    volume = 0.25,
    starting = false;
  const soundButtons = [...document.querySelectorAll("[data-ocean-toggle]")];
  function soundUI() {
    soundButtons.forEach((b) => {
      b.setAttribute("aria-pressed", String(wanted));
      b.textContent = wanted ? "Matikan suara pantai" : "Nyalakan suara pantai";
      b.disabled = starting;
    });
  }
  function buildSound() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) throw Error("Audio unavailable");
    const ctx = new AC();
    const buffer = ctx.createBuffer(2, ctx.sampleRate * 12, ctx.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const a = buffer.getChannelData(channel);
      let last = 0;
      for (let i = 0; i < a.length; i++) {
        last = (last + Math.random() * 0.04 - 0.02) / 1.02;
        a[i] = last * 3.5;
      }
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const low = ctx.createBiquadFilter();
    low.type = "lowpass";
    low.frequency.value = 950;
    const high = ctx.createBiquadFilter();
    high.type = "highpass";
    high.frequency.value = 80;
    const wave = ctx.createGain();
    wave.gain.value = 0.55;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.11;
    const depth = ctx.createGain();
    depth.gain.value = 0.32;
    lfo.connect(depth).connect(wave.gain);
    const master = ctx.createGain();
    master.gain.value = volume * 0.65;
    source
      .connect(high)
      .connect(low)
      .connect(wave)
      .connect(master)
      .connect(ctx.destination);
    source.start();
    lfo.start();
    return { ctx, source, lfo, master };
  }
  async function toggleSound() {
    if (starting) return;
    starting = true;
    soundUI();
    try {
      if (!audio) audio = buildSound();
      if (wanted) {
        wanted = false;
        await audio.ctx.suspend();
        status.textContent = "Suara pantai dimatikan.";
      } else {
        await audio.ctx.resume();
        wanted = audio.ctx.state === "running";
        status.textContent = wanted
          ? "Suasana ombak sintetis menyala. Volume bisa diatur."
          : "Browser menahan audio. Ketuk nyalakan lagi.";
      }
    } catch (e) {
      wanted = false;
      status.textContent = "Suara belum bisa dinyalakan di browser ini.";
    } finally {
      starting = false;
      soundUI();
    }
  }
  soundButtons.forEach((b) => b.addEventListener("click", toggleSound));
  document.querySelectorAll("[data-ocean-volume]").forEach((input) =>
    input.addEventListener("input", () => {
      volume = Number(input.value) / 100;
      document
        .querySelectorAll("[data-ocean-volume]")
        .forEach((other) => (other.value = String(Math.round(volume * 100))));
      if (audio)
        audio.master.gain.setTargetAtTime(
          volume * 0.65,
          audio.ctx.currentTime,
          0.12,
        );
    }),
  );
  document.addEventListener("visibilitychange", () => {
    if (!audio) return;
    if (document.hidden) audio.ctx.suspend().catch(() => {});
    else if (wanted)
      audio.ctx.resume().catch(() => {
        wanted = false;
        soundUI();
        status.textContent = "Ketuk untuk menyalakan suara kembali.";
      });
  });
  window.addEventListener("pagehide", () => {
    if (audio) audio.ctx.suspend().catch(() => {});
  });
  /* Night stars. Opened state is optional local browser storage only. */
  const messages = [
    [
      "Pelan-pelan aja, Bub.",
      "Kamu nggak perlu selalu punya cerita besar. Cerita hari ini, sekecil apa pun, aku mau dengerin.",
    ],
    [
      "Tempat pulang.",
      "Kalau hari ini terasa ramai, semoga di dekat aku kamu bisa berhenti pura-pura kuat sebentar.",
    ],
    [
      "Satu langit yang sama.",
      "Nggak setiap waktu kita bisa duduk berdua. Tapi aku masih pengin menyediakan waktu buat kamu.",
    ],
    [
      "Masih memilih kamu.",
      "Semoga nanti ada banyak senja yang kita lihat bareng. Bukan karena semuanya sempurna, tapi karena kita sama-sama mau merawat cerita ini.",
    ],
  ];
  let read = new Set();
  try {
    const saved = JSON.parse(
      localStorage.getItem("aa_opened_stars_v1") || "[]",
    );
    if (Array.isArray(saved))
      read = new Set(
        saved.filter(
          (v) => Number.isInteger(v) && v >= 0 && v < messages.length,
        ),
      );
  } catch (e) {}
  const starDialog = document.getElementById("aa-star-dialog");
  const starButtons = [...document.querySelectorAll(".aa-message-star")];
  function markStars() {
    starButtons.forEach((b) => {
      const i = Number(b.dataset.star);
      b.classList.toggle("aa-read", read.has(i));
      b.setAttribute(
        "aria-label",
        (read.has(i) ? "Baca lagi" : "Buka") + " pesan bintang " + (i + 1),
      );
    });
  }
  markStars();
  starButtons.forEach((b) =>
    b.addEventListener("click", () => {
      const i = Number(b.dataset.star);
      document.getElementById("aa-star-title").textContent = messages[i][0];
      document.getElementById("aa-star-message").textContent = messages[i][1];
      read.add(i);
      markStars();
      try {
        localStorage.setItem("aa_opened_stars_v1", JSON.stringify([...read]));
      } catch (e) {}
      document.getElementById("aa-star-counter").textContent =
        read.size + " dari 4 bintang sudah kamu baca.";
      if (typeof starDialog.showModal === "function") starDialog.showModal();
      else {
        starDialog.setAttribute("open", "");
        starDialog.scrollIntoView({ block: "center" });
      }
    }),
  );
  document.getElementById("aa-close-star").addEventListener("click", () => {
    if (typeof starDialog.close === "function") starDialog.close();
    else starDialog.removeAttribute("open");
  });
  starDialog.addEventListener("click", (e) => {
    if (e.target !== starDialog) return;
    const r = starDialog.getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      starDialog.close();
  });
  const hint = document.getElementById("aa-night-hint");
  function nightHint() {
    hint.textContent =
      frame.dataset.night === "true"
        ? "Ketuk empat bintang bercahaya di langit. Bintang merah muda menandai pesan yang sudah dibaca."
        : "Pilih suasana Malam untuk menemukan empat bintang berisi pesan. Suara ombak dibuat secara sintetis, tanpa diputar otomatis.";
  }
  new MutationObserver(nightHint).observe(frame, {
    attributes: true,
    attributeFilter: ["data-night"],
  });
  nightHint();
  /* Quiet mode moves the real scene, never duplicates the image or its controls. */
  const rest = document.getElementById("aa-rest-dialog"),
    slot = document.getElementById("aa-rest-scene"),
    enter = document.getElementById("aa-enter-rest");
  let marker = null,
    oldScroll = 0;
  enter.addEventListener("click", () => {
    if (typeof rest.showModal !== "function") {
      status.textContent =
        "Mode duduk sebentar memerlukan browser yang lebih baru.";
      return;
    }
    if (rest.open) return;
    oldScroll = window.scrollY;
    marker = document.createComment("Scene home");
    frame.before(marker);
    slot.append(frame);
    document.body.classList.add("aa-rest-open");
    rest.showModal();
    document.getElementById("aa-leave-rest").focus();
  });
  document
    .getElementById("aa-leave-rest")
    .addEventListener("click", () => rest.close());
  rest.addEventListener("close", () => {
    if (marker && marker.parentNode) {
      marker.before(frame);
      marker.remove();
      marker = null;
    }
    document.body.classList.remove("aa-rest-open");
    window.scrollTo({ top: oldScroll, behavior: "instant" });
    enter.focus({ preventScroll: true });
  });
  document.getElementById("aa-rest-night").addEventListener("click", () => {
    const next = frame.dataset.night !== "true";
    document.getElementById(next ? "aa-night" : "aa-dusk").click();
  });
  /* Ticket form + local PNG export. Nothing is submitted to a server. */
  const form = document.getElementById("aa-ticket-form"),
    activity = document.getElementById("aa-ticket-activity"),
    place = document.getElementById("aa-ticket-place"),
    date = document.getElementById("aa-ticket-date"),
    time = document.getElementById("aa-ticket-time"),
    ticketStatus = document.getElementById("aa-ticket-status");
  function dateLabel() {
    if (!date.value) return "Belum dipilih";
    const parsed = new Date(date.value + "T12:00:00");
    if (Number.isNaN(parsed.getTime())) return "Belum dipilih";
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(parsed);
  }
  function preview() {
    document.getElementById("aa-preview-activity").textContent =
      activity.value.trim() || "Rencana kecil kita";
    document.getElementById("aa-preview-place").textContent =
      place.value.trim() || "Tempat kita pilih bareng";
    document.getElementById("aa-preview-date").textContent = dateLabel();
    document.getElementById("aa-preview-time").textContent = time.value
      ? time.value.replace(":", ".")
      : "Santai, kita atur nanti";
  }
  form.addEventListener("input", preview);
  form.addEventListener("change", preview);
  preview();
  function lines(ctx, text, x, y, maxWidth, lineHeight) {
    let row = "";
    for (const word of text.split(/\s+/)) {
      const next = row ? row + " " + word : word;
      if (ctx.measureText(next).width > maxWidth && row) {
        ctx.fillText(row, x, y);
        y += lineHeight;
        row = word;
      } else row = next;
    }
    if (row) {
      ctx.fillText(row, x, y);
      y += lineHeight;
    }
    return y;
  }
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    if (!activity.value.trim()) {
      activity.setCustomValidity("Tulis kegiatan kalian dulu, ya.");
      activity.reportValidity();
      return;
    }
    if (!place.value.trim()) {
      place.setCustomValidity("Isi nama tempat dulu, ya.");
      place.reportValidity();
      return;
    }
    const submit = form.querySelector("[type=submit]");
    submit.disabled = true;
    ticketStatus.textContent = "Menyiapkan tiket versi resolusi tinggi…";
    try {
      if (document.fonts && document.fonts.load) {
        await Promise.race([
          Promise.all([
            document.fonts.load("500 100px Cormorant"),
            document.fonts.load('400 30px "DM Sans"'),
          ]),
          new Promise((resolve) => setTimeout(resolve, 2000)),
        ]);
      }
      const canvas = document.createElement("canvas");
      canvas.width = 1800;
      canvas.height = 1120;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw Error("Canvas unavailable");
      const serif = "Cormorant, Georgia, serif",
        sans = '"DM Sans", Arial, sans-serif';
      function roundRect(x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
      }
      function label(text, x, y, color = "#854457", size = 18) {
        ctx.fillStyle = color;
        ctx.font = "500 " + size + "px " + sans;
        ctx.fillText(text, x, y);
      }
      function fitLines(
        text,
        x,
        y,
        maxWidth,
        lineHeight,
        maxLines,
        fontSize,
        family,
        color,
      ) {
        ctx.font = "400 " + fontSize + "px " + family;
        ctx.fillStyle = color;
        let rows = [],
          row = "";
        for (const character of text) {
          if (ctx.measureText(row + character).width > maxWidth && row) {
            const space = row.lastIndexOf(" ");
            if (space > Math.floor(row.length * 0.35)) {
              rows.push(row.slice(0, space));
              row = row.slice(space + 1) + character;
            } else {
              rows.push(row);
              row = character;
            }
          } else row += character;
        }
        if (row) rows.push(row.trim());
        if (rows.length > maxLines) {
          return fitLines(
            text,
            x,
            y,
            maxWidth,
            lineHeight * 0.88,
            maxLines,
            fontSize * 0.88,
            family,
            color,
          );
        }
        rows.forEach((r, i) => ctx.fillText(r, x, y + i * lineHeight));
        return y + (rows.length - 1) * lineHeight;
      }
      const bg = ctx.createLinearGradient(0, 0, 1800, 1120);
      bg.addColorStop(0, "#241922");
      bg.addColorStop(1, "#100e12");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, 1800, 1120);
      ctx.strokeStyle = "#d7a4b026";
      ctx.lineWidth = 1;
      ctx.strokeRect(38, 38, 1724, 1044);
      ctx.save();
      ctx.shadowColor = "#00000055";
      ctx.shadowBlur = 45;
      ctx.shadowOffsetY = 20;
      roundRect(100, 100, 1600, 920, 28);
      ctx.fillStyle = "#f4e9dc";
      ctx.fill();
      ctx.restore();
      ctx.save();
      roundRect(100, 100, 1600, 920, 28);
      ctx.clip();
      const paper = ctx.createLinearGradient(100, 100, 1350, 1020);
      paper.addColorStop(0, "#faf1e5");
      paper.addColorStop(1, "#e8d7ca");
      ctx.fillStyle = paper;
      ctx.fillRect(100, 100, 1600, 920);
      ctx.fillStyle = "#6b3549";
      ctx.fillRect(1360, 100, 340, 920);
      ctx.fillStyle = "#85445708";
      ctx.font = "italic 430px " + serif;
      ctx.fillText("&", 927, 480);
      ctx.restore();
      label("OUR LITTLE WORLD", 165, 175);
      label("A DATE WORTH KEEPING", 1000, 175, "#8d6c71", 16);
      ctx.strokeStyle = "#b8959560";
      ctx.beginPath();
      ctx.moveTo(165, 210);
      ctx.lineTo(1295, 210);
      ctx.stroke();
      ctx.fillStyle = "#3b2c30";
      ctx.font = "500 118px " + serif;
      ctx.fillText("Awan", 165, 345);
      const nameWidth = ctx.measureText("Awan").width;
      ctx.fillStyle = "#9c596d";
      ctx.font = "italic 106px " + serif;
      ctx.fillText("&", 190 + nameWidth, 345);
      const ampWidth = ctx.measureText("&").width;
      ctx.fillStyle = "#3b2c30";
      ctx.font = "500 118px " + serif;
      ctx.fillText("Arief", 215 + nameWidth + ampWidth, 345);
      label("RENCANA KECIL KITA", 168, 415, "#854457", 16);
      fitLines(
        activity.value.trim(),
        165,
        480,
        1110,
        65,
        2,
        60,
        serif,
        "#3b2c30",
      );
      label("TEMPAT", 168, 615, "#854457", 16);
      fitLines(place.value.trim(), 165, 658, 1110, 38, 2, 29, sans, "#725c63");
      ctx.strokeStyle = "#b8959560";
      ctx.beginPath();
      ctx.moveTo(165, 720);
      ctx.lineTo(1295, 720);
      ctx.stroke();
      label("TANGGAL", 168, 770, "#854457", 16);
      label("WAKTU", 795, 770, "#854457", 16);
      label(dateLabel(), 165, 820, "#3b2c30", 29);
      label(
        time.value ? time.value.replace(":", ".") : "Kita atur bareng",
        792,
        820,
        "#3b2c30",
        29,
      );
      label(
        "Bukan tiket masuk resmi. Cuma ajakan untuk meluangkan waktu berdua.",
        168,
        899,
        "#887079",
        17,
      );
      label("TO BE CONTINUED, TOGETHER.", 168, 961, "#854457", 16);
      ctx.save();
      ctx.strokeStyle = "#f0d9c780";
      ctx.setLineDash([7, 10]);
      ctx.beginPath();
      ctx.moveTo(1360, 135);
      ctx.lineTo(1360, 985);
      ctx.stroke();
      ctx.restore();
      ctx.textAlign = "center";
      label("ADMIT", 1530, 195, "#edcbd0", 21);
      ctx.fillStyle = "#fff0dd";
      ctx.font = "400 110px " + serif;
      ctx.fillText("TWO", 1530, 300);
      ctx.save();
      ctx.translate(1530, 485);
      ctx.rotate(-0.15);
      ctx.strokeStyle = "#f1cfca80";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 94, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 82, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "#fff0dd";
      ctx.font = "italic 52px " + serif;
      ctx.fillText("A & A", 0, 15);
      ctx.restore();
      label("JUST US.", 1530, 657, "#f2d3ce", 18);
      label("NO AUDIENCE NEEDED.", 1530, 690, "#ddb4bf", 13);
      ctx.fillStyle = "#f2d3ce";
      let bx = 1426;
      const bars = [
        2, 1, 3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 4, 1, 2, 3, 1, 2, 4, 2, 1, 3, 1, 2,
      ];
      bars.forEach((v, i) => {
        ctx.fillRect(bx, 776, v * 1.5, 66 + (i % 3) * 5);
        bx += v * 1.5 + 3.5;
      });
      label("AWAN / ARIEF", 1530, 895, "#f2d3ce", 16);
      label("ONE LITTLE PLAN FOR TWO", 1530, 954, "#ddb4bf", 12);
      ctx.textAlign = "left";
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      [100, 1020].forEach((y) => {
        ctx.beginPath();
        ctx.arc(1360, y, 23, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
      const blob = await new Promise((resolve, reject) =>
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(Error("Export failed"))),
          "image/png",
        ),
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "tiket-awan-arief-" + date.value + ".png";
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      ticketStatus.textContent =
        "Tiket resolusi tinggi siap. Periksa folder unduhanmu.";
    } catch (err) {
      ticketStatus.textContent =
        "Unduhan belum berhasil. Coba lagi atau simpan tangkapan layar pratinjaunya.";
    } finally {
      submit.disabled = false;
    }
  });
  activity.addEventListener("input", () => activity.setCustomValidity(""));
  place.addEventListener("input", () => place.setCustomValidity(""));
})();
