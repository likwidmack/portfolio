/**
 * Fetches `imageSrc` as a blob, revokes temp object URL after an anchor click downloads `tgm-portfolio.png`.
 */
export async function downloadImage(imageSrc: string) {
  const image = await fetch(imageSrc);
  const imageBlob = await image.blob();
  const imageURL = URL.createObjectURL(imageBlob);

  const link = document.createElement('a');
  link.href = imageURL;
  link.download = 'tgm-portfolio.png';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(imageURL);
}
