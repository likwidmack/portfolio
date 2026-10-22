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
