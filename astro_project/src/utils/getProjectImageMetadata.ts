import { getCollection } from "astro:content";
import { getImage } from "astro:assets";
import type { CollectionEntry, ImageMetadata } from "astro:content";

// Define an interface for the augmented project data to include the generated image fields
interface AugmentedProjectData extends CollectionEntry<'projects'> {
  data: CollectionEntry<'projects'>['data'] & {
    image?: string;
    imageSet?: string;
    imageThumb?: string;
    imageThumbSet?: string;
  };
}

/**
 * Gets the image metadata for the first image in a project's gallery.
 * If the project's frontmatter already defines 'image', 'imageSet', 'imageThumb', 'imageThumbSet',
 * it will use those values. Otherwise, it generates them from the first gallery image.
 *
 * @param project The Astro content collection project entry.
 * @returns An object containing image, imageSet, imageThumb, imageThumbSet paths,
 *          or null if no gallery images are found and frontmatter fields are empty.
 */
async function getFirstGalleryImageMetadata(project: CollectionEntry<'projects'>): Promise<{
    image: string;
    imageSet: string;
    imageThumb: string;
    imageThumbSet: string;
} | null> {
    // console.log('project:', project);
    // Prioritize existing frontmatter image data if available.
    // This allows manual overrides in the markdown files.
    if (project.data.image && project.data.imageSet && project.data.imageThumb && project.data.imageThumbSet) {
        return {
            image: project.data.image,
            imageSet: project.data.imageSet,
            imageThumb: project.data.imageThumb,
            imageThumbSet: project.data.imageThumbSet,
        };
    }

    // If frontmatter fields are not all defined, search for the first gallery image.
    // The path for import.meta.glob is relative to the project root.
    const allGalleryImageLoaders = import.meta.glob('/src/content/projects/**/gallery/*.{jpg,jpeg,png,webp,gif,heic}');

    const projectDir = project.id.replace(/\/index.*$/, '');
    // console.log('project id:', project.id, ' projectSlug:', projectSlug);

    const projectImages = Object.entries(allGalleryImageLoaders).filter(([path, _]) => {
        // Filter images belonging to the current project's gallery
        return path.includes(`/src/content/projects/${projectDir}/gallery/`);
    }).sort(([pathA, _], [pathB, __]) => pathA.localeCompare(pathB)); // Sort to ensure a consistent "first" image
    // console.log('projectImages:', projectImages);

    if (projectImages.length === 0) {
        console.warn(`No gallery images found for project: ${projectDir} and frontmatter image fields are empty. Using fallback images.`);
        return null;
    }

    project.data.headerImageNumber = Math.min(Math.max(project.data.headerImageNumber || 1, 1), projectImages.length);
    // console.log('headerImageNumber:', project.data.headerImageNumber, ' for project:', projectDir);
    const [firstImagePath, firstImageLoader] = projectImages[project.data.headerImageNumber - 1];
    const imgModule = await (firstImageLoader as () => Promise<{ default: ImageMetadata }>).call(null);

    // Generate optimized images for 'image' and 'imageSet'
    const img1024w = await getImage({ src: imgModule.default, width: 1024, format: 'jpg' });
    const img1575w = await getImage({ src: imgModule.default, width: 1575, format: 'jpg' });
    const img2048w = await getImage({ src: imgModule.default, width: 2048, format: 'jpg' });
    const img2560w = await getImage({ src: imgModule.default, width: 2560, format: 'jpg' });

    // Generate optimized thumbnails for 'imageThumb' and 'imageThumbSet'
    const thumbSrc   = await getImage({ src: imgModule.default, width:  712, height: 440, format: 'jpg', fit: 'cover', position: 'center'});
    const thumbSrc2x = await getImage({ src: imgModule.default, width: 1424, height: 880, format: 'jpg', fit: 'cover', position: 'center'});

    const res = {
        image: img1024w.src,
        imageSet: `${img1024w.src} 1024w, ${img1575w.src} 1575w, ${img2048w.src} 2048w, ${img2560w.src} 2560w`,
        imageThumb: thumbSrc.src,
        imageThumbSet: `${thumbSrc2x.src} 2x`,
    };
    // console.log('res:', res);
    return res;
}

function slugify(text: string): string {
    const a = 'àáâäæãåāăąçćčđďèéêëēėęěğǵḧîïíīįìłḿñńǹňôöòóœøōõőṕŕřßśšşșťțûüùúūǘůűųẃẍÿýžźż·/_,:;'
    const b = 'aaaaaaaaaacccddeeeeeeeegghiiiiiilmnnnnoooooooooprrsssssttuuuuuuuuuwxyyzzz------'
    const p = new RegExp(a.split('').join('|'), 'g')

    return text.toString().toLowerCase()
        .replace(/\s+/g, '-') // Replace spaces with -
        .replace(p, c => b.charAt(a.indexOf(c))) // Replace special characters
        .replace(/&/g, '-and-') // Replace & with 'and'
        .replace(/[^\w\-]+/g, '') // Remove all non-word chars
        .replace(/\-\-+/g, '-') // Replace multiple - with single -
        .replace(/^-+/, '') // Trim - from start of text
        .replace(/-+$/, '') // Trim - from end of text
}

/**
 * Fetches all projects for a given locale, augments their data with image paths,
 * and sorts them by publish date.
 *
 * @param {string} locale - The locale to filter projects by (e.g., 'sk', 'cz').
 * @returns A promise resolving to an array of augmented project data.
 */
export async function getAugmentedProjects(locale: string): Promise<AugmentedProjectData[]> {
    const allProjects = await getCollection("projects", ({ id }) => {
        // console.log('getAugmentedProjects() id:', id);
        return id.endsWith(`.${locale}.md`);
    });

    const augmentedProjects: AugmentedProjectData[] = [];

    for (const project of allProjects) {
        // console.log('Processing project id:', project.id, " title:", project.data.title);
        const imageMetadata = await getFirstGalleryImageMetadata(project);
        if (!project.data.titleBreak) {
            project.data.titleBreak = project.data.title;
        }
        const title = project.data.title.replace(/<[^>]*>/g, "");
        project.data.title = title;

        // Astro's default slug is `path/to/entry/index.lang`. A custom slug from frontmatter will not have this format.
        // We slugify the title only if a custom slug is not present.
        if (/\/index\w\w$/.test(project.slug)) {
            project.slug = slugify(title);
        }

        project.data.dir = project.id.replace(/\/index.*$/, '');
        if (imageMetadata) {
            augmentedProjects.push({
                ...project,
                data: {
                    ...project.data,
                    image: imageMetadata.image,
                    imageSet: imageMetadata.imageSet,
                    imageThumb: imageMetadata.imageThumb,
                    imageThumbSet: imageMetadata.imageThumbSet,
                },
            });
        } else {
            // Fallback if no gallery images are found
            augmentedProjects.push({
                ...project,
                data: {
                    ...project.data,
                    image: project.data.image,
                    imageSet: project.data.imageSet,
                    imageThumb: project.data.imageThumb,
                    imageThumbSet: project.data.imageThumbSet,
                }
            });
        }
    }
    // console.log(`augmentedProjects:`, augmentedProjects);

    // Sort projects by order
    augmentedProjects.sort((a, b) => a.data.order - b.data.order);

    return augmentedProjects;
}