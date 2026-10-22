/**
 * PDF sanitizer (pdf-lib): the Info dictionary keeps only the Title / Author / Subject passed in
 * (the source's own Author / Subject, Producer, Creator, Keywords, dates and custom keys go),
 * every `/Metadata` (XMP) and `/PieceInfo` entry is removed, objects no longer reachable from the
 * trailer are dropped (orphaned XMP streams and editor private data would otherwise still be
 * written), and the trailer `/ID` (document and instance ids) is cleared. Saved without object streams so the result can be audited as text.
 */
import { PDFArray, PDFDict, PDFDocument, PDFName, PDFRef, PDFStream, type PDFContext, type PDFObject } from 'pdf-lib';

export type PdfDocumentInfo = {
  title: string;
  author?: string;
  subject?: string;
};

const REMOVED_KEYS = [PDFName.of('Metadata'), PDFName.of('PieceInfo')];

function dictOf(object: PDFObject | undefined): PDFDict | null {
  if (object instanceof PDFDict) {
    return object;
  }
  return object instanceof PDFStream ? object.dict : null;
}

function reachableRefs(context: PDFContext): Set<string> {
  const seen = new Set<string>();
  const stack: PDFObject[] = [context.trailerInfo.Root, context.trailerInfo.Info].filter(
    (object): object is PDFObject => object !== undefined
  );
  while (stack.length > 0) {
    const object = stack.pop() as PDFObject;
    if (object instanceof PDFRef) {
      if (!seen.has(object.tag)) {
        seen.add(object.tag);
        const target = context.lookup(object);
        if (target) {
          stack.push(target);
        }
      }
    } else if (object instanceof PDFArray) {
      stack.push(...object.asArray());
    } else {
      const dict = dictOf(object);
      if (dict) {
        stack.push(...dict.values());
      }
    }
  }
  return seen;
}

export async function sanitizePdf(input: Buffer, info: PdfDocumentInfo | undefined): Promise<Buffer> {
  if (!info?.title?.trim()) {
    throw new Error('sanitizePdf needs a document title');
  }
  const doc = await PDFDocument.load(input, { updateMetadata: false });
  const { context } = doc;
  const author = info.author?.trim();
  const subject = info.subject?.trim();
  const keptInfoKeys = new Set(['Title']);
  doc.setTitle(info.title.trim());
  if (author) {
    doc.setAuthor(author);
    keptInfoKeys.add('Author');
  }
  if (subject) {
    doc.setSubject(subject);
    keptInfoKeys.add('Subject');
  }
  const infoDict = dictOf(context.lookup(context.trailerInfo.Info));
  for (const key of infoDict?.keys() ?? []) {
    if (!keptInfoKeys.has(key.decodeText())) {
      infoDict?.delete(key);
    }
  }
  for (const [, object] of context.enumerateIndirectObjects()) {
    const dict = dictOf(object);
    for (const key of REMOVED_KEYS) {
      dict?.delete(key);
    }
  }
  const reachable = reachableRefs(context);
  for (const [ref] of context.enumerateIndirectObjects()) {
    if (!reachable.has(ref.tag)) {
      context.delete(ref);
    }
  }
  context.trailerInfo.ID = undefined;
  return Buffer.from(await doc.save({ useObjectStreams: false, updateFieldAppearances: false }));
}
