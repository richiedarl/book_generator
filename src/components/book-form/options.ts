/**
 * The selection lists used by the book configuration form.
 */

export interface CategoryOption {
  id: string;
  name: string;
  description: string;
}

export const CATEGORIES: CategoryOption[] = [
  { id: "human-psychology", name: "Human Psychology & Behavior", description: "Behavioral science, cognitive psychology, mental health" },
  { id: "food-culture", name: "Food, Fruits, Culture & Culinary", description: "Cuisine, food history, cultural food traditions" },
  { id: "childrens-learning", name: "Children's Creative Learning & Stories (ages 3–12)", description: "Educational stories, picture books, early learning" },
  { id: "animals-nature", name: "Animals, Wildlife, Nature & Earth", description: "Wildlife, ecology, natural science, earth science" },
  { id: "travel", name: "Travel, Tour, Vacation & Destination", description: "Travel guides, destination guides, adventure travel" },
  { id: "sports-fitness", name: "Sports, Games, Fitness & Athletic Activities", description: "Sports training, fitness, games, athletic performance" },
  { id: "technology", name: "Technology", description: "Software, AI, digital innovation, tech trends" },
  { id: "fashion", name: "Fashion", description: "Style, design, fashion history, industry insights" },
  { id: "manufacturing", name: "Resources, Manufacturing & Production", description: "Industrial processes, production, supply chain" },
  { id: "farming", name: "Farming, Agriculture & Food Production", description: "Agriculture, farming techniques, food systems" },
  { id: "history", name: "History", description: "Historical events, biographies, cultural history" },
  { id: "social-cultures", name: "Social Cultures, Traditions & Everyday Life", description: "Sociology, anthropology, cultural traditions" },
  { id: "business-economics", name: "Business, Economics, Money & Investment", description: "Entrepreneurship, finance, investing, economics" },
  { id: "vocation-career", name: "Vocation, Career, Industry & Skills", description: "Career development, vocational skills, professional growth" },
];

export const OTHER_CATEGORY: CategoryOption = {
  id: "other",
  name: "Others",
  description: "Custom category not listed above",
};

/**
 * Conversational is deliberately absent: it is offered as a Tone, and the
 * writing style list must not duplicate it.
 */
export const WRITING_STYLES = [
  "Narrative",
  "Academic",
  "Journalistic",
  "Storytelling",
  "Workbook",
  "Expository",
  "Descriptive",
] as const;

export const TONES = [
  "Conversational",
  "Clinical & precise",
  "Narrative-led",
  "Direct & practical",
  "Authoritative",
  "Warm & Supportive",
  "Friendly & Informative",
] as const;

export const DESIRED_LENGTHS = [
  "Short (5,000–15,000 words)",
  "Medium (15,000–40,000 words)",
  "Long (40,000–80,000 words)",
] as const;

export const CHAPTER_SUBTITLE_OPTIONS = [
  { value: "yes", label: "Yes — give every chapter a subtitle" },
  { value: "no", label: "No — chapter titles only" },
] as const;

export const FONT_TYPES = [
  "Georgia (Serif)",
  "Garamond (Serif)",
  "Baskerville (Serif)",
  "Times New Roman (Serif)",
  "Arial (Sans-serif)",
  "Helvetica (Sans-serif)",
  "Calibri (Sans-serif)",
] as const;

export const FONT_SIZES = [
  "Small (10pt)",
  "Medium (11pt)",
  "Large (12pt)",
  "Extra Large (14pt)",
] as const;

export const AGE_RANGES = [
  "3–5",
  "6–8",
  "9–12",
  "13–18",
  "18 and above",
  "All Ages",
] as const;

export const READING_LEVELS = [
  "Early Reader (Grades K–2)",
  "Developing Reader (Grades 3–5)",
  "Fluent Reader (Grades 6–8)",
  "Advanced (Grades 9–12)",
  "College / Adult",
  "General Audience",
] as const;

export const BUYER_TYPES = [
  "Parents / Guardians",
  "Teachers / Educators",
  "Students",
  "Professionals",
  "Self-Help / Personal Growth",
  "Hobbyists / Enthusiasts",
  "Academics / Researchers",
  "General Readers",
] as const;
