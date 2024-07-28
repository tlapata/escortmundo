export function extractIDfromSlug(slug) {
    const match = slug.match(/(\d+)$/);
    return match ? match[0] : '';
}
