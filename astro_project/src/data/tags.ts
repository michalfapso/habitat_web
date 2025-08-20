export type Tag = {
  name: string;
  color: string;
};

// Define your fixed set of tags with colors
// Using an object where keys are tag names for easy lookup
export const projectTags = {
  "Domov na mieru": { name: "Domov na mieru", color: "bg-cream" },
  "Habitat konfigurátor": { name: "Habitat konfigurátor", color: "bg-pale" },
};

export const availableTagNames = Object.keys(projectTags);