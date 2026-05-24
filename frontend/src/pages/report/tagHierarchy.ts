export const TAG_SEPARATOR = " > ";

export const normalizeTag = (tag: string): string =>
	tag
		.split(">")
		.map((segment) => segment.trim())
		.filter((segment) => segment.length > 0)
		.join(TAG_SEPARATOR);

export const tagParents = (tag: string): string[] => {
	const normalized = normalizeTag(tag);
	if (!normalized) return [];
	const segments = normalized.split(TAG_SEPARATOR);
	const out: string[] = [];
	for (let i = 0; i < segments.length; i += 1) {
		out.push(segments.slice(0, i + 1).join(TAG_SEPARATOR));
	}
	return out;
};

export const tagDepth = (tag: string): number => {
	const normalized = normalizeTag(tag);
	if (!normalized) return 0;
	return normalized.split(TAG_SEPARATOR).length;
};

export const tagAtDepth = (tag: string, depth: number): string | null => {
	const normalized = normalizeTag(tag);
	if (!normalized) return null;
	const segments = normalized.split(TAG_SEPARATOR);
	if (depth <= 0 || depth > segments.length) return null;
	return segments.slice(0, depth).join(TAG_SEPARATOR);
};

export const tagLeaf = (tag: string): string => {
	const normalized = normalizeTag(tag);
	if (!normalized) return tag;
	const segments = normalized.split(TAG_SEPARATOR);
	return segments[segments.length - 1];
};

export const isDescendantOf = (tag: string, ancestor: string): boolean => {
	const t = normalizeTag(tag);
	const a = normalizeTag(ancestor);
	if (!t || !a) return false;
	return t === a || t.startsWith(`${a}${TAG_SEPARATOR}`);
};
