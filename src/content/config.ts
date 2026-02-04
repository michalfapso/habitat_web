import { defineCollection, z } from "astro:content";
import { availableTagKeys } from "../data/tags"; // Import your available tag names

const projectsCollection = defineCollection({
  type: "content", // 'content' for Markdown/MDX, 'data' for JSON/YAML
  schema: z.object({
    title: z.string().optional(),
    titleBreak: z.string().optional(),
    description: z.string().optional(),
    image: z.string().optional(), // Optional image path
    imageSet: z.string().optional(), // Optional image path
    imageThumb: z.string().optional(),
    imageThumbSet: z.string().optional(),
    // Fields from data.json are now optional
    tags: z.array(z.enum(availableTagKeys as [string, ...string[]])).optional(),
    order: z.number().default(0).optional(),
    otherProjects: z.array(z.string()).optional(),
    headerImageNumber: z.number().default(1).optional(),
    dir: z.string().optional(), // Directory where the project is located. This field is generated automatically.
    lokalita: z.string().optional(),
    vykurovanaPlocha: z.number().optional(),
    vykurovanaPlochaSuffix: z.string().optional(),
    uzitkovaPlocha: z.number().optional(),
    uzitkovaPlochaSuffix: z.string().optional(),
    pocetIzieb: z.number().optional(),
    pocetIziebSuffix: z.string().optional(),
    rozmeryDomu: z.string().optional(),
    slug: z.string().optional(),
    topbarTheme: z.string().default("bright").optional(),
  }),
});

const blogCollection = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string().optional(),
    titleBreak: z.string().optional(),
    description: z.string().optional(),
    image: z.string().optional(),
    imageSet: z.string().optional(),
    imageThumb: z.string().optional(),
    imageThumbSet: z.string().optional(),
    tags: z.array(z.enum(availableTagKeys as [string, ...string[]])).optional(),
    order: z.number().default(0).optional(),
    date: z.coerce.date().optional(), // Coerce and parse date for blog posts
    otherBlogPosts: z.array(z.string()).optional(),
    headerImageNumber: z.number().default(1).optional(),
    dir: z.string().optional(),
    slug: z.string().optional(),
    topbarTheme: z.string().default("bright").optional(),
  }),
});

const pagesCollection = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    showSquareLogo: z.boolean().default(true).optional(),
    topbarTheme: z.string().default("bright").optional(),
  }),
});

// Export a single `collections` object to register your collection(s)
export const collections = {
  projects: projectsCollection,
  pages: pagesCollection,
  blog: blogCollection,
};