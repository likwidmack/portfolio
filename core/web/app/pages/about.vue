<template lang="pug">
.page-content.about.about-cv(data-fit="prose")
  .page-with-nav.about-cv__layout
    aside.about-cv__sidebar
      p.eyebrow-container {{ aboutContent.hero.eyebrow }}
      p.about-cv__name {{ aboutContent.hero.name }}
      p.about-cv__role {{ aboutContent.hero.role }}
      AppPageNav(:items="_navItems", label="On this page")
      .about-cv__actions(aria-label="Primary actions")
        a.about-cv__resume(:href="primaryResume.href", download, @click="trackResumeDownload(primaryResume.key)")
          span.pi.pi-download(aria-hidden="true")
          span {{ aboutContent.hero.primaryActionLabel }}
        a.about-cv__contact(:href="aboutContent.hero.secondaryActionHref", @click="trackContact") {{ aboutContent.hero.secondaryActionLabel }}

    div(data-region="body")
      header#summary.about-cv__intro(aria-labelledby="about-summary-heading")
        h1#about-summary-heading.display {{ aboutContent.hero.title }}
        p.lead {{ aboutContent.hero.lede }}
        h2.title {{ aboutContent.intro.heading }}
        .auto-grid(data-region="intro")
          p(v-for="paragraph in aboutContent.intro.paragraphs", :key="paragraph") {{ paragraph }}

        .auto-grid(data-layout="surface", aria-label="Career snapshot")
          .panel(v-for="stat in aboutContent.stats", :key="stat.value", data-variant="stat")
            strong {{ stat.value }}
            span {{ stat.label }}

      section#build(aria-labelledby="about-build-heading")
        h2#about-build-heading.title {{ aboutContent.capabilitiesHeading }}
        .auto-grid
          .panel(v-for="capability in aboutContent.capabilities", :key="capability.title", data-variant="capability")
            p(data-type="kicker") {{ capability.kicker }}
            p(data-type="panel-title") {{ capability.title }}
            p {{ capability.body }}

      section#experience(aria-labelledby="about-experience-heading")
        h2#about-experience-heading.title {{ aboutContent.experienceHeading }}
        p.lead {{ aboutContent.experienceIntro }}
        UiTimeline(:value="aboutContent.experience", align="alternate")
          template(#opposite="{ item }")
            span(data-type="kicker") {{ item.period }}
          template(#marker)
            span(data-marker, aria-hidden="true")
          template(#content="{ item }")
            .panel(data-variant="timeline")
              p(data-type="panel-title") {{ item.company }}
              p(data-type="kicker") {{ item.role }}
              ul(data-list="highlights")
                li(v-for="highlight in item.highlights", :key="highlight") {{ highlight }}

      section#skills(aria-labelledby="about-skills-heading")
        h2#about-skills-heading.title {{ aboutContent.skillsHeading }}
        .auto-grid
          .panel(v-for="group in aboutContent.skillGroups", :key="group.title")
            p(data-type="panel-title") {{ group.title }}
            ul(data-list="tags")
              li(v-for="skill in group.skills", :key="skill")
                UiTag(:value="skill", severity="secondary")

      section#education(aria-labelledby="about-education-heading")
        h2#about-education-heading.title {{ aboutContent.educationHeading }}
        .layout(data-algo="complex")
          .grid-x.grid-margin-x
            .cell.small-12.medium-6
              .panel
                ul(data-list="education")
                  li(v-for="item in aboutContent.education", :key="item.school")
                    strong {{ item.credential }}
                    span {{ item.school }} — {{ item.year }}
            .cell.small-12.medium-6
              .panel
                p(data-type="panel-title") {{ aboutContent.workStyle.heading }}
                p.lead(data-flush) {{ aboutContent.workStyle.body }}

      section#resumes(aria-labelledby="about-resumes-heading")
        h2#about-resumes-heading.title {{ aboutContent.resumeDownloads.heading }}
        p.lead {{ aboutContent.resumeDownloads.intro }}
        .auto-grid(v-if="resumes.length")
          .panel(v-for="resume in resumes", :key="resume.href", data-variant="resume")
            p(data-type="panel-title") {{ resume.title }}
            p(data-type="kicker") {{ resume.meta }}
            .button-row
              a.about-cv__resume.about-cv__resume--inline(
                :href="resume.href",
                download,
                @click="trackResumeDownload(resume.key)"
              )
                span.pi.pi-file-pdf(aria-hidden="true")
                span Download PDF
        .button-row.about-cv__deck
          UiButton(
            as="a",
            href="/d/Tamara-Mack-UI-AI-Portfolio-2026.pdf",
            download,
            icon="pi pi-file-pdf",
            variant="outlined",
            severity="secondary",
            label="Download portfolio PDF",
            @click="trackDeckDownload"
          )
</template>

<script setup lang="ts">
type ResumeKey =
  | 'general'
  | 'seniorFullStack'
  | 'architectTechnicalLead'
  | 'frontendRemote2026'
  | 'frontendRemote2025'
  | 'uiEngineer'
  | 'creativeTechnologist'
  | 'remoteSoftwareDeveloper'
  | 'associateTechnicalArchitect'
  | 'seniorFullStackContract';

const resumeFiles: Partial<Record<ResumeKey, string>> = {
  general: '/d/Resume2026.pdf',
} as const;

type ResumeData = {
  key: ResumeKey;
  meta: string;
  title: string;
};

type ResumeLink = ResumeData & {
  href: string;
};

type AboutContent = {
  capabilities: Array<{
    body: string;
    kicker: string;
    title: string;
  }>;
  capabilitiesHeading: string;
  education: Array<{
    credential: string;
    school: string;
    year: string;
  }>;
  educationHeading: string;
  experience: Array<{
    company: string;
    highlights: string[];
    period: string;
    role: string;
  }>;
  experienceHeading: string;
  experienceIntro: string;
  hero: {
    eyebrow: string;
    lede: string;
    name: string;
    primaryActionLabel: string;
    role: string;
    secondaryActionHref: string;
    secondaryActionLabel: string;
    title: string;
  };
  intro: {
    heading: string;
    paragraphs: string[];
  };
  primaryResumeKey: ResumeKey;
  resumeDownloads: {
    heading: string;
    intro: string;
  };
  resumes: ResumeData[];
  skillGroups: Array<{
    skills: string[];
    title: string;
  }>;
  skillsHeading: string;
  stats: Array<{
    label: string;
    value: string;
  }>;
  workStyle: {
    body: string;
    heading: string;
  };
};

definePageMeta({
  breadcrumb: 'About',
});

const pageTitle = 'About Tamara Mack — Creative Technologist';
const pageDescription =
  'About Tamara Mack, a creative technologist and principal / distinguished software engineer and software architect building human-centered interfaces, systems, and creative technology.';
const { track } = usePortfolioAnalytics();
const trackDeckDownload = () => track('deck_download', { placement: 'about' });
const trackResumeDownload = (resumeKey: ResumeKey) => track('resume_download', { resume: resumeKey });
const trackContact = () => track('contact_click', { placement: 'about-sidebar' });

const { data: resumeContent } = await useContentAsyncData('resume-content', () =>
  fetchContentCollection<AboutContent>('resume', { mode: 'first' })
);

if (!resumeContent.value) {
  throw createError({
    statusCode: 500,
    statusMessage: 'Resume content not found',
  });
}

const aboutContent = computed(() => resumeContent.value as AboutContent);

const resumes = computed<ResumeLink[]>(() =>
  aboutContent.value.resumes.flatMap((resume) => {
    const href = resumeFiles[resume.key];
    return href ? [{ ...resume, href }] : [];
  })
);

const fallbackResume: ResumeLink = {
  key: 'general',
  title: 'General Resume',
  meta: '2026 PDF',
  href: resumeFiles.general ?? '/d/Resume2026.pdf',
};

const primaryResume = computed(
  () =>
    resumes.value.find((resume) => resume.key === aboutContent.value.primaryResumeKey) ??
    resumes.value[0] ??
    fallbackResume
);

const _navItems = computed(() => [
  { id: 'summary', label: aboutContent.value.intro.heading },
  { id: 'build', label: aboutContent.value.capabilitiesHeading },
  { id: 'experience', label: aboutContent.value.experienceHeading },
  { id: 'skills', label: aboutContent.value.skillsHeading },
  { id: 'education', label: aboutContent.value.educationHeading },
  { id: 'resumes', label: aboutContent.value.resumeDownloads.heading },
]);

usePortfolioSeo({ title: pageTitle, description: pageDescription, path: '/about' });
</script>

<style lang="scss" scoped>
.about-cv {
  display: grid;
  gap: var(--section-gap, 2rem);

  section,
  .about-cv__intro {
    width: 100%;
  }

  &__layout {
    align-items: start;
  }

  &__sidebar {
    display: grid;
    gap: 0.85rem;
    padding: 1rem 1.1rem;
    border: 1px solid var(--border-color, var(--portfolio-rule));
    border-radius: var(--border-radius-md, 0.5rem);
    background: var(--surface-color, var(--main-background-secondary));
    min-width: 0;

    @media (min-width: $breakpoint-tablet) {
      position: sticky;
      top: calc(var(--page-chrome, 6.5rem) + 0.75rem);
      z-index: 1;
    }

    :deep(.page-nav) {
      position: static;
      margin: 0;
      padding: 0;
      background: transparent;
    }

    :deep(.page-nav [data-label]) {
      color: var(--text-secondary-color, inherit);
    }
  }

  &__name {
    margin: 0;
    font-size: clamp(1.35rem, 2.5vw, 1.75rem);
    font-weight: 700;
    line-height: 1.15;
  }

  &__role {
    margin: 0;
    color: var(--text-secondary-color, inherit);
    font-size: var(--font-size-sm);
    line-height: 1.4;
  }

  &__actions {
    display: grid;
    gap: 0.55rem;
    margin-top: 0.35rem;
  }

  &__resume {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.45rem;
    min-height: 2.75rem;
    padding: 0.55rem 0.9rem;
    border: 1px solid var(--portfolio-teal);
    border-radius: var(--border-radius-md, 0.5rem);
    background: var(--portfolio-teal);
    color: var(--button-fg, #f2ece8);
    font-size: var(--font-size-sm);
    font-weight: 700;
    letter-spacing: 0.08em;
    text-decoration: none;
    text-transform: uppercase;

    &:hover,
    &:focus-visible {
      filter: brightness(1.08);
      outline: none;
      text-decoration: none;
    }

    &:focus-visible {
      box-shadow: 0 0 0 0.2rem color-mix(in srgb, var(--portfolio-teal) 35%, transparent);
    }

    &--inline {
      justify-self: start;
      min-height: 2.25rem;
      padding-block: 0.4rem;
      font-size: var(--font-size-xs);
    }
  }

  &__contact {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 2.75rem;
    padding: 0.55rem 0.9rem;
    border: 1px solid var(--border-color, currentColor);
    border-radius: var(--border-radius-md, 0.5rem);
    color: var(--text-color);
    font-size: var(--font-size-sm);
    font-weight: 600;
    letter-spacing: 0.06em;
    text-decoration: none;
    text-transform: uppercase;

    &:hover,
    &:focus-visible {
      border-color: var(--primary-color);
      color: var(--primary-color);
      outline: none;
    }
  }

  &__intro {
    display: grid;
    gap: 0.75rem;
    min-width: 0;
  }

  &__deck {
    margin-top: 0.5rem;
  }

  .display {
    margin: 0;
    font-size: clamp(1.75rem, 4vw, 2.75rem);
    line-height: 1.15;
  }

  [data-region='body'] {
    display: grid;
    gap: var(--section-gap, 2rem);
    min-width: 0;
  }

  [data-region='intro'] p,
  [data-flush],
  [data-type='panel-title'],
  [data-type='kicker'] {
    margin: 0;
  }

  [data-type='panel-title'] {
    font-size: var(--font-size-xl);
    font-weight: 600;
    line-height: 1.25;
  }

  .panel[data-variant='stat'] {
    display: grid;
    gap: 0.25rem;

    strong {
      color: var(--primary-color);
      font-size: var(--font-size-4xl);
      line-height: 1;
    }
  }

  .panel[data-variant='capability'] {
    display: grid;
    gap: 0.45rem;

    &::before {
      display: block;
      width: 2.5rem;
      height: 0.2rem;
      border-radius: var(--border-radius-pill);
      background: var(--button-primary-bg, var(--primary-color));
      content: '';
    }
  }

  [data-type='kicker'] {
    color: var(--text-secondary-color, var(--text-color));
    font-size: var(--font-size-sm);
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  [data-marker] {
    display: block;
    width: 0.75rem;
    height: 0.75rem;
    border: 2px solid var(--primary-color);
    border-radius: 50%;
    background: var(--surface-color);
  }

  .panel[data-variant='timeline'],
  .panel[data-variant='resume'] {
    display: grid;
    gap: 0.45rem;
  }

  .panel[data-variant='resume'] .button-row {
    margin-bottom: 0;
  }

  [data-list='highlights'],
  [data-list='education'],
  [data-list='tags'] {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  [data-list='highlights'],
  [data-list='education'] {
    display: grid;
    gap: 0.45rem;
  }

  [data-list='education'] li {
    display: grid;
    gap: 0.15rem;
  }

  [data-list='tags'] {
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
  }

  :deep(.panel) {
    margin: 0;
    padding: 1rem 1.1rem;
    box-shadow: none;
  }

  @media (max-width: $breakpoint-tablet) {
    :deep(.p-timeline-alternate .p-timeline-event) {
      flex-direction: row !important;
    }

    :deep(.p-timeline-event-opposite) {
      flex: 0 0 5.5rem;
      min-width: 0;
      padding-inline: 0 0.75rem;
      text-align: left !important;
    }

    :deep(.p-timeline-event-content) {
      min-width: 0;
      padding-inline: 0.75rem 0;
    }
  }
}
</style>
