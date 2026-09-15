<template lang="pug">
NuxtLayout(name="site", layout-class="layout-snippet", layout-key="site")
  template(#header)
    slot(name="header")
  slot
  template(#footer)
    slot(name="footer")
</template>

<style lang="scss" src="./snippet.scss"></style>
