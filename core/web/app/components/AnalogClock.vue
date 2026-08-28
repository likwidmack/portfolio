<template lang="pug">
.analog-clock(role="img", :aria-label="ariaLabel")
  .clock-face.loader
    .hand(data-unit="second") I
    .hand(data-unit="minute") I
    .hand(data-unit="hour") I
    .center .
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    ariaLabel?: string;
  }>(),
  {
    ariaLabel: 'Animated analog clock',
  }
);
</script>

<style scoped lang="scss">
.loader,
.center,
.hand {
  text-align: center;
  width: 100px;
  height: 100px;
}

.loader {
  color: #555;
  font-size: 3em;
  border-radius: 50%;
  border: 5px solid #555;
  position: relative;
}

.center {
  position: absolute;
  margin-top: 6px;
  color: black;
}

.hand {
  position: absolute;

  &[data-unit='second'] {
    color: red !important;
    animation: rotateit 60s linear infinite;
  }

  &[data-unit='minute'] {
    color: black !important;
    animation: rotateit 3600s linear infinite;
  }

  &[data-unit='hour'] {
    animation: rotateit 86400s linear infinite;
  }
}

@keyframes rotateit {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
