/**
 * PassThrough map that restores classic `p-*` class names for unstyled PrimeVue.
 * Lets `@tgmc/theme` `@layer primevue` Sass theme style components without Nora CSS.
 */
import AccordionStyle from 'primevue/accordion/style';
import AccordionContentStyle from 'primevue/accordioncontent/style';
import AccordionHeaderStyle from 'primevue/accordionheader/style';
import AccordionPanelStyle from 'primevue/accordionpanel/style';
import AvatarStyle from 'primevue/avatar/style';
import BadgeStyle from 'primevue/badge/style';
import ButtonStyle from 'primevue/button/style';
import CardStyle from 'primevue/card/style';
import CheckboxStyle from 'primevue/checkbox/style';
import ChipStyle from 'primevue/chip/style';
import DatePickerStyle from 'primevue/datepicker/style';
import DialogStyle from 'primevue/dialog/style';
import DividerStyle from 'primevue/divider/style';
import FloatLabelStyle from 'primevue/floatlabel/style';
import InputNumberStyle from 'primevue/inputnumber/style';
import InputTextStyle from 'primevue/inputtext/style';
import MessageStyle from 'primevue/message/style';
import PanelStyle from 'primevue/panel/style';
import PasswordStyle from 'primevue/password/style';
import ProgressBarStyle from 'primevue/progressbar/style';
import ProgressSpinnerStyle from 'primevue/progressspinner/style';
import RadioButtonStyle from 'primevue/radiobutton/style';
import SelectStyle from 'primevue/select/style';
import SkeletonStyle from 'primevue/skeleton/style';
import TabStyle from 'primevue/tab/style';
import TabListStyle from 'primevue/tablist/style';
import TabPanelStyle from 'primevue/tabpanel/style';
import TabPanelsStyle from 'primevue/tabpanels/style';
import TabsStyle from 'primevue/tabs/style';
import TagStyle from 'primevue/tag/style';
import TextareaStyle from 'primevue/textarea/style';
import TimelineStyle from 'primevue/timeline/style';
import ToggleSwitchStyle from 'primevue/toggleswitch/style';

type StyleModule = {
  classes?: Record<string, string | ((bindings: Record<string, unknown>) => unknown)>;
};

type PtSection = Record<string, unknown>;

function toPtSection(style: StyleModule): PtSection {
  const section: PtSection = {};
  const classes = style.classes ?? {};

  for (const [part, value] of Object.entries(classes)) {
    if (typeof value === 'function') {
      section[part] = (bindings: Record<string, unknown>) => ({
        class: value(bindings),
      });
    } else {
      section[part] = { class: value };
    }
  }

  return section;
}

/** Global `pt` for `@primevue/nuxt-module` when `unstyled: true`. */
export const classicPrimeVuePt: Record<string, PtSection> = {
  accordion: toPtSection(AccordionStyle as StyleModule),
  accordioncontent: toPtSection(AccordionContentStyle as StyleModule),
  accordionheader: toPtSection(AccordionHeaderStyle as StyleModule),
  accordionpanel: toPtSection(AccordionPanelStyle as StyleModule),
  avatar: toPtSection(AvatarStyle as StyleModule),
  badge: toPtSection(BadgeStyle as StyleModule),
  button: toPtSection(ButtonStyle as StyleModule),
  card: toPtSection(CardStyle as StyleModule),
  checkbox: toPtSection(CheckboxStyle as StyleModule),
  chip: toPtSection(ChipStyle as StyleModule),
  datepicker: toPtSection(DatePickerStyle as StyleModule),
  dialog: toPtSection(DialogStyle as StyleModule),
  divider: toPtSection(DividerStyle as StyleModule),
  floatlabel: toPtSection(FloatLabelStyle as StyleModule),
  inputnumber: toPtSection(InputNumberStyle as StyleModule),
  inputtext: toPtSection(InputTextStyle as StyleModule),
  message: toPtSection(MessageStyle as StyleModule),
  panel: toPtSection(PanelStyle as StyleModule),
  password: toPtSection(PasswordStyle as StyleModule),
  progressbar: toPtSection(ProgressBarStyle as StyleModule),
  progressspinner: toPtSection(ProgressSpinnerStyle as StyleModule),
  radiobutton: toPtSection(RadioButtonStyle as StyleModule),
  select: toPtSection(SelectStyle as StyleModule),
  skeleton: toPtSection(SkeletonStyle as StyleModule),
  tab: toPtSection(TabStyle as StyleModule),
  tablist: toPtSection(TabListStyle as StyleModule),
  tabpanel: toPtSection(TabPanelStyle as StyleModule),
  tabpanels: toPtSection(TabPanelsStyle as StyleModule),
  tabs: toPtSection(TabsStyle as StyleModule),
  tag: toPtSection(TagStyle as StyleModule),
  textarea: toPtSection(TextareaStyle as StyleModule),
  timeline: toPtSection(TimelineStyle as StyleModule),
  toggleswitch: toPtSection(ToggleSwitchStyle as StyleModule),
};
