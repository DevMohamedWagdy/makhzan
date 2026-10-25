/** Why a picked image couldn't be prepared: the file can't be read, or it isn't a decodable image. */
export class ImagePrepareError extends Error {
    constructor(reason) {
        super(reason);
        this.reason = reason;
    }
}

/**
 * Shrinks a picked photo before it's uploaded: scales it down to fit maxDimension and re-encodes
 * it. PNGs stay PNG so transparent logos keep their background; everything else becomes JPEG.
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
    const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);

    const context = canvas.getContext('2d');

    if (type === 'image/jpeg') {
        // JPEG has no transparency; without a fill, transparent pixels turn black.
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
    }

    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const compressed = await new Promise((resolve) => canvas.toBlob(resolve, type, quality));

    if (!compressed || (compressed.size >= bytes.byteLength && scale === 1 && type === file.type)) {
        return new File([bytes], file.name, { type: file.type, lastModified: file.lastModified });
    }

    const name = `${file.name.replace(/\.[^.]+$/, '')}.${type === 'image/png' ? 'png' : 'jpg'}`;

    return new File([compressed], name, { type, lastModified: Date.now() });
}
