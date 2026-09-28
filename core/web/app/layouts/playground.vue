<template lang="pug">
NuxtLayout(name="site", layout-class="layout-playground", layout-key="site")
  template(#header)
    slot(name="header")
  slot
  template(#footer)
    slot(name="footer")
</template>

<!-- Modifier only: `.layout-playground` on the shared `site` shell (styles in site.scss). -->
