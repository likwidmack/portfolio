<template lang="pug">
.page-content.about
  header(data-region="hero")
    p.eyebrow-container {{ aboutContent.hero.eyebrow }}
    h1.display {{ aboutContent.hero.title }}
    p.lead {{ aboutContent.hero.lede }}
    .button-row(aria-label="Primary actions")
      UiButton(
        as="a",
        :href="primaryResume.href",
        download,
        icon="pi pi-download",
        :label="aboutContent.hero.primaryActionLabel"
      )
      UiButton(
        as="a",
        :href="aboutContent.hero.secondaryActionHref",
        icon="pi pi-send",
        variant="outlined",
        severity="secondary",
        :label="aboutContent.hero.secondaryActionLabel"
      )
      UiButton(
        as="a",
        href="/other/data/Tamara-Mack-UI-AI-Portfolio-2026.pdf",
        download,
        icon="pi pi-file-pdf",
        variant="outlined",
        severity="secondary",
        label="Download portfolio PDF",
        @click="trackDeckDownload"
      )

  .page-with-nav
    AppPageNav(:items="_navItems")

    div(data-region="body")
      section#summary(aria-labelledby="about-summary-heading")
        h2#about-summary-heading.title {{ aboutContent.intro.heading }}
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
              UiButton(
                as="a",
                :href="resume.href",
                download,
                icon="pi pi-file-pdf",
                label="Download PDF",
                size="small",
                @click="trackResumeDownload(resume.key)"
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
  general: '/other/data/Tamara G Mack_Resume_2026.pdf',
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
    primaryActionLabel: string;
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
  href: resumeFiles.general ?? '/other/data/Tamara G Mack_Resume_2026.pdf',
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
.about {
  display: grid;
  gap: var(--section-gap, 2rem);

  section {
    width: 100%;
  }

  .display {
    animation: neonPulse 2s ease-in-out infinite;
  }

  [data-region='hero'] {
    position: relative;
    display: grid;
    gap: 0.75rem;
    padding-bottom: 0.5rem;

    &::after {
      position: absolute;
      right: 0;
      bottom: 0;
      color: color-mix(in srgb, var(--primary-color) 28%, transparent);
      content: '</>';
      font-size: clamp(2rem, 8vw, 5rem);
      line-height: 1;
      pointer-events: none;
    }

    .button-row {
      margin-bottom: 0;
    }

    :deep(a.p-button),
    :deep(a.btn) {
      text-decoration: none;
    }
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
    box-shadow: 0 0 0 0.3rem color-mix(in srgb, var(--primary-color) 16%, transparent);
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
