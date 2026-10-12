const ARABIC_TO_LATIN = {
    ا: 'a', أ: 'a', إ: 'e', آ: 'a', ب: 'b', ت: 't', ث: 'th', ج: 'g', ح: 'h', خ: 'kh', د: 'd', ذ: 'z',
    ر: 'r', ز: 'z', س: 's', ش: 'sh', ص: 's', ض: 'd', ط: 't', ظ: 'z', ع: 'a', غ: 'gh', ف: 'f', ق: 'q',
    ك: 'k', ل: 'l', م: 'm', ن: 'n', ه: 'h', ة: 'a', و: 'w', ي: 'y', ى: 'a', ئ: 'e', ؤ: 'o', ء: '',
};

/** Suggests a URL-safe slug from a store name, transliterating Arabic letters. */
export function slugify(text = '') {
    return text
        .trim()
        .replace(/^ال(?=\S)/, 'el-')
        .replace(/\sال(?=\S)/g, ' el-')
        .split('')
        .map((char) => ARABIC_TO_LATIN[char] ?? char)
        .join('')
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[̀-ًͯ-ٟ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/-{2,}/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 40);
}
