import { Font } from '@react-pdf/renderer';

let registered = false;

export function registerPdfFonts() {
  if (registered) return;
  Font.register({
    family: 'NotoSansKR',
    fonts: [
      { src: '/fonts/NotoSansKR-Regular.otf', fontWeight: 400 },
      { src: '/fonts/NotoSansKR-Bold.otf', fontWeight: 700 },
    ],
  });
  Font.registerHyphenationCallback((word) => [word]);
  registered = true;
}
