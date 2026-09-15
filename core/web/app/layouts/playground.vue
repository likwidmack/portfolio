<template lang="pug">
NuxtLayout(name="site", layout-class="layout-playground", layout-key="site")
  template(#header)
    slot(name="header")
  slot
  template(#footer)
    slot(name="footer")
</template>

<style lang="scss" src="./playground.scss"></style>
