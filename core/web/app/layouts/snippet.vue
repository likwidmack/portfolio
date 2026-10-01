<template lang="pug">
NuxtLayout(name="site", layout-class="layout-snippet", layout-key="site")
  template(#header)
    slot(name="header")
  slot
  template(#footer)
    slot(name="footer")
</template>

<!-- Modifier only: `.layout-snippet` on the shared `site` shell (styles in site.scss). -->
