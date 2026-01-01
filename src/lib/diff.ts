import * as diff from 'diff';

export interface DiffStats {
    additions: number;
    deletions: number;
}

export function calculateDiffStats(oldContent: string, newContent: string): DiffStats {
    if (!oldContent) return { additions: newContent.split('\n').length, deletions: 0 };
    if (!newContent) return { additions: 0, deletions: oldContent.split('\n').length };

    const changes = diff.diffLines(oldContent, newContent);
    let additions = 0;
    let deletions = 0;

    changes.forEach((part) => {
        if (part.added) {
            additions += part.count || 0;
        } else if (part.removed) {
            deletions += part.count || 0;
        }
    });

    return { additions, deletions };
}
