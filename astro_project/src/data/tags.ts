export type Tag = {
  nameKey: string;
  color: string;
};

// Define your fixed set of tags with colors
// Using an object where keys are tag names for easy lookup
export const projectTags: { [key: string]: Tag } = {
  "domov-na-mieru"      : { nameKey: "tags.domov-na-mieru"      , color: "bg-cream" },
  "habitat-konfigurator": { nameKey: "tags.habitat-konfigurator", color: "bg-pale" },
};

export const availableTagKeys = Object.keys(projectTags);
