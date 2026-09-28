<template lang="pug">
.page-content.about.about-cv(data-fit="prose")
  .page-with-nav.about-cv__layout
    aside.about-cv__sidebar
      figure.about-cv__portrait
        img(
          :src="profile.portrait.src",
          :alt="`Portrait of ${profile.names.formal}`",
          :width="profile.portrait.width",
          :height="profile.portrait.height",
          loading="lazy"
        )
      p.eyebrow-container {{ aboutContent.hero.eyebrow }}
      p.about-cv__name {{ aboutContent.hero.name }}
      p.about-cv__role {{ aboutContent.hero.role }}
      dl.about-cv__contact
        div
          dt Mail
          dd
            a(:href="contactMailto") {{ profile.contact.email }}
        div
          dt GitHub
          dd
            a(:href="profile.contact.github.url", rel="noopener noreferrer", target="_blank") {{ profile.contact.github.handle }}
      AppPageNav(:items="_navItems", label="On this page", embedded)
      .about-cv__actions(aria-label="Primary actions")
        a.about-cv__resume(:href="primaryResume.href", download, @click="trackResumeDownload(primaryResume.key)")
          UiIcon(name="download")
          span {{ aboutContent.hero.primaryActionLabel }}
        a.about-cv__contact(:href="contactMailto", @click="trackContact") {{ aboutContent.hero.secondaryActionLabel }}

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
                UiIcon(name="file-text")
                span Download PDF
        .button-row.about-cv__deck
          UiButton(
            as="a",
            :href="profile.downloads.portfolioDeck",
            download,
            icon="file-text",
            variant="outlined",
            severity="secondary",
            label="Download portfolio PDF",
            @click="trackDeckDownload"
          )
</template>

<script setup lang="ts">
import { mailtoHref } from '#shared/site-person';

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
    secondaryActionHref?: string;
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

const { profile } = useSiteProfile();
const contactMailto = computed(() => mailtoHref(profile.value.contact.email));

const pageTitle = `About ${profile.value.names.casual} — ${profile.value.role.creativeTechnologist}`;
const pageDescription = `About ${profile.value.names.casual}, a creative technologist and principal / distinguished software engineer and software architect building human-centered interfaces, systems, and creative technology.`;
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

const resumeFiles = computed<Partial<Record<ResumeKey, string>>>(() => ({
  general: profile.value.downloads.generalResume,
}));

const resumes = computed<ResumeLink[]>(() =>
  aboutContent.value.resumes.flatMap((resume) => {
    const href = resumeFiles.value[resume.key];
    return href ? [{ ...resume, href }] : [];
  })
);

const fallbackResume = computed<ResumeLink>(() => ({
  key: 'general',
  title: 'General Resume',
  meta: '2026 PDF',
  href: resumeFiles.value.general ?? profile.value.downloads.generalResume,
}));

const primaryResume = computed(
  () =>
    resumes.value.find((resume) => resume.key === aboutContent.value.primaryResumeKey) ??
    resumes.value[0] ??
    fallbackResume.value
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

<style lang="scss" src="./about.scss" scoped></style>
