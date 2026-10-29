import { t } from '@/i18n';

/** Types the browser can decode and re-encode; anything else (GIF, PDF…) is uploaded as is. */
export const COMPRESSIBLE_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

/** Originals larger than this aren't even decoded; what's uploaded is the compressed copy. */
export const MAX_ORIGINAL_IMAGE_MB = 20;

/** Why a picked image couldn't be prepared: the file can't be read, or it isn't a decodable image. */
export class ImagePrepareError extends Error {
    constructor(reason) {
        super(reason);
        this.reason = reason;
    }
}

/** The message to show for an ImagePrepareError. */
export function imagePrepareMessage(error) {
    return error?.reason === 'unreadable' ? t('تعذر فتح الملف. لو الصورة على iCloud نزّلها على جهازك أولاً، أو اختر صورة أخرى') : t('الملف ليس صورة PNG أو JPG صالحة');
}

/** Whether any pixel on the canvas is see-through. */
function hasTransparency(context, width, height) {
    const { data } = context.getImageData(0, 0, width, height);

    for (let index = 3; index < data.length; index += 4) {
        if (data[index] < 255) {
            return true;
        }
    }

    return false;
}

/**
 * Shrinks a picked photo before it's uploaded: scales it down to fit maxDimension and re-encodes
 * it. A PNG with see-through pixels stays PNG so transparent logos keep their background; everything
 * else, screenshots included, becomes JPEG.
 * The result is an in-memory File, so it still uploads if the original changes on disk (iCloud).
 * When re-encoding doesn't save anything, the original bytes are kept.
 *
 * @throws {ImagePrepareError} reason "unreadable" or "invalid"
 */
export async function compressImage(file, { maxDimension = 1024, quality = 0.82 } = {}) {
    let bytes;

    try {
        bytes = await file.arrayBuffer();
    } catch {
        throw new ImagePrepareError('unreadable');
    }

    let bitmap;

    try {
        bitmap = await createImageBitmap(new Blob([bytes], { type: file.type }));
    } catch {
        throw new ImagePrepareError('invalid');
    }

    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);

    const context = canvas.getContext('2d', { willReadFrequently: file.type === 'image/png' });

    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const type = file.type === 'image/png' && hasTransparency(context, canvas.width, canvas.height) ? 'image/png' : 'image/jpeg';

    if (type === 'image/jpeg') {
        // JPEG has no transparency; without a white backdrop, see-through pixels (a WEBP's) turn black.
        context.globalCompositeOperation = 'destination-over';
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
    }

    const compressed = await new Promise((resolve) => canvas.toBlob(resolve, type, quality));

    if (!compressed || (compressed.size >= bytes.byteLength && scale === 1 && type === file.type)) {
        return new File([bytes], file.name, { type: file.type, lastModified: file.lastModified });
    }

    const name = `${file.name.replace(/\.[^.]+$/, '')}.${type === 'image/png' ? 'png' : 'jpg'}`;

    return new File([compressed], name, { type, lastModified: Date.now() });
}

/**
 * Compresses each image in `files` (others pass through untouched), refusing originals over
 * MAX_ORIGINAL_IMAGE_MB and results over `maxSizeMb`.
 *
 * @returns {Promise<{ files: File[], error: string | null }>} the prepared files, or the first problem
 */
export async function compressImages(files, { maxSizeMb, ...options } = {}) {
    const prepared = [];

    for (const file of files) {
        if (!COMPRESSIBLE_IMAGE_TYPES.includes(file.type)) {
            prepared.push(file);

            continue;
        }

        if (file.size > MAX_ORIGINAL_IMAGE_MB * 1024 * 1024) {
            return { files: [], error: t('{name}: حجم الصورة يتجاوز {size} ميجابايت', { name: file.name, size: MAX_ORIGINAL_IMAGE_MB }) };
        }

        let compressed;

        try {
            compressed = await compressImage(file, options);
        } catch (prepareError) {
            return { files: [], error: `${file.name}: ${imagePrepareMessage(prepareError)}` };
        }

        if (maxSizeMb && compressed.size > maxSizeMb * 1024 * 1024) {
            return { files: [], error: t('{name}: حجم الصورة يتجاوز {size} ميجابايت', { name: file.name, size: maxSizeMb }) };
        }

        prepared.push(compressed);
    }

    return { files: prepared, error: null };
}
