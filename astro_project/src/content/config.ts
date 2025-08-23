import { defineCollection, z } from "astro:content";
import { availableTagKeys } from "../data/tags"; // Import your available tag names

const projectsCollection = defineCollection({
  type: "content", // 'content' for Markdown/MDX, 'data' for JSON/YAML
  schema: z.object({
    title: z.string(),
    titleBreak: z.string().optional(),
    description: z.string(),
    image: z.string().optional(), // Optional image path
    imageSet: z.string().optional(), // Optional image path
    imageThumb: z.string().optional(),
    imageThumbSet: z.string().optional(),
    tags: z.array(z.enum(availableTagKeys as [string, ...string[]])).optional(),
    pubDate: z.date(), // Publication date (e.g., when the project was completed)

    lokalita: z.string().optional(),
    vykurovanaPlocha: z.number().optional(),
    vykurovanaPlochaSuffix: z.string().optional(),
    uzitkovaPlocha: z.number().optional(),
    uzitkovaPlochaSuffix: z.string().optional(),
    pocetIzieb: z.number().optional(),
    pocetIziebSuffix: z.string().optional(),
    rozmeryDomu: z.string().optional(),
  }),
});

// Export a single `collections` object to register your collection(s)
export const collections = {
  projects: projectsCollection,
};
