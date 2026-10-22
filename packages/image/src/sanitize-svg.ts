/**
 * SVG sanitizer (svgo, metadata and safety plugins only; the drawing is left as authored): removes
 * comments, `<metadata>`, editor namespaces (inkscape, sodipodi, Illustrator, Sketch, Figma, ...), any
 * other prefixed element or attribute, `data-figma*` / `data-name`, and ids nothing references. Also
 * removes `<script>`, every `on*` attribute, `<foreignObject>`, elements in a non-SVG namespace,
 * href animations, `xml:base` and every `href` / `xlink:href` that is not a `#fragment` or a raster
 * (png / jpeg / gif / webp / avif) `data:` URL (no external loads, no nested SVG documents). Keeps
 * `viewBox`, accessibility `<title>` / `<desc>` and the ids `aria-labelledby` and `url(#...)` use.
 */
import { optimize, type Config } from 'svgo';

type SvgNode = {
  type: string;
  name?: string;
  attributes?: Record<string, string>;
  children?: SvgNode[];
};

type SvgPlugins = NonNullable<Config['plugins']>;

const KEPT_PREFIXES = new Set(['xlink', 'xml']);
const ID_LIST_ATTRIBUTES = new Set([
  'aria-labelledby',
  'aria-describedby',
  'aria-controls',
  'aria-owns',
  'aria-details',
]);

function elements(node: SvgNode): SvgNode[] {
  const out: SvgNode[] = [];
  for (const child of node.children ?? []) {
    if (child.type === 'element') {
      out.push(child, ...elements(child));
    }
  }
  return out;
}

function isVendorAttribute(name: string): boolean {
  if (name.startsWith('data-figma') || name === 'data-name') {
    return true;
  }
  const colon = name.indexOf(':');
  if (colon < 0) {
    return false;
  }
  const prefix = name.slice(0, colon);
  if (prefix === 'xmlns') {
    return !KEPT_PREFIXES.has(name.slice(colon + 1));
  }
  return !KEPT_PREFIXES.has(prefix);
}

function stripVendorData(node: SvgNode): void {
  node.children = (node.children ?? []).filter((child) => !(child.type === 'element' && child.name?.includes(':')));
  for (const child of node.children) {
    if (child.type !== 'element') {
      continue;
    }
    for (const name of Object.keys(child.attributes ?? {})) {
      if (isVendorAttribute(name)) {
        delete child.attributes?.[name];
      }
    }
    stripVendorData(child);
  }
}

function referencedIds(all: SvgNode[]): Set<string> {
  const ids = new Set<string>();
  for (const element of all) {
    for (const [name, value] of Object.entries(element.attributes ?? {})) {
      for (const match of value.matchAll(/url\(\s*['"]?#([^'")\s]+)/g)) {
        ids.add(match[1]);
      }
      if ((name === 'href' || name === 'xlink:href') && value.startsWith('#')) {
        ids.add(value.slice(1));
      }
      if (ID_LIST_ATTRIBUTES.has(name)) {
        value.split(/\s+/).forEach((id) => ids.add(id));
      }
      if (name === 'begin' || name === 'end') {
        for (const match of value.matchAll(/([A-Za-z_][\w.-]*)\.(?:begin|end|click|repeat)/g)) {
          ids.add(match[1]);
        }
      }
    }
  }
  return ids;
}

/** Drop ids nothing points at (editor ids like `Layer_1`, `rect1234`); keep all when CSS or script could target them. */
function removeUnreferencedIds(root: SvgNode): void {
  const all = elements(root);
  if (all.some((element) => element.name === 'style' || element.name === 'script')) {
    return;
  }
  const keep = referencedIds(all);
  for (const element of all) {
    const id = element.attributes?.id;
    if (id !== undefined && !keep.has(id)) {
      delete element.attributes?.id;
    }
  }
}

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const ANIMATION_ELEMENTS = new Set(['set', 'animate', 'animateMotion', 'animateTransform']);
const RASTER_DATA_URL = /^data:image\/(?:png|jpeg|gif|webp|avif)[;,]/i;

function isSafeHref(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.startsWith('#') || RASTER_DATA_URL.test(trimmed);
}

function isUnsafeElement(node: SvgNode): boolean {
  if (node.name === 'foreignObject') {
    return true;
  }
  const namespace = node.attributes?.xmlns;
  if (namespace !== undefined && namespace.trim() !== SVG_NAMESPACE) {
    return true;
  }
  const target = node.attributes?.attributeName;
  return (
    ANIMATION_ELEMENTS.has(node.name ?? '') && target !== undefined && target.trim().toLowerCase().includes('href')
  );
}

function isUnsafeAttribute(name: string, value: string): boolean {
  const local = name.slice(name.lastIndexOf(':') + 1).toLowerCase();
  return local.startsWith('on') || name === 'xml:base' || (local === 'href' && !isSafeHref(value));
}

/**
 * After `removeScriptElement` (which only knows the SVG 1.1 event names): no `on*` attribute in any
 * case or prefix, no `<foreignObject>`, no element in another namespace, no href animation, no
 * `xml:base`, and only `#fragment` or raster `data:` hrefs.
 */
function removeUnsafeContent(node: SvgNode): void {
  node.children = (node.children ?? []).filter((child) => !(child.type === 'element' && isUnsafeElement(child)));
  for (const child of node.children) {
    if (child.type !== 'element') {
      continue;
    }
    for (const [name, value] of Object.entries(child.attributes ?? {})) {
      if (isUnsafeAttribute(name, value)) {
        delete child.attributes?.[name];
      }
    }
    removeUnsafeContent(child);
  }
}

const PLUGINS: SvgPlugins = [
  'removeDoctype',
  'removeXMLProcInst',
  'removeComments',
  'removeMetadata',
  'removeEditorsNSData',
  'removeScriptElement',
  {
    name: 'tgmcRemoveUnsafeContent',
    fn: (root: SvgNode) => {
      removeUnsafeContent(root);
      return null;
    },
  },
  {
    name: 'tgmcStripVendorData',
    fn: (root: SvgNode) => {
      stripVendorData(root);
      return null;
    },
  },
  {
    name: 'tgmcRemoveUnreferencedIds',
    fn: (root: SvgNode) => {
      removeUnreferencedIds(root);
      return null;
    },
  },
];

export function sanitizeSvg(input: Buffer): Buffer {
  const { data } = optimize(input.toString('utf8'), {
    multipass: false,
    plugins: PLUGINS,
    // Compact output: the pretty printer re-wraps `<desc>` text.
    js2svg: { pretty: false, eol: 'lf', finalNewline: true },
  });
  return Buffer.from(data, 'utf8');
}
