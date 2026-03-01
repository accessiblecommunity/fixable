// --- Types ---

export interface RawBreak {
	description?: string | string[];
	discussionItems?: string[];
	href?: string;
	location?: string;
	process?: string | string[];
	wcag2?: string | string[];
	wcag3?: string | string[];
	photosensitivity?: boolean;
}

export interface FlatBreak {
	id: string;
	sourceFile: string;
	location: string;
	process: string;
	route: string;
	wcag2: string;
	wcag2Title: string;
	wcag3: string;
	description: string;
	discussionItems: string;
	duplicate: boolean;
}
