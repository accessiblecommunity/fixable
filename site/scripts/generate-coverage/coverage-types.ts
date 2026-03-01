// --- Helpers ---

export type Wcag2DetailsMap = Record<
	string,
	{ title: string; level: string; sinceVersion: string }
>;

// --- Main ---

export interface Wcag2Row {
	sc: string;
	scTitle: string;
	level: string;
	sinceVersion: string;
	covered: boolean;
	page: string;
	route: string;
	breakCount: number;
	description: string;
}

export interface Wcag3Row {
	requirement: string;
	covered: boolean;
	page: string;
	route: string;
	breakCount: number;
	description: string;
}
