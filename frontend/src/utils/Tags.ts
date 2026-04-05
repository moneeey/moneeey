/** Extract `#hashtag` tokens from free-form text (e.g. a transaction memo). */
export const tagsForText = (text: string): string[] =>
	Array.from(text.matchAll(/[^#]?(#\w+)/g)).map((m: RegExpMatchArray) =>
		m[1].replace("#", ""),
	);
