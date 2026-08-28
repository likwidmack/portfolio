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

<template lang="pug">
.page-content.media-player-demo(data-fit="screen")
  header(data-region="hero")
    h1 Media player
    p Thin validation page for&nbsp;
      code @tgmc/media-player
      | . Sample URLs are public CDNs.
  ClientOnly
    .media-player-demo__stage
      video.media-player-demo__video(ref="videoRef", controls, playsinline)
      .media-player-demo__controls
        button(type="button", @click="play") Play
        button(type="button", @click="pause") Pause
      p
        | Mode:&nbsp;
        strong {{ mode }}
      ul
        li(v-for="(line, i) in log", :key="i") {{ line }}
</template>

<style scoped lang="scss">
.media-player-demo__stage {
  display: grid;
  gap: 1rem;
  width: 100%;
  min-height: max(18rem, calc(var(--page-fill-min, 100dvh) * 0.55));
}

.media-player-demo__video {
  display: block;
  width: 100%;
  max-width: none;
  min-height: min(70dvh, 40rem);
  background: #000;
  aspect-ratio: 16 / 9;
  object-fit: contain;
}

.media-player-demo__controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
</style>
