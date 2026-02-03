import { getImage } from 'astro:assets';
import type { ImageMetadata } from 'astro';

export interface GalleryImage {
    href: string;
    src: string;
    srcset: string;
    alt: string;
}

export async function processGalleryImages(
    imageLoaders: Record<string, () => Promise<{ default: ImageMetadata }>>,
    altPrefix: string = ''
): Promise<GalleryImage[]> {
    const galleryImages: GalleryImage[] = [];

    for (const [path, loader] of Object.entries(imageLoaders)) {
        const imgModule = await loader();
        const imgFull = await getImage({ src: imgModule.default, width: 3000, format: 'jpg' });
        const img480h = await getImage({ src: imgModule.default, height: 480, format: 'jpg' });
        const img960h = await getImage({ src: imgModule.default, height: 960, format: 'jpg' });

        galleryImages.push({
            href: imgFull.src,
            src: img480h.src,
            srcset: `${img960h.src} 2x`,
            alt: altPrefix,
        });
    }

    return galleryImages;
}

export async function getOptimizedImageAttributes(
    imgSrc: string,
    widths: number[],
    imageLoaders: Record<string, () => Promise<{ default: ImageMetadata }>>,
    componentName: string = 'Component'
) {
    const normalizedPath = imgSrc.replace('/assets/img/', '/src/assets/img/');
    const loader = imageLoaders[normalizedPath];

    if (!loader) {
        throw new Error(`${componentName}: Image not found at ${normalizedPath}. Make sure it exists in the corresponding assets folder.`);
    }

    const imageModule = await loader();
    const imageMetadata = imageModule.default;

    const optimizedImages = await Promise.all(
        widths.map(w => getImage({ src: imageMetadata, width: w, format: 'jpg' }))
    );

    const srcSet = optimizedImages.map((img, i) => `${img.src} ${widths[i]}w`).join(', ');
    const mainSrc = optimizedImages[0].src;

    return { src: mainSrc, srcset: srcSet };
}
