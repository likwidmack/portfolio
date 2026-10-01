<template lang="pug">
NuxtLayout(name="site", layout-class="layout-default", layout-key="site")
  template(#header)
    slot(name="header")
  slot
  template(#footer)
    slot(name="footer")
</template>

<!-- Modifier only: `.layout-default` on the shared `site` shell (styles in site.scss). -->
