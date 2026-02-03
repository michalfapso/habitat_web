import { getCollection } from "astro:content";
import { getImage } from "astro:assets";
import type { CollectionEntry } from "astro:content";
import type { ImageMetadata } from "astro";
import fs from 'node:fs';
import path from 'node:path';

// Define a union type for collections that support this augmentation
type AugmentableCollection = 'projects' | 'blog';

// Generic type to allow augmentation of content data
export type AugmentedData<T extends AugmentableCollection> = CollectionEntry<T> & {
    data: CollectionEntry<T>['data'] & {
        image?: string;
        imageSet?: string;
        imageThumb?: string;
        imageThumbSet?: string;
        dir?: string;
        titleBreak?: string;
        headerImageNumber?: number;
        order: number;
        tags: string[];
    };
};

/**
 * Gets the image metadata for the first image in an entry's gallery.
 */
async function getFirstGalleryImageMetadata(
    collection: AugmentableCollection,
    entry: any
): Promise<{
    image: string;
    imageSet: string;
    imageThumb: string;
    imageThumbSet: string;
} | null> {
    const data = entry.data;
    if (data.image && data.imageSet && data.imageThumb && data.imageThumbSet) {
        return {
            image: data.image,
            imageSet: data.imageSet,
            imageThumb: data.imageThumb,
            imageThumbSet: data.imageThumbSet,
        };
    }

    const allGalleryImageLoaders = import.meta.glob('/src/content/**/*.{jpg,jpeg,png,webp,gif,heic}');

    const entryDir = entry.id.replace(/\/index.*$/, '');
    const entryGalleryPath = `/src/content/${collection}/${entryDir}/gallery/`;

    const entryImages = Object.entries(allGalleryImageLoaders).filter(([path, _]) => {
        return path.includes(entryGalleryPath);
    }).sort(([pathA, _], [pathB, __]) => pathA.localeCompare(pathB));

    if (entryImages.length === 0) {
        return null;
    }

    const headerImageNumber = Math.min(Math.max(data.headerImageNumber || 1, 1), entryImages.length);
    const [_, imageLoader] = entryImages[headerImageNumber - 1];
    const imgModule = await (imageLoader as () => Promise<{ default: ImageMetadata }>).call(null);

    const img1024w = await getImage({ src: imgModule.default, width: 1024, format: 'jpg' });
    const img1575w = await getImage({ src: imgModule.default, width: 1575, format: 'jpg' });
    const img2048w = await getImage({ src: imgModule.default, width: 2048, format: 'jpg' });
    const img2560w = await getImage({ src: imgModule.default, width: 2560, format: 'jpg' });

    const thumbSrc = await getImage({ src: imgModule.default, width: 712, height: 440, format: 'jpg', fit: 'cover', position: 'center' });
    const thumbSrc2x = await getImage({ src: imgModule.default, width: 1424, height: 880, format: 'jpg', fit: 'cover', position: 'center' });

    return {
        image: img1024w.src,
        imageSet: `${img1024w.src} 1024w, ${img1575w.src} 1575w, ${img2048w.src} 2048w, ${img2560w.src} 2560w`,
        imageThumb: thumbSrc.src,
        imageThumbSet: `${thumbSrc2x.src} 2x`,
    };
}

export function slugify(text: string): string {
    const a = 'àáâäæãåāăąçćčđďèéêëēėęěğǵḧîïíīįìłĺľḿñńǹňôöòóœøōõőṕŕřßśšşșťțûüùúūǘůűųẃẍÿýžźż·/_,:;'
    const b = 'aaaaaaaaaacccddeeeeeeeegghiiiiiilllmnnnnoooooooooprrsssssttuuuuuuuuuwxyyzzz------'
    const p = new RegExp(a.split('').join('|'), 'g')

    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')
        .replace(p, c => b.charAt(a.indexOf(c)))
        .replace(/&/g, '-and-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '')
}

/**
 * Fetches all entries for a given collection and locale, augments their data.
 */
export async function getAugmentedContent<T extends AugmentableCollection>(
    collection: T,
    locale: string
): Promise<AugmentedData<T>[]> {
    const allEntries = await getCollection(collection as any, (entry: any) => {
        return entry.id.endsWith(`.${locale}.md`) || entry.id.endsWith(`.${locale}.mdx`);
    });

    const augmentedEntries: AugmentedData<T>[] = [];

    for (const entry of allEntries as any[]) {
        const entryDir = entry.id.replace(/\/index.*$/, '');
        const dataPath = path.join(process.cwd(), 'src', 'content', collection, entryDir, 'data.json');

        let commonData = {};
        if (fs.existsSync(dataPath)) {
            try {
                commonData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
            } catch (e) {
                console.error(`Error reading or parsing ${dataPath}:`, e);
            }
        }

        entry.data = { ...commonData, ...entry.data };

        const imageMetadata = await getFirstGalleryImageMetadata(collection, entry);
        if (!entry.data.titleBreak) {
            entry.data.titleBreak = entry.data.title;
        }
        const cleanTitle = entry.data.title.replace(/<[^>]*>/g, "");
        entry.data.title = cleanTitle;

        if (/\/index\.?\w\w$/.test(entry.slug)) {
            entry.slug = slugify(cleanTitle);
        }

        entry.data.dir = entryDir;

        const augmentedData = {
            ...entry.data,
            ...(imageMetadata || {
                image: entry.data.image,
                imageSet: entry.data.imageSet,
                imageThumb: entry.data.imageThumb,
                imageThumbSet: entry.data.imageThumbSet,
            })
        };

        augmentedEntries.push({
            ...entry,
            data: augmentedData
        } as any);
    }

    // Sort by order primary (ascending), and date secondary (descending - newest first)
    augmentedEntries.sort((a, b) => {
        const orderA = (a.data as any).order ?? 0;
        const orderB = (b.data as any).order ?? 0;

        if (orderA !== orderB) {
            return orderA - orderB;
        }

        const dateA = (a.data as any).date ? new Date((a.data as any).date).getTime() : 0;
        const dateB = (b.data as any).date ? new Date((b.data as any).date).getTime() : 0;

        return dateB - dateA;
    });

    return augmentedEntries;
}

/**
 * Backward compatible function for projects.
 */
export async function getAugmentedProjects(locale: string) {
    return getAugmentedContent('projects', locale);
}
