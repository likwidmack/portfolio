<template lang="pug">
NuxtLayout(name="site", layout-class="layout-default", layout-key="site")
  template(#header)
    slot(name="header")
  slot
  template(#footer)
    slot(name="footer")
</template>

<style lang="scss">
:root {
  --main-top-padding: 5rem;
  --main-bottom-padding: 5rem;
}
</style>
