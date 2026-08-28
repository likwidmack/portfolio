<script setup lang="ts">
import { TgmcPlayer, type PlaybackMode } from '@tgmc/media-player';
import { onBeforeUnmount, onMounted, ref } from 'vue';

definePageMeta({
  title: 'Media Player',
  layout: 'default',
});

const videoRef = ref<HTMLVideoElement | null>(null);
const playerRef = ref<TgmcPlayer | null>(null);
const mode = ref<PlaybackMode>('progressive');
const log = ref<string[]>([]);

const progressiveUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
const hlsUrl = 'https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8';

const playlist = {
  continuousPlay: true,
  items: [
    { url: progressiveUrl, kind: 'progressive' as const, title: 'Big Buck Bunny' },
    { url: hlsUrl, kind: 'hls-vod' as const, title: 'Apple HLS sample' },
  ],
};

function pushLog(message: string) {
  log.value = [`${new Date().toLocaleTimeString()} — ${message}`, ...log.value].slice(0, 8);
}

onMounted(() => {
  if (!videoRef.value) {
    return;
  }
  const player = new TgmcPlayer(videoRef.value, { autoplay: false });
  playerRef.value = player;
  player.on('playbackmodechange', ({ mode: next }) => {
    mode.value = next;
    pushLog(`playback mode: ${next}`);
  });
  player.on('assetchange', ({ asset }) => pushLog(`asset: ${asset.title ?? asset.url}`));
  player.on('error', ({ error }) => pushLog(`error: ${error.message}`));
  void player.loadPlaylist(playlist);
});

onBeforeUnmount(() => {
  playerRef.value?.destroy();
  playerRef.value = null;
});

function play() {
  void playerRef.value?.play();
}

function pause() {
  playerRef.value?.pause();
}
</script>

<template>
  <main class="media-player-demo">
    <h1>Media player (package demo)</h1>
    <p>Thin validation page for <code>@tgmc/media-player</code>. Sample URLs are public CDNs.</p>
    <ClientOnly>
      <video ref="videoRef" class="media-player-demo__video" controls playsinline />
      <div class="media-player-demo__controls">
        <button type="button" @click="play">Play</button>
        <button type="button" @click="pause">Pause</button>
      </div>
      <p>
        Mode: <strong>{{ mode }}</strong>
      </p>
      <ul>
        <li v-for="(line, i) in log" :key="i">{{ line }}</li>
      </ul>
    </ClientOnly>
  </main>
</template>

<style scoped>
.media-player-demo__video {
  width: 100%;
  max-width: 720px;
  background: #000;
}
.media-player-demo__controls {
  display: flex;
  gap: 0.5rem;
  margin: 0.75rem 0;
}
</style>
