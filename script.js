console.log("Let's get started with JavaScript!");

let currentSong = new Audio();
let songs;
let currFolder;

function secondsToMinutesSeconds(seconds) {
  if (isNaN(seconds) || seconds < 0) {
    return "00:00";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  const formattedMinutes = String(minutes).padStart(2, "0");
  const formattedSeconds = String(remainingSeconds).padStart(2, "0");

  return `${formattedMinutes}:${formattedSeconds}`;
}

async function getSongs(folder) {
  currFolder = folder;
  const encodedFolder = folder
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
  songs = [];
  // Try manifest first
  try {
    const manifestRes = await fetch(`/` + encodedFolder + `/tracks.json`);
    if (manifestRes.ok) {
      const manifest = await manifestRes.json();
      if (Array.isArray(manifest.tracks)) {
        songs = manifest.tracks
          .filter(
            (t) => typeof t === "string" && t.toLowerCase().endsWith(".mp3")
          )
          .map((t) => t);
      } else if (
        manifest &&
        typeof manifest.tracks === "object" &&
        manifest.tracks !== null
      ) {
        // Handle misformatted object: use values or keys that look like filenames
        const values = Object.values(manifest.tracks).filter(
          (v) => typeof v === "string"
        );
        const keys = Object.keys(manifest.tracks);
        const candidates = (values.length ? values : keys).filter((t) =>
          t.toLowerCase().endsWith(".mp3")
        );
        songs = candidates;
      }
    } else {
      // Fallback to directory scrape if manifest missing
      const dirRes = await fetch(`/${encodedFolder}/`);
      const response = await dirRes.text();
      const div = document.createElement("div");
      div.innerHTML = response;
      const as = div.getElementsByTagName("a");
      for (let index = 0; index < as.length; index++) {
        const element = as[index];
        if (element.href.endsWith(".mp3")) {
          try {
            const url = new URL(element.href);
            const filename = decodeURIComponent(url.pathname.split("/").pop());
            if (filename) songs.push(filename);
          } catch (e) {}
        }
      }
    }
  } catch (err) {
    console.warn("Failed to load track list for", folder, err);
  }

  // Show all the songs in the playlist
  let songUL = document
    .querySelector(".songList")
    .getElementsByTagName("ul")[0];
  songUL.innerHTML = "";
  for (const song of songs) {
    const decoded = decodeURIComponent(song);
    const displayTitle = decoded.endsWith(".mp3")
      ? decoded.slice(0, -4)
      : decoded;
    songUL.innerHTML += `
      <li data-track="${song}">
        <img class="invert" width="34" src="images/music.svg" alt="">
        <div class="info">
          <div>${displayTitle}</div>
          <div>Harry</div>
        </div>
        <div class="playnow">
          <span>Play Now</span>
          <img class="invert" src="images/play.svg" alt="">
        </div>
      </li>`;
  }

  // Attach an event listener to each song
  Array.from(
    document.querySelector(".songList").getElementsByTagName("li")
  ).forEach((e) => {
    e.addEventListener("click", (element) => {
      const track =
        e.getAttribute("data-track") ||
        e.querySelector(".info").firstElementChild.innerHTML.trim();
      playMusic(track);
    });
  });

  return songs;
}

const playMusic = (track, pause = false) => {
  const encodedFolder = currFolder
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
  currentSong.src = `/${encodedFolder}/` + encodeURIComponent(track);
  if (!pause) {
    currentSong.play();
    play.src = "images/pause.svg";
  }
  const decoded = decodeURIComponent(track);
  const displayTitle = decoded.endsWith(".mp3")
    ? decoded.slice(0, -4)
    : decoded;
  document.querySelector(".songinfo").innerHTML = displayTitle;
  document.querySelector(".songtime").innerHTML = "00:00 / 00:00";
};

async function displayAlbums() {
  console.log("displaying albums");
  let res = await fetch(`/songs/index.json`);
  let indexData = await res.json();
  let cardContainer = document.querySelector(".cardContainer");
  cardContainer.innerHTML = "";
  for (const album of indexData.albums) {
    const folder = album.folder;
    const encodedFolder = folder
      .split("/")
      .map((seg) => encodeURIComponent(seg))
      .join("/");
    let metaRes = await fetch(`/songs/${encodedFolder}/info.json`);
    let meta = await metaRes.json();
    const title = meta.title || album.title || folder;
    const description = meta.description || album.description || "";
    cardContainer.innerHTML += `
      <div data-folder="${folder}" class="card">
        <div class="play">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 20V4L19 12L5 20Z" stroke="#141B34" fill="#000" stroke-width="1.5" stroke-linejoin="round" />
          </svg>
        </div>
        <img src="/songs/${encodedFolder}/cover.png" alt="${title}">
        <h2>${title}</h2>
        <p>${description}</p>
      </div>`;
  }

  // Load the playlist whenever card is clicked
  Array.from(document.getElementsByClassName("card")).forEach((e) => {
    e.addEventListener("click", async (item) => {
      console.log("Fetching Songs");
      songs = await getSongs(`songs/${item.currentTarget.dataset.folder}`);
      if (songs && songs.length > 0) {
        playMusic(songs[0]);
      } else {
        console.warn("No songs found in selected album.");
      }
    });
  });
}

async function populateLibraryAll() {
  try {
    const res = await fetch(`/songs/index.json`);
    const indexData = await res.json();
    const songUL = document
      .querySelector(".songList")
      .getElementsByTagName("ul")[0];
    songUL.innerHTML = "";
    const items = [];
    for (const album of indexData.albums) {
      const folder = `songs/${album.folder}`;
      const encodedFolder = folder
        .split("/")
        .map((seg) => encodeURIComponent(seg))
        .join("/");
      try {
        const trRes = await fetch(`/${encodedFolder}/tracks.json`);
        if (trRes.ok) {
          const manifest = await trRes.json();
          let tracks = [];
          if (Array.isArray(manifest.tracks)) {
            tracks = manifest.tracks;
          } else if (
            manifest &&
            typeof manifest.tracks === "object" &&
            manifest.tracks !== null
          ) {
            const vals = Object.values(manifest.tracks).filter(
              (v) => typeof v === "string"
            );
            const keys = Object.keys(manifest.tracks);
            tracks = vals.length ? vals : keys;
          }
          for (const song of tracks) {
            if (
              typeof song === "string" &&
              song.toLowerCase().endsWith(".mp3")
            ) {
              const decoded = decodeURIComponent(song);
              const displayTitle = decoded.endsWith(".mp3")
                ? decoded.slice(0, -4)
                : decoded;
              items.push({ folder, track: song, title: displayTitle });
            }
          }
        }
      } catch (e) {
        console.warn("Failed reading tracks for", folder, e);
      }
    }

    for (const it of items) {
      songUL.innerHTML += `
        <li data-track="${it.track}" data-folder="${it.folder}">
          <img class="invert" width="34" src="images/music.svg" alt="">
          <div class="info">
            <div>${it.title}</div>
            <div>Harry</div>
          </div>
          <div class="playnow">
            <span>Play Now</span>
            <img class="invert" src="images/play.svg" alt="">
          </div>
        </li>`;
    }

    Array.from(
      document.querySelector(".songList").getElementsByTagName("li")
    ).forEach((e) => {
      e.addEventListener("click", async () => {
        const folder = e.getAttribute("data-folder");
        const track = e.getAttribute("data-track");
        if (folder && track) {
          await getSongs(folder);
          playMusic(track);
        }
      });
    });
  } catch (err) {
    console.warn("Failed to populate library with all songs", err);
  }
}

async function main() {
  // Get the list of all the songs
  await getSongs("songs/ncs");
  if (songs && songs.length > 0) {
    playMusic(songs[0], true);
  } else {
    console.warn("No songs found in default folder 'songs/ncs'.");
  }

  // Display all the albums on the page
  await displayAlbums();

  // Populate Library with all songs across albums
  await populateLibraryAll();

  // Attach an event listener to play, next and previous
  play.addEventListener("click", () => {
    if (currentSong.paused) {
      currentSong.play();
      play.src = "images/pause.svg";
    } else {
      currentSong.pause();
      play.src = "images/play.svg";
    }
  });

  // Listen for timeupdate event
  currentSong.addEventListener("timeupdate", () => {
    document.querySelector(".songtime").innerHTML = `${secondsToMinutesSeconds(
      currentSong.currentTime
    )} / ${secondsToMinutesSeconds(currentSong.duration)}`;
    document.querySelector(".circle").style.left =
      (currentSong.currentTime / currentSong.duration) * 100 + "%";
  });

  // Add an event listener to seekbar
  document.querySelector(".seekbar").addEventListener("click", (e) => {
    let percent = (e.offsetX / e.target.getBoundingClientRect().width) * 100;
    document.querySelector(".circle").style.left = percent + "%";
    currentSong.currentTime = (currentSong.duration * percent) / 100;
  });

  // Add an event listener for hamburger
  document.querySelector(".hamburger").addEventListener("click", () => {
    document.querySelector(".left").style.left = "0";
  });

  // Add an event listener for close button
  const closeBtn = document.querySelector(".close");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      document.querySelector(".left").style.left = "-120%";
    });
  }

  // Add an event listener to previous
  previous.addEventListener("click", () => {
    if (!Array.isArray(songs) || songs.length === 0) return;
    currentSong.pause();
    console.log("Previous clicked");
    const currentName = decodeURIComponent(
      currentSong.src.split("/").slice(-1)[0]
    );
    let index = songs.indexOf(currentName);
    if (index === -1) {
      index = 0;
    }
    const prevIndex = (index - 1 + songs.length) % songs.length; // wrap around
    playMusic(songs[prevIndex]);
  });

  // Add an event listener to next
  next.addEventListener("click", () => {
    if (!Array.isArray(songs) || songs.length === 0) return;
    currentSong.pause();
    console.log("Next clicked");
    const currentName = decodeURIComponent(
      currentSong.src.split("/").slice(-1)[0]
    );
    let index = songs.indexOf(currentName);
    if (index === -1) {
      index = -1;
    }
    const nextIndex = (index + 1 + songs.length) % songs.length; // wrap around
    playMusic(songs[nextIndex]);
  });

  // Add an event to volume
  document
    .querySelector(".range")
    .getElementsByTagName("input")[0]
    .addEventListener("change", (e) => {
      console.log("Setting volume to", e.target.value, "/ 100");
      currentSong.volume = parseInt(e.target.value) / 100;
      if (currentSong.volume > 0) {
        document.querySelector(".volume>img").src = document
          .querySelector(".volume>img")
          .src.replace("mute.svg", "volume.svg");
      }
    });

  // Add event listener to mute the track
  document.querySelector(".volume>img").addEventListener("click", (e) => {
    if (e.target.src.includes("volume.svg")) {
      e.target.src = e.target.src.replace("volume.svg", "mute.svg");
      currentSong.volume = 0;
      document
        .querySelector(".range")
        .getElementsByTagName("input")[0].value = 0;
    } else {
      e.target.src = e.target.src.replace("mute.svg", "volume.svg");
      currentSong.volume = 0.1;
      document
        .querySelector(".range")
        .getElementsByTagName("input")[0].value = 10;
    }
  });
}
main();
